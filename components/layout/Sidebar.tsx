'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Clapperboard, Music2, Users, Briefcase, ClipboardList, Brain, Settings, Zap } from 'lucide-react'

const nav = [
  { href: '/',         icon: Zap,          label: 'Dashboard', color: 'from-violet-500 to-fuchsia-500' },
  { href: '/clip',     icon: Clapperboard, label: 'Clip',      color: 'from-violet-600 to-purple-500' },
  { href: '/music',    icon: Music2,        label: 'Music',     color: 'from-pink-600 to-rose-500' },
  { href: '/artists',  icon: Users,         label: 'Artists',   color: 'from-sky-600 to-blue-500' },
  { href: '/business', icon: Briefcase,     label: 'Business',  color: 'from-amber-600 to-orange-500' },
  { href: '/admin',    icon: ClipboardList, label: 'Admin',     color: 'from-emerald-600 to-teal-500' },
  { href: '/memory',   icon: Brain,         label: 'Memory',    color: 'from-fuchsia-600 to-purple-600' },
  { href: '/settings', icon: Settings,      label: 'Settings',  color: 'from-slate-600 to-slate-500' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col z-40 glass-strong border-r border-white/[0.07]">
      {/* Logo */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-neon-purple animate-breathe">
            <span className="text-white text-sm font-black font-display">V</span>
          </div>
          <div>
            <p className="font-display font-bold text-sm tracking-widest text-white">VIZION OS</p>
            <p className="text-xs text-white/25 font-mono">v2.0</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-gradient-to-r from-violet-500/20 via-white/5 to-transparent mb-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map(({ href, icon: Icon, label, color }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 group relative',
                active
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
              )}
            >
              {active && (
                <div className="absolute inset-0 rounded-2xl bg-white/[0.06] border border-white/[0.10]" />
              )}
              <div className={cn(
                'w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10 transition-all duration-200',
                active
                  ? `bg-gradient-to-br ${color} shadow-sm`
                  : 'bg-white/5 group-hover:bg-white/8'
              )}>
                <Icon size={14} className={active ? 'text-white' : 'text-white/40 group-hover:text-white/70'} />
              </div>
              <span className="relative z-10">{label}</span>
              {active && (
                <div className="ml-auto w-1 h-1 rounded-full bg-white/60 relative z-10" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-6">
        <div className="glass rounded-2xl px-4 py-3 border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-2 h-2 rounded-full bg-emerald-400 block" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 block absolute inset-0 animate-ping opacity-50" />
            </div>
            <span className="text-xs text-white/35">GPT-5.5 connecté</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
