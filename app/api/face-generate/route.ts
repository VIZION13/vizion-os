import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 180

const OPENAI_KEY = process.env.OPENAI_API_KEY!
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CINEMATIC = 'shot on ARRI Alexa Mini LF, Super 35mm sensor, ARRI Signature Prime lens, RAW footage, cinematic color science, shallow depth of field, photorealistic, 8K ultra detailed, professional photography, film grain'

async function pollReplicate(id: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    })
    const data = await poll.json()
    if (data.status === 'succeeded') return Array.isArray(data.output) ? data.output[0] : data.output
    if (data.status === 'failed') throw new Error(data.error || 'FaceFusion failed')
  }
  throw new Error('Timeout')
}

async function uploadToReplicate(buffer: Buffer, mimeType: string): Promise<string> {
  const res = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': mimeType,
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Replicate upload: ${data.detail || JSON.stringify(data)}`)
  return data.urls?.get || data.url
}

async function toReplicateUrl(input: string): Promise<string> {
  // Already a public URL
  if (input.startsWith('http')) return input

  // base64 data URL
  const matches = input.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) throw new Error('Invalid image format')
  const buffer = Buffer.from(matches[2], 'base64')
  return uploadToReplicate(buffer, matches[1])
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
      skipFaceFusion,
    } = await req.json()

    if (!prompt) return NextResponse.json({ error: 'Prompt requis' }, { status: 400 })

    const parts = [prompt, camera, lens, lighting, colorGrade].filter(Boolean)
    if (addCinematic !== false) parts.push(CINEMATIC)
    const finalPrompt = parts.join(', ')

    const sizeMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
      '4:5': '1024x1280',
      '21:9': '1792x768',
    }
    const size = sizeMap[aspectRatio] || '1024x1024'

    // ── ÉTAPE 1 : OpenAI gpt-image-1 ──
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: finalPrompt,
        n: 1,
        size,
        quality: 'high',
        output_format: 'png',
      })
    })

    const openaiData = await openaiRes.json()
    if (!openaiRes.ok) throw new Error(`OpenAI: ${openaiData.error?.message || JSON.stringify(openaiData)}`)

    const generatedImage = openaiData.data?.[0]
    if (!generatedImage) throw new Error('OpenAI: pas d\'image générée')

    // Récupère le base64 ou l'URL
    let generatedBase64: string | null = generatedImage.b64_json || null
    let generatedUrl: string | null = generatedImage.url || null

    // Si base64, crée une data URL
    const generatedDataUrl = generatedBase64
      ? `data:image/png;base64,${generatedBase64}`
      : generatedUrl

    if (!generatedDataUrl) throw new Error('OpenAI: image invalide')

    // Si pas de face fusion → retourne directement
    if (!referenceUrl || skipFaceFusion) {
      if (artistId) {
        await supabase.from('artist_generations').insert({
          artist_id: artistId,
          image_url: generatedDataUrl,
          prompt: finalPrompt,
        })
      }
      return NextResponse.json({ url: generatedDataUrl, openai_url: generatedDataUrl })
    }

    // ── ÉTAPE 2 : Upload les deux images vers Replicate Files ──
    const faceUrl = await toReplicateUrl(referenceUrl)
    const templateUrl = await toReplicateUrl(generatedDataUrl)

    // ── ÉTAPE 3 : FaceFusion ──
    const fuseRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '52edbb2b42beb4e19242f0c9ad5717211a96c63ff1f0b0320caa518b2745f4f7',
        input: {
          user_image: faceUrl,
          template_image: templateUrl,
        }
      })
    })

    const fusePred = await fuseRes.json()
    if (!fuseRes.ok) throw new Error(`FaceFusion: ${fusePred.detail || JSON.stringify(fusePred)}`)

    const finalUrl = await pollReplicate(fusePred.id)

    if (artistId) {
      await supabase.from('artist_generations').insert({
        artist_id: artistId,
        image_url: finalUrl,
        prompt: finalPrompt,
      })
    }

    return NextResponse.json({ url: finalUrl, openai_url: generatedDataUrl })

  } catch (err: any) {
    console.error('face-generate error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
