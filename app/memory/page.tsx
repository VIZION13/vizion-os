'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Brain, Plus, Search, X, Sparkles, Tag } from 'lucide-react'

interface Memory {
  id: string
  title: string
  content: string
  category: string | null
  created_at: string
}

const CATEGORIES = ['Artiste', 'Projet', 'Décision', 'Idée', 'Contact', 'Technique', 'Business']

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [saving, setSaving] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatAnswer, setChatAnswer] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
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

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header — mobile safe */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Brain size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-black text-2xl md:text-3xl text-white">MEMORY</h1>
              <p className="text-white/40 text-xs">{memories.length} souvenir{memories.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 font-medium px-3 py-2 rounded-2xl hover:bg-fuchsia-500/30 transition-colors text-sm flex-shrink-0">
            <Plus size={14} />
            Mémoriser
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="glass-card rounded-3xl border border-fuchsia-500/20 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-fuchsia-400 flex-shrink-0" />
          <p className="text-fuchsia-400 text-sm font-medium">Interroge ta mémoire</p>
          <span className="ml-auto text-white/25 text-xs flex-shrink-0">{memories.length}</span>
        </div>
        <div className="flex gap-2">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && askMemory()}
            placeholder="Quels projets sont en cours ?"
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 transition-colors text-sm" />
          <button onClick={askMemory} disabled={chatLoading || !chatInput.trim() || memories.length === 0}
            className="bg-fuchsia-600 text-white px-3 py-2.5 rounded-2xl disabled:opacity-40 hover:bg-fuchsia-500 transition-colors flex-shrink-0">
            <Sparkles size={16} />
          </button>
        </div>
        {(chatAnswer || chatLoading) && (
          <div className="mt-3 bg-white/3 rounded-2xl p-3">
            <p className="text-white/70 text-sm leading-relaxed">
              {chatAnswer}
              {chatLoading && <span className="inline-block w-1 h-4 bg-fuchsia-400 ml-1 animate-pulse" />}
            </p>
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass-card rounded-3xl border border-fuchsia-500/20 p-4 mb-6">
          <h2 className="text-white font-semibold mb-4">Nouveau souvenir</h2>
          <div className="mb-3">
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Titre *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Projet Niska"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 transition-colors" />
          </div>
          <div className="mb-3">
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Contenu *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder="Détails..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 transition-colors resize-none" />
          </div>
          <div className="mb-4">
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(category === cat ? '' : cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${category === cat ? 'bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={!title || !content || saving}
              className="bg-fuchsia-600 text-white font-semibold px-5 py-2.5 rounded-2xl disabled:opacity-40 hover:bg-fuchsia-500 transition-colors text-sm">
              {saving ? 'Sauvegarde...' : 'Mémoriser'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70 px-4 py-2.5 transition-colors text-sm">Annuler</button>
          </div>
        </div>
      )}

      {/* Search */}
      {memories.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 transition-colors text-sm" />
          </div>
        </div>
      )}

      {/* Category filters */}
      {memories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
              className={`px-3 py-1 rounded-xl text-xs transition-all ${filterCat === cat ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30' : 'text-white/30 hover:text-white/60'}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && memories.length === 0 && !showForm && (
        <div className="glass rounded-3xl border border-white/8 p-12 text-center">
          <Brain size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Aucun souvenir</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(mem => (
          <div key={mem.id} className="glass rounded-2xl border border-white/8 p-4 relative group">
            <button onClick={() => remove(mem.id)} className="absolute top-3 right-3 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
              <X size={14} />
            </button>
            {mem.category && (
              <span className="text-fuchsia-400 text-xs bg-fuchsia-500/10 border border-fuchsia-500/20 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 mb-2">
                <Tag size={10} />{mem.category}
              </span>
            )}
            <p className="text-white font-medium text-sm mb-1 pr-6 break-words">{mem.title}</p>
            <p className="text-white/50 text-sm leading-relaxed break-words">{mem.content}</p>
            <p className="text-white/20 text-xs mt-3">{new Date(mem.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
