import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET — liste tous les profils
export async function GET() {
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('*, artist_generations(id, image_url, prompt, created_at)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profiles: data || [] })
}

// POST — crée ou update un profil
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const name = formData.get('name') as string
    const style = formData.get('style') as string || ''
    const genre = formData.get('genre') as string || ''
    const id = formData.get('id') as string || null
    const file = formData.get('photo') as File | null

    let referenceUrl = formData.get('reference_url') as string || ''

    // Upload photo si fournie
    if (file && file.size > 0) {
      const filename = `${Date.now()}-${name.replace(/\s/g, '-')}.jpg`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await supabase.storage
        .from('mj-gallery')
        .upload(`artists/${filename}`, buffer, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('mj-gallery')
          .getPublicUrl(`artists/${filename}`)
        referenceUrl = urlData.publicUrl
      }
    }

    if (id) {
      // Update
      const { data, error } = await supabase
        .from('artist_profiles')
        .update({ name, style, genre, ...(referenceUrl ? { reference_url: referenceUrl } : {}) })
        .eq('id', id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ profile: data })
    } else {
      // Create
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

// DELETE — supprime un profil
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabase.from('artist_profiles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
