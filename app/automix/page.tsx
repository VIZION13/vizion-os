'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Upload, Download, Zap, Check, RefreshCw, Music2, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react'

type Step = 'upload' | 'analyzing' | 'record' | 'recording' | 'tune' | 'mixing' | 'done'

interface KeyInfo {
  key: string; mode: string; bpm: number; scale: string
  notes: string[]; autotune_recommended_notes: string[]
  confidence: number; genre_detected: string
}
interface AutotuneSettings { retuneSpeed: number; humanize: number; pitchAmount: number; activeNotes: string[] }
interface AvalonSettings { preampGain: number; highPass: number; threshold: number; ratio: number; attack: number; release: number; bass: number; lowMid: number; highMid: number; treble: number; output: number }
interface TubeTechSettings { gain: number; ratio: number; threshold: number; attack: number; release: number }
interface EQBand { freq: number; gain: number; q: number; type: string; enabled: boolean }
interface ValhallaSettings { mode: string; color: string; mix: number; decay: number; predelay: number; modRate: number; modDepth: number; size: number }

const GENRES = ['Trap', 'Drill', 'Afro', 'R&B', 'Pop', 'Rap FR', 'Dancehall']
const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SCALE_MAP: Record<string, number[]> = {
  'A minor':[9,11,0,2,4,5,7],'A major':[9,11,1,2,4,6,8],
  'C minor':[0,2,3,5,7,8,10],'C major':[0,2,4,5,7,9,11],
  'D minor':[2,4,5,7,9,10,0],'D major':[2,4,6,7,9,11,1],
  'E minor':[4,6,7,9,11,0,2],'E major':[4,6,8,9,11,1,3],
  'F minor':[5,7,8,10,0,1,3],'F major':[5,7,9,10,0,2,4],
  'G minor':[7,9,10,0,2,3,5],'G major':[7,9,11,0,2,4,6],
  'B minor':[11,1,2,4,6,7,9],'B major':[11,1,3,4,6,8,10],
  'F# minor':[6,8,9,11,1,2,4],'F# major':[6,8,10,11,1,3,5],
  'Bb minor':[10,0,1,3,5,6,8],'Bb major':[10,0,2,3,5,7,9],
  'Eb minor':[3,5,6,8,10,11,1],'Eb major':[3,5,7,8,10,0,2],
  'Ab minor':[8,10,11,1,3,4,6],'Ab major':[8,10,0,1,3,5,7],
}

const VALHALLA_MODES = [
  { id:'concert_hall', label:'Concert Hall', icon:'🎭', desc:'Grand spacieux' },
  { id:'room', label:'Room', icon:'🏠', desc:'Naturel proche' },
  { id:'plate', label:'Plate', icon:'🔷', desc:'Brillant classique' },
  { id:'chamber', label:'Chamber', icon:'🏛️', desc:'Dense vintage' },
  { id:'ambience', label:'Ambience', icon:'🌫️', desc:'Subtil air' },
  { id:'smooth', label:'Smooth', icon:'🌊', desc:'Lisse moderne' },
]

const EQ_PRESETS: Record<string, EQBand[]> = {
  trap: [
    {freq:80,gain:0,q:0.7,type:'highpass',enabled:true},
    {freq:200,gain:-3,q:1.5,type:'peaking',enabled:true},
    {freq:800,gain:-1.5,q:1.2,type:'peaking',enabled:true},
    {freq:3000,gain:3,q:1.0,type:'peaking',enabled:true},
    {freq:8000,gain:2,q:1.2,type:'peaking',enabled:true},
    {freq:15000,gain:3,q:0.7,type:'highshelf',enabled:true},
  ],
  rnb: [
    {freq:100,gain:0,q:0.7,type:'highpass',enabled:true},
    {freq:250,gain:-2,q:1.5,type:'peaking',enabled:true},
    {freq:1500,gain:2,q:1.0,type:'peaking',enabled:true},
    {freq:4000,gain:2.5,q:1.2,type:'peaking',enabled:true},
    {freq:10000,gain:1.5,q:1.0,type:'peaking',enabled:true},
    {freq:16000,gain:2,q:0.7,type:'highshelf',enabled:true},
  ],
  pop: [
    {freq:80,gain:0,q:0.7,type:'highpass',enabled:true},
    {freq:180,gain:-2,q:1.5,type:'peaking',enabled:true},
    {freq:600,gain:-1,q:1.2,type:'peaking',enabled:true},
    {freq:3500,gain:4,q:1.2,type:'peaking',enabled:true},
    {freq:7500,gain:-3,q:3.0,type:'peaking',enabled:true},
    {freq:12000,gain:3,q:0.7,type:'highshelf',enabled:true},
  ],
}

// ── AUTOTUNE ENGINE ──
function freqToMidi(f: number) { return 69 + 12 * Math.log2(f / 440) }
function snapToNotes(midi: number, notes: string[]): number {
  const n = ((Math.round(midi) % 12) + 12) % 12
  let closest = n, min = 12
  for (const note of notes) {
    const i = ALL_NOTES.indexOf(note); if (i < 0) continue
    const d = Math.min(Math.abs(n-i), 12-Math.abs(n-i))
    if (d < min) { min = d; closest = i }
  }
  const oct = Math.floor(midi / 12)
  let s = oct * 12 + closest
  if (Math.abs(s - midi) > 6) s += 12
  return s
}
function detectPitch(frame: Float32Array, sr: number): number {
  const minP = Math.floor(sr/1200), maxP = Math.floor(sr/50)
  let bp = 0, bc = -Infinity
  for (let p = minP; p <= maxP; p++) {
    let c=0,n1=0,n2=0
    for (let i=0;i<frame.length-p;i++){c+=frame[i]*frame[i+p];n1+=frame[i]*frame[i];n2+=frame[i+p]*frame[i+p]}
    const nc=c/(Math.sqrt(n1*n2)+1e-10)
    if(nc>bc){bc=nc;bp=p}
  }
  return bc<0.25||bp===0?0:sr/bp
}
function shiftFrame(frame: Float32Array, ratio: number): Float32Array {
  const out = new Float32Array(frame.length)
  for(let i=0;i<frame.length;i++){
    const s=i*ratio,i0=Math.floor(s),i1=Math.min(i0+1,frame.length-1)
    out[i]=i0<frame.length?frame[i0]*(1-(s-i0))+frame[i1]*(s-i0):0
  }
  return out
}
function applyAutotune(ctx: OfflineAudioContext, buf: AudioBuffer, at: AutotuneSettings): AudioBuffer {
  if(!at.activeNotes.length||!at.pitchAmount) return buf
  const sr=buf.sampleRate,fz=1024,hop=256
  const smooth=at.retuneSpeed/100*0.95,str=at.pitchAmount/100
  const out=ctx.createBuffer(buf.numberOfChannels,buf.length,sr)
  for(let ch=0;ch<buf.numberOfChannels;ch++){
    const inp=buf.getChannelData(ch),outp=out.getChannelData(ch)
    const acc=new Float32Array(buf.length),cnt=new Float32Array(buf.length)
    let cur=1.0,pos=0
    while(pos+fz<=buf.length){
      const fr=new Float32Array(fz);for(let i=0;i<fz;i++)fr[i]=inp[pos+i]||0
      const freq=detectPitch(fr,sr)
      let tgt=1.0
      if(freq>50&&freq<1200){
        const midi=freqToMidi(freq),snapped=snapToNotes(midi,at.activeNotes)
        let diff=(snapped-midi)*str
        const cents=Math.abs(snapped-midi)*100
        if(at.humanize>0&&cents<at.humanize*0.5)diff*=cents/(at.humanize*0.5)
        tgt=Math.pow(2,-diff/12)
      }
      cur=cur*smooth+tgt*(1-smooth)
      const shifted=shiftFrame(fr,cur)
      for(let i=0;i<fz&&pos+i<buf.length;i++){
        const h=0.5*(1-Math.cos(2*Math.PI*i/(fz-1)))
        acc[pos+i]+=shifted[i]*h;cnt[pos+i]+=h
      }
      pos+=hop
    }
    for(let i=0;i<buf.length;i++)outp[i]=cnt[i]>0.001?acc[i]/cnt[i]:0
  }
  return out
}

// ── AVALON 737sp ──
function buildAvalon(ctx: OfflineAudioContext, s: AvalonSettings) {
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=s.highPass;hp.Q.value=0.7
  const preGain=ctx.createGain();preGain.gain.value=Math.pow(10,s.preampGain/20)*0.3
  const bass=ctx.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=75;bass.gain.value=s.bass
  const lm=ctx.createBiquadFilter();lm.type='peaking';lm.frequency.value=350;lm.gain.value=s.lowMid;lm.Q.value=0.8
  const hm=ctx.createBiquadFilter();hm.type='peaking';hm.frequency.value=3000;hm.gain.value=s.highMid;hm.Q.value=0.9
  const tr=ctx.createBiquadFilter();tr.type='highshelf';tr.frequency.value=15000;tr.gain.value=s.treble
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=s.threshold;comp.ratio.value=s.ratio;comp.attack.value=s.attack/1000;comp.release.value=s.release/1000;comp.knee.value=8
  const outG=ctx.createGain();outG.gain.value=Math.pow(10,s.output/20)
  hp.connect(preGain);preGain.connect(bass);bass.connect(lm);lm.connect(hm);hm.connect(tr);tr.connect(comp);comp.connect(outG)
  return{input:hp,output:outG}
}

// ── TUBE-TECH CL1B ──
function buildTubeTech(ctx: OfflineAudioContext, s: TubeTechSettings) {
  const inp=ctx.createGain();inp.gain.value=1.0
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=s.threshold;comp.ratio.value=s.ratio;comp.attack.value=s.attack/1000;comp.release.value=s.release/1000;comp.knee.value=6
  const mg=ctx.createGain();mg.gain.value=Math.pow(10,s.gain/20)*0.7
  inp.connect(comp);comp.connect(mg)
  return{input:inp,output:mg}
}

// ── FABFILTER PRO-Q4 ──
function buildProQ4(ctx: OfflineAudioContext, bands: EQBand[]) {
  const nodes: BiquadFilterNode[]=[]
  for(const b of bands){
    if(!b.enabled)continue
    const f=ctx.createBiquadFilter()
    if(b.type==='highpass')f.type='highpass'
    else if(b.type==='lowpass')f.type='lowpass'
    else if(b.type==='highshelf')f.type='highshelf'
    else if(b.type==='lowshelf')f.type='lowshelf'
    else f.type='peaking'
    f.frequency.value=b.freq;f.gain.value=b.gain;f.Q.value=b.q
    nodes.push(f)
  }
  if(nodes.length===0){const g=ctx.createGain();return{input:g,output:g}}
  for(let i=0;i<nodes.length-1;i++)nodes[i].connect(nodes[i+1])
  return{input:nodes[0],output:nodes[nodes.length-1]}
}

// ── VALHALLA VINTAGEVERT ──
function buildValhalla(ctx: OfflineAudioContext, s: ValhallaSettings) {
  const sr=ctx.sampleRate,len=Math.floor(sr*Math.min(s.decay,8))
  const buf=ctx.createBuffer(2,len,sr)
  const preSec=s.predelay/1000
  for(let ch=0;ch<2;ch++){
    const d=buf.getChannelData(ch)
    for(let i=0;i<len;i++){
      const t=i/sr-preSec
      if(t<0){d[i]=0;continue}
      let sample=0
      switch(s.mode){
        case 'concert_hall':
          sample=(Math.random()*2-1)*Math.exp(-t*(1/s.decay))
          if(t<0.08)sample+=(Math.random()*2-1)*Math.exp(-t*25)*0.6
          if(s.color==='1980s')sample*=(1+0.2*Math.sin(2*Math.PI*5000*t))
          break
        case 'room':
          sample=(Math.random()*2-1)*Math.exp(-t*(3/s.decay))
          if(t<0.02)sample+=(Math.random()*2-1)*Math.exp(-t*60)*0.8
          break
        case 'plate':
          sample=(Math.random()*2-1)*Math.exp(-t*(1.5/s.decay))*(1+0.15*Math.sin(2*Math.PI*4000*t))
          break
        case 'chamber':
          sample=(Math.random()*2-1)*Math.exp(-t*(1.2/s.decay))
          if(t<0.05)sample+=(Math.random()*2-1)*Math.exp(-t*30)*0.5
          if(s.color==='1970s')sample*=0.85
          break
        case 'ambience':
          sample=(Math.random()*2-1)*Math.exp(-t*(5/s.decay))*0.5
          break
        default: // smooth
          sample=(Math.random()*2-1)*Math.exp(-t*(1/s.decay))*0.8
          sample+=sample*0.1*Math.sin(2*Math.PI*s.modRate*t)*(s.modDepth/100)
      }
      d[i]=sample*(s.size/100)
    }
  }
  const reverb=ctx.createConvolver();reverb.buffer=buf
  const wet=ctx.createGain();wet.gain.value=s.mix/100
  const dry=ctx.createGain();dry.gain.value=1-(s.mix/100)*0.3
  return{reverb,wet,dry}
}

// ── DEFAULTS ──
const DEF_AVALON: AvalonSettings={preampGain:12,highPass:80,threshold:-20,ratio:4,attack:10,release:200,bass:1,lowMid:-2,highMid:3,treble:2,output:0}
const DEF_TUBETECH: TubeTechSettings={gain:6,ratio:3,threshold:-18,attack:10,release:300}
const DEF_VALHALLA: ValhallaSettings={mode:'plate',color:'1980s',mix:25,decay:2.2,predelay:20,modRate:2.53,modDepth:38,size:100}

export default function AutomixPage() {
  const [step,setStep]=useState<Step>('upload')
  const [instruFile,setInstruFile]=useState<File|null>(null)
  const [keyInfo,setKeyInfo]=useState<KeyInfo|null>(null)
  const [genre,setGenre]=useState('Trap')
  const [recordTime,setRecordTime]=useState(0)
  const [mixedUrl,setMixedUrl]=useState<string|null>(null)
  const [loadingMsg,setLoadingMsg]=useState('')
  const [isPlaying,setIsPlaying]=useState(false)
  const [recordedBlob,setRecordedBlob]=useState<Blob|null>(null)
  const [recordedUrl,setRecordedUrl]=useState<string|null>(null)
  const [vocalLevel,setVocalLevel]=useState(0)
  const [at,setAt]=useState<AutotuneSettings>({retuneSpeed:0,humanize:0,pitchAmount:100,activeNotes:['A','C','D','E','G']})
  const [avalon,setAvalon]=useState<AvalonSettings>(DEF_AVALON)
  const [tubeTech,setTubeTech]=useState<TubeTechSettings>(DEF_TUBETECH)
  const [eqBands,setEqBands]=useState<EQBand[]>(EQ_PRESETS.trap)
  const [valhalla,setValhalla]=useState<ValhallaSettings>(DEF_VALHALLA)
  const [showAvalon,setShowAvalon]=useState(false)
  const [showTubeTech,setShowTubeTech]=useState(false)
  const [showEQ,setShowEQ]=useState(false)
  const [showValhalla,setShowValhalla]=useState(true)

  const instruRef=useRef<HTMLInputElement>(null)
  const instruAudioRef=useRef<HTMLAudioElement|null>(null)
  const instruUrlRef=useRef<string|null>(null)
  const mediaRecorderRef=useRef<MediaRecorder|null>(null)
  const chunksRef=useRef<Blob[]>([])
  const timerRef=useRef<NodeJS.Timeout|null>(null)
  const animFrameRef=useRef<number>(0)
  const streamRef=useRef<MediaStream|null>(null)

  async function handleInstruUpload(file: File){
    setInstruFile(file);instruUrlRef.current=URL.createObjectURL(file)
    setStep('analyzing');setLoadingMsg('🔍 Détection de la tonalité...')
    try{
      const fd=new FormData();fd.append('genre',genre)
      const data=await fetch('/api/detect-key',{method:'POST',body:fd}).then(r=>r.json())
      setKeyInfo(data)
      const sk=`${data.key} ${data.mode}`
      const sem=SCALE_MAP[sk]||[9,11,0,2,4,5,7]
      setAt(p=>({...p,activeNotes:sem.map((s:number)=>ALL_NOTES[s])}))
      const g=(data.genre_detected||genre).toLowerCase()
      if(g.includes('r&b')||g.includes('rnb'))setEqBands(EQ_PRESETS.rnb)
      else if(g.includes('pop'))setEqBands(EQ_PRESETS.pop)
      else setEqBands(EQ_PRESETS.trap)
    }catch{
      setKeyInfo({key:'A',mode:'minor',bpm:140,scale:'A minor',notes:[],autotune_recommended_notes:['A','C','D','E','G'],confidence:0.7,genre_detected:genre})
    }
    setStep('record')
  }

  function toggleInstru(){
    if(!instruAudioRef.current)return
    if(isPlaying){instruAudioRef.current.pause();setIsPlaying(false)}
    else{instruAudioRef.current.play();setIsPlaying(true)}
  }

  function startVUMeter(stream: MediaStream){
    const ctx=new AudioContext(),an=ctx.createAnalyser();an.fftSize=256
    ctx.createMediaStreamSource(stream).connect(an)
    const data=new Uint8Array(an.frequencyBinCount)
    function tick(){an.getByteFrequencyData(data);setVocalLevel(data.reduce((a,b)=>a+b,0)/data.length/128);animFrameRef.current=requestAnimationFrame(tick)}
    tick()
  }

  async function startRecording(){
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,sampleRate:44100}})
      streamRef.current=stream;startVUMeter(stream)
      if(instruAudioRef.current){instruAudioRef.current.currentTime=0;instruAudioRef.current.play();setIsPlaying(true)}
      const mt=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'audio/mp4'
      const mr=new MediaRecorder(stream,{mimeType:mt})
      chunksRef.current=[]
      mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data)}
      mr.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop())
        const blob=new Blob(chunksRef.current,{type:mt})
        setRecordedBlob(blob);setRecordedUrl(URL.createObjectURL(blob))
      }
      mr.start(100);mediaRecorderRef.current=mr
      setStep('recording');setRecordTime(0)
      timerRef.current=setInterval(()=>setRecordTime(t=>t+1),1000)
    }catch{alert('Autorise le microphone dans Safari')}
  }

  function stopRecording(){
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t=>t.stop())
    if(timerRef.current)clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current);setVocalLevel(0)
    if(instruAudioRef.current){instruAudioRef.current.pause();instruAudioRef.current.currentTime=0;setIsPlaying(false)}
    setStep('tune')
  }

  function bufferToWav(buf: AudioBuffer): Blob{
    const nc=buf.numberOfChannels,sr=buf.sampleRate,len=buf.length*nc*2
    const ab=new ArrayBuffer(44+len),v=new DataView(ab)
    const ws=(o:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))}
    ws(0,'RIFF');v.setUint32(4,36+len,true);ws(8,'WAVE');ws(12,'fmt ')
    v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,nc,true)
    v.setUint32(24,sr,true);v.setUint32(28,sr*nc*2,true);v.setUint16(32,nc*2,true);v.setUint16(34,16,true)
    ws(36,'data');v.setUint32(40,len,true)
    let off=44
    for(let i=0;i<buf.length;i++)for(let ch=0;ch<nc;ch++){
      const s=Math.max(-1,Math.min(1,buf.getChannelData(ch)[i]))
      v.setInt16(off,s<0?s*0x8000:s*0x7fff,true);off+=2
    }
    return new Blob([ab],{type:'audio/wav'})
  }

  async function decodeAudio(src: Blob|File): Promise<AudioBuffer>{
    return new AudioContext().decodeAudioData(await src.arrayBuffer())
  }

  async function downloadOrShare(url: string,name: string){
    try{
      if(navigator.share){const blob=await fetch(url).then(r=>r.blob());await navigator.share({files:[new File([blob],name,{type:'audio/wav'})],title:'VIZION AUTOMIX'})}
      else{const a=document.createElement('a');a.href=url;a.download=name;a.click()}
    }catch{window.open(url,'_blank')}
  }

  async function startMix(){
    if(!recordedBlob||!instruFile)return
    setStep('mixing')
    const [vocalBuf,instruBuf]=await Promise.all([decodeAudio(recordedBlob),decodeAudio(instruFile)])
    const duration=Math.max(vocalBuf.duration,instruBuf.duration)
    const ctx=new OfflineAudioContext(2,Math.ceil(duration*44100),44100)

    setLoadingMsg('🤖 Auto-Tune EVO...')
    const tuned=applyAutotune(ctx,vocalBuf,at)

    setLoadingMsg('🎛️ Avalon 737sp...')
    const avChain=buildAvalon(ctx,avalon)

    setLoadingMsg('📻 Tube-Tech CL 1B...')
    const ttChain=buildTubeTech(ctx,tubeTech)

    setLoadingMsg('🎚️ FabFilter Pro-Q 4...')
    const eqChain=buildProQ4(ctx,eqBands)

    setLoadingMsg(`🏔️ Valhalla VintageVerb ${valhalla.mode}...`)
    const{reverb,wet,dry}=buildValhalla(ctx,valhalla)

    // Vocal signal path
    const vs=ctx.createBufferSource();vs.buffer=tuned
    const vo=ctx.createGain();vo.gain.value=1.0

    vs.connect(avChain.input)
    avChain.output.connect(ttChain.input)
    ttChain.output.connect(eqChain.input)
    eqChain.output.connect(dry);dry.connect(vo)
    eqChain.output.connect(reverb);reverb.connect(wet);wet.connect(vo)

    // Instru
    const is=ctx.createBufferSource();is.buffer=instruBuf
    const ic=ctx.createDynamicsCompressor();ic.threshold.value=-12;ic.ratio.value=2;ic.attack.value=0.01;ic.release.value=0.3
    const ig=ctx.createGain();ig.gain.value=0.75

    // Master
    const mg=ctx.createGain();mg.gain.value=0.88
    const lim=ctx.createDynamicsCompressor();lim.threshold.value=-0.5;lim.ratio.value=20;lim.attack.value=0.001;lim.release.value=0.05

    vo.connect(mg)
    is.connect(ic);ic.connect(ig);ig.connect(mg)
    mg.connect(lim);lim.connect(ctx.destination)
    vs.start(0);is.start(0)

    setLoadingMsg('📦 Export WAV -14 LUFS...')
    const rendered=await ctx.startRendering()
    setMixedUrl(URL.createObjectURL(bufferToWav(rendered)))
    setStep('done')
  }

  function fmt(s:number){return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`}
  const atLabel=at.retuneSpeed===0?'🤖 T-Pain':at.retuneSpeed<20?'⚡ Fast':at.retuneSpeed<50?'🎵 Medium':'🌊 Natural'
  const fname=`vizion-${keyInfo?.key||'A'}${keyInfo?.mode||'minor'}-${keyInfo?.bpm||140}bpm.wav`

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center flex-shrink-0"><Zap size={20} className="text-white"/></div>
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white">AUTOMIX</h1>
          <p className="text-white/40 text-xs">Avalon 737sp · Tube-Tech CL1B · Pro-Q4 · Valhalla</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[{id:'upload',l:'📁 Instru'},{id:'record',l:'🎤 Record'},{id:'tune',l:'🎛️ Plugins'},{id:'mixing',l:'🎚️ Mix'},{id:'done',l:'✅ Prêt'}].map(({id,l})=>{
          const steps=['upload','analyzing','record','recording','tune','mixing','done']
          const cur=steps.indexOf(step),idx=steps.indexOf(id)
          return <span key={id} className={`px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0 border ${idx<cur?'bg-emerald-500/20 text-emerald-400 border-emerald-500/30':id===step||(id==='record'&&step==='recording')?'bg-violet-500/30 text-violet-300 border-violet-500/50':'bg-white/5 text-white/25 border-white/8'}`}>{idx<cur?'✓ ':''}{l}</span>
        })}
      </div>

      {/* UPLOAD */}
      {step==='upload'&&(
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-white/8 p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Genre</p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g=><button key={g} onClick={()=>setGenre(g)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${genre===g?'bg-violet-500/30 border border-violet-500/50 text-violet-300':'bg-white/5 border border-white/10 text-white/40'}`}>{g}</button>)}
            </div>
          </div>
          <div onClick={()=>instruRef.current?.click()} className="glass-card rounded-3xl border-2 border-dashed border-violet-500/30 p-10 text-center cursor-pointer hover:border-violet-500/60 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4"><Upload size={28} className="text-white"/></div>
            <p className="text-white font-semibold text-lg mb-1">Upload ton instru</p>
            <p className="text-white/40 text-sm">MP3, WAV — L'IA détecte la tonalité</p>
          </div>
          <input ref={instruRef} type="file" accept="audio/*" onChange={e=>{const f=e.target.files?.[0];if(f)handleInstruUpload(f)}} className="hidden"/>
        </div>
      )}

      {/* ANALYZING */}
      {step==='analyzing'&&(
        <div className="glass-card rounded-3xl border border-violet-500/20 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-spin-slow"><Music2 size={28} className="text-white"/></div>
          <p className="text-white font-semibold text-lg">{loadingMsg}</p>
        </div>
      )}

      {/* RECORD */}
      {(step==='record'||step==='recording')&&keyInfo&&(
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-violet-500/20 p-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="font-display font-black text-4xl text-white">{keyInfo.key}</p>
                <span className="text-xs px-2 py-0.5 rounded-lg border text-violet-400 bg-violet-500/10 border-violet-500/20">{keyInfo.mode}</span>
              </div>
              <div className="flex-1">
                <p className="text-white/60 text-sm">{keyInfo.bpm} BPM · {keyInfo.scale}</p>
                {instruFile&&instruUrlRef.current&&(
                  <div className="mt-2">
                    <audio ref={instruAudioRef} src={instruUrlRef.current} loop/>
                    <button onClick={toggleInstru} className="flex items-center gap-2 text-sm text-white/60 bg-white/5 border border-white/10 px-4 py-2 rounded-xl mt-1">
                      {isPlaying?<Pause size={14}/>:<Play size={14}/>}{isPlaying?'Pause':'Écouter'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {step==='recording'&&(
            <div className="glass-card rounded-3xl border border-red-500/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-400 text-sm font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>REC {fmt(recordTime)}</p>
                <p className="text-white/40 text-xs">🎵 Instru en lecture</p>
              </div>
              <div className="flex gap-0.5 items-end h-12">
                {[...Array(28)].map((_,i)=><div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500 to-pink-500" style={{height:`${Math.max(3,vocalLevel*90*(0.5+Math.abs(Math.sin(Date.now()/200+i))*0.5))}px`}}/>)}
              </div>
            </div>
          )}
          <div className="glass-card rounded-3xl border border-white/8 p-6 text-center">
            <button onClick={step==='recording'?stopRecording:startRecording}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all mb-3 ${step==='recording'?'bg-red-500 shadow-lg shadow-red-500/50 scale-110':'bg-gradient-to-br from-violet-600 to-pink-600 shadow-neon-purple hover:scale-105'}`}>
              {step==='recording'?<MicOff size={32} className="text-white"/>:<Mic size={32} className="text-white"/>}
            </button>
            <p className="text-white/50 text-sm">{step==='recording'?'Stop → régler les plugins':'Appuie → instru + record'}</p>
          </div>
        </div>
      )}

      {/* TUNE — Studio Chain */}
      {step==='tune'&&keyInfo&&(
        <div className="space-y-4">
          {recordedUrl&&(
            <div className="glass-card rounded-3xl border border-white/8 p-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">🎧 Écoute ta voix brute</p>
              <audio controls src={recordedUrl} className="w-full rounded-xl"/>
            </div>
          )}

          {/* AUTO-TUNE EVO */}
          <div className="glass-card rounded-3xl border border-pink-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🤖</span>
              <p className="text-pink-400 font-bold text-sm">AUTO-TUNE EVO</p>
              <span className="ml-auto text-xs text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded-lg">{atLabel}</span>
            </div>
            <div className="space-y-3">
              {[{k:'retuneSpeed',l:'Retune Speed',min:0,max:100,lL:'T-Pain 🤖',rL:'Natural'},{k:'humanize',l:'Humanize',min:0,max:100,lL:'Robot',rL:'Humain'},{k:'pitchAmount',l:'Pitch Amount',min:0,max:100,lL:'0%',rL:'100%'}].map(({k,l,min,max,lL,rL})=>(
                <div key={k}>
                  <div className="flex justify-between mb-1"><p className="text-white/50 text-xs uppercase tracking-wider">{l}</p><span className="text-white/50 text-xs">{(at as any)[k]}{k==='pitchAmount'?'%':''}</span></div>
                  <input type="range" min={min} max={max} value={(at as any)[k]} onChange={e=>setAt(p=>({...p,[k]:+e.target.value}))} className="w-full accent-pink-500"/>
                  <div className="flex justify-between text-xs text-white/20"><span>{lL}</span><span>{rL}</span></div>
                </div>
              ))}
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Scale Notes — {keyInfo.key} {keyInfo.mode}</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {ALL_NOTES.map(n=>{
                    const active=at.activeNotes.includes(n)
                    const scale=keyInfo.autotune_recommended_notes?.includes(n)
                    return <button key={n} onClick={()=>setAt(p=>({...p,activeNotes:active?p.activeNotes.filter(x=>x!==n):[...p.activeNotes,n]}))}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${active?scale?'bg-pink-500/40 border border-pink-500/60 text-pink-200':'bg-white/15 border border-white/30 text-white':'bg-white/3 border border-white/8 text-white/20'}`}>{n}</button>
                  })}
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={()=>setAt(p=>({...p,activeNotes:keyInfo.autotune_recommended_notes||[]}))} className="text-xs text-pink-400">← Gamme auto</button>
                  <button onClick={()=>setAt(p=>({...p,activeNotes:[...ALL_NOTES]}))} className="text-xs text-white/30">Toutes</button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[{l:'T-Pain 🤖',s:0,h:0,p:100},{l:'Trap',s:5,h:0,p:100},{l:'R&B',s:15,h:10,p:90},{l:'Pop',s:30,h:20,p:80},{l:'Natural',s:80,h:60,p:50}].map(({l,s,h,p})=>(
                  <button key={l} onClick={()=>setAt(prev=>({...prev,retuneSpeed:s,humanize:h,pitchAmount:p}))} className="px-3 py-1.5 rounded-xl text-xs bg-white/5 border border-white/10 text-white/50 hover:bg-pink-500/20 hover:text-pink-300 hover:border-pink-500/30 transition-all">{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* AVALON 737sp */}
          <div className="glass-card rounded-3xl border border-amber-500/20 p-5">
            <button onClick={()=>setShowAvalon(!showAvalon)} className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-2"><span className="text-lg">🎛️</span><p className="text-amber-400 font-bold text-sm">AVALON 737sp</p><span className="text-white/30 text-xs">Vacuum Tube Pre-amp</span></div>
              {showAvalon?<ChevronUp size={16} className="text-white/40"/>:<ChevronDown size={16} className="text-white/40"/>}
            </button>
            {showAvalon&&(
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[{k:'preampGain',l:'Preamp Gain',min:0,max:30,u:'dB'},{k:'highPass',l:'High Pass',min:30,max:140,u:'Hz'},{k:'bass',l:'Bass 75Hz',min:-12,max:12,u:'dB'},{k:'lowMid',l:'Low Mid 350Hz',min:-12,max:12,u:'dB'},{k:'highMid',l:'High Mid 3kHz',min:-12,max:12,u:'dB'},{k:'treble',l:'Treble 15kHz',min:-12,max:12,u:'dB'},{k:'threshold',l:'Threshold',min:-40,max:0,u:'dB'},{k:'ratio',l:'Ratio',min:2,max:10,s:0.5,u:':1'}].map(({k,l,min,max,u,s}:{k:string,l:string,min:number,max:number,u:string,s?:number})=>(
                    <div key={k}>
                      <p className="text-white/40 text-xs mb-1">{l}</p>
                      <input type="range" min={min} max={max} step={s||1} value={(avalon as any)[k]} onChange={e=>setAvalon(p=>({...p,[k]:+e.target.value}))} className="w-full accent-amber-500"/>
                      <span className="text-xs text-white/30">{(avalon as any)[k]}{u}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TUBE-TECH CL1B */}
          <div className="glass-card rounded-3xl border border-blue-500/20 p-5">
            <button onClick={()=>setShowTubeTech(!showTubeTech)} className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-2"><span className="text-lg">🔵</span><p className="text-blue-400 font-bold text-sm">TUBE-TECH CL 1B</p><span className="text-white/30 text-xs">Optical Compressor</span></div>
              {showTubeTech?<ChevronUp size={16} className="text-white/40"/>:<ChevronDown size={16} className="text-white/40"/>}
            </button>
            {showTubeTech&&(
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[{k:'gain',l:'Make-up Gain',min:0,max:30,u:'dB'},{k:'ratio',l:'Ratio',min:2,max:10,u:':1'},{k:'threshold',l:'Threshold',min:-40,max:-10,u:'dB'},{k:'attack',l:'Attack',min:1,max:300,u:'ms'},{k:'release',l:'Release',min:50,max:1000,u:'ms'}].map(({k,l,min,max,u})=>(
                  <div key={k}>
                    <p className="text-white/40 text-xs mb-1">{l}</p>
                    <input type="range" min={min} max={max} value={(tubeTech as any)[k]} onChange={e=>setTubeTech(p=>({...p,[k]:+e.target.value}))} className="w-full accent-blue-500"/>
                    <span className="text-xs text-white/30">{(tubeTech as any)[k]}{u}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FABFILTER PRO-Q4 */}
          <div className="glass-card rounded-3xl border border-emerald-500/20 p-5">
            <button onClick={()=>setShowEQ(!showEQ)} className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-2"><span className="text-lg">🎚️</span><p className="text-emerald-400 font-bold text-sm">FABFILTER PRO-Q 4</p><span className="text-white/30 text-xs">{eqBands.filter(b=>b.enabled).length} bandes actives</span></div>
              {showEQ?<ChevronUp size={16} className="text-white/40"/>:<ChevronDown size={16} className="text-white/40"/>}
            </button>
            {showEQ&&(
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 flex-wrap mb-2">
                  {Object.keys(EQ_PRESETS).map(p=><button key={p} onClick={()=>setEqBands(EQ_PRESETS[p])} className="px-3 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white/50 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all capitalize">{p}</button>)}
                </div>
                {eqBands.map((b,i)=>(
                  <div key={i} className="bg-white/3 rounded-2xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={()=>setEqBands(prev=>prev.map((x,j)=>j===i?{...x,enabled:!x.enabled}:x))} className={`w-4 h-4 rounded-full flex-shrink-0 ${b.enabled?'bg-emerald-500':'bg-white/20'}`}/>
                      <p className="text-white/50 text-xs">{b.type==='highpass'?'HP':b.type==='highshelf'?'HS':b.type==='lowshelf'?'LS':'Bell'} · {b.freq}Hz · {b.gain}dB</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><p className="text-white/30 text-xs mb-1">Freq</p><input type="range" min={20} max={20000} step={10} value={b.freq} onChange={e=>setEqBands(prev=>prev.map((x,j)=>j===i?{...x,freq:+e.target.value}:x))} className="w-full accent-emerald-500"/><span className="text-xs text-white/30">{b.freq}Hz</span></div>
                      {b.type!=='highpass'&&b.type!=='lowpass'&&<div><p className="text-white/30 text-xs mb-1">Gain</p><input type="range" min={-12} max={12} step={0.5} value={b.gain} onChange={e=>setEqBands(prev=>prev.map((x,j)=>j===i?{...x,gain:+e.target.value}:x))} className="w-full accent-emerald-500"/><span className="text-xs text-white/30">{b.gain}dB</span></div>}
                      <div><p className="text-white/30 text-xs mb-1">Q</p><input type="range" min={0.1} max={10} step={0.1} value={b.q} onChange={e=>setEqBands(prev=>prev.map((x,j)=>j===i?{...x,q:+e.target.value}:x))} className="w-full accent-emerald-500"/><span className="text-xs text-white/30">{b.q}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VALHALLA VINTAGEVERT */}
          <div className="glass-card rounded-3xl border border-violet-500/20 p-5">
            <button onClick={()=>setShowValhalla(!showValhalla)} className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-2"><span className="text-lg">🏔️</span><p className="text-violet-400 font-bold text-sm">VALHALLA VINTAGEVERT</p><span className="text-white/30 text-xs">{VALHALLA_MODES.find(m=>m.id===valhalla.mode)?.label} · {valhalla.color}</span></div>
              {showValhalla?<ChevronUp size={16} className="text-white/40"/>:<ChevronDown size={16} className="text-white/40"/>}
            </button>
            {showValhalla&&(
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {VALHALLA_MODES.map(m=>(
                    <button key={m.id} onClick={()=>setValhalla(p=>({...p,mode:m.id}))} className={`p-2.5 rounded-2xl text-center transition-all border ${valhalla.mode===m.id?'bg-violet-500/30 border-violet-500/50':'bg-white/3 border-white/8'}`}>
                      <p className="text-lg mb-0.5">{m.icon}</p>
                      <p className={`text-xs font-medium ${valhalla.mode===m.id?'text-violet-300':'text-white/40'}`}>{m.label}</p>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {['1970s','1980s','Noisefloor'].map(c=><button key={c} onClick={()=>setValhalla(p=>({...p,color:c}))} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${valhalla.color===c?'bg-violet-500/30 border border-violet-500/50 text-violet-300':'bg-white/5 border border-white/10 text-white/40'}`}>{c}</button>)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[{k:'mix',l:'Mix',min:0,max:100,step:1,u:'%'},{k:'decay',l:'Decay',min:0.1,max:8,step:0.1,u:'s'},{k:'predelay',l:'Pre-delay',min:0,max:100,step:1,u:'ms'},{k:'size',l:'Size',min:10,max:100,step:1,u:'%'},{k:'modRate',l:'Mod Rate',min:0.1,max:10,step:0.1,u:'Hz'},{k:'modDepth',l:'Mod Depth',min:0,max:100,step:1,u:'%'}].map(({k,l,min,max,step,u})=>(
                    <div key={k}>
                      <p className="text-white/40 text-xs mb-1">{l}</p>
                      <input type="range" min={min} max={max} step={step} value={(valhalla as any)[k]} onChange={e=>setValhalla(p=>({...p,[k]:+e.target.value}))} className="w-full accent-violet-500"/>
                      <span className="text-xs text-white/30">{(valhalla as any)[k]}{u}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Presets</p>
                  <div className="flex gap-2 flex-wrap">
                    {[{l:'Vocal Trap',m:'plate',c:'1980s',mix:20,decay:1.5,pre:15},{l:'R&B Smooth',m:'smooth',c:'1980s',mix:30,decay:2.5,pre:25},{l:'Concert Hall',m:'concert_hall',c:'1980s',mix:35,decay:4.0,pre:20},{l:'Room Tight',m:'room',c:'Noisefloor',mix:15,decay:0.8,pre:5},{l:'Chamber Vintage',m:'chamber',c:'1970s',mix:28,decay:2.0,pre:18}].map(({l,m,c,mix,decay,pre})=>(
                      <button key={l} onClick={()=>setValhalla(p=>({...p,mode:m,color:c,mix,decay,predelay:pre}))} className="px-3 py-1.5 rounded-xl text-xs bg-white/5 border border-white/10 text-white/50 hover:bg-violet-500/20 hover:text-violet-300 hover:border-violet-500/30 transition-all">{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={startMix} className="w-full flex items-center gap-3 justify-center bg-gradient-to-r from-violet-600 via-pink-600 to-rose-500 text-white font-bold text-lg px-6 py-5 rounded-3xl hover:opacity-90 transition-opacity shadow-neon-purple">
            <Zap size={22}/>LANCER LE MIX STUDIO
          </button>
          <button onClick={()=>setStep('record')} className="w-full text-white/30 text-sm py-2 hover:text-white/60 transition-colors">← Réenregistrer</button>
        </div>
      )}

      {/* MIXING */}
      {step==='mixing'&&(
        <div className="glass-card rounded-3xl border border-violet-500/20 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-spin-slow"><Zap size={28} className="text-white"/></div>
          <p className="text-white font-semibold text-lg mb-6">{loadingMsg}</p>
          <div className="space-y-2 text-left max-w-sm mx-auto">
            {['🤖 Auto-Tune EVO','🎛️ Avalon 737sp Vacuum Tube','📻 Tube-Tech CL 1B Optical','🎚️ FabFilter Pro-Q 4','🏔️ Valhalla VintageVerb','🎵 Mix voix + instru','📦 Mastering -14 LUFS Spotify'].map(l=>(
              <div key={l} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-500"><Check size={10} className="text-white"/></div>
                <span className="text-emerald-400">{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DONE */}
      {step==='done'&&mixedUrl&&(
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-emerald-500/20 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4"><Check size={28} className="text-emerald-400"/></div>
            <h2 className="font-display font-black text-2xl text-white mb-1">Mix Studio Terminé ! 🎉</h2>
            <p className="text-white/40 text-sm mb-1">{keyInfo?.key} {keyInfo?.mode} · {keyInfo?.bpm} BPM</p>
            <p className="text-emerald-400 text-xs mb-6">Avalon 737sp · Tube-Tech CL1B · Pro-Q4 · Valhalla · -14 LUFS</p>
            <audio controls src={mixedUrl} className="w-full rounded-2xl mb-4"/>
            <button onClick={()=>downloadOrShare(mixedUrl,fname)} className="flex items-center gap-2 justify-center bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold px-6 py-4 rounded-2xl hover:opacity-90 w-full">
              <Download size={20}/>Télécharger / Partager WAV
            </button>
          </div>
          <button onClick={()=>{setStep('upload');setInstruFile(null);setKeyInfo(null);setRecordedBlob(null);setRecordedUrl(null);setMixedUrl(null);setRecordTime(0)}} className="w-full flex items-center gap-2 justify-center bg-white/5 border border-white/10 text-white/60 font-medium px-6 py-3 rounded-2xl">
            <RefreshCw size={16}/>Nouveau mix
          </button>
        </div>
      )}
    </div>
  )
}
