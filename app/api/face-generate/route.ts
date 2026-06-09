import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 120

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CINEMATIC_BASE = 'shot on ARRI Alexa Mini LF, Super 35mm sensor, ARRI Signature Prime lens, RAW footage, cinematic color science, shallow depth of field, photorealistic, 8K ultra detailed, professional photography'

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

export async function POST(req: NextRequest) {
  try {
    const {
      artistId,
      referenceUrl,
      prompt,
      style,
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

    // Build final prompt
    const promptParts = [prompt, camera, lens, lighting, colorGrade, style]
      .filter(Boolean)
    if (addCinematic !== false) promptParts.push(CINEMATIC_BASE)
    const finalPrompt = promptParts.join(', ')

    // InstantID — meilleur modèle pour cohérence visage
    const res = await fetch('https://api.replicate.com/v1/models/zsxkib/instant-id/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          image: referenceUrl,
          prompt: finalPrompt,
          negative_prompt: 'blurry, low quality, distorted face, bad anatomy, ugly, deformed, watermark, cartoon, illustration',
          ip_adapter_strength: 0.85,
          controlnet_conditioning_scale: 0.85,
          num_inference_steps: 35,
          guidance_scale: 5.0,
          width: aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024,
          height: aspectRatio === '16:9' ? 768 : aspectRatio === '9:16' ? 1344 : 1024,
        }
      })
    })

    const pred = await res.json()
    if (!res.ok) throw new Error(pred.detail || JSON.stringify(pred))

    const imageUrl = await pollPrediction(pred.id)

    // Sauvegarde dans artist_generations
    if (artistId) {
      await supabase.from('artist_generations').insert({
        artist_id: artistId,
        image_url: imageUrl,
        prompt: finalPrompt,
      })
    }

    return NextResponse.json({ url: imageUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
