import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const prompt = formData.get('prompt') as string || ''
    const tags = formData.get('tags') as string || ''

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const filename = `${Date.now()}-${file.name.replace(/\s/g, '-')}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('mj-gallery')
      .upload(`public/${filename}`, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabase.storage
      .from('mj-gallery')
      .getPublicUrl(`public/${filename}`)

    // Save metadata to clips table
    await supabase.from('mj_gallery').insert({
      filename,
      url: urlData.publicUrl,
      prompt,
      tags,
      created_at: new Date().toISOString(),
    }).select()

    return NextResponse.json({ url: urlData.publicUrl, filename })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('mj_gallery')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      // Fallback: list from storage if table doesn't exist
      const { data: files } = await supabase.storage
        .from('mj-gallery')
        .list('public', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })

      if (files) {
        const items = files.map(f => ({
          id: f.id,
          filename: f.name,
          url: supabase.storage.from('mj-gallery').getPublicUrl(`public/${f.name}`).data.publicUrl,
          prompt: '',
          tags: '',
          created_at: f.created_at,
        }))
        return NextResponse.json({ items })
      }
    }

    return NextResponse.json({ items: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { filename, id } = await req.json()
    await supabase.storage.from('mj-gallery').remove([`public/${filename}`])
    if (id) await supabase.from('mj_gallery').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
