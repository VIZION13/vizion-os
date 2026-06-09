'use client'

import { useState, useRef } from 'react'
import { Sparkles, Upload, Download, Wand2, ArrowUpCircle, Camera, Check, Image } from 'lucide-react'

type Mode = 'text2img' | 'img2img' | 'upscale'
type ImgModel = 'flux-schnell' | 'flux-dev' | 'flux-pro'
type Img2ImgMode = 'default' | 'style' | 'portrait'

const ASPECT_RATIOS = [
  { label: '1:1', w: 1024, h: 1024 },
  { label: '16:9', w: 1344, h: 768 },
  { label: '9:16', w: 768, h: 1344 },
  { label: '4:5', w: 896, h: 1120 },
  { label: '3:2', w: 1216, h: 832 },
  { label: '21:9', w: 1536, h: 640 },
]

const CAMERA_PRESETS = [
  { label: 'ARRI Super 35', value: 'shot on ARRI Alexa Mini LF, Super 35mm sensor, ARRI Signature Prime lens, anamorphic bokeh, RAW, cinematic color science' },
  { label: 'RED Dragon', value: 'shot on RED Dragon 6K, cinema lens, RAW footage, cinematic color grade' },
  { label: 'Sony Venice', value: 'shot on Sony Venice 2, full frame sensor, Zeiss Supreme Prime lens, cinematic' },
  { label: '35mm Film', value: 'shot on 35mm Kodak Vision3 film, analog grain, rich colors, photochemical' },
  { label: 'Medium Format', value: 'shot on Hasselblad X2D, medium format, extreme detail, Phase One lens' },
]

const LENS_PRESETS = [
  { label: '24mm Large', value: '24mm wide angle, environmental portrait, deep background' },
  { label: '35mm Standard', value: '35mm lens, natural perspective, street photography style' },
  { label: '50mm Normal', value: '50mm standard lens, natural human eye perspective' },
  { label: '85mm Portrait', value: '85mm portrait lens, beautiful bokeh, subject separation' },
  { label: '135mm Tele', value: '135mm telephoto, compressed perspective, creamy bokeh' },
  { label: 'Anamorphic', value: 'anamorphic lens, oval bokeh, horizontal lens flares, cinematic' },
]

const LIGHTING_PRESETS = [
  { label: 'ARRI Studio', value: 'ARRI professional lighting, key light, rim light, bounce fill, skin glow' },
  { label: 'Golden Hour', value: 'golden hour, warm sunlight, long shadows, magic hour' },
  { label: 'Blue Hour', value: 'blue hour, twilight, ambient city glow, cool shadows' },
  { label: 'Neon Night', value: 'neon lights, urban night, colored reflections, rain-wet streets' },
  { label: 'Dramatic', value: 'dramatic side lighting, chiaroscuro, deep shadows, single key light' },
  { label: 'Soft Studio', value: 'large softbox, diffused light, professional beauty lighting, even skin' },
]

const COLOR_GRADES = [
  { label: 'Teal & Orange', value: 'teal and orange color grade, blockbuster cinema look' },
  { label: 'Kodak Vision3', value: 'Kodak Vision3 500T color science, warm shadows, rich midtones' },
  { label: 'Fuji Pro 400H', value: 'Fuji Pro 400H, pastel palette, slight green tint, elegant' },
  { label: 'Desaturated', value: 'desaturated cinematic grade, muted tones, grey palette' },
  { label: 'Cold Blue', value: 'cold blue grade, steel tones, modern cinematic' },
  { label: 'Moody Dark', value: 'moody dark grade, deep blacks, crushed shadows, atmospheric' },
]

const STYLE_PRESETS = [
  { label: '🎬 Cinéma', value: 'cinematic film still, movie scene, professional photography' },
  { label: '📰 Editorial', value: 'fashion editorial, luxury magazine, high-end commercial' },
  { label: '🌆 Urban', value: 'urban street photography, city environment, authentic' },
  { label: '💎 Luxe', value: 'luxury lifestyle, premium aesthetic, exclusive environment' },
  { label: '🎭 Afro', value: 'afrocentric aesthetic, vibrant colors, cultural richness' },
  { label: '🌃 Trap', value: 'trap aesthetic, dark luxury, urban night, exclusive' },
]

const IMG2IMG_MODES = [
  { id: 'default', label: 'Modifier', icon: '✏️', desc: 'Change style/contenu' },
  { id: 'style', label: 'Style Transfer', icon: '🎨', desc: 'Applique un style' },
  { id: 'portrait', label: 'Portrait IA', icon: '👤', desc: 'Depuis ta photo' },
]

export default function ImagePage() {
  const [mode, setMode] = useState<Mode>('text2img')

  // Text2img
  const [subject, setSubject] = useState('')
  const [camera, setCamera] = useState(CAMERA_PRESETS[0].value)
  const [lens, setLens] = useState(LENS_PRESETS[3].value)
  const [lighting, setLighting] = useState(LIGHTING_PRESETS[0].value)
  const [colorGrade, setColorGrade] = useState(COLOR_GRADES[0].value)
  const [style, setStyle] = useState(STYLE_PRESETS[0].value)
  const [selectedModel, setSelectedModel] = useState<ImgModel>('flux-pro')
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[1])
  const [addCinematic, setAddCinematic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enhancing, setEnhancing] = useState(false)

  // Img2img
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [sourceImageName, setSourceImageName] = useState('')
  const [img2imgPrompt, setImg2imgPrompt] = useState('')
  const [img2imgMode, setImg2imgMode] = useState<Img2ImgMode>('default')
  const [strength, setStrength] = useState(0.65)
  const [img2imgLoading, setImg2imgLoading] = useState(false)
  const [img2imgResult, setImg2imgResult] = useState<string | null>(null)

  // Upscale
  const [upscaleImage, setUpscaleImage] = useState<string | null>(null)
  const [upscaleImageName, setUpscaleImageName] = useState('')
  const [upscaleLoading, setUpscaleLoading] = useState(false)
  const [upscaleResult, setUpscaleResult] = useState<string | null>(null)
  const [upscaleScale, setUpscaleScale] = useState(4)

  const sourceRef = useRef<HTMLInputElement>(null)
  const upscaleRef = useRef<HTMLInputElement>(null)

  function buildPrompt() {
    return [subject, camera, lens, lighting, colorGrade, style]
      .filter(Boolean).join(', ')
  }

  async function enhancePrompt() {
    if (!subject) return
    setEnhancing(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'clip',
        messages: [{
          role: 'user',
          content: `Améliore ce prompt pour FLUX Pro Ultra — photoréalisme maximum cinématique :
"${buildPrompt()}"
Réponds UNIQUEMENT avec le prompt amélioré en anglais, max 200 mots.`
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
    setSubject(full.trim())
    setEnhancing(false)
  }

  async function generateImage() {
    if (!subject) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildPrompt(),
          width: selectedRatio.w,
          height: selectedRatio.h,
          model: selectedModel,
          addCinematic,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.url) setGeneratedImages(prev => [data.url, ...prev])
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  function handleSourceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceImageName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setSourceImage((ev.target?.result as string).split(',')[1])
    reader.readAsDataURL(file)
  }

  async function runImg2Img() {
    if (!sourceImage || !img2imgPrompt) return
    setImg2imgLoading(true); setImg2imgResult(null); setError(null)
    try {
      const res = await fetch('/api/img2img', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: sourceImage, prompt: img2imgPrompt, strength, mode: img2imgMode })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.url) setImg2imgResult(data.url)
    } catch (e: any) { setError(e.message) }
    setImg2imgLoading(false)
  }

  function handleUpscaleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUpscaleImageName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setUpscaleImage((ev.target?.result as string).split(',')[1])
    reader.readAsDataURL(file)
  }

  async function runUpscale() {
    if (!upscaleImage) return
    setUpscaleLoading(true); setUpscaleResult(null); setError(null)
    try {
      const res = await fetch('/api/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: upscaleImage, scale: upscaleScale })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.url) setUpscaleResult(data.url)
    } catch (e: any) { setError(e.message) }
    setUpscaleLoading(false)
  }

  async function downloadImage(url: string, name = 'vizion-image.jpg') {
    try {
      const blob = await fetch(url).then(r => r.blob())
      const file = new File([blob], name, { type: 'image/jpeg' })
      if ((navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'VIZION IMAGE' })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = name
        document.body.appendChild(a); a.click()
        setTimeout(() => document.body.removeChild(a), 100)
      }
    } catch { window.open(url, '_blank') }
  }

  const Chips = ({ options, value, onChange }: { options: {label: string; value: string}[]; value: string; onChange: (v: string) => void }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${value === o.value ? 'bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Wand2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">VIZION IMAGE</h1>
          <p className="text-white/40 text-xs">FLUX Pro Ultra · ARRI Cinema · RAW Photoréalisme</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'text2img', label: '✨ Générer' },
          { id: 'img2img', label: '🎨 Modifier' },
          { id: 'upscale', label: '🔍 Upscale 4x' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setMode(id as Mode)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${mode === id ? 'bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 text-red-400 text-sm flex items-center justify-between">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── TEXT TO IMAGE ── */}
      {mode === 'text2img' && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-fuchsia-500/20 p-5">

            {/* Model */}
            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Modèle</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'flux-pro', label: 'FLUX Pro Ultra', desc: 'Max réalisme · ~45s', color: 'text-fuchsia-400' },
                  { id: 'flux-dev', label: 'FLUX Dev', desc: 'Équilibré · ~25s', color: 'text-violet-400' },
                  { id: 'flux-schnell', label: 'FLUX Schnell', desc: 'Rapide · ~10s', color: 'text-emerald-400' },
                ].map(m => (
                  <button key={m.id} onClick={() => setSelectedModel(m.id as ImgModel)}
                    className={`p-3 rounded-2xl border text-center transition-all ${selectedModel === m.id ? 'bg-fuchsia-500/20 border-fuchsia-500/40' : 'bg-white/3 border-white/8 hover:bg-white/8'}`}>
                    <p className={`text-xs font-bold ${selectedModel === m.id ? m.color : 'text-white/50'}`}>{m.label}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cinematic toggle */}
            <div className="flex items-center justify-between mb-4 bg-white/3 rounded-2xl p-3 border border-white/8">
              <div>
                <p className="text-white/70 text-sm font-medium">🎬 Mode Cinématique ARRI</p>
                <p className="text-white/30 text-xs">Ajoute Super 35, RAW, Signature Prime automatiquement</p>
              </div>
              <button onClick={() => setAddCinematic(!addCinematic)}
                className={`w-12 h-6 rounded-full transition-all flex-shrink-0 ${addCinematic ? 'bg-fuchsia-500' : 'bg-white/20'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow mx-0.5 transition-all ${addCinematic ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">Sujet *</p>
                <button onClick={enhancePrompt} disabled={enhancing || !subject}
                  className="flex items-center gap-1.5 text-xs text-fuchsia-400 disabled:opacity-40">
                  <Sparkles size={11} />
                  {enhancing ? 'IA...' : 'Améliorer'}
                </button>
              </div>
              <textarea value={subject} onChange={e => setSubject(e.target.value)} rows={2}
                placeholder="ex: artiste rap marseillais, costume 4 pièces noir, sur un rooftop vue mer..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 transition-colors resize-none text-sm" />
            </div>

            {/* Camera */}
            <div className="mb-3">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Caméra</p>
              <Chips options={CAMERA_PRESETS} value={camera} onChange={setCamera} />
            </div>

            {/* Lens */}
            <div className="mb-3">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Objectif</p>
              <Chips options={LENS_PRESETS} value={lens} onChange={setLens} />
            </div>

            {/* Lighting */}
            <div className="mb-3">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Lumière</p>
              <Chips options={LIGHTING_PRESETS} value={lighting} onChange={setLighting} />
            </div>

            {/* Color grade */}
            <div className="mb-3">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Color Grade</p>
              <Chips options={COLOR_GRADES} value={colorGrade} onChange={setColorGrade} />
            </div>

            {/* Style */}
            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Style</p>
              <Chips options={STYLE_PRESETS} value={style} onChange={setStyle} />
            </div>

            {/* Format */}
            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Format</p>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_RATIOS.map(r => (
                  <button key={r.label} onClick={() => setSelectedRatio(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${selectedRatio.label === r.label ? 'bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt preview */}
            {subject && (
              <div className="bg-black/20 rounded-2xl p-3 mb-4 border border-white/5">
                <p className="text-white/30 text-xs mb-1">Prompt complet</p>
                <p className="text-white/50 text-xs font-mono leading-relaxed line-clamp-3">
                  {buildPrompt()}{addCinematic ? ', shot on ARRI Alexa Mini LF, Super 35mm...' : ''}
                </p>
              </div>
            )}

            <button onClick={generateImage} disabled={loading || !subject}
              className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-bold px-6 py-4 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Wand2 size={18} />
              {loading ? 'Génération FLUX Pro Ultra...' : 'Générer l\'image'}
            </button>

            {loading && (
              <div className="mt-4 text-center">
                <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-white/40 text-sm">
                  {selectedModel === 'flux-pro' ? 'FLUX Pro Ultra — max qualité (~45s)...' :
                   selectedModel === 'flux-dev' ? 'FLUX Dev (~25s)...' : 'FLUX Schnell (~10s)...'}
                </p>
              </div>
            )}
          </div>

          {generatedImages.length > 0 && (
            <div className="space-y-4">
              <p className="text-white/25 text-xs uppercase tracking-wider">Images générées ({generatedImages.length})</p>
              {generatedImages.map((url, i) => (
                <div key={i} className="glass rounded-2xl border border-white/8 overflow-hidden">
                  <img src={url} alt={`gen-${i}`} className="w-full object-cover" />
                  <div className="p-3 flex gap-2">
                    <button onClick={() => downloadImage(url, `vizion-${Date.now()}.jpg`)}
                      className="flex-1 flex items-center gap-2 justify-center bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-sm py-2.5 rounded-xl">
                      <Download size={14} /> Télécharger
                    </button>
                    <button onClick={() => { setMode('upscale'); setUpscaleImage(null) }}
                      className="flex items-center gap-1.5 bg-white/5 border border-white/15 text-white/60 text-xs px-4 py-2.5 rounded-xl">
                      <ArrowUpCircle size={12} /> 4x HD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── IMG2IMG ── */}
      {mode === 'img2img' && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-violet-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Camera size={16} className="text-violet-400" />
              <p className="text-violet-400 font-bold text-sm">IMAGE → IMAGE</p>
            </div>

            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {IMG2IMG_MODES.map(m => (
                  <button key={m.id} onClick={() => setImg2imgMode(m.id as Img2ImgMode)}
                    className={`p-3 rounded-2xl border text-center transition-all ${img2imgMode === m.id ? 'bg-violet-500/20 border-violet-500/40' : 'bg-white/3 border-white/8'}`}>
                    <p className="text-lg mb-0.5">{m.icon}</p>
                    <p className={`text-xs font-medium ${img2imgMode === m.id ? 'text-violet-300' : 'text-white/40'}`}>{m.label}</p>
                    <p className="text-[10px] text-white/20">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Ta photo *</p>
              <div onClick={() => sourceRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${sourceImage ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/15 hover:border-white/30'}`}>
                {sourceImage ? (
                  <div>
                    <Check size={18} className="text-emerald-400 mx-auto mb-1" />
                    <p className="text-emerald-400 text-sm">{sourceImageName}</p>
                    <img src={`data:image/jpeg;base64,${sourceImage}`} alt="source" className="w-24 h-24 object-cover rounded-xl mx-auto mt-2" />
                  </div>
                ) : (
                  <div>
                    <Upload size={18} className="text-white/30 mx-auto mb-1" />
                    <p className="text-white/50 text-sm">Upload ta photo</p>
                  </div>
                )}
              </div>
              <input ref={sourceRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp" onChange={handleSourceUpload} className="hidden" />
            </div>

            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Description du résultat *</p>
              <textarea value={img2imgPrompt} onChange={e => setImg2imgPrompt(e.target.value)} rows={3}
                placeholder="ex: rooftop de marseille, fin de journée, costume 4 pièces noir, ARRI cinematic, RAW 4K..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 resize-none text-sm" />
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <p className="text-white/40 text-xs uppercase tracking-wider">Intensité</p>
                <span className="text-violet-400 text-xs font-bold">{Math.round(strength * 100)}%</span>
              </div>
              <input type="range" min={0.1} max={1} step={0.05} value={strength} onChange={e => setStrength(+e.target.value)} className="w-full accent-violet-500" />
              <div className="flex justify-between text-xs text-white/20 mt-1">
                <span>Fidèle à l'original</span><span>Transformation totale</span>
              </div>
            </div>

            <button onClick={runImg2Img} disabled={img2imgLoading || !sourceImage || !img2imgPrompt}
              className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold px-6 py-4 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Wand2 size={18} />
              {img2imgLoading ? 'Transformation en cours (~30s)...' : 'Transformer l\'image'}
            </button>

            {img2imgLoading && (
              <div className="mt-4 text-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-white/40 text-sm">FLUX génère ta transformation...</p>
              </div>
            )}
          </div>

          {img2imgResult && (
            <div className="glass rounded-2xl border border-violet-500/20 overflow-hidden">
              <img src={img2imgResult} alt="result" className="w-full object-cover" />
              <div className="p-3 flex gap-2">
                <button onClick={() => downloadImage(img2imgResult, `vizion-img2img-${Date.now()}.jpg`)}
                  className="flex-1 flex items-center gap-2 justify-center bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm py-2.5 rounded-xl">
                  <Download size={14} /> Télécharger
                </button>
                <button onClick={() => setMode('upscale')}
                  className="flex items-center gap-1.5 bg-white/5 border border-white/15 text-white/60 text-xs px-4 py-2.5 rounded-xl">
                  <ArrowUpCircle size={12} /> Upscale 4x
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UPSCALE ── */}
      {mode === 'upscale' && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-emerald-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpCircle size={16} className="text-emerald-400" />
              <p className="text-emerald-400 font-bold text-sm">UPSCALE HD — Real-ESRGAN</p>
            </div>

            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Facteur</p>
              <div className="flex gap-2">
                {[2, 4].map(s => (
                  <button key={s} onClick={() => setUpscaleScale(s)}
                    className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all ${upscaleScale === s ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Image *</p>
              <div onClick={() => upscaleRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${upscaleImage ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/15 hover:border-white/30'}`}>
                {upscaleImage ? (
                  <div>
                    <Check size={18} className="text-emerald-400 mx-auto mb-1" />
                    <p className="text-emerald-400 text-sm">{upscaleImageName}</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={18} className="text-white/30 mx-auto mb-1" />
                    <p className="text-white/50 text-sm">Upload ton image</p>
                    <p className="text-white/25 text-xs mt-1">Sera agrandie {upscaleScale}x en HD</p>
                  </div>
                )}
              </div>
              <input ref={upscaleRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp" onChange={handleUpscaleUpload} className="hidden" />
            </div>

            <button onClick={runUpscale} disabled={upscaleLoading || !upscaleImage}
              className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-6 py-4 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <ArrowUpCircle size={18} />
              {upscaleLoading ? `Upscale ${upscaleScale}x...` : `Agrandir ${upscaleScale}x HD`}
            </button>

            {upscaleLoading && (
              <div className="mt-4 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-white/40 text-sm">Real-ESRGAN upscale...</p>
              </div>
            )}
          </div>

          {upscaleResult && (
            <div className="glass rounded-2xl border border-emerald-500/20 overflow-hidden">
              <img src={upscaleResult} alt="upscaled" className="w-full object-cover" />
              <div className="p-3">
                <button onClick={() => downloadImage(upscaleResult, `vizion-upscale-${upscaleScale}x-${Date.now()}.jpg`)}
                  className="w-full flex items-center gap-2 justify-center bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm py-2.5 rounded-xl">
                  <Download size={14} /> Télécharger {upscaleScale}x HD
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
