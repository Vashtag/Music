// ─── Music Theory ─────────────────────────────────────────────────────────────
const CHORD_INTERVALS = {
  major:[0,4,7], minor:[0,3,7], maj7:[0,4,7,11],
  min7:[0,3,7,10], dom7:[0,4,7,10], sus2:[0,2,7], dim:[0,3,6],
};
const SCALE_INTERVALS = {
  pentatonicMaj:[0,2,4,7,9], pentatonicMin:[0,3,5,7,10],
  major:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10],
  phrygian:[0,1,3,5,7,8,10], aeolian:[0,2,3,5,7,8,10],
};
const NOTE_NAMES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const midiToNote = midi => NOTE_NAMES[((midi%12)+12)%12] + Math.floor(midi/12-1);
const transposeNote = (note, n) => midiToNote(Tone.Frequency(note).toMidi() + n);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function buildScaleNotes(root, type, octaves=2) {
  const base = Tone.Frequency(root).toMidi();
  const out = [];
  for (let o=0; o<octaves; o++) SCALE_INTERVALS[type].forEach(s => out.push(midiToNote(base+s+o*12)));
  return out;
}

// Integer 16th-note arithmetic — no floating-point rounding glitches
function b2t(beats) {
  const s16=Math.round(beats*4), bar=Math.floor(s16/16), rem=s16%16;
  return `${bar}:${Math.floor(rem/4)}:${rem%4}`;
}
const BL = {'1m':4,'2n':2,'4n':1,'8n':0.5,'16n':0.25,'4n.':1.5};

// ─── Event builders ───────────────────────────────────────────────────────────
function arpEvents(prog, pat, speed) {
  const sb=BL[speed]||1, evs=[];
  let start=0;
  for (const ch of prog) {
    const cb=ch.bars*4, root=Tone.Frequency(ch.root).toMidi();
    const notes=CHORD_INTERVALS[ch.quality].map(s=>midiToNote(root+s+12));
    let beat=0, step=0;
    while (beat < cb-sb*0.4) {
      const pi=pat[step%pat.length];
      if (pi>=0) evs.push({time:b2t(start+beat), note:notes[pi%notes.length], velocity:0.28+Math.random()*0.10});
      beat+=sb; step++;
    }
    start+=cb;
  }
  return evs;
}

function padEvents(prog) {
  const evs=[]; let sb=0;
  for (const ch of prog) {
    const root=Tone.Frequency(ch.root).toMidi();
    const base=CHORD_INTERVALS[ch.quality].map(s=>midiToNote(root+s));
    const high=CHORD_INTERVALS[ch.quality].slice(0,2).map(s=>midiToNote(root+s+12));
    evs.push({time:b2t(sb), notes:[...base,...high], bars:ch.bars});
    sb+=ch.bars*4;
  }
  return evs;
}

function bassEvents(prog) {
  const evs=[]; let sb=0;
  for (const ch of prog) {
    evs.push({time:b2t(sb), note:midiToNote(Tone.Frequency(ch.root).toMidi()-12), duration:`${ch.bars}m`});
    sb+=ch.bars*4;
  }
  return evs;
}

function makePhrase(scale, len, startIdx) {
  const shapes=[[1,1,-1,2,-1,1],[-1,1,2,-1,1,-2],[1,2,1,-2,-1,1],[2,-1,1,1,-2,1],[-1,-1,2,-1,2,-1],[1,-2,1,2,-1,-1]];
  const steps=pick(shapes);
  let idx=Math.max(0,Math.min(scale.length-1,startIdx));
  const notes=[];
  for (let i=0;i<len;i++) {
    notes.push(scale[idx]);
    idx=Math.max(0,Math.min(scale.length-1,idx+steps[i%steps.length]));
  }
  return notes;
}

function melodyEvents(prog, scaleRoot, scaleType, every, reg) {
  if (!every) return [];
  const scale=buildScaleNotes(scaleRoot,scaleType,2);
  const baseIdx=Math.floor(scale.length*(reg===1?0.6:0.35));
  const total=prog.reduce((s,c)=>s+c.bars,0);
  const durs=['4n','4n','4n.','2n'], evs=[];
  for (let bar=0; bar<total; bar+=every) {
    if (Math.random()<0.3) continue;
    const phrase=makePhrase(scale,4+Math.floor(Math.random()*5),baseIdx+Math.floor(Math.random()*3)-1);
    let beat=bar*4+rand(0,1);
    for (const note of phrase) {
      if (beat>=total*4) break;
      const dur=pick(durs);
      evs.push({time:b2t(beat), note, duration:dur, velocity:0.20+Math.random()*0.18});
      beat+=BL[dur]||1;
    }
  }
  return evs;
}

// ─── Moods ────────────────────────────────────────────────────────────────────
const MOODS = {
  'forest-rain':    {label:'Forest Rain',       style:'nature',color:'#2ecc71',bpmRange:[46,56],
    progression:[{root:'C3',quality:'maj7',bars:2},{root:'A2',quality:'min7',bars:2},{root:'F2',quality:'maj7',bars:2},{root:'G2',quality:'dom7',bars:2}],
    scaleRoot:'C4',scaleType:'pentatonicMaj',keyVariance:4,
    arpPatterns:[[0,1,2,1,0,2],[0,2,1,0,1,2],[2,1,0,1,2,1]],arpSpeeds:['4n','4n','2n'],
    padType:'sine',padAttack:[3,4.5],padRelease:[4,6],reverbDecayRange:[5,7],reverbWetRange:[0.32,0.44],filterFreqRange:[1800,2800],texture:'rain',hasPerc:false,melodyEveryRange:[4,8]},
  'ocean-drift':    {label:'Ocean Drift',        style:'nature',color:'#3498db',bpmRange:[40,50],
    progression:[{root:'D3',quality:'min7',bars:3},{root:'C3',quality:'maj7',bars:2},{root:'Bb2',quality:'maj7',bars:2},{root:'F2',quality:'major',bars:1}],
    scaleRoot:'D4',scaleType:'pentatonicMin',keyVariance:3,
    arpPatterns:[[0,2,1,2,0],[0,1,2,0,1],[2,0,1,2,1]],arpSpeeds:['2n','2n','4n.'],
    padType:'sine',padAttack:[3.5,5],padRelease:[5,7],reverbDecayRange:[6,8],reverbWetRange:[0.38,0.50],filterFreqRange:[1200,2000],texture:'ocean',hasPerc:false,melodyEveryRange:[6,10]},
  'peaceful-meadow':{label:'Peaceful Meadow',   style:'nature',color:'#27ae60',bpmRange:[56,68],
    progression:[{root:'G3',quality:'maj7',bars:2},{root:'E3',quality:'min7',bars:2},{root:'C3',quality:'maj7',bars:2},{root:'D3',quality:'dom7',bars:2}],
    scaleRoot:'G4',scaleType:'major',keyVariance:5,
    arpPatterns:[[0,1,2,3,2,1],[0,2,1,3,1,2],[3,2,1,0,1,2]],arpSpeeds:['4n','4n','4n.'],
    padType:'triangle',padAttack:[1.5,3],padRelease:[3,5],reverbDecayRange:[4,6],reverbWetRange:[0.28,0.40],filterFreqRange:[2200,3500],texture:'wind',hasPerc:false,melodyEveryRange:[3,6]},
  'deep-space':     {label:'Deep Space',         style:'space', color:'#6c63ff',bpmRange:[28,36],
    progression:[{root:'A2',quality:'min7',bars:4},{root:'F2',quality:'maj7',bars:4},{root:'G2',quality:'dom7',bars:4},{root:'E2',quality:'minor',bars:4}],
    scaleRoot:'A3',scaleType:'aeolian',keyVariance:3,
    arpPatterns:[[0,2,1],[0,1,2],[2,0,1]],arpSpeeds:['2n','1m','2n'],
    padType:'sine',padAttack:[5,7],padRelease:[7,10],reverbDecayRange:[7,9],reverbWetRange:[0.44,0.54],filterFreqRange:[800,1200],texture:'space',hasPerc:false,melodyEveryRange:[12,20]},
  'nebula-drift':   {label:'Nebula Drift',       style:'space', color:'#9b59b6',bpmRange:[34,44],
    progression:[{root:'E3',quality:'min7',bars:4},{root:'A2',quality:'dom7',bars:2},{root:'D3',quality:'maj7',bars:2}],
    scaleRoot:'E4',scaleType:'dorian',keyVariance:4,
    arpPatterns:[[0,2,1,0],[0,1,2,1],[2,1,0,2]],arpSpeeds:['2n','2n','4n.'],
    padType:'sine',padAttack:[4,6],padRelease:[5,8],reverbDecayRange:[7,9],reverbWetRange:[0.42,0.52],filterFreqRange:[1000,1600],texture:'space',hasPerc:false,melodyEveryRange:[6,12]},
  'stellar-journey':{label:'Stellar Journey',   style:'space', color:'#3498db',bpmRange:[44,56],
    progression:[{root:'C3',quality:'min7',bars:3},{root:'Db3',quality:'maj7',bars:2},{root:'Bb2',quality:'maj7',bars:2},{root:'Ab2',quality:'maj7',bars:1}],
    scaleRoot:'C4',scaleType:'phrygian',keyVariance:3,
    arpPatterns:[[0,1,2,1],[0,2,0,1],[1,0,2,0]],arpSpeeds:['2n','4n.','2n'],
    padType:'sine',padAttack:[4,5.5],padRelease:[5,7],reverbDecayRange:[6,8],reverbWetRange:[0.40,0.50],filterFreqRange:[1100,1700],texture:'space',hasPerc:false,melodyEveryRange:[6,10]},
  'late-night':     {label:'Late Night Study',  style:'lofi',  color:'#e67e22',bpmRange:[70,82],
    progression:[{root:'D3',quality:'min7',bars:2},{root:'G2',quality:'dom7',bars:2},{root:'C3',quality:'maj7',bars:2},{root:'A2',quality:'min7',bars:2}],
    scaleRoot:'D4',scaleType:'dorian',keyVariance:5,
    arpPatterns:[[0,2,1,3,0,2,1],[0,3,1,2,0,1,3],[1,0,2,3,1,2,0]],arpSpeeds:['8n','8n','8n'],
    padType:'triangle',padAttack:[0.3,0.8],padRelease:[1.5,2.5],reverbDecayRange:[2,4],reverbWetRange:[0.22,0.34],filterFreqRange:[2800,4000],texture:'vinyl',hasPerc:true,melodyEveryRange:[4,6]},
  'rainy-cafe':     {label:'Rainy Café',         style:'lofi',  color:'#e67e22',bpmRange:[74,88],
    progression:[{root:'F3',quality:'min7',bars:2},{root:'Eb3',quality:'maj7',bars:2},{root:'Db3',quality:'maj7',bars:2},{root:'Eb3',quality:'dom7',bars:2}],
    scaleRoot:'F4',scaleType:'pentatonicMin',keyVariance:4,
    arpPatterns:[[0,1,2,1,3,2],[0,3,1,2,0,2],[2,0,3,1,2,1]],arpSpeeds:['8n','8n','8n'],
    padType:'triangle',padAttack:[0.3,0.6],padRelease:[1.5,2.5],reverbDecayRange:[2,4],reverbWetRange:[0.24,0.36],filterFreqRange:[2500,3500],texture:'rain',hasPerc:true,melodyEveryRange:[3,6]},
  'nostalgic':      {label:'Nostalgic Afternoon',style:'lofi',  color:'#d35400',bpmRange:[64,76],
    progression:[{root:'C3',quality:'maj7',bars:2},{root:'A2',quality:'min7',bars:2},{root:'F2',quality:'maj7',bars:2},{root:'G2',quality:'dom7',bars:2}],
    scaleRoot:'C4',scaleType:'pentatonicMaj',keyVariance:5,
    arpPatterns:[[0,2,1,2],[0,1,2,1],[2,0,1,0]],arpSpeeds:['8n','8n','4n.'],
    padType:'triangle',padAttack:[0.4,0.8],padRelease:[2,3],reverbDecayRange:[2,4],reverbWetRange:[0.20,0.32],filterFreqRange:[3000,4500],texture:'vinyl',hasPerc:true,melodyEveryRange:[3,6]},
  'tense':          {label:'Tense Atmosphere',  style:'dark',  color:'#8e44ad',bpmRange:[52,64],
    progression:[{root:'C3',quality:'minor',bars:3},{root:'Db3',quality:'major',bars:1},{root:'Ab2',quality:'maj7',bars:2},{root:'Bb2',quality:'minor',bars:2}],
    scaleRoot:'C4',scaleType:'phrygian',keyVariance:3,
    arpPatterns:[[0,-1,1,-1,2,-1],[0,-1,-1,1,-1,2],[-1,0,-1,2,-1,1]],arpSpeeds:['4n','4n','4n.'],
    padType:'sine',padAttack:[3.5,5],padRelease:[4.5,6],reverbDecayRange:[6,8],reverbWetRange:[0.36,0.48],filterFreqRange:[700,1100],texture:'wind',hasPerc:false,melodyEveryRange:[0,0]},
  'mysterious':     {label:'Mysterious Cave',   style:'dark',  color:'#6c3483',bpmRange:[42,54],
    progression:[{root:'E3',quality:'minor',bars:4},{root:'C3',quality:'maj7',bars:2},{root:'G2',quality:'minor',bars:2}],
    scaleRoot:'E4',scaleType:'aeolian',keyVariance:3,
    arpPatterns:[[0,1,2,1],[0,2,1,2],[1,0,2,0]],arpSpeeds:['4n','4n.','4n'],
    padType:'sine',padAttack:[3,4.5],padRelease:[4.5,6],reverbDecayRange:[6,8],reverbWetRange:[0.40,0.50],filterFreqRange:[900,1400],texture:'space',hasPerc:false,melodyEveryRange:[6,10]},
  'epic':           {label:'Epic Horizon',      style:'dark',  color:'#922b21',bpmRange:[62,74],
    progression:[{root:'D3',quality:'minor',bars:2},{root:'C3',quality:'major',bars:2},{root:'Bb2',quality:'major',bars:2},{root:'C3',quality:'major',bars:2}],
    scaleRoot:'D4',scaleType:'aeolian',keyVariance:4,
    arpPatterns:[[0,2,1,0,2],[0,1,2,0,1],[2,0,2,1,0]],arpSpeeds:['4n','4n','4n.'],
    padType:'sine',padAttack:[2.5,4],padRelease:[3.5,5],reverbDecayRange:[5,7],reverbWetRange:[0.34,0.46],filterFreqRange:[1400,2200],texture:'wind',hasPerc:false,melodyEveryRange:[6,10]},
};

// ─── State ────────────────────────────────────────────────────────────────────
let selectedMood   = null;
let durationMin    = 30;
let isPlaying      = false;
let isGenerating   = false;
let engine         = null;
let recorder       = null;
let recChunks      = [];
let recTimer       = null;   // stops recorder after one loop
let progressTimer  = null;
let visualizerAF   = null;
let playbackStart  = 0;

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

// ─── Background Particles ─────────────────────────────────────────────────────
(function(){
  const ctx=bgCanvas.getContext('2d'); let W,H,pts;
  const resize=()=>{W=bgCanvas.width=innerWidth;H=bgCanvas.height=innerHeight;};
  const init=()=>{pts=Array.from({length:80},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+0.3,vx:(Math.random()-.5)*.15,vy:(Math.random()-.5)*.15,a:Math.random()*.6+.1}));};
  const draw=()=>{ctx.clearRect(0,0,W,H);for(const p of pts){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(108,99,255,${p.a})`;ctx.fill();p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;}requestAnimationFrame(draw);};
  window.addEventListener('resize',()=>{resize();init();}); resize();init();draw();
})();

// ─── Mood Cards ───────────────────────────────────────────────────────────────
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
    const loopSec   = totalBars * 4 * (60 / bpm);
    const keyShift  = Math.round(Math.random() * cfg.keyVariance);
    const prog      = cfg.progression.map(c=>({...c, root:transposeNote(c.root,keyShift)}));
    const scaleRoot = transposeNote(cfg.scaleRoot, keyShift);
    const rootName  = NOTE_NAMES[Tone.Frequency(scaleRoot).toMidi() % 12];
    return {
      bpm, totalBars, loopSec, prog, scaleRoot,
      arpPat:  pick(cfg.arpPatterns),
      arpSpd:  pick(cfg.arpSpeeds),
      revWet:  rand(cfg.reverbWetRange[0],  cfg.reverbWetRange[1]),
      revDec:  rand(cfg.reverbDecayRange[0], cfg.reverbDecayRange[1]),
      filt:    Math.round(rand(cfg.filterFreqRange[0], cfg.filterFreqRange[1])),
      padA:    rand(cfg.padAttack[0],  cfg.padAttack[1]),
      padR:    rand(cfg.padRelease[0], cfg.padRelease[1]),
      melEvery:cfg.melodyEveryRange[1]===0 ? 0 : Math.round(rand(cfg.melodyEveryRange[0],cfg.melodyEveryRange[1])),
      melReg:  Math.random()<0.5 ? 0 : 1,
      label:   `${rootName} · ${bpm} BPM`,
    };
  }

  async init() {
    await Tone.start();
    const {p,cfg} = this;
    Tone.Transport.bpm.value     = p.bpm;
    Tone.Transport.timeSignature = [4,4];

    // FX chain — all Tone nodes in the same (online) context
    const reverb  = new Tone.Reverb({decay:p.revDec, preDelay:0.1, wet:p.revWet});
    await reverb.ready;
    const filter  = new Tone.Filter(p.filt,'lowpass',-12);
    const limiter = new Tone.Limiter(-2);
    const master  = new Tone.Volume(-8);
    this.analyser = new Tone.Analyser('waveform', 512);
    this.master   = master;  // exposed so recorder can tap it

    master.chain(filter, reverb, limiter, this.analyser);
    this.analyser.toDestination();
    this.nodes.push(reverb,filter,limiter,master);

    // Pad
    const pad = new Tone.PolySynth(Tone.Synth,{
      oscillator:{type:cfg.padType},
      envelope:{attack:p.padA,decay:1,sustain:0.85,release:p.padR},
    });
    pad.volume.value=-14; pad.connect(master); this.nodes.push(pad);
    const pp = new Tone.Part((time,ev)=>{
      pad.releaseAll(time);
      ev.notes.forEach((n,i)=>pad.triggerAttack(n,time+i*0.04,0.4+Math.random()*0.08));
      pad.releaseAll(time+Tone.Time(`${ev.bars}m`).toSeconds()-p.padR*0.5);
    }, padEvents(p.prog));
    pp.loop=true; pp.loopEnd=`${p.totalBars}m`; this.parts.push(pp);

    // Arp
    const arp = new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:0.015,decay:0.5,sustain:0.2,release:1.0}});
    arp.volume.value=cfg.style==='lofi'?-16:-26; arp.connect(master); this.nodes.push(arp);
    const ap = new Tone.Part((time,ev)=>{
      arp.triggerAttackRelease(ev.note,p.arpSpd,time+(Math.random()-.5)*0.01,ev.velocity);
    }, arpEvents(p.prog,p.arpPat,p.arpSpd));
    ap.loop=true; ap.loopEnd=`${p.totalBars}m`; this.parts.push(ap);

    // Bass
    const bass = new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:p.padA*0.7,decay:0.5,sustain:0.8,release:p.padR}});
    bass.volume.value=cfg.style==='space'?-12:-20; bass.connect(master); this.nodes.push(bass);
    const bp = new Tone.Part((time,ev)=>{
      bass.triggerAttackRelease(ev.note,ev.duration,time,0.55);
    }, bassEvents(p.prog));
    bp.loop=true; bp.loopEnd=`${p.totalBars}m`; this.parts.push(bp);

    // Melody
    if (p.melEvery>0) {
      const mel = new Tone.Synth({
        oscillator:{type:cfg.style==='lofi'?'triangle':'sine'},
        envelope:{attack:cfg.style==='lofi'?0.05:0.7,decay:0.3,sustain:0.45,release:cfg.style==='lofi'?1.2:2.5},
      });
      mel.volume.value=-24; mel.connect(master); this.nodes.push(mel);
      const mevs = melodyEvents(p.prog,p.scaleRoot,cfg.scaleType,p.melEvery,p.melReg);
      if (mevs.length) {
        const mp = new Tone.Part((time,ev)=>mel.triggerAttackRelease(ev.note,ev.duration,time,ev.velocity), mevs);
        mp.loop=true; mp.loopEnd=`${p.totalBars}m`; this.parts.push(mp);
      }
    }

    if (cfg.hasPerc) this._perc(master);
    this._texture(cfg.texture, master);

    Tone.Transport.loop    = true;
    Tone.Transport.loopEnd = `${p.totalBars}m`;
  }

  _perc(dest) {
    const kick=new Tone.MembraneSynth({pitchDecay:0.05,octaves:5}); kick.volume.value=-22; kick.connect(dest);
    const snare=new Tone.NoiseSynth({noise:{type:'pink'},envelope:{attack:0.001,decay:0.12,sustain:0,release:0.04}}); snare.volume.value=-28; snare.connect(dest);
    const hh=new Tone.NoiseSynth({noise:{type:'white'},envelope:{attack:0.001,decay:0.035,sustain:0,release:0.01}}); hh.volume.value=-36; hh.connect(dest);
    this.nodes.push(kick,snare,hh);
    const evs=[];
    for (let bar=0;bar<this.p.totalBars;bar++) {
      evs.push({time:`${bar}:0:0`,t:'k'},{time:`${bar}:2:0`,t:'k'},{time:`${bar}:1:0`,t:'s'},{time:`${bar}:3:0`,t:'s'});
      for(let b=0;b<4;b++){evs.push({time:`${bar}:${b}:0`,t:'h'},{time:`${bar}:${b}:2`,t:'h'});}
    }
    const ppt=new Tone.Part((time,ev)=>{
      if(ev.t==='k')kick.triggerAttackRelease('C1','8n',time);
      if(ev.t==='s')snare.triggerAttackRelease('8n',time);
      if(ev.t==='h'&&Math.random()<0.55)hh.triggerAttackRelease('16n',time);
    },evs);
    ppt.loop=true; ppt.loopEnd=`${this.p.totalBars}m`; this.parts.push(ppt);
  }

  _texture(type, dest) {
    // Low-volume noise adds subliminal ambience; routed through dest (into reverb) but at -44 to -50 dB
    const mk=(color,ffreq,ftype,vol,lfoHz)=>{
      const noise=new Tone.Noise(color).start();
      const filt=new Tone.Filter(ffreq,ftype);
      const v=new Tone.Volume(vol);
      if(lfoHz){const lfo=new Tone.LFO({frequency:lfoHz,min:vol-4,max:vol+2}).start();lfo.connect(v.volume);this.nodes.push(lfo);}
      noise.chain(filt,v,dest);
      this.nodes.push(noise,filt,v);
    };
    if(type==='rain')  mk('pink', 1200,'bandpass',-44,0.12);
    if(type==='ocean') mk('brown', 500,'bandpass',-46,0.06);
    if(type==='wind')  mk('pink',  600,'bandpass',-44,0.08);
    if(type==='space') mk('brown', 280,'lowpass', -50,0.04);
    if(type==='vinyl') mk('pink', 5500,'highpass',-50,0.30);
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
// Taps the engine's master volume node — same audio context, no cross-context issues.
function startRecorder(masterNode, loopSec) {
  try {
    const rawCtx = Tone.getContext().rawContext;
    const dest   = rawCtx.createMediaStreamDestination();

    // Connect the Tone.js master volume's output to the native stream destination
    masterNode.connect(dest);

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm';

    recorder   = new MediaRecorder(dest.stream, {mimeType: mime});
    recChunks  = [];
    recorder.ondataavailable = e => { if (e.data.size>0) recChunks.push(e.data); };

    // Show download as soon as one full loop is captured (~loopSec seconds in)
    recorder.onstop = () => {
      if (recChunks.length) {
        downloadBtn.style.display = 'inline-flex';
        statusText.textContent = isPlaying
          ? `Download ready · still playing`
          : `Stopped · Download ready`;
      }
    };

    recorder.start(500);

    // Stop recording after one loop — gives a clean, complete file
    const loopMs = loopSec * 1000;
    recTimer = setTimeout(() => {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    }, loopMs + 300); // +300ms buffer for the last chunk to arrive

  } catch(e) { console.warn('MediaRecorder unavailable:', e); }
}

function stopRecorder() {
  if (recTimer)  { clearTimeout(recTimer);  recTimer=null; }
  if (recorder && recorder.state !== 'inactive') recorder.stop();
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
  if (isGenerating) return;
  if (isPlaying)    { stopPlayback(false); return; }

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
    const secStr=Math.round(loopSec);

    // Start background recording — captures one loop, then download becomes available
    startRecorder(engine.master, loopSec);
    engine.start();

    isGenerating=false;
    generateBtn.classList.add('generating');
    generateBtn.disabled=false;
    generateBtn.querySelector('.btn-icon').textContent='⬛';
    generateBtn.querySelector('.btn-label').textContent='Stop';

    visSection.style.display='block';
    nowPlaying.textContent=`${MOODS[selectedMood].label} · ${label} · ${loopStr}`;
    statusText.textContent=`Recording loop in background · download ready in ~${secStr}s`;

    startVis(MOODS[selectedMood].color);
    startProgress(durationMin*60*1000);

  } catch(err) {
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
