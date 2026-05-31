'use client'

import { Settings, Key, Zap, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const [cleared, setCleared] = useState(false)

  function clearAll() {
    localStorage.clear()
    setCleared(true)
    setTimeout(() => setCleared(false), 2000)
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <Settings size={20} className="text-white" />
          </div>
          <h1 className="font-display font-black text-3xl text-white">SETTINGS</h1>
        </div>
        <p className="text-white/40 text-sm">Configuration de VIZION OS</p>
      </div>

      <div className="space-y-4 max-w-xl">
        {/* Model */}
        <div className="glass-card rounded-3xl border border-white/8 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap size={18} className="text-vizion-neon" />
            <h2 className="text-white font-semibold">Modèle IA</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80">GPT-5.5</p>
              <p className="text-white/40 text-xs mt-0.5">Via variable OPENAI_MODEL</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* API Keys info */}
        <div className="glass-card rounded-3xl border border-white/8 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key size={18} className="text-amber-400" />
            <h2 className="text-white font-semibold">Variables d'environnement</h2>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { key: 'OPENAI_API_KEY', desc: 'Clé OpenAI' },
              { key: 'OPENAI_MODEL', desc: 'Modèle (gpt-5.5)' },
              { key: 'NEXT_PUBLIC_SUPABASE_URL', desc: 'URL Supabase' },
              { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', desc: 'Clé Supabase' },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="font-mono text-violet-400 text-xs">{key}</span>
                <span className="text-white/30 text-xs">{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-white/25 text-xs mt-4">Configurable dans Vercel → Settings → Environment Variables</p>
        </div>

        {/* Clear data */}
        <div className="glass-card rounded-3xl border border-red-500/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 size={18} className="text-red-400" />
            <h2 className="text-white font-semibold">Données locales</h2>
          </div>
          <p className="text-white/40 text-sm mb-4">Efface toutes les données sauvegardées localement (clips, musiques, artistes, tâches, mémoire).</p>
          <button
            onClick={clearAll}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-5 py-2.5 rounded-2xl hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={14} />
            {cleared ? 'Effacé ✓' : 'Effacer les données'}
          </button>
        </div>

        {/* Version */}
        <div className="glass rounded-3xl border border-white/5 p-4 text-center">
          <p className="text-white/20 text-xs">VIZION OS v2.0 — Built with Next.js + OpenAI + Supabase</p>
        </div>
      </div>
    </div>
  )
}
