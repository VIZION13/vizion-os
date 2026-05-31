'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Clapperboard, Music2, Users, Briefcase, ClipboardList, Brain, Zap } from 'lucide-react'

const nav = [
  { href: '/',         icon: Zap,          label: 'Home',     color: 'from-violet-500 to-fuchsia-500' },
  { href: '/clip',     icon: Clapperboard, label: 'Clip',     color: 'from-violet-600 to-purple-500' },
  { href: '/music',    icon: Music2,        label: 'Music',    color: 'from-pink-600 to-rose-500' },
  { href: '/artists',  icon: Users,         label: 'Artists',  color: 'from-sky-600 to-blue-500' },
  { href: '/business', icon: Briefcase,     label: 'Business', color: 'from-amber-600 to-orange-500' },
  { href: '/admin',    icon: ClipboardList, label: 'Admin',    color: 'from-emerald-600 to-teal-500' },
  { href: '/memory',   icon: Brain,         label: 'Memory',   color: 'from-fuchsia-600 to-purple-600' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div
        className="border-t border-white/[0.07] px-2 py-2 pb-safe"
        style={{
          background: 'rgba(6,6,15,0.85)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        }}
      >
        <div className="flex items-center justify-around">
          {nav.map(({ href, icon: Icon, label, color }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-200 btn-press min-w-0"
              >
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
                  active
                    ? `bg-gradient-to-br ${color} shadow-sm`
                    : 'bg-white/5'
                )}>
                  <Icon size={16} className={active ? 'text-white' : 'text-white/35'} />
                </div>
                <span className={cn(
                  'text-[9px] font-medium transition-colors truncate',
                  active ? 'text-white' : 'text-white/30'
                )}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
