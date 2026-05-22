// ─── Music Theory ─────────────────────────────────────────────────────────────
const CHORD_INTERVALS = {
  major:[0,4,7], minor:[0,3,7], maj7:[0,4,7,11],
  min7:[0,3,7,10], dom7:[0,4,7,10], sus2:[0,2,7],
};
const SCALE_INTERVALS = {
  pentatonicMaj:[0,2,4,7,9], pentatonicMin:[0,3,5,7,10],
  major:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10],
  phrygian:[0,1,3,5,7,8,10], aeolian:[0,2,3,5,7,8,10],
};
const NOTE_NAMES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

const midiToNote    = midi => NOTE_NAMES[((midi%12)+12)%12] + Math.floor(midi/12-1);
const transposeNote = (note,n) => midiToNote(Tone.Frequency(note).toMidi()+n);
const rand  = (a,b) => a + Math.random()*(b-a);
const pick  = arr  => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

function buildScaleNotes(root, type, octaves=2) {
  const base = Tone.Frequency(root).toMidi();
  const out  = [];
  for (let o=0; o<octaves; o++)
    SCALE_INTERVALS[type].forEach(s => out.push(midiToNote(base+s+o*12)));
  return out;
}

// Integer 16th-note time — avoids floating-point rounding
function b2t(beats) {
  const s16=Math.round(beats*4), bar=Math.floor(s16/16), rem=s16%16;
  return `${bar}:${Math.floor(rem/4)}:${rem%4}`;
}
const BL = {'1m':4,'2n.':3,'2n':2,'4n.':1.5,'4n':1,'8n.':0.75,'8n':0.5,'16n':0.25};

// ─── Event builders ───────────────────────────────────────────────────────────
// 3-note chord: root · third · fifth (third and fifth voiced an octave above root)
function chordEvents(prog) {
  const evs=[]; let sb=0;
  for (const ch of prog) {
    const root = Tone.Frequency(ch.root).toMidi();
    const ints = CHORD_INTERVALS[ch.quality];
    const notes = [
      midiToNote(root),
      midiToNote(root + ints[clamp(1,0,ints.length-1)] + 12),
      midiToNote(root + ints[clamp(2,0,ints.length-1)] + 12),
    ];
    evs.push({time:b2t(sb), notes, bars:ch.bars});
    sb += ch.bars*4;
  }
  return evs;
}

// Bass plays root one octave below the chord root
function bassEvents(prog) {
  const evs=[]; let sb=0;
  for (const ch of prog) {
    evs.push({time:b2t(sb), note:midiToNote(Tone.Frequency(ch.root).toMidi()-12), duration:`${ch.bars}m`});
    sb += ch.bars*4;
  }
  return evs;
}

// ─── Melody: one 2-bar motif, repeated with slight variations ─────────────────
// Repeating a motif is what makes a melody sound like "a melody" rather than noise.
function makeMotif(scale, lo, hi, motifBeats, durPool) {
  const cells = [];
  let idx = Math.round((lo+hi)/2);
  let beat = 0, sinceRest = 0;
  const restEvery = 4 + Math.floor(Math.random()*3);

  while (beat < motifBeats-0.25) {
    const dur  = pick(durPool);
    const durB = BL[dur]||1;
    if (beat+durB > motifBeats) break;

    if (sinceRest >= restEvery && Math.random()<0.65) {
      cells.push({rest:true, dur}); beat+=durB; sinceRest=0; continue;
    }

    const r = Math.random();
    let step = r<0.52 ? (Math.random()<0.55?1:-1) : r<0.80 ? (Math.random()<0.5?2:-2) : (Math.random()<0.5?3:-3);
    if (idx+step>hi) step=-Math.abs(step);
    if (idx+step<lo) step= Math.abs(step);
    idx = clamp(idx+step, lo, hi);

    cells.push({rest:false, scaleIdx:idx, dur}); beat+=durB; sinceRest++;
  }
  return cells;
}

function melodyEvents(prog, scaleRoot, scaleType, style) {
  const total = prog.reduce((s,c)=>s+c.bars, 0);
  const scale = buildScaleNotes(scaleRoot, scaleType, 2);
  const lo=1, hi=clamp(lo+8, lo+3, scale.length-2);

  const durPool = {
    lofi:   ['8n','4n','8n','8n','4n','4n'],
    nature: ['4n','4n','4n.','2n','4n'],
    space:  ['2n','4n.','2n','2n','4n.'],
    dark:   ['4n','4n.','2n','4n','4n'],
  }[style] || ['4n','4n','4n.','2n'];

  const motifBars = 2;
  const motif = makeMotif(scale, lo, hi, motifBars*4, durPool);

  const evs = [];
  for (let bar=0; bar<total; bar+=motifBars) {
    const vary = Math.random()<0.35;
    let beat = bar*4;
    for (const cell of motif) {
      const durB = BL[cell.dur]||1;
      if (beat+durB > (bar+motifBars)*4) break;
      if (!cell.rest) {
        const off = (vary && Math.random()<0.35) ? (Math.random()<0.5?1:-1) : 0;
        const ni  = clamp(cell.scaleIdx+off, lo, hi);
        evs.push({time:b2t(beat), note:scale[ni], duration:cell.dur, velocity:0.46+Math.random()*0.22});
      }
      beat += durB;
    }
  }
  return evs;
}

// ─── Moods ────────────────────────────────────────────────────────────────────
const MOODS = {
  'forest-rain':    {label:'Forest Rain',        style:'nature',color:'#2ecc71',bpmRange:[46,56],
    progression:[{root:'C3',quality:'maj7',bars:2},{root:'A2',quality:'min7',bars:2},{root:'F2',quality:'maj7',bars:2},{root:'G2',quality:'dom7',bars:2}],
    scaleRoot:'C4',scaleType:'pentatonicMaj',keyVariance:4,hasPerc:false,
    chordAttack:[0.4,0.7],chordRelease:[2.5,3.5],revWet:[0.08,0.13],revDec:[1.2,1.8]},
  'ocean-drift':    {label:'Ocean Drift',        style:'nature',color:'#3498db',bpmRange:[40,50],
    progression:[{root:'D3',quality:'min7',bars:3},{root:'C3',quality:'maj7',bars:2},{root:'Bb2',quality:'maj7',bars:2},{root:'F2',quality:'major',bars:1}],
    scaleRoot:'D4',scaleType:'pentatonicMin',keyVariance:3,hasPerc:false,
    chordAttack:[0.5,0.9],chordRelease:[3,4],revWet:[0.10,0.15],revDec:[1.5,2.2]},
  'peaceful-meadow':{label:'Peaceful Meadow',    style:'nature',color:'#27ae60',bpmRange:[56,68],
    progression:[{root:'G3',quality:'maj7',bars:2},{root:'E3',quality:'min7',bars:2},{root:'C3',quality:'maj7',bars:2},{root:'D3',quality:'dom7',bars:2}],
    scaleRoot:'G4',scaleType:'major',keyVariance:5,hasPerc:false,
    chordAttack:[0.3,0.6],chordRelease:[2,3],revWet:[0.08,0.12],revDec:[1.0,1.6]},
  'deep-space':     {label:'Deep Space',         style:'space', color:'#6c63ff',bpmRange:[28,36],
    progression:[{root:'A2',quality:'min7',bars:4},{root:'F2',quality:'maj7',bars:4},{root:'G2',quality:'dom7',bars:4},{root:'E2',quality:'minor',bars:4}],
    scaleRoot:'A4',scaleType:'aeolian',keyVariance:3,hasPerc:false,
    chordAttack:[1.5,2.5],chordRelease:[5,7],revWet:[0.14,0.20],revDec:[2.2,3.0]},
  'nebula-drift':   {label:'Nebula Drift',       style:'space', color:'#9b59b6',bpmRange:[34,44],
    progression:[{root:'E3',quality:'min7',bars:4},{root:'A2',quality:'dom7',bars:2},{root:'D3',quality:'maj7',bars:2}],
    scaleRoot:'E4',scaleType:'dorian',keyVariance:4,hasPerc:false,
    chordAttack:[1.2,2.0],chordRelease:[4,6],revWet:[0.13,0.18],revDec:[2.0,2.8]},
  'stellar-journey':{label:'Stellar Journey',    style:'space', color:'#3498db',bpmRange:[44,56],
    progression:[{root:'C3',quality:'min7',bars:3},{root:'Db3',quality:'maj7',bars:2},{root:'Bb2',quality:'maj7',bars:2},{root:'Ab2',quality:'maj7',bars:1}],
    scaleRoot:'C4',scaleType:'phrygian',keyVariance:3,hasPerc:false,
    chordAttack:[1.0,1.8],chordRelease:[3.5,5],revWet:[0.12,0.17],revDec:[1.8,2.5]},
  'late-night':     {label:'Late Night Study',   style:'lofi',  color:'#e67e22',bpmRange:[70,82],
    progression:[{root:'D3',quality:'min7',bars:2},{root:'G2',quality:'dom7',bars:2},{root:'C3',quality:'maj7',bars:2},{root:'A2',quality:'min7',bars:2}],
    scaleRoot:'D4',scaleType:'dorian',keyVariance:5,hasPerc:true,
    chordAttack:[0.01,0.03],chordRelease:[1.5,2.2],revWet:[0.05,0.09],revDec:[0.8,1.2]},
  'rainy-cafe':     {label:'Rainy Café',          style:'lofi',  color:'#e67e22',bpmRange:[74,88],
    progression:[{root:'F3',quality:'min7',bars:2},{root:'Eb3',quality:'maj7',bars:2},{root:'Db3',quality:'maj7',bars:2},{root:'Eb3',quality:'dom7',bars:2}],
    scaleRoot:'F4',scaleType:'pentatonicMin',keyVariance:4,hasPerc:true,
    chordAttack:[0.01,0.03],chordRelease:[1.2,1.8],revWet:[0.05,0.09],revDec:[0.8,1.2]},
  'nostalgic':      {label:'Nostalgic Afternoon', style:'lofi',  color:'#d35400',bpmRange:[64,76],
    progression:[{root:'C3',quality:'maj7',bars:2},{root:'A2',quality:'min7',bars:2},{root:'F2',quality:'maj7',bars:2},{root:'G2',quality:'dom7',bars:2}],
    scaleRoot:'C4',scaleType:'pentatonicMaj',keyVariance:5,hasPerc:true,
    chordAttack:[0.01,0.03],chordRelease:[1.5,2.0],revWet:[0.05,0.09],revDec:[0.8,1.2]},
  'tense':          {label:'Tense Atmosphere',   style:'dark',  color:'#8e44ad',bpmRange:[52,64],
    progression:[{root:'C3',quality:'minor',bars:3},{root:'Db3',quality:'major',bars:1},{root:'Ab2',quality:'maj7',bars:2},{root:'Bb2',quality:'minor',bars:2}],
    scaleRoot:'C4',scaleType:'phrygian',keyVariance:3,hasPerc:false,
    chordAttack:[0.12,0.25],chordRelease:[2,3],revWet:[0.10,0.15],revDec:[1.4,2.0]},
  'mysterious':     {label:'Mysterious Cave',    style:'dark',  color:'#6c3483',bpmRange:[42,54],
    progression:[{root:'E3',quality:'minor',bars:4},{root:'C3',quality:'maj7',bars:2},{root:'G2',quality:'minor',bars:2}],
    scaleRoot:'E4',scaleType:'aeolian',keyVariance:3,hasPerc:false,
    chordAttack:[0.18,0.35],chordRelease:[2.5,3.5],revWet:[0.10,0.15],revDec:[1.6,2.2]},
  'epic':           {label:'Epic Horizon',       style:'dark',  color:'#922b21',bpmRange:[62,74],
    progression:[{root:'D3',quality:'minor',bars:2},{root:'C3',quality:'major',bars:2},{root:'Bb2',quality:'major',bars:2},{root:'C3',quality:'major',bars:2}],
    scaleRoot:'D4',scaleType:'aeolian',keyVariance:4,hasPerc:false,
    chordAttack:[0.10,0.20],chordRelease:[2,3],revWet:[0.10,0.15],revDec:[1.2,1.8]},
};

// ─── State ────────────────────────────────────────────────────────────────────
let selectedMood  = null;
let durationMin   = 30;
let isPlaying     = false;
let isGenerating  = false;
let engine        = null;
let recorder      = null;
let recChunks     = [];
let recTimer      = null;
let progressTimer = null;
let visualizerAF  = null;
let playbackStart = 0;

// ─── DOM ──────────────────────────────────────────────────────────────────────
const generateBtn  = document.getElementById('generate-btn');
const statusRow    = document.getElementById('status-row');
const progressBar  = document.getElementById('progress-bar');
const statusText   = document.getElementById('status-text');
const visSection   = document.getElementById('visualizer-section');
const visCanvas    = document.getElementById('visualizer');
const playPauseBtn = document.getElementById('play-pause-btn');
const stopBtn      = document.getElementById('stop-btn');
const downloadBtn  = document.getElementById('download-btn');
const nowPlaying   = document.getElementById('now-playing');
const bgCanvas     = document.getElementById('bg-canvas');

// ─── Background particles ─────────────────────────────────────────────────────
(function(){
  const ctx=bgCanvas.getContext('2d'); let W,H,pts;
  const resize=()=>{W=bgCanvas.width=innerWidth;H=bgCanvas.height=innerHeight;};
  const init=()=>{pts=Array.from({length:80},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+0.3,vx:(Math.random()-.5)*.15,vy:(Math.random()-.5)*.15,a:Math.random()*.6+.1}));};
  const draw=()=>{ctx.clearRect(0,0,W,H);for(const p of pts){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(108,99,255,${p.a})`;ctx.fill();p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;}requestAnimationFrame(draw);};
  window.addEventListener('resize',()=>{resize();init();}); resize();init();draw();
})();

// ─── Mood cards ───────────────────────────────────────────────────────────────
document.querySelectorAll('.mood-card').forEach(card=>{
  card.addEventListener('click',()=>{
    if(isPlaying||isGenerating) return;
    document.querySelectorAll('.mood-card').forEach(c=>c.classList.remove('selected'));
    card.classList.add('selected');
    selectedMood=card.dataset.mood;
    generateBtn.disabled=false;
    generateBtn.querySelector('.btn-label').textContent=`Generate "${MOODS[selectedMood].label}"`;
  });
});

// ─── Duration ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.dur-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.dur-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); durationMin=parseInt(btn.dataset.minutes);
    document.getElementById('custom-minutes').value='';
  });
});
document.getElementById('custom-minutes').addEventListener('input',e=>{
  const v=parseInt(e.target.value);
  if(v>0&&v<=180){durationMin=v;document.querySelectorAll('.dur-btn').forEach(b=>b.classList.remove('active'));}
});

// ─── Audio Engine ─────────────────────────────────────────────────────────────
class AmbientEngine {
  constructor(moodKey) {
    this.cfg   = MOODS[moodKey];
    this.parts = [];
    this.nodes = [];
    this.analyser = null;
    this.p = this._pick();
  }

  _pick() {
    const cfg = this.cfg;
    const bpm       = Math.round(rand(cfg.bpmRange[0], cfg.bpmRange[1]));
    const totalBars = cfg.progression.reduce((s,c)=>s+c.bars, 0);
    const loopSec   = totalBars*4*(60/bpm);
    const keyShift  = Math.round(Math.random()*cfg.keyVariance);
    const prog      = cfg.progression.map(c=>({...c, root:transposeNote(c.root,keyShift)}));
    const scaleRoot = transposeNote(cfg.scaleRoot, keyShift);
    const rootName  = NOTE_NAMES[Tone.Frequency(scaleRoot).toMidi()%12];
    return {
      bpm, totalBars, loopSec, prog, scaleRoot,
      chA:    rand(cfg.chordAttack[0],  cfg.chordAttack[1]),
      chR:    rand(cfg.chordRelease[0], cfg.chordRelease[1]),
      revWet: rand(cfg.revWet[0],  cfg.revWet[1]),
      revDec: rand(cfg.revDec[0],  cfg.revDec[1]),
      label:  `${rootName} · ${bpm} BPM`,
    };
  }

  async init() {
    await Tone.start();
    const {p, cfg} = this;
    Tone.Transport.bpm.value     = p.bpm;
    Tone.Transport.timeSignature = [4,4];

    // ── Signal chain: everything → reverb → limiter → recTap → analyser → out
    const reverb  = new Tone.Reverb({decay:p.revDec, preDelay:0.02, wet:p.revWet});
    await reverb.ready;
    const limiter = new Tone.Limiter(-2);
    const master  = new Tone.Volume(-4);
    const recTap  = new Tone.Volume(0);
    this.analyser = new Tone.Analyser('waveform',512);
    this.master   = recTap;

    master.chain(reverb, limiter, recTap);
    recTap.chain(this.analyser);
    this.analyser.toDestination();
    this.nodes.push(reverb, limiter, master, recTap);

    const isLofi  = cfg.style==='lofi';
    const isSpace = cfg.style==='space';

    // ── Chord synth ───────────────────────────────────────────────────────────
    // Lo-fi: fast attack like a piano. Ambient: slow fade-in.
    const chordOsc = isLofi ? 'triangle' : 'sine';
    const chord = new Tone.PolySynth(Tone.Synth, {
      oscillator:{type:chordOsc},
      envelope:{attack:p.chA, decay:0.4, sustain:isSpace?0.88:0.70, release:p.chR},
    });
    chord.volume.value = -14;
    chord.connect(master);
    this.nodes.push(chord);

    const cp = new Tone.Part((time,ev)=>{
      chord.releaseAll(time);
      // Stagger notes slightly for a strummed feel
      ev.notes.forEach((n,i)=>chord.triggerAttack(n, time+i*0.018, 0.44+Math.random()*0.10));
      chord.releaseAll(time + Tone.Time(`${ev.bars}m`).toSeconds() - p.chR*0.35);
    }, chordEvents(p.prog));
    cp.loop=true; cp.loopEnd=`${p.totalBars}m`; this.parts.push(cp);

    // ── Bass ──────────────────────────────────────────────────────────────────
    const bass = new Tone.Synth({
      oscillator:{type:'sine'},
      envelope:{attack:isLofi?0.04:p.chA*0.6, decay:0.3, sustain:0.82, release:1.5},
    });
    bass.volume.value = -15;
    bass.connect(master);
    this.nodes.push(bass);

    const bp = new Tone.Part((time,ev)=>{
      bass.triggerAttackRelease(ev.note, ev.duration, time, 0.62);
    }, bassEvents(p.prog));
    bp.loop=true; bp.loopEnd=`${p.totalBars}m`; this.parts.push(bp);

    // ── Lead melody ───────────────────────────────────────────────────────────
    // The loudest voice. Fast attack so each note speaks clearly.
    const mel = new Tone.Synth({
      oscillator:{type: isLofi ? 'triangle' : 'sine'},
      envelope:{
        attack:  isLofi ? 0.02 : 0.06,
        decay:   isLofi ? 0.55 : 0.28,
        sustain: isLofi ? 0.28 : 0.58,
        release: isLofi ? 1.3  : 2.0,
      },
    });
    mel.volume.value = -5;
    mel.connect(master);
    this.nodes.push(mel);

    const mevs = melodyEvents(p.prog, p.scaleRoot, cfg.scaleType, cfg.style);
    if (mevs.length) {
      const mp = new Tone.Part(
        (time,ev)=>mel.triggerAttackRelease(ev.note,ev.duration,time,ev.velocity),
        mevs
      );
      mp.loop=true; mp.loopEnd=`${p.totalBars}m`; this.parts.push(mp);
    }

    // ── Lo-fi beat (kick / snare / hi-hat) ────────────────────────────────────
    if (cfg.hasPerc) this._perc(master);

    Tone.Transport.loop    = true;
    Tone.Transport.loopEnd = `${p.totalBars}m`;
  }

  _perc(dest) {
    const kick  = new Tone.MembraneSynth({pitchDecay:0.05,octaves:5,envelope:{attack:0.001,decay:0.25,sustain:0,release:0.1}});
    kick.volume.value  = -18; kick.connect(dest);
    const snare = new Tone.NoiseSynth({noise:{type:'pink'},envelope:{attack:0.001,decay:0.13,sustain:0,release:0.05}});
    snare.volume.value = -24; snare.connect(dest);
    const hh    = new Tone.NoiseSynth({noise:{type:'white'},envelope:{attack:0.001,decay:0.03,sustain:0,release:0.01}});
    hh.volume.value    = -30; hh.connect(dest);
    this.nodes.push(kick,snare,hh);

    const evs=[];
    for (let bar=0; bar<this.p.totalBars; bar++) {
      evs.push({time:`${bar}:0:0`,t:'k'},{time:`${bar}:2:0`,t:'k'},
               {time:`${bar}:1:0`,t:'s'},{time:`${bar}:3:0`,t:'s'});
      for (let b=0;b<4;b++) evs.push({time:`${bar}:${b}:0`,t:'h'},{time:`${bar}:${b}:2`,t:'h'});
    }
    const ppt = new Tone.Part((time,ev)=>{
      if(ev.t==='k') kick.triggerAttackRelease('C1','8n',time);
      if(ev.t==='s') snare.triggerAttackRelease('8n',time);
      if(ev.t==='h'&&Math.random()<0.55) hh.triggerAttackRelease('16n',time);
    }, evs);
    ppt.loop=true; ppt.loopEnd=`${this.p.totalBars}m`; this.parts.push(ppt);
  }

  start()  { this.parts.forEach(p=>p.start(0)); Tone.Transport.start('+0.1'); isPlaying=true; }
  pause()  { Tone.Transport.pause();  isPlaying=false; }
  resume() { Tone.Transport.start();  isPlaying=true;  }

  stop() {
    Tone.Transport.stop(); Tone.Transport.loop=false;
    this.parts.forEach(p=>{try{p.stop();p.dispose();}catch(e){}});
    this.nodes.forEach(n=>{try{n.dispose();}catch(e){}});
    this.parts=[]; this.nodes=[]; isPlaying=false;
  }

  waveform() { return this.analyser ? this.analyser.getValue() : new Float32Array(512); }
}

// ─── Recorder ─────────────────────────────────────────────────────────────────
function startRecorder(masterNode, loopSec) {
  try {
    const rawCtx = Tone.getContext().rawContext;
    const dest   = rawCtx.createMediaStreamDestination();
    masterNode.connect(dest);
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm';
    recorder  = new MediaRecorder(dest.stream, {mimeType:mime});
    recChunks = [];
    recorder.ondataavailable = e=>{ if(e.data.size>0) recChunks.push(e.data); };
    recorder.onstop = ()=>{
      if(recChunks.length){
        downloadBtn.style.display='inline-flex';
        statusText.textContent = isPlaying ? 'Download ready · still playing' : 'Stopped · Download ready';
      }
    };
    recorder.start(500);
    recTimer = setTimeout(()=>{ if(recorder&&recorder.state!=='inactive') recorder.stop(); }, loopSec*1000+300);
  } catch(e){ console.warn('MediaRecorder unavailable:',e); }
}

function stopRecorder() {
  if(recTimer){ clearTimeout(recTimer); recTimer=null; }
  if(recorder&&recorder.state!=='inactive') recorder.stop();
}

// ─── Visualizer ───────────────────────────────────────────────────────────────
function startVis(color) {
  const ctx=visCanvas.getContext('2d');
  visCanvas.width=visCanvas.offsetWidth; visCanvas.height=120;
  const W=visCanvas.width, H=120;
  const draw=()=>{
    visualizerAF=requestAnimationFrame(draw);
    ctx.clearRect(0,0,W,H);
    const data=engine?engine.waveform():new Float32Array(512);
    ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=1.5;
    const step=W/data.length;
    for(let i=0;i<data.length;i++){const x=i*step,y=(data[i]*.5+.5)*H;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.stroke();
  };
  draw();
}
function stopVis(){if(visualizerAF){cancelAnimationFrame(visualizerAF);visualizerAF=null;}}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function startProgress(totalMs) {
  playbackStart=Date.now();
  progressTimer=setInterval(()=>{
    const el=Date.now()-playbackStart, pct=Math.min((el/totalMs)*100,100);
    progressBar.style.width=pct+'%';
    const rem=Math.max(0,totalMs-el), m=Math.floor(rem/60000), s=Math.floor((rem%60000)/1000);
    if(isPlaying) statusText.textContent=`Playing · ${m}:${s.toString().padStart(2,'0')} remaining`;
    if(pct>=100) stopPlayback(true);
  },1000);
}
function stopProgress(){if(progressTimer){clearInterval(progressTimer);progressTimer=null;}}

// ─── Generate ─────────────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async ()=>{
  if(isGenerating) return;
  if(isPlaying){ stopPlayback(false); return; }

  isGenerating=true;
  generateBtn.disabled=true;
  generateBtn.querySelector('.btn-label').textContent='Starting…';
  statusRow.style.display='block';
  progressBar.style.width='0%';
  statusText.textContent='Initialising…';
  downloadBtn.style.display='none';

  try {
    if(engine){engine.stop();engine=null;}
    engine=new AmbientEngine(selectedMood);
    await engine.init();

    const {loopSec,label}=engine.p;
    const loopStr=loopSec<60?`${Math.round(loopSec)}s loop`:`${(loopSec/60).toFixed(1)} min loop`;

    startRecorder(engine.master, loopSec);
    engine.start();

    isGenerating=false;
    generateBtn.classList.add('generating');
    generateBtn.disabled=false;
    generateBtn.querySelector('.btn-icon').textContent='⬛';
    generateBtn.querySelector('.btn-label').textContent='Stop';

    visSection.style.display='block';
    nowPlaying.textContent=`${MOODS[selectedMood].label} · ${label} · ${loopStr}`;
    statusText.textContent=`Recording loop in background · download ready in ~${Math.round(loopSec)}s`;

    startVis(MOODS[selectedMood].color);
    startProgress(durationMin*60*1000);

  } catch(err){
    console.error(err);
    statusText.textContent='Error: '+err.message;
    isGenerating=false; generateBtn.disabled=false;
    generateBtn.querySelector('.btn-label').textContent=`Generate "${MOODS[selectedMood]?.label}"`;
  }
});

// ─── Playback controls ────────────────────────────────────────────────────────
playPauseBtn.addEventListener('click',()=>{
  if(!engine) return;
  if(isPlaying){engine.pause();stopProgress();playPauseBtn.textContent='▶ Resume';}
  else{engine.resume();startProgress((durationMin*60*1000)-(Date.now()-playbackStart));playPauseBtn.textContent='⏸ Pause';}
  isPlaying=!isPlaying;
});

stopBtn.addEventListener('click',()=>stopPlayback(false));

function stopPlayback(finished){
  stopProgress(); stopVis(); stopRecorder();
  if(engine){engine.stop();engine=null;}
  isPlaying=false; isGenerating=false;
  generateBtn.classList.remove('generating');
  generateBtn.querySelector('.btn-icon').textContent='▶';
  generateBtn.querySelector('.btn-label').textContent=selectedMood?`Generate "${MOODS[selectedMood].label}"`:'Select a Mood';
  generateBtn.disabled=!selectedMood;
  playPauseBtn.textContent='⏸ Pause';
  progressBar.style.width=finished?'100%':progressBar.style.width;
  if(!recChunks.length) statusText.textContent=finished?'Done!':'Stopped.';
  nowPlaying.textContent='';
}

// ─── Download ─────────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click',()=>{
  if(!recChunks.length) return;
  const blob=new Blob(recChunks,{type:'audio/webm'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`ambientforge-${selectedMood}.webm`;
  a.click(); URL.revokeObjectURL(url);
});
