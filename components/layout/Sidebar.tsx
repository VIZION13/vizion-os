'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clapperboard, Music2, Users, Briefcase, ClipboardList, Brain, Settings, Zap, Wand2, User } from 'lucide-react'

const nav = [
  { href: '/',             icon: Home,          label: 'Home',      color: 'from-violet-600 to-indigo-600' },
  { href: '/clip',         icon: Clapperboard,  label: 'Clip',      color: 'from-violet-600 to-purple-500' },
  { href: '/music',        icon: Music2,         label: 'Music',     color: 'from-pink-600 to-rose-500' },
  { href: '/artists',      icon: Users,          label: 'Artists',   color: 'from-sky-600 to-blue-500' },
  { href: '/business',     icon: Briefcase,      label: 'Business',  color: 'from-orange-600 to-amber-500' },
  { href: '/admin',        icon: ClipboardList,  label: 'Admin',     color: 'from-emerald-600 to-teal-500' },
  { href: '/automix',      icon: Zap,            label: 'AutoMix',   color: 'from-violet-600 to-pink-600' },
  { href: '/image',        icon: Wand2,          label: 'Image',     color: 'from-fuchsia-600 to-violet-600' },
  { href: '/artist-image', icon: User,           label: 'Artist IA', color: 'from-fuchsia-600 to-pink-600' },
  { href: '/memory',       icon: Brain,          label: 'Memory',    color: 'from-fuchsia-600 to-purple-600' },
  { href: '/settings',     icon: Settings,       label: 'Settings',  color: 'from-slate-600 to-slate-500' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-black/20 border-r border-white/5 p-4 gap-1">
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-display font-black text-white text-sm">VIZION OS</span>
        <span className="text-white/20 text-xs ml-auto">v2.0</span>
      </div>
      {nav.map(({ href, icon: Icon, label, color }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon size={14} className="text-white" />
            </div>
            <span className={`text-sm font-medium ${active ? 'text-white' : 'text-white/50'}`}>{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
          </Link>
        )
      })}
      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/30 text-xs">GPT-4o connecté</span>
        </div>
      </div>
    </aside>
  )
}
