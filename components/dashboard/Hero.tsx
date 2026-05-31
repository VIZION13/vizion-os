'use client'

import { useEffect, useState } from 'react'

export function Hero() {
  const [greeting, setGreeting] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const h = new Date().getHours()
      setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening')
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const i = setInterval(update, 10000)
    return () => clearInterval(i)
  }, [])

  return (
    <div className="mb-10 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/30 text-xs font-medium tracking-widest uppercase">{greeting}</p>
        <span className="text-white/20 text-xs font-mono">{time}</span>
      </div>
      <h1 className="font-display font-black text-5xl md:text-7xl text-white leading-none tracking-tight">
        VIZION{' '}
        <span className="gradient-text">OS</span>
      </h1>
      <p className="text-white/30 mt-3 text-sm tracking-wide">
        Creative Intelligence Platform <span className="text-white/15">—</span> v2.0
      </p>

      {/* Decorative line */}
      <div className="flex items-center gap-3 mt-6">
        <div className="h-px flex-1 bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-transparent" />
        <span className="text-white/15 text-xs font-mono">●</span>
      </div>
    </div>
  )
}
