'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Download, Wand2, Check, Trash2, Plus, Sparkles, ChevronDown, ChevronUp, User, Image } from 'lucide-react'

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
  { label: 'ARRI Super 35', value: 'shot on ARRI Alexa Mini LF, Super 35mm sensor, ARRI Signature Prime lens' },
  { label: 'RED Dragon 6K', value: 'shot on RED Dragon 6K cinema camera, cinema lens' },
  { label: 'Sony Venice', value: 'shot on Sony Venice 2, full frame, Zeiss Supreme Prime' },
  { label: '35mm Film', value: 'shot on 35mm Kodak Vision3 film, analog grain' },
  { label: 'Medium Format', value: 'shot on Hasselblad X2D, medium format, extreme detail' },
]

const LENS_PRESETS = [
  { label: '24mm', value: '24mm wide angle lens, environmental context' },
  { label: '35mm', value: '35mm lens, natural perspective' },
  { label: '50mm', value: '50mm standard lens' },
  { label: '85mm Portrait', value: '85mm portrait lens, beautiful bokeh' },
  { label: '135mm', value: '135mm telephoto, compressed perspective' },
  { label: 'Anamorphic', value: 'anamorphic lens, oval bokeh, horizontal lens flares' },
]

const LIGHTING_PRESETS = [
  { label: 'ARRI Studio', value: 'ARRI professional lighting, key light, rim light, bounce fill, skin glow' },
  { label: 'Golden Hour', value: 'golden hour sunlight, warm tones, long shadows' },
  { label: 'Blue Hour', value: 'blue hour twilight, ambient city glow' },
  { label: 'Neon Night', value: 'neon lights, urban night, colored reflections' },
  { label: 'Dramatic', value: 'dramatic side lighting, chiaroscuro, deep shadows' },
  { label: 'Soft Studio', value: 'large softbox, diffused beauty lighting' },
]

const COLOR_GRADES = [
  { label: 'Teal & Orange', value: 'teal and orange color grade, blockbuster look' },
  { label: 'Kodak Vision3', value: 'Kodak Vision3 color science, warm shadows, rich midtones' },
  { label: 'Fuji Pro 400H', value: 'Fuji Pro 400H, pastel palette, elegant tones' },
  { label: 'Desaturated', value: 'desaturated cinematic grade, muted tones' },
  { label: 'Cold Blue', value: 'cold blue grade, steel tones, modern' },
  { label: 'Moody Dark', value: 'moody dark grade, deep blacks, atmospheric' },
]

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:5', value: '4:5' },
]

const GENRES = ['Trap', 'Drill', 'Afro', 'R&B', 'Pop', 'Rap FR', 'Dancehall']

export default function ArtistImagePage() {
  const [profiles, setProfiles] = useState<ArtistProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<ArtistProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // New profile form
  const [newName, setNewName] = useState('')
  const [newGenre, setNewGenre] = useState('Trap')
  const [newStyle, setNewStyle] = useState('')
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Generation settings
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
    await fetch('/api/artist-profiles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setProfiles(prev => prev.filter(p => p.id !== id))
    if (selectedProfile?.id === id) setSelectedProfile(null)
  }

  async function enhancePrompt() {
    if (!prompt || !selectedProfile) return
    setEnhancing(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'clip',
        messages: [{
          role: 'user',
          content: `Améliore ce prompt pour générer une image photoréaliste cohérente d'un artiste ${selectedProfile.genre} :
"${prompt}"
Réponds UNIQUEMENT avec le prompt amélioré en anglais, max 150 mots. Focus sur le décor et l'ambiance, pas sur le visage.`
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
    if (!selectedProfile || !prompt) return
    setLoading(true); setError(null); setGeneratedUrl(null)
    try {
      const res = await fetch('/api/face-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: selectedProfile.id,
          referenceUrl: selectedProfile.reference_url,
          prompt,
          camera,
          lens,
          lighting,
          colorGrade,
          aspectRatio,
          addCinematic,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGeneratedUrl(data.url)
      // Refresh profile to get new generation in history
      await loadProfiles()
      const updated = profiles.find(p => p.id === selectedProfile.id)
      if (updated) setSelectedProfile(updated)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  async function downloadImage(url: string, name = 'vizion-artist.jpg') {
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
          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${value === o.value ? 'bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center flex-shrink-0">
          <User size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">ARTIST IMAGE</h1>
          <p className="text-white/40 text-xs">Cohérence visage · InstantID · ARRI Cinema</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 text-red-400 text-sm flex items-center justify-between">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── ARTIST PROFILES ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Profils artistes</p>
          <button onClick={() => setShowNewProfile(!showNewProfile)}
            className="flex items-center gap-1.5 text-xs bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 px-3 py-1.5 rounded-xl hover:bg-fuchsia-500/30 transition-colors">
            <Plus size={12} /> Nouveau profil
          </button>
        </div>

        {/* New profile form */}
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
                placeholder="Style visuel (ex: dark luxury, streetwear...)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 text-sm" />

              {/* Photo upload */}
              <div>
                <p className="text-white/40 text-xs mb-2">Photo de référence * (visage clair, bonne qualité)</p>
                <div onClick={() => photoRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${newPhotoPreview ? 'border-fuchsia-500/40' : 'border-white/15 hover:border-white/30'}`}>
                  {newPhotoPreview ? (
                    <div className="flex items-center gap-3">
                      <img src={newPhotoPreview} alt="preview" className="w-16 h-16 rounded-xl object-cover" />
                      <p className="text-emerald-400 text-sm">{newPhoto?.name}</p>
                    </div>
                  ) : (
                    <div>
                      <Upload size={18} className="text-white/30 mx-auto mb-1" />
                      <p className="text-white/50 text-sm">Upload la photo de référence</p>
                      <p className="text-white/25 text-xs">Photo portrait, visage bien visible</p>
                    </div>
                  )}
                </div>
                <input ref={photoRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp" onChange={handlePhotoSelect} className="hidden" />
              </div>

              <div className="flex gap-2">
                <button onClick={saveProfile} disabled={savingProfile || !newName || !newPhoto}
                  className="flex-1 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-bold py-3 rounded-2xl disabled:opacity-40">
                  {savingProfile ? 'Sauvegarde...' : 'Créer le profil'}
                </button>
                <button onClick={() => setShowNewProfile(false)}
                  className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-sm">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profiles grid */}
        {loadingProfiles ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1,2,3].map(i => <div key={i} className="w-24 h-28 rounded-2xl bg-white/5 animate-pulse flex-shrink-0" />)}
          </div>
        ) : profiles.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center border border-white/8">
            <p className="text-4xl mb-2">👤</p>
            <p className="text-white/40 text-sm">Aucun profil — crée ton premier artiste</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {profiles.map(profile => (
              <button key={profile.id}
                onClick={() => setSelectedProfile(selectedProfile?.id === profile.id ? null : profile)}
                className={`flex-shrink-0 w-24 rounded-2xl overflow-hidden border-2 transition-all ${selectedProfile?.id === profile.id ? 'border-fuchsia-500 scale-105' : 'border-white/10 hover:border-white/30'}`}>
                {profile.reference_url ? (
                  <img src={profile.reference_url} alt={profile.name} className="w-full h-20 object-cover" />
                ) : (
                  <div className="w-full h-20 bg-white/10 flex items-center justify-center">
                    <User size={24} className="text-white/30" />
                  </div>
                )}
                <div className="bg-black/40 p-1.5">
                  <p className="text-white text-xs font-medium truncate">{profile.name}</p>
                  <p className="text-white/30 text-[10px]">{profile.genre}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── GENERATION PANEL ── */}
      {selectedProfile && (
        <div className="space-y-4">
          {/* Selected artist info */}
          <div className="glass-card rounded-3xl border border-fuchsia-500/20 p-4">
            <div className="flex items-center gap-3">
              {selectedProfile.reference_url && (
                <img src={selectedProfile.reference_url} alt={selectedProfile.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-fuchsia-500/40" />
              )}
              <div className="flex-1">
                <p className="text-white font-bold">{selectedProfile.name}</p>
                <p className="text-fuchsia-400 text-xs">{selectedProfile.genre}</p>
                {selectedProfile.style && <p className="text-white/30 text-xs">{selectedProfile.style}</p>}
              </div>
              <button onClick={() => deleteProfile(selectedProfile.id)}
                className="text-white/20 hover:text-red-400 transition-colors p-2">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Generation settings */}
          <div className="glass-card rounded-3xl border border-violet-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 size={16} className="text-violet-400" />
              <p className="text-violet-400 font-bold text-sm">GÉNÉRER AVEC CE VISAGE</p>
            </div>

            {/* Cinematic toggle */}
            <div className="flex items-center justify-between mb-4 bg-white/3 rounded-2xl p-3 border border-white/8">
              <div>
                <p className="text-white/70 text-sm font-medium">🎬 Mode Cinématique ARRI</p>
                <p className="text-white/30 text-xs">Super 35, RAW, Signature Prime</p>
              </div>
              <button onClick={() => setAddCinematic(!addCinematic)}
                className={`w-12 h-6 rounded-full transition-all flex-shrink-0 ${addCinematic ? 'bg-fuchsia-500' : 'bg-white/20'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow mx-0.5 transition-all ${addCinematic ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Scene description */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">Décris la scène *</p>
                <button onClick={enhancePrompt} disabled={enhancing || !prompt}
                  className="flex items-center gap-1.5 text-xs text-violet-400 disabled:opacity-40">
                  <Sparkles size={11} />
                  {enhancing ? 'IA...' : 'Améliorer'}
                </button>
              </div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2}
                placeholder={`ex: ${selectedProfile.name} sur un rooftop de Marseille au coucher du soleil, costume 4 pièces noir...`}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 resize-none text-sm" />
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

            {/* Aspect ratio */}
            <div className="mb-5">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Format</p>
              <div className="flex gap-2">
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
              {loading ? 'Génération InstantID (~40s)...' : `Générer avec le visage de ${selectedProfile.name}`}
            </button>

            {loading && (
              <div className="mt-4 text-center">
                <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-white/40 text-sm">InstantID génère l'image avec cohérence visage...</p>
                <p className="text-white/20 text-xs mt-1">Environ 40 secondes</p>
              </div>
            )}
          </div>

          {/* Result */}
          {generatedUrl && (
            <div className="glass rounded-2xl border border-fuchsia-500/20 overflow-hidden">
              <img src={generatedUrl} alt="generated" className="w-full object-cover" />
              <div className="p-3 flex gap-2">
                <button onClick={() => downloadImage(generatedUrl, `vizion-${selectedProfile.name}-${Date.now()}.jpg`)}
                  className="flex-1 flex items-center gap-2 justify-center bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-sm py-2.5 rounded-xl">
                  <Download size={14} /> Télécharger
                </button>
              </div>
            </div>
          )}

          {/* History */}
          {selectedProfile.artist_generations && selectedProfile.artist_generations.length > 0 && (
            <div>
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider mb-3 hover:text-white/60 transition-colors">
                {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                Historique ({selectedProfile.artist_generations.length} images)
              </button>
              {showHistory && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedProfile.artist_generations.map(gen => (
                    <div key={gen.id} className="group relative rounded-2xl overflow-hidden">
                      <img src={gen.image_url} alt="gen" className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <p className="text-white/70 text-xs line-clamp-2">{gen.prompt?.slice(0, 60)}...</p>
                      </div>
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
      )}

      {!selectedProfile && !showNewProfile && profiles.length > 0 && (
        <div className="glass rounded-2xl p-8 text-center border border-white/8">
          <p className="text-3xl mb-2">👆</p>
          <p className="text-white/40 text-sm">Sélectionne un profil artiste pour générer</p>
        </div>
      )}
    </div>
  )
}
