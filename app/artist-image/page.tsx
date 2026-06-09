'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Download, Wand2, Check, Plus, Sparkles, ChevronDown, ChevronUp, User } from 'lucide-react'

interface ArtistProfile {
  id: string
  name: string
  reference_url: string
  style: string
  genre: string
  created_at: string
  artist_generations?: { id: string; image_url: string; prompt: string; created_at: string }[]
}

const CAMERA_PRESETS = [
  { label: 'ARRI Super 35', value: 'ARRI Alexa Mini LF, Super 35mm, ARRI Signature Prime lens, RAW' },
  { label: 'RED Dragon', value: 'RED Dragon 6K cinema camera, cinema prime lens' },
  { label: 'Sony Venice', value: 'Sony Venice 2, full frame, Zeiss Supreme Prime' },
  { label: '35mm Film', value: 'Kodak Vision3 35mm film, analog grain' },
  { label: 'Medium Format', value: 'Hasselblad X2D medium format, extreme detail' },
]

const LENS_PRESETS = [
  { label: '24mm', value: '24mm wide angle lens' },
  { label: '35mm', value: '35mm lens, natural perspective' },
  { label: '50mm', value: '50mm standard lens' },
  { label: '85mm Portrait', value: '85mm portrait lens, beautiful bokeh' },
  { label: '135mm', value: '135mm telephoto, compressed perspective' },
  { label: 'Anamorphic', value: 'anamorphic lens, oval bokeh, lens flares' },
]

const LIGHTING_PRESETS = [
  { label: 'ARRI Studio', value: 'ARRI professional lighting, key light, rim light, bounce fill' },
  { label: 'Golden Hour', value: 'golden hour sunlight, warm tones, long shadows' },
  { label: 'Blue Hour', value: 'blue hour twilight, ambient city glow' },
  { label: 'Neon Night', value: 'neon lights, urban night, colored reflections' },
  { label: 'Dramatic', value: 'dramatic side lighting, chiaroscuro, deep shadows' },
  { label: 'Soft Studio', value: 'large softbox, diffused beauty lighting' },
]

const COLOR_GRADES = [
  { label: 'Teal & Orange', value: 'teal and orange color grade, blockbuster look' },
  { label: 'Kodak Vision3', value: 'Kodak Vision3 color science, warm shadows' },
  { label: 'Fuji Pro 400H', value: 'Fuji Pro 400H, pastel palette' },
  { label: 'Desaturated', value: 'desaturated cinematic grade, muted tones' },
  { label: 'Cold Blue', value: 'cold blue grade, steel tones, modern' },
  { label: 'Moody Dark', value: 'moody dark grade, deep blacks, atmospheric' },
]

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: "4:5", value: "4:5" },
  { label: "21:9", value: "21:9" },
]

const GENRES = ['Trap', 'Drill', 'Afro', 'R&B', 'Pop', 'Rap FR', 'Dancehall']

export default function ArtistImagePage() {
  const [profiles, setProfiles] = useState<ArtistProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<ArtistProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [openaiUrl, setOpenaiUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [skipFaceFusion, setSkipFaceFusion] = useState(false)

  // New profile
  const [newName, setNewName] = useState('')
  const [newGenre, setNewGenre] = useState('Trap')
  const [newStyle, setNewStyle] = useState('')
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Generation
  const [prompt, setPrompt] = useState('')
  const [camera, setCamera] = useState(CAMERA_PRESETS[0].value)
  const [lens, setLens] = useState(LENS_PRESETS[3].value)
  const [lighting, setLighting] = useState(LIGHTING_PRESETS[0].value)
  const [colorGrade, setColorGrade] = useState(COLOR_GRADES[0].value)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [addCinematic, setAddCinematic] = useState(true)
  const [enhancing, setEnhancing] = useState(false)

  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadProfiles() }, [])

  async function loadProfiles() {
    setLoadingProfiles(true)
    try {
      const res = await fetch('/api/artist-profiles')
      const data = await res.json()
      setProfiles(data.profiles || [])
    } catch {}
    setLoadingProfiles(false)
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPhoto(file)
    const reader = new FileReader()
    reader.onload = ev => setNewPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function saveProfile() {
    if (!newName || !newPhoto) return
    setSavingProfile(true)
    try {
      const fd = new FormData()
      fd.append('name', newName)
      fd.append('genre', newGenre)
      fd.append('style', newStyle)
      fd.append('photo', newPhoto)
      const res = await fetch('/api/artist-profiles', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProfiles(prev => [data.profile, ...prev])
      setSelectedProfile(data.profile)
      setShowNewProfile(false)
      setNewName(''); setNewGenre('Trap'); setNewStyle('')
      setNewPhoto(null); setNewPhotoPreview(null)
    } catch (e: any) { setError(e.message) }
    setSavingProfile(false)
  }

  async function deleteProfile(id: string) {
    if (!confirm('Supprimer ce profil ?')) return
    await fetch('/api/artist-profiles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setProfiles(prev => prev.filter(p => p.id !== id))
    if (selectedProfile?.id === id) setSelectedProfile(null)
  }

  async function enhancePrompt() {
    if (!prompt) return
    setEnhancing(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'clip',
        messages: [{
          role: 'user',
          content: `Améliore ce prompt pour générer une image photoréaliste cinématique avec OpenAI gpt-image-1 :
"${prompt}"
${selectedProfile ? `Artiste : ${selectedProfile.name}, genre : ${selectedProfile.genre}` : ''}
Réponds UNIQUEMENT avec le prompt amélioré en anglais, max 200 mots. Décris le décor, la lumière, l'ambiance. Ne décris PAS le visage.`
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
    setEnhancing(false)
  }

  async function generate() {
    if (!prompt) return
    setLoading(true); setError(null); setGeneratedUrl(null); setOpenaiUrl(null)

    const stepTimer1 = setTimeout(() => setLoadingStep('🎨 OpenAI gpt-image-1 génère...'), 100)
    const stepTimer2 = setTimeout(() => setLoadingStep('🔄 FaceFusion swap le visage...'), 15000)

    try {
      const res = await fetch('/api/face-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: selectedProfile?.id,
          referenceUrl: selectedProfile?.reference_url || null,
          prompt,
          camera,
          lens,
          lighting,
          colorGrade,
          aspectRatio,
          addCinematic,
          skipFaceFusion: skipFaceFusion || !selectedProfile?.reference_url,
        })
      })
      const data = await res.json()
      clearTimeout(stepTimer1); clearTimeout(stepTimer2)
      if (data.error) throw new Error(data.error)
      setGeneratedUrl(data.url)
      if (data.openai_url && data.openai_url !== data.url) setOpenaiUrl(data.openai_url)
      await loadProfiles()
    } catch (e: any) {
      clearTimeout(stepTimer1); clearTimeout(stepTimer2)
      setError(e.message)
    }
    setLoading(false)
    setLoadingStep('')
  }

  async function downloadImage(url: string, name = 'vizion-artist.jpg') {
    try {
      const blob = await fetch(url).then(r => r.blob())
      const file = new File([blob], name, { type: 'image/jpeg' })
      if ((navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'VIZION ARTIST IMAGE' })
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
          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${value === o.value ? 'bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )

  const hasFaceRef = !!selectedProfile?.reference_url

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center flex-shrink-0">
          <User size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">ARTIST IMAGE</h1>
          <p className="text-white/40 text-xs">OpenAI gpt-image-1 · FaceFusion · Kling Video</p>
        </div>
      </div>

      {/* Workflow */}
      <div className="glass-card rounded-2xl border border-white/8 p-3 mb-6">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg">① OpenAI gpt-image-1</span>
          <span className="text-white/20">→</span>
          <span className={`px-2.5 py-1 rounded-lg ${hasFaceRef && !skipFaceFusion ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-white/20 line-through'}`}>② FaceFusion</span>
          <span className="text-white/20">→</span>
          <span className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg">③ Kling Video</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 text-red-400 text-sm flex items-center justify-between">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Profiles */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Profils artistes</p>
          <button onClick={() => setShowNewProfile(!showNewProfile)}
            className="flex items-center gap-1.5 text-xs bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 px-3 py-1.5 rounded-xl hover:bg-fuchsia-500/30 transition-colors">
            <Plus size={12} /> Nouveau profil
          </button>
        </div>

        {showNewProfile && (
          <div className="glass-card rounded-3xl border border-fuchsia-500/20 p-5 mb-4">
            <p className="text-fuchsia-400 font-bold text-sm mb-4">Nouveau profil artiste</p>
            <div className="space-y-3">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nom de l'artiste"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 text-sm" />
              <div>
                <p className="text-white/40 text-xs mb-2">Genre</p>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map(g => (
                    <button key={g} onClick={() => setNewGenre(g)}
                      className={`px-2.5 py-1 rounded-xl text-xs transition-all ${newGenre === g ? 'bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <input value={newStyle} onChange={e => setNewStyle(e.target.value)}
                placeholder="Style (ex: dark luxury, streetwear...)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 text-sm" />
              <div onClick={() => photoRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${newPhotoPreview ? 'border-fuchsia-500/40' : 'border-white/15 hover:border-white/30'}`}>
                {newPhotoPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={newPhotoPreview} alt="preview" className="w-16 h-16 rounded-xl object-cover" />
                    <p className="text-emerald-400 text-sm font-medium">Photo chargée ✓</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={18} className="text-white/30 mx-auto mb-1" />
                    <p className="text-white/50 text-sm">Photo portrait — visage clair, pas de lunettes</p>
                  </div>
                )}
              </div>
              <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              <div className="flex gap-2">
                <button onClick={saveProfile} disabled={savingProfile || !newName || !newPhoto}
                  className="flex-1 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-bold py-3 rounded-2xl disabled:opacity-40">
                  {savingProfile ? 'Création...' : 'Créer le profil'}
                </button>
                <button onClick={() => setShowNewProfile(false)}
                  className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-sm">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingProfiles ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1,2,3].map(i => <div key={i} className="w-24 h-28 rounded-2xl bg-white/5 animate-pulse flex-shrink-0" />)}
          </div>
        ) : profiles.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center border border-white/8">
            <p className="text-3xl mb-2">👤</p>
            <p className="text-white/40 text-sm">Crée ton premier profil artiste</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {profiles.map(profile => (
              <div key={profile.id} className="flex-shrink-0 relative group">
                <button onClick={() => setSelectedProfile(selectedProfile?.id === profile.id ? null : profile)}
                  className={`w-24 rounded-2xl overflow-hidden border-2 transition-all block ${selectedProfile?.id === profile.id ? 'border-fuchsia-500 scale-105' : 'border-white/10 hover:border-white/30'}`}>
                  {profile.reference_url ? (
                    <img src={profile.reference_url} alt={profile.name} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 bg-white/10 flex items-center justify-center">
                      <User size={24} className="text-white/30" />
                    </div>
                  )}
                  <div className="bg-black/50 p-1.5">
                    <p className="text-white text-xs font-medium truncate">{profile.name}</p>
                    <p className="text-white/30 text-[10px]">{profile.genre}</p>
                  </div>
                </button>
                <button onClick={() => deleteProfile(profile.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white hidden group-hover:flex items-center justify-center text-xs font-bold">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected artist */}
      {selectedProfile && (
        <div className="glass-card rounded-2xl border border-fuchsia-500/15 p-4 mb-4">
          <div className="flex items-center gap-3">
            {selectedProfile.reference_url && (
              <img src={selectedProfile.reference_url} alt={selectedProfile.name} className="w-12 h-12 rounded-xl object-cover border border-fuchsia-500/30" />
            )}
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{selectedProfile.name}</p>
              <p className="text-fuchsia-400 text-xs">{selectedProfile.genre}</p>
            </div>
            {hasFaceRef && (
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xs">FaceFusion</span>
                <button onClick={() => setSkipFaceFusion(!skipFaceFusion)}
                  className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ${!skipFaceFusion ? 'bg-fuchsia-500' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-all ${!skipFaceFusion ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            )}
          </div>
          {hasFaceRef && !skipFaceFusion && (
            <p className="text-white/30 text-xs mt-2">
              ⚡ FaceFusion activé — le visage de {selectedProfile.name} sera swappé sur l'image générée
            </p>
          )}
          {hasFaceRef && skipFaceFusion && (
            <p className="text-white/25 text-xs mt-2">
              FaceFusion désactivé — génération OpenAI uniquement
            </p>
          )}
        </div>
      )}

      {/* Generation panel */}
      <div className="glass-card rounded-3xl border border-violet-500/20 p-5 mb-4">
        {/* Cinematic toggle */}
        <div className="flex items-center justify-between mb-4 bg-white/3 rounded-2xl p-3 border border-white/8">
          <div>
            <p className="text-white/70 text-sm font-medium">🎬 Mode Cinématique ARRI</p>
            <p className="text-white/30 text-xs">Super 35 · RAW · Signature Prime</p>
          </div>
          <button onClick={() => setAddCinematic(!addCinematic)}
            className={`w-12 h-6 rounded-full transition-all flex-shrink-0 ${addCinematic ? 'bg-fuchsia-500' : 'bg-white/20'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow mx-0.5 transition-all ${addCinematic ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Prompt */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs uppercase tracking-wider">Décris la scène *</p>
            <button onClick={enhancePrompt} disabled={enhancing || !prompt}
              className="flex items-center gap-1.5 text-xs text-fuchsia-400 disabled:opacity-40">
              <Sparkles size={11} />
              {enhancing ? 'IA...' : 'Améliorer'}
            </button>
          </div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
            placeholder={selectedProfile
              ? `ex: ${selectedProfile.name} sur un rooftop de Marseille au coucher du soleil, costume 4 pièces noir, vue mer...`
              : 'ex: artiste rap sur un rooftop de Marseille, costume 4 pièces noir, coucher de soleil...'}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 resize-none text-sm" />
        </div>

        <div className="mb-3">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Caméra</p>
          <Chips options={CAMERA_PRESETS} value={camera} onChange={setCamera} />
        </div>
        <div className="mb-3">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Objectif</p>
          <Chips options={LENS_PRESETS} value={lens} onChange={setLens} />
        </div>
        <div className="mb-3">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Lumière</p>
          <Chips options={LIGHTING_PRESETS} value={lighting} onChange={setLighting} />
        </div>
        <div className="mb-3">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Color Grade</p>
          <Chips options={COLOR_GRADES} value={colorGrade} onChange={setColorGrade} />
        </div>
        <div className="mb-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Format</p>
          <div className="flex gap-2 flex-wrap">
            {ASPECT_RATIOS.map(r => (
              <button key={r.value} onClick={() => setAspectRatio(r.value)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${aspectRatio === r.value ? 'bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading || !prompt}
          className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-bold px-6 py-4 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
          <Wand2 size={18} />
          {loading ? loadingStep || 'Génération...' : selectedProfile ? `Générer avec ${selectedProfile.name}` : 'Générer'}
        </button>

        {loading && (
          <div className="mt-4">
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 rounded-full animate-pulse"
                style={{width: loadingStep.includes('FaceFusion') ? '75%' : '35%'}} />
            </div>
            <div className="flex justify-between text-xs text-white/25 mt-2">
              <span className={loadingStep.includes('OpenAI') ? 'text-emerald-400' : ''}>① OpenAI</span>
              {hasFaceRef && !skipFaceFusion && <span className={loadingStep.includes('FaceFusion') ? 'text-violet-400' : ''}>② FaceFusion</span>}
              <span>✓ Résultat</span>
            </div>
            <p className="text-white/25 text-xs text-center mt-1">
              {hasFaceRef && !skipFaceFusion ? '~2-3 minutes' : '~15 secondes'}
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      {generatedUrl && (
        <div className="space-y-3 mb-4">
          {/* Final result */}
          <div className="glass rounded-2xl border border-fuchsia-500/20 overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-white/8">
              <div className="w-2 h-2 rounded-full bg-fuchsia-500" />
              <p className="text-fuchsia-400 text-xs font-bold uppercase tracking-wider">
                {openaiUrl ? 'Résultat final — FaceFusion' : 'Résultat — OpenAI gpt-image-1'}
              </p>
            </div>
            <img src={generatedUrl} alt="result" className="w-full object-cover" />
            <div className="p-3 flex gap-2">
              <button onClick={() => downloadImage(generatedUrl, `vizion-${selectedProfile?.name || 'artist'}-${Date.now()}.jpg`)}
                className="flex-1 flex items-center gap-2 justify-center bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-sm py-2.5 rounded-xl hover:bg-fuchsia-500/30 transition-colors">
                <Download size={14} /> Télécharger
              </button>
              <button onClick={() => window.open('https://klingai.com', '_blank')}
                className="flex items-center gap-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs px-4 py-2.5 rounded-xl hover:bg-violet-500/30 transition-colors">
                🎬 Animer Kling
              </button>
            </div>
          </div>

          {/* OpenAI preview before face swap */}
          {openaiUrl && (
            <div className="glass rounded-2xl border border-white/8 overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-white/8">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-white/30 text-xs uppercase tracking-wider">Avant FaceFusion (OpenAI gpt-image-1)</p>
              </div>
              <img src={openaiUrl} alt="openai" className="w-full object-cover opacity-60" />
            </div>
          )}
        </div>
      )}

      {/* History */}
      {selectedProfile?.artist_generations && selectedProfile.artist_generations.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider mb-3">
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Historique ({selectedProfile.artist_generations.length} images)
          </button>
          {showHistory && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selectedProfile.artist_generations.map(gen => (
                <div key={gen.id} className="group relative rounded-2xl overflow-hidden">
                  <img src={gen.image_url} alt="gen" className="w-full aspect-square object-cover" />
                  <button onClick={() => downloadImage(gen.image_url)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white hidden group-hover:flex items-center justify-center">
                    <Download size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
