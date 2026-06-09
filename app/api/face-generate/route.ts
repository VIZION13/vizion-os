import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 120

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CINEMATIC = 'ARRI Alexa cinema, Super 35mm, anamorphic lens, RAW, cinematic color grade, photorealistic, 8K, shallow depth of field'

async function pollPrediction(id: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    })
    const data = await poll.json()
    if (data.status === 'succeeded') return Array.isArray(data.output) ? data.output[0] : data.output
    if (data.status === 'failed') throw new Error(data.error || 'Failed')
  }
  throw new Error('Timeout')
}

async function toReplicateUrl(base64DataUrl: string): Promise<string> {
  const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) throw new Error('Invalid image format')
  const buffer = Buffer.from(matches[2], 'base64')
  const res = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': matches[1],
    },
    body: buffer,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`File upload: ${data.detail || JSON.stringify(data)}`)
  return data.urls?.get || data.url
}

export async function POST(req: NextRequest) {
  try {
    const { artistId, referenceUrl, prompt, camera, lens, lighting, colorGrade, aspectRatio, addCinematic, model } = await req.json()

    if (!referenceUrl) return NextResponse.json({ error: 'Photo de référence manquante' }, { status: 400 })

    let imageUrl = referenceUrl
    if (referenceUrl.startsWith('data:')) {
      imageUrl = await toReplicateUrl(referenceUrl)
    }

    const parts = [prompt, camera, lens, lighting, colorGrade].filter(Boolean)
    if (addCinematic !== false) parts.push(CINEMATIC)
    const finalPrompt = parts.join(', ')

    const w = aspectRatio === '16:9' ? 1280 : aspectRatio === '9:16' ? 768 : 1024
    const h = aspectRatio === '16:9' ? 720 : aspectRatio === '9:16' ? 1280 : 1024

    let predId: string

    if (model === 'flux-pulid') {
      // PuLID FLUX — version stable
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'f4b4e3b2b9d1c7e8a5f6d2c3e4b5a6d7c8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3',
          input: {
            main_face_image: imageUrl,
            prompt: finalPrompt,
            negative_prompt: 'blurry, low quality, ugly, distorted face, watermark',
            num_steps: 20,
            guidance: 4.0,
            id_weight: 1.0,
            width: w, height: h,
            output_format: 'jpg',
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(`PuLID: ${pred.detail || JSON.stringify(pred)}`)
      predId = pred.id

    } else if (model === 'ipadapter') {
      // FLUX Dev img2img
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            prompt: finalPrompt,
            image: imageUrl,
            prompt_strength: 0.75,
            num_inference_steps: 28,
            guidance: 3.5,
            width: w, height: h,
            output_format: 'jpg',
            output_quality: 95,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(`FLUX Dev: ${pred.detail || JSON.stringify(pred)}`)
      predId = pred.id

    } else {
      // InstantID — version hash stable
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'f1ca369da43885a347690a98f6b710afbf5f167cb9bf13bd5af512ba4a9f7b63',
          input: {
            image: imageUrl,
            prompt: finalPrompt,
            negative_prompt: 'blurry, low quality, distorted face, ugly, watermark',
            ip_adapter_scale: 0.8,
            controlnet_conditioning_scale: 0.8,
            num_inference_steps: 30,
            guidance_scale: 5.0,
            width: w,
            height: h,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(`InstantID: ${pred.detail || JSON.stringify(pred)}`)
      predId = pred.id
    }

    const url = await pollPrediction(predId)

    if (artistId) {
      await supabase.from('artist_generations').insert({
        artist_id: artistId,
        image_url: url,
        prompt: finalPrompt,
      })
    }

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('face-generate error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
