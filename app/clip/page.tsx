'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Clapperboard, Sparkles, Save, Trash2, ChevronDown, ChevronUp, Copy, Check, Upload, Play, Download, Image, Video, Zap, RefreshCw } from 'lucide-react'

interface Scene { number: number; plan: string; description: string; ambiance: string; duration: string }
interface Clip { id: string; title: string; storyboard: string; prompt: string; created_at: string }
interface MJPrompt { label: string; prompt: string }
interface KlingJob { taskId: string; status: string; videoUrl?: string; cover?: string; prompt: string }

const MJ_PRESETS = [
  { label: 'Portrait Artiste', value: 'artist portrait, urban background, professional studio lighting' },
  { label: 'Scène Urbaine Nuit', value: 'urban night scene, city lights, street photography' },
  { label: 'Performance Scène', value: 'concert performance, stage lighting, crowd atmosphere' },
  { label: 'Ambiance Sombre', value: 'dark moody atmosphere, shadow play, dramatic lighting' },
  { label: 'Lifestyle Luxe', value: 'luxury lifestyle, high-end fashion, exclusive environment' },
  { label: 'Nature / Extérieur', value: 'outdoor cinematic, golden hour, natural environment' },
]

const MJ_MOODS = ['Trap Sombre', 'Afro Festif', 'R&B Romantique', 'Drill Agressif', 'Pop Coloré', 'Soul Mélancolique']

export default function ClipPage() {
  const [tab, setTab] = useState<'storyboard' | 'midjourney' | 'kling'>('storyboard')

  // Storyboard
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [concept, setConcept] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ scenes: Scene[]; prompt: string } | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  // MidJourney
  const [mjSubject, setMjSubject] = useState('')
  const [mjArtist, setMjArtist] = useState('')
  const [mjPreset, setMjPreset] = useState('')
  const [mjMood, setMjMood] = useState('')
  const [mjLoading, setMjLoading] = useState(false)
  const [mjPrompts, setMjPrompts] = useState<MJPrompt[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  // Kling
  const [klingImage, setKlingImage] = useState<string | null>(null)
  const [klingImageName, setKlingImageName] = useState('')
  const [klingPrompt, setKlingPrompt] = useState('')
  const [klingLoading, setKlingLoading] = useState(false)
  const [klingJobs, setKlingJobs] = useState<KlingJob[]>([])
  const [klingPromptLoading, setKlingPromptLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadClips() }, [])

  // Poll Kling jobs
  useEffect(() => {
    const processing = klingJobs.filter(j => j.status === 'processing' || j.status === 'submitted')
    if (processing.length === 0) return
    const interval = setInterval(async () => {
      const updated = await Promise.all(klingJobs.map(async job => {
        if (job.status !== 'processing' && job.status !== 'submitted') return job
        const res = await fetch(`/api/kling?taskId=${job.taskId}`)
        const data = await res.json()
        return { ...job, status: data.status, videoUrl: data.videoUrl, cover: data.cover }
      }))
      setKlingJobs(updated)
    }, 5000)
    return () => clearInterval(interval)
  }, [klingJobs])

  async function loadClips() {
    const { data } = await supabase.from('clips').select('*').order('created_at', { ascending: false })
    setClips(data ?? [])
  }

  // ── STORYBOARD ──
  async function generateStoryboard() {
    if (!title || !concept) return
    setLoading(true); setResult(null)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'clip',
        messages: [{
          role: 'user',
          content: `Génère un storyboard pour le clip "${title}" de ${artist || 'l\'artiste'}. Concept : ${concept}

JSON uniquement :
{
  "scenes": [{ "number": 1, "plan": "Plan large", "description": "...", "ambiance": "...", "duration": "5s" }],
  "prompt": "Prompt Kling optimisé en anglais, cinematic, ultra-détaillé"
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
      for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') break
        try { full += JSON.parse(data).text } catch {}
      }
    }
    try { setResult(JSON.parse(full.replace(/```json|```/g, '').trim())) }
    catch { setResult({ scenes: [], prompt: full }) }
    setLoading(false)
  }

  async function saveClip() {
    if (!result) return
    setSaving(true)
    await supabase.from('clips').insert({ title, storyboard: JSON.stringify(result.scenes), prompt: result.prompt })
    await loadClips()
    setResult(null); setTitle(''); setArtist(''); setConcept('')
    setSaving(false)
  }

  // ── MIDJOURNEY ──
  async function generateMJPrompts() {
    if (!mjSubject) return
    setMjLoading(true); setMjPrompts([])
    const res = await fetch('/api/midjourney', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: mjSubject, artist: mjArtist, preset: mjPreset, mood: mjMood })
    })
    const data = await res.json()
    setMjPrompts(data.prompts ?? [])
    setMjLoading(false)
  }

  function copyAndOpenMJ(prompt: string) {
    navigator.clipboard.writeText(prompt)
    setCopied(prompt)
    setTimeout(() => setCopied(null), 3000)
    window.open('https://www.midjourney.com/imagine', '_blank')
  }

  function usePromptForKling(prompt: string) {
    setKlingPrompt(prompt)
    setTab('kling')
  }

  // ── KLING ──
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setKlingImageName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1]
      setKlingImage(base64)
    }
    reader.readAsDataURL(file)
  }

  async function generateKlingPrompt() {
    if (!klingImageName && !mjSubject) return
    setKlingPromptLoading(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'clip',
        messages: [{
          role: 'user',
          content: `Génère un prompt Kling image-to-video cinématographique pour une image ${mjSubject || klingImageName}.
Style : ARRI cinematic, 8 secondes, mouvement caméra fluide.
Réponds UNIQUEMENT avec le prompt en anglais, max 150 mots.`
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
    setKlingPrompt(full)
    setKlingPromptLoading(false)
  }

  async function submitKling() {
    if (!klingImage || !klingPrompt) return
    setKlingLoading(true)
    const res = await fetch('/api/kling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: klingImage, prompt: klingPrompt, duration: '8', aspectRatio: '16:9' })
    })
    const data = await res.json()
    if (data.taskId) {
      setKlingJobs(prev => [{ taskId: data.taskId, status: data.status || 'submitted', prompt: klingPrompt }, ...prev])
      setKlingImage(null); setKlingImageName(''); setKlingPrompt('')
    }
    setKlingLoading(false)
  }

  const statusColors: Record<string, string> = {
    submitted: 'text-amber-400',
    processing: 'text-blue-400',
    succeed: 'text-emerald-400',
    failed: 'text-red-400',
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center flex-shrink-0">
          <Clapperboard size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">CLIP</h1>
          <p className="text-white/40 text-xs">Storyboard → MidJourney → Kling</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'storyboard', label: '🎬 Storyboard' },
          { id: 'midjourney', label: '🖼️ MidJourney' },
          { id: 'kling', label: `🎥 Kling${klingJobs.length > 0 ? ` (${klingJobs.length})` : ''}` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${tab === id ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── STORYBOARD ── */}
      {tab === 'storyboard' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-5 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
            <button onClick={generateStoryboard} disabled={loading || !title || !concept}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Sparkles size={16} />
              {loading ? 'Génération...' : 'Générer le storyboard'}
            </button>
          </div>

          {loading && (
            <div className="glass rounded-3xl p-8 text-center mb-5">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/50 text-sm">L'IA construit ton storyboard...</p>
            </div>
          )}

          {result && (
            <div className="glass-card rounded-3xl border border-violet-500/20 p-5 mb-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-display font-bold text-white text-lg">{title}</h2>
                <button onClick={saveClip} disabled={saving}
                  className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-2 rounded-xl">
                  <Save size={13} />{saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
              <div className="space-y-2 mb-4">
                {result.scenes.map(scene => (
                  <div key={scene.number} className="bg-white/3 rounded-2xl border border-white/6 p-3">
                    <div className="flex gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{scene.number}</span>
                      <div>
                        <div className="flex gap-2 flex-wrap mb-1">
                          <span className="text-violet-400 text-xs bg-violet-500/10 px-2 py-0.5 rounded-lg">{scene.plan}</span>
                          <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-lg">{scene.duration}</span>
                        </div>
                        <p className="text-white/80 text-sm">{scene.description}</p>
                        <p className="text-white/40 text-xs mt-0.5 italic">{scene.ambiance}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {result.prompt && (
                <div className="bg-black/20 rounded-2xl border border-white/8 p-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <p className="text-white/40 text-xs uppercase tracking-wider">Prompt Kling</p>
                    <div className="flex gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(result.prompt); setCopied('sb') }}
                        className="text-xs text-white/40 hover:text-white flex items-center gap-1">
                        {copied === 'sb' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        Copier
                      </button>
                      <button onClick={() => { setKlingPrompt(result.prompt); setTab('kling') }}
                        className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Video size={11} /> Envoyer vers Kling
                      </button>
                    </div>
                  </div>
                  <p className="text-white/60 text-xs leading-relaxed">{result.prompt}</p>
                </div>
              )}
            </div>
          )}

          {clips.length > 0 && (
            <div>
              <p className="text-white/25 text-xs uppercase tracking-wider mb-3">Storyboards sauvegardés ({clips.length})</p>
              <div className="space-y-2">
                {clips.map(clip => {
                  const scenes: Scene[] = clip.storyboard ? JSON.parse(clip.storyboard) : []
                  return (
                    <div key={clip.id} className="glass rounded-2xl border border-white/8">
                      <div className="flex items-center justify-between p-4">
                        <button onClick={() => setExpanded(expanded === clip.id ? null : clip.id)} className="flex-1 text-left">
                          <p className="text-white font-medium">{clip.title}</p>
                          <p className="text-white/30 text-xs">{scenes.length} scènes</p>
                        </button>
                        <div className="flex gap-2">
                          {clip.prompt && (
                            <button onClick={() => { setKlingPrompt(clip.prompt); setTab('kling') }}
                              className="text-xs text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <Video size={11} /> Kling
                            </button>
                          )}
                          <button onClick={() => setExpanded(expanded === clip.id ? null : clip.id)} className="text-white/30">
                            {expanded === clip.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                          <button onClick={async () => { await supabase.from('clips').delete().eq('id', clip.id); setClips(clips.filter(c => c.id !== clip.id)) }}
                            className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                      {expanded === clip.id && (
                        <div className="px-4 pb-4 space-y-2">
                          {scenes.map(s => (
                            <div key={s.number} className="bg-white/3 rounded-xl p-3">
                              <span className="text-violet-400 text-xs">Scène {s.number} — {s.plan}</span>
                              <p className="text-white/60 text-sm mt-1">{s.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MIDJOURNEY ── */}
      {tab === 'midjourney' && (
        <div>
          <div className="glass-card rounded-3xl border border-indigo-500/20 p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Image size={16} className="text-indigo-400" />
              <p className="text-indigo-400 font-medium text-sm">Générateur de prompts MidJourney</p>
              <span className="ml-auto text-white/25 text-xs">--v 8 --style raw</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Sujet *</label>
                <input value={mjSubject} onChange={e => setMjSubject(e.target.value)}
                  placeholder="ex: artiste rap en studio, scène urbaine nuit..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Artiste</label>
                <input value={mjArtist} onChange={e => setMjArtist(e.target.value)} placeholder="ex: Niska"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
            </div>

            <div className="mb-3">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Preset</label>
              <div className="flex flex-wrap gap-2">
                {MJ_PRESETS.map(p => (
                  <button key={p.value} onClick={() => setMjPreset(mjPreset === p.value ? '' : p.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${mjPreset === p.value ? 'bg-indigo-500/30 border border-indigo-500/50 text-indigo-300' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Ambiance</label>
              <div className="flex flex-wrap gap-2">
                {MJ_MOODS.map(m => (
                  <button key={m} onClick={() => setMjMood(mjMood === m ? '' : m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${mjMood === m ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generateMJPrompts} disabled={mjLoading || !mjSubject}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Sparkles size={16} />
              {mjLoading ? 'Génération...' : 'Générer les prompts MJ'}
            </button>
          </div>

          {mjLoading && (
            <div className="glass rounded-3xl p-8 text-center mb-5">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/50 text-sm">Création des prompts cinématographiques...</p>
            </div>
          )}

          {mjPrompts.length > 0 && (
            <div className="space-y-3">
              {mjPrompts.map((p, i) => (
                <div key={i} className="glass-card rounded-3xl border border-indigo-500/15 p-5">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <span className="text-indigo-400 text-xs font-medium uppercase tracking-wider">{p.label}</span>
                    <div className="flex gap-2">
                      <button onClick={() => usePromptForKling(p.prompt)}
                        className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-xl hover:bg-violet-500/20 transition-colors">
                        <Video size={11} /> → Kling
                      </button>
                      <button onClick={() => copyAndOpenMJ(p.prompt)}
                        className="flex items-center gap-1.5 text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-xl hover:bg-indigo-500/30 transition-colors">
                        {copied === p.prompt ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        {copied === p.prompt ? 'Copié ! MJ ouvert' : 'Copier + Ouvrir MJ'}
                      </button>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed font-mono text-xs bg-black/20 rounded-xl p-3">{p.prompt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── KLING ── */}
      {tab === 'kling' && (
        <div>
          <div className="glass-card rounded-3xl border border-violet-500/20 p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Video size={16} className="text-violet-400" />
              <p className="text-violet-400 font-medium text-sm">Kling AI — Image to Video</p>
              <span className="ml-auto text-white/25 text-xs">8s · 16:9 · kling-v1-5</span>
            </div>

            {/* Image upload */}
            <div className="mb-4">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Image MidJourney *</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${klingImage ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/15 hover:border-white/30'}`}>
                {klingImage ? (
                  <div>
                    <Check size={20} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400 text-sm font-medium">{klingImageName}</p>
                    <p className="text-white/30 text-xs mt-1">Image chargée — prête pour Kling</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={20} className="text-white/30 mx-auto mb-2" />
                    <p className="text-white/50 text-sm">Upload ton image MidJourney</p>
                    <p className="text-white/25 text-xs mt-1">JPG, PNG, WebP</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Prompt */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/50 text-xs uppercase tracking-wider">Prompt vidéo *</label>
                <button onClick={generateKlingPrompt} disabled={klingPromptLoading}
                  className="flex items-center gap-1.5 text-xs text-violet-400 disabled:opacity-40">
                  <Sparkles size={11} />
                  {klingPromptLoading ? 'Génération...' : 'Générer avec IA'}
                </button>
              </div>
              <textarea value={klingPrompt} onChange={e => setKlingPrompt(e.target.value)} rows={4}
                placeholder="ex: Slow cinematic camera movement, artist walking in slow motion, dramatic lighting, film grain..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none text-sm" />
            </div>

            <button onClick={submitKling} disabled={klingLoading || !klingImage || !klingPrompt}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity w-full justify-center">
              <Zap size={16} />
              {klingLoading ? 'Envoi vers Kling...' : 'Générer la vidéo avec Kling'}
            </button>
          </div>

          {/* Kling jobs */}
          {klingJobs.length > 0 && (
            <div>
              <p className="text-white/25 text-xs uppercase tracking-wider mb-3">Vidéos générées ({klingJobs.length})</p>
              <div className="space-y-3">
                {klingJobs.map(job => (
                  <div key={job.taskId} className="glass rounded-2xl border border-white/8 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${statusColors[job.status] || 'text-white/40'}`}>
                            {job.status === 'submitted' ? '⏳ En attente...' :
                             job.status === 'processing' ? '🔄 Génération...' :
                             job.status === 'succeed' ? '✅ Terminé' : '❌ Erreur'}
                          </span>
                          {(job.status === 'submitted' || job.status === 'processing') && (
                            <RefreshCw size={12} className="text-white/30 animate-spin" />
                          )}
                        </div>
                        <p className="text-white/40 text-xs line-clamp-2">{job.prompt}</p>
                      </div>
                      {job.videoUrl && (
                        <a href={job.videoUrl} target="_blank" rel="noopener noreferrer" download
                          className="flex items-center gap-1.5 text-xs bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded-xl flex-shrink-0 hover:bg-emerald-500/30 transition-colors">
                          <Download size={12} /> Télécharger
                        </a>
                      )}
                    </div>
                    {job.cover && (
                      <img src={job.cover} alt="cover" className="mt-3 rounded-xl w-full max-h-40 object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
