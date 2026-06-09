import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageBase64, scale } = await req.json()
    const image = imageUrl || (imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null)
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
        input: { image, scale: scale || 4 }
      })
    })

    const pred = await res.json()
    if (!res.ok) throw new Error(pred.detail || 'Upscale error')

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
      })
      const data = await poll.json()
      if (data.status === 'succeeded') return NextResponse.json({ url: data.output })
      if (data.status === 'failed') throw new Error(data.error || 'Failed')
    }
    throw new Error('Timeout')
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
