import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 120

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CINEMATIC_BASE = 'shot on ARRI Alexa Mini LF, Super 35mm sensor, ARRI Signature Prime lens, RAW footage, cinematic color science, shallow depth of field, photorealistic, 8K ultra detailed'

async function pollPrediction(id: string, maxAttempts = 60): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2500))
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    })
    const data = await poll.json()
    if (data.status === 'succeeded') {
      return Array.isArray(data.output) ? data.output[0] : data.output
    }
    if (data.status === 'failed') throw new Error(data.error || 'Generation failed')
  }
  throw new Error('Timeout')
}

async function uploadBase64ToReplicate(base64DataUrl: string): Promise<string> {
  // Convertit base64 en blob et upload sur Replicate Files API
  const matches = base64DataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!matches) throw new Error('Invalid base64')

  const mimeType = matches[1]
  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, 'base64')

  const res = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': mimeType,
      'Content-Length': buffer.length.toString(),
    },
    body: buffer,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'File upload failed')
  return data.urls?.get || data.url
}

export async function POST(req: NextRequest) {
  try {
    const {
      artistId,
      referenceUrl,
      prompt,
      camera,
      lens,
      lighting,
      colorGrade,
      aspectRatio,
      addCinematic,
      model,
    } = await req.json()

    if (!referenceUrl) {
      return NextResponse.json({ error: 'Photo de référence manquante' }, { status: 400 })
    }

    // Si c'est un base64, upload vers Replicate Files pour avoir une vraie URL
    let imageUrl = referenceUrl
    if (referenceUrl.startsWith('data:')) {
      imageUrl = await uploadBase64ToReplicate(referenceUrl)
    }

    const promptParts = [prompt, camera, lens, lighting, colorGrade]
      .filter(Boolean)
    if (addCinematic !== false) promptParts.push(CINEMATIC_BASE)
    const finalPrompt = promptParts.join(', ')

    const width = aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024
    const height = aspectRatio === '16:9' ? 768 : aspectRatio === '9:16' ? 1344 : 1024

    let predId: string

    if (model === 'flux-pulid') {
      const res = await fetch('https://api.replicate.com/v1/models/zsxkib/pulid-flux/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            main_face_image: imageUrl,
            prompt: finalPrompt,
            negative_prompt: 'blurry, low quality, distorted face, bad anatomy, ugly, watermark',
            num_steps: 20,
            start_step: 0,
            guidance: 4.0,
            true_cfg: 1.0,
            id_weight: 1.0,
            width,
            height,
            output_format: 'jpg',
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))
      predId = pred.id

    } else if (model === 'ipadapter') {
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: finalPrompt,
            image: imageUrl,
            prompt_strength: 0.75,
            num_inference_steps: 28,
            guidance: 3.5,
            width,
            height,
            output_format: 'jpg',
            output_quality: 95,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))
      predId = pred.id

    } else {
      // InstantID — default
      const res = await fetch('https://api.replicate.com/v1/models/zsxkib/instant-id/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            image: imageUrl,
            prompt: finalPrompt,
            negative_prompt: 'blurry, low quality, distorted face, bad anatomy, ugly, watermark',
            ip_adapter_strength: 0.85,
            controlnet_conditioning_scale: 0.85,
            num_inference_steps: 35,
            guidance_scale: 5.0,
            width,
            height,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))
      predId = pred.id
    }

    const resultUrl = await pollPrediction(predId)

    if (artistId) {
      await supabase.from('artist_generations').insert({
        artist_id: artistId,
        image_url: resultUrl,
        prompt: finalPrompt,
      })
    }

    return NextResponse.json({ url: resultUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
