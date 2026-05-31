'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Music2, Sparkles, Save, Copy, Check, Trash2 } from 'lucide-react'

interface Song {
  id: string
  title: string
  bpm: number | null
  key: string | null
  prompt: string | null
  created_at: string
}

const STYLES = ['Trap', 'Drill', 'Afro', 'R&B', 'Pop', 'Dancehall', 'Rap FR', 'Amapiano']
const MOODS = ['Sombre', 'Festif', 'Mélancolique', 'Agressif', 'Romantique', 'Motivant']

export default function MusicPage() {
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState('')
  const [bpm, setBpm] = useState('')
  const [key, setKey] = useState('')
  const [mood, setMood] = useState('')
  const [refs, setRefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ suno_prompt: string; structure: string; tips: string } | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadSongs() }, [])

  async function loadSongs() {
    const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
    setSongs(data ?? [])
  }

  async function generate() {
    if (!title || !style) return
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'music',
        messages: [{
          role: 'user',
          content: `Génère un prompt Suno pour "${title}". Style: ${style}${bpm ? `, BPM: ${bpm}` : ''}${mood ? `, Ambiance: ${mood}` : ''}${refs ? `, Refs: ${refs}` : ''}.

JSON uniquement :
{
  "suno_prompt": "prompt optimisé Suno max 200 mots",
  "structure": "Intro → Couplet 1 → ...",
  "tips": "conseils production"
}`
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
      setResult({ suno_prompt: full, structure: '', tips: '' })
    }
    setLoading(false)
  }

  async function save() {
    if (!result) return
    setSaving(true)
    const { error } = await supabase.from('songs').insert({
      title,
      bpm: bpm ? parseInt(bpm) : null,
      key: key || null,
      prompt: result.suno_prompt,
    })
    if (!error) {
      await loadSongs()
      setResult(null)
      setTitle(''); setStyle(''); setBpm(''); setKey(''); setMood(''); setRefs('')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    await supabase.from('songs').delete().eq('id', id)
    setSongs(songs.filter(s => s.id !== id))
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-500 flex items-center justify-center">
            <Music2 size={20} className="text-white" />
          </div>
          <h1 className="font-display font-black text-3xl text-white">MUSIC</h1>
        </div>
        <p className="text-white/40 text-sm">Génère tes prompts Suno et structures</p>
      </div>

      <div className="glass-card rounded-3xl border border-white/8 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Titre *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: PARANOIA"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
          </div>
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">BPM</label>
            <input value={bpm} onChange={e => setBpm(e.target.value)} placeholder="ex: 140" type="number"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Style *</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <button key={s} onClick={() => setStyle(s)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${style === s ? 'bg-pink-500/30 border border-pink-500/50 text-pink-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Ambiance</label>
          <div className="flex flex-wrap gap-2">
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(mood === m ? '' : m)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${mood === m ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Références</label>
          <input value={refs} onChange={e => setRefs(e.target.value)} placeholder="ex: Travis Scott, Hamza, Freeze Corleone"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
        </div>

        <button onClick={generate} disabled={loading || !title || !style}
          className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
          <Sparkles size={16} />
          {loading ? 'Génération...' : 'Générer le prompt Suno'}
        </button>
      </div>

      {loading && (
        <div className="glass rounded-3xl p-8 text-center mb-6">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Composition en cours...</p>
        </div>
      )}

      {result && (
        <div className="space-y-4 mb-6">
          <div className="glass-card rounded-3xl border border-pink-500/20 p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-pink-400 text-xs uppercase tracking-wider font-medium">Prompt Suno AI</p>
              <button onClick={() => copy(result.suno_prompt)} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors">
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">{result.suno_prompt}</p>
          </div>

          {result.structure && (
            <div className="glass-card rounded-3xl border border-purple-500/20 p-6">
              <p className="text-purple-400 text-xs uppercase tracking-wider font-medium mb-3">Structure</p>
              <p className="text-white/80 text-sm leading-relaxed">{result.structure}</p>
            </div>
          )}

          {result.tips && (
            <div className="glass-card rounded-3xl border border-sky-500/20 p-6">
              <p className="text-sky-400 text-xs uppercase tracking-wider font-medium mb-3">Tips production</p>
              <p className="text-white/80 text-sm leading-relaxed">{result.tips}</p>
            </div>
          )}

          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium px-5 py-2.5 rounded-2xl hover:bg-emerald-500/30 transition-colors">
            <Save size={14} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder dans Supabase'}
          </button>
        </div>
      )}

      {songs.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-xs tracking-widest text-white/30 uppercase mb-4">Librairie ({songs.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {songs.map(song => (
              <div key={song.id} className="glass rounded-2xl border border-white/8 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{song.title}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {song.bpm && <span className="text-white/40 text-xs bg-white/5 px-2 py-0.5 rounded-lg">{song.bpm} BPM</span>}
                      {song.key && <span className="text-pink-400 text-xs bg-pink-500/10 px-2 py-0.5 rounded-lg">{song.key}</span>}
                    </div>
                    {song.prompt && <p className="text-white/40 text-xs mt-2 line-clamp-2">{song.prompt}</p>}
                  </div>
                  <button onClick={() => remove(song.id)} className="text-white/20 hover:text-red-400 transition-colors ml-2">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
