import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 180

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CINEMATIC = 'ARRI Alexa cinema, Super 35mm sensor, ARRI Signature Prime lens, RAW footage, cinematic color grade, photorealistic, 8K ultra detailed, shallow depth of field, professional photography, film grain'

async function pollPrediction(id: string, maxWait = 60): Promise<string> {
  for (let i = 0; i < maxWait; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    })
    const data = await poll.json()
    if (data.status === 'succeeded') return Array.isArray(data.output) ? data.output[0] : data.output
    if (data.status === 'failed') throw new Error(data.error || 'Prediction failed')
  }
  throw new Error('Timeout after 3 minutes')
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
  if (!res.ok) throw new Error(`File upload failed: ${data.detail || JSON.stringify(data)}`)
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
    } = await req.json()

    if (!referenceUrl) {
      return NextResponse.json({ error: 'Photo de référence manquante' }, { status: 400 })
    }

    // Convertit base64 → URL Replicate
    let faceImageUrl = referenceUrl
    if (referenceUrl.startsWith('data:')) {
      faceImageUrl = await toReplicateUrl(referenceUrl)
    }

    // Build cinematic prompt
    const parts = [prompt, camera, lens, lighting, colorGrade].filter(Boolean)
    if (addCinematic !== false) parts.push(CINEMATIC)
    const finalPrompt = parts.join(', ')

    const w = aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024
    const h = aspectRatio === '16:9' ? 768 : aspectRatio === '9:16' ? 1344 : 1024

    // ── ÉTAPE 1 : FLUX Pro Ultra → image haute qualité ──
    const fluxRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: finalPrompt,
          aspect_ratio: aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : aspectRatio === '4:5' ? '4:5' : '1:1',
          output_format: 'jpg',
          output_quality: 100,
          safety_tolerance: 5,
          raw: true,
        }
      })
    })

    const fluxPred = await fluxRes.json()
    if (!fluxRes.ok) throw new Error(`FLUX: ${fluxPred.detail || JSON.stringify(fluxPred)}`)

    const generatedImageUrl = await pollPrediction(fluxPred.id, 40)

    // ── ÉTAPE 2 : FaceFusion → swap le visage de l'artiste ──
    const fuseRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'cff669d2700f848c8544e2693cb39a6d7c1f97a80e02d8a2d20b50e5a7272e4c',
        input: {
          user_image: faceImageUrl,       // visage de l'artiste
          template_image: generatedImageUrl, // image FLUX générée
        }
      })
    })

    const fusePred = await fuseRes.json()
    if (!fuseRes.ok) throw new Error(`FaceFusion: ${fusePred.detail || JSON.stringify(fusePred)}`)

    const finalImageUrl = await pollPrediction(fusePred.id, 40)

    // Sauvegarde
    if (artistId) {
      await supabase.from('artist_generations').insert({
        artist_id: artistId,
        image_url: finalImageUrl,
        prompt: finalPrompt,
      })
    }

    return NextResponse.json({
      url: finalImageUrl,
      flux_url: generatedImageUrl, // image avant swap (debug)
    })

  } catch (err: any) {
    console.error('face-generate error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
