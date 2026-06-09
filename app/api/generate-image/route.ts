import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!

async function runReplicate(model: string, input: Record<string, any>) {
  // Start prediction
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ version: model, input }),
  })
  const prediction = await res.json()
  if (!res.ok) throw new Error(prediction.detail || 'Replicate error')

  // Poll until done
  const id = prediction.id
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    })
    const data = await poll.json()
    if (data.status === 'succeeded') return data.output
    if (data.status === 'failed') throw new Error(data.error || 'Generation failed')
  }
  throw new Error('Timeout')
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, negativePrompt, width, height, steps, guidance, model } = await req.json()

    let output

    if (model === 'flux-pro') {
      // FLUX 1.1 Pro — best quality
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt,
            width: width || 1024,
            height: height || 1024,
            steps: steps || 25,
            guidance: guidance || 3.5,
            output_format: 'jpg',
            output_quality: 95,
            safety_tolerance: 5,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || 'FLUX error')

      // Poll
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
          headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
        })
        const data = await poll.json()
        if (data.status === 'succeeded') { output = data.output; break }
        if (data.status === 'failed') throw new Error(data.error || 'Failed')
      }
    } else if (model === 'sdxl') {
      // SDXL
      output = await runReplicate(
        'da77bc59ee60423279fd632efb4795ab731d9e3ca9705ef3341091fb989b7eaf',
        {
          prompt,
          negative_prompt: negativePrompt || 'blurry, low quality, distorted',
          width: width || 1024,
          height: height || 1024,
          num_inference_steps: steps || 30,
          guidance_scale: guidance || 7.5,
        }
      )
    } else {
      // Default: FLUX schnell (fast)
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt,
            width: width || 1024,
            height: height || 1024,
            num_outputs: 1,
            output_format: 'jpg',
            output_quality: 90,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || 'FLUX error')

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
          headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
        })
        const data = await poll.json()
        if (data.status === 'succeeded') { output = data.output; break }
        if (data.status === 'failed') throw new Error(data.error || 'Failed')
      }
    }

    const imageUrl = Array.isArray(output) ? output[0] : output
    return NextResponse.json({ url: imageUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
