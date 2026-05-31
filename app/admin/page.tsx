'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ClipboardList, Plus, Check, Trash2, StickyNote, X } from 'lucide-react'

interface Task {
  id: string
  title: string
  done: boolean
  priority: string
  created_at: string
}

interface Note {
  id: string
  content: string
  created_at: string
}

export default function AdminPage() {
  const [tab, setTab] = useState<'tasks' | 'notes'>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal')
  const [newNote, setNewNote] = useState('')
  const [fetching, setFetching] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [t, n] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('memories').select('*').eq('category', 'Note').order('created_at', { ascending: false }),
    ])
    setTasks(t.data ?? [])
    setNotes(n.data ?? [])
    setFetching(false)
  }

  async function addTask() {
    if (!newTask.trim()) return
    const { data, error } = await supabase.from('tasks').insert({
      title: newTask.trim(),
      done: false,
      priority,
    }).select().single()
    if (!error && data) {
      setTasks([data, ...tasks])
      setNewTask('')
    }
  }

  async function toggleTask(id: string, done: boolean) {
    await supabase.from('tasks').update({ done: !done }).eq('id', id)
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !done } : t))
  }

  async function removeTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
  }

  async function addNote() {
    if (!newNote.trim()) return
    const { data, error } = await supabase.from('memories').insert({
      title: newNote.trim().slice(0, 60),
      content: newNote.trim(),
      category: 'Note',
    }).select().single()
    if (!error && data) {
      setNotes([data, ...notes])
      setNewNote('')
    }
  }

  async function removeNote(id: string) {
    await supabase.from('memories').delete().eq('id', id)
    setNotes(notes.filter(n => n.id !== id))
  }

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  const priorityColors: Record<string, string> = {
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    normal: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
            <ClipboardList size={20} className="text-white" />
          </div>
          <h1 className="font-display font-black text-3xl text-white">ADMIN</h1>
        </div>
        <p className="text-white/40 text-sm">Tâches et notes du studio</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { id: 'tasks', label: `Tâches (${pending.length})` },
          { id: 'notes', label: `Notes (${notes.length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as 'tasks' | 'notes')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${tab === id ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-4 mb-6">
            <div className="flex gap-3 mb-3">
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Nouvelle tâche..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm" />
              <button onClick={addTask} disabled={!newTask.trim()} className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl disabled:opacity-40 hover:bg-emerald-500 transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex gap-2">
              {(['high', 'normal', 'low'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${priority === p ? priorityColors[p] : 'text-white/30 bg-white/3 border-white/8'}`}>
                  {p === 'high' ? '🔴 Urgent' : p === 'normal' ? '🟡 Normal' : '🟢 Faible'}
                </button>
              ))}
            </div>
          </div>

          {pending.length > 0 && (
            <div className="space-y-2 mb-6">
              {pending.map(task => (
                <div key={task.id} className="glass rounded-2xl border border-white/8 px-4 py-3 flex items-center gap-3">
                  <button onClick={() => toggleTask(task.id, task.done)}
                    className="w-5 h-5 rounded-full border-2 border-white/20 hover:border-emerald-500 transition-colors flex-shrink-0" />
                  <span className="flex-1 text-white/80 text-sm">{task.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg border ${priorityColors[task.priority] ?? priorityColors.normal}`}>{task.priority}</span>
                  <button onClick={() => removeTask(task.id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div>
              <p className="text-white/20 text-xs uppercase tracking-wider mb-3">Terminées ({done.length})</p>
              <div className="space-y-2">
                {done.map(task => (
                  <div key={task.id} className="glass rounded-2xl border border-white/5 px-4 py-3 flex items-center gap-3 opacity-50">
                    <button onClick={() => toggleTask(task.id, task.done)}
                      className="w-5 h-5 rounded-full bg-emerald-500/30 border-2 border-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-emerald-400" />
                    </button>
                    <span className="flex-1 text-white/50 text-sm line-through">{task.title}</span>
                    <button onClick={() => removeTask(task.id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && !fetching && (
            <div className="glass rounded-3xl border border-white/8 p-12 text-center">
              <ClipboardList size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Aucune tâche — t'es à jour 🙌</p>
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-4 mb-6">
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={4} placeholder="Écris ta note..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none text-sm mb-3" />
            <button onClick={addNote} disabled={!newNote.trim()}
              className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-2xl disabled:opacity-40 hover:bg-emerald-500 transition-colors">
              <StickyNote size={14} />
              Ajouter
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.map(note => (
              <div key={note.id} className="glass rounded-2xl border border-white/8 p-4 relative group">
                <button onClick={() => removeNote(note.id)} className="absolute top-3 right-3 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <X size={14} />
                </button>
                <p className="text-white/70 text-sm leading-relaxed pr-6">{note.content}</p>
                <p className="text-white/25 text-xs mt-3">{new Date(note.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
          {notes.length === 0 && !fetching && (
            <div className="glass rounded-3xl border border-white/8 p-12 text-center">
              <StickyNote size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Aucune note</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
