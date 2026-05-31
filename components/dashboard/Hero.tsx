'use client'

export function Hero() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="mb-10">
      <p className="text-white/40 text-sm font-medium tracking-widest uppercase mb-2">
        {greeting}
      </p>
      <h1 className="font-display font-black text-4xl md:text-6xl text-white leading-none">
        VIZION{' '}
        <span
          className="text-transparent bg-clip-text"
          style={{
            backgroundImage: 'linear-gradient(135deg, #9B5DE5, #C77DFF, #E040FB)',
          }}
        >
          OS
        </span>
      </h1>
      <p className="text-white/40 mt-3 text-base">
        Creative Intelligence Platform — v2.0
      </p>
    </div>
  )
}
