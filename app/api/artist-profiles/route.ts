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

    if (file && file.size > 0) {
      const filename = `${Date.now()}-${name.replace(/\s/g, '-')}.jpg`
      const buffer = Buffer.from(await file.arrayBuffer())

      // Try mj-gallery bucket first, fallback to direct URL
      const { error: uploadError } = await supabase.storage
        .from('mj-gallery')
        .upload(`artists/${filename}`, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('mj-gallery')
          .getPublicUrl(`artists/${filename}`)
        referenceUrl = urlData.publicUrl
      } else {
        console.error('Upload error:', uploadError)
        // Try without folder
        const { error: uploadError2 } = await supabase.storage
          .from('mj-gallery')
          .upload(`artist-${filename}`, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true,
          })
        if (!uploadError2) {
          const { data: urlData } = supabase.storage
            .from('mj-gallery')
            .getPublicUrl(`artist-${filename}`)
          referenceUrl = urlData.publicUrl
        }
      }
    }

    if (id) {
      const { data, error } = await supabase
        .from('artist_profiles')
        .update({ name, style, genre, ...(referenceUrl ? { reference_url: referenceUrl } : {}) })
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

    // Get profile to delete photo from storage
    const { data: profile } = await supabase
      .from('artist_profiles')
      .select('reference_url')
      .eq('id', id)
      .single()

    // Delete from storage if exists
    if (profile?.reference_url) {
      const url = profile.reference_url as string
      const parts = url.split('/mj-gallery/')
      if (parts.length > 1) {
        await supabase.storage.from('mj-gallery').remove([parts[1]])
      }
    }

    // Delete generations first
    await supabase.from('artist_generations').delete().eq('artist_id', id)

    // Delete profile
    const { error } = await supabase.from('artist_profiles').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
