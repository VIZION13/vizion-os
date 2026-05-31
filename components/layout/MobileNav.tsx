'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Clapperboard, Music2, Users, Briefcase, ClipboardList, Brain, Zap } from 'lucide-react'

const nav = [
  { href: '/',         icon: Zap,          label: 'Home' },
  { href: '/clip',     icon: Clapperboard, label: 'Clip' },
  { href: '/music',    icon: Music2,        label: 'Music' },
  { href: '/artists',  icon: Users,         label: 'Artists' },
  { href: '/business', icon: Briefcase,     label: 'Business' },
  { href: '/admin',    icon: ClipboardList, label: 'Admin' },
  { href: '/memory',   icon: Brain,         label: 'Memory' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="glass-strong border-t border-white/8 px-2 py-2">
        <div className="flex items-center justify-around">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all duration-200',
                  active ? 'text-vizion-neon' : 'text-white/40'
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
