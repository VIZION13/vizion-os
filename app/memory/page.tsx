'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Brain, Plus, Search, X, Sparkles, Tag, Edit2, Check } from 'lucide-react'

interface Memory {
  id: string
  title: string
  content: string
  category: string | null
  created_at: string
}

const CATEGORIES = ['Artiste', 'Projet', 'Décision', 'Idée', 'Contact', 'Technique', 'Business', 'Inspiration']

const CAT_COLORS: Record<string, string> = {
  'Artiste':     'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'Projet':      'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'Décision':    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Idée':        'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'Contact':     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Technique':   'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Business':    'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Inspiration': 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [saving, setSaving] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatAnswer, setChatAnswer] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => { loadMemories() }, [])

  async function loadMemories() {
    const { data } = await supabase.from('memories').select('*').neq('category', 'Note').order('created_at', { ascending: false })
    setMemories(data ?? [])
  }

  async function save() {
    if (!title || !content) return
    setSaving(true)
    const { data, error } = await supabase.from('memories').insert({ title, content, category: category || null }).select().single()
    if (!error && data) {
      setMemories([data, ...memories])
      setShowForm(false)
      setTitle(''); setContent(''); setCategory('')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    await supabase.from('memories').delete().eq('id', id)
    setMemories(memories.filter(m => m.id !== id))
  }

  async function saveEdit(id: string) {
    await supabase.from('memories').update({ content: editContent }).eq('id', id)
    setMemories(memories.map(m => m.id === id ? { ...m, content: editContent } : m))
    setEditingId(null)
  }

  async function askMemory() {
    if (!chatInput.trim() || memories.length === 0) return
    setChatLoading(true)
    setChatAnswer('')
    const context = memories.map(m => `[${m.category ?? 'Info'}] ${m.title}: ${m.content}`).join('\n')
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'memory',
        messages: [{ role: 'user', content: `Mémoire du studio :\n\n${context}\n\nQuestion : ${chatInput}` }]
      })
    })
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((l: string) => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') break
        try { setChatAnswer(prev => prev + JSON.parse(data).text) } catch {}
      }
    }
    setChatLoading(false)
  }

  const filtered = memories.filter(m => {
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || m.category === filterCat
    return matchSearch && matchCat
  })

  // Stats by category
  const catCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = memories.filter(m => m.category === cat).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl md:text-3xl text-white">MEMORY</h1>
            <p className="text-white/40 text-xs">{memories.length} souvenir{memories.length > 1 ? 's' : ''} dans Supabase</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 font-medium px-3 py-2 rounded-2xl text-sm flex-shrink-0">
          <Plus size={14} /> Mémoriser
        </button>
      </div>

      {/* Category stats */}
      {memories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.filter(cat => catCounts[cat] > 0).map(cat => (
            <button key={cat} onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${filterCat === cat ? CAT_COLORS[cat] : 'text-white/30 bg-white/3 border-white/8 hover:text-white/60'}`}>
              <Tag size={10} />
              {cat}
              <span className="opacity-60">({catCounts[cat]})</span>
            </button>
          ))}
          {filterCat && (
            <button onClick={() => setFilterCat('')} className="text-white/30 text-xs px-2 hover:text-white/60 transition-colors">
              Effacer filtre
            </button>
          )}
        </div>
      )}

      {/* Chat with memory */}
      <div className="glass-card rounded-3xl border border-fuchsia-500/20 p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-fuchsia-400 flex-shrink-0" />
          <p className="text-fuchsia-400 text-sm font-medium">Interroge ta mémoire</p>
          <span className="ml-auto text-white/25 text-xs flex-shrink-0">{memories.length} souvenirs</span>
        </div>
        <div className="flex gap-2">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && askMemory()}
            placeholder="ex: Quels projets sont en cours ?"
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none text-sm" />
          <button onClick={askMemory} disabled={chatLoading || !chatInput.trim() || memories.length === 0}
            className="bg-fuchsia-600 text-white px-3 py-2.5 rounded-2xl disabled:opacity-40 flex-shrink-0">
            <Sparkles size={15} />
          </button>
        </div>
        {(chatAnswer || chatLoading) && (
          <div className="mt-3 bg-white/3 rounded-2xl p-3">
            <p className="text-white/70 text-sm leading-relaxed break-words">
              {chatAnswer}
              {chatLoading && <span className="inline-block w-1 h-4 bg-fuchsia-400 ml-1 animate-pulse" />}
            </p>
          </div>
        )}
        {memories.length === 0 && (
          <p className="text-white/25 text-xs mt-2">Ajoute des souvenirs pour pouvoir les interroger</p>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass-card rounded-3xl border border-fuchsia-500/20 p-4 mb-5">
          <h2 className="text-white font-semibold mb-4">Nouveau souvenir</h2>
          <div className="mb-3">
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Titre *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Décision sur le clip de Niska"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors" />
          </div>
          <div className="mb-3">
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Contenu *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Tout ce que tu veux retenir..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors resize-none" />
          </div>
          <div className="mb-4">
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(category === cat ? '' : cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${category === cat ? CAT_COLORS[cat] : 'bg-white/5 border-white/10 text-white/40'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={!title || !content || saving}
              className="bg-fuchsia-600 text-white font-semibold px-5 py-2.5 rounded-2xl disabled:opacity-40 text-sm">
              {saving ? 'Sauvegarde...' : 'Mémoriser'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-white/40 text-sm px-4">Annuler</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans la mémoire..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none text-sm" />
      </div>

      {filtered.length === 0 && memories.length === 0 && !showForm && (
        <div className="glass rounded-3xl border border-white/8 p-12 text-center">
          <Brain size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Aucun souvenir — commence à mémoriser</p>
        </div>
      )}

      {filtered.length === 0 && memories.length > 0 && (
        <p className="text-white/30 text-sm text-center py-8">Aucun résultat pour "{search || filterCat}"</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(mem => (
          <div key={mem.id} className="glass rounded-2xl border border-white/8 p-4 group">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                {mem.category && (
                  <span className={`text-xs px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 flex-shrink-0 ${CAT_COLORS[mem.category] || 'text-white/40 bg-white/5 border-white/10'}`}>
                    <Tag size={9} />{mem.category}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingId(mem.id); setEditContent(mem.content) }}
                  className="text-white/30 hover:text-white/60 transition-colors"><Edit2 size={13} /></button>
                <button onClick={() => remove(mem.id)} className="text-white/20 hover:text-red-400 transition-colors"><X size={14} /></button>
              </div>
            </div>
            <p className="text-white font-medium text-sm mb-2 break-words">{mem.title}</p>
            {editingId === mem.id ? (
              <div>
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                  className="w-full bg-white/5 border border-fuchsia-500/30 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none mb-2" />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(mem.id)} className="flex items-center gap-1 text-xs bg-fuchsia-500/20 text-fuchsia-400 px-3 py-1.5 rounded-lg">
                    <Check size={11} /> Sauvegarder
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-white/30 text-xs px-2">Annuler</button>
                </div>
              </div>
            ) : (
              <p className="text-white/50 text-sm leading-relaxed break-words">{mem.content}</p>
            )}
            <p className="text-white/20 text-xs mt-3">{new Date(mem.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
