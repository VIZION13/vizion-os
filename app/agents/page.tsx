// ============================================
// VIZION OS v2 — LOT 28 : VIZION AGENTS
// app/agents/page.tsx
// Hub des agents — style holographique VIZION
// ============================================

"use client";

import Link from "next/link";
import { AGENT_LIST } from "@/lib/agents/agents-config";

export default function AgentsHubPage() {
  return (
    <div className="min-h-screen bg-[#05060f] text-white relative overflow-hidden">
      {/* Fond holographique */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-14">
        {/* Header */}
        <div className="mb-12">
          <p className="text-cyan-400/70 text-xs tracking-[0.4em] uppercase mb-3">
            VIZION OS · Module Agents
          </p>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-300 via-white to-purple-400 bg-clip-text text-transparent">
            VIZION AGENTS
          </h1>
          <p className="text-white/50 mt-3 max-w-xl">
            Quatre agents autonomes au service du studio. Chaque agent agit via
            ses propres outils — les envois réels passent par ta validation.
          </p>
        </div>

        {/* Grille agents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {AGENT_LIST.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 hover:border-cyan-400/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)]"
            >
              {/* Glow gradient au hover */}
              <div
                className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 bg-gradient-to-br ${agent.color} transition-opacity duration-300`}
              />
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-2xl shadow-lg`}
                  >
                    {agent.emoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-wide">
                      {agent.name}
                    </h2>
                    <p className="text-white/50 text-sm">{agent.tagline}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/30 tracking-widest uppercase">
                    {agent.tools.length} outils actifs
                  </span>
                  <span className="text-cyan-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Ouvrir →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer status */}
        <div className="mt-12 flex items-center gap-2 text-xs text-white/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Système agents en ligne · GPT-4o · Supabase connecté
        </div>
      </div>
    </div>
  );
}
