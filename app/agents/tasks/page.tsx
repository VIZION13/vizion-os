"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Task {
  id: string;
  agent_id: string;
  type: string;
  title: string;
  payload: any;
  status: string;
  created_at: string;
}

const AGENT_BADGE: Record<string, string> = {
  community: "📱 NOVA",
  prospection: "🎯 ORION",
  booking: "📅 ATLAS",
  mailing: "✉️ ECHO",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  approved: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  done: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
  rejected: "text-red-300 bg-red-400/10 border-red-400/20",
};

export default function AgentTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/agents/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    await fetch("/api/agents/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function sendEmail(t: Task) {
    let to = t.payload?.to;
    if (!to || !String(to).includes("@")) {
      to = window.prompt("Adresse email du destinataire :") ?? "";
      if (!to.includes("@")) return;
    }
    setSending(t.id);
    setNotice(null);
    try {
      const res = await fetch("/api/agents/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: t.id, to }),
      });
      const data = await res.json();
      setNotice(data.ok ? `✅ ${data.message}` : `❌ ${data.error}`);
    } catch (e: any) {
      setNotice(`❌ ${e.message}`);
    } finally {
      setSending(null);
      load();
    }
  }

  function copyTask(t: Task) {
    const text =
      t.type === "email_draft"
        ? `Objet : ${t.payload?.subject ?? ""}\n\n${t.payload?.body ?? ""}`
        : JSON.stringify(t.payload, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(t.id);
    setTimeout(() => setCopied(null), 1500);
  }

  const pending = tasks.filter((t) => t.status === "pending");
  const others = tasks.filter((t) => t.status !== "pending");

  return (
    <div className="min-h-screen bg-[#05060f] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 pb-28">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/agents" className="text-white/40 hover:text-cyan-400 transition-colors text-sm">
            ← Agents
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              Validation des tâches
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {pending.length} en attente · rien ne part sans ton accord
            </p>
          </div>
        </div>

        {notice && (
          <div className="mb-6 text-sm bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3">
            {notice}
          </div>
        )}

        {loading && <p className="text-white/40">Chargement...</p>}

        {!loading && tasks.length === 0 && (
          <div className="text-center py-20 text-white/30">
            Aucune tâche pour l'instant. Demande à ECHO de rédiger un email pour tester.
          </div>
        )}

        {[...pending, ...others].map((t) => (
          <div
            key={t.id}
            className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5"
          >
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-xs text-white/50">{AGENT_BADGE[t.agent_id] ?? t.agent_id}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[t.status] ?? ""}`}>
                {t.status}
              </span>
              <span className="text-xs text-white/30 ml-auto">
                {new Date(t.created_at).toLocaleString("fr-FR")}
              </span>
            </div>

            <h2 className="font-semibold mb-2">{t.title}</h2>

            {t.type === "email_draft" ? (
              <div className="text-sm text-white/60 bg-black/30 rounded-xl p-4 whitespace-pre-wrap leading-relaxed">
                {t.payload?.to && <p className="text-white/40 mb-1">À : {t.payload.to}</p>}
                <p className="text-white/80 font-medium mb-2">Objet : {t.payload?.subject}</p>
                {t.payload?.body}
              </div>
            ) : (
              <pre className="text-xs text-white/50 bg-black/30 rounded-xl p-4 overflow-x-auto">
                {JSON.stringify(t.payload, null, 2)}
              </pre>
            )}

            <div className="flex gap-2 mt-4 flex-wrap">
              {t.status === "pending" && (
                <>
                  <button
                    onClick={() => setStatus(t.id, "approved")}
                    className="px-4 py-2 rounded-lg text-sm bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    ✓ Valider
                  </button>
                  <button
                    onClick={() => setStatus(t.id, "rejected")}
                    className="px-4 py-2 rounded-lg text-sm bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 transition-colors"
                  >
                    ✕ Rejeter
                  </button>
                </>
              )}
              {t.status === "approved" && t.type === "email_draft" && (
                <button
                  onClick={() => sendEmail(t)}
                  disabled={sending === t.id}
                  className="px-4 py-2 rounded-lg text-sm bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
                >
                  {sending === t.id ? "Envoi..." : "📤 Envoyer"}
                </button>
              )}
              {t.status === "approved" && t.type !== "email_draft" && (
                <button
                  onClick={() => setStatus(t.id, "done")}
                  className="px-4 py-2 rounded-lg text-sm bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                >
                  Marquer fait
                </button>
              )}
              <button
                onClick={() => copyTask(t)}
                className="px-4 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
              >
                {copied === t.id ? "✓ Copié !" : "Copier"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
