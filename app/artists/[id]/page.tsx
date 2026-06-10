'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Upload, Edit2, Save, X, Plus, Play, Instagram,
  Youtube, Music, ExternalLink, Wand2, Image, Film, Users,
  MapPin, Phone, Mail, Star, TrendingUp, Check, Trash2
} from 'lucide-react'

interface Artist {
  id: string
  name: string
  genre: string
  bio: string
  cover_url: string
  instagram: string
  spotify: string
  youtube: string
  tiktok: string
  label: string
  manager: string
  booking: string
  monthly_listeners: number
  followers: number
  created_at: string
}

interface Media {
  id: string
  artist_id: string
  type: 'photo' | 'video' | 'clip'
  url: string
  thumbnail: string
  title: string
  created_at: string
}

interface Generation {
  id: string
  image_url: string
  prompt: string
  created_at: string
}

interface Project {
  id: string
  title: string
  status: string
  created_at: string
}

const GENRES = ['Trap', 'Drill', 'Afro', 'R&B', 'Pop', 'Rap FR', 'Dancehall', 'Amapiano', 'UK Drill']

export default function ArtistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const artistId = params.id as string

  const [artist, setArtist] = useState<Artist | null>(null)
  const [media, setMedia] = useState<Media[]>([])
  const [generations, setGenerations] = useState<Generation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'videos' | 'vizion' | 'projects'>('overview')
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [uploading, setUploading] = useState(false)

  // Edit form
  const [editData, setEditData] = useState<Partial<Artist>>({})

  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (artistId) loadAll()
  }, [artistId])

  async function loadAll() {
    setLoading(true)
    try {
      const [artistRes, mediaRes, genRes, projRes] = await Promise.all([
        supabase.from('artists').select('*').eq('id', artistId).single(),
        supabase.from('artist_media').select('*').eq('artist_id', artistId).order('created_at', { ascending: false }),
        supabase.from('artist_generations').select('*').eq('artist_id', artistId).order('created_at', { ascending: false }).limit(20),
        supabase.from('projects').select('*').eq('artist_id', artistId).order('created_at', { ascending: false }).limit(10),
      ])
      if (artistRes.data) setArtist(artistRes.data)
      setMedia(mediaRes.data || [])
      setGenerations(genRes.data || [])
      setProjects(projRes.data || [])
    } catch {}
    setLoading(false)
  }

  function startEdit() {
    setEditData({ ...artist })
    setEditing(true)
  }

  async function saveEdit() {
    if (!artist) return
    setSaving(true)
    const { data } = await supabase.from('artists').update(editData).eq('id', artistId).select().single()
    if (data) setArtist(data)
    setEditing(false)
    setSaving(false)
  }

  async function uploadCover(file: File) {
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      const base64 = ev.target?.result as string
      const buffer = Buffer.from(base64.split(',')[1], 'base64')
      const filename = `covers/${artistId}-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('artist-photos').upload(filename, buffer, { contentType: 'image/jpeg', upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('artist-photos').getPublicUrl(filename)
        await supabase.from('artists').update({ cover_url: data.publicUrl }).eq('id', artistId)
        setArtist(prev => prev ? { ...prev, cover_url: data.publicUrl } : prev)
      }
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  async function uploadMedia(file: File, type: 'photo' | 'video' | 'clip') {
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      const base64 = ev.target?.result as string
      const isVideo = type === 'video' || type === 'clip'
      const ext = isVideo ? 'mp4' : 'jpg'
      const contentType = isVideo ? 'video/mp4' : 'image/jpeg'
      const buffer = Buffer.from(base64.split(',')[1], 'base64')
      const filename = `media/${artistId}-${Date.now()}.${ext}`

      const { error } = await supabase.storage.from('artist-photos').upload(filename, buffer, { contentType, upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('artist-photos').getPublicUrl(filename)
        const { data: mediaData } = await supabase.from('artist_media').insert({
          artist_id: artistId,
          type,
          url: data.publicUrl,
          title: file.name.split('.')[0],
        }).select().single()
        if (mediaData) setMedia(prev => [mediaData, ...prev])
      }
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  async function deleteMedia(id: string) {
    await supabase.from('artist_media').delete().eq('id', id)
    setMedia(prev => prev.filter(m => m.id !== id))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!artist) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white/40">Artiste introuvable</p>
    </div>
  )

  const photos = media.filter(m => m.type === 'photo')
  const videos = media.filter(m => m.type === 'video' || m.type === 'clip')

  return (
    <div className="min-h-screen pb-24">
      {/* Cover Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        {artist.cover_url ? (
          <img src={artist.cover_url} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-900/50 via-black to-fuchsia-900/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Back button */}
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <ArrowLeft size={18} />
        </button>

        {/* Edit cover */}
        <button onClick={() => coverRef.current?.click()}
          className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md text-white/70 text-xs px-3 py-2 rounded-xl hover:bg-black/60 transition-colors">
          <Upload size={12} /> Cover
        </button>
        <input ref={coverRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} className="hidden" />

        {/* Artist info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-violet-500/30 border border-violet-500/40 text-violet-300 px-2.5 py-0.5 rounded-lg">
                  {artist.genre || 'Artiste'}
                </span>
                {artist.label && <span className="text-xs text-white/40">{artist.label}</span>}
              </div>
              <h1 className="font-display font-black text-3xl md:text-5xl text-white uppercase tracking-tight">
                {artist.name}
              </h1>
              {artist.monthly_listeners > 0 && (
                <p className="text-white/40 text-xs mt-1">
                  {artist.monthly_listeners.toLocaleString()} auditeurs mensuels
                </p>
              )}
            </div>
            <button onClick={editing ? saveEdit : startEdit}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${editing ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-white/10 border border-white/20 text-white/70'}`}>
              {saving ? <div className="w-4 h-4 border border-white/40 border-t-transparent rounded-full animate-spin" /> :
                editing ? <><Save size={14} /> Sauvegarder</> : <><Edit2 size={14} /> Modifier</>}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-4 mb-2">
          {[
            { id: 'overview', label: '📋 Profil' },
            { id: 'gallery', label: `📸 Photos (${photos.length})` },
            { id: 'videos', label: `🎬 Vidéos (${videos.length})` },
            { id: 'vizion', label: `✨ VIZION (${generations.length})` },
            { id: 'projects', label: `🎵 Projets (${projects.length})` },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`px-4 py-2 rounded-2xl text-sm font-medium flex-shrink-0 transition-all ${activeTab === id ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Bio */}
            <div className="glass-card rounded-3xl border border-white/8 p-5">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Biographie</p>
              {editing ? (
                <textarea
                  value={editData.bio || ''}
                  onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4} placeholder="Bio de l'artiste..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 resize-none text-sm" />
              ) : (
                <p className="text-white/70 text-sm leading-relaxed">
                  {artist.bio || <span className="text-white/20 italic">Pas de bio — clique sur Modifier</span>}
                </p>
              )}
            </div>

            {/* Genre + Label */}
            {editing && (
              <div className="glass-card rounded-3xl border border-white/8 p-5 space-y-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Genre</p>
                  <div className="flex flex-wrap gap-1.5">
                    {GENRES.map(g => (
                      <button key={g} onClick={() => setEditData(prev => ({ ...prev, genre: g }))}
                        className={`px-2.5 py-1 rounded-xl text-xs transition-all ${editData.genre === g ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'label', label: 'Label', icon: '🏷️' },
                    { key: 'manager', label: 'Manager', icon: '👤' },
                    { key: 'booking', label: 'Booking', icon: '📞' },
                    { key: 'monthly_listeners', label: 'Auditeurs/mois', icon: '🎵' },
                  ].map(({ key, label, icon }) => (
                    <div key={key}>
                      <p className="text-white/30 text-xs mb-1">{icon} {label}</p>
                      <input
                        value={(editData as any)[key] || ''}
                        onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Réseaux sociaux */}
            <div className="glass-card rounded-3xl border border-white/8 p-5">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Réseaux sociaux</p>
              {editing ? (
                <div className="space-y-2">
                  {[
                    { key: 'instagram', label: 'Instagram', placeholder: '@artiste' },
                    { key: 'spotify', label: 'Spotify', placeholder: 'URL ou ID artiste' },
                    { key: 'youtube', label: 'YouTube', placeholder: '@chaine' },
                    { key: 'tiktok', label: 'TikTok', placeholder: '@artiste' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-white/30 text-xs w-20">{label}</span>
                      <input
                        value={(editData as any)[key] || ''}
                        onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {artist.instagram && (
                    <a href={`https://instagram.com/${artist.instagram.replace('@', '')}`} target="_blank"
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/20 text-white/70 text-xs px-3 py-2 rounded-xl hover:opacity-80 transition-opacity">
                      <Instagram size={13} /> {artist.instagram}
                    </a>
                  )}
                  {artist.spotify && (
                    <a href={artist.spotify.startsWith('http') ? artist.spotify : `https://open.spotify.com/artist/${artist.spotify}`} target="_blank"
                      className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-2 rounded-xl hover:opacity-80 transition-opacity">
                      <Music size={13} /> Spotify
                    </a>
                  )}
                  {artist.youtube && (
                    <a href={`https://youtube.com/${artist.youtube}`} target="_blank"
                      className="flex items-center gap-2 bg-red-500/20 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl hover:opacity-80 transition-opacity">
                      <Youtube size={13} /> YouTube
                    </a>
                  )}
                  {artist.tiktok && (
                    <a href={`https://tiktok.com/${artist.tiktok}`} target="_blank"
                      className="flex items-center gap-2 bg-white/10 border border-white/15 text-white/60 text-xs px-3 py-2 rounded-xl hover:opacity-80 transition-opacity">
                      🎵 TikTok
                    </a>
                  )}
                  {!artist.instagram && !artist.spotify && !artist.youtube && !artist.tiktok && (
                    <p className="text-white/20 text-sm italic">Aucun réseau ajouté</p>
                  )}
                </div>
              )}
            </div>

            {/* Contacts */}
            {(artist.label || artist.manager || artist.booking) && (
              <div className="glass-card rounded-3xl border border-white/8 p-5">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Contacts pro</p>
                <div className="space-y-2">
                  {artist.label && <div className="flex items-center gap-3"><span className="text-white/30 text-xs w-20">Label</span><span className="text-white/70 text-sm">{artist.label}</span></div>}
                  {artist.manager && <div className="flex items-center gap-3"><span className="text-white/30 text-xs w-20">Manager</span><span className="text-white/70 text-sm">{artist.manager}</span></div>}
                  {artist.booking && <div className="flex items-center gap-3"><span className="text-white/30 text-xs w-20">Booking</span><span className="text-white/70 text-sm">{artist.booking}</span></div>}
                </div>
              </div>
            )}

            {editing && (
              <button onClick={saveEdit} disabled={saving}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold py-4 rounded-2xl disabled:opacity-40">
                {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
              </button>
            )}
          </div>
        )}

        {/* ── GALLERY ── */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            <button onClick={() => photoRef.current?.click()}
              className="w-full flex items-center gap-2 justify-center border-2 border-dashed border-white/15 rounded-2xl py-4 text-white/40 hover:border-white/30 hover:text-white/60 transition-colors">
              {uploading ? <div className="w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} /> Ajouter des photos</>}
            </button>
            <input ref={photoRef} type="file" accept="image/*" multiple
              onChange={async e => { for (const f of Array.from(e.target.files || [])) await uploadMedia(f, 'photo') }}
              className="hidden" />

            {photos.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center border border-white/8">
                <p className="text-3xl mb-2">📸</p>
                <p className="text-white/40 text-sm">Aucune photo — uploade les photos de l'artiste</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map(photo => (
                  <div key={photo.id} className="group relative rounded-2xl overflow-hidden aspect-square">
                    <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white/70 text-xs truncate flex-1">{photo.title}</p>
                      <button onClick={() => deleteMedia(photo.id)} className="text-red-400 ml-2">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIDEOS ── */}
        {activeTab === 'videos' && (
          <div className="space-y-4">
            <button onClick={() => videoRef.current?.click()}
              className="w-full flex items-center gap-2 justify-center border-2 border-dashed border-white/15 rounded-2xl py-4 text-white/40 hover:border-white/30 hover:text-white/60 transition-colors">
              {uploading ? <div className="w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} /> Ajouter des vidéos / clips</>}
            </button>
            <input ref={videoRef} type="file" accept="video/*,.mp4,.mov,.m4v"
              onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0], 'clip')}
              className="hidden" />

            {videos.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center border border-white/8">
                <p className="text-3xl mb-2">🎬</p>
                <p className="text-white/40 text-sm">Aucune vidéo — uploade des clips ou teasers</p>
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map(video => (
                  <div key={video.id} className="glass rounded-2xl border border-white/8 overflow-hidden">
                    <video src={video.url} controls className="w-full max-h-64 object-cover bg-black" />
                    <div className="p-3 flex items-center justify-between">
                      <p className="text-white/70 text-sm">{video.title || 'Vidéo'}</p>
                      <div className="flex gap-2">
                        <span className="text-xs text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-lg">{video.type}</span>
                        <button onClick={() => deleteMedia(video.id)} className="text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIZION IMAGES ── */}
        {activeTab === 'vizion' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white/40 text-xs uppercase tracking-wider">{generations.length} images générées</p>
              <button onClick={() => router.push('/artist-image')}
                className="flex items-center gap-1.5 text-xs bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 px-3 py-1.5 rounded-xl">
                <Wand2 size={11} /> Générer
              </button>
            </div>

            {generations.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center border border-white/8">
                <p className="text-3xl mb-2">✨</p>
                <p className="text-white/40 text-sm mb-3">Aucune image VIZION générée</p>
                <button onClick={() => router.push('/artist-image')}
                  className="bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs px-4 py-2 rounded-xl">
                  Générer des images
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {generations.map(gen => (
                  <div key={gen.id} className="group relative rounded-2xl overflow-hidden">
                    <img src={gen.image_url} alt="vizion" className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white/60 text-xs line-clamp-2">{gen.prompt?.slice(0, 60)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROJECTS ── */}
        {activeTab === 'projects' && (
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center border border-white/8">
                <p className="text-3xl mb-2">🎵</p>
                <p className="text-white/40 text-sm">Aucun projet lié à cet artiste</p>
              </div>
            ) : (
              projects.map(project => (
                <div key={project.id} className="glass rounded-2xl border border-white/8 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{project.title}</p>
                    <p className="text-white/30 text-xs mt-0.5">{new Date(project.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-xl ${
                    project.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                    project.status === 'completed' ? 'bg-violet-500/20 text-violet-400' :
                    'bg-white/10 text-white/40'
                  }`}>{project.status}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal image agrandie */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white">
            <X size={24} />
          </button>
          <img src={selectedMedia.url} alt={selectedMedia.title} className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  )
}
