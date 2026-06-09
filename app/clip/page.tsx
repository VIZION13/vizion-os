'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Clapperboard, Sparkles, Save, Trash2, ChevronDown, ChevronUp, Copy, Check, Upload, Play, Download, Video, Zap, RefreshCw, ExternalLink, Camera, Film } from 'lucide-react'

interface Scene { number: number; plan: string; description: string; ambiance: string; duration: string }
interface Clip { id: string; title: string; storyboard: string; prompt: string; created_at: string }
interface KlingJob { taskId: string; status: string; videoUrl?: string; cover?: string; prompt: string }

// ── MIDJOURNEY OPTIONS ──
const MJ_CAMERAS = [
  { label: 'ARRI Alexa', value: 'ARRI Alexa camera', icon: '🎬' },
  { label: 'RED Dragon', value: 'RED Dragon cinema camera', icon: '🔴' },
  { label: 'Sony Venice', value: 'Sony Venice cinema camera', icon: '🎥' },
  { label: 'Blackmagic', value: 'Blackmagic URSA cinema camera', icon: '⬛' },
  { label: 'Canon C70', value: 'Canon Cinema EOS C70', icon: '📷' },
  { label: 'Film 35mm', value: '35mm film camera', icon: '🎞️' },
]

const MJ_LENSES = [
  { label: '14mm', value: '14mm ultra wide angle lens' },
  { label: '24mm', value: '24mm wide angle lens' },
  { label: '35mm', value: '35mm lens' },
  { label: '50mm', value: '50mm standard lens' },
  { label: '85mm', value: '85mm portrait lens' },
  { label: '135mm', value: '135mm telephoto lens' },
  { label: 'Anamorphic', value: 'anamorphic lens, lens flares' },
]

const MJ_RESOLUTIONS = [
  { label: '4K', value: '4K resolution, ultra detailed' },
  { label: '8K', value: '8K resolution, hyper detailed' },
  { label: 'Medium Format', value: 'medium format, extreme detail' },
]

const MJ_VERSIONS = [
  { label: 'v8 (latest)', value: '--v 8' },
  { label: 'v7', value: '--v 7' },
  { label: 'v6.1', value: '--v 6.1' },
  { label: 'Niji 6', value: '--niji 6' },
]

const MJ_STYLES = [
  { label: 'Raw', value: '--style raw', desc: 'Photoréaliste' },
  { label: 'Expressive', value: '--style expressive', desc: 'Créatif' },
  { label: 'Cute', value: '--style cute', desc: 'Stylisé' },
  { label: 'Scenic', value: '--style scenic', desc: 'Paysage' },
]

const MJ_ASPECT_RATIOS = [
  { label: '16:9', value: '--ar 16:9', desc: 'Cinéma' },
  { label: '21:9', value: '--ar 21:9', desc: 'Ultra wide' },
  { label: '4:5', value: '--ar 4:5', desc: 'Instagram' },
  { label: '1:1', value: '--ar 1:1', desc: 'Carré' },
  { label: '9:16', value: '--ar 9:16', desc: 'Portrait' },
  { label: '2:3', value: '--ar 2:3', desc: 'Portrait 35mm' },
]

const MJ_LIGHTING = [
  { label: 'ARRI Cinema', value: 'ARRI cinema lighting, professional key light, rim light, bounce reflector' },
  { label: 'Golden Hour', value: 'golden hour lighting, warm sunlight, long shadows' },
  { label: 'Blue Hour', value: 'blue hour lighting, twilight, ambient city glow' },
  { label: 'Neon Lights', value: 'neon lights, urban night lighting, colored reflections' },
  { label: 'Studio', value: 'professional studio lighting, softbox, three-point lighting' },
  { label: 'Natural', value: 'natural daylight, diffused window light, soft shadows' },
  { label: 'Dramatic', value: 'dramatic side lighting, deep shadows, chiaroscuro' },
  { label: 'Overcast', value: 'overcast diffused lighting, flat soft light, moody' },
]

const MJ_COLOR_GRADES = [
  { label: 'Kodak 400', value: 'Kodak 400 film grain, warm color palette, slight fade' },
  { label: 'Fuji Pro', value: 'Fuji Pro 400H, pastel colors, green tint' },
  { label: 'Teal & Orange', value: 'teal and orange color grade, cinematic, blockbuster look' },
  { label: 'Desaturated', value: 'desaturated cinematic, muted tones, grey palette' },
  { label: 'Warm Vintage', value: 'warm vintage color grade, sepia undertones, nostalgic' },
  { label: 'Cold Blue', value: 'cold blue color grade, steel tones, modern' },
  { label: 'High Contrast', value: 'high contrast, deep blacks, crisp whites' },
  { label: 'Moody Dark', value: 'moody dark color grade, deep shadows, rich blacks' },
]

const MJ_MOODS = [
  { label: 'Cinématique', value: 'cinematic, film still' },
  { label: 'Editorial', value: 'editorial photography, fashion magazine' },
  { label: 'Atmosphérique', value: 'atmospheric, moody, ethereal' },
  { label: 'Documentaire', value: 'documentary style, raw, authentic' },
  { label: 'Luxe', value: 'luxury lifestyle, high-end, premium aesthetic' },
  { label: 'Urban Street', value: 'urban street photography, candid, raw city life' },
  { label: 'Minimaliste', value: 'minimalist composition, clean lines, negative space' },
  { label: 'Dramatique', value: 'dramatic, intense, powerful visual impact' },
]

export default function ClipPage() {
  const [tab, setTab] = useState<'storyboard' | 'midjourney' | 'gallery' | 'kling'>('midjourney')

  // Storyboard
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [concept, setConcept] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ scenes: Scene[]; prompt: string } | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  // MidJourney Builder
  const [mjSubject, setMjSubject] = useState('')
  const [mjCamera, setMjCamera] = useState(MJ_CAMERAS[0].value)
  const [mjLens, setMjLens] = useState(MJ_LENSES[2].value)
  const [mjResolution, setMjResolution] = useState(MJ_RESOLUTIONS[0].value)
  const [mjVersion, setMjVersion] = useState(MJ_VERSIONS[0].value)
  const [mjStyle, setMjStyle] = useState(MJ_STYLES[0].value)
  const [mjAspect, setMjAspect] = useState(MJ_ASPECT_RATIOS[0].value)
  const [mjLighting, setMjLighting] = useState(MJ_LIGHTING[0].value)
  const [mjColorGrade, setMjColorGrade] = useState(MJ_COLOR_GRADES[0].value)
  const [mjMood, setMjMood] = useState(MJ_MOODS[0].value)
  const [mjNegative, setMjNegative] = useState('blurry, low quality, distorted, ugly, bad anatomy')
  const [mjQuality, setMjQuality] = useState('--q 2')
  const [mjStylize, setMjStylize] = useState(750)
  const [mjLoading, setMjLoading] = useState(false)
  const [mjGeneratedPrompts, setMjGeneratedPrompts] = useState<{label: string; prompt: string}[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Kling
  const [klingImage, setKlingImage] = useState<string | null>(null)
  const [klingImageName, setKlingImageName] = useState('')
  const [klingPrompt, setKlingPrompt] = useState('')
  const [klingLoading, setKlingLoading] = useState(false)
  const [klingJobs, setKlingJobs] = useState<KlingJob[]>([])
  const [klingPromptLoading, setKlingPromptLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Gallery state
  const [galleryItems, setGalleryItems] = useState<{id?: string; filename: string; url: string; prompt: string; tags: string; created_at: string}[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [galleryPrompt, setGalleryPrompt] = useState('')
  const [galleryTags, setGalleryTags] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [galleryLoaded, setGalleryLoaded] = useState(false)

  // Poll Kling
  useState(() => {
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
  })

  // ── BUILD MJ PROMPT ──
  function buildPromptString(subject: string, variants = false) {
    const parts = [
      subject,
      mjCamera,
      mjLens,
      mjLighting,
      mjColorGrade,
      mjMood,
      mjResolution,
      'shallow depth of field',
      'skin texture detail',
      'professional photography',
    ]
    const params = [mjAspect, mjVersion, mjStyle, mjQuality, `--s ${mjStylize}`]
    if (mjNegative) params.push(`--no ${mjNegative}`)
    return parts.filter(Boolean).join(', ') + ' ' + params.join(' ')
  }

  async function generateMJPrompts() {
    if (!mjSubject) return
    setMjLoading(true); setMjGeneratedPrompts([])
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'clip',
        messages: [{
          role: 'user',
          content: `Tu es expert en photographie cinématographique et prompts MidJourney.
Génère 3 prompts MidJourney ultra-précis et différents pour :
Sujet : ${mjSubject}
Caméra : ${mjCamera}
Objectif : ${mjLens}
Lumière : ${mjLighting}
Color grade : ${mjColorGrade}
Mood : ${mjMood}
Résolution : ${mjResolution}

Réponds UNIQUEMENT en JSON :
{
  "prompts": [
    { "label": "Principal", "prompt": "..." },
    { "label": "Variante sombre", "prompt": "..." },
    { "label": "Variante dynamique", "prompt": "..." }
  ]
}

Chaque prompt doit inclure à la fin exactement ces paramètres : ${mjAspect} ${mjVersion} ${mjStyle} ${mjQuality} --s ${mjStylize}${mjNegative ? ` --no ${mjNegative}` : ''}`
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
    try {
      const parsed = JSON.parse(full.replace(/```json|```/g, '').trim())
      setMjGeneratedPrompts(parsed.prompts ?? [])
    } catch {
      setMjGeneratedPrompts([{ label: 'Prompt', prompt: full }])
    }
    setMjLoading(false)
  }

  function buildQuickPrompt() {
    return buildPromptString(mjSubject || 'cinematic portrait')
  }

  function copyAndOpenMJ(prompt: string) {
    navigator.clipboard.writeText(prompt)
    setCopied(prompt)
    setTimeout(() => setCopied(null), 3000)
    // Ouvre MidJourney avec compte connecté
    window.open('https://www.midjourney.com/imagine', '_blank')
  }

  function openMJDirect() {
    window.open('https://www.midjourney.com/imagine', '_blank')
  }

  function usePromptForKling(prompt: string) {
    setKlingPrompt(prompt)
    setTab('kling')
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
          content: `Génère un storyboard pour le clip "${title}" de ${artist || "l'artiste"}. Concept : ${concept}

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
    setResult(null); setTitle(''); setArtist(''); setConcept('')
    setSaving(false)
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
    setKlingPromptLoading(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'clip',
        messages: [{
          role: 'user',
          content: `Génère un prompt Kling image-to-video cinématographique.
Style : ARRI cinematic, 8 secondes, mouvement caméra fluide, slow motion.
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
      body: JSON.stringify({ imageBase64: klingImage, prompt: klingPrompt, duration: 5, aspectRatio: '16:9' })
    })
    const data = await res.json()
    if (data.taskId) {
      setKlingJobs(prev => [{ taskId: data.taskId, status: data.status || 'submitted', prompt: klingPrompt }, ...prev])
      setKlingImage(null); setKlingImageName(''); setKlingPrompt('')
    }
    setKlingLoading(false)
  }

  const statusColors: Record<string, string> = {
    submitted: 'text-amber-400', processing: 'text-blue-400',
    succeed: 'text-emerald-400', failed: 'text-red-400',
  }

  // Load gallery
  async function loadGallery() {
    if (galleryLoaded) return
    setGalleryLoading(true)
    try {
      const res = await fetch('/api/mj-gallery')
      const data = await res.json()
      setGalleryItems(data.items || [])
      setGalleryLoaded(true)
    } catch {}
    setGalleryLoading(false)
  }

  async function uploadToGallery(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('prompt', galleryPrompt)
    fd.append('tags', galleryTags)
    try {
      const res = await fetch('/api/mj-gallery', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setGalleryItems(prev => [{
          filename: data.filename,
          url: data.url,
          prompt: galleryPrompt,
          tags: galleryTags,
          created_at: new Date().toISOString(),
        }, ...prev])
        setGalleryPrompt('')
        setGalleryTags('')
      }
    } catch {}
    setUploading(false)
  }

  async function deleteFromGallery(item: {id?: string; filename: string}) {
    await fetch('/api/mj-gallery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: item.filename, id: item.id })
    })
    setGalleryItems(prev => prev.filter(i => i.filename !== item.filename))
  }

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  )

  const Chips = ({ options, value, onChange, multi = false }: { options: {label: string; value: string; icon?: string; desc?: string}[]; value: string | string[]; onChange: (v: string) => void; multi?: boolean }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = Array.isArray(value) ? value.includes(opt.value) : value === opt.value
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${active ? 'bg-indigo-500/30 border border-indigo-500/50 text-indigo-300' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'}`}>
            {opt.icon && <span>{opt.icon}</span>}
            {opt.label}
            {opt.desc && <span className={`text-[10px] ${active ? 'text-indigo-400/70' : 'text-white/20'}`}>· {opt.desc}</span>}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center flex-shrink-0">
          <Clapperboard size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">CLIP</h1>
          <p className="text-white/40 text-xs">Storyboard → MidJourney Pro → Kling AI</p>
        </div>
        {/* Bouton MJ direct */}
        <button onClick={openMJDirect}
          className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-4 py-2.5 rounded-2xl hover:bg-indigo-600/30 transition-colors">
          <ExternalLink size={13} />
          MidJourney
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'storyboard', label: '🎬 Storyboard' },
          { id: 'midjourney', label: '🖼️ MidJourney Pro' },
          { id: 'gallery', label: `📁 Galerie MJ${galleryItems.length > 0 ? ` (${galleryItems.length})` : ''}` },
          { id: 'kling', label: `🎥 Kling${klingJobs.length > 0 ? ` (${klingJobs.length})` : ''}` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => { setTab(id as any); if (id === 'gallery') loadGallery() }}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${tab === id ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── MIDJOURNEY PRO ── */}
      {tab === 'midjourney' && (
        <div className="space-y-4">
          {/* Quick prompt builder */}
          <div className="glass-card rounded-3xl border border-indigo-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Camera size={16} className="text-indigo-400" />
              <p className="text-indigo-400 font-bold text-sm">MIDJOURNEY PRO BUILDER</p>
              <span className="ml-auto text-white/25 text-xs">{mjVersion} {mjStyle}</span>
            </div>

            {/* Subject */}
            <Section label="Sujet *">
              <textarea value={mjSubject} onChange={e => setMjSubject(e.target.value)} rows={2}
                placeholder="ex: artiste rap en studio la nuit, femme en robe dorée sur rooftop, scène urbaine Marseille..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none text-sm" />
            </Section>

            {/* Camera */}
            <Section label="Caméra">
              <Chips options={MJ_CAMERAS} value={mjCamera} onChange={setMjCamera} />
            </Section>

            {/* Lens */}
            <Section label="Objectif">
              <Chips options={MJ_LENSES} value={mjLens} onChange={setMjLens} />
            </Section>

            {/* Lighting */}
            <Section label="Lumière">
              <Chips options={MJ_LIGHTING} value={mjLighting} onChange={setMjLighting} />
            </Section>

            {/* Color grade */}
            <Section label="Color Grade">
              <Chips options={MJ_COLOR_GRADES} value={mjColorGrade} onChange={setMjColorGrade} />
            </Section>

            {/* Mood */}
            <Section label="Mood">
              <Chips options={MJ_MOODS} value={mjMood} onChange={setMjMood} />
            </Section>

            {/* Technical params */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Section label="Version MJ">
                <Chips options={MJ_VERSIONS} value={mjVersion} onChange={setMjVersion} />
              </Section>
              <Section label="Style">
                <Chips options={MJ_STYLES} value={mjStyle} onChange={setMjStyle} />
              </Section>
            </div>

            <Section label="Format / Aspect Ratio">
              <Chips options={MJ_ASPECT_RATIOS} value={mjAspect} onChange={setMjAspect} />
            </Section>

            <Section label="Résolution">
              <Chips options={MJ_RESOLUTIONS} value={mjResolution} onChange={setMjResolution} />
            </Section>

            {/* Advanced */}
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-white/30 text-xs mb-3 hover:text-white/60 transition-colors">
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Options avancées (Stylize, Qualité, Négatif)
            </button>

            {showAdvanced && (
              <div className="space-y-3 mb-4 bg-white/3 rounded-2xl p-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <p className="text-white/40 text-xs uppercase tracking-wider">Stylize --s</p>
                    <span className="text-indigo-400 text-xs font-bold">{mjStylize}</span>
                  </div>
                  <input type="range" min={0} max={1000} step={50} value={mjStylize}
                    onChange={e => setMjStylize(+e.target.value)}
                    className="w-full accent-indigo-500" />
                  <div className="flex justify-between text-xs text-white/20 mt-1">
                    <span>0 (Fidèle)</span><span>1000 (Artistique)</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Qualité</p>
                  <div className="flex gap-2">
                    {[{l:'Draft --q .25',v:'--q .25'},{l:'Normal --q 1',v:'--q 1'},{l:'HD --q 2',v:'--q 2'}].map(({l,v})=>(
                      <button key={v} onClick={() => setMjQuality(v)}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-all ${mjQuality===v?'bg-indigo-500/30 border border-indigo-500/50 text-indigo-300':'bg-white/5 border border-white/10 text-white/40'}`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Négatif --no</p>
                  <input value={mjNegative} onChange={e => setMjNegative(e.target.value)}
                    placeholder="blurry, low quality, distorted..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-white/20 focus:outline-none focus:border-indigo-500/50" />
                </div>
              </div>
            )}

            {/* Preview du prompt */}
            {mjSubject && (
              <div className="bg-black/20 rounded-2xl p-3 mb-4 border border-white/5">
                <p className="text-white/30 text-xs mb-1">Aperçu prompt</p>
                <p className="text-white/60 text-xs font-mono leading-relaxed line-clamp-3">{buildQuickPrompt()}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={generateMJPrompts} disabled={mjLoading || !mjSubject}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-500 text-white font-semibold px-5 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
                <Sparkles size={15} />
                {mjLoading ? 'Génération IA...' : 'Générer 3 prompts IA'}
              </button>

              {mjSubject && (
                <button onClick={() => copyAndOpenMJ(buildQuickPrompt())}
                  className="flex items-center gap-2 bg-white/5 border border-white/15 text-white/70 font-medium px-5 py-3 rounded-2xl hover:bg-white/10 transition-colors">
                  <ExternalLink size={14} />
                  Copier + Ouvrir MJ
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {mjLoading && (
            <div className="glass rounded-3xl p-6 text-center">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white/40 text-sm">L'IA génère tes prompts cinématographiques...</p>
            </div>
          )}

          {/* Generated prompts */}
          {mjGeneratedPrompts.length > 0 && (
            <div className="space-y-3">
              {mjGeneratedPrompts.map((p, i) => (
                <div key={i} className="glass-card rounded-3xl border border-indigo-500/15 p-5">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">{p.label}</span>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => usePromptForKling(p.prompt)}
                        className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-xl hover:bg-violet-500/20 transition-colors">
                        <Video size={11} /> → Kling
                      </button>
                      <button onClick={() => copyAndOpenMJ(p.prompt)}
                        className="flex items-center gap-1.5 text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-xl hover:bg-indigo-500/30 transition-colors">
                        {copied === p.prompt ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        {copied === p.prompt ? 'Copié ! MJ ouvert' : 'Copier + MJ'}
                      </button>
                    </div>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed font-mono bg-black/20 rounded-xl p-3">{p.prompt}</p>
                </div>
              ))}

              {/* Bouton MJ direct bien visible */}
              <button onClick={openMJDirect}
                className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold px-6 py-4 rounded-3xl hover:opacity-90 transition-opacity">
                <ExternalLink size={18} />
                Ouvrir MidJourney (compte connecté)
              </button>
            </div>
          )}
        </div>
      )}

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

          {result && (
            <div className="glass-card rounded-3xl border border-violet-500/20 p-5 mb-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-display font-bold text-white text-lg">{title}</h2>
                <div className="flex gap-2">
                  {result.prompt && (
                    <button onClick={() => { setKlingPrompt(result.prompt); setTab('kling') }}
                      className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <Video size={11} /> Kling
                    </button>
                  )}
                  <button onClick={saveClip} disabled={saving}
                    className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-2 rounded-xl">
                    <Save size={13} />{saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
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
            </div>
          )}
        </div>
      )}

      {/* ── GALERIE MJ ── */}
      {tab === 'gallery' && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div className="glass-card rounded-3xl border border-indigo-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📁</span>
              <p className="text-indigo-400 font-bold text-sm">GALERIE MIDJOURNEY</p>
              <span className="text-white/30 text-xs ml-auto">{galleryItems.length} images</span>
            </div>

            {/* Upload inputs */}
            <div className="space-y-3 mb-4">
              <input value={galleryPrompt} onChange={e => setGalleryPrompt(e.target.value)}
                placeholder="Prompt utilisé (optionnel)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/50" />
              <input value={galleryTags} onChange={e => setGalleryTags(e.target.value)}
                placeholder="Tags : trap, artiste, portrait, scène..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/50" />
            </div>

            <div
              onClick={() => galleryRef.current?.click()}
              className="border-2 border-dashed border-indigo-500/30 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-500/60 transition-colors">
              {uploading ? (
                <div>
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-indigo-400 text-sm">Upload en cours...</p>
                </div>
              ) : (
                <div>
                  <Upload size={20} className="text-indigo-400/50 mx-auto mb-2" />
                  <p className="text-white/60 text-sm font-medium">Ajouter des images MidJourney</p>
                  <p className="text-white/30 text-xs mt-1">JPG, PNG, WebP — sélection multiple</p>
                </div>
              )}
            </div>
            <input ref={galleryRef} type="file" accept="image/*" multiple
              onChange={async e => {
                const files = Array.from(e.target.files || [])
                for (const file of files) await uploadToGallery(file)
                e.target.value = ''
              }}
              className="hidden" />
          </div>

          {/* Loading */}
          {galleryLoading && (
            <div className="glass rounded-3xl p-6 text-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white/40 text-sm">Chargement de la galerie...</p>
            </div>
          )}

          {/* Gallery grid */}
          {!galleryLoading && galleryItems.length === 0 && galleryLoaded && (
            <div className="glass rounded-3xl p-8 text-center">
              <p className="text-4xl mb-3">🖼️</p>
              <p className="text-white/40 text-sm">Galerie vide — upload tes images MidJourney</p>
            </div>
          )}

          {galleryItems.length > 0 && (
            <div>
              {/* Selected image actions */}
              {selectedImage && (
                <div className="glass-card rounded-3xl border border-violet-500/20 p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-violet-400 text-sm font-medium">Image sélectionnée</p>
                    <button onClick={() => setSelectedImage(null)} className="text-white/30 text-xs hover:text-white/60">✕ Désélectionner</button>
                  </div>
                  <img src={selectedImage} alt="selected" className="w-full max-h-48 object-cover rounded-xl mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => {
                      // Convert URL to base64 for Kling
                      fetch(selectedImage).then(r => r.blob()).then(blob => {
                        const reader = new FileReader()
                        reader.onload = ev => {
                          const base64 = (ev.target?.result as string).split(',')[1]
                          setKlingImage(base64)
                          setKlingImageName('galerie-mj.jpg')
                          setTab('kling')
                          setSelectedImage(null)
                        }
                        reader.readAsDataURL(blob)
                      })
                    }}
                      className="flex-1 flex items-center gap-2 justify-center bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium py-2.5 rounded-2xl hover:bg-violet-500/30 transition-colors">
                      <Video size={14} /> Envoyer vers Kling
                    </button>
                    <button onClick={() => {
                      navigator.clipboard.writeText(selectedImage)
                      setCopied(selectedImage)
                      setTimeout(() => setCopied(null), 2000)
                    }}
                      className="flex items-center gap-2 bg-white/5 border border-white/15 text-white/60 text-sm px-4 py-2.5 rounded-2xl hover:bg-white/10 transition-colors">
                      {copied === selectedImage ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {galleryItems.map((item, i) => (
                  <div key={item.filename} className="group relative">
                    <button
                      onClick={() => setSelectedImage(selectedImage === item.url ? null : item.url)}
                      className={`w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === item.url ? 'border-violet-500 scale-95' : 'border-transparent hover:border-white/30'}`}>
                      <img src={item.url} alt={`mj-${i}`} className="w-full h-full object-cover" />
                    </button>
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-end p-2">
                      {item.tags && <p className="text-white/70 text-xs line-clamp-1">{item.tags}</p>}
                    </div>
                    {/* Delete button */}
                    <button onClick={() => deleteFromGallery(item)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs items-center justify-center hidden group-hover:flex">
                      ✕
                    </button>
                    {/* Kling quick button */}
                    <button onClick={() => {
                      fetch(item.url).then(r => r.blob()).then(blob => {
                        const reader = new FileReader()
                        reader.onload = ev => {
                          setKlingImage((ev.target?.result as string).split(',')[1])
                          setKlingImageName(item.filename)
                          setKlingPrompt(item.prompt || '')
                          setTab('kling')
                        }
                        reader.readAsDataURL(blob)
                      })
                    }}
                      className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-violet-500/80 text-white items-center justify-center hidden group-hover:flex">
                      <Video size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KLING ── */}
      {tab === 'kling' && (
        <div>
          <div className="glass-card rounded-3xl border border-violet-500/20 p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Film size={16} className="text-violet-400" />
              <p className="text-violet-400 font-bold text-sm">KLING AI — Image to Video</p>
              <span className="ml-auto text-white/25 text-xs">5s · 16:9 · kling-v1-5</span>
            </div>

            <div className="mb-4">
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Image MidJourney *</label>
              <div onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${klingImage ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/15 hover:border-white/30'}`}>
                {klingImage ? (
                  <div>
                    <Check size={18} className="text-emerald-400 mx-auto mb-1" />
                    <p className="text-emerald-400 text-sm font-medium">{klingImageName}</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={18} className="text-white/30 mx-auto mb-1" />
                    <p className="text-white/50 text-sm">Upload ton image MidJourney</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp" onChange={handleImageUpload} className="hidden" />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/50 text-xs uppercase tracking-wider">Prompt vidéo *</label>
                <button onClick={generateKlingPrompt} disabled={klingPromptLoading}
                  className="flex items-center gap-1.5 text-xs text-violet-400 disabled:opacity-40">
                  <Sparkles size={11} />
                  {klingPromptLoading ? 'Génération...' : 'IA'}
                </button>
              </div>
              <textarea value={klingPrompt} onChange={e => setKlingPrompt(e.target.value)} rows={3}
                placeholder="ex: Slow cinematic camera movement, artist walking in slow motion..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none text-sm" />
            </div>

            <button onClick={submitKling} disabled={klingLoading || !klingImage || !klingPrompt}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity w-full justify-center">
              <Zap size={16} />
              {klingLoading ? 'Envoi...' : 'Générer la vidéo'}
            </button>
          </div>

          {klingJobs.length > 0 && (
            <div>
              <p className="text-white/25 text-xs uppercase tracking-wider mb-3">Vidéos ({klingJobs.length})</p>
              <div className="space-y-3">
                {klingJobs.map(job => (
                  <div key={job.taskId} className="glass rounded-2xl border border-white/8 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-medium ${statusColors[job.status] || 'text-white/40'}`}>
                          {job.status === 'submitted' ? '⏳ En attente...' : job.status === 'processing' ? '🔄 Génération...' : job.status === 'succeed' ? '✅ Terminé' : '❌ Erreur'}
                        </span>
                        <p className="text-white/40 text-xs mt-1 line-clamp-2">{job.prompt}</p>
                      </div>
                      {job.videoUrl && (
                        <a href={job.videoUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded-xl flex-shrink-0">
                          <Download size={12} /> Télécharger
                        </a>
                      )}
                    </div>
                    {job.cover && <img src={job.cover} alt="cover" className="mt-3 rounded-xl w-full max-h-40 object-cover" />}
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
