'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clapperboard, Music2, Users, ClipboardList, Wand2, Brain } from 'lucide-react'

const nav = [
  { href: '/',        icon: Home,         label: 'Home',    color: 'from-violet-600 to-indigo-600' },
  { href: '/clip',    icon: Clapperboard, label: 'Clip',    color: 'from-violet-600 to-purple-500' },
  { href: '/music',   icon: Music2,        label: 'Music',   color: 'from-pink-600 to-rose-500' },
  { href: '/image',   icon: Wand2,         label: 'Image',   color: 'from-fuchsia-600 to-violet-600' },
  { href: '/artists', icon: Users,         label: 'Artiste', color: 'from-sky-600 to-blue-500' },
  { href: '/admin',   icon: ClipboardList, label: 'Admin',   color: 'from-emerald-600 to-teal-500' },
  { href: '/memory',  icon: Brain,         label: 'Memory',  color: 'from-fuchsia-600 to-purple-600' },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/8 pb-safe">
      <div className="flex overflow-x-auto scrollbar-hide px-2 py-2 gap-1">
        {nav.map(({ href, icon: Icon, label, color }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl flex-shrink-0 transition-all ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}>
              <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                <Icon size={14} className="text-white" />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-white' : 'text-white/40'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
