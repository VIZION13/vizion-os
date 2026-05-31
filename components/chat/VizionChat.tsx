'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Mic, MicOff, Volume2, VolumeX, Loader } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  '🎬 Génère un storyboard trap sombre',
  '🎵 Crée un prompt Suno afro festif',
  '💼 Rédige une facture pour un clip',
  '👤 Écris une bio artiste percutante',
]

export function VizionChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [module, setModule] = useState('vizion')

  // Voice states
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const path = window.location.pathname
    if (path.includes('clip')) setModule('clip')
    else if (path.includes('music')) setModule('music')
    else if (path.includes('business')) setModule('business')
    else if (path.includes('memory')) setModule('memory')
    else setModule('vizion')
  }, [open])

  // ── WHISPER RECORDING ──
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })
      chunksRef.current = []

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        const ext = mimeType.includes('webm') ? 'webm' : 'mp4'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const file = new File([blob], `audio.${ext}`, { type: mimeType })

        setTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', file)
          const res = await fetch('/api/voice', { method: 'POST', body: formData })
          const data = await res.json()
          if (data.text && data.text.trim()) {
            setInput(data.text.trim())
            // Auto send after transcription
            setTimeout(() => sendMessage(data.text.trim()), 300)
          }
        } catch (err) {
          console.error('Transcription error:', err)
        }
        setTranscribing(false)
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setRecording(true)
    } catch (err) {
      console.error('Microphone error:', err)
      alert('Autorise l\'accès au micro dans Safari : Réglages → Safari → Microphone')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  function toggleMic() {
    if (recording) stopRecording()
    else startRecording()
  }

  // ── TTS ──
  function speak(text: string) {
    if (!synthRef.current || !voiceEnabled) return
    synthRef.current.cancel()
    const short = text.length > 250 ? text.slice(0, 250) + '…' : text
    const utt = new SpeechSynthesisUtterance(short)
    utt.lang = 'fr-FR'
    utt.rate = 1.05
    const voices = synthRef.current.getVoices()
    const fr = voices.find(v => v.lang.startsWith('fr'))
    if (fr) utt.voice = fr
    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    synthRef.current.speak(utt)
  }

  function stopSpeaking() {
    synthRef.current?.cancel()
    setSpeaking(false)
  }

  // ── SEND ──
  async function sendMessage(overrideText?: string) {
    const text = (overrideText || input).trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
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
          const t = JSON.parse(data).text
          full += t
          setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: full }])
        } catch {}
      }
    }

    setLoading(false)
    if (voiceEnabled && full) setTimeout(() => speak(full), 400)
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-neon-purple active:scale-95 transition-transform"
        >
          <Sparkles size={22} className="text-white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-x-3 bottom-24 md:inset-x-auto md:right-8 md:bottom-8 md:w-[400px] z-50 flex flex-col glass-strong rounded-3xl border border-violet-500/20 shadow-neon-purple overflow-hidden"
          style={{ height: 'min(560px, calc(100dvh - 130px))' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0 ${speaking ? 'animate-pulse' : ''}`}>
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm">VIZION AI</p>
                <p className="text-white/30 text-xs truncate">
                  {recording ? '🔴 Enregistrement...' : transcribing ? '⏳ Transcription...' : speaking ? '🔊 Lecture...' : `GPT — ${module}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { setVoiceEnabled(!voiceEnabled); stopSpeaking() }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${voiceEnabled ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-white/30'}`}
              >
                {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
              <button onClick={() => { setOpen(false); stopSpeaking() }} className="text-white/30 hover:text-white/70 transition-colors w-7 h-7 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-white/25 text-xs text-center mb-3">Écris ou parle à VIZION 🎤</p>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setInput(s.slice(2)); inputRef.current?.focus() }}
                    className="w-full text-left text-sm text-white/55 bg-white/4 hover:bg-white/7 border border-white/7 rounded-2xl px-3 py-2.5 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600/25 border border-violet-500/25 text-white'
                    : 'bg-white/5 border border-white/7 text-white/80'
                }`}>
                  {msg.role === 'assistant' && msg.content === '' ? (
                    <span className="flex gap-1 py-0.5">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/8 flex-shrink-0">
            {/* Mic button */}
            <div className="flex justify-center mb-2.5">
              <button
                onClick={toggleMic}
                disabled={transcribing}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all btn-press ${
                  recording
                    ? 'bg-red-500 shadow-lg shadow-red-500/40 scale-110'
                    : transcribing
                    ? 'bg-amber-500/30 border border-amber-500/40'
                    : 'bg-white/8 hover:bg-white/15 border border-white/10'
                }`}
              >
                {transcribing
                  ? <Loader size={18} className="text-amber-400 animate-spin" />
                  : recording
                  ? <MicOff size={18} className="text-white" />
                  : <Mic size={18} className="text-white/50" />
                }
              </button>
            </div>

            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={recording ? 'Parle...' : transcribing ? 'Transcription...' : 'Message...'}
                disabled={recording || transcribing}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors text-sm min-w-0 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading || recording || transcribing}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center disabled:opacity-30 flex-shrink-0 btn-press"
              >
                <Send size={15} className="text-white" />
              </button>
            </div>

            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); stopSpeaking() }}
                className="text-white/20 hover:text-white/40 text-xs mt-2 transition-colors block">
                Effacer
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
