'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Music2, Sparkles, Save, Copy, Check, Trash2, ExternalLink, Zap, Mic, FileText } from 'lucide-react'

interface Song { id: string; title: string; bpm: number | null; key: string | null; prompt: string | null; created_at: string }

const STYLES = ['Trap', 'Drill', 'Afro', 'R&B', 'Pop', 'Dancehall', 'Rap FR', 'Amapiano', 'Soul', 'Drill UK']
const MOODS = ['Sombre', 'Festif', 'Mélancolique', 'Agressif', 'Romantique', 'Motivant', 'Introspectif']
const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

type Tab = 'prompt' | 'topline' | 'arrangement'

export default function MusicPage() {
  const [tab, setTab] = useState<Tab>('prompt')
  const [songs, setSongs] = useState<Song[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Prompt tab
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState('')
  const [bpm, setBpm] = useState('')
  const [key, setKey] = useState('')
  const [mood, setMood] = useState('')
  const [refs, setRefs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ suno_prompt: string; structure: string; tips: string; suno_tags: string } | null>(null)

  // Topline tab
  const [toplineTitle, setToplineTitle] = useState('')
  const [toplineStyle, setToplineStyle] = useState('')
  const [toplineTheme, setToplineTheme] = useState('')
  const [toplineLoading, setToplineLoading] = useState(false)
  const [toplineResult, setToplineResult] = useState('')

  // Arrangement tab
  const [arrangTitle, setArrangTitle] = useState('')
  const [arrangDesc, setArrangDesc] = useState('')
  const [arrangStyle, setArrangStyle] = useState('')
  const [arrangLoading, setArrangLoading] = useState(false)
  const [arrangResult, setArrangResult] = useState<{ suno_prompt: string; arrangement: string; instruments: string } | null>(null)

  useEffect(() => { loadSongs() }, [])

  async function loadSongs() {
    const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
    setSongs(data ?? [])
  }

  function copyAndOpenSuno(prompt: string) {
    navigator.clipboard.writeText(prompt)
    setCopied(prompt)
    setTimeout(() => setCopied(null), 3000)
    window.open('https://suno.com/create', '_blank')
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── PROMPT GENERATOR ──
  async function generatePrompt() {
    if (!title || !style) return
    setLoading(true); setResult(null)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'music',
        messages: [{
          role: 'user',
          content: `Génère un prompt Suno complet pour "${title}".
Style: ${style}${bpm ? `, BPM: ${bpm}` : ''}${key ? `, Tonalité: ${key}` : ''}${mood ? `, Ambiance: ${mood}` : ''}${refs ? `, Refs: ${refs}` : ''}

JSON uniquement :
{
  "suno_prompt": "description complète du son pour Suno Custom Mode, max 200 mots",
  "suno_tags": "tags courts séparés par virgules pour Suno (genre, mood, instruments)",
  "structure": "Intro (8 bars) → Couplet 1 → ...",
  "tips": "conseils de production spécifiques"
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
      for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
        const d = line.replace('data: ', '')
        if (d === '[DONE]') break
        try { full += JSON.parse(d).text } catch {}
      }
    }
    try { setResult(JSON.parse(full.replace(/```json|```/g, '').trim())) }
    catch { setResult({ suno_prompt: full, suno_tags: '', structure: '', tips: '' }) }
    setLoading(false)
  }

  async function savePrompt() {
    if (!result) return
    setSaving(true)
    await supabase.from('songs').insert({ title, bpm: bpm ? parseInt(bpm) : null, key: key || null, prompt: result.suno_prompt })
    await loadSongs()
    setResult(null); setTitle(''); setStyle(''); setBpm(''); setKey(''); setMood(''); setRefs('')
    setSaving(false)
  }

  // ── TOPLINE GENERATOR ──
  async function generateTopline() {
    if (!toplineTitle || !toplineStyle) return
    setToplineLoading(true); setToplineResult('')
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'music',
        messages: [{
          role: 'user',
          content: `Écris une topline complète pour le titre "${toplineTitle}".
Style : ${toplineStyle}
${toplineTheme ? `Thème/Émotion : ${toplineTheme}` : ''}

Génère :
1. HOOK / REFRAIN (8 bars) — accrocheur, mémorisable
2. COUPLET 1 (16 bars) — storytelling, détails
3. COUPLET 2 (16 bars) — progression
4. PONT (8 bars) — émotion peak

Phonétique adaptée au ${toplineStyle}, flow naturel, mots qui sonnent bien sur la mélodie.`
        }]
      })
    })
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
        const d = line.replace('data: ', '')
        if (d === '[DONE]') break
        try { setToplineResult(prev => prev + JSON.parse(d).text) } catch {}
      }
    }
    setToplineLoading(false)
  }

  // ── ARRANGEMENT ──
  async function generateArrangement() {
    if (!arrangTitle) return
    setArrangLoading(true); setArrangResult(null)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'music',
        messages: [{
          role: 'user',
          content: `Génère un arrangement détaillé pour Suno pour le titre "${arrangTitle}".
${arrangStyle ? `Style : ${arrangStyle}` : ''}
${arrangDesc ? `Description/Maquette : ${arrangDesc}` : ''}

JSON uniquement :
{
  "suno_prompt": "prompt Suno Custom Mode optimisé pour cet arrangement, max 200 mots",
  "arrangement": "Description détaillée de l'arrangement : intro, drops, transitions, éléments sonores",
  "instruments": "Liste des instruments/sons : kicks, snares, hi-hats, basses, leads, pads, FX..."
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
      for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
        const d = line.replace('data: ', '')
        if (d === '[DONE]') break
        try { full += JSON.parse(d).text } catch {}
      }
    }
    try { setArrangResult(JSON.parse(full.replace(/```json|```/g, '').trim())) }
    catch { setArrangResult({ suno_prompt: full, arrangement: '', instruments: '' }) }
    setArrangLoading(false)
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-500 flex items-center justify-center flex-shrink-0">
          <Music2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">MUSIC</h1>
          <p className="text-white/40 text-xs">Prompts · Toplines · Arrangements → Suno</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'prompt', label: '🎵 Prompt Suno' },
          { id: 'topline', label: '🎤 Topline' },
          { id: 'arrangement', label: '🎹 Arrangement' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${tab === id ? 'bg-pink-500/20 border border-pink-500/40 text-pink-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PROMPT TAB ── */}
      {tab === 'prompt' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-5 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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

            <div className="mb-3">
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

            <div className="mb-3">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Tonalité</label>
              <div className="flex flex-wrap gap-2">
                {KEYS.map(k => (
                  <button key={k} onClick={() => setKey(key === k ? '' : k)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${key === k ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Ambiance</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(m => (
                  <button key={m} onClick={() => setMood(mood === m ? '' : m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${mood === m ? 'bg-pink-500/20 border border-pink-500/30 text-pink-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
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

            <button onClick={generatePrompt} disabled={loading || !title || !style}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Sparkles size={16} />
              {loading ? 'Génération...' : 'Générer le prompt Suno'}
            </button>
          </div>

          {result && (
            <div className="space-y-3 mb-5">
              {/* Suno Tags */}
              {result.suno_tags && (
                <div className="glass-card rounded-3xl border border-pink-500/15 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-pink-400 text-xs uppercase tracking-wider font-medium">Tags Suno</p>
                    <button onClick={() => copy(result.suno_tags)} className="flex items-center gap-1 text-xs text-white/40 hover:text-white">
                      {copied === result.suno_tags ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      Copier
                    </button>
                  </div>
                  <p className="text-white/70 text-sm font-mono">{result.suno_tags}</p>
                </div>
              )}

              {/* Suno Prompt */}
              <div className="glass-card rounded-3xl border border-pink-500/20 p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-pink-400 text-xs uppercase tracking-wider font-medium">Prompt Suno (Custom Mode)</p>
                  <div className="flex gap-2">
                    <button onClick={() => copy(result.suno_prompt)} className="flex items-center gap-1 text-xs text-white/40 hover:text-white">
                      {copied === result.suno_prompt ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      Copier
                    </button>
                  </div>
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-4">{result.suno_prompt}</p>
                <button onClick={() => copyAndOpenSuno(result.suno_prompt)}
                  className="flex items-center gap-2 w-full justify-center bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-2xl hover:opacity-90 transition-opacity">
                  <Zap size={16} />
                  {copied === result.suno_prompt ? '✓ Copié — Suno ouvert !' : 'Copier + Ouvrir Suno'}
                  <ExternalLink size={13} />
                </button>
                {copied === result.suno_prompt && (
                  <p className="text-white/30 text-xs text-center mt-2">Colle dans Suno → Custom Mode → Style of Music</p>
                )}
              </div>

              {result.structure && (
                <div className="glass-card rounded-3xl border border-purple-500/15 p-4">
                  <p className="text-purple-400 text-xs uppercase tracking-wider font-medium mb-2">Structure</p>
                  <p className="text-white/70 text-sm leading-relaxed">{result.structure}</p>
                </div>
              )}

              {result.tips && (
                <div className="glass-card rounded-3xl border border-sky-500/15 p-4">
                  <p className="text-sky-400 text-xs uppercase tracking-wider font-medium mb-2">Tips production</p>
                  <p className="text-white/70 text-sm leading-relaxed">{result.tips}</p>
                </div>
              )}

              <button onClick={savePrompt} disabled={saving}
                className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium px-5 py-2.5 rounded-2xl">
                <Save size={14} />{saving ? 'Sauvegarde...' : 'Sauvegarder dans la librairie'}
              </button>
            </div>
          )}

          {/* Library */}
          {songs.length > 0 && (
            <div>
              <p className="text-white/25 text-xs uppercase tracking-wider mb-3">Librairie ({songs.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {songs.map(song => (
                  <div key={song.id} className="glass rounded-2xl border border-white/8 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{song.title}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {song.bpm && <span className="text-white/40 text-xs bg-white/5 px-2 py-0.5 rounded-lg">{song.bpm} BPM</span>}
                          {song.key && <span className="text-pink-400 text-xs bg-pink-500/10 px-2 py-0.5 rounded-lg">{song.key}</span>}
                        </div>
                        {song.prompt && (
                          <button onClick={() => copyAndOpenSuno(song.prompt!)}
                            className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl mt-2">
                            <Zap size={11} /> Ouvrir dans Suno
                          </button>
                        )}
                      </div>
                      <button onClick={async () => { await supabase.from('songs').delete().eq('id', song.id); setSongs(songs.filter(s => s.id !== song.id)) }}
                        className="text-white/20 hover:text-red-400 transition-colors ml-2"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TOPLINE TAB ── */}
      {tab === 'topline' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Mic size={15} className="text-pink-400" />
              <p className="text-pink-400 text-sm font-medium">Générateur de topline</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Titre *</label>
                <input value={toplineTitle} onChange={e => setToplineTitle(e.target.value)} placeholder="ex: SEUL AU MONDE"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Style *</label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setToplineStyle(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${toplineStyle === s ? 'bg-pink-500/30 border border-pink-500/50 text-pink-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Thème / Émotion</label>
              <input value={toplineTheme} onChange={e => setToplineTheme(e.target.value)} placeholder="ex: solitude, succès malgré les doutes, amour perdu..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
            </div>
            <button onClick={generateTopline} disabled={toplineLoading || !toplineTitle || !toplineStyle}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Sparkles size={16} />
              {toplineLoading ? 'Écriture...' : 'Générer la topline'}
            </button>
          </div>

          {(toplineResult || toplineLoading) && (
            <div className="glass-card rounded-3xl border border-pink-500/20 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-pink-400 text-xs uppercase tracking-wider font-medium">Topline — {toplineTitle}</p>
                {toplineResult && (
                  <button onClick={() => copy(toplineResult)} className="flex items-center gap-1 text-xs text-white/40 hover:text-white">
                    {copied === toplineResult ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    Copier
                  </button>
                )}
              </div>
              {toplineLoading && !toplineResult && (
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                  Écriture de la topline...
                </div>
              )}
              <pre className="text-white/80 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {toplineResult}
                {toplineLoading && <span className="inline-block w-1 h-4 bg-pink-400 ml-1 animate-pulse" />}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── ARRANGEMENT TAB ── */}
      {tab === 'arrangement' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={15} className="text-pink-400" />
              <p className="text-pink-400 text-sm font-medium">Générateur d'arrangement Suno</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Titre *</label>
                <input value={arrangTitle} onChange={e => setArrangTitle(e.target.value)} placeholder="ex: MIDNIGHT"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Style</label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setArrangStyle(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${arrangStyle === s ? 'bg-pink-500/30 border border-pink-500/50 text-pink-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Description de la maquette / idée</label>
              <textarea value={arrangDesc} onChange={e => setArrangDesc(e.target.value)} rows={3}
                placeholder="ex: beat trap lourd avec des 808 bien pronunciés, hi-hats rapides, nappe sombre, drop progressif..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors resize-none" />
            </div>
            <button onClick={generateArrangement} disabled={arrangLoading || !arrangTitle}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Sparkles size={16} />
              {arrangLoading ? 'Génération...' : 'Générer l\'arrangement'}
            </button>
          </div>

          {arrangResult && (
            <div className="space-y-3">
              <div className="glass-card rounded-3xl border border-pink-500/20 p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-pink-400 text-xs uppercase tracking-wider font-medium">Prompt Suno</p>
                  <button onClick={() => copyAndOpenSuno(arrangResult.suno_prompt)}
                    className="flex items-center gap-1.5 text-xs bg-orange-500/20 border border-orange-500/30 text-orange-300 px-3 py-1.5 rounded-xl">
                    <Zap size={11} />
                    {copied === arrangResult.suno_prompt ? '✓ Copié !' : 'Copier + Suno'}
                  </button>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{arrangResult.suno_prompt}</p>
              </div>

              {arrangResult.arrangement && (
                <div className="glass-card rounded-3xl border border-purple-500/15 p-4">
                  <p className="text-purple-400 text-xs uppercase tracking-wider font-medium mb-2">Arrangement détaillé</p>
                  <p className="text-white/70 text-sm leading-relaxed">{arrangResult.arrangement}</p>
                </div>
              )}

              {arrangResult.instruments && (
                <div className="glass-card rounded-3xl border border-sky-500/15 p-4">
                  <p className="text-sky-400 text-xs uppercase tracking-wider font-medium mb-2">Instruments & Sons</p>
                  <p className="text-white/70 text-sm leading-relaxed">{arrangResult.instruments}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
