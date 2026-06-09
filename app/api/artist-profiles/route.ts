import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('*, artist_generations(id, image_url, prompt, created_at)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profiles: data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const name = formData.get('name') as string
    const style = formData.get('style') as string || ''
    const genre = formData.get('genre') as string || ''
    const id = formData.get('id') as string || null
    const file = formData.get('photo') as File | null

    // Stocke la photo en base64 dans la colonne reference_url
    let referenceUrl = formData.get('reference_url') as string || ''

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = file.type || 'image/jpeg'
      referenceUrl = `data:${mimeType};base64,${base64}`
    }

    if (id) {
      const updateData: any = { name, style, genre }
      if (referenceUrl) updateData.reference_url = referenceUrl
      const { data, error } = await supabase
        .from('artist_profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ profile: data })
    } else {
      const { data, error } = await supabase
        .from('artist_profiles')
        .insert({ name, style, genre, reference_url: referenceUrl })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ profile: data })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await supabase.from('artist_generations').delete().eq('artist_id', id)
    const { error } = await supabase.from('artist_profiles').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
