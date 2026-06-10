'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import {
  ClipboardList, Plus, Check, Trash2, StickyNote, X,
  Calendar, Clock, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react'

interface Task {
  id: string; title: string; done: boolean
  priority: string; due_date: string | null; created_at: string
}
interface Note {
  id: string; title: string; content: string; created_at: string
}
interface CalEvent {
  id: string; summary: string; description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  colorId?: string; location?: string
}

type Tab = 'tasks' | 'agenda' | 'notes'

const PRIORITY_COLORS: Record<string, string> = {
  high:   'text-red-400 bg-red-500/10 border-red-500/20',
  normal: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

const COLOR_MAP: Record<string, string> = {
  '1': 'bg-blue-500', '2': 'bg-emerald-500', '3': 'bg-violet-500',
  '4': 'bg-red-500', '5': 'bg-amber-500', '6': 'bg-orange-500',
}

const EVENT_COLORS = [
  { label: 'Violet', value: 'violet', bg: 'bg-violet-500', id: '3' },
  { label: 'Bleu', value: 'blue', bg: 'bg-blue-500', id: '1' },
  { label: 'Vert', value: 'green', bg: 'bg-emerald-500', id: '2' },
  { label: 'Rouge', value: 'red', bg: 'bg-red-500', id: '4' },
  { label: 'Orange', value: 'orange', bg: 'bg-orange-500', id: '6' },
]

const EVENT_TYPES = [
  { label: '🎬 Session Clip', color: 'violet' },
  { label: '🎵 Studio', color: 'blue' },
  { label: '🎤 Live / Showcase', color: 'green' },
  { label: '📋 Meeting', color: 'orange' },
  { label: '📸 Shooting', color: 'red' },
  { label: '✈️ Déplacement', color: 'red' },
]

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

export default function AdminPage() {
  const { data: session } = useSession()
  const accessToken = (session as any)?.accessToken

  const [tab, setTab] = useState<Tab>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [calEvents, setCalEvents] = useState<CalEvent[]>([])
  const [fetching, setFetching] = useState(true)
  const [calLoading, setCalLoading] = useState(false)

  // Task form
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal')
  const [taskDue, setTaskDue] = useState('')

  // Note form
  const [newNote, setNewNote] = useState('')

  // Calendar
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [calView, setCalView] = useState<'month' | 'agenda'>('month')
  const [evTitle, setEvTitle] = useState('')
  const [evDesc, setEvDesc] = useState('')
  const [evDate, setEvDate] = useState('')
  const [evStart, setEvStart] = useState('10:00')
  const [evEnd, setEvEnd] = useState('11:00')
  const [evColor, setEvColor] = useState('violet')
  const [savingEvent, setSavingEvent] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadTasks(); loadNotes() }, [])
  useEffect(() => { if (accessToken && tab === 'agenda') loadCalendar() }, [accessToken, tab])

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    setTasks(data ?? [])
    setFetching(false)
  }

  async function loadNotes() {
    const { data } = await supabase.from('memories').select('*').eq('category', 'Note').order('created_at', { ascending: false })
    setNotes(data ?? [])
  }

  async function loadCalendar() {
    setCalLoading(true)
    try {
      const res = await fetch('/api/calendar', { headers: { 'x-access-token': accessToken } })
      const data = await res.json()
      setCalEvents(data.events || [])
    } catch {}
    setCalLoading(false)
  }

  async function addTask() {
    if (!newTask) return
    const { data } = await supabase.from('tasks').insert({ title: newTask, priority, due_date: taskDue || null, done: false }).select().single()
    if (data) setTasks(prev => [data, ...prev])
    setNewTask(''); setTaskDue('')
  }

  async function toggleTask(id: string, done: boolean) {
    await supabase.from('tasks').update({ done: !done }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t))
  }

  async function removeTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function addNote() {
    if (!newNote.trim()) return
    const { data } = await supabase.from('memories').insert({ content: newNote, category: 'Note', title: newNote.slice(0, 50) }).select().single()
    if (data) setNotes(prev => [data, ...prev])
    setNewNote('')
  }

  async function removeNote(id: string) {
    await supabase.from('memories').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  async function generateDesc() {
    if (!evTitle) return
    setGenerating(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'artists',
        messages: [{ role: 'user', content: `Génère une courte description (2 lignes max) pour l'événement "${evTitle}". Style music industry pro. Réponds directement.` }]
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
    setEvDesc(full.trim())
    setGenerating(false)
  }

  async function createCalEvent() {
    if (!evTitle || !evDate || !accessToken) return
    setSavingEvent(true)
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': accessToken },
        body: JSON.stringify({ title: evTitle, description: evDesc, start: `${evDate}T${evStart}:00`, end: `${evDate}T${evEnd}:00`, color: evColor })
      })
      const data = await res.json()
      if (data.event) {
        setCalEvents(prev => [...prev, data.event])
        setShowNewEvent(false)
        setEvTitle(''); setEvDesc(''); setEvDate(''); setEvStart('10:00'); setEvEnd('11:00'); setEvColor('violet')
      }
    } catch {}
    setSavingEvent(false)
  }

  async function deleteCalEvent(id: string) {
    if (!confirm('Supprimer ?')) return
    await fetch('/api/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-access-token': accessToken },
      body: JSON.stringify({ eventId: id })
    })
    setCalEvents(prev => prev.filter(e => e.id !== id))
  }

  // Calendar helpers
  function getDays(date: Date) {
    const year = date.getFullYear(), month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    for (let i = 0; i < startDow; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
    return days
  }

  function eventsForDay(date: Date) {
    return calEvents.filter(e => new Date(e.start.dateTime || e.start.date || '').toDateString() === date.toDateString())
  }

  function fmt(d?: string) { return d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '' }

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)
  const today = new Date()
  const days = getDays(currentDate)
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : []
  const agendaEvents = calEvents
    .filter(e => new Date(e.start.dateTime || e.start.date || '') >= today)
    .sort((a, b) => new Date(a.start.dateTime || a.start.date || '').getTime() - new Date(b.start.dateTime || b.start.date || '').getTime())

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
          <ClipboardList size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">ADMIN</h1>
          <p className="text-white/40 text-xs">{pending.length} tâche{pending.length > 1 ? 's' : ''} — {calEvents.length} event{calEvents.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'tasks', label: `✅ Tâches (${pending.length})` },
          { id: 'agenda', label: `📅 Agenda (${calEvents.length})` },
          { id: 'notes', label: `📝 Notes (${notes.length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${tab === id ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TASKS ── */}
      {tab === 'tasks' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-4 mb-5">
            <div className="flex gap-2 mb-3">
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Nouvelle tâche..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors" />
              <button onClick={addTask} disabled={!newTask}
                className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-emerald-500 transition-colors flex-shrink-0">
                <Plus size={18} />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['high','normal','low'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${priority === p ? PRIORITY_COLORS[p] : 'bg-white/5 border-white/10 text-white/30'}`}>
                  {p === 'high' ? '🔴 Urgent' : p === 'normal' ? '🟡 Normal' : '🟢 Faible'}
                </button>
              ))}
              <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white/60 text-xs focus:outline-none" />
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

      {/* ── AGENDA (Google Calendar) ── */}
      {tab === 'agenda' && (
        <div>
          {!session ? (
            <div className="glass-card rounded-3xl border border-violet-500/20 p-8 text-center">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mx-auto mb-4">
                <Calendar size={24} className="text-white" />
              </div>
              <h3 className="text-white font-bold mb-2">Connecte Google Calendar</h3>
              <p className="text-white/40 text-sm mb-5">Synchronise ton agenda Gmail directement dans VIZION OS</p>
              <button onClick={() => signIn('google')}
                className="flex items-center gap-3 justify-center bg-white text-gray-800 font-semibold py-3 px-6 rounded-2xl hover:bg-gray-100 transition-colors mx-auto">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Connecter Google Calendar
              </button>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex gap-2">
                  {[{id:'month',label:'📅 Mois'},{id:'agenda',label:'📋 Liste'}].map(({id,label}) => (
                    <button key={id} onClick={() => setCalView(id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${calView === id ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowNewEvent(!showNewEvent); setEvDate(new Date().toISOString().split('T')[0]) }}
                    className="flex items-center gap-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs px-3 py-1.5 rounded-xl">
                    <Plus size={12} /> Événement
                  </button>
                  <button onClick={() => signOut()} className="text-white/25 text-xs hover:text-white/50 px-2">Déco</button>
                </div>
              </div>

              {/* New event form */}
              {showNewEvent && (
                <div className="glass-card rounded-3xl border border-violet-500/20 p-4 mb-4">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {EVENT_TYPES.map(type => (
                      <button key={type.label} onClick={() => { setEvTitle(type.label); setEvColor(type.color) }}
                        className="text-xs bg-white/5 border border-white/10 text-white/50 px-2.5 py-1 rounded-xl hover:bg-white/10 transition-colors">
                        {type.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Titre *"
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 text-sm" />
                      <button onClick={generateDesc} disabled={generating || !evTitle}
                        className="bg-violet-500/20 border border-violet-500/30 text-violet-400 px-3 py-2.5 rounded-2xl disabled:opacity-40">
                        <Sparkles size={14} />
                      </button>
                    </div>
                    {evDesc && <p className="text-white/40 text-xs bg-white/3 rounded-xl p-2">{evDesc}</p>}
                    <div className="grid grid-cols-3 gap-2">
                      <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white text-sm focus:outline-none" />
                      <input type="time" value={evStart} onChange={e => setEvStart(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white text-sm focus:outline-none" />
                      <input type="time" value={evEnd} onChange={e => setEvEnd(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white text-sm focus:outline-none" />
                    </div>
                    <div className="flex gap-2 items-center">
                      {EVENT_COLORS.map(c => (
                        <button key={c.value} onClick={() => setEvColor(c.value)}
                          className={`w-6 h-6 rounded-full ${c.bg} transition-all ${evColor === c.value ? 'ring-2 ring-white/60 scale-110' : 'opacity-50'}`} />
                      ))}
                      <button onClick={createCalEvent} disabled={savingEvent || !evTitle || !evDate}
                        className="ml-auto bg-gradient-to-r from-violet-600 to-blue-500 text-white font-bold text-sm px-5 py-2 rounded-2xl disabled:opacity-40">
                        {savingEvent ? '...' : 'Créer'}
                      </button>
                      <button onClick={() => setShowNewEvent(false)} className="text-white/30 text-xs px-2">Annuler</button>
                    </div>
                  </div>
                </div>
              )}

              {calLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-2" />
                  <p className="text-white/40 text-sm">Chargement...</p>
                </div>
              )}

              {/* Month view */}
              {calView === 'month' && !calLoading && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                      className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10">
                      <ChevronLeft size={14} />
                    </button>
                    <p className="text-white font-bold">{MONTHS_FR[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                      className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 mb-1">
                    {DAYS_FR.map(d => <div key={d} className="text-center text-white/25 text-xs py-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {days.map((day, i) => {
                      if (!day) return <div key={`e-${i}`} />
                      const ev = eventsForDay(day)
                      const isToday = day.toDateString() === today.toDateString()
                      const isSel = selectedDay?.toDateString() === day.toDateString()
                      return (
                        <button key={day.toISOString()} onClick={() => setSelectedDay(isSel ? null : day)}
                          className={`min-h-10 rounded-xl p-1 transition-all text-center ${isSel ? 'bg-violet-500/20 border border-violet-500/40' : isToday ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'}`}>
                          <p className={`text-xs font-medium ${isToday ? 'text-violet-400' : 'text-white/60'}`}>{day.getDate()}</p>
                          <div className="flex justify-center gap-0.5 mt-0.5">
                            {ev.slice(0, 3).map(e => <div key={e.id} className={`w-1 h-1 rounded-full ${COLOR_MAP[e.colorId || '3'] || 'bg-violet-500'}`} />)}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {selectedDay && (
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                        {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      {selectedEvents.length === 0 ? (
                        <div className="glass rounded-2xl p-4 text-center border border-white/8">
                          <p className="text-white/30 text-sm">Aucun événement</p>
                          <button onClick={() => { setShowNewEvent(true); setEvDate(selectedDay.toISOString().split('T')[0]) }}
                            className="mt-1 text-xs text-violet-400 flex items-center gap-1 mx-auto">
                            <Plus size={11} /> Ajouter
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedEvents.map(e => (
                            <div key={e.id} className="glass rounded-2xl border border-white/8 p-3 flex items-start gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${COLOR_MAP[e.colorId || '3'] || 'bg-violet-500'}`} />
                              <div className="flex-1">
                                <p className="text-white text-sm font-medium">{e.summary}</p>
                                {e.start.dateTime && <p className="text-white/40 text-xs">{fmt(e.start.dateTime)} — {fmt(e.end.dateTime)}</p>}
                              </div>
                              <button onClick={() => deleteCalEvent(e.id)} className="text-white/20 hover:text-red-400"><Trash2 size={13} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Agenda list */}
              {calView === 'agenda' && !calLoading && (
                <div className="space-y-2">
                  {agendaEvents.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center border border-white/8">
                      <p className="text-3xl mb-2">📅</p>
                      <p className="text-white/40 text-sm">Aucun événement à venir</p>
                    </div>
                  ) : agendaEvents.map(e => (
                    <div key={e.id} className="glass rounded-2xl border border-white/8 p-3 flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${COLOR_MAP[e.colorId || '3'] || 'bg-violet-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{e.summary}</p>
                        <p className="text-violet-400 text-xs mt-0.5">
                          {new Date(e.start.dateTime || e.start.date || '').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {e.start.dateTime && ` · ${fmt(e.start.dateTime)}`}
                        </p>
                        {e.description && <p className="text-white/30 text-xs mt-0.5 line-clamp-1">{e.description}</p>}
                      </div>
                      <button onClick={() => deleteCalEvent(e.id)} className="text-white/20 hover:text-red-400 flex-shrink-0"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── NOTES ── */}
      {tab === 'notes' && (
        <div>
          <div className="glass-card rounded-3xl border border-white/8 p-4 mb-5">
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={4} placeholder="Écris ta note..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none resize-none text-sm mb-3" />
            <button onClick={addNote} disabled={!newNote.trim()}
              className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-2xl disabled:opacity-40">
              <StickyNote size={14} /> Ajouter
            </button>
          </div>
          {notes.length === 0 ? (
            <div className="glass rounded-3xl border border-white/8 p-12 text-center">
              <StickyNote size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Aucune note</p>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </div>
  )
}
