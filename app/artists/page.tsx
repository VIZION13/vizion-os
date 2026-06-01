'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Plus, X, ChevronDown, ChevronUp, Sparkles, Trash2, FolderOpen, Calendar, DollarSign } from 'lucide-react'

interface Artist {
  id: string
  name: string
  avatar: string | null
  bio: string | null
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
  const [projTitle, setProjTitle] = useState('')
  const [projType, setProjType] = useState('Clip')
  const [projStatus, setProjStatus] = useState('En cours')
  const [projBudget, setProjBudget] = useState('')
  const [projNotes, setProjNotes] = useState('')
  const [projDeadline, setProjDeadline] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [a, p] = await Promise.all([
      supabase.from('artists').select('*').order('created_at', { ascending: false }),
      supabase.from('artist_projects').select('*').order('created_at', { ascending: false }),
    ])
    setArtists(a.data ?? [])
    setProjects(p.data ?? [])
  }

  async function saveArtist() {
    if (!name) return
    setSaving(true)
    const bioFull = [genre ? `[${genre}]` : '', bio, contact ? `📞 ${contact}` : ''].filter(Boolean).join(' — ')
    const { error } = await supabase.from('artists').insert({ name, bio: bioFull || null, avatar: null })
    if (!error) {
      await loadAll()
      setShowArtistForm(false)
      setName(''); setGenre(''); setBio(''); setContact('')
    }
    setSaving(false)
  }

  async function removeArtist(id: string) {
    await supabase.from('artists').delete().eq('id', id)
    setArtists(artists.filter(a => a.id !== id))
    setProjects(projects.filter(p => p.artist_id !== id))
  }

  async function saveProject(artistId: string) {
    if (!projTitle) return
    setSaving(true)
    const { data, error } = await supabase.from('artist_projects').insert({
      artist_id: artistId,
      title: projTitle,
      type: projType,
      status: projStatus,
      budget: projBudget ? parseFloat(projBudget) : null,
      notes: projNotes || null,
      deadline: projDeadline || null,
    }).select().single()
    if (!error && data) {
      setProjects([data, ...projects])
      setShowProjectForm(null)
      setProjTitle(''); setProjType('Clip'); setProjStatus('En cours')
      setProjBudget(''); setProjNotes(''); setProjDeadline('')
    }
    setSaving(false)
  }

  async function removeProject(id: string) {
    await supabase.from('artist_projects').delete().eq('id', id)
    setProjects(projects.filter(p => p.id !== id))
  }

  async function updateProjectStatus(id: string, status: string) {
    await supabase.from('artist_projects').update({ status }).eq('id', id)
    setProjects(projects.map(p => p.id === id ? { ...p, status } : p))
  }

  async function generateBio() {
    if (!name) return
    setGenerating(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'vizion',
        messages: [{ role: 'user', content: `Écris une bio artistique courte (3 phrases max) pour ${name}${genre ? `, artiste ${genre}` : ''}. Percutant, professionnel.` }]
      })
    })
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((l: string) => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') break
        try { full += JSON.parse(data).text } catch {}
      }
    }
    setBio(full)
    setGenerating(false)
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl md:text-3xl text-white">ARTISTS</h1>
            <p className="text-white/40 text-xs">{artists.length} artiste{artists.length > 1 ? 's' : ''} — {projects.length} projet{projects.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowArtistForm(!showArtistForm)}
          className="flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 text-sky-400 font-medium px-3 py-2 rounded-2xl hover:bg-sky-500/30 transition-colors text-sm flex-shrink-0">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {/* Artist form */}
      {showArtistForm && (
        <div className="glass-card rounded-3xl border border-sky-500/20 p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">Nouvel artiste</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Nom *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Niska"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors" />
            </div>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Genre</label>
              <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="ex: Trap FR"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors" />
            </div>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/50 text-xs uppercase tracking-wider">Bio</label>
              <button onClick={generateBio} disabled={generating || !name}
                className="flex items-center gap-1.5 text-xs text-sky-400 disabled:opacity-40">
                <Sparkles size={11} />
                {generating ? 'Génération...' : 'IA'}
              </button>
            </div>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="Bio..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors resize-none" />
          </div>
          <div className="mb-4">
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Contact</label>
            <input value={contact} onChange={e => setContact(e.target.value)} placeholder="email / instagram / tél"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors" />
          </div>
          <div className="flex gap-3">
            <button onClick={saveArtist} disabled={!name || saving}
              className="bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-2xl disabled:opacity-40 hover:bg-sky-500 transition-colors text-sm">
              {saving ? 'Sauvegarde...' : 'Ajouter'}
            </button>
            <button onClick={() => setShowArtistForm(false)} className="text-white/40 text-sm px-4">Annuler</button>
          </div>
        </div>
      )}

      {/* Artists list */}
      {artists.length === 0 && !showArtistForm && (
        <div className="glass rounded-3xl border border-white/8 p-12 text-center">
          <Users size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Aucun artiste — ajoute ton premier</p>
        </div>
      )}

      <div className="space-y-3">
        {artists.map(artist => {
          const artistProjects = projects.filter(p => p.artist_id === artist.id)
          const isExpanded = expanded === artist.id

          return (
            <div key={artist.id} className="glass-card rounded-3xl border border-white/8 overflow-hidden">
              {/* Artist header */}
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">{artist.name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{artist.name}</p>
                    <p className="text-white/40 text-xs truncate">{artist.bio || 'Pas de bio'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-white/30 text-xs">{artistProjects.length} projet{artistProjects.length > 1 ? 's' : ''}</span>
                    <button onClick={() => setExpanded(isExpanded ? null : artist.id)} className="text-white/30 hover:text-white/60 transition-colors">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => removeArtist(artist.id)} className="text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Projects */}
              {isExpanded && (
                <div className="border-t border-white/8 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/40 text-xs uppercase tracking-wider">Projets</p>
                    <button onClick={() => setShowProjectForm(showProjectForm === artist.id ? null : artist.id)}
                      className="flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl hover:bg-sky-500/20 transition-colors">
                      <Plus size={11} /> Nouveau projet
                    </button>
                  </div>

                  {/* Project form */}
                  {showProjectForm === artist.id && (
                    <div className="bg-white/3 rounded-2xl border border-white/8 p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Titre *</label>
                          <input value={projTitle} onChange={e => setProjTitle(e.target.value)} placeholder="ex: Clip SOLITAIRE"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none text-sm" />
                        </div>
                        <div>
                          <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Budget (€)</label>
                          <input value={projBudget} onChange={e => setProjBudget(e.target.value)} placeholder="ex: 5000" type="number"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Type</label>
                          <div className="flex flex-wrap gap-1.5">
                            {PROJECT_TYPES.map(t => (
                              <button key={t} onClick={() => setProjType(t)}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${projType === t ? 'bg-sky-500/30 border border-sky-500/50 text-sky-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Statut</label>
                          <div className="flex flex-wrap gap-1.5">
                            {PROJECT_STATUS.map(s => (
                              <button key={s} onClick={() => setProjStatus(s)}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${projStatus === s ? 'bg-white/15 border border-white/30 text-white' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Deadline</label>
                        <input value={projDeadline} onChange={e => setProjDeadline(e.target.value)} type="date"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none text-sm" />
                      </div>
                      <div className="mb-3">
                        <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Notes</label>
                        <textarea value={projNotes} onChange={e => setProjNotes(e.target.value)} rows={2} placeholder="Notes..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none text-sm resize-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveProject(artist.id)} disabled={!projTitle || saving}
                          className="bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-40">
                          {saving ? 'Sauvegarde...' : 'Ajouter'}
                        </button>
                        <button onClick={() => setShowProjectForm(null)} className="text-white/40 text-sm px-3">Annuler</button>
                      </div>
                    </div>
                  )}

                  {/* Projects list */}
                  {artistProjects.length === 0 && showProjectForm !== artist.id && (
                    <p className="text-white/25 text-sm text-center py-4">Aucun projet — ajoute le premier</p>
                  )}

                  <div className="space-y-2">
                    {artistProjects.map(proj => (
                      <div key={proj.id} className="bg-white/3 rounded-2xl border border-white/6 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-medium text-sm truncate">{proj.title}</p>
                              <span className="text-sky-400 text-xs bg-sky-500/10 px-2 py-0.5 rounded-lg flex-shrink-0">{proj.type}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {/* Status selector */}
                              <select
                                value={proj.status}
                                onChange={e => updateProjectStatus(proj.id, e.target.value)}
                                className={`text-xs px-2 py-0.5 rounded-lg border bg-transparent cursor-pointer ${STATUS_COLORS[proj.status] || 'text-white/50 border-white/20'}`}
                              >
                                {PROJECT_STATUS.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                              </select>
                              {proj.budget && (
                                <span className="text-white/40 text-xs flex items-center gap-1">
                                  <DollarSign size={10} />{proj.budget.toLocaleString('fr-FR')}€
                                </span>
                              )}
                              {proj.deadline && (
                                <span className="text-white/40 text-xs flex items-center gap-1">
                                  <Calendar size={10} />{new Date(proj.deadline).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                            </div>
                            {proj.notes && <p className="text-white/40 text-xs mt-1 line-clamp-1">{proj.notes}</p>}
                          </div>
                          <button onClick={() => removeProject(proj.id)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
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
