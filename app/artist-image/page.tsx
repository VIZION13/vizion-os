'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Download, Wand2, Check, Trash2, Plus, Sparkles, ChevronDown, ChevronUp, User, X, Image } from 'lucide-react'

interface ArtistProfile {
  id: string
  name: string
  reference_url: string
  style: string
  genre: string
  created_at: string
  artist_generations?: { id: string; image_url: string; prompt: string; created_at: string }[]
}

const KLING_STYLES = [
  { label: 'Auto', value: '' },
  { label: 'Réaliste', value: 'realistic' },
  { label: 'Cinématique', value: 'cinematic' },
  { label: 'Artistique', value: 'artistic' },
]

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
]

const CAMERA_PRESETS = [
  { label: 'ARRI Super 35', value: 'shot on ARRI Alexa, Super 35mm, Signature Prime lens, RAW' },
  { label: 'Cinématique', value: 'cinematic photography, shallow depth of field, film grain' },
  { label: 'Editorial', value: 'fashion editorial, luxury magazine, professional studio' },
  { label: 'Golden Hour', value: 'golden hour, warm sunlight, cinematic lighting' },
  { label: 'Studio Pro', value: 'professional studio, three-point lighting, seamless backdrop' },
  { label: 'Urban Night', value: 'urban night, neon lights, bokeh, city atmosphere' },
]

const GENRES = ['Trap', 'Drill', 'Afro', 'R&B', 'Pop', 'Rap FR', 'Dancehall']

const REF_LABELS = [
  { label: 'Visage', icon: '👤', tip: 'Photo portrait claire du visage' },
  { label: 'Tenue', icon: '👗', tip: 'Photo de la tenue/vêtements' },
  { label: 'Lieu', icon: '🏙️', tip: 'Photo du décor/lieu' },
  { label: 'Style', icon: '🎨', tip: 'Photo du style visuel voulu' },
  { label: 'Pose', icon: '🕴️', tip: 'Photo de la pose voulue' },
  { label: 'Ambiance', icon: '🌆', tip: 'Photo de l\'ambiance' },
  { label: 'Lumière', icon: '💡', tip: 'Photo de la lumière voulue' },
  { label: 'Couleurs', icon: '🎭', tip: 'Photo des couleurs' },
  { label: 'Accessoires', icon: '💎', tip: 'Photo des accessoires' },
  { label: 'Bonus', icon: '⭐', tip: 'Image de référence bonus' },
]

export default function ArtistImagePage() {
  const [profiles, setProfiles] = useState<ArtistProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<ArtistProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')

  // New profile
  const [newName, setNewName] = useState('')
  const [newGenre, setNewGenre] = useState('Trap')
  const [newStyle, setNewStyle] = useState('')
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Generation
  const [prompt, setPrompt] = useState('')
  const [refImages, setRefImages] = useState<(string | null)[]>(Array(10).fill(null))
  const [refImageNames, setRefImageNames] = useState<(string | null)[]>(Array(10).fill(null))
  const [klingStyle, setKlingStyle] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [camera, setCamera] = useState(CAMERA_PRESETS[0].value)
  const [enhancing, setEnhancing] = useState(false)

  const photoRef = useRef<HTMLInputElement>(null)
  const refRefs = useRef<(HTMLInputElement | null)[]>(Array(10).fill(null))

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

  function handleRefImage(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const newRefs = [...refImages]
      const newNames = [...refImageNames]
      newRefs[idx] = ev.target?.result as string
      newNames[idx] = file.name
      setRefImages(newRefs)
      setRefImageNames(newNames)
    }
    reader.readAsDataURL(file)
  }

  function removeRefImage(idx: number) {
    const newRefs = [...refImages]
    const newNames = [...refImageNames]
    newRefs[idx] = null
    newNames[idx] = null
    setRefImages(newRefs)
    setRefImageNames(newNames)
  }

  // Auto-add profile photo as first reference
  useEffect(() => {
    if (selectedProfile?.reference_url) {
      const newRefs = [...refImages]
      newRefs[0] = selectedProfile.reference_url
      setRefImages(newRefs)
      const newNames = [...refImageNames]
      newNames[0] = selectedProfile.name
      setRefImageNames(newNames)
    }
  }, [selectedProfile])

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
          content: `Améliore ce prompt pour Kling Image 3.0 — photoréalisme cinématique :
"${prompt}"
Réponds UNIQUEMENT avec le prompt amélioré en français et anglais mélangés, max 150 mots.`
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
    if (!prompt && refImages.filter(Boolean).length === 0) return
    setLoading(true); setError(null); setGeneratedUrls([])
    setLoadingStep('🎨 Kling Image 3.0 génère...')

    try {
      // Build final prompt with camera preset
      const finalPrompt = camera ? `${prompt}, ${camera}` : prompt

      // Get non-null reference images
      const validRefs = refImages.filter(Boolean) as string[]

      const res = await fetch('/api/kling-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          referenceImages: validRefs,
          artistId: selectedProfile?.id,
          style: klingStyle,
          aspectRatio,
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.urls) setGeneratedUrls(data.urls)
      await loadProfiles()
    } catch (e: any) {
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

  const activeRefs = refImages.filter(Boolean).length

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center flex-shrink-0">
          <User size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">ARTIST IMAGE</h1>
          <p className="text-white/40 text-xs">Kling Image 3.0 · Multi-référence · 2K HD</p>
        </div>
      </div>

      {/* Workflow */}
      <div className="glass-card rounded-2xl border border-white/8 p-3 mb-6">
        <div className="flex items-center gap-2 text-xs text-white/50 flex-wrap">
          <span className="bg-fuchsia-500/20 text-fuchsia-300 px-2.5 py-1 rounded-lg">Jusqu'à 10 photos</span>
          <span>→</span>
          <span className="bg-violet-500/20 text-violet-300 px-2.5 py-1 rounded-lg">Kling Image 3.0</span>
          <span>→</span>
          <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg">2K HD</span>
          <span>→</span>
          <span className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg">Kling Video</span>
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
                    <p className="text-emerald-400 text-sm">Photo chargée ✓</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={18} className="text-white/30 mx-auto mb-1" />
                    <p className="text-white/50 text-sm">Photo portrait de référence</p>
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

      {/* Generation panel */}
      <div className="space-y-4">
        {/* Reference Images Grid — jusqu'à 10 */}
        <div className="glass-card rounded-3xl border border-indigo-500/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image size={16} className="text-indigo-400" />
              <p className="text-indigo-400 font-bold text-sm">IMAGES DE RÉFÉRENCE</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${activeRefs > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-white/30'}`}>
              {activeRefs}/10
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {REF_LABELS.map((ref, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div
                  onClick={() => !refImages[idx] && refRefs.current[idx]?.click()}
                  className={`aspect-square rounded-2xl border-2 overflow-hidden relative cursor-pointer transition-all ${
                    refImages[idx]
                      ? 'border-indigo-500/50'
                      : 'border-dashed border-white/15 hover:border-white/30 flex items-center justify-center bg-white/3'
                  }`}>
                  {refImages[idx] ? (
                    <>
                      <img src={refImages[idx]!} alt={ref.label} className="w-full h-full object-cover" />
                      <button
                        onClick={e => { e.stopPropagation(); removeRefImage(idx) }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-1">
                      <p className="text-lg">{ref.icon}</p>
                    </div>
                  )}
                </div>
                <p className={`text-[10px] text-center truncate ${refImages[idx] ? 'text-indigo-400' : 'text-white/25'}`}>
                  {ref.label}
                </p>
                <input
                  ref={el => { refRefs.current[idx] = el }}
                  type="file" accept="image/*"
                  onChange={e => handleRefImage(idx, e)}
                  className="hidden" />
              </div>
            ))}
          </div>

          <p className="text-white/20 text-xs mt-3 text-center">
            👤 Visage · 👗 Tenue · 🏙️ Lieu · + jusqu'à 10 références
          </p>
        </div>

        {/* Prompt + Settings */}
        <div className="glass-card rounded-3xl border border-violet-500/20 p-5">
          {/* Prompt */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/40 text-xs uppercase tracking-wider">Prompt *</p>
              <button onClick={enhancePrompt} disabled={enhancing || !prompt}
                className="flex items-center gap-1.5 text-xs text-violet-400 disabled:opacity-40">
                <Sparkles size={11} />
                {enhancing ? 'IA...' : 'Améliorer'}
              </button>
            </div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
              placeholder="ex: image 1 habillé comme image 2 dans une salle de pole danse dans l'ambiance de image 3, cinématique, ARRI..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 resize-none text-sm" />
          </div>

          {/* Camera */}
          <div className="mb-3">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Style caméra</p>
            <div className="flex flex-wrap gap-1.5">
              {CAMERA_PRESETS.map(c => (
                <button key={c.value} onClick={() => setCamera(c.value)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${camera === c.value ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style Kling */}
          <div className="mb-3">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Style Kling</p>
            <div className="flex gap-2">
              {KLING_STYLES.map(s => (
                <button key={s.value} onClick={() => setKlingStyle(s.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${klingStyle === s.value ? 'bg-indigo-500/30 border border-indigo-500/50 text-indigo-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio */}
          <div className="mb-5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Format</p>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map(r => (
                <button key={r.value} onClick={() => setAspectRatio(r.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${aspectRatio === r.value ? 'bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={loading || (!prompt && activeRefs === 0)}
            className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-bold px-6 py-4 rounded-2xl disabled:opacity-40 hover:opacity-90 transition-opacity">
            <Wand2 size={18} />
            {loading ? loadingStep || 'Génération...' : `Générer avec Kling Image 3.0 (${activeRefs} photo${activeRefs > 1 ? 's' : ''})`}
          </button>

          {loading && (
            <div className="mt-4">
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 rounded-full animate-pulse" style={{width:'60%'}} />
              </div>
              <p className="text-white/30 text-xs text-center mt-2">Kling Image 3.0 · 2K HD · ~1-2 minutes</p>
            </div>
          )}
        </div>

        {/* Results */}
        {generatedUrls.length > 0 && (
          <div className="space-y-3">
            <p className="text-white/40 text-xs uppercase tracking-wider">{generatedUrls.length} image{generatedUrls.length > 1 ? 's' : ''} générée{generatedUrls.length > 1 ? 's' : ''}</p>
            {generatedUrls.map((url, i) => (
              <div key={i} className="glass rounded-2xl border border-fuchsia-500/20 overflow-hidden">
                <img src={url} alt={`result-${i}`} className="w-full object-cover" />
                <div className="p-3 flex gap-2">
                  <button onClick={() => downloadImage(url, `vizion-artist-${Date.now()}.jpg`)}
                    className="flex-1 flex items-center gap-2 justify-center bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-sm py-2.5 rounded-xl hover:bg-fuchsia-500/30 transition-colors">
                    <Download size={14} /> Télécharger
                  </button>
                  <button onClick={() => {
                    // Send to Kling video
                    window.open(`https://klingai.com`, '_blank')
                  }}
                    className="flex items-center gap-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs px-4 py-2.5 rounded-xl hover:bg-violet-500/30 transition-colors">
                    🎬 Animer
                  </button>
                </div>
              </div>
            ))}
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
    </div>
  )
}
