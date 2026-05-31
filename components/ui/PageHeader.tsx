'use client'

import { ReactNode } from 'react'

interface PageHeaderProps {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
  gradient: string
}

export function PageHeader({ icon, title, subtitle, action, gradient }: PageHeaderProps) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-black text-2xl md:text-3xl text-white leading-none">{title}</h1>
            {subtitle && <p className="text-white/40 text-xs mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
