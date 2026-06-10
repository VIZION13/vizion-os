import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    const accessToken = req.headers.get('x-access-token')

    if (!accessToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const now = new Date()
    const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate())

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${now.toISOString()}&` +
      `timeMax=${oneMonthLater.toISOString()}&` +
      `singleEvents=true&orderBy=startTime&maxResults=50`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Google Calendar error')

    return NextResponse.json({ events: data.items || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers.get('x-access-token')
    if (!accessToken) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { title, description, start, end, color } = await req.json()

    const colorMap: Record<string, string> = {
      violet: '3', blue: '1', green: '2', red: '4', orange: '6', pink: '4'
    }

    const event = {
      summary: title,
      description: description || '',
      start: { dateTime: start, timeZone: 'Europe/Paris' },
      end: { dateTime: end, timeZone: 'Europe/Paris' },
      colorId: colorMap[color] || '3',
    }

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Create event error')

    return NextResponse.json({ event: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const accessToken = req.headers.get('x-access-token')
    if (!accessToken) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { eventId } = await req.json()

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
