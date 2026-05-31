'use client'

import Link from 'next/link'
import { Clapperboard, Music2, Users, Briefcase, ClipboardList, Brain } from 'lucide-react'

const modules = [
  {
    href: '/clip',
    icon: Clapperboard,
    label: 'CLIP',
    desc: 'Storyboard & Vidéo',
    gradient: 'from-violet-600 to-purple-500',
    glow: 'shadow-neon-purple',
    border: 'border-violet-500/30',
  },
  {
    href: '/music',
    icon: Music2,
    label: 'MUSIC',
    desc: 'Suno & Production',
    gradient: 'from-pink-600 to-rose-500',
    glow: 'shadow-neon-pink',
    border: 'border-pink-500/30',
  },
  {
    href: '/artists',
    icon: Users,
    label: 'ARTISTS',
    desc: 'Roster & Projets',
    gradient: 'from-sky-600 to-blue-500',
    glow: 'shadow-neon-blue',
    border: 'border-sky-500/30',
  },
  {
    href: '/business',
    icon: Briefcase,
    label: 'BUSINESS',
    desc: 'Contrats & Factures',
    gradient: 'from-amber-600 to-orange-500',
    glow: '',
    border: 'border-amber-500/30',
  },
  {
    href: '/admin',
    icon: ClipboardList,
    label: 'ADMIN',
    desc: 'Tâches & Agenda',
    gradient: 'from-emerald-600 to-teal-500',
    glow: '',
    border: 'border-emerald-500/30',
  },
  {
    href: '/memory',
    icon: Brain,
    label: 'MEMORY',
    desc: 'Contexte & Mémoire',
    gradient: 'from-fuchsia-600 to-purple-600',
    glow: 'shadow-neon-purple',
    border: 'border-fuchsia-500/30',
  },
]

export function QuickActions() {
  return (
    <section className="mb-10">
      <h2 className="font-display font-bold text-xs tracking-widest text-white/30 uppercase mb-4">
        Modules
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {modules.map(({ href, icon: Icon, label, desc, gradient, glow, border }) => (
          <Link
            key={href}
            href={href}
            className={`glass-card rounded-3xl p-5 border ${border} ${glow} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group`}
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow`}>
              <Icon size={22} className="text-white" />
            </div>
            <p className="font-display font-bold text-white text-base tracking-wide">{label}</p>
            <p className="text-white/40 text-xs mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
