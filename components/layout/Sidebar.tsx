'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, Settings, Brain } from 'lucide-react'

const nav = [
  { href: '/clip',    img: '/nav-clip.png',    label: 'Clip' },
  { href: '/music',   img: '/nav-music.png',   label: 'Music' },
  { href: '/image',   img: '/nav-image.png',   label: 'Image' },
  { href: '/artists', img: '/nav-artist.png',  label: 'Artiste' },
  { href: '/admin',   img: '/nav-admin.png',   label: 'Admin' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-20 min-h-screen bg-black/40 backdrop-blur-xl border-r border-white/5 py-6 items-center gap-1">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
      </div>

      {/* Main nav */}
      <div className="flex flex-col gap-3 flex-1">
        {nav.map(({ href, img, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1.5 group">
              <div className={`w-14 h-14 rounded-2xl overflow-hidden transition-all duration-200 ${active ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-black scale-110' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`}>
                <img src={img} alt={label} className="w-full h-full object-cover" />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${active ? 'text-violet-300' : 'text-white/40 group-hover:text-white/70'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-3 items-center mt-4">
        <Link href="/memory" className="flex flex-col items-center gap-1 group">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <Brain size={16} className="text-white/40 group-hover:text-white/70" />
          </div>
          <span className="text-[9px] text-white/25 group-hover:text-white/50">Memory</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 group">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <Settings size={16} className="text-white/40 group-hover:text-white/70" />
          </div>
          <span className="text-[9px] text-white/25 group-hover:text-white/50">Settings</span>
        </Link>
      </div>

      {/* Status */}
      <div className="mt-4">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    </aside>
  )
}
