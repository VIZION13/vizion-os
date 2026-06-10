'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Calendar, Plus, X, ChevronLeft, ChevronRight, Clock, MapPin, Trash2, Sparkles } from 'lucide-react'

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  colorId?: string
  location?: string
}

const EVENT_COLORS = [
  { label: 'Violet', value: 'violet', bg: 'bg-violet-500', border: 'border-violet-500/40' },
  { label: 'Bleu', value: 'blue', bg: 'bg-blue-500', border: 'border-blue-500/40' },
  { label: 'Vert', value: 'green', bg: 'bg-emerald-500', border: 'border-emerald-500/40' },
  { label: 'Rouge', value: 'red', bg: 'bg-red-500', border: 'border-red-500/40' },
  { label: 'Orange', value: 'orange', bg: 'bg-orange-500', border: 'border-orange-500/40' },
  { label: 'Rose', value: 'pink', bg: 'bg-pink-500', border: 'border-pink-500/40' },
]

const COLOR_MAP: Record<string, string> = {
  '1': 'bg-blue-500', '2': 'bg-emerald-500', '3': 'bg-violet-500',
  '4': 'bg-red-500', '5': 'bg-amber-500', '6': 'bg-orange-500',
  '7': 'bg-teal-500', '8': 'bg-slate-500', '9': 'bg-blue-800',
  '10': 'bg-emerald-800', '11': 'bg-red-800',
}

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const EVENT_TYPES = [
  { label: '🎬 Session Clip', color: 'violet' },
  { label: '🎵 Session Studio', color: 'blue' },
  { label: '🎤 Showcase / Live', color: 'green' },
  { label: '📋 Meeting', color: 'orange' },
  { label: '✈️ Déplacement', color: 'red' },
  { label: '📸 Shooting', color: 'pink' },
]

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [view, setView] = useState<'month' | 'agenda'>('month')

  // New event form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [color, setColor] = useState('violet')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const accessToken = (session as any)?.accessToken

  useEffect(() => {
    if (accessToken) loadEvents()
  }, [accessToken])

  async function loadEvents() {
    setLoading(true)
    try {
      const res = await fetch('/api/calendar', {
        headers: { 'x-access-token': accessToken }
      })
      const data = await res.json()
      setEvents(data.events || [])
    } catch {}
    setLoading(false)
  }

  async function createEvent() {
    if (!title || !startDate) return
    setSaving(true)
    try {
      const start = `${startDate}T${startTime}:00`
      const end = `${startDate}T${endTime}:00`
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken
        },
        body: JSON.stringify({ title, description, start, end, color })
      })
      const data = await res.json()
      if (data.event) {
        setEvents(prev => [...prev, data.event])
        setShowNewEvent(false)
        setTitle(''); setDescription(''); setStartDate(''); setStartTime('10:00'); setEndTime('11:00'); setColor('violet')
      }
    } catch {}
    setSaving(false)
  }

  async function deleteEvent(eventId: string) {
    if (!confirm('Supprimer cet événement ?')) return
    await fetch('/api/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-access-token': accessToken },
      body: JSON.stringify({ eventId })
    })
    setEvents(prev => prev.filter(e => e.id !== eventId))
  }

  async function generateEventDescription() {
    if (!title) return
    setGenerating(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'artists',
        messages: [{
          role: 'user',
          content: `Génère une courte description professionnelle (2-3 lignes max) pour un événement intitulé "${title}". Style music industry. Réponds directement avec la description.`
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
    setDescription(full.trim())
    setGenerating(false)
  }

  // Calendar helpers
  function getDaysInMonth(date: Date) {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []

    // Start from Monday
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    for (let i = 0; i < startDow; i++) days.push(null)

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }

  function getEventsForDay(date: Date) {
    return events.filter(e => {
      const eventDate = new Date(e.start.dateTime || e.start.date || '')
      return eventDate.toDateString() === date.toDateString()
    })
  }

  function formatTime(dateStr?: string) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const days = getDaysInMonth(currentDate)
  const today = new Date()
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : []

  // Agenda view — next 30 days
  const agendaEvents = events
    .filter(e => new Date(e.start.dateTime || e.start.date || '') >= today)
    .sort((a, b) => new Date(a.start.dateTime || a.start.date || '').getTime() - new Date(b.start.dateTime || b.start.date || '').getTime())

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card rounded-3xl border border-violet-500/20 p-8 text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mx-auto mb-4">
          <Calendar size={28} className="text-white" />
        </div>
        <h2 className="font-display font-black text-2xl text-white mb-2">VIZION CALENDAR</h2>
        <p className="text-white/40 text-sm mb-6">Connecte ton Google Calendar pour synchroniser tes événements</p>
        <button onClick={() => signIn('google')}
          className="w-full flex items-center gap-3 justify-center bg-white text-gray-800 font-semibold py-3 px-6 rounded-2xl hover:bg-gray-100 transition-colors">
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Connecter Google Calendar
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Calendar size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl md:text-3xl text-white">CALENDAR</h1>
            <p className="text-white/40 text-xs">Google Calendar · {events.length} événements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowNewEvent(true); setStartDate(new Date().toISOString().split('T')[0]) }}
            className="flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm px-4 py-2.5 rounded-2xl hover:bg-violet-500/30 transition-colors">
            <Plus size={15} /> Événement
          </button>
          <button onClick={() => signOut()}
            className="text-white/30 text-xs hover:text-white/60 transition-colors px-3 py-2">
            Déconnecter
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-5">
        {[
          { id: 'month', label: '📅 Mois' },
          { id: 'agenda', label: '📋 Agenda' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setView(id as any)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${view === id ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'bg-white/5 border border-white/10 text-white/50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* New event form */}
      {showNewEvent && (
        <div className="glass-card rounded-3xl border border-violet-500/20 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-violet-400 font-bold text-sm">Nouvel événement</p>
            <button onClick={() => setShowNewEvent(false)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
          </div>

          {/* Quick types */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {EVENT_TYPES.map(type => (
              <button key={type.label} onClick={() => { setTitle(type.label); setColor(type.color) }}
                className="text-xs bg-white/5 border border-white/10 text-white/50 px-2.5 py-1 rounded-xl hover:bg-white/10 transition-colors">
                {type.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'événement *"
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 text-sm" />
              <button onClick={generateEventDescription} disabled={generating || !title}
                className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-3 rounded-2xl disabled:opacity-40">
                <Sparkles size={12} />
              </button>
            </div>

            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description..." rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 resize-none text-sm" />

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 md:col-span-1">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 text-sm" />
              </div>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 text-sm" />
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 text-sm" />
            </div>

            {/* Color */}
            <div>
              <p className="text-white/40 text-xs mb-2">Couleur</p>
              <div className="flex gap-2">
                {EVENT_COLORS.map(c => (
                  <button key={c.value} onClick={() => setColor(c.value)}
                    className={`w-7 h-7 rounded-full ${c.bg} transition-all ${color === c.value ? 'ring-2 ring-white/60 scale-110' : 'opacity-60 hover:opacity-100'}`} />
                ))}
              </div>
            </div>

            <button onClick={createEvent} disabled={saving || !title || !startDate}
              className="w-full bg-gradient-to-r from-violet-600 to-blue-500 text-white font-bold py-3 rounded-2xl disabled:opacity-40">
              {saving ? 'Création...' : 'Créer l\'événement'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-2" />
          <p className="text-white/40 text-sm">Chargement du calendrier...</p>
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {view === 'month' && !loading && (
        <div>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <h2 className="font-display font-bold text-white text-lg">
              {MONTHS_FR[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_FR.map(d => (
              <div key={d} className="text-center text-white/30 text-xs py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />
              const dayEvents = getEventsForDay(day)
              const isToday = day.toDateString() === today.toDateString()
              const isSelected = selectedDay?.toDateString() === day.toDateString()

              return (
                <button key={day.toISOString()} onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-12 rounded-xl p-1 transition-all text-left ${isSelected ? 'bg-violet-500/20 border border-violet-500/40' : isToday ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'}`}>
                  <p className={`text-xs font-medium text-center mb-1 ${isToday ? 'text-violet-400' : 'text-white/60'}`}>
                    {day.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className={`w-full h-1.5 rounded-full ${COLOR_MAP[e.colorId || '3'] || 'bg-violet-500'}`} />
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[9px] text-white/30 text-center">+{dayEvents.length - 2}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected day events */}
          {selectedDay && (
            <div className="mt-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                {formatDate(selectedDay.toISOString())} — {selectedEvents.length} événement{selectedEvents.length > 1 ? 's' : ''}
              </p>
              {selectedEvents.length === 0 ? (
                <div className="glass rounded-2xl p-4 text-center border border-white/8">
                  <p className="text-white/30 text-sm">Aucun événement ce jour</p>
                  <button onClick={() => { setShowNewEvent(true); setStartDate(selectedDay.toISOString().split('T')[0]) }}
                    className="mt-2 text-xs text-violet-400 flex items-center gap-1 mx-auto">
                    <Plus size={11} /> Ajouter un événement
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(event => (
                    <div key={event.id} className="glass rounded-2xl border border-white/8 p-3 flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${COLOR_MAP[event.colorId || '3'] || 'bg-violet-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{event.summary}</p>
                        {event.start.dateTime && (
                          <p className="text-white/40 text-xs mt-0.5">
                            {formatTime(event.start.dateTime)} — {formatTime(event.end.dateTime)}
                          </p>
                        )}
                        {event.description && <p className="text-white/40 text-xs mt-1 line-clamp-2">{event.description}</p>}
                        {event.location && (
                          <p className="text-white/30 text-xs mt-0.5 flex items-center gap-1">
                            <MapPin size={10} /> {event.location}
                          </p>
                        )}
                      </div>
                      <button onClick={() => deleteEvent(event.id)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── AGENDA VIEW ── */}
      {view === 'agenda' && !loading && (
        <div className="space-y-2">
          {agendaEvents.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center border border-white/8">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-white/40 text-sm">Aucun événement à venir</p>
            </div>
          ) : (
            agendaEvents.map(event => {
              const eventDate = new Date(event.start.dateTime || event.start.date || '')
              return (
                <div key={event.id} className="glass rounded-2xl border border-white/8 p-4 flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${COLOR_MAP[event.colorId || '3'] || 'bg-violet-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white font-medium text-sm">{event.summary}</p>
                      <button onClick={() => deleteEvent(event.id)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="text-violet-400 text-xs mt-0.5">
                      {eventDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {event.start.dateTime && ` · ${formatTime(event.start.dateTime)} — ${formatTime(event.end.dateTime)}`}
                    </p>
                    {event.description && <p className="text-white/40 text-xs mt-1 line-clamp-2">{event.description}</p>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
