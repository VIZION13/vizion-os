import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!

// Suffixe cinématique ajouté automatiquement à tous les prompts
const CINEMATIC_SUFFIX = 'shot on ARRI Alexa Mini LF, Super 35mm sensor, ARRI Signature Prime lens, anamorphic, RAW footage, cinematic color science, shallow depth of field, film grain, professional color grade, photorealistic, 8K, ultra detailed'

async function pollPrediction(id: string, maxAttempts = 60): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000))
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

export async function POST(req: NextRequest) {
  try {
    const { prompt, negativePrompt, width, height, steps, guidance, model, addCinematic = true } = await req.json()

    // Ajoute automatiquement le suffixe cinématique si activé
    const finalPrompt = addCinematic
      ? `${prompt}, ${CINEMATIC_SUFFIX}`
      : prompt

    const finalNegative = negativePrompt || 'blurry, low quality, distorted, ugly, watermark, text, oversaturated, unrealistic, cartoon, anime, painting, digital art, illustration, CGI, render'

    let url: string

    if (model === 'flux-pro') {
      // FLUX 1.1 Pro Ultra — meilleur qualité photoréaliste
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: finalPrompt,
            aspect_ratio: getAspectRatio(width, height),
            output_format: 'jpg',
            output_quality: 100,
            safety_tolerance: 5,
            raw: true, // Mode RAW = photoréalisme maximum
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))
      url = await pollPrediction(pred.id)

    } else if (model === 'flux-dev') {
      // FLUX Dev — bon équilibre qualité/vitesse
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: finalPrompt,
            width: width || 1024,
            height: height || 1024,
            num_inference_steps: steps || 28,
            guidance: guidance || 3.5,
            output_format: 'jpg',
            output_quality: 95,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))
      url = await pollPrediction(pred.id)

    } else {
      // FLUX Schnell — rapide
      const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: finalPrompt,
            width: width || 1024,
            height: height || 1024,
            num_outputs: 1,
            output_format: 'jpg',
            output_quality: 90,
          }
        })
      })
      const pred = await res.json()
      if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))
      url = await pollPrediction(pred.id)
    }

    return NextResponse.json({ url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function getAspectRatio(width: number, height: number): string {
  if (!width || !height) return '1:1'
  const ratio = width / height
  if (ratio > 1.7) return '16:9'
  if (ratio > 1.4) return '3:2'
  if (ratio < 0.6) return '9:16'
  if (ratio < 0.75) return '2:3'
  if (ratio < 0.9) return '4:5'
  return '1:1'
}
