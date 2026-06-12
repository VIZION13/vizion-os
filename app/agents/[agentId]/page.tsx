// ============================================
// VIZION OS v2 — LOT 28 : VIZION AGENTS
// app/agents/[agentId]/page.tsx
// Interface chat par agent
// ============================================

"use client";

import { useState, useRef, useEffect, use } from "react";
import Link from "next/link";
import { AGENTS, AgentId } from "@/lib/agents/agents-config";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface ToolResult {
  name: string;
  result: string;
}

export default function AgentChatPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const agent = AGENTS[agentId as AgentId];

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastTools, setLastTools] = useState<ToolResult[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#05060f] text-white flex items-center justify-center">
        <p>Agent introuvable. <Link href="/agents" className="text-cyan-400 underline">Retour au hub</Link></p>
      </div>
    );
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setLastTools([]);

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          conversationId,
          messages: newMessages,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((m) => [...m, { role: "assistant", content: `❌ Erreur : ${data.error}` }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "" }]);
        setConversationId(data.conversationId ?? null);
        setLastTools(data.toolResults ?? []);
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `❌ Erreur réseau : ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05060f] text-white flex flex-col relative overflow-hidden">
      {/* Fond */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute -top-32 left-1/3 w-[400px] h-[400px] bg-gradient-to-br ${agent.color} opacity-[0.07] rounded-full blur-3xl`} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/[0.02] backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/agents" className="text-white/40 hover:text-cyan-400 transition-colors text-sm">
            ← Agents
          </Link>
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center text-lg`}>
            {agent.emoji}
          </div>
          <div>
            <h1 className="font-bold tracking-wide">{agent.name}</h1>
            <p className="text-xs text-white/40">{agent.tagline}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En ligne
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-3xl mb-4 shadow-lg`}>
                {agent.emoji}
              </div>
              <p className="text-white/60 font-medium">{agent.name} est prêt.</p>
              <p className="text-white/30 text-sm mt-1">Décris ce que tu veux, l'agent agit avec ses outils.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/20"
                    : "bg-white/[0.04] border border-white/10"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Actions exécutées */}
          {lastTools.length > 0 && !loading && (
            <div className="space-y-1.5">
              {lastTools.map((t, i) => (
                <div key={i} className="text-xs text-emerald-300/70 bg-emerald-400/5 border border-emerald-400/10 rounded-lg px-3 py-2">
                  ⚡ <span className="font-mono">{t.name}</span> — {t.result.slice(0, 120)}
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              {agent.name} agit...
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="relative z-10 border-t border-white/10 bg-white/[0.02] backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Demande quelque chose à ${agent.name}...`}
            className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400/50 placeholder:text-white/25"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className={`px-6 rounded-xl font-medium text-sm bg-gradient-to-br ${agent.color} disabled:opacity-30 transition-opacity`}
          >
            Envoyer
          </button>
        </div>
      </footer>
    </div>
  );
}
