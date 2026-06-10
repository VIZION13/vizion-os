'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/clip',    img: '/nav-clip.png',    label: 'Clip' },
  { href: '/music',   img: '/nav-music.png',   label: 'Music' },
  { href: '/image',   img: '/nav-image.png',   label: 'Image' },
  { href: '/artists', img: '/nav-artist.png',  label: 'Artiste' },
  { href: '/admin',   img: '/nav-admin.png',   label: 'Admin' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Glassmorphism background */}
      <div className="bg-black/70 backdrop-blur-2xl border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-around">
          {nav.map(({ href, img, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1.5 group">
                {/* Photo icon rond style iOS */}
                <div className={`relative transition-all duration-200 ${active ? 'scale-110' : 'group-active:scale-95'}`}>
                  {/* Glow effect quand actif */}
                  {active && (
                    <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-md scale-125" />
                  )}
                  <div className={`relative w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all ${active ? 'border-violet-400/80' : 'border-transparent'}`}>
                    <img src={img} alt={label} className="w-full h-full object-cover" />
                    {/* Overlay sombre si inactif */}
                    {!active && (
                      <div className="absolute inset-0 bg-black/30" />
                    )}
                  </div>
                  {/* Dot indicateur */}
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-violet-400" />
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-violet-300' : 'text-white/40'}`}>
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
