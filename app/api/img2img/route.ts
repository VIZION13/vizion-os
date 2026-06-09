import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!

async function pollPrediction(id: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    })
    const data = await poll.json()
    if (data.status === 'succeeded') {
      const out = Array.isArray(data.output) ? data.output[0] : data.output
      return out
    }
    if (data.status === 'failed') throw new Error(data.error || 'Generation failed')
  }
  throw new Error('Timeout')
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageBase64, prompt, strength, mode } = await req.json()

    const image = imageUrl || (imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null)
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

    let predId: string

    if (mode === 'portrait') {
      // InstantID — meilleur portrait IA actuellement sur Replicate
      const res = await fetch('https://api.replicate.com/v1/models/zsxkib/instant-id/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            image,
            prompt: prompt || 'professional portrait, high quality, photorealistic, studio lighting',
            negative_prompt: 'blurry, low quality, distorted',
            ip_adapter_strength: 0.8,
            controlnet_conditioning_scale: 0.8,
            num_inference_steps: 30,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))
      predId = pred.id

    } else if (mode === 'style') {
      // FLUX img2img style transfer
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt,
            image,
            prompt_strength: strength || 0.75,
            output_format: 'jpg',
            output_quality: 95,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))
      predId = pred.id

    } else {
      // Default: SDXL img2img
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'da77bc59ee60423279fd632efb4795ab731d9e3ca9705ef3341091fb989b7eaf',
          input: {
            prompt,
            image,
            prompt_strength: strength || 0.6,
            num_inference_steps: 30,
            guidance_scale: 7.5,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))
      predId = pred.id
    }

    const url = await pollPrediction(predId)
    return NextResponse.json({ url })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
