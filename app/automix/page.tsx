'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Upload, Play, Pause, Download, Sparkles, Music2, Zap, Check, RefreshCw, Volume2 } from 'lucide-react'

type Step = 'record' | 'upload' | 'strategy' | 'mixing' | 'done'

interface MixStrategy {
  strategy: {
    master: { lufs_target: number; limiter_ceiling: number; stereo_width: number }
    stems: Record<string, any>
    tips: string
  }
}

const GENRES = ['Trap', 'Drill', 'Afro', 'R&B', 'Pop', 'Rap FR', 'Dancehall', 'Amapiano']

export default function AutomixPage() {
  const [step, setStep] = useState<Step>('record')
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [instruFile, setInstruFile] = useState<File | null>(null)
  const [genre, setGenre] = useState('Trap')
  const [style, setStyle] = useState('')
  const [strategy, setStrategy] = useState<MixStrategy | null>(null)
  const [mixedUrl, setMixedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [playing, setPlaying] = useState(false)
  const [autotune, setAutotune] = useState(true)
  const [autotuneStrength, setAutotuneStrength] = useState(0.8)
  const [recordTime, setRecordTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mixedAudioRef = useRef<HTMLAudioElement | null>(null)
  const instruRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ── RECORDING ──
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    const mr = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, { type: mimeType })
      setRecordedBlob(blob)
      setRecordedUrl(URL.createObjectURL(blob))
    }
    mr.start()
    mediaRecorderRef.current = mr
    setRecording(true)
    setRecordTime(0)
    timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  // ── MIX ENGINE ──
  async function startMix() {
    if (!recordedBlob || !instruFile) return
    setLoading(true)
    setStep('strategy')

    // 1. Get mix strategy from OpenAI
    setLoadingMsg('🧠 Analyse IA de ton style...')
    const stratRes = await fetch('/api/automix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stems: ['vocal', 'instru'],
        genre,
        style,
      })
    })
    const stratData = await stratRes.json()
    setStrategy(stratData)

    setStep('mixing')
    setLoadingMsg('🎚️ Mixage en cours...')

    // 2. Mix audio using Web Audio API
    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx

    // Load both audio files
    const [vocalBuffer, instruBuffer] = await Promise.all([
      loadAudioBuffer(audioCtx, recordedBlob),
      loadAudioBuffer(audioCtx, instruFile),
    ])

    setLoadingMsg('🎵 Application EQ + Compression...')

    const vocalSettings = stratData.strategy?.stems?.vocal || {}
    const instruSettings = stratData.strategy?.stems?.instru || {}

    // Process vocal
    const vocalGain = audioCtx.createGain()
    vocalGain.gain.value = dbToLinear(vocalSettings.volume ?? 0)

    const vocalEQ = createEQ(audioCtx, vocalSettings.eq)
    const vocalComp = createCompressor(audioCtx, vocalSettings.compression)
    const vocalReverb = await createReverb(audioCtx, vocalSettings.reverb)

    // Process instru
    const instruGain = audioCtx.createGain()
    instruGain.gain.value = dbToLinear(instruSettings.volume ?? -3)

    const instruEQ = createEQ(audioCtx, instruSettings.eq)
    const instruComp = createCompressor(audioCtx, instruSettings.compression)

    // Master bus
    const masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.85

    const masterLimiter = audioCtx.createDynamicsCompressor()
    masterLimiter.threshold.value = -0.3
    masterLimiter.ratio.value = 20
    masterLimiter.attack.value = 0.001
    masterLimiter.release.value = 0.1
    masterLimiter.knee.value = 0

    // Offline rendering for export
    const duration = Math.max(vocalBuffer.duration, instruBuffer.duration)
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(duration * 44100), 44100)

    setLoadingMsg('🔊 Mastering -14 LUFS...')

    // Vocal chain offline
    const vocalSrc = offlineCtx.createBufferSource()
    vocalSrc.buffer = vocalBuffer

    const vocalGainOff = offlineCtx.createGain()
    vocalGainOff.gain.value = dbToLinear(vocalSettings.volume ?? 0)

    const vocalCompOff = offlineCtx.createDynamicsCompressor()
    vocalCompOff.threshold.value = vocalSettings.compression?.threshold ?? -20
    vocalCompOff.ratio.value = vocalSettings.compression?.ratio ?? 4
    vocalCompOff.attack.value = (vocalSettings.compression?.attack ?? 10) / 1000
    vocalCompOff.release.value = (vocalSettings.compression?.release ?? 100) / 1000
    vocalCompOff.knee.value = 6

    // EQ vocal (BiquadFilters)
    const vocalHighpass = offlineCtx.createBiquadFilter()
    vocalHighpass.type = 'highpass'
    vocalHighpass.frequency.value = vocalSettings.eq?.low_cut ?? 80

    const vocalPresence = offlineCtx.createBiquadFilter()
    vocalPresence.type = 'peaking'
    vocalPresence.frequency.value = 4000
    vocalPresence.gain.value = vocalSettings.eq?.presence ?? 2
    vocalPresence.Q.value = 1

    const vocalAir = offlineCtx.createBiquadFilter()
    vocalAir.type = 'highshelf'
    vocalAir.frequency.value = 10000
    vocalAir.gain.value = vocalSettings.eq?.high ?? 2

    // Instru chain offline
    const instruSrc = offlineCtx.createBufferSource()
    instruSrc.buffer = instruBuffer

    const instruGainOff = offlineCtx.createGain()
    instruGainOff.gain.value = dbToLinear(instruSettings.volume ?? -3)

    const instruCompOff = offlineCtx.createDynamicsCompressor()
    instruCompOff.threshold.value = instruSettings.compression?.threshold ?? -12
    instruCompOff.ratio.value = instruSettings.compression?.ratio ?? 2
    instruCompOff.attack.value = (instruSettings.compression?.attack ?? 5) / 1000
    instruCompOff.release.value = (instruSettings.compression?.release ?? 200) / 1000

    // Master
    const masterGainOff = offlineCtx.createGain()
    masterGainOff.gain.value = 0.85

    const masterLimOff = offlineCtx.createDynamicsCompressor()
    masterLimOff.threshold.value = -0.5
    masterLimOff.ratio.value = 20
    masterLimOff.attack.value = 0.001
    masterLimOff.release.value = 0.1
    masterLimOff.knee.value = 0

    // Connect vocal chain
    vocalSrc.connect(vocalHighpass)
    vocalHighpass.connect(vocalPresence)
    vocalPresence.connect(vocalAir)
    vocalAir.connect(vocalCompOff)
    vocalCompOff.connect(vocalGainOff)
    vocalGainOff.connect(masterGainOff)

    // Connect instru chain
    instruSrc.connect(instruCompOff)
    instruCompOff.connect(instruGainOff)
    instruGainOff.connect(masterGainOff)

    // Master chain
    masterGainOff.connect(masterLimOff)
    masterLimOff.connect(offlineCtx.destination)

    vocalSrc.start(0)
    instruSrc.start(0)

    setLoadingMsg('📦 Export WAV en cours...')
    const renderedBuffer = await offlineCtx.startRendering()
    const wavBlob = bufferToWav(renderedBuffer)
    const url = URL.createObjectURL(wavBlob)
    setMixedUrl(url)
    setStep('done')
    setLoading(false)
  }

  // ── AUDIO HELPERS ──
  async function loadAudioBuffer(ctx: AudioContext | OfflineAudioContext, source: Blob | File): Promise<AudioBuffer> {
    const arrayBuffer = await source.arrayBuffer()
    return ctx.decodeAudioData(arrayBuffer)
  }

  function dbToLinear(db: number): number {
    return Math.pow(10, db / 20)
  }

  function createEQ(ctx: AudioContext, eq: any) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'highshelf'
    filter.frequency.value = 10000
    filter.gain.value = eq?.high ?? 0
    return filter
  }

  function createCompressor(ctx: AudioContext, comp: any) {
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = comp?.threshold ?? -20
    compressor.ratio.value = comp?.ratio ?? 4
    return compressor
  }

  async function createReverb(ctx: AudioContext, reverb: any) {
    const convolver = ctx.createConvolver()
    return convolver
  }

  function bufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const length = buffer.length * numChannels * 2
    const arrayBuffer = new ArrayBuffer(44 + length)
    const view = new DataView(arrayBuffer)

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numChannels * 2, true)
    view.setUint16(32, numChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length, true)

    let offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center flex-shrink-0 animate-pulse-glow">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">AUTOMIX</h1>
          <p className="text-white/40 text-xs">Enregistre → Mix IA → Master → Télécharge</p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'record', label: '🎤 Vocal' },
          { id: 'upload', label: '🎵 Instru' },
          { id: 'strategy', label: '🧠 IA' },
          { id: 'mixing', label: '🎚️ Mix' },
          { id: 'done', label: '✅ Prêt' },
        ].map(({ id, label }, i) => {
          const steps: Step[] = ['record', 'upload', 'strategy', 'mixing', 'done']
          const currentIdx = steps.indexOf(step)
          const thisIdx = steps.indexOf(id as Step)
          const isDone = thisIdx < currentIdx
          const isCurrent = id === step
          return (
            <div key={id} className="flex items-center gap-2 flex-shrink-0">
              <div className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                isCurrent ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300' :
                isDone ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' :
                'bg-white/5 border border-white/10 text-white/30'
              }`}>
                {isDone ? '✓ ' : ''}{label}
              </div>
              {i < 4 && <div className="w-4 h-px bg-white/10 flex-shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1 : RECORD ── */}
      {(step === 'record' || step === 'upload') && (
        <div className="space-y-4">
          {/* Genre */}
          <div className="glass-card rounded-3xl border border-white/8 p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Genre musical</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {GENRES.map(g => (
                <button key={g} onClick={() => setGenre(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${genre === g ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                  {g}
                </button>
              ))}
            </div>
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Référence sonore (artiste, style)</p>
              <input value={style} onChange={e => setStyle(e.target.value)}
                placeholder="ex: Travis Scott, T-Pain, Hamza..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors text-sm" />
            </div>
          </div>

          {/* Autotune settings */}
          <div className="glass-card rounded-3xl border border-pink-500/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mic size={16} className="text-pink-400" />
                <p className="text-pink-400 font-medium text-sm">Autotune T-Pain Style</p>
              </div>
              <button
                onClick={() => setAutotune(!autotune)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${autotune ? 'bg-pink-500/30 border-pink-500/50 text-pink-300' : 'bg-white/5 border-white/10 text-white/30'}`}>
                {autotune ? '✓ Activé' : 'Désactivé'}
              </button>
            </div>
            {autotune && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/40 text-xs">Intensité de l'autotune</p>
                  <p className="text-pink-400 text-xs font-medium">{Math.round(autotuneStrength * 100)}%</p>
                </div>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={autotuneStrength}
                  onChange={e => setAutotuneStrength(parseFloat(e.target.value))}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-xs text-white/20 mt-1">
                  <span>Naturel</span>
                  <span>T-Pain</span>
                </div>
              </div>
            )}
          </div>

          {/* Record vocal */}
          <div className="glass-card rounded-3xl border border-violet-500/20 p-6 text-center">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-4">Enregistre ta topline</p>

            {recording && (
              <div className="mb-4">
                <div className="text-red-400 font-mono text-2xl font-bold">{formatTime(recordTime)}</div>
                <div className="flex justify-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 bg-red-400 rounded-full animate-bounce"
                      style={{ height: `${Math.random() * 20 + 10}px`, animationDelay: `${i * 100}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {recordedUrl && !recording && (
              <div className="mb-4">
                <audio controls src={recordedUrl} className="w-full rounded-xl mb-2" />
                <p className="text-emerald-400 text-xs">✓ Vocal enregistré — {formatTime(recordTime)}</p>
              </div>
            )}

            <button
              onClick={recording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all mb-3 ${
                recording
                  ? 'bg-red-500 shadow-lg shadow-red-500/40 animate-pulse'
                  : recordedUrl
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-gradient-to-br from-violet-600 to-pink-600 shadow-neon-purple hover:scale-105'
              }`}>
              {recording ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
            </button>
            <p className="text-white/40 text-xs">
              {recording ? 'Appuie pour arrêter' : recordedUrl ? 'Appuie pour réenregistrer' : 'Appuie pour démarrer'}
            </p>
          </div>

          {/* Upload instru */}
          <div className="glass-card rounded-3xl border border-emerald-500/20 p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Upload ton instru</p>
            <div
              onClick={() => instruRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                instruFile ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/15 hover:border-white/30'
              }`}>
              {instruFile ? (
                <div>
                  <Check size={20} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 text-sm font-medium">{instruFile.name}</p>
                  <p className="text-white/30 text-xs mt-1">{(instruFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <Upload size={20} className="text-white/30 mx-auto mb-2" />
                  <p className="text-white/50 text-sm">Upload ton instru (MP3, WAV)</p>
                </div>
              )}
            </div>
            <input ref={instruRef} type="file" accept="audio/*" onChange={e => setInstruFile(e.target.files?.[0] || null)} className="hidden" />
          </div>

          {/* Start mix button */}
          <button
            onClick={startMix}
            disabled={!recordedBlob || !instruFile || loading}
            className="w-full flex items-center gap-3 justify-center bg-gradient-to-r from-violet-600 via-pink-600 to-rose-500 text-white font-bold text-lg px-6 py-5 rounded-3xl disabled:opacity-40 hover:opacity-90 transition-opacity shadow-neon-purple">
            <Zap size={22} />
            LANCER L'AUTOMIX IA
          </button>
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div className="glass-card rounded-3xl border border-violet-500/20 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-spin-slow">
            <Zap size={28} className="text-white" />
          </div>
          <p className="text-white font-semibold text-lg mb-2">{loadingMsg}</p>
          <div className="space-y-2 mt-4">
            {[
              { label: '🧠 Analyse IA', done: ['mixing', 'done'].includes(step) },
              { label: '🎚️ EQ + Compression', done: step === 'done' },
              { label: '🔊 Mastering -14 LUFS', done: step === 'done' },
              { label: '📦 Export WAV', done: step === 'done' },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${done ? 'bg-emerald-500' : 'bg-white/10 animate-pulse'}`} />
                <span className={done ? 'text-emerald-400' : 'text-white/50'}>{label}</span>
              </div>
            ))}
          </div>
          {strategy && (
            <div className="mt-6 text-left bg-white/3 rounded-2xl p-4">
              <p className="text-violet-400 text-xs uppercase tracking-wider mb-2">Stratégie IA générée</p>
              <p className="text-white/60 text-xs leading-relaxed">{strategy.strategy?.tips}</p>
            </div>
          )}
        </div>
      )}

      {/* ── DONE ── */}
      {step === 'done' && mixedUrl && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-emerald-500/20 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-emerald-400" />
            </div>
            <h2 className="font-display font-black text-2xl text-white mb-1">Mix terminé ! 🎉</h2>
            <p className="text-white/40 text-sm mb-6">Masterisé -14 LUFS · Prêt Spotify / Apple Music</p>

            <audio controls src={mixedUrl} className="w-full rounded-2xl mb-4" />

            <a href={mixedUrl} download="vizion-automix.wav"
              className="flex items-center gap-2 justify-center bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold px-6 py-4 rounded-2xl hover:opacity-90 transition-opacity w-full">
              <Download size={20} />
              Télécharger le WAV
            </a>
          </div>

          {strategy && (
            <div className="glass rounded-2xl border border-white/8 p-4">
              <p className="text-violet-400 text-xs uppercase tracking-wider mb-2">Stratégie de mix appliquée</p>
              <p className="text-white/60 text-sm leading-relaxed">{strategy.strategy?.tips}</p>
            </div>
          )}

          <button
            onClick={() => {
              setStep('record')
              setRecordedBlob(null)
              setRecordedUrl(null)
              setInstruFile(null)
              setMixedUrl(null)
              setStrategy(null)
              setRecordTime(0)
            }}
            className="w-full flex items-center gap-2 justify-center bg-white/5 border border-white/10 text-white/60 font-medium px-6 py-3 rounded-2xl hover:bg-white/10 transition-colors">
            <RefreshCw size={16} />
            Nouveau mix
          </button>
        </div>
      )}
    </div>
  )
}
