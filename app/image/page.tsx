'use client'

import { useState, useRef } from 'react'
import { Sparkles, Upload, Download, RefreshCw, Zap, Check, Image, Wand2, ArrowUpCircle, Camera, Copy } from 'lucide-react'

type Mode = 'text2img' | 'img2img' | 'upscale'
type ImgModel = 'flux-schnell' | 'flux-pro' | 'sdxl'
type Img2ImgMode = 'default' | 'style' | 'portrait'

const ASPECT_RATIOS = [
  { label: '1:1', w: 1024, h: 1024 },
  { label: '16:9', w: 1344, h: 768 },
  { label: '9:16', w: 768, h: 1344 },
  { label: '4:5', w: 896, h: 1120 },
  { label: '3:2', w: 1216, h: 832 },
  { label: '21:9', w: 1536, h: 640 },
]

const STYLE_PRESETS = [
  { label: 'Cinématique', prompt: 'cinematic photography, ARRI Alexa, 85mm lens, shallow depth of field, film grain, professional color grade' },
  { label: 'Portrait Luxe', prompt: 'luxury fashion portrait, studio lighting, high-end magazine editorial, perfect skin, professional photographer' },
  { label: 'Urban Night', prompt: 'urban night photography, neon lights, bokeh background, street photography, moody atmosphere' },
  { label: 'Trap Esthétique', prompt: 'trap aesthetic, dark moody, luxury cars, urban environment, cinematic, high contrast' },
  { label: 'Afro Vibrant', prompt: 'vibrant afro aesthetic, colorful, joyful, golden hour, african fashion, editorial' },
  { label: 'Studio Pro', prompt: 'professional studio photography, seamless background, three-point lighting, commercial photography' },
  { label: 'Anime/Illustration', prompt: 'anime style illustration, vibrant colors, detailed artwork, manga inspired' },
  { label: 'Hyperréaliste', prompt: 'hyperrealistic photography, 8K resolution, ultra detailed, photorealistic render' },
]

const IMG2IMG_MODES = [
  { id: 'default', label: 'Modifier', icon: '✏️', desc: 'Change le style ou contenu' },
  { id: 'style', label: 'Style Transfer', icon: '🎨', desc: 'Applique un style sur ta photo' },
  { id: 'portrait', label: 'Portrait IA', icon: '👤', desc: 'Génère depuis ton portrait' },
]

export default function ImagePage() {
  const [mode, setMode] = useState<Mode>('text2img')

  // Text2img
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, ugly, watermark, text')
  const [selectedModel, setSelectedModel] = useState<ImgModel>('flux-schnell')
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0])
  const [steps, setSteps] = useState(25)
  const [guidance, setGuidance] = useState(3.5)
  const [loading, setLoading] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enhancingPrompt, setEnhancingPrompt] = useState(false)

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

  const [copied, setCopied] = useState<string | null>(null)

  const sourceRef = useRef<HTMLInputElement>(null)
  const upscaleRef = useRef<HTMLInputElement>(null)

  // ── ENHANCE PROMPT WITH AI ──
  async function enhancePrompt() {
    if (!prompt) return
    setEnhancingPrompt(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'clip',
        messages: [{
          role: 'user',
          content: `Améliore ce prompt pour générer une image photoréaliste de haute qualité avec FLUX/Stable Diffusion :
"${prompt}"

Réponds UNIQUEMENT avec le prompt amélioré en anglais, max 200 mots. Garde l'intention originale mais ajoute des détails techniques de qualité (lighting, camera, style, textures).`
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
    setPrompt(full.trim())
    setEnhancingPrompt(false)
  }

  // ── GENERATE IMAGE ──
  async function generateImage() {
    if (!prompt) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          width: selectedRatio.w,
          height: selectedRatio.h,
          steps,
          guidance,
          model: selectedModel,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.url) setGeneratedImages(prev => [data.url, ...prev])
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  // ── IMG2IMG ──
  function handleSourceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceImageName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      setSourceImage((ev.target?.result as string).split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  async function runImg2Img() {
    if (!sourceImage || !img2imgPrompt) return
    setImg2imgLoading(true); setImg2imgResult(null)
    try {
      const res = await fetch('/api/img2img', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: sourceImage,
          prompt: img2imgPrompt,
          strength,
          mode: img2imgMode,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.url) setImg2imgResult(data.url)
    } catch (e: any) {
      setError(e.message)
    }
    setImg2imgLoading(false)
  }

  // ── UPSCALE ──
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
    setUpscaleLoading(true); setUpscaleResult(null)
    try {
      const res = await fetch('/api/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: upscaleImage, scale: upscaleScale })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.url) setUpscaleResult(data.url)
    } catch (e: any) {
      setError(e.message)
    }
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

  const MODEL_INFO = {
    'flux-schnell': { label: 'FLUX Schnell', desc: 'Rapide · 10s', color: 'text-emerald-400' },
    'flux-pro': { label: 'FLUX Pro 1.1', desc: 'Meilleur · 30s', color: 'text-violet-400' },
    'sdxl': { label: 'SDXL', desc: 'Stylisé · 20s', color: 'text-blue-400' },
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Wand2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">VIZION IMAGE</h1>
          <p className="text-white/40 text-xs">FLUX Pro · Stable Diffusion · Upscale 4x</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'text2img', label: '✨ Générer', desc: 'Texte → Image' },
          { id: 'img2img', label: '🎨 Modifier', desc: 'Image → Image' },
          { id: 'upscale', label: '🔍 Upscale', desc: '4x HD' },
        ].map(({ id, label, desc }) => (
          <button key={id} onClick={() => setMode(id as Mode)}
            className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${mode === id ? 'bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
            {label}
            <span className="text-xs ml-1.5 opacity-60">{desc}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 text-red-400 text-sm flex items-center justify-between">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
        </div>
      )}

      {/* ── TEXT TO IMAGE ── */}
      {mode === 'text2img' && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-fuchsia-500/20 p-5">

            {/* Model selector */}
            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Modèle</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(MODEL_INFO) as [ImgModel, any][]).map(([key, info]) => (
                  <button key={key} onClick={() => setSelectedModel(key)}
                    className={`p-3 rounded-2xl border text-center transition-all ${selectedModel === key ? 'bg-fuchsia-500/20 border-fuchsia-500/40' : 'bg-white/3 border-white/8 hover:bg-white/8'}`}>
                    <p className={`text-xs font-bold ${selectedModel === key ? info.color : 'text-white/50'}`}>{info.label}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{info.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">Prompt *</p>
                <button onClick={enhancePrompt} disabled={enhancingPrompt || !prompt}
                  className="flex items-center gap-1.5 text-xs text-fuchsia-400 disabled:opacity-40 hover:text-fuchsia-300 transition-colors">
                  <Sparkles size={11} />
                  {enhancingPrompt ? 'Amélioration...' : 'Améliorer avec IA'}
                </button>
              </div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                placeholder="ex: portrait d'un artiste rap, lumière cinématique ARRI, nuit urbaine..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 transition-colors resize-none text-sm" />
            </div>

            {/* Style presets */}
            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Presets de style</p>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_PRESETS.map(s => (
                  <button key={s.label} onClick={() => setPrompt(prev => prev ? `${prev}, ${s.prompt}` : s.prompt)}
                    className="px-2.5 py-1 rounded-xl text-xs bg-white/5 border border-white/10 text-white/40 hover:bg-fuchsia-500/15 hover:text-fuchsia-300 hover:border-fuchsia-500/30 transition-all">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect ratio */}
            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Format</p>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_RATIOS.map(r => (
                  <button key={r.label} onClick={() => setSelectedRatio(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${selectedRatio.label === r.label ? 'bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                    {r.label}
                    <span className="text-[10px] ml-1 opacity-60">{r.w}×{r.h}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="flex justify-between mb-1"><p className="text-white/40 text-xs">Steps</p><span className="text-white/40 text-xs">{steps}</span></div>
                <input type="range" min={10} max={50} step={5} value={steps} onChange={e => setSteps(+e.target.value)} className="w-full accent-fuchsia-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1"><p className="text-white/40 text-xs">Guidance</p><span className="text-white/40 text-xs">{guidance}</span></div>
                <input type="range" min={1} max={15} step={0.5} value={guidance} onChange={e => setGuidance(+e.target.value)} className="w-full accent-fuchsia-500" />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Négatif</p>
              <input value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/60 text-xs focus:outline-none focus:border-fuchsia-500/30" />
            </div>

            <button onClick={generateImage} disabled={loading || !prompt}
              className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-bold px-6 py-4 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Wand2 size={18} />
              {loading ? 'Génération en cours...' : 'Générer l\'image'}
            </button>

            {loading && (
              <div className="mt-4 text-center">
                <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-white/40 text-sm">
                  {selectedModel === 'flux-pro' ? 'FLUX Pro génère (~30s)...' : selectedModel === 'sdxl' ? 'SDXL génère (~20s)...' : 'FLUX Schnell génère (~10s)...'}
                </p>
              </div>
            )}
          </div>

          {/* Generated images */}
          {generatedImages.length > 0 && (
            <div>
              <p className="text-white/25 text-xs uppercase tracking-wider mb-3">Images générées ({generatedImages.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedImages.map((url, i) => (
                  <div key={i} className="glass rounded-2xl border border-white/8 overflow-hidden">
                    <img src={url} alt={`generated-${i}`} className="w-full object-cover" />
                    <div className="p-3 flex gap-2">
                      <button onClick={() => downloadImage(url, `vizion-${Date.now()}.jpg`)}
                        className="flex-1 flex items-center gap-2 justify-center bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-sm py-2 rounded-xl hover:bg-fuchsia-500/30 transition-colors">
                        <Download size={14} /> Télécharger
                      </button>
                      <button onClick={() => { setSourceImage(null); setMode('img2img'); window.open(url, '_blank') }}
                        className="flex items-center gap-1.5 bg-white/5 border border-white/15 text-white/60 text-xs px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                        <Image size={12} /> Modifier
                      </button>
                      <button onClick={() => { setUpscaleImage(null); setMode('upscale'); window.open(url, '_blank') }}
                        className="flex items-center gap-1.5 bg-white/5 border border-white/15 text-white/60 text-xs px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                        <ArrowUpCircle size={12} /> 4x
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

            {/* Mode selector */}
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

            {/* Upload source */}
            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                {img2imgMode === 'portrait' ? 'Ta photo *' : 'Image source *'}
              </p>
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
                    <p className="text-white/25 text-xs mt-1">JPG, PNG, WebP</p>
                  </div>
                )}
              </div>
              <input ref={sourceRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp" onChange={handleSourceUpload} className="hidden" />
            </div>

            {/* Prompt */}
            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                {img2imgMode === 'portrait' ? 'Description du résultat' : 'Comment modifier l\'image'}
              </p>
              <textarea value={img2imgPrompt} onChange={e => setImg2imgPrompt(e.target.value)} rows={3}
                placeholder={
                  img2imgMode === 'portrait' ? 'ex: professional portrait, luxury fashion editorial, studio lighting...' :
                  img2imgMode === 'style' ? 'ex: cyberpunk neon style, futuristic city background...' :
                  'ex: change background to luxury studio, add cinematic lighting...'
                }
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none text-sm" />
            </div>

            {/* Strength */}
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <p className="text-white/40 text-xs uppercase tracking-wider">Intensité de modification</p>
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
              {img2imgLoading ? 'Transformation en cours...' : 'Transformer l\'image'}
            </button>

            {img2imgLoading && (
              <div className="mt-4 text-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-white/40 text-sm">Transformation IA (~30s)...</p>
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
                <button onClick={() => { setUpscaleImage(null); setMode('upscale') }}
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
              <p className="text-emerald-400 font-bold text-sm">UPSCALE HD</p>
              <span className="text-white/30 text-xs">Real-ESRGAN · 2x ou 4x</span>
            </div>

            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Facteur d'agrandissement</p>
              <div className="flex gap-2">
                {[2, 4].map(s => (
                  <button key={s} onClick={() => setUpscaleScale(s)}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${upscaleScale === s ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Image à agrandir *</p>
              <div onClick={() => upscaleRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${upscaleImage ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/15 hover:border-white/30'}`}>
                {upscaleImage ? (
                  <div>
                    <Check size={18} className="text-emerald-400 mx-auto mb-1" />
                    <p className="text-emerald-400 text-sm">{upscaleImageName}</p>
                    <img src={`data:image/jpeg;base64,${upscaleImage}`} alt="upscale" className="w-24 h-24 object-cover rounded-xl mx-auto mt-2" />
                  </div>
                ) : (
                  <div>
                    <Upload size={18} className="text-white/30 mx-auto mb-1" />
                    <p className="text-white/50 text-sm">Upload ton image</p>
                    <p className="text-white/25 text-xs mt-1">Sera agrandie en {upscaleScale}x HD</p>
                  </div>
                )}
              </div>
              <input ref={upscaleRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp" onChange={handleUpscaleUpload} className="hidden" />
            </div>

            <button onClick={runUpscale} disabled={upscaleLoading || !upscaleImage}
              className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-6 py-4 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
              <ArrowUpCircle size={18} />
              {upscaleLoading ? `Upscale ${upscaleScale}x en cours...` : `Agrandir en ${upscaleScale}x HD`}
            </button>

            {upscaleLoading && (
              <div className="mt-4 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-white/40 text-sm">Real-ESRGAN upscale (~20s)...</p>
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
