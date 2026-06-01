'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ClipboardList, Plus, Check, Trash2, StickyNote, X, Calendar, Clock } from 'lucide-react'

interface Task {
  id: string
  title: string
  done: boolean
  priority: string
  due_date: string | null
  created_at: string
}

interface Note {
  id: string
  title: string
  content: string
  created_at: string
}

interface Event {
  id: string
  title: string
  date: string
  time: string | null
  location: string | null
  type: string
  notes: string | null
  created_at: string
}

type Tab = 'tasks' | 'agenda' | 'notes'

const EVENT_TYPES = ['Tournage', 'Studio', 'Réunion', 'Concert', 'Livraison', 'Autre']
const PRIORITY_COLORS: Record<string, string> = {
  high:   'text-red-400 bg-red-500/10 border-red-500/20',
  normal: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [fetching, setFetching] = useState(true)

  // Task form
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal')
  const [taskDue, setTaskDue] = useState('')

  // Note form
  const [newNote, setNewNote] = useState('')
  const [showNoteForm, setShowNoteForm] = useState(false)

  // Event form
  const [showEventForm, setShowEventForm] = useState(false)
  const [evTitle, setEvTitle] = useState('')
  const [evDate, setEvDate] = useState('')
  const [evTime, setEvTime] = useState('')
  const [evLocation, setEvLocation] = useState('')
  const [evType, setEvType] = useState('Réunion')
  const [evNotes, setEvNotes] = useState('')
  const [savingEvent, setSavingEvent] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [t, n, e] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('memories').select('*').eq('category', 'Note').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('date', { ascending: true }),
    ])
    setTasks(t.data ?? [])
    setNotes(n.data ?? [])
    setEvents(e.data ?? [])
    setFetching(false)
  }

  // Tasks
  async function addTask() {
    if (!newTask.trim()) return
    const { data, error } = await supabase.from('tasks').insert({
      title: newTask.trim(), done: false, priority, due_date: taskDue || null
    }).select().single()
    if (!error && data) { setTasks([data, ...tasks]); setNewTask(''); setTaskDue('') }
  }

  async function toggleTask(id: string, done: boolean) {
    await supabase.from('tasks').update({ done: !done }).eq('id', id)
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !done } : t))
  }

  async function removeTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
  }

  // Notes
  async function addNote() {
    if (!newNote.trim()) return
    const { data, error } = await supabase.from('memories').insert({
      title: newNote.trim().slice(0, 80),
      content: newNote.trim(),
      category: 'Note',
    }).select().single()
    if (!error && data) { setNotes([data, ...notes]); setNewNote(''); setShowNoteForm(false) }
  }

  async function removeNote(id: string) {
    await supabase.from('memories').delete().eq('id', id)
    setNotes(notes.filter(n => n.id !== id))
  }

  // Events
  async function addEvent() {
    if (!evTitle || !evDate) return
    setSavingEvent(true)
    const { data, error } = await supabase.from('events').insert({
      title: evTitle, date: evDate, time: evTime || null,
      location: evLocation || null, type: evType, notes: evNotes || null,
    }).select().single()
    if (!error && data) {
      setEvents([...events, data].sort((a, b) => a.date.localeCompare(b.date)))
      setShowEventForm(false)
      setEvTitle(''); setEvDate(''); setEvTime(''); setEvLocation(''); setEvNotes('')
    }
    setSavingEvent(false)
  }

  async function removeEvent(id: string) {
    await supabase.from('events').delete().eq('id', id)
    setEvents(events.filter(e => e.id !== id))
  }

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  const today = new Date().toISOString().split('T')[0]
  const upcoming = events.filter(e => e.date >= today)
  const past = events.filter(e => e.date < today)

  const EVENT_TYPE_COLORS: Record<string, string> = {
    'Tournage': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    'Studio':   'text-pink-400 bg-pink-500/10 border-pink-500/20',
    'Réunion':  'text-sky-400 bg-sky-500/10 border-sky-500/20',
    'Concert':  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Livraison':'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'Autre':    'text-white/40 bg-white/5 border-white/10',
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center flex-shrink-0">
          <ClipboardList size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">ADMIN</h1>
          <p className="text-white/40 text-xs">{pending.length} tâche{pending.length > 1 ? 's' : ''} — {upcoming.length} event{upcoming.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'tasks', label: `✅ Tâches (${pending.length})` },
          { id: 'agenda', label: `📅 Agenda (${upcoming.length})` },
          { id: 'notes', label: `📝 Notes (${notes.length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${tab === id ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-white/5 border border-white/10 text-white/50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* TASKS */}
      {tab === 'tasks' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-4 mb-5">
            <div className="flex gap-2 mb-3">
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Nouvelle tâche..."
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none text-sm" />
              <button onClick={addTask} disabled={!newTask.trim()}
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl disabled:opacity-40 flex-shrink-0">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['high', 'normal', 'low'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${priority === p ? PRIORITY_COLORS[p] : 'text-white/30 bg-white/3 border-white/8'}`}>
                  {p === 'high' ? '🔴 Urgent' : p === 'normal' ? '🟡 Normal' : '🟢 Faible'}
                </button>
              ))}
              <input value={taskDue} onChange={e => setTaskDue(e.target.value)} type="date"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-white/50 text-xs focus:outline-none" />
            </div>
          </div>

          {pending.length > 0 && (
            <div className="space-y-2 mb-5">
              {pending.map(task => (
                <div key={task.id} className="glass rounded-2xl border border-white/8 px-4 py-3 flex items-center gap-3">
                  <button onClick={() => toggleTask(task.id, task.done)}
                    className="w-5 h-5 rounded-full border-2 border-white/20 hover:border-emerald-500 transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5">
                        <Clock size={10} />{new Date(task.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg border flex-shrink-0 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>{task.priority}</span>
                  <button onClick={() => removeTask(task.id)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={14} /></button>
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
                    <span className="flex-1 text-white/50 text-sm line-through truncate">{task.title}</span>
                    <button onClick={() => removeTask(task.id)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && !fetching && (
            <div className="glass rounded-3xl border border-white/8 p-12 text-center">
              <ClipboardList size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Aucune tâche 🙌</p>
            </div>
          )}
        </div>
      )}

      {/* AGENDA */}
      {tab === 'agenda' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-white/40 text-sm">{upcoming.length} à venir</p>
            <button onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium px-3 py-2 rounded-2xl text-sm">
              <Plus size={14} /> Ajouter
            </button>
          </div>

          {showEventForm && (
            <div className="glass-card rounded-3xl border border-emerald-500/20 p-5 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Titre *</label>
                  <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="ex: Tournage clip Niska"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Lieu</label>
                  <input value={evLocation} onChange={e => setEvLocation(e.target.value)} placeholder="ex: Studio 93, Paris"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Date *</label>
                  <input value={evDate} onChange={e => setEvDate(e.target.value)} type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Heure</label>
                  <input value={evTime} onChange={e => setEvTime(e.target.value)} type="time"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none transition-colors" />
                </div>
              </div>
              <div className="mb-3">
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Type</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map(t => (
                    <button key={t} onClick={() => setEvType(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${evType === t ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Notes</label>
                <textarea value={evNotes} onChange={e => setEvNotes(e.target.value)} rows={2} placeholder="Détails..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors resize-none text-sm" />
              </div>
              <div className="flex gap-3">
                <button onClick={addEvent} disabled={!evTitle || !evDate || savingEvent}
                  className="bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-2xl disabled:opacity-40 text-sm">
                  {savingEvent ? 'Sauvegarde...' : 'Ajouter'}
                </button>
                <button onClick={() => setShowEventForm(false)} className="text-white/40 text-sm px-4">Annuler</button>
              </div>
            </div>
          )}

          {upcoming.length === 0 && !showEventForm && (
            <div className="glass rounded-3xl border border-white/8 p-12 text-center">
              <Calendar size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Aucun événement à venir</p>
            </div>
          )}

          <div className="space-y-3">
            {upcoming.map(event => (
              <div key={event.id} className="glass rounded-2xl border border-white/8 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    <div className="text-center flex-shrink-0">
                      <p className="text-white font-bold text-lg leading-none">{new Date(event.date).getDate()}</p>
                      <p className="text-white/40 text-xs">{new Date(event.date).toLocaleDateString('fr-FR', { month: 'short' })}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{event.title}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-lg border ${EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.Autre}`}>{event.type}</span>
                        {event.time && <span className="text-white/40 text-xs flex items-center gap-1"><Clock size={10} />{event.time}</span>}
                        {event.location && <span className="text-white/30 text-xs truncate">{event.location}</span>}
                      </div>
                      {event.notes && <p className="text-white/30 text-xs mt-1 line-clamp-1">{event.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => removeEvent(event.id)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          {past.length > 0 && (
            <div className="mt-6">
              <p className="text-white/20 text-xs uppercase tracking-wider mb-3">Passés ({past.length})</p>
              <div className="space-y-2 opacity-40">
                {past.map(event => (
                  <div key={event.id} className="glass rounded-xl border border-white/5 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex gap-3 items-center min-w-0">
                      <span className="text-white/50 text-sm">{new Date(event.date).toLocaleDateString('fr-FR')}</span>
                      <span className="text-white/40 text-sm truncate">{event.title}</span>
                    </div>
                    <button onClick={() => removeEvent(event.id)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0 ml-2"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NOTES */}
      {tab === 'notes' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-4 mb-5">
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={4} placeholder="Écris ta note..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors resize-none text-sm mb-3" />
            <button onClick={addNote} disabled={!newNote.trim()}
              className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-2xl disabled:opacity-40">
              <StickyNote size={14} /> Ajouter
            </button>
          </div>

          {notes.length === 0 && (
            <div className="glass rounded-3xl border border-white/8 p-12 text-center">
              <StickyNote size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Aucune note</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.map(note => (
              <div key={note.id} className="glass rounded-2xl border border-white/8 p-4 relative group">
                <button onClick={() => removeNote(note.id)} className="absolute top-3 right-3 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <X size={14} />
                </button>
                <p className="text-white/70 text-sm leading-relaxed break-words pr-6">{note.content}</p>
                <p className="text-white/25 text-xs mt-3">{new Date(note.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
