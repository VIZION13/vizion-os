'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Clapperboard,
  Music2,
  Users,
  Briefcase,
  ClipboardList,
  Brain,
  Settings,
  Zap,
} from 'lucide-react'

const nav = [
  { href: '/',          icon: Zap,           label: 'Dashboard' },
  { href: '/clip',      icon: Clapperboard,  label: 'Clip' },
  { href: '/music',     icon: Music2,         label: 'Music' },
  { href: '/artists',   icon: Users,          label: 'Artists' },
  { href: '/business',  icon: Briefcase,      label: 'Business' },
  { href: '/admin',     icon: ClipboardList,  label: 'Admin' },
  { href: '/memory',    icon: Brain,          label: 'Memory' },
  { href: '/settings',  icon: Settings,       label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col glass-strong border-r border-white/8 z-40">
      {/* Logo */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-vizion-purple to-vizion-pink flex items-center justify-center shadow-neon-purple">
            <span className="text-white text-xs font-black font-display">V</span>
          </div>
          <div>
            <p className="font-display font-bold text-sm tracking-wider text-white">VIZION OS</p>
            <p className="text-xs text-white/40">v2.0</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 group',
                active
                  ? 'bg-vizion-purple/20 text-vizion-neon border border-vizion-purple/30 shadow-neon-purple'
                  : 'text-white/50 hover:text-white/90 hover:bg-white/5'
              )}
            >
              <Icon
                size={18}
                className={cn(
                  'transition-colors',
                  active ? 'text-vizion-neon' : 'text-white/40 group-hover:text-white/70'
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom status */}
      <div className="px-6 py-6">
        <div className="glass rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/50">GPT-5.5 connecté</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
