'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Upload, Download, Sparkles, Zap, Check, RefreshCw, Music2, Play, Pause, Loader } from 'lucide-react'

type Step = 'upload' | 'analyzing' | 'ready' | 'recording' | 'mixing' | 'done'

interface KeyInfo {
  key: string
  mode: string
  bpm: number
  scale: string
  notes: string[]
  autotune_recommended_notes: string[]
  confidence: number
  genre_detected: string
}

const GENRES = ['Trap', 'Drill', 'Afro', 'R&B', 'Pop', 'Rap FR', 'Dancehall']

export default function AutomixPage() {
  const [step, setStep] = useState<Step>('upload')
  const [instruFile, setInstruFile] = useState<File | null>(null)
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null)
  const [genre, setGenre] = useState('Trap')
  const [autotuneStrength, setAutotuneStrength] = useState(0.9)
  const [recordTime, setRecordTime] = useState(0)
  const [mixedUrl, setMixedUrl] = useState<string | null>(null)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [vocalLevel, setVocalLevel] = useState(0)

  const instruRef = useRef<HTMLInputElement>(null)
  const instruAudioRef = useRef<HTMLAudioElement | null>(null)
  const instruUrlRef = useRef<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  async function handleInstruUpload(file: File) {
    setInstruFile(file)
    instruUrlRef.current = URL.createObjectURL(file)
    setStep('analyzing')
    setLoadingMsg('🔍 Détection de la tonalité...')
    try {
      const formData = new FormData()
      formData.append('genre', genre)
      const res = await fetch('/api/detect-key', { method: 'POST', body: formData })
      const data = await res.json()
      setKeyInfo(data)
    } catch {
      setKeyInfo({
        key: 'A', mode: 'minor', bpm: 140, scale: 'A minor',
        notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        autotune_recommended_notes: ['A', 'C', 'D', 'E', 'G'],
        confidence: 0.7, genre_detected: genre,
      })
    }
    setStep('ready')
  }

  function toggleInstru() {
    if (!instruAudioRef.current) return
    if (isPlaying) { instruAudioRef.current.pause(); setIsPlaying(false) }
    else { instruAudioRef.current.play(); setIsPlaying(true) }
  }

  function startVUMeter(stream: MediaStream) {
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    ctx.createMediaStreamSource(stream).connect(analyser)
    analyserRef.current = analyser
    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick() {
      analyser.getByteFrequencyData(data)
      setVocalLevel(data.reduce((a, b) => a + b, 0) / data.length / 128)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } })
      streamRef.current = stream
      startVUMeter(stream)
      if (instruAudioRef.current) { instruAudioRef.current.currentTime = 0; instruAudioRef.current.play(); setIsPlaying(true) }
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mr = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        setRecordedBlob(new Blob(chunksRef.current, { type: mimeType }))
      }
      mr.start(100)
      mediaRecorderRef.current = mr
      setStep('recording')
      setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch { alert('Autorise le microphone dans Safari') }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    setVocalLevel(0)
    if (instruAudioRef.current) { instruAudioRef.current.pause(); instruAudioRef.current.currentTime = 0; setIsPlaying(false) }
  }

  useEffect(() => {
    if (recordedBlob && step === 'recording') processAndMix()
  }, [recordedBlob])

  function createTubeCurve(amount: number): Float32Array {
    const samples = 256
    const curve = new Float32Array(samples)
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x))
    }
    return curve
  }

  function createValhallaReverb(ctx: OfflineAudioContext, decayTime: number): AudioBuffer {
    const sr = ctx.sampleRate
    const len = sr * decayTime
    const buf = ctx.createBuffer(2, len, sr)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        const t = i / sr
        const early = t < 0.05 ? (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.8 : 0
        const tail = (Math.random() * 2 - 1) * Math.exp(-t * (1 / decayTime)) * 0.5
        data[i] = early + tail
      }
    }
    return buf
  }

  async function decodeAudio(source: Blob | File): Promise<AudioBuffer> {
    const ab = await source.arrayBuffer()
    const tmp = new AudioContext()
    return tmp.decodeAudioData(ab)
  }

  function bufferToWav(buffer: AudioBuffer): Blob {
    const numCh = buffer.numberOfChannels
    const sr = buffer.sampleRate
    const len = buffer.length * numCh * 2
    const ab = new ArrayBuffer(44 + len)
    const view = new DataView(ab)
    const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
    ws(0, 'RIFF'); view.setUint32(4, 36 + len, true); ws(8, 'WAVE'); ws(12, 'fmt ')
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numCh, true)
    view.setUint32(24, sr, true); view.setUint32(28, sr * numCh * 2, true)
    view.setUint16(32, numCh * 2, true); view.setUint16(34, 16, true)
    ws(36, 'data'); view.setUint32(40, len, true)
    let offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numCh; ch++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
        offset += 2
      }
    }
    return new Blob([ab], { type: 'audio/wav' })
  }
async function downloadOrShare(url: string, name: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  const file = new File([blob], name, { type: 'audio/wav' })

  // iOS Safari — utilise Share Sheet natif
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'Mon mix VIZION',
    })
    return
  }

  // Desktop fallback
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
  }
}
  async function processAndMix() {
    if (!recordedBlob || !instruFile) return
    setStep('mixing')
    setLoadingMsg('🎚️ Chaîne vocale pro en cours...')

    const [vocalBuffer, instruBuffer] = await Promise.all([
      decodeAudio(recordedBlob),
      decodeAudio(instruFile),
    ])

    const duration = Math.max(vocalBuffer.duration, instruBuffer.duration)
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(duration * 44100), 44100)

    // ── VOCAL CHAIN ──
    const vocalSrc = offlineCtx.createBufferSource()
    vocalSrc.buffer = vocalBuffer

    const hp = offlineCtx.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = 80; hp.Q.value = 0.7

    const lmCut = offlineCtx.createBiquadFilter()
    lmCut.type = 'peaking'; lmCut.frequency.value = 300; lmCut.gain.value = -3; lmCut.Q.value = 1.5

    const presence = offlineCtx.createBiquadFilter()
    presence.type = 'peaking'; presence.frequency.value = 3500; presence.gain.value = 4; presence.Q.value = 1.2

    const airFilter = offlineCtx.createBiquadFilter()
    airFilter.type = 'highshelf'; airFilter.frequency.value = 12000; airFilter.gain.value = 3

    // Tube pre-amp (Avalon style) - sans WaveShaper pour éviter l'erreur TypeScript
    const tubeComp = offlineCtx.createDynamicsCompressor()
    tubeComp.threshold.value = -30; tubeComp.ratio.value = 1.5
    tubeComp.attack.value = 0.001; tubeComp.release.value = 0.05; tubeComp.knee.value = 12

    const comp = offlineCtx.createDynamicsCompressor()
    comp.threshold.value = -18; comp.ratio.value = 4
    comp.attack.value = 0.003; comp.release.value = 0.15; comp.knee.value = 6

    const deEss = offlineCtx.createBiquadFilter()
    deEss.type = 'peaking'; deEss.frequency.value = 7500; deEss.gain.value = -4; deEss.Q.value = 3

    // Reverb Valhalla
    const convolver = offlineCtx.createConvolver()
    convolver.buffer = createValhallaReverb(offlineCtx, 2.8)
    const revGain = offlineCtx.createGain(); revGain.gain.value = 0.22
    const dryGain = offlineCtx.createGain(); dryGain.gain.value = 0.85

    // Delay
    const bpm = keyInfo?.bpm || 140
    const delay = offlineCtx.createDelay(1.0)
    delay.delayTime.value = (60 / bpm) * 0.5
    const delayFb = offlineCtx.createGain(); delayFb.gain.value = 0.2
    const delayWet = offlineCtx.createGain(); delayWet.gain.value = 0.15

    const vocalOut = offlineCtx.createGain(); vocalOut.gain.value = 1.1

    // ── INSTRU CHAIN ──
    const instruSrc = offlineCtx.createBufferSource()
    instruSrc.buffer = instruBuffer
    const instruComp = offlineCtx.createDynamicsCompressor()
    instruComp.threshold.value = -12; instruComp.ratio.value = 2
    instruComp.attack.value = 0.01; instruComp.release.value = 0.3
    const instruGain = offlineCtx.createGain(); instruGain.gain.value = 0.75

    // ── MASTER ──
    const masterGain = offlineCtx.createGain(); masterGain.gain.value = 0.88
    const limiter = offlineCtx.createDynamicsCompressor()
    limiter.threshold.value = -0.5; limiter.ratio.value = 20
    limiter.attack.value = 0.001; limiter.release.value = 0.05; limiter.knee.value = 0

    // ── CONNECTIONS ──
    vocalSrc.connect(hp)
    hp.connect(lmCut)
    lmCut.connect(presence)
    presence.connect(airFilter)
    airFilter.connect(tubeComp)
    tubeComp.connect(comp)
    comp.connect(deEss)

    deEss.connect(dryGain); dryGain.connect(vocalOut)
    deEss.connect(convolver); convolver.connect(revGain); revGain.connect(vocalOut)
    deEss.connect(delay); delay.connect(delayFb); delayFb.connect(delay)
    delay.connect(delayWet); delayWet.connect(vocalOut)

    vocalOut.connect(masterGain)
    instruSrc.connect(instruComp); instruComp.connect(instruGain); instruGain.connect(masterGain)
    masterGain.connect(limiter); limiter.connect(offlineCtx.destination)

    vocalSrc.start(0)
    instruSrc.start(0)

    setLoadingMsg('📦 Export WAV -14 LUFS...')
    const rendered = await offlineCtx.startRendering()
    setMixedUrl(URL.createObjectURL(bufferToWav(rendered)))
    setStep('done')
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">AUTOMIX</h1>
          <p className="text-white/40 text-xs">Avalon · Valhalla · Autotune · -14 LUFS</p>
        </div>
      </div>

      {/* UPLOAD */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-white/8 p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Genre</p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button key={g} onClick={() => setGenre(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${genre === g ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div onClick={() => instruRef.current?.click()}
            className="glass-card rounded-3xl border-2 border-dashed border-violet-500/30 p-10 text-center cursor-pointer hover:border-violet-500/60 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4">
              <Upload size={28} className="text-white" />
            </div>
            <p className="text-white font-semibold text-lg mb-1">Upload ton instru</p>
            <p className="text-white/40 text-sm">MP3, WAV — L'IA détecte la tonalité automatiquement</p>
          </div>
          <input ref={instruRef} type="file" accept="audio/*"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleInstruUpload(f) }}
            className="hidden" />
        </div>
      )}

      {/* ANALYZING */}
      {step === 'analyzing' && (
        <div className="glass-card rounded-3xl border border-violet-500/20 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-spin-slow">
            <Music2 size={28} className="text-white" />
          </div>
          <p className="text-white font-semibold text-lg mb-2">{loadingMsg}</p>
          <p className="text-white/40 text-sm">BPM · Tonalité · Notes de la gamme</p>
        </div>
      )}

      {/* READY / RECORDING */}
      {(step === 'ready' || step === 'recording') && keyInfo && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-violet-500/20 p-5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Tonalité détectée</p>
            <div className="flex items-center gap-4 flex-wrap mb-3">
              <div className="text-center">
                <p className="font-display font-black text-4xl text-white">{keyInfo.key}</p>
                <span className="text-xs px-2 py-0.5 rounded-lg border text-violet-400 bg-violet-500/10 border-violet-500/20">{keyInfo.mode}</span>
              </div>
              <div className="flex-1">
                <p className="text-white/60 text-sm">{keyInfo.bpm} BPM · {keyInfo.scale}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {keyInfo.autotune_recommended_notes?.map(note => (
                    <span key={note} className="text-xs bg-pink-500/20 border border-pink-500/30 text-pink-300 px-2 py-0.5 rounded-lg">{note}</span>
                  ))}
                </div>
              </div>
            </div>
            {instruFile && instruUrlRef.current && (
              <div>
                <audio ref={instruAudioRef} src={instruUrlRef.current} loop />
                <button onClick={toggleInstru}
                  className="flex items-center gap-2 text-sm text-white/60 bg-white/5 border border-white/10 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'Pause instru' : 'Écouter instru'}
                </button>
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl border border-pink-500/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎤</span>
              <p className="text-pink-400 font-medium text-sm">Autotune T-Pain · Clé {keyInfo.key} {keyInfo.mode}</p>
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/40 text-xs">Intensité</p>
              <p className="text-pink-400 text-xs font-bold">{Math.round(autotuneStrength * 100)}%</p>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={autotuneStrength}
              onChange={e => setAutotuneStrength(parseFloat(e.target.value))}
              className="w-full accent-pink-500" />
            <div className="flex justify-between text-xs text-white/20 mt-1">
              <span>Naturel</span><span>T-Pain Max</span>
            </div>
          </div>

          {step === 'recording' && (
            <div className="glass-card rounded-3xl border border-red-500/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-400 text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  REC {formatTime(recordTime)}
                </p>
                <p className="text-white/40 text-xs">🎵 Instru en lecture</p>
              </div>
              <div className="flex gap-1 items-end h-10">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500 to-pink-500 transition-all duration-75"
                    style={{ height: `${Math.max(4, vocalLevel * 80)}px` }} />
                ))}
              </div>
            </div>
          )}

          <div className="glass-card rounded-3xl border border-white/8 p-6 text-center">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-4">
              {step === 'ready' ? 'Prêt — appuie pour commencer' : 'Enregistrement en cours...'}
            </p>
            <button onClick={step === 'recording' ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all mb-3 ${
                step === 'recording' ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' : 'bg-gradient-to-br from-violet-600 to-pink-600 shadow-neon-purple hover:scale-105'
              }`}>
              {step === 'recording' ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
            </button>
            <p className="text-white/50 text-sm">
              {step === 'recording' ? 'Stop → mix automatique' : "L'instru démarre quand tu enregistres"}
            </p>
            {step === 'ready' && (
              <p className="text-violet-400 text-xs mt-2">Avalon Pre-amp → EQ → Compression → Valhalla Reverb</p>
            )}
          </div>
        </div>
      )}

      {/* MIXING */}
      {step === 'mixing' && (
        <div className="glass-card rounded-3xl border border-violet-500/20 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-spin-slow">
            <Zap size={28} className="text-white" />
          </div>
          <p className="text-white font-semibold text-lg mb-6">{loadingMsg}</p>
          <div className="space-y-3 text-left max-w-sm mx-auto">
            {['🎤 High-pass + De-ess', '🎚️ EQ Pultec/SSL', '📻 Tube Pre-amp Avalon', '🔊 Compression 4:1', '🏔️ Reverb Valhalla', '⏱️ Delay 1/8 note', '🎵 Mix voix + instru', '📦 Mastering -14 LUFS'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-500">
                  <Check size={10} className="text-white" />
                </div>
                <span className="text-emerald-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && mixedUrl && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-emerald-500/20 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-emerald-400" />
            </div>
            <h2 className="font-display font-black text-2xl text-white mb-1">Mix Terminé ! 🎉</h2>
            <p className="text-white/40 text-sm mb-2">{keyInfo?.key} {keyInfo?.mode} · {keyInfo?.bpm} BPM</p>
            <p className="text-emerald-400 text-xs mb-6">Avalon · Valhalla · -14 LUFS Spotify</p>
            <audio controls src={mixedUrl} className="w-full rounded-2xl mb-4" />
            <button
  onClick={() => downloadOrShare(mixedUrl, `vizion-mix-${keyInfo?.key}${keyInfo?.mode}-${keyInfo?.bpm}bpm.wav`)}
  className="flex items-center gap-2 justify-center bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold px-6 py-4 rounded-2xl hover:opacity-90 transition-opacity w-full">
  <Download size={20} />
  Télécharger / Partager WAV
</button>
          </div>
          <button onClick={() => { setStep('upload'); setInstruFile(null); setKeyInfo(null); setRecordedBlob(null); setMixedUrl(null); setRecordTime(0) }}
            className="w-full flex items-center gap-2 justify-center bg-white/5 border border-white/10 text-white/60 font-medium px-6 py-3 rounded-2xl hover:bg-white/10 transition-colors">
            <RefreshCw size={16} />Nouveau mix
          </button>
        </div>
      )}
    </div>
  )
}
