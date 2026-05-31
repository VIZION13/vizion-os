'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Plus, X, ChevronDown, ChevronUp, Sparkles, Trash2 } from 'lucide-react'

interface Artist {
  id: string
  name: string
  avatar: string | null
  bio: string | null
  created_at: string
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [fetching, setFetching] = useState(true)

  const [name, setName] = useState('')
  const [genre, setGenre] = useState('')
  const [bio, setBio] = useState('')
  const [contact, setContact] = useState('')

  useEffect(() => { loadArtists() }, [])

  async function loadArtists() {
    const { data } = await supabase.from('artists').select('*').order('created_at', { ascending: false })
    setArtists(data ?? [])
    setFetching(false)
  }

  async function save() {
    if (!name) return
    setSaving(true)
    const { error } = await supabase.from('artists').insert({
      name,
      bio: bio ? `${genre ? `[${genre}] ` : ''}${bio} | Contact: ${contact}` : null,
      avatar: null,
    })
    if (!error) {
      await loadArtists()
      setShowForm(false)
      setName(''); setGenre(''); setBio(''); setContact('')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    await supabase.from('artists').delete().eq('id', id)
    setArtists(artists.filter(a => a.id !== id))
  }

  async function generateBio() {
    if (!name) return
    setGenerating(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'vizion',
        messages: [{ role: 'user', content: `Écris une bio artistique courte (3 phrases max) pour ${name}${genre ? `, artiste ${genre}` : ''}. Style professionnel et percutant.` }]
      })
    })
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((l: string) => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') break
        try { full += JSON.parse(data).text } catch {}
      }
    }
    setBio(full)
    setGenerating(false)
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-500 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <h1 className="font-display font-black text-3xl text-white">ARTISTS</h1>
          </div>
          <p className="text-white/40 text-sm">Ton roster ({artists.length} artiste{artists.length > 1 ? 's' : ''})</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 text-sky-400 font-medium px-4 py-2.5 rounded-2xl hover:bg-sky-500/30 transition-colors">
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-3xl border border-sky-500/20 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Nouvel artiste</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Nom *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Niska"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors" />
            </div>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Genre</label>
              <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="ex: Trap FR"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors" />
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/50 text-xs uppercase tracking-wider">Bio</label>
              <button onClick={generateBio} disabled={generating || !name}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-40 transition-colors">
                <Sparkles size={12} />
                {generating ? 'Génération...' : 'Générer avec IA'}
              </button>
            </div>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Bio de l'artiste..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors resize-none" />
          </div>
          <div className="mb-4">
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Contact</label>
            <input value={contact} onChange={e => setContact(e.target.value)} placeholder="email / instagram / téléphone"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors" />
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={!name || saving}
              className="bg-sky-600 text-white font-semibold px-6 py-2.5 rounded-2xl disabled:opacity-40 hover:bg-sky-500 transition-colors">
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70 px-4 py-2.5 transition-colors">Annuler</button>
          </div>
        </div>
      )}

      {artists.length === 0 && !fetching && !showForm && (
        <div className="glass rounded-3xl border border-white/8 p-12 text-center">
          <Users size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Aucun artiste — ajoute ton premier</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {artists.map(artist => (
          <div key={artist.id} className="glass-card rounded-3xl border border-white/8 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{artist.name[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-white font-semibold">{artist.name}</p>
                  <p className="text-white/30 text-xs">{new Date(artist.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setExpanded(expanded === artist.id ? null : artist.id)} className="text-white/30 hover:text-white/60 transition-colors">
                  {expanded === artist.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button onClick={() => remove(artist.id)} className="text-white/20 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {expanded === artist.id && artist.bio && (
              <p className="text-white/60 text-sm mt-4 leading-relaxed">{artist.bio}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
