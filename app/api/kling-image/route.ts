import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 120

const ACCESS_KEY = process.env.KLING_ACCESS_KEY!
const SECRET_KEY = process.env.KLING_SECRET_KEY!

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function generateJWT() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: ACCESS_KEY,
    exp: Math.floor(Date.now() / 1000) + 1800,
    nbf: Math.floor(Date.now() / 1000) - 5,
  })).toString('base64url')
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, referenceImages, artistId, style, aspectRatio } = await req.json()

    if (!prompt && (!referenceImages || referenceImages.length === 0)) {
      return NextResponse.json({ error: 'Prompt ou images requis' }, { status: 400 })
    }

    const token = generateJWT()

    // Build reference images array for Kling
    // Each image can be a URL or base64
    const imageRefs = referenceImages?.slice(0, 10).map((img: string, idx: number) => ({
      index: idx + 1,
      url: img.startsWith('data:') ? undefined : img,
      image: img.startsWith('data:') ? img.split(',')[1] : undefined,
    })) || []

    const body: any = {
      model_name: 'kling-v3',
      prompt,
      aspect_ratio: aspectRatio || '16:9',
      image_count: 2,
      image_quality: '2k',
    }

    // Add reference images if provided
    if (imageRefs.length > 0) {
      body.reference_images = imageRefs.map((ref: any) => ({
        reference_index: ref.index,
        ...(ref.url ? { url: ref.url } : { image: ref.image }),
      }))
    }

    if (style) body.style = style

    const res = await fetch('https://api.klingai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({
        error: data.message || 'Kling API error',
        details: data
      }, { status: res.status })
    }

    const taskId = data.data?.task_id

    // Poll for result
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const poll = await fetch(`https://api.klingai.com/v1/images/generations/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const pollData = await poll.json()
      const status = pollData.data?.task_status

      if (status === 'succeed') {
        const images = pollData.data?.task_result?.images || []
        const urls = images.map((img: any) => img.url).filter(Boolean)

        // Save to Supabase if artistId provided
        if (artistId && urls.length > 0) {
          for (const url of urls) {
            await supabase.from('artist_generations').insert({
              artist_id: artistId,
              image_url: url,
              prompt,
            })
          }
        }

        return NextResponse.json({ urls, taskId })
      }

      if (status === 'failed') {
        return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Timeout' }, { status: 408 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'No taskId' }, { status: 400 })

  const token = generateJWT()
  const res = await fetch(`https://api.klingai.com/v1/images/generations/${taskId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()

  return NextResponse.json({
    status: data.data?.task_status,
    images: data.data?.task_result?.images?.map((img: any) => img.url) || [],
  })
}
