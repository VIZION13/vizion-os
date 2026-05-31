'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Clapperboard, Sparkles, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Scene {
  number: number
  plan: string
  description: string
  ambiance: string
  duration: string
}

interface Clip {
  id: string
  title: string
  storyboard: string
  prompt: string
  created_at: string
}

export default function ClipPage() {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [concept, setConcept] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ scenes: Scene[]; prompt: string } | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => { loadClips() }, [])

  async function loadClips() {
    const { data } = await supabase.from('clips').select('*').order('created_at', { ascending: false })
    setClips(data ?? [])
    setFetching(false)
  }

  async function generate() {
    if (!title || !concept) return
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'clip',
        messages: [{
          role: 'user',
          content: `Génère un storyboard complet pour le clip "${title}" de ${artist || 'l\'artiste'}.
Concept : ${concept}

Réponds UNIQUEMENT en JSON valide :
{
  "scenes": [
    { "number": 1, "plan": "Plan large", "description": "Description", "ambiance": "Ambiance", "duration": "5s" }
  ],
  "prompt": "Prompt Kling/MidJourney optimisé"
}

Génère 6 à 8 scènes.`
        }]
      })
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') break
        try { full += JSON.parse(data).text } catch {}
      }
    }

    try {
      setResult(JSON.parse(full.replace(/```json|```/g, '').trim()))
    } catch {
      setResult({ scenes: [], prompt: full })
    }
    setLoading(false)
  }

  async function save() {
    if (!result) return
    setSaving(true)
    const { error } = await supabase.from('clips').insert({
      title,
      storyboard: JSON.stringify(result.scenes),
      prompt: result.prompt,
    })
    if (!error) {
      await loadClips()
      setResult(null)
      setTitle(''); setArtist(''); setConcept('')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    await supabase.from('clips').delete().eq('id', id)
    setClips(clips.filter(c => c.id !== id))
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
            <Clapperboard size={20} className="text-white" />
          </div>
          <h1 className="font-display font-black text-3xl text-white">CLIP</h1>
        </div>
        <p className="text-white/40 text-sm">Génère ton storyboard avec l'IA</p>
      </div>

      {/* Form */}
      <div className="glass-card rounded-3xl border border-white/8 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Titre *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: SOLITAIRE"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors" />
          </div>
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Artiste</label>
            <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="ex: Niska"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors" />
          </div>
        </div>
        <div className="mb-4">
          <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Concept *</label>
          <textarea value={concept} onChange={e => setConcept(e.target.value)} rows={3}
            placeholder="ex: Clip nocturne à Paris, ambiance trap sombre, voiture, néons..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
        </div>
        <button onClick={generate} disabled={loading || !title || !concept}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
          <Sparkles size={16} />
          {loading ? 'Génération...' : 'Générer le storyboard'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass rounded-3xl border border-white/8 p-8 text-center mb-6">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">L'IA construit ton storyboard...</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="glass-card rounded-3xl border border-violet-500/20 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-white text-xl">{title}</h2>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium px-4 py-2 rounded-xl hover:bg-emerald-500/30 transition-colors">
              <Save size={14} />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
          <div className="space-y-3 mb-6">
            {result.scenes.map(scene => (
              <div key={scene.number} className="bg-white/3 rounded-2xl border border-white/6 p-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{scene.number}</span>
                  <div>
                    <div className="flex flex-wrap gap-2 mb-1">
                      <span className="text-violet-400 text-xs font-medium bg-violet-500/10 px-2 py-0.5 rounded-lg">{scene.plan}</span>
                      <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-lg">{scene.duration}</span>
                    </div>
                    <p className="text-white/80 text-sm">{scene.description}</p>
                    <p className="text-white/40 text-xs mt-1 italic">{scene.ambiance}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {result.prompt && (
            <div className="bg-pink-500/5 border border-pink-500/20 rounded-2xl p-4">
              <p className="text-pink-400 text-xs uppercase tracking-wider font-medium mb-2">Prompt Kling / MidJourney</p>
              <p className="text-white/70 text-sm">{result.prompt}</p>
            </div>
          )}
        </div>
      )}

      {/* Saved clips from Supabase */}
      {clips.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-xs tracking-widest text-white/30 uppercase mb-4">
            Storyboards ({clips.length})
          </h2>
          <div className="space-y-3">
            {clips.map(clip => {
              const scenes: Scene[] = clip.storyboard ? JSON.parse(clip.storyboard) : []
              return (
                <div key={clip.id} className="glass rounded-2xl border border-white/8">
                  <div className="flex items-center justify-between p-4">
                    <button onClick={() => setExpanded(expanded === clip.id ? null : clip.id)} className="flex-1 text-left">
                      <p className="text-white font-medium">{clip.title}</p>
                      <p className="text-white/40 text-xs">{scenes.length} scènes — {new Date(clip.created_at).toLocaleDateString('fr-FR')}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpanded(expanded === clip.id ? null : clip.id)} className="text-white/30 hover:text-white/60 transition-colors">
                        {expanded === clip.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button onClick={() => remove(clip.id)} className="text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {expanded === clip.id && (
                    <div className="px-4 pb-4 space-y-2">
                      {scenes.map(scene => (
                        <div key={scene.number} className="bg-white/3 rounded-xl p-3">
                          <span className="text-violet-400 text-xs font-medium">Scène {scene.number} — {scene.plan}</span>
                          <p className="text-white/60 text-sm mt-1">{scene.description}</p>
                        </div>
                      ))}
                      {clip.prompt && (
                        <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-3">
                          <p className="text-pink-400 text-xs mb-1">Prompt</p>
                          <p className="text-white/60 text-sm">{clip.prompt}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {clips.length === 0 && !fetching && !result && (
        <div className="glass rounded-3xl border border-white/8 p-12 text-center">
          <Clapperboard size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Aucun storyboard — génère ton premier clip</p>
        </div>
      )}
    </div>
  )
}
