import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

const ACCESS_KEY = process.env.KLING_ACCESS_KEY!
const SECRET_KEY = process.env.KLING_SECRET_KEY!

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
    const { imageUrl, imageBase64, prompt, duration = '8', aspectRatio = '16:9' } = await req.json()

    const token = generateJWT()

    const body: any = {
      model_name: 'kling-v1-5',
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      cfg_scale: 0.5,
    }

    if (imageBase64) {
      body.image = imageBase64
    } else if (imageUrl) {
      body.image_url = imageUrl
    }

    const res = await fetch('https://api.klingai.com/v1/videos/image2video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Kling API error', details: data }, { status: res.status })
    }

    return NextResponse.json({ taskId: data.data?.task_id, status: data.data?.task_status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'No taskId' }, { status: 400 })

  const token = generateJWT()

  const res = await fetch(`https://api.klingai.com/v1/videos/image2video/${taskId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  const data = await res.json()
  return NextResponse.json({
    status: data.data?.task_status,
    videoUrl: data.data?.task_result?.videos?.[0]?.url,
    cover: data.data?.task_result?.videos?.[0]?.cover_image_url,
  })
}
