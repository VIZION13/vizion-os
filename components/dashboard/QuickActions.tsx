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
    glow: '0 0 30px rgba(139,92,246,0.4)',
    border: 'rgba(139,92,246,0.25)',
    delay: '0ms',
  },
  {
    href: '/music',
    icon: Music2,
    label: 'MUSIC',
    desc: 'Suno & Production',
    gradient: 'from-pink-600 to-rose-500',
    glow: '0 0 30px rgba(236,72,153,0.4)',
    border: 'rgba(236,72,153,0.25)',
    delay: '60ms',
  },
  {
    href: '/artists',
    icon: Users,
    label: 'ARTISTS',
    desc: 'Roster & Projets',
    gradient: 'from-sky-600 to-blue-500',
    glow: '0 0 30px rgba(14,165,233,0.4)',
    border: 'rgba(14,165,233,0.25)',
    delay: '120ms',
  },
  {
    href: '/business',
    icon: Briefcase,
    label: 'BUSINESS',
    desc: 'Contrats & Factures',
    gradient: 'from-amber-600 to-orange-500',
    glow: '0 0 30px rgba(245,158,11,0.4)',
    border: 'rgba(245,158,11,0.25)',
    delay: '180ms',
  },
  {
    href: '/admin',
    icon: ClipboardList,
    label: 'ADMIN',
    desc: 'Tâches & Agenda',
    gradient: 'from-emerald-600 to-teal-500',
    glow: '0 0 30px rgba(16,185,129,0.4)',
    border: 'rgba(16,185,129,0.25)',
    delay: '240ms',
  },
  {
    href: '/memory',
    icon: Brain,
    label: 'MEMORY',
    desc: 'Contexte & Mémoire',
    gradient: 'from-fuchsia-600 to-purple-600',
    glow: '0 0 30px rgba(192,38,211,0.4)',
    border: 'rgba(192,38,211,0.25)',
    delay: '300ms',
  },
]

export function QuickActions() {
  return (
    <section className="mb-10">
      <p className="text-white/25 text-xs font-medium tracking-widest uppercase mb-4">Modules</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {modules.map(({ href, icon: Icon, label, desc, gradient, glow, border, delay }) => (
          <Link
            key={href}
            href={href}
            className="module-card animate-slide-up rounded-3xl p-5 relative overflow-hidden group"
            style={{
              animationDelay: delay,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
              border: `1px solid ${border}`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Glow on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"
              style={{ boxShadow: `inset 0 0 40px rgba(255,255,255,0.03), ${glow}` }}
            />

            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
              <Icon size={22} className="text-white" />
            </div>
            <p className="font-display font-bold text-white text-base tracking-wide relative z-10">{label}</p>
            <p className="text-white/35 text-xs mt-0.5 relative z-10">{desc}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
