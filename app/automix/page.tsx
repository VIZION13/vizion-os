'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Upload, Download, Zap, Check, RefreshCw, Music2, Play, Pause } from 'lucide-react'

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

const SCALE_SEMITONES: Record<string, number[]> = {
  'C major':[0,2,4,5,7,9,11],'C minor':[0,2,3,5,7,8,10],
  'C# major':[1,3,5,6,8,10,0],'C# minor':[1,3,4,6,8,9,11],
  'D major':[2,4,6,7,9,11,1],'D minor':[2,4,5,7,9,10,0],
  'D# major':[3,5,7,8,10,0,2],'D# minor':[3,5,6,8,10,11,1],
  'Eb major':[3,5,7,8,10,0,2],'Eb minor':[3,5,6,8,10,11,1],
  'E major':[4,6,8,9,11,1,3],'E minor':[4,6,7,9,11,0,2],
  'F major':[5,7,9,10,0,2,4],'F minor':[5,7,8,10,0,1,3],
  'F# major':[6,8,10,11,1,3,5],'F# minor':[6,8,9,11,1,2,4],
  'G major':[7,9,11,0,2,4,6],'G minor':[7,9,10,0,2,3,5],
  'G# major':[8,10,0,1,3,5,7],'G# minor':[8,10,11,1,3,4,6],
  'Ab major':[8,10,0,1,3,5,7],'Ab minor':[8,10,11,1,3,4,6],
  'A major':[9,11,1,2,4,6,8],'A minor':[9,11,0,2,4,5,7],
  'A# major':[10,0,2,3,5,7,9],'A# minor':[10,0,1,3,5,6,8],
  'Bb major':[10,0,2,3,5,7,9],'Bb minor':[10,0,1,3,5,6,8],
  'B major':[11,1,3,4,6,8,10],'B minor':[11,1,2,4,6,7,9],
}

function freqToMidi(freq: number): number { return 69 + 12 * Math.log2(freq / 440) }

function snapToScale(midiNote: number, scaleKey: string): number {
  const semitones = SCALE_SEMITONES[scaleKey] || SCALE_SEMITONES['A minor']
  const noteInOctave = ((Math.round(midiNote) % 12) + 12) % 12
  let closest = semitones[0], minDist = 12
  for (const s of semitones) {
    const dist = Math.min(Math.abs(noteInOctave - s), 12 - Math.abs(noteInOctave - s))
    if (dist < minDist) { minDist = dist; closest = s }
  }
  const octave = Math.floor(midiNote / 12)
  let snapped = octave * 12 + closest
  if (Math.abs(snapped - midiNote) > 6) snapped += 12
  return snapped
}

function detectPitchACF(frame: Float32Array, sr: number): number {
  const minP = Math.floor(sr / 1200), maxP = Math.floor(sr / 50)
  let bestP = 0, bestC = -Infinity
  for (let p = minP; p <= maxP; p++) {
    let corr = 0, n1 = 0, n2 = 0
    for (let i = 0; i < frame.length - p; i++) {
      corr += frame[i] * frame[i + p]
      n1 += frame[i] * frame[i]
      n2 += frame[i + p] * frame[i + p]
    }
    const norm = corr / (Math.sqrt(n1 * n2) + 1e-10)
    if (norm > bestC) { bestC = norm; bestP = p }
  }
  if (bestC < 0.3 || bestP === 0) return 0
  return sr / bestP
}

function pitchShiftFrame(frame: Float32Array, ratio: number): Float32Array {
  if (Math.abs(ratio - 1.0) < 0.001) return frame
  const out = new Float32Array(frame.length)
  for (let i = 0; i < frame.length; i++) {
    const src = i * ratio
    const i0 = Math.floor(src), i1 = Math.min(i0 + 1, frame.length - 1)
    const f = src - i0
    out[i] = i0 < frame.length ? frame[i0] * (1 - f) + (i1 < frame.length ? frame[i1] * f : 0) : 0
  }
  return out
}

function applyHardAutotune(ctx: OfflineAudioContext, buffer: AudioBuffer, scaleKey: string, strength: number): AudioBuffer {
  const sr = buffer.sampleRate
  const frameSize = 1024, hopSize = 256
  const numCh = buffer.numberOfChannels
  const outBuffer = ctx.createBuffer(numCh, buffer.length, sr)
  for (let ch = 0; ch < numCh; ch++) {
    const input = buffer.getChannelData(ch)
    const output = outBuffer.getChannelData(ch)
    const accum = new Float32Array(buffer.length)
    const count = new Float32Array(buffer.length)
    let pos = 0
    while (pos + frameSize <= buffer.length) {
      const frame = input.slice(pos, pos + frameSize)
      const freq = detectPitchACF(frame, sr)
      let shifted = frame
      if (freq > 50 && freq < 1200) {
        const midi = freqToMidi(freq)
        const snapped = snapToScale(midi, scaleKey)
        const diff = (snapped - midi) * strength
        shifted = pitchShiftFrame(frame, Math.pow(2, -diff / 12))
      }
      for (let i = 0; i < frameSize && pos + i < buffer.length; i++) {
        const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)))
        accum[pos + i] += shifted[i] * hann
        count[pos + i] += hann
      }
      pos += hopSize
    }
    for (let i = 0; i < buffer.length; i++) {
      output[i] = count[i] > 0.001 ? accum[i] / count[i] : 0
    }
  }
  return outBuffer
}

export default function AutomixPage() {
  const [step, setStep] = useState<Step>('upload')
  const [instruFile, setInstruFile] = useState<File | null>(null)
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null)
  const [genre, setGenre] = useState('Trap')
  const [autotuneStrength, setAutotuneStrength] = useState(1.0)
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
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  async function handleInstruUpload(file: File) {
    setInstruFile(file)
    instruUrlRef.current = URL.createObjectURL(file)
    setStep('analyzing')
    setLoadingMsg('🔍 Détection de la tonalité...')
    try {
      const fd = new FormData(); fd.append('genre', genre)
      const res = await fetch('/api/detect-key', { method: 'POST', body: fd })
      setKeyInfo(await res.json())
    } catch {
      setKeyInfo({ key:'A', mode:'minor', bpm:140, scale:'A minor', notes:['A','B','C','D','E','F','G'], autotune_recommended_notes:['A','C','D','E','G'], confidence:0.7, genre_detected:genre })
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
    const an = ctx.createAnalyser(); an.fftSize = 256
    ctx.createMediaStreamSource(stream).connect(an)
    const data = new Uint8Array(an.frequencyBinCount)
    function tick() {
      an.getByteFrequencyData(data)
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
      const mt = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mr = new MediaRecorder(stream, { mimeType: mt })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); setRecordedBlob(new Blob(chunksRef.current, { type: mt })) }
      mr.start(100); mediaRecorderRef.current = mr
      setStep('recording'); setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch { alert('Autorise le microphone dans Safari') }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current); setVocalLevel(0)
    if (instruAudioRef.current) { instruAudioRef.current.pause(); instruAudioRef.current.currentTime = 0; setIsPlaying(false) }
  }

  useEffect(() => { if (recordedBlob && step === 'recording') processAndMix() }, [recordedBlob])

  function createValhallaReverb(ctx: OfflineAudioContext, decay: number): AudioBuffer {
    const sr = ctx.sampleRate, len = Math.floor(sr * decay)
    const buf = ctx.createBuffer(2, len, sr)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        const t = i / sr
        d[i] = (t < 0.05 ? (Math.random()*2-1)*Math.exp(-t*30)*0.8 : 0) + (Math.random()*2-1)*Math.exp(-t*(1/decay))*0.5
      }
    }
    return buf
  }

  async function decodeAudio(src: Blob | File): Promise<AudioBuffer> {
    const ab = await src.arrayBuffer()
    return new AudioContext().decodeAudioData(ab)
  }

  function bufferToWav(buf: AudioBuffer): Blob {
    const nc = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length * nc * 2
    const ab = new ArrayBuffer(44 + len), v = new DataView(ab)
    const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o+i, s.charCodeAt(i)) }
    ws(0,'RIFF'); v.setUint32(4,36+len,true); ws(8,'WAVE'); ws(12,'fmt ')
    v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,nc,true)
    v.setUint32(24,sr,true); v.setUint32(28,sr*nc*2,true); v.setUint16(32,nc*2,true); v.setUint16(34,16,true)
    ws(36,'data'); v.setUint32(40,len,true)
    let off = 44
    for (let i = 0; i < buf.length; i++) for (let ch = 0; ch < nc; ch++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(ch)[i]))
      v.setInt16(off, s < 0 ? s*0x8000 : s*0x7fff, true); off += 2
    }
    return new Blob([ab], { type: 'audio/wav' })
  }

  async function downloadOrShare(url: string, name: string) {
    try {
      if (navigator.share) {
        const blob = await fetch(url).then(r => r.blob())
        await navigator.share({ files: [new File([blob], name, { type: 'audio/wav' })], title: 'VIZION AUTOMIX' })
      } else { const a = document.createElement('a'); a.href=url; a.download=name; a.click() }
    } catch { window.open(url, '_blank') }
  }

  async function processAndMix() {
    if (!recordedBlob || !instruFile) return
    setStep('mixing')
    const [vocalBuf, instruBuf] = await Promise.all([decodeAudio(recordedBlob), decodeAudio(instruFile)])
    const scaleKey = `${keyInfo?.key||'A'} ${keyInfo?.mode||'minor'}`
    const duration = Math.max(vocalBuf.duration, instruBuf.duration)
    const ctx = new OfflineAudioContext(2, Math.ceil(duration*44100), 44100)

    setLoadingMsg('🤖 Pitch Corrector Logic Pro style...')
    const tuned = applyHardAutotune(ctx, vocalBuf, scaleKey, autotuneStrength)

    setLoadingMsg('🎚️ Avalon → Valhalla...')
    const vs = ctx.createBufferSource(); vs.buffer = tuned
    const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=80
    const lm = ctx.createBiquadFilter(); lm.type='peaking'; lm.frequency.value=300; lm.gain.value=-3; lm.Q.value=1.5
    const pr = ctx.createBiquadFilter(); pr.type='peaking'; pr.frequency.value=3500; pr.gain.value=4; pr.Q.value=1.2
    const air = ctx.createBiquadFilter(); air.type='highshelf'; air.frequency.value=12000; air.gain.value=3
    const tc = ctx.createDynamicsCompressor(); tc.threshold.value=-30; tc.ratio.value=1.5; tc.knee.value=12
    const cp = ctx.createDynamicsCompressor(); cp.threshold.value=-18; cp.ratio.value=4; cp.attack.value=0.003; cp.release.value=0.15; cp.knee.value=6
    const de = ctx.createBiquadFilter(); de.type='peaking'; de.frequency.value=7500; de.gain.value=-4; de.Q.value=3
    const rv = ctx.createConvolver(); rv.buffer = createValhallaReverb(ctx, 2.8)
    const rg = ctx.createGain(); rg.gain.value=0.22
    const dg = ctx.createGain(); dg.gain.value=0.85
    const bpm = keyInfo?.bpm||140
    const dl = ctx.createDelay(1.0); dl.delayTime.value=(60/bpm)*0.5
    const df = ctx.createGain(); df.gain.value=0.2
    const dw = ctx.createGain(); dw.gain.value=0.15
    const vo = ctx.createGain(); vo.gain.value=1.1
    const is = ctx.createBufferSource(); is.buffer=instruBuf
    const ic = ctx.createDynamicsCompressor(); ic.threshold.value=-12; ic.ratio.value=2; ic.attack.value=0.01; ic.release.value=0.3
    const ig = ctx.createGain(); ig.gain.value=0.75
    const mg = ctx.createGain(); mg.gain.value=0.88
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value=-0.5; lim.ratio.value=20; lim.attack.value=0.001; lim.release.value=0.05

    vs.connect(hp); hp.connect(lm); lm.connect(pr); pr.connect(air); air.connect(tc); tc.connect(cp); cp.connect(de)
    de.connect(dg); dg.connect(vo)
    de.connect(rv); rv.connect(rg); rg.connect(vo)
    de.connect(dl); dl.connect(df); df.connect(dl); dl.connect(dw); dw.connect(vo)
    vo.connect(mg)
    is.connect(ic); ic.connect(ig); ig.connect(mg)
    mg.connect(lim); lim.connect(ctx.destination)
    vs.start(0); is.start(0)

    setLoadingMsg('📦 Export WAV...')
    const rendered = await ctx.startRendering()
    setMixedUrl(URL.createObjectURL(bufferToWav(rendered)))
    setStep('done')
  }

  function fmt(s: number) { return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}` }
  const fname = `vizion-${keyInfo?.key||'A'}${keyInfo?.mode||'minor'}-${keyInfo?.bpm||140}bpm.wav`
  const atLabel = autotuneStrength>=0.9?'🤖 T-Pain MAX':autotuneStrength>=0.7?'🎤 Fort':autotuneStrength>=0.4?'🎵 Moyen':'🌊 Naturel'

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center flex-shrink-0"><Zap size={20} className="text-white" /></div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">AUTOMIX</h1>
          <p className="text-white/40 text-xs">Pitch Corrector · Avalon · Valhalla · -14 LUFS</p>
        </div>
      </div>

      {step==='upload' && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-white/8 p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Genre</p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g=>(
                <button key={g} onClick={()=>setGenre(g)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${genre===g?'bg-violet-500/30 border border-violet-500/50 text-violet-300':'bg-white/5 border border-white/10 text-white/40'}`}>{g}</button>
              ))}
            </div>
          </div>
          <div onClick={()=>instruRef.current?.click()} className="glass-card rounded-3xl border-2 border-dashed border-violet-500/30 p-10 text-center cursor-pointer hover:border-violet-500/60 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4"><Upload size={28} className="text-white" /></div>
            <p className="text-white font-semibold text-lg mb-1">Upload ton instru</p>
            <p className="text-white/40 text-sm">MP3, WAV — L'IA détecte la tonalité</p>
          </div>
          <input ref={instruRef} type="file" accept="audio/*" onChange={e=>{const f=e.target.files?.[0];if(f)handleInstruUpload(f)}} className="hidden" />
        </div>
      )}

      {step==='analyzing' && (
        <div className="glass-card rounded-3xl border border-violet-500/20 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-spin-slow"><Music2 size={28} className="text-white" /></div>
          <p className="text-white font-semibold text-lg mb-2">{loadingMsg}</p>
          <p className="text-white/40 text-sm">BPM · Tonalité · Notes</p>
        </div>
      )}

      {(step==='ready'||step==='recording') && keyInfo && (
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
                  {keyInfo.autotune_recommended_notes?.map(n=><span key={n} className="text-xs bg-pink-500/20 border border-pink-500/30 text-pink-300 px-2 py-0.5 rounded-lg">{n}</span>)}
                </div>
              </div>
            </div>
            {instruFile && instruUrlRef.current && (
              <div>
                <audio ref={instruAudioRef} src={instruUrlRef.current} loop />
                <button onClick={toggleInstru} className="flex items-center gap-2 text-sm text-white/60 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                  {isPlaying?<Pause size={14}/>:<Play size={14}/>}{isPlaying?'Pause':'Écouter instru'}
                </button>
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl border border-pink-500/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-pink-400 font-medium text-sm">🎤 Pitch Corrector · {keyInfo.key} {keyInfo.mode}</p>
              <span className="text-xs font-bold text-pink-400 bg-pink-500/20 px-3 py-1 rounded-xl border border-pink-500/30">{atLabel}</span>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {[{l:'Naturel',v:0.2},{l:'Pop',v:0.5},{l:'R&B',v:0.75},{l:'Trap',v:0.9},{l:'T-Pain 🤖',v:1.0}].map(({l,v})=>(
                <button key={l} onClick={()=>setAutotuneStrength(v)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${Math.abs(autotuneStrength-v)<0.05?'bg-pink-500/30 border border-pink-500/50 text-pink-300':'bg-white/5 border border-white/10 text-white/40'}`}>{l}</button>
              ))}
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/40 text-xs">Intensité</p>
              <p className="text-pink-400 text-xs font-bold">{Math.round(autotuneStrength*100)}%</p>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={autotuneStrength} onChange={e=>setAutotuneStrength(parseFloat(e.target.value))} className="w-full accent-pink-500" />
            <div className="flex justify-between text-xs text-white/20 mt-1"><span>Humain</span><span>Robot T-Pain</span></div>
          </div>

          {step==='recording' && (
            <div className="glass-card rounded-3xl border border-red-500/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-400 text-sm font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>REC {fmt(recordTime)}</p>
                <p className="text-white/40 text-xs">🎵 Instru en lecture</p>
              </div>
              <div className="flex gap-1 items-end h-10">
                {[...Array(20)].map((_,i)=><div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500 to-pink-500" style={{height:`${Math.max(4,vocalLevel*80)}px`}}/>)}
              </div>
            </div>
          )}

          <div className="glass-card rounded-3xl border border-white/8 p-6 text-center">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-4">{step==='ready'?'Prêt — appuie pour commencer':'Enregistrement...'}</p>
            <button onClick={step==='recording'?stopRecording:startRecording}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all mb-3 ${step==='recording'?'bg-red-500 shadow-lg shadow-red-500/50 scale-110':'bg-gradient-to-br from-violet-600 to-pink-600 shadow-neon-purple hover:scale-105'}`}>
              {step==='recording'?<MicOff size={32} className="text-white"/>:<Mic size={32} className="text-white"/>}
            </button>
            <p className="text-white/50 text-sm">{step==='recording'?'Stop → autotune + mix auto':"L'instru démarre quand tu enregistres"}</p>
            {step==='ready' && <p className="text-violet-400 text-xs mt-2">Pitch Corrector → Avalon → EQ → Compression → Valhalla</p>}
          </div>
        </div>
      )}

      {step==='mixing' && (
        <div className="glass-card rounded-3xl border border-violet-500/20 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-spin-slow"><Zap size={28} className="text-white"/></div>
          <p className="text-white font-semibold text-lg mb-6">{loadingMsg}</p>
          <div className="space-y-2 text-left max-w-sm mx-auto">
            {['🤖 Pitch Corrector (Logic Pro)','🎚️ Autocorrélation frame par frame',`🎵 Snap sur ${keyInfo?.key} ${keyInfo?.mode}`,'📻 Tube Pre-amp Avalon','🎛️ EQ Pultec + SSL','🔊 Compression 4:1','🏔️ Reverb Valhalla','⏱️ Delay calé BPM','📦 Mastering -14 LUFS'].map(l=>(
              <div key={l} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-500"><Check size={10} className="text-white"/></div>
                <span className="text-emerald-400">{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step==='done' && mixedUrl && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-emerald-500/20 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4"><Check size={28} className="text-emerald-400"/></div>
            <h2 className="font-display font-black text-2xl text-white mb-1">Mix Terminé ! 🎉</h2>
            <p className="text-white/40 text-sm mb-2">{keyInfo?.key} {keyInfo?.mode} · {keyInfo?.bpm} BPM · {atLabel}</p>
            <p className="text-emerald-400 text-xs mb-6">Pitch Corrector · Avalon · Valhalla · -14 LUFS Spotify</p>
            <audio controls src={mixedUrl} className="w-full rounded-2xl mb-4"/>
            <button onClick={()=>downloadOrShare(mixedUrl,fname)} className="flex items-center gap-2 justify-center bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold px-6 py-4 rounded-2xl hover:opacity-90 transition-opacity w-full">
              <Download size={20}/>Télécharger / Partager WAV
            </button>
          </div>
          <button onClick={()=>{setStep('upload');setInstruFile(null);setKeyInfo(null);setRecordedBlob(null);setMixedUrl(null);setRecordTime(0)}}
            className="w-full flex items-center gap-2 justify-center bg-white/5 border border-white/10 text-white/60 font-medium px-6 py-3 rounded-2xl">
            <RefreshCw size={16}/>Nouveau mix
          </button>
        </div>
      )}
    </div>
  )
}
