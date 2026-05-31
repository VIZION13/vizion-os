'use client'

import { Zap, BarChart2, Clock } from 'lucide-react'

const stats = [
  { icon: Zap,       value: 'GPT-5.5', label: 'Modèle actif',     color: 'text-vizion-neon' },
  { icon: BarChart2, value: '—',        label: 'Projets actifs',   color: 'text-sky-400' },
  { icon: Clock,     value: '—',        label: 'Tâches en cours',  color: 'text-emerald-400' },
]

export function Stats() {
  return (
    <section>
      <h2 className="font-display font-bold text-xs tracking-widest text-white/30 uppercase mb-4">
        Système
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="glass rounded-2xl p-4 text-center">
            <Icon size={16} className={`${color} mx-auto mb-2`} />
            <p className={`font-display font-bold text-sm ${color}`}>{value}</p>
            <p className="text-white/30 text-[10px] mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
