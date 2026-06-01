import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const KITS_API_KEY = process.env.KITS_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio = formData.get('audio') as File
    const conversion = formData.get('conversion') as string || 'enhance'

    if (!audio) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    const kitsForm = new FormData()
    kitsForm.append('audioFile', audio)
    kitsForm.append('conversionType', conversion)

    const res = await fetch('https://arpeggi.io/api/kits/v1/voice-conversions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KITS_API_KEY}`,
      },
      body: kitsForm,
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Kits API error', details: data }, { status: res.status })
    }

    return NextResponse.json({ jobId: data.id, status: data.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'No jobId' }, { status: 400 })

  const res = await fetch(`https://arpeggi.io/api/kits/v1/voice-conversions/${jobId}`, {
    headers: { 'Authorization': `Bearer ${KITS_API_KEY}` },
  })

  const data = await res.json()
  return NextResponse.json({
    status: data.status,
    outputUrl: data.outputUrl,
    progress: data.progress,
  })
}
