import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageBase64, prompt, strength, mode } = await req.json()

    let input: Record<string, any> = {}
    let modelUrl = ''

    const image = imageUrl || (imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null)
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

    if (mode === 'style') {
      // FLUX img2img style transfer
      modelUrl = 'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions'
      input = {
        prompt,
        image,
        prompt_strength: strength || 0.75,
        output_format: 'jpg',
        output_quality: 95,
      }
    } else if (mode === 'portrait') {
      // PhotoMaker — cohérent portrait
      modelUrl = 'https://api.replicate.com/v1/predictions'
      input = {
        version: '67e4a16a1d2389d7e87af96d8c6a3de65e7fd6028c33e2bc42b0dd3ba4e14c89',
        input: {
          prompt: `img, ${prompt}, high quality, photorealistic`,
          input_image: image,
          style_name: 'Photographic (Default)',
          num_steps: 50,
          guidance_scale: 5,
          style_strength_ratio: 20,
        }
      }
    } else {
      // Default img2img with SDXL
      modelUrl = 'https://api.replicate.com/v1/predictions'
      input = {
        version: 'da77bc59ee60423279fd632efb4795ab731d9e3ca9705ef3341091fb989b7eaf',
        input: {
          prompt,
          image,
          prompt_strength: strength || 0.6,
          num_inference_steps: 30,
          guidance_scale: 7.5,
        }
      }
    }

    const res = await fetch(
      mode === 'style' ? modelUrl : 'https://api.replicate.com/v1/predictions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mode === 'style' ? { input } : input)
      }
    )

    const pred = await res.json()
    if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))

    // Poll
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
      })
      const data = await poll.json()
      if (data.status === 'succeeded') {
        const out = Array.isArray(data.output) ? data.output[0] : data.output
        return NextResponse.json({ url: out })
      }
      if (data.status === 'failed') throw new Error(data.error || 'Failed')
    }
    throw new Error('Timeout')
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
