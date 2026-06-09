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

    let referenceUrl = formData.get('reference_url') as string || ''
    let base64Preview = formData.get('base64_preview') as string || ''

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = `${Date.now()}-${name.replace(/\s+/g, '-').toLowerCase()}.jpg`

      // 1. Upload to Supabase Storage pour avoir une vraie URL publique
      const { error: uploadError } = await supabase.storage
        .from('artist-photos')
        .upload(filename, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('artist-photos')
          .getPublicUrl(filename)
        referenceUrl = urlData.publicUrl
      }

      // 2. Stocke aussi un base64 redimensionné pour l'aperçu (max 200px)
      const base64 = buffer.toString('base64')
      base64Preview = `data:image/jpeg;base64,${base64}`

      // Si upload Storage échoue, utilise base64 comme fallback pour l'aperçu
      if (!referenceUrl) {
        referenceUrl = base64Preview
      }
    }

    const profileData = {
      name,
      style,
      genre,
      reference_url: referenceUrl,
      base64_preview: base64Preview.slice(0, 500000) || null, // max 500kb
    }

    if (id) {
      const updateData: any = { name, style, genre }
      if (referenceUrl) {
        updateData.reference_url = referenceUrl
        if (base64Preview) updateData.base64_preview = base64Preview.slice(0, 500000)
      }
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
        .insert(profileData)
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
