// ─── Music Theory ─────────────────────────────────────────────────────────────
const CHORD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  maj7:  [0, 4, 7, 11],
  min7:  [0, 3, 7, 10],
  dom7:  [0, 4, 7, 10],
  sus2:  [0, 2, 7],
  dim:   [0, 3, 6],
};

const SCALE_INTERVALS = {
  pentatonicMaj: [0, 2, 4, 7, 9],
  pentatonicMin: [0, 3, 5, 7, 10],
  major:    [0, 2, 4, 5, 7, 9, 11],
  dorian:   [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian:  [0, 2, 3, 5, 7, 8, 10],
};

const NOTE_NAMES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function midiToNote(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + Math.floor(midi / 12 - 1);
}

function transposeNote(note, semitones) {
  return midiToNote(Tone.Frequency(note).toMidi() + semitones);
}

function randomBetween(min, max) { return min + Math.random() * (max - min); }
function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildScaleNotes(rootNote, scaleType, octaves = 2) {
  const rootMidi = Tone.Frequency(rootNote).toMidi();
  const notes = [];
  for (let o = 0; o < octaves; o++)
    SCALE_INTERVALS[scaleType].forEach(s => notes.push(midiToNote(rootMidi + s + o * 12)));
  return notes;
}

// Use integer 16th-note arithmetic to avoid floating-point rounding glitches
function beatsToToneTime(totalBeats) {
  const s16  = Math.round(totalBeats * 4);
  const bar  = Math.floor(s16 / 16);
  const rem  = s16 % 16;
  const beat = Math.floor(rem / 4);
  const six  = rem % 4;
  return `${bar}:${beat}:${six}`;
}

const BEAT_LENGTHS = { '1m': 4, '2n': 2, '4n': 1, '8n': 0.5, '16n': 0.25, '4n.': 1.5 };

// ─── Event builders ───────────────────────────────────────────────────────────
function computeArpEvents(progression, pattern, arpSpeed) {
  const speedBeats = BEAT_LENGTHS[arpSpeed] || 1;
  const events = [];
  let startBeat = 0;
  for (const chord of progression) {
    const chordBeats = chord.bars * 4;
    const rootMidi   = Tone.Frequency(chord.root).toMidi();
    const arpNotes   = CHORD_INTERVALS[chord.quality].map(s => midiToNote(rootMidi + s + 12));
    let beatInChord = 0, step = 0;
    while (beatInChord < chordBeats - speedBeats * 0.4) {
      const patIdx = pattern[step % pattern.length];
      if (patIdx >= 0)
        events.push({ time: beatsToToneTime(startBeat + beatInChord), note: arpNotes[patIdx % arpNotes.length], velocity: 0.28 + Math.random() * 0.10 });
      beatInChord += speedBeats;
      step++;
    }
    startBeat += chordBeats;
  }
  return events;
}

function computePadEvents(progression) {
  const events = [];
  let startBeat = 0;
  for (const chord of progression) {
    const rootMidi = Tone.Frequency(chord.root).toMidi();
    const base = CHORD_INTERVALS[chord.quality].map(s => midiToNote(rootMidi + s));
    const high = CHORD_INTERVALS[chord.quality].slice(0, 2).map(s => midiToNote(rootMidi + s + 12));
    events.push({ time: beatsToToneTime(startBeat), notes: [...base, ...high], bars: chord.bars });
    startBeat += chord.bars * 4;
  }
  return events;
}

function computeBassEvents(progression) {
  const events = [];
  let startBeat = 0;
  for (const chord of progression) {
    const rootMidi = Tone.Frequency(chord.root).toMidi() - 12;
    events.push({ time: beatsToToneTime(startBeat), note: midiToNote(rootMidi), duration: `${chord.bars}m` });
    startBeat += chord.bars * 4;
  }
  return events;
}

function generateMelodyPhrase(scaleNotes, length, startIdx) {
  const contours = [
    [1, 1, -1, 2, -1, 1], [-1, 1, 2, -1, 1, -2],
    [1, 2, 1, -2, -1, 1], [2, -1, 1, 1, -2, 1],
    [-1, -1, 2, -1, 2, -1], [1, -2, 1, 2, -1, -1],
  ];
  const steps = pickFrom(contours);
  let idx = Math.max(0, Math.min(scaleNotes.length - 1, startIdx));
  const notes = [];
  for (let i = 0; i < length; i++) {
    notes.push(scaleNotes[idx]);
    idx = Math.max(0, Math.min(scaleNotes.length - 1, idx + steps[i % steps.length]));
  }
  return notes;
}

function computeMelodyEvents(progression, scaleRoot, scaleType, melodyEvery, register) {
  if (!melodyEvery) return [];
  const scaleNotes  = buildScaleNotes(scaleRoot, scaleType, 2);
  const baseIdx     = Math.floor(scaleNotes.length * (register === 1 ? 0.6 : 0.35));
  const totalBars   = progression.reduce((s, c) => s + c.bars, 0);
  const noteDurs    = ['4n', '4n', '4n.', '2n'];
  const events      = [];

  for (let bar = 0; bar < totalBars; bar += melodyEvery) {
    if (Math.random() < 0.3) continue;
    const phraseLen  = 4 + Math.floor(Math.random() * 5);
    const startIdx   = baseIdx + Math.floor(Math.random() * 3) - 1;
    const phrase     = generateMelodyPhrase(scaleNotes, phraseLen, startIdx);
    let beatOffset   = bar * 4 + randomBetween(0, 1);

    for (const note of phrase) {
      if (beatOffset >= totalBars * 4) break;
      const dur = pickFrom(noteDurs);
      events.push({ time: beatsToToneTime(beatOffset), note, duration: dur, velocity: 0.20 + Math.random() * 0.18 });
      beatOffset += BEAT_LENGTHS[dur] || 1;
    }
  }
  return events;
}

// ─── Mood Definitions ─────────────────────────────────────────────────────────
// Reverb wetness is capped at 0.50 — higher values turn music into indistinct wash.
// Oscillators are sine/triangle only — fat/sawtooth variants sound harsh and staticky.
// Texture noise is routed around reverb and kept at very low volume (-44 to -50 dB).

const MOODS = {
  'forest-rain': {
    label: 'Forest Rain', style: 'nature', color: '#2ecc71',
    bpmRange: [46, 56],
    progression: [
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'A2', quality: 'min7',  bars: 2 },
      { root: 'F2', quality: 'maj7',  bars: 2 },
      { root: 'G2', quality: 'dom7',  bars: 2 },
    ],
    scaleRoot: 'C4', scaleType: 'pentatonicMaj', keyVariance: 4,
    arpPatterns: [[0,1,2,1,0,2],[0,2,1,0,1,2],[2,1,0,1,2,1]],
    arpSpeeds: ['4n','4n','2n'],
    padType: 'sine',     padAttack: [3,4.5], padRelease: [4,6],
    reverbDecayRange: [5,7],  reverbWetRange: [0.32,0.44],
    filterFreqRange: [1800,2800], texture: 'rain',  hasPerc: false, melodyEveryRange: [4,8],
  },
  'ocean-drift': {
    label: 'Ocean Drift', style: 'nature', color: '#3498db',
    bpmRange: [40, 50],
    progression: [
      { root: 'D3', quality: 'min7',  bars: 3 },
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'Bb2', quality: 'maj7', bars: 2 },
      { root: 'F2', quality: 'major', bars: 1 },
    ],
    scaleRoot: 'D4', scaleType: 'pentatonicMin', keyVariance: 3,
    arpPatterns: [[0,2,1,2,0],[0,1,2,0,1],[2,0,1,2,1]],
    arpSpeeds: ['2n','2n','4n.'],
    padType: 'sine',     padAttack: [3.5,5], padRelease: [5,7],
    reverbDecayRange: [6,8],  reverbWetRange: [0.38,0.50],
    filterFreqRange: [1200,2000], texture: 'ocean', hasPerc: false, melodyEveryRange: [6,10],
  },
  'peaceful-meadow': {
    label: 'Peaceful Meadow', style: 'nature', color: '#27ae60',
    bpmRange: [56, 68],
    progression: [
      { root: 'G3', quality: 'maj7',  bars: 2 },
      { root: 'E3', quality: 'min7',  bars: 2 },
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'D3', quality: 'dom7',  bars: 2 },
    ],
    scaleRoot: 'G4', scaleType: 'major', keyVariance: 5,
    arpPatterns: [[0,1,2,3,2,1],[0,2,1,3,1,2],[3,2,1,0,1,2]],
    arpSpeeds: ['4n','4n','4n.'],
    padType: 'triangle', padAttack: [1.5,3],  padRelease: [3,5],
    reverbDecayRange: [4,6],  reverbWetRange: [0.28,0.40],
    filterFreqRange: [2200,3500], texture: 'wind',  hasPerc: false, melodyEveryRange: [3,6],
  },
  'deep-space': {
    label: 'Deep Space', style: 'space', color: '#6c63ff',
    bpmRange: [28, 36],
    progression: [
      { root: 'A2', quality: 'min7',  bars: 4 },
      { root: 'F2', quality: 'maj7',  bars: 4 },
      { root: 'G2', quality: 'dom7',  bars: 4 },
      { root: 'E2', quality: 'minor', bars: 4 },
    ],
    scaleRoot: 'A3', scaleType: 'aeolian', keyVariance: 3,
    arpPatterns: [[0,2,1],[0,1,2],[2,0,1]],
    arpSpeeds: ['2n','1m','2n'],
    padType: 'sine',     padAttack: [5,7], padRelease: [7,10],
    reverbDecayRange: [7,9],  reverbWetRange: [0.44,0.54],
    filterFreqRange: [800,1200], texture: 'space', hasPerc: false, melodyEveryRange: [12,20],
  },
  'nebula-drift': {
    label: 'Nebula Drift', style: 'space', color: '#9b59b6',
    bpmRange: [34, 44],
    progression: [
      { root: 'E3', quality: 'min7',  bars: 4 },
      { root: 'A2', quality: 'dom7',  bars: 2 },
      { root: 'D3', quality: 'maj7',  bars: 2 },
    ],
    scaleRoot: 'E4', scaleType: 'dorian', keyVariance: 4,
    arpPatterns: [[0,2,1,0],[0,1,2,1],[2,1,0,2]],
    arpSpeeds: ['2n','2n','4n.'],
    padType: 'sine',     padAttack: [4,6], padRelease: [5,8],
    reverbDecayRange: [7,9],  reverbWetRange: [0.42,0.52],
    filterFreqRange: [1000,1600], texture: 'space', hasPerc: false, melodyEveryRange: [6,12],
  },
  'stellar-journey': {
    label: 'Stellar Journey', style: 'space', color: '#3498db',
    bpmRange: [44, 56],
    progression: [
      { root: 'C3', quality: 'min7',  bars: 3 },
      { root: 'Db3', quality: 'maj7', bars: 2 },
      { root: 'Bb2', quality: 'maj7', bars: 2 },
      { root: 'Ab2', quality: 'maj7', bars: 1 },
    ],
    scaleRoot: 'C4', scaleType: 'phrygian', keyVariance: 3,
    arpPatterns: [[0,1,2,1],[0,2,0,1],[1,0,2,0]],
    arpSpeeds: ['2n','4n.','2n'],
    padType: 'sine',     padAttack: [4,5.5], padRelease: [5,7],
    reverbDecayRange: [6,8],  reverbWetRange: [0.40,0.50],
    filterFreqRange: [1100,1700], texture: 'space', hasPerc: false, melodyEveryRange: [6,10],
  },
  'late-night': {
    label: 'Late Night Study', style: 'lofi', color: '#e67e22',
    bpmRange: [70, 82],
    progression: [
      { root: 'D3', quality: 'min7',  bars: 2 },
      { root: 'G2', quality: 'dom7',  bars: 2 },
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'A2', quality: 'min7',  bars: 2 },
    ],
    scaleRoot: 'D4', scaleType: 'dorian', keyVariance: 5,
    arpPatterns: [[0,2,1,3,0,2,1],[0,3,1,2,0,1,3],[1,0,2,3,1,2,0]],
    arpSpeeds: ['8n','8n','8n'],
    padType: 'triangle', padAttack: [0.3,0.8], padRelease: [1.5,2.5],
    reverbDecayRange: [2,4],  reverbWetRange: [0.22,0.34],
    filterFreqRange: [2800,4000], texture: 'vinyl', hasPerc: true,  melodyEveryRange: [4,6],
  },
  'rainy-cafe': {
    label: 'Rainy Café', style: 'lofi', color: '#e67e22',
    bpmRange: [74, 88],
    progression: [
      { root: 'F3', quality: 'min7',  bars: 2 },
      { root: 'Eb3', quality: 'maj7', bars: 2 },
      { root: 'Db3', quality: 'maj7', bars: 2 },
      { root: 'Eb3', quality: 'dom7', bars: 2 },
    ],
    scaleRoot: 'F4', scaleType: 'pentatonicMin', keyVariance: 4,
    arpPatterns: [[0,1,2,1,3,2],[0,3,1,2,0,2],[2,0,3,1,2,1]],
    arpSpeeds: ['8n','8n','8n'],
    padType: 'triangle', padAttack: [0.3,0.6], padRelease: [1.5,2.5],
    reverbDecayRange: [2,4],  reverbWetRange: [0.24,0.36],
    filterFreqRange: [2500,3500], texture: 'rain',  hasPerc: true,  melodyEveryRange: [3,6],
  },
  'nostalgic': {
    label: 'Nostalgic Afternoon', style: 'lofi', color: '#d35400',
    bpmRange: [64, 76],
    progression: [
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'A2', quality: 'min7',  bars: 2 },
      { root: 'F2', quality: 'maj7',  bars: 2 },
      { root: 'G2', quality: 'dom7',  bars: 2 },
    ],
    scaleRoot: 'C4', scaleType: 'pentatonicMaj', keyVariance: 5,
    arpPatterns: [[0,2,1,2],[0,1,2,1],[2,0,1,0]],
    arpSpeeds: ['8n','8n','4n.'],
    padType: 'triangle', padAttack: [0.4,0.8], padRelease: [2,3],
    reverbDecayRange: [2,4],  reverbWetRange: [0.20,0.32],
    filterFreqRange: [3000,4500], texture: 'vinyl', hasPerc: true,  melodyEveryRange: [3,6],
  },
  'tense': {
    label: 'Tense Atmosphere', style: 'dark', color: '#8e44ad',
    bpmRange: [52, 64],
    progression: [
      { root: 'C3', quality: 'minor', bars: 3 },
      { root: 'Db3', quality: 'major', bars: 1 },
      { root: 'Ab2', quality: 'maj7',  bars: 2 },
      { root: 'Bb2', quality: 'minor', bars: 2 },
    ],
    scaleRoot: 'C4', scaleType: 'phrygian', keyVariance: 3,
    arpPatterns: [[0,-1,1,-1,2,-1],[0,-1,-1,1,-1,2],[-1,0,-1,2,-1,1]],
    arpSpeeds: ['4n','4n','4n.'],
    padType: 'sine',     padAttack: [3.5,5], padRelease: [4.5,6],
    reverbDecayRange: [6,8],  reverbWetRange: [0.36,0.48],
    filterFreqRange: [700,1100], texture: 'wind',  hasPerc: false, melodyEveryRange: [0,0],
  },
  'mysterious': {
    label: 'Mysterious Cave', style: 'dark', color: '#6c3483',
    bpmRange: [42, 54],
    progression: [
      { root: 'E3', quality: 'minor', bars: 4 },
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'G2', quality: 'minor', bars: 2 },
    ],
    scaleRoot: 'E4', scaleType: 'aeolian', keyVariance: 3,
    arpPatterns: [[0,1,2,1],[0,2,1,2],[1,0,2,0]],
    arpSpeeds: ['4n','4n.','4n'],
    padType: 'sine',     padAttack: [3,4.5], padRelease: [4.5,6],
    reverbDecayRange: [6,8],  reverbWetRange: [0.40,0.50],
    filterFreqRange: [900,1400], texture: 'space', hasPerc: false, melodyEveryRange: [6,10],
  },
  'epic': {
    label: 'Epic Horizon', style: 'dark', color: '#922b21',
    bpmRange: [62, 74],
    progression: [
      { root: 'D3', quality: 'minor', bars: 2 },
      { root: 'C3', quality: 'major', bars: 2 },
      { root: 'Bb2', quality: 'major', bars: 2 },
      { root: 'C3', quality: 'major', bars: 2 },
    ],
    scaleRoot: 'D4', scaleType: 'aeolian', keyVariance: 4,
    arpPatterns: [[0,2,1,0,2],[0,1,2,0,1],[2,0,2,1,0]],
    arpSpeeds: ['4n','4n','4n.'],
    padType: 'sine',     padAttack: [2.5,4], padRelease: [3.5,5],
    reverbDecayRange: [5,7],  reverbWetRange: [0.34,0.46],
    filterFreqRange: [1400,2200], texture: 'wind',  hasPerc: false, melodyEveryRange: [6,10],
  },
};

// ─── State ────────────────────────────────────────────────────────────────────
let selectedMood    = null;
let durationMinutes = 30;
let isPlaying       = false;
let isGenerating    = false;
let engine          = null;
let recorder        = null;
let recordedChunks  = [];
let playbackStart   = 0;
let progressTimer   = null;
let visualizerAF    = null;

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
(function initBg() {
  const ctx = bgCanvas.getContext('2d');
  let W, H, particles;
  function resize() { W = bgCanvas.width = window.innerWidth; H = bgCanvas.height = window.innerHeight; }
  function init()   { particles = Array.from({ length: 80 }, () => ({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.5+0.3, vx: (Math.random()-0.5)*0.15, vy: (Math.random()-0.5)*0.15, a: Math.random()*0.6+0.1 })); }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(108,99,255,${p.a})`; ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', () => { resize(); init(); });
  resize(); init(); draw();
})();

// ─── Mood Card Clicks ─────────────────────────────────────────────────────────
document.querySelectorAll('.mood-card').forEach(card => {
  card.addEventListener('click', () => {
    if (isPlaying || isGenerating) return;
    document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedMood = card.dataset.mood;
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-label').textContent = `Generate "${MOODS[selectedMood].label}"`;
  });
});

// ─── Duration Controls ────────────────────────────────────────────────────────
document.querySelectorAll('.dur-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    durationMinutes = parseInt(btn.dataset.minutes);
    document.getElementById('custom-minutes').value = '';
  });
});
document.getElementById('custom-minutes').addEventListener('input', e => {
  const v = parseInt(e.target.value);
  if (v > 0 && v <= 180) {
    durationMinutes = v;
    document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
  }
});

// ─── Audio Engine ─────────────────────────────────────────────────────────────
class AmbientEngine {
  constructor(moodKey) {
    this.cfg      = MOODS[moodKey];
    this.parts    = [];
    this.nodes    = [];
    this.analyser = null;
    this.variantLabel = '';
  }

  async init() {
    await Tone.start();
    const cfg = this.cfg;

    // ── Pick random variant for this generation ──
    const bpm         = Math.round(randomBetween(cfg.bpmRange[0], cfg.bpmRange[1]));
    const arpPattern  = pickFrom(cfg.arpPatterns);
    const arpSpeed    = pickFrom(cfg.arpSpeeds);
    const reverbWet   = randomBetween(cfg.reverbWetRange[0], cfg.reverbWetRange[1]);
    const reverbDecay = randomBetween(cfg.reverbDecayRange[0], cfg.reverbDecayRange[1]);
    const filterFreq  = Math.round(randomBetween(cfg.filterFreqRange[0], cfg.filterFreqRange[1]));
    const keyShift    = Math.round(Math.random() * cfg.keyVariance);
    const padAttack   = randomBetween(cfg.padAttack[0], cfg.padAttack[1]);
    const padRelease  = randomBetween(cfg.padRelease[0], cfg.padRelease[1]);
    const melodyEvery = cfg.melodyEveryRange[1] === 0 ? 0
      : Math.round(randomBetween(cfg.melodyEveryRange[0], cfg.melodyEveryRange[1]));
    const melodyReg   = Math.random() < 0.5 ? 0 : 1;

    const progression = cfg.progression.map(c => ({ ...c, root: transposeNote(c.root, keyShift) }));
    const scaleRoot   = transposeNote(cfg.scaleRoot, keyShift);
    const totalBars   = progression.reduce((s, c) => s + c.bars, 0);

    const rootName = NOTE_NAMES[Tone.Frequency(scaleRoot).toMidi() % 12];
    this.variantLabel = `${rootName} · ${bpm} BPM`;

    Tone.Transport.bpm.value     = bpm;
    Tone.Transport.timeSignature = [4, 4];

    // ── Master FX chain (music layers go here) ──
    // Texture noise is routed DIRECTLY to destination, bypassing reverb,
    // so it doesn't get smeared into the musical signal.
    const reverb   = new Tone.Reverb({ decay: reverbDecay, preDelay: 0.1, wet: reverbWet });
    await reverb.ready;
    const filter   = new Tone.Filter(filterFreq, 'lowpass', -12);
    const limiter  = new Tone.Limiter(-2);
    const master   = new Tone.Volume(-8);
    this.analyser  = new Tone.Analyser('waveform', 512);
    // chain: music → master vol → filter → reverb → limiter → analyser → speakers
    master.chain(filter, reverb, limiter, this.analyser, Tone.Destination);
    this.nodes.push(reverb, filter, limiter, master);

    // ── Pad ──
    const padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: cfg.padType },
      envelope:   { attack: padAttack, decay: 1, sustain: 0.85, release: padRelease },
    });
    padSynth.volume.value = -14;
    padSynth.connect(master);
    this.nodes.push(padSynth);

    const padPart = new Tone.Part((time, ev) => {
      padSynth.releaseAll(time);
      ev.notes.forEach((note, i) => {
        padSynth.triggerAttack(note, time + i * 0.04, 0.4 + Math.random() * 0.08);
      });
      padSynth.releaseAll(time + Tone.Time(`${ev.bars}m`).toSeconds() - padRelease * 0.5);
    }, computePadEvents(progression));
    padPart.loop = true; padPart.loopEnd = `${totalBars}m`;
    this.parts.push(padPart);

    // ── Arp (subtle — outlines harmony without dominating) ──
    const arpSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope:   { attack: 0.015, decay: 0.5, sustain: 0.2, release: 1.0 },
    });
    arpSynth.volume.value = -26;
    arpSynth.connect(master);
    this.nodes.push(arpSynth);

    const arpPart = new Tone.Part((time, ev) => {
      arpSynth.triggerAttackRelease(ev.note, arpSpeed, time + (Math.random() - 0.5) * 0.01, ev.velocity);
    }, computeArpEvents(progression, arpPattern, arpSpeed));
    arpPart.loop = true; arpPart.loopEnd = `${totalBars}m`;
    this.parts.push(arpPart);

    // ── Bass ──
    const bassSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope:   { attack: padAttack * 0.7, decay: 0.5, sustain: 0.8, release: padRelease },
    });
    bassSynth.volume.value = -20;
    bassSynth.connect(master);
    this.nodes.push(bassSynth);

    const bassPart = new Tone.Part((time, ev) => {
      bassSynth.triggerAttackRelease(ev.note, ev.duration, time, 0.55);
    }, computeBassEvents(progression));
    bassPart.loop = true; bassPart.loopEnd = `${totalBars}m`;
    this.parts.push(bassPart);

    // ── Melody ──
    if (melodyEvery > 0) {
      const melSynth = new Tone.Synth({
        oscillator: { type: cfg.style === 'lofi' ? 'triangle' : 'sine' },
        envelope:   { attack: cfg.style === 'lofi' ? 0.05 : 0.7, decay: 0.3, sustain: 0.45, release: cfg.style === 'lofi' ? 1.2 : 2.5 },
      });
      melSynth.volume.value = -24;
      melSynth.connect(master);
      this.nodes.push(melSynth);

      const melEvents = computeMelodyEvents(progression, scaleRoot, cfg.scaleType, melodyEvery, melodyReg);
      if (melEvents.length > 0) {
        const melPart = new Tone.Part((time, ev) => {
          melSynth.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
        }, melEvents);
        melPart.loop = true; melPart.loopEnd = `${totalBars}m`;
        this.parts.push(melPart);
      }
    }

    // ── Lo-fi percussion ──
    if (cfg.hasPerc) this._buildPerc(master, totalBars);

    // ── Texture (routed directly to destination — no reverb smear) ──
    this._buildTexture(cfg.texture, totalBars);

    Tone.Transport.loop    = true;
    Tone.Transport.loopEnd = `${totalBars}m`;
  }

  _buildPerc(dest, totalBars) {
    const kick  = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 5 });
    kick.volume.value = -22; kick.connect(dest);
    const snare = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.04 } });
    snare.volume.value = -28; snare.connect(dest);
    const hihat = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 } });
    hihat.volume.value = -36; hihat.connect(dest);
    this.nodes.push(kick, snare, hihat);

    const events = [];
    for (let bar = 0; bar < totalBars; bar++) {
      events.push({ time: `${bar}:0:0`, type: 'kick' });
      events.push({ time: `${bar}:2:0`, type: 'kick' });
      events.push({ time: `${bar}:1:0`, type: 'snare' });
      events.push({ time: `${bar}:3:0`, type: 'snare' });
      for (let b = 0; b < 4; b++) {
        events.push({ time: `${bar}:${b}:0`, type: 'hihat' });
        events.push({ time: `${bar}:${b}:2`, type: 'hihat' });
      }
    }
    const pp = new Tone.Part((time, ev) => {
      if (ev.type === 'kick')  kick.triggerAttackRelease('C1', '8n', time);
      if (ev.type === 'snare') snare.triggerAttackRelease('8n', time);
      if (ev.type === 'hihat' && Math.random() < 0.55) hihat.triggerAttackRelease('16n', time);
    }, events);
    pp.loop = true; pp.loopEnd = `${totalBars}m`;
    this.parts.push(pp);
  }

  // Texture noise goes directly to Tone.Destination (bypasses the reverb chain)
  // so it adds subliminal ambience without smearing the musical signal.
  _buildTexture(type, totalBars) {
    if (!type) return;

    const mkNoise = (color, filterFreq, filterType, volDb, lfoHz) => {
      const noise = new Tone.Noise(color).start();
      const filt  = new Tone.Filter(filterFreq, filterType);
      const vol   = new Tone.Volume(volDb);
      noise.chain(filt, vol, Tone.Destination);
      if (lfoHz) {
        const lfo = new Tone.LFO({ frequency: lfoHz, min: volDb - 4, max: volDb + 2 }).start();
        lfo.connect(vol.volume);
        this.nodes.push(lfo);
      }
      this.nodes.push(noise, filt, vol);
    };

    if (type === 'rain')  mkNoise('pink',  1200, 'bandpass', -44, 0.12);
    if (type === 'ocean') mkNoise('brown',  500, 'bandpass', -46, 0.06);
    if (type === 'wind')  mkNoise('pink',   600, 'bandpass', -44, 0.08);
    if (type === 'space') mkNoise('brown',  280, 'lowpass',  -50, 0.04);
    if (type === 'vinyl') mkNoise('pink',  5500, 'highpass', -50, 0.30);
  }

  start()  { this.parts.forEach(p => p.start(0)); Tone.Transport.start('+0.1'); isPlaying = true; }
  pause()  { Tone.Transport.pause();  isPlaying = false; }
  resume() { Tone.Transport.start();  isPlaying = true;  }

  stop() {
    Tone.Transport.stop();
    Tone.Transport.loop = false;
    this.parts.forEach(p => { try { p.stop(); p.dispose(); } catch(e){} });
    this.nodes.forEach(n => { try { n.dispose(); } catch(e){} });
    this.parts = []; this.nodes = [];
    isPlaying = false;
  }

  getWaveform() { return this.analyser ? this.analyser.getValue() : new Float32Array(512); }
}

// ─── Visualizer ───────────────────────────────────────────────────────────────
function startVisualizer() {
  const ctx = visCanvas.getContext('2d');
  visCanvas.width = visCanvas.offsetWidth; visCanvas.height = 120;
  const W = visCanvas.width, H = visCanvas.height;
  const color = engine ? engine.cfg.color : '#6c63ff';
  function draw() {
    visualizerAF = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);
    const data = engine ? engine.getWaveform() : new Float32Array(512);
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    const step = W / data.length;
    for (let i = 0; i < data.length; i++) {
      const x = i * step, y = (data[i] * 0.5 + 0.5) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  draw();
}
function stopVisualizer() { if (visualizerAF) { cancelAnimationFrame(visualizerAF); visualizerAF = null; } }

// ─── Progress ─────────────────────────────────────────────────────────────────
function startProgress(totalMs) {
  playbackStart = Date.now();
  progressTimer = setInterval(() => {
    const elapsed = Date.now() - playbackStart;
    const pct = Math.min((elapsed / totalMs) * 100, 100);
    progressBar.style.width = pct + '%';
    const rem = Math.max(0, totalMs - elapsed);
    const m = Math.floor(rem / 60000), s = Math.floor((rem % 60000) / 1000);
    statusText.textContent = `Playing — ${m}:${s.toString().padStart(2,'0')} remaining`;
    if (pct >= 100) stopPlayback(true);
  }, 1000);
}
function stopProgress() { if (progressTimer) { clearInterval(progressTimer); progressTimer = null; } }

// ─── Recording ────────────────────────────────────────────────────────────────
function setupRecorder() {
  try {
    const dest = Tone.getDestination().context.createMediaStreamDestination();
    Tone.getDestination().connect(dest);
    recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus' });
    recordedChunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    recorder.start(1000);
  } catch (e) { console.warn('MediaRecorder unavailable:', e); }
}

// ─── Generate ─────────────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  if (isGenerating) return;
  if (isPlaying) { stopPlayback(false); return; }

  isGenerating = true;
  generateBtn.disabled = true;
  generateBtn.querySelector('.btn-label').textContent = 'Initializing…';
  statusRow.style.display = 'block';
  progressBar.style.width = '0%';
  statusText.textContent  = 'Building synthesis engine…';

  try {
    if (engine) { engine.stop(); engine = null; }
    engine = new AmbientEngine(selectedMood);
    await engine.init();

    statusText.textContent  = 'Starting…';
    progressBar.style.width = '8%';

    setupRecorder();
    engine.start();

    isGenerating = false; isPlaying = true;

    generateBtn.classList.add('generating');
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-icon').textContent  = '⬛';
    generateBtn.querySelector('.btn-label').textContent = 'Stop';

    visSection.style.display  = 'block';
    downloadBtn.style.display = 'none';
    nowPlaying.textContent    = `${MOODS[selectedMood].label} — ${engine.variantLabel} — ${durationMinutes} min`;

    startVisualizer();
    startProgress(durationMinutes * 60 * 1000);
  } catch (err) {
    console.error(err);
    statusText.textContent = 'Error: ' + err.message;
    isGenerating = false;
    generateBtn.disabled = false;
  }
});

// ─── Playback Controls ────────────────────────────────────────────────────────
playPauseBtn.addEventListener('click', () => {
  if (!engine) return;
  if (isPlaying) {
    engine.pause(); stopProgress();
    playPauseBtn.textContent = '▶ Resume';
  } else {
    engine.resume();
    startProgress((durationMinutes * 60 * 1000) - (Date.now() - playbackStart));
    playPauseBtn.textContent = '⏸ Pause';
  }
  isPlaying = !isPlaying;
});

stopBtn.addEventListener('click', () => stopPlayback(false));

function stopPlayback(finished) {
  stopProgress(); stopVisualizer();
  if (engine) { engine.stop(); engine = null; }
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
    recorder.onstop = () => { if (recordedChunks.length) downloadBtn.style.display = 'inline-flex'; };
  }
  isPlaying = false; isGenerating = false;

  generateBtn.classList.remove('generating');
  generateBtn.querySelector('.btn-icon').textContent  = '▶';
  generateBtn.querySelector('.btn-label').textContent = `Generate "${MOODS[selectedMood].label}"`;
  generateBtn.disabled     = false;
  playPauseBtn.textContent = '⏸ Pause';
  progressBar.style.width  = finished ? '100%' : progressBar.style.width;
  statusText.textContent   = finished ? 'Done! Download your track below.' : 'Stopped.';
  nowPlaying.textContent   = '';
}

// ─── Download ─────────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  if (!recordedChunks.length) return;
  const blob = new Blob(recordedChunks, { type: 'audio/webm' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ambientforge-${selectedMood}-${durationMinutes}min.webm`;
  a.click(); URL.revokeObjectURL(url);
});
