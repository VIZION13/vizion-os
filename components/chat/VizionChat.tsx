'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Sparkles, Minimize2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Génère un storyboard trap sombre',
  'Crée un prompt Suno afro',
  'Rédige une facture pour un clip',
  'Aide-moi à écrire une bio artiste',
]

export function VizionChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [module, setModule] = useState('vizion')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Detect current module from URL
  useEffect(() => {
    const path = window.location.pathname
    if (path.includes('clip')) setModule('clip')
    else if (path.includes('music')) setModule('music')
    else if (path.includes('business')) setModule('business')
    else if (path.includes('memory')) setModule('memory')
    else setModule('vizion')
  }, [open])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module,
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      })
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') break
        try {
          const text = JSON.parse(data).text
          full += text
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: full }
          ])
        } catch {}
      }
    }
    setLoading(false)
  }

  function useSuggestion(s: string) {
    setInput(s)
    inputRef.current?.focus()
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-neon-purple hover:scale-110 active:scale-95 transition-transform"
        >
          <Sparkles size={22} className="text-white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] md:w-[420px] h-[70vh] md:h-[560px] flex flex-col glass-strong rounded-3xl border border-violet-500/20 shadow-neon-purple overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">VIZION AI</p>
                <p className="text-white/30 text-xs">GPT-5.5 — mode {module}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/30 hover:text-white/70 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div>
                <p className="text-white/30 text-xs text-center mb-4">Demande ce que tu veux</p>
                <div className="space-y-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => useSuggestion(s)}
                      className="w-full text-left text-sm text-white/60 bg-white/5 hover:bg-white/8 border border-white/8 rounded-2xl px-4 py-2.5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600/30 border border-violet-500/30 text-white'
                      : 'bg-white/5 border border-white/8 text-white/80'
                  }`}
                >
                  {msg.role === 'assistant' && msg.content === '' ? (
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/8">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Envoie un message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors text-sm"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-white/20 hover:text-white/40 text-xs mt-2 transition-colors"
              >
                Effacer la conversation
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
