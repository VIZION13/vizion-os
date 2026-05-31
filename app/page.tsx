'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Clapperboard, Music2, Users, Briefcase, ClipboardList, Brain, Zap, BarChart2, Clock, TrendingUp } from 'lucide-react'

interface Stats {
  artists: number
  clips: number
  songs: number
  tasks: number
  memories: number
  tasks_done: number
}

const modules = [
  { href: '/clip',     icon: Clapperboard, label: 'CLIP',     desc: 'Storyboard & Vidéo',   gradient: 'from-violet-600 to-purple-500',  border: 'border-violet-500/30' },
  { href: '/music',    icon: Music2,        label: 'MUSIC',    desc: 'Suno & Production',    gradient: 'from-pink-600 to-rose-500',      border: 'border-pink-500/30' },
  { href: '/artists',  icon: Users,         label: 'ARTISTS',  desc: 'Roster & Projets',     gradient: 'from-sky-600 to-blue-500',       border: 'border-sky-500/30' },
  { href: '/business', icon: Briefcase,     label: 'BUSINESS', desc: 'Contrats & Factures',  gradient: 'from-amber-600 to-orange-500',   border: 'border-amber-500/30' },
  { href: '/admin',    icon: ClipboardList, label: 'ADMIN',    desc: 'Tâches & Agenda',      gradient: 'from-emerald-600 to-teal-500',   border: 'border-emerald-500/30' },
  { href: '/memory',   icon: Brain,         label: 'MEMORY',   desc: 'Contexte & Mémoire',   gradient: 'from-fuchsia-600 to-purple-600', border: 'border-fuchsia-500/30' },
]

export default function Home() {
  const [stats, setStats] = useState<Stats>({ artists: 0, clips: 0, songs: 0, tasks: 0, memories: 0, tasks_done: 0 })
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  useEffect(() => {
    async function fetchStats() {
      const [artists, clips, songs, tasks, memories, tasks_done] = await Promise.all([
        supabase.from('artists').select('id', { count: 'exact', head: true }),
        supabase.from('clips').select('id', { count: 'exact', head: true }),
        supabase.from('songs').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('done', false),
        supabase.from('memories').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('done', true),
      ])
      setStats({
        artists: artists.count ?? 0,
        clips: clips.count ?? 0,
        songs: songs.count ?? 0,
        tasks: tasks.count ?? 0,
        memories: memories.count ?? 0,
        tasks_done: tasks_done.count ?? 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      {/* Hero */}
      <div className="mb-10">
        <p className="text-white/40 text-sm font-medium tracking-widest uppercase mb-2">{greeting}</p>
        <h1 className="font-display font-black text-4xl md:text-6xl text-white leading-none">
          VIZION{' '}
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #9B5DE5, #C77DFF, #E040FB)' }}>
            OS
          </span>
        </h1>
        <p className="text-white/40 mt-3 text-base">Creative Intelligence Platform — v2.0</p>
      </div>

      {/* Modules */}
      <section className="mb-10">
        <h2 className="font-display font-bold text-xs tracking-widest text-white/30 uppercase mb-4">Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {modules.map(({ href, icon: Icon, label, desc, gradient, border }) => (
            <Link
              key={href}
              href={href}
              className={`glass-card rounded-3xl p-5 border ${border} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group`}
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
                <Icon size={22} className="text-white" />
              </div>
              <p className="font-display font-bold text-white text-base tracking-wide">{label}</p>
              <p className="text-white/40 text-xs mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Supabase */}
      <section className="mb-10">
        <h2 className="font-display font-bold text-xs tracking-widest text-white/30 uppercase mb-4">Statistiques</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Artistes', value: stats.artists, icon: Users, color: 'text-sky-400' },
            { label: 'Clips', value: stats.clips, icon: Clapperboard, color: 'text-violet-400' },
            { label: 'Songs', value: stats.songs, icon: Music2, color: 'text-pink-400' },
            { label: 'Tâches en cours', value: stats.tasks, icon: Clock, color: 'text-amber-400' },
            { label: 'Souvenirs', value: stats.memories, icon: Brain, color: 'text-fuchsia-400' },
            { label: 'Tâches terminées', value: stats.tasks_done, icon: TrendingUp, color: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass rounded-2xl p-4">
              <Icon size={16} className={`${color} mb-2`} />
              <p className={`font-display font-bold text-2xl ${color}`}>
                {loading ? '—' : value}
              </p>
              <p className="text-white/30 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* System */}
      <section>
        <h2 className="font-display font-bold text-xs tracking-widest text-white/30 uppercase mb-4">Système</h2>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/50 text-sm">GPT-5.5 connecté — Supabase actif</span>
          <span className="ml-auto text-white/20 text-xs">v2.0</span>
        </div>
      </section>
    </div>
  )
}
