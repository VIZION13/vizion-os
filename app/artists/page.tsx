'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Plus, X, ChevronDown, ChevronUp, Sparkles, Trash2, FolderOpen, Calendar, DollarSign, ExternalLink } from 'lucide-react'

interface Artist {
  id: string
  name: string
  avatar: string | null
  bio: string | null
  genre?: string
  created_at: string
}

interface Project {
  id: string
  artist_id: string
  title: string
  type: string
  status: string
  budget: number | null
  notes: string | null
  deadline: string | null
  created_at: string
}

const PROJECT_TYPES = ['Clip', 'Music', 'Event', 'Tournée', 'Promo', 'Autre']
const PROJECT_STATUS = ['En cours', 'Terminé', 'En pause', 'À venir']
const STATUS_COLORS: Record<string, string> = {
  'En cours':  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Terminé':   'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'En pause':  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'À venir':   'text-violet-400 bg-violet-500/10 border-violet-500/20',
}

export default function ArtistsPage() {
  const router = useRouter()
  const [artists, setArtists] = useState<Artist[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showArtistForm, setShowArtistForm] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Artist form
  const [name, setName] = useState('')
  const [genre, setGenre] = useState('')
  const [bio, setBio] = useState('')
  const [contact, setContact] = useState('')

  // Project form
  const [pTitle, setPTitle] = useState('')
  const [pType, setPType] = useState('Clip')
  const [pStatus, setPStatus] = useState('En cours')
  const [pBudget, setPBudget] = useState('')
  const [pDeadline, setPDeadline] = useState('')
  const [pNotes, setPNotes] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('artists').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
    ])
    setArtists(a || [])
    setProjects(p || [])
  }

  async function saveArtist() {
    if (!name) return
    setSaving(true)
    await supabase.from('artists').insert({ name, bio, genre })
    await loadAll()
    setName(''); setBio(''); setGenre(''); setContact('')
    setShowArtistForm(false)
    setSaving(false)
  }

  async function deleteArtist(id: string) {
    if (!confirm('Supprimer cet artiste ?')) return
    await supabase.from('artists').delete().eq('id', id)
    setArtists(prev => prev.filter(a => a.id !== id))
  }

  async function saveProject(artistId: string) {
    if (!pTitle) return
    setSaving(true)
    await supabase.from('projects').insert({
      artist_id: artistId, title: pTitle, type: pType, status: pStatus,
      budget: pBudget ? parseFloat(pBudget) : null,
      deadline: pDeadline || null, notes: pNotes,
    })
    await loadAll()
    setPTitle(''); setPType('Clip'); setPStatus('En cours')
    setPBudget(''); setPDeadline(''); setPNotes('')
    setShowProjectForm(null)
    setSaving(false)
  }

  async function generateBio(artistName: string, artistId: string) {
    setGenerating(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'artists',
        messages: [{ role: 'user', content: `Génère une courte bio professionnelle (3-4 phrases) pour l'artiste "${artistName}". Style urbain, moderne. Réponds directement avec la bio, sans titre.` }]
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
    await supabase.from('artists').update({ bio: full.trim() }).eq('id', artistId)
    setArtists(prev => prev.map(a => a.id === artistId ? { ...a, bio: full.trim() } : a))
    setGenerating(false)
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-500 flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl md:text-3xl text-white">ARTISTS</h1>
            <p className="text-white/40 text-xs">{artists.length} artiste{artists.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowArtistForm(true)}
          className="flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 text-sky-300 text-sm font-medium px-4 py-2.5 rounded-2xl hover:bg-sky-500/30 transition-colors">
          <Plus size={15} /> Artiste
        </button>
      </div>

      {/* New artist form */}
      {showArtistForm && (
        <div className="glass-card rounded-3xl border border-sky-500/20 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sky-400 font-bold text-sm">Nouvel artiste</p>
            <button onClick={() => setShowArtistForm(false)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
          </div>
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de l'artiste *"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50" />
            <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="Genre (Trap, R&B, Afro...)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50" />
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio (optionnel)" rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 resize-none" />
            <button onClick={saveArtist} disabled={saving || !name}
              className="w-full bg-gradient-to-r from-sky-600 to-blue-500 text-white font-bold py-3 rounded-2xl disabled:opacity-40">
              {saving ? 'Création...' : 'Créer l\'artiste'}
            </button>
          </div>
        </div>
      )}

      {/* Artists list */}
      <div className="space-y-3">
        {artists.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center border border-white/8">
            <p className="text-3xl mb-2">👤</p>
            <p className="text-white/40 text-sm">Aucun artiste — crée ton premier artiste</p>
          </div>
        )}

        {artists.map(artist => {
          const artistProjects = projects.filter(p => p.artist_id === artist.id)
          const isExpanded = expanded === artist.id

          return (
            <div key={artist.id} className="glass-card rounded-3xl border border-white/8 overflow-hidden">
              {/* Artist header */}
              <div className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">{artist.name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{artist.name}</p>
                  <div className="flex items-center gap-2">
                    {artist.genre && <span className="text-sky-400 text-xs">{artist.genre}</span>}
                    <span className="text-white/30 text-xs">{artistProjects.length} projet{artistProjects.length > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Bouton fiche détaillée */}
                  <button onClick={() => router.push(`/artists/${artist.id}`)}
                    className="flex items-center gap-1.5 bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs px-3 py-1.5 rounded-xl hover:bg-sky-500/30 transition-colors">
                    <ExternalLink size={11} /> Fiche
                  </button>
                  <button onClick={() => setExpanded(isExpanded ? null : artist.id)}
                    className="text-white/30 hover:text-white/60 transition-colors p-1">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button onClick={() => deleteArtist(artist.id)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-white/8 p-4">
                  {/* Bio */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/40 text-xs uppercase tracking-wider">Bio</p>
                      <button onClick={() => generateBio(artist.name, artist.id)} disabled={generating}
                        className="flex items-center gap-1 text-xs text-violet-400 disabled:opacity-40">
                        <Sparkles size={11} /> {generating ? 'IA...' : 'Générer'}
                      </button>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {artist.bio || <span className="text-white/20 italic">Pas de bio</span>}
                    </p>
                  </div>

                  {/* Projects */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/40 text-xs uppercase tracking-wider">Projets ({artistProjects.length})</p>
                      <button onClick={() => setShowProjectForm(artist.id)}
                        className="flex items-center gap-1 text-xs text-sky-400">
                        <Plus size={11} /> Ajouter
                      </button>
                    </div>

                    {showProjectForm === artist.id && (
                      <div className="bg-white/3 rounded-2xl p-3 mb-3 space-y-2">
                        <input value={pTitle} onChange={e => setPTitle(e.target.value)} placeholder="Titre du projet *"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-500/50" />
                        <div className="grid grid-cols-2 gap-2">
                          <select value={pType} onChange={e => setPType(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                            {PROJECT_TYPES.map(t => <option key={t} value={t} className="bg-black">{t}</option>)}
                          </select>
                          <select value={pStatus} onChange={e => setPStatus(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                            {PROJECT_STATUS.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={pBudget} onChange={e => setPBudget(e.target.value)} placeholder="Budget €" type="number"
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none" />
                          <input value={pDeadline} onChange={e => setPDeadline(e.target.value)} type="date"
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none" />
                        </div>
                        <textarea value={pNotes} onChange={e => setPNotes(e.target.value)} placeholder="Notes..." rows={2}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => saveProject(artist.id)} disabled={saving || !pTitle}
                            className="flex-1 bg-sky-500/20 border border-sky-500/30 text-sky-300 text-sm py-2 rounded-xl disabled:opacity-40">
                            {saving ? 'Ajout...' : 'Ajouter le projet'}
                          </button>
                          <button onClick={() => setShowProjectForm(null)}
                            className="px-3 py-2 rounded-xl bg-white/5 text-white/40 text-sm">
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {artistProjects.map(project => (
                        <div key={project.id} className="flex items-center gap-2 bg-white/3 rounded-xl p-2.5">
                          <FolderOpen size={13} className="text-white/30 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 text-xs font-medium truncate">{project.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-white/30 text-[10px]">{project.type}</span>
                              {project.deadline && <span className="text-white/20 text-[10px]">· {new Date(project.deadline).toLocaleDateString('fr-FR')}</span>}
                              {project.budget && <span className="text-white/20 text-[10px]">· {project.budget}€</span>}
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${STATUS_COLORS[project.status] || 'text-white/40 bg-white/5 border-white/10'}`}>
                            {project.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
