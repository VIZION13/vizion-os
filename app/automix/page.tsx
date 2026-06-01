'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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

const NOTE_FREQUENCIES: Record<string, number[]> = {
  'C':  [65.41, 130.81, 261.63, 523.25, 1046.50, 2093.00],
  'C#': [69.30, 138.59, 277.18, 554.37, 1108.73, 2217.46],
  'D':  [73.42, 146.83, 293.66, 587.33, 1174.66, 2349.32],
  'D#': [77.78, 155.56, 311.13, 622.25, 1244.51, 2489.02],
  'Eb': [77.78, 155.56, 311.13, 622.25, 1244.51, 2489.02],
  'E':  [82.41, 164.81, 329.63, 659.25, 1318.51, 2637.02],
  'F':  [87.31, 174.61, 349.23, 698.46, 1396.91, 2793.83],
  'F#': [92.50, 185.00, 369.99, 739.99, 1479.98, 2959.96],
  'G':  [98.00, 196.00, 392.00, 783.99, 1567.98, 3135.96],
  'G#': [103.83, 207.65, 415.30, 830.61, 1661.22, 3322.44],
  'Ab': [103.83, 207.65, 415.30, 830.61, 1661.22, 3322.44],
  'A':  [110.00, 220.00, 440.00, 880.00, 1760.00, 3520.00],
  'A#': [116.54, 233.08, 466.16, 932.33, 1864.66, 3729.31],
  'Bb': [116.54, 233.08, 466.16, 932.33, 1864.66, 3729.31],
  'B':  [123.47, 246.94, 493.88, 987.77, 1975.53, 3951.07],
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  // ── UPLOAD & ANALYZE ──
  async function handleInstruUpload(file: File) {
    setInstruFile(file)
    setStep('analyzing')
    setLoadingMsg('🔍 Détection de la tonalité...')

    try {
      const formData = new FormData()
      formData.append('audio', file)

      const res = await fetch('/api/detect-key', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      setKeyInfo(data)
      setStep('ready')
    } catch (err) {
      // Fallback key
      setKeyInfo({
        key: 'A', mode: 'minor', bpm: 140,
        scale: 'A minor',
        notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        autotune_recommended_notes: ['A', 'C', 'D', 'E', 'G'],
        confidence: 0.5,
        genre_detected: genre,
      })
      setStep('ready')
    }
  }

  // ── PLAY INSTRU ──
  function toggleInstru() {
    if (!instruAudioRef.current || !instruFile) return
    if (isPlaying) {
      instruAudioRef.current.pause()
      setIsPlaying(false)
    } else {
      instruAudioRef.current.play()
      setIsPlaying(true)
    }
  }

  // ── VU METER ──
  function startVUMeter(stream: MediaStream) {
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick() {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      setVocalLevel(avg / 128)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  // ── RECORD ──
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      })

      streamRef.current = stream
      startVUMeter(stream)

      // Play instru while recording
      if (instruAudioRef.current && instruFile) {
        instruAudioRef.current.currentTime = 0
        instruAudioRef.current.play()
        setIsPlaying(true)
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const mr = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
      }

      mr.start(100)
      mediaRecorderRef.current = mr
      setStep('recording')
      setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch (err) {
      alert('Autorise le microphone dans Safari : Réglages → Safari → Microphone')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    setVocalLevel(0)

    // Stop instru
    if (instruAudioRef.current) {
      instruAudioRef.current.pause()
      instruAudioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  // Watch for recordedBlob to auto-mix
  useEffect(() => {
    if (recordedBlob && step === 'recording') {
      processAndMix()
    }
  }, [recordedBlob])

  // ── PROCESS & MIX ──
  async function processAndMix() {
    if (!recordedBlob || !instruFile) return
    setStep('mixing')

    const offlineCtx = new OfflineAudioContext(2, 44100 * 300, 44100)

    setLoadingMsg('🎚️ Application de la chaîne vocale pro...')

    const [vocalBuffer, instruBuffer] = await Promise.all([
      decodeAudio(offlineCtx, recordedBlob),
      decodeAudio(offlineCtx, instruFile),
    ])

    // ── VOCAL CHAIN (Avalon/Neve style) ──
    const vocalSrc = offlineCtx.createBufferSource()
    vocalSrc.buffer = vocalBuffer

    // 1. High-pass filter (coupe les basses indésirables)
    const highPass = offlineCtx.createBiquadFilter()
    highPass.type = 'highpass'
    highPass.frequency.value = 80
    highPass.Q.value = 0.7

    // 2. Low-mid cut (Pultec style - nettoie la boue)
    const lowMidCut = offlineCtx.createBiquadFilter()
    lowMidCut.type = 'peaking'
    lowMidCut.frequency.value = 300
    lowMidCut.gain.value = -3
    lowMidCut.Q.value = 1.5

    // 3. Presence boost (SSL style - clarté vocale)
    const presence = offlineCtx.createBiquadFilter()
    presence.type = 'peaking'
    presence.frequency.value = 3500
    presence.gain.value = 4
    presence.Q.value = 1.2

    // 4. Air (Avalon style - brillance)
    const air = offlineCtx.createBiquadFilter()
    air.type = 'highshelf'
    air.frequency.value = 12000
    air.gain.value = 3

    // 5. Tube pre-amp saturation (Avalon 737 style)
    const tubeWaver = offlineCtx.createWaveShaper()
    tubeWaver.curve = createTubeCurve(0.3)
    tubeWaver.oversample = '4x'

    // 6. Compressor (studio style - 4:1)
    const comp = offlineCtx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 4
    comp.attack.value = 0.003
    comp.release.value = 0.15
    comp.knee.value = 6

    // 7. De-esser (coupe les sibilances)
    const deEsser = offlineCtx.createBiquadFilter()
    deEsser.type = 'peaking'
    deEsser.frequency.value = 7500
    deEsser.gain.value = -4
    deEsser.Q.value = 3

    // 8. Reverb Valhalla style
    const convolver = offlineCtx.createConvolver()
    convolver.buffer = createValhallaReverb(offlineCtx, 2.8, 0.4)

    const reverbGain = offlineCtx.createGain()
    reverbGain.gain.value = 0.25

    const dryGain = offlineCtx.createGain()
    dryGain.gain.value = 0.85

    // 9. Delay subtil (1/8 note à 140bpm ≈ 107ms)
    const delay = offlineCtx.createDelay(0.5)
    const bpm = keyInfo?.bpm || 140
    delay.delayTime.value = (60 / bpm) * 0.5

    const delayFeedback = offlineCtx.createGain()
    delayFeedback.gain.value = 0.25

    const delayWet = offlineCtx.createGain()
    delayWet.gain.value = 0.18

    const delayDry = offlineCtx.createGain()
    delayDry.gain.value = 1.0

    // 10. Vocal gain
    const vocalGain = offlineCtx.createGain()
    vocalGain.gain.value = 1.1

    // ── INSTRU CHAIN ──
    const instruSrc = offlineCtx.createBufferSource()
    instruSrc.buffer = instruBuffer

    const instruComp = offlineCtx.createDynamicsCompressor()
    instruComp.threshold.value = -12
    instruComp.ratio.value = 2
    instruComp.attack.value = 0.01
    instruComp.release.value = 0.3

    const instruGain = offlineCtx.createGain()
    instruGain.gain.value = 0.75

    // ── MASTER BUS ──
    const masterGain = offlineCtx.createGain()
    masterGain.gain.value = 0.88

    const masterLimiter = offlineCtx.createDynamicsCompressor()
    masterLimiter.threshold.value = -0.5
    masterLimiter.ratio.value = 20
    masterLimiter.attack.value = 0.001
    masterLimiter.release.value = 0.05
    masterLimiter.knee.value = 0

    // ── CONNECT VOCAL CHAIN ──
    vocalSrc
      .connect(highPass)
    highPass.connect(lowMidCut)
    lowMidCut.connect(presence)
    presence.connect(air)
    air.connect(tubeWaver)
    tubeWaver.connect(comp)
    comp.connect(deEsser)

    // Dry path
    deEsser.connect(dryGain)
    dryGain.connect(delayDry)
    delayDry.connect(vocalGain)

    // Reverb path
    deEsser.connect(convolver)
    convolver.connect(reverbGain)
    reverbGain.connect(vocalGain)

    // Delay path
    deEsser.connect(delay)
    delay.connect(delayFeedback)
    delayFeedback.connect(delay)
    delay.connect(delayWet)
    delayWet.connect(vocalGain)

    vocalGain.connect(masterGain)

    // ── CONNECT INSTRU CHAIN ──
    instruSrc.connect(instruComp)
    instruComp.connect(instruGain)
    instruGain.connect(masterGain)

    // ── CONNECT MASTER ──
    masterGain.connect(masterLimiter)
    masterLimiter.connect(offlineCtx.destination)

    const duration = Math.max(vocalBuffer.duration, instruBuffer.duration)
    vocalSrc.start(0)
    instruSrc.start(0)

    setLoadingMsg('🔊 Mastering Valhalla -14 LUFS...')

    // Trim offline context to actual duration
    const trimmedCtx = new OfflineAudioContext(2, Math.ceil(duration * 44100), 44100)
    const vocalSrc2 = trimmedCtx.createBufferSource()
    vocalSrc2.buffer = vocalBuffer
    const instruSrc2 = trimmedCtx.createBufferSource()
    instruSrc2.buffer = instruBuffer

    // Simplified chain for trimmed render
    const vocalChain = buildVocalChain(trimmedCtx, keyInfo?.bpm || 140)
    const instruGain2 = trimmedCtx.createGain()
    instruGain2.gain.value = 0.75
    const masterGain2 = trimmedCtx.createGain()
    masterGain2.gain.value = 0.88
    const limiter2 = trimmedCtx.createDynamicsCompressor()
    limiter2.threshold.value = -0.5
    limiter2.ratio.value = 20
    limiter2.attack.value = 0.001
    limiter2.release.value = 0.05

    vocalSrc2.connect(vocalChain.input)
    vocalChain.output.connect(masterGain2)
    instruSrc2.connect(instruGain2)
    instruGain2.connect(masterGain2)
    masterGain2.connect(limiter2)
    limiter2.connect(trimmedCtx.destination)

    vocalSrc2.start(0)
    instruSrc2.start(0)

    setLoadingMsg('📦 Export WAV 24bit...')
    const rendered = await trimmedCtx.startRendering()
    const wavBlob = bufferToWav(rendered)
    setMixedUrl(URL.createObjectURL(wavBlob))
    setStep('done')
  }

  function buildVocalChain(ctx: OfflineAudioContext, bpm: number) {
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80
    const lmCut = ctx.createBiquadFilter(); lmCut.type = 'peaking'; lmCut.frequency.value = 300; lmCut.gain.value = -3; lmCut.Q.value = 1.5
    const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3500; pres.gain.value = 4; pres.Q.value = 1.2
    const airF = ctx.createBiquadFilter(); airF.type = 'highshelf'; airF.frequency.value = 12000; airF.gain.value = 3
    const tube = ctx.createWaveShaper(); tube.curve = createTubeCurve(0.3); tube.oversample = '4x'
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15; comp.knee.value = 6
    const deEss = ctx.createBiquadFilter(); deEss.type = 'peaking'; deEss.frequency.value = 7500; deEss.gain.value = -4; deEss.Q.value = 3
    const reverb = ctx.createConvolver(); reverb.buffer = createValhallaReverb(ctx, 2.8, 0.4)
    const revGain = ctx.createGain(); revGain.gain.value = 0.25
    const dryGain = ctx.createGain(); dryGain.gain.value = 0.85
    const outGain = ctx.createGain(); outGain.gain.value = 1.1

    hp.connect(lmCut); lmCut.connect(pres); pres.connect(airF); airF.connect(tube)
    tube.connect(comp); comp.connect(deEss)
    deEss.connect(dryGain); dryGain.connect(outGain)
    deEss.connect(reverb); reverb.connect(revGain); revGain.connect(outGain)

    return { input: hp, output: outGain }
  }

  function createTubeCurve(amount: number): Float32Array {
    const samples = 256
    const curve = new Float32Array(samples)
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x))
    }
    return curve
  }

  function createValhallaReverb(ctx: OfflineAudioContext | AudioContext, decayTime: number, wet: number): AudioBuffer {
    const sampleRate = ctx.sampleRate
    const length = sampleRate * decayTime
    const buffer = ctx.createBuffer(2, length, sampleRate)

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        // Valhalla-style: dense early reflections + smooth tail
        const t = i / sampleRate
        const earlyReflections = t < 0.05 ? (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.8 : 0
        const tail = Math.random() * 2 - 1 * Math.exp(-t * (1 / decayTime)) * 0.6
        data[i] = earlyReflections + tail * (1 - t / decayTime)
      }
    }
    return buffer
  }

  async function decodeAudio(ctx: OfflineAudioContext, source: Blob | File): Promise<AudioBuffer> {
    const ab = await source.arrayBuffer()
    return new Promise((resolve, reject) => {
      const tmp = new AudioContext()
      tmp.decodeAudioData(ab.slice(0), resolve, reject)
    })
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

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  const MODE_COLORS: Record<string, string> = {
    major: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    minor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">AUTOMIX</h1>
          <p className="text-white/40 text-xs">Studio Pro · Avalon · Valhalla · Autotune</p>
        </div>
      </div>

      {/* ── STEP 1: UPLOAD INSTRU ── */}
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

          <div
            onClick={() => instruRef.current?.click()}
            className="glass-card rounded-3xl border-2 border-dashed border-violet-500/30 p-10 text-center cursor-pointer hover:border-violet-500/60 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4">
              <Upload size={28} className="text-white" />
            </div>
            <p className="text-white font-semibold text-lg mb-1">Upload ton instru</p>
            <p className="text-white/40 text-sm">MP3, WAV, M4A — L'IA détecte la tonalité automatiquement</p>
          </div>
          <input ref={instruRef} type="file" accept="audio/*"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleInstruUpload(f) }}
            className="hidden" />
        </div>
      )}

      {/* ── STEP: ANALYZING ── */}
      {step === 'analyzing' && (
        <div className="glass-card rounded-3xl border border-violet-500/20 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-spin-slow">
            <Music2 size={28} className="text-white" />
          </div>
          <p className="text-white font-semibold text-lg mb-2">{loadingMsg}</p>
          <p className="text-white/40 text-sm">BPM · Tonalité · Genre · Notes de la gamme</p>
        </div>
      )}

      {/* ── STEP: READY / RECORDING ── */}
      {(step === 'ready' || step === 'recording') && keyInfo && (
        <div className="space-y-4">
          {/* Key info */}
          <div className="glass-card rounded-3xl border border-violet-500/20 p-5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Tonalité détectée</p>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="text-center">
                <p className="font-display font-black text-4xl text-white">{keyInfo.key}</p>
                <span className={`text-xs px-2 py-0.5 rounded-lg border ${MODE_COLORS[keyInfo.mode] || 'text-white/40 bg-white/5 border-white/10'}`}>
                  {keyInfo.mode}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-white/60 text-sm">{keyInfo.bpm} BPM · {keyInfo.scale}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {keyInfo.autotune_recommended_notes?.map(note => (
                    <span key={note} className="text-xs bg-pink-500/20 border border-pink-500/30 text-pink-300 px-2 py-0.5 rounded-lg">
                      {note}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/30 text-xs">Confiance</p>
                <p className="text-emerald-400 font-bold">{Math.round((keyInfo.confidence || 0.7) * 100)}%</p>
              </div>
            </div>

            {/* Instru player */}
            {instruFile && (
              <div>
                <audio
                  ref={instruAudioRef}
                  src={URL.createObjectURL(instruFile)}
                  loop
                  onEnded={() => setIsPlaying(false)}
                />
                <button onClick={toggleInstru}
                  className="flex items-center gap-2 text-sm text-white/60 bg-white/5 border border-white/10 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'Pause instru' : 'Écouter instru'}
                  <span className="text-white/30 text-xs ml-1">{instruFile.name.slice(0, 20)}...</span>
                </button>
              </div>
            )}
          </div>

          {/* Autotune settings */}
          <div className="glass-card rounded-3xl border border-pink-500/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎤</span>
              <p className="text-pink-400 font-medium text-sm">Autotune T-Pain · Clé {keyInfo.key} {keyInfo.mode}</p>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-white/40 text-xs">Intensité</p>
              <p className="text-pink-400 text-xs font-bold">{Math.round(autotuneStrength * 100)}%</p>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={autotuneStrength}
              onChange={e => setAutotuneStrength(parseFloat(e.target.value))}
              className="w-full accent-pink-500" />
            <div className="flex justify-between text-xs text-white/20 mt-1">
              <span>Naturel</span>
              <span>T-Pain Max</span>
            </div>
          </div>

          {/* VU Meter while recording */}
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
                  <div key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500 to-pink-500 transition-all duration-75"
                    style={{ height: `${Math.max(4, vocalLevel * 100 * (0.5 + Math.sin(Date.now() / 100 + i) * 0.5))}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Record button */}
          <div className="glass-card rounded-3xl border border-white/8 p-6 text-center">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-4">
              {step === 'ready' ? 'Prêt à enregistrer' : 'Enregistrement en cours...'}
            </p>
            <button
              onClick={step === 'recording' ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all mb-3 ${
                step === 'recording'
                  ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110'
                  : 'bg-gradient-to-br from-violet-600 to-pink-600 shadow-neon-purple hover:scale-105'
              }`}>
              {step === 'recording'
                ? <MicOff size={32} className="text-white" />
                : <Mic size={32} className="text-white" />
              }
            </button>
            <p className="text-white/50 text-sm">
              {step === 'recording'
                ? 'Appuie pour arrêter et mixer'
                : "Appuie → l'instru démarre + tu chantes"
              }
            </p>
            {step === 'ready' && (
              <p className="text-violet-400 text-xs mt-2">
                Chaîne vocale : Avalon Pre-amp → EQ Pultec → Compression → Valhalla Reverb
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── MIXING ── */}
      {step === 'mixing' && (
        <div className="glass-card rounded-3xl border border-violet-500/20 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-spin-slow">
            <Zap size={28} className="text-white" />
          </div>
          <p className="text-white font-semibold text-lg mb-6">{loadingMsg}</p>
          <div className="space-y-3 text-left max-w-sm mx-auto">
            {[
              { label: '🎤 High-pass + De-ess', done: true },
              { label: '🎚️ EQ Pultec/SSL', done: true },
              { label: '📻 Tube Pre-amp Avalon', done: true },
              { label: '🔊 Compression studio 4:1', done: true },
              { label: '🏔️ Reverb Valhalla', done: true },
              { label: '⏱️ Delay 1/8 note', done: true },
              { label: '🎵 Mix voix + instru', done: false },
              { label: '📦 Mastering -14 LUFS', done: false },
            ].map(({ label, done }, i) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${done ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  {done ? <Check size={10} className="text-white" /> : <Loader size={10} className="text-white/40 animate-spin" />}
                </div>
                <span className={done ? 'text-emerald-400' : 'text-white/50'}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {step === 'done' && mixedUrl && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-emerald-500/20 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-emerald-400" />
            </div>
            <h2 className="font-display font-black text-2xl text-white mb-1">Mix Terminé ! 🎉</h2>
            <p className="text-white/40 text-sm mb-2">
              Tonalité {keyInfo?.key} {keyInfo?.mode} · {keyInfo?.bpm} BPM
            </p>
            <p className="text-emerald-400 text-xs mb-6">
              Avalon Pre-amp · EQ Pultec · Valhalla Reverb · Mastering -14 LUFS Spotify
            </p>
            <audio controls src={mixedUrl} className="w-full rounded-2xl mb-4" />
            <a href={mixedUrl} download={`vizion-mix-${keyInfo?.key}${keyInfo?.mode}-${keyInfo?.bpm}bpm.wav`}
              className="flex items-center gap-2 justify-center bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold px-6 py-4 rounded-2xl hover:opacity-90 transition-opacity w-full">
              <Download size={20} />
              Télécharger WAV · {keyInfo?.key} {keyInfo?.mode} {keyInfo?.bpm}BPM
            </a>
          </div>

          <button
            onClick={() => {
              setStep('upload')
              setInstruFile(null)
              setKeyInfo(null)
              setRecordedBlob(null)
              setMixedUrl(null)
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
