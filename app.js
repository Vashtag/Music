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

function midiToNote(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + Math.floor(midi / 12 - 1);
}

function buildChordNotes(rootNote, quality, octaveShift = 0) {
  const rootMidi = Tone.Frequency(rootNote).toMidi() + octaveShift * 12;
  return CHORD_INTERVALS[quality].map(s => midiToNote(rootMidi + s));
}

function buildScaleNotes(rootNote, scaleType, octaves = 2) {
  const rootMidi = Tone.Frequency(rootNote).toMidi();
  const notes = [];
  for (let o = 0; o < octaves; o++) {
    SCALE_INTERVALS[scaleType].forEach(s => notes.push(midiToNote(rootMidi + s + o * 12)));
  }
  return notes;
}

// Convert beat position (float, 4 beats = 1 bar) to Tone.js "bar:beat:16th" string
function beatsToToneTime(totalBeats) {
  const bar  = Math.floor(totalBeats / 4);
  const beat = Math.floor(totalBeats % 4);
  const s16  = Math.round((totalBeats % 1) * 4);
  return `${bar}:${beat}:${s16}`;
}

const ARP_SPEED_BEATS = { '1m': 4, '2n': 2, '4n': 1, '8n': 0.5, '16n': 0.25, '4n.': 1.5 };

// Pre-compute all arp events for one full loop
function computeArpEvents(progression, pattern, arpSpeed) {
  const speedBeats = ARP_SPEED_BEATS[arpSpeed] || 1;
  const events = [];
  let startBeat = 0;

  for (const chord of progression) {
    const chordBeats = chord.bars * 4;
    const rootMidi   = Tone.Frequency(chord.root).toMidi();
    // Arp lives one octave above the pad root
    const arpNotes   = CHORD_INTERVALS[chord.quality].map(s => midiToNote(rootMidi + s + 12));

    let beatInChord = 0, step = 0;
    while (beatInChord < chordBeats - speedBeats * 0.4) {
      const patIdx = pattern[step % pattern.length];
      if (patIdx >= 0) {
        events.push({
          time:     beatsToToneTime(startBeat + beatInChord),
          note:     arpNotes[patIdx % arpNotes.length],
          velocity: 0.22 + Math.random() * 0.12,
        });
      }
      beatInChord += speedBeats;
      step++;
    }
    startBeat += chordBeats;
  }
  return events;
}

// Pre-compute pad chord events
function computePadEvents(progression) {
  const events = [];
  let startBeat = 0;
  for (const chord of progression) {
    const rootMidi = Tone.Frequency(chord.root).toMidi();
    // Spread chord over two octaves: root position + octave above
    const baseNotes = CHORD_INTERVALS[chord.quality].map(s => midiToNote(rootMidi + s));
    const highNotes = CHORD_INTERVALS[chord.quality].slice(0, 2).map(s => midiToNote(rootMidi + s + 12));
    events.push({
      time:     beatsToToneTime(startBeat),
      notes:    [...baseNotes, ...highNotes],
      bars:     chord.bars,
    });
    startBeat += chord.bars * 4;
  }
  return events;
}

// Pre-compute bass events (root, two octaves below pad)
function computeBassEvents(progression) {
  const events = [];
  let startBeat = 0;
  for (const chord of progression) {
    const rootMidi = Tone.Frequency(chord.root).toMidi() - 12;
    events.push({
      time:     beatsToToneTime(startBeat),
      note:     midiToNote(rootMidi),
      duration: `${chord.bars}m`,
    });
    startBeat += chord.bars * 4;
  }
  return events;
}

// Generate a melodic phrase with stepwise contour
function generateMelodyPhrase(scaleNotes, length = 5) {
  const contours = [
    [1, 1, -1, 2, -1, 1],
    [-1, 1, 2, -1, 1, -2],
    [1, 2, 1, -2, -1, 1],
    [2, -1, 1, 1, -2, 1],
  ];
  const steps = contours[Math.floor(Math.random() * contours.length)];
  // Start in the upper-middle of the scale
  let idx = Math.floor(scaleNotes.length * 0.45) + Math.floor(Math.random() * 3) - 1;
  idx = Math.max(0, Math.min(scaleNotes.length - 1, idx));

  const notes = [];
  for (let i = 0; i < length; i++) {
    notes.push(scaleNotes[Math.max(0, Math.min(scaleNotes.length - 1, idx))]);
    idx += steps[i % steps.length];
    idx = Math.max(0, Math.min(scaleNotes.length - 1, idx));
  }
  return notes;
}

// Compute melody events scattered across the loop
function computeMelodyEvents(progression, scaleRoot, scaleType, melodyEvery) {
  if (!melodyEvery) return [];
  const scaleNotes = buildScaleNotes(scaleRoot, scaleType, 2);
  const totalBars  = progression.reduce((s, c) => s + c.bars, 0);
  const events     = [];

  for (let bar = 0; bar < totalBars; bar += melodyEvery) {
    if (Math.random() < 0.25) continue; // occasional silence for breathing room
    const phraseLen = 4 + Math.floor(Math.random() * 4);
    const phrase    = generateMelodyPhrase(scaleNotes, phraseLen);
    const durations = ['4n', '4n', '4n.', '2n'];
    let beatOffset  = bar * 4 + Math.random() * 2; // slight offset from bar start

    for (const note of phrase) {
      const dur = durations[Math.floor(Math.random() * durations.length)];
      events.push({
        time:     beatsToToneTime(beatOffset),
        note,
        duration: dur,
        velocity: 0.18 + Math.random() * 0.2,
      });
      beatOffset += ARP_SPEED_BEATS[dur] || 1;
      if (beatOffset >= totalBars * 4) break;
    }
  }
  return events;
}

// ─── Mood Definitions ─────────────────────────────────────────────────────────
const MOODS = {
  'forest-rain': {
    label: 'Forest Rain', style: 'nature', color: '#2ecc71',
    bpm: 50,
    progression: [
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'A2', quality: 'min7',  bars: 2 },
      { root: 'F2', quality: 'maj7',  bars: 2 },
      { root: 'G2', quality: 'dom7',  bars: 2 },
    ],
    scaleRoot: 'C4', scaleType: 'pentatonicMaj',
    arpPattern: [0, 1, 2, 1, 0, 2],  arpSpeed: '4n',
    padType: 'fatsine',   padAttack: 3.5, padRelease: 5,
    reverbDecay: 12, reverbWet: 0.78, filterFreq: 1800,
    texture: 'rain', hasPerc: false, melodyEvery: 4,
  },
  'ocean-drift': {
    label: 'Ocean Drift', style: 'nature', color: '#3498db',
    bpm: 44,
    progression: [
      { root: 'D3', quality: 'min7',  bars: 3 },
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'Bb2', quality: 'maj7', bars: 2 },
      { root: 'F2', quality: 'major', bars: 1 },
    ],
    scaleRoot: 'D4', scaleType: 'pentatonicMin',
    arpPattern: [0, 2, 1, 2, 0],  arpSpeed: '2n',
    padType: 'fatsine',   padAttack: 4, padRelease: 6,
    reverbDecay: 14, reverbWet: 0.85, filterFreq: 1400,
    texture: 'ocean', hasPerc: false, melodyEvery: 8,
  },
  'peaceful-meadow': {
    label: 'Peaceful Meadow', style: 'nature', color: '#27ae60',
    bpm: 62,
    progression: [
      { root: 'G3', quality: 'maj7',  bars: 2 },
      { root: 'E3', quality: 'min7',  bars: 2 },
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'D3', quality: 'dom7',  bars: 2 },
    ],
    scaleRoot: 'G4', scaleType: 'major',
    arpPattern: [0, 1, 2, 3, 2, 1],  arpSpeed: '4n',
    padType: 'fattriangle', padAttack: 2, padRelease: 4,
    reverbDecay: 8,  reverbWet: 0.65, filterFreq: 2400,
    texture: 'wind', hasPerc: false, melodyEvery: 4,
  },
  'deep-space': {
    label: 'Deep Space', style: 'space', color: '#6c63ff',
    bpm: 32,
    progression: [
      { root: 'A2', quality: 'min7',  bars: 4 },
      { root: 'F2', quality: 'maj7',  bars: 4 },
      { root: 'G2', quality: 'dom7',  bars: 4 },
      { root: 'E2', quality: 'minor', bars: 4 },
    ],
    scaleRoot: 'A3', scaleType: 'aeolian',
    arpPattern: [0, 2, 1],  arpSpeed: '2n',
    padType: 'fatsawtooth', padAttack: 5, padRelease: 7,
    reverbDecay: 18, reverbWet: 0.92, filterFreq: 900,
    texture: 'space', hasPerc: false, melodyEvery: 16,
  },
  'nebula-drift': {
    label: 'Nebula Drift', style: 'space', color: '#9b59b6',
    bpm: 38,
    progression: [
      { root: 'E3', quality: 'min7',  bars: 4 },
      { root: 'A2', quality: 'dom7',  bars: 2 },
      { root: 'D3', quality: 'maj7',  bars: 2 },
    ],
    scaleRoot: 'E4', scaleType: 'dorian',
    arpPattern: [0, 2, 1, 0],  arpSpeed: '2n',
    padType: 'fatsawtooth', padAttack: 4, padRelease: 6,
    reverbDecay: 15, reverbWet: 0.88, filterFreq: 1100,
    texture: 'space', hasPerc: false, melodyEvery: 8,
  },
  'stellar-journey': {
    label: 'Stellar Journey', style: 'space', color: '#3498db',
    bpm: 50,
    progression: [
      { root: 'C3', quality: 'min7',  bars: 3 },
      { root: 'Db3', quality: 'maj7', bars: 2 },
      { root: 'Bb2', quality: 'maj7', bars: 2 },
      { root: 'Ab2', quality: 'maj7', bars: 1 },
    ],
    scaleRoot: 'C4', scaleType: 'phrygian',
    arpPattern: [0, 1, 2, 1],  arpSpeed: '2n',
    padType: 'fatsawtooth', padAttack: 4, padRelease: 6,
    reverbDecay: 14, reverbWet: 0.82, filterFreq: 1200,
    texture: 'space', hasPerc: false, melodyEvery: 8,
  },
  'late-night': {
    label: 'Late Night Study', style: 'lofi', color: '#e67e22',
    bpm: 76,
    progression: [
      { root: 'D3', quality: 'min7',  bars: 2 },
      { root: 'G2', quality: 'dom7',  bars: 2 },
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'A2', quality: 'min7',  bars: 2 },
    ],
    scaleRoot: 'D4', scaleType: 'dorian',
    arpPattern: [0, 2, 1, 3, 0, 2, 1],  arpSpeed: '8n',
    padType: 'triangle',   padAttack: 0.5, padRelease: 2,
    reverbDecay: 4,  reverbWet: 0.45, filterFreq: 3200,
    texture: 'vinyl', hasPerc: true, melodyEvery: 4,
  },
  'rainy-cafe': {
    label: 'Rainy Café', style: 'lofi', color: '#e67e22',
    bpm: 80,
    progression: [
      { root: 'F3', quality: 'min7',  bars: 2 },
      { root: 'Eb3', quality: 'maj7', bars: 2 },
      { root: 'Db3', quality: 'maj7', bars: 2 },
      { root: 'Eb3', quality: 'dom7', bars: 2 },
    ],
    scaleRoot: 'F4', scaleType: 'pentatonicMin',
    arpPattern: [0, 1, 2, 1, 3, 2],  arpSpeed: '8n',
    padType: 'triangle',   padAttack: 0.4, padRelease: 2,
    reverbDecay: 5,  reverbWet: 0.5,  filterFreq: 3000,
    texture: 'rain', hasPerc: true, melodyEvery: 4,
  },
  'nostalgic': {
    label: 'Nostalgic Afternoon', style: 'lofi', color: '#d35400',
    bpm: 70,
    progression: [
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'A2', quality: 'min7',  bars: 2 },
      { root: 'F2', quality: 'maj7',  bars: 2 },
      { root: 'G2', quality: 'dom7',  bars: 2 },
    ],
    scaleRoot: 'C4', scaleType: 'pentatonicMaj',
    arpPattern: [0, 2, 1, 2],  arpSpeed: '8n',
    padType: 'triangle',   padAttack: 0.5, padRelease: 2.5,
    reverbDecay: 4,  reverbWet: 0.42, filterFreq: 3500,
    texture: 'vinyl', hasPerc: true, melodyEvery: 4,
  },
  'tense': {
    label: 'Tense Atmosphere', style: 'dark', color: '#8e44ad',
    bpm: 58,
    progression: [
      { root: 'C3', quality: 'minor', bars: 3 },
      { root: 'Db3', quality: 'major', bars: 1 },
      { root: 'Ab2', quality: 'maj7', bars: 2 },
      { root: 'Bb2', quality: 'minor', bars: 2 },
    ],
    scaleRoot: 'C4', scaleType: 'phrygian',
    arpPattern: [0, -1, 1, -1, 2, -1],  arpSpeed: '4n',
    padType: 'fatsawtooth', padAttack: 4, padRelease: 5,
    reverbDecay: 10, reverbWet: 0.7, filterFreq: 800,
    texture: 'wind', hasPerc: false, melodyEvery: 0,
  },
  'mysterious': {
    label: 'Mysterious Cave', style: 'dark', color: '#6c3483',
    bpm: 48,
    progression: [
      { root: 'E3', quality: 'minor', bars: 4 },
      { root: 'C3', quality: 'maj7',  bars: 2 },
      { root: 'G2', quality: 'minor', bars: 2 },
    ],
    scaleRoot: 'E4', scaleType: 'aeolian',
    arpPattern: [0, 1, 2, 1],  arpSpeed: '4n',
    padType: 'fatsawtooth', padAttack: 3.5, padRelease: 5,
    reverbDecay: 13, reverbWet: 0.8, filterFreq: 1000,
    texture: 'space', hasPerc: false, melodyEvery: 8,
  },
  'epic': {
    label: 'Epic Horizon', style: 'dark', color: '#922b21',
    bpm: 68,
    progression: [
      { root: 'D3', quality: 'minor', bars: 2 },
      { root: 'C3', quality: 'major', bars: 2 },
      { root: 'Bb2', quality: 'major', bars: 2 },
      { root: 'C3', quality: 'major', bars: 2 },
    ],
    scaleRoot: 'D4', scaleType: 'aeolian',
    arpPattern: [0, 2, 1, 0, 2],  arpSpeed: '4n',
    padType: 'fatsawtooth', padAttack: 3, padRelease: 4,
    reverbDecay: 9,  reverbWet: 0.65, filterFreq: 1600,
    texture: 'wind', hasPerc: false, melodyEvery: 8,
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
const generateBtn = document.getElementById('generate-btn');
const statusRow   = document.getElementById('status-row');
const progressBar = document.getElementById('progress-bar');
const statusText  = document.getElementById('status-text');
const visSection  = document.getElementById('visualizer-section');
const visCanvas   = document.getElementById('visualizer');
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
    this.cfg   = MOODS[moodKey];
    this.parts = [];
    this.nodes = [];
    this.analyser = null;
  }

  async init() {
    await Tone.start();
    const cfg = this.cfg;

    Tone.Transport.bpm.value    = cfg.bpm;
    Tone.Transport.timeSignature = [4, 4];

    const totalBars = cfg.progression.reduce((s, c) => s + c.bars, 0);

    // ── FX chain ──
    const reverb  = new Tone.Reverb({ decay: cfg.reverbDecay, preDelay: 0.2, wet: cfg.reverbWet });
    await reverb.ready;
    const filter   = new Tone.Filter(cfg.filterFreq, 'lowpass', -12);
    const compress = new Tone.Compressor(-18, 4);
    const master   = new Tone.Volume(-4);
    this.analyser  = new Tone.Analyser('waveform', 512);

    master.chain(compress, filter, reverb, this.analyser, Tone.Destination);
    this.nodes.push(reverb, filter, compress, master);

    // ── Pad ──
    const padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: cfg.padType },
      envelope: { attack: cfg.padAttack, decay: 1, sustain: 0.9, release: cfg.padRelease },
    });
    padSynth.volume.value = -12;
    padSynth.connect(master);
    this.nodes.push(padSynth);

    const padEvents = computePadEvents(cfg.progression);
    const padPart   = new Tone.Part((time, ev) => {
      padSynth.releaseAll(time);
      ev.notes.forEach((note, i) => {
        const jitter = i * 0.035 + (Math.random() - 0.5) * 0.02;
        padSynth.triggerAttack(note, time + jitter, 0.35 + Math.random() * 0.1);
      });
      const relTime = time + Tone.Time(`${ev.bars}m`).toSeconds() - cfg.padRelease * 0.6;
      padSynth.releaseAll(relTime);
    }, padEvents);
    padPart.loop    = true;
    padPart.loopEnd = `${totalBars}m`;
    this.parts.push(padPart);

    // ── Arp ──
    const arpSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 1.2 },
    });
    arpSynth.volume.value = cfg.style === 'lofi' ? -16 : -22;
    arpSynth.connect(master);
    this.nodes.push(arpSynth);

    const arpEvents = computeArpEvents(cfg.progression, cfg.arpPattern, cfg.arpSpeed);
    const arpPart   = new Tone.Part((time, ev) => {
      const jitter = (Math.random() - 0.5) * 0.012;
      arpSynth.triggerAttackRelease(ev.note, cfg.arpSpeed, time + jitter, ev.velocity);
    }, arpEvents);
    arpPart.loop    = true;
    arpPart.loopEnd = `${totalBars}m`;
    this.parts.push(arpPart);

    // ── Bass ──
    const bassSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: cfg.padAttack * 0.8, decay: 0.5, sustain: 0.85, release: cfg.padRelease },
    });
    bassSynth.volume.value = cfg.style === 'space' ? -8 : -16;
    bassSynth.connect(master);
    this.nodes.push(bassSynth);

    const bassEvents = computeBassEvents(cfg.progression);
    const bassPart   = new Tone.Part((time, ev) => {
      bassSynth.triggerAttackRelease(ev.note, ev.duration, time, 0.55 + Math.random() * 0.1);
    }, bassEvents);
    bassPart.loop    = true;
    bassPart.loopEnd = `${totalBars}m`;
    this.parts.push(bassPart);

    // ── Melody ──
    if (cfg.melodyEvery > 0) {
      const melSynth = new Tone.Synth({
        oscillator: { type: cfg.style === 'lofi' ? 'triangle' : 'sine' },
        envelope: { attack: cfg.style === 'lofi' ? 0.04 : 0.6, decay: 0.4, sustain: 0.5, release: cfg.style === 'lofi' ? 1 : 2.5 },
      });
      melSynth.volume.value = -20;
      melSynth.connect(master);
      this.nodes.push(melSynth);

      const melEvents = computeMelodyEvents(cfg.progression, cfg.scaleRoot, cfg.scaleType, cfg.melodyEvery);
      if (melEvents.length > 0) {
        const melPart = new Tone.Part((time, ev) => {
          melSynth.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
        }, melEvents);
        melPart.loop    = true;
        melPart.loopEnd = `${totalBars}m`;
        this.parts.push(melPart);
      }
    }

    // ── Lo-fi percussion ──
    if (cfg.hasPerc) {
      this._buildPerc(master, totalBars);
    }

    // ── Texture ──
    this._buildTexture(cfg.texture, master);

    // Loop transport
    Tone.Transport.loop    = true;
    Tone.Transport.loopEnd = `${totalBars}m`;
  }

  _buildPerc(dest, totalBars) {
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6 });
    kick.volume.value = -20;
    kick.connect(dest);

    const snare = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
    });
    snare.volume.value = -26;
    snare.connect(dest);

    const hihat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    });
    hihat.volume.value = -32;
    hihat.connect(dest);

    this.nodes.push(kick, snare, hihat);

    // Kick on 1 and 3, snare on 2 and 4, sparse hihat on 8ths
    const percPart = new Tone.Part((time, ev) => {
      if (ev.type === 'kick')  kick.triggerAttackRelease('C1', '8n', time);
      if (ev.type === 'snare') snare.triggerAttackRelease('8n', time);
      if (ev.type === 'hihat' && Math.random() < 0.6) hihat.triggerAttackRelease('16n', time);
    }, this._buildPercEvents(totalBars));
    percPart.loop    = true;
    percPart.loopEnd = `${totalBars}m`;
    this.parts.push(percPart);
  }

  _buildPercEvents(totalBars) {
    const events = [];
    for (let bar = 0; bar < totalBars; bar++) {
      // Kick: beat 0 and 2 (bars:beats)
      events.push({ time: `${bar}:0:0`, type: 'kick' });
      events.push({ time: `${bar}:2:0`, type: 'kick' });
      // Snare: beat 1 and 3
      events.push({ time: `${bar}:1:0`, type: 'snare' });
      events.push({ time: `${bar}:3:0`, type: 'snare' });
      // Hihat: every 8th note
      for (let b = 0; b < 4; b++) {
        events.push({ time: `${bar}:${b}:0`, type: 'hihat' });
        events.push({ time: `${bar}:${b}:2`, type: 'hihat' });
      }
    }
    return events;
  }

  _buildTexture(type, dest) {
    if (!type) return;
    if (type === 'rain' || type === 'ocean') {
      const noise = new Tone.Noise(type === 'ocean' ? 'brown' : 'pink').start();
      const filt  = new Tone.Filter(type === 'ocean' ? 500 : 1000, 'bandpass', -12);
      const vol   = new Tone.Volume(-32);
      noise.chain(filt, vol, dest);
      this.nodes.push(noise, filt, vol);
    }
    if (type === 'space') {
      const noise = new Tone.Noise('brown').start();
      const filt  = new Tone.Filter(280, 'lowpass');
      const lfo   = new Tone.LFO({ frequency: 0.05, min: -42, max: -36 }).start();
      const vol   = new Tone.Volume(-42);
      lfo.connect(vol.volume);
      noise.chain(filt, vol, dest);
      this.nodes.push(noise, filt, lfo, vol);
    }
    if (type === 'wind') {
      const noise = new Tone.Noise('pink').start();
      const filt  = new Tone.Filter(600, 'bandpass');
      const lfo   = new Tone.LFO({ frequency: 0.07, min: -38, max: -30 }).start();
      const vol   = new Tone.Volume(-38);
      lfo.connect(vol.volume);
      noise.chain(filt, vol, dest);
      this.nodes.push(noise, filt, lfo, vol);
    }
    if (type === 'vinyl') {
      const noise = new Tone.Noise('pink').start();
      const filt  = new Tone.Filter(5000, 'highpass');
      const lfo   = new Tone.LFO({ frequency: 0.3, min: -46, max: -40 }).start();
      const vol   = new Tone.Volume(-44);
      lfo.connect(vol.volume);
      noise.chain(filt, vol, dest);
      this.nodes.push(noise, filt, lfo, vol);
    }
  }

  start() {
    this.parts.forEach(p => p.start(0));
    Tone.Transport.start('+0.1');
    isPlaying = true;
  }

  pause()  { Tone.Transport.pause();  isPlaying = false; }
  resume() { Tone.Transport.start(); isPlaying = true; }

  stop() {
    Tone.Transport.stop();
    Tone.Transport.loop = false;
    this.parts.forEach(p => { try { p.stop(); p.dispose(); } catch(e){} });
    this.nodes.forEach(n => { try { n.dispose(); } catch(e){} });
    this.parts = []; this.nodes = [];
    isPlaying = false;
  }

  getWaveform() {
    return this.analyser ? this.analyser.getValue() : new Float32Array(512);
  }
}

// ─── Visualizer ───────────────────────────────────────────────────────────────
function startVisualizer() {
  const ctx   = visCanvas.getContext('2d');
  visCanvas.width  = visCanvas.offsetWidth;
  visCanvas.height = 120;
  const W = visCanvas.width, H = visCanvas.height;
  const color = engine ? engine.cfg.color : '#6c63ff';

  function draw() {
    visualizerAF = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);
    const data = engine ? engine.getWaveform() : new Float32Array(512);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    const step = W / data.length;
    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      const y = (data[i] * 0.5 + 0.5) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  draw();
}

function stopVisualizer() {
  if (visualizerAF) { cancelAnimationFrame(visualizerAF); visualizerAF = null; }
}

// ─── Progress ─────────────────────────────────────────────────────────────────
function startProgress(totalMs) {
  playbackStart = Date.now();
  progressTimer = setInterval(() => {
    const elapsed   = Date.now() - playbackStart;
    const pct       = Math.min((elapsed / totalMs) * 100, 100);
    progressBar.style.width = pct + '%';
    const rem = Math.max(0, totalMs - elapsed);
    const m   = Math.floor(rem / 60000);
    const s   = Math.floor((rem % 60000) / 1000);
    statusText.textContent = `Playing — ${m}:${s.toString().padStart(2,'0')} remaining`;
    if (pct >= 100) stopPlayback(true);
  }, 1000);
}

function stopProgress() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

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

    isGenerating = false;
    isPlaying    = true;

    generateBtn.classList.add('generating');
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-icon').textContent  = '⬛';
    generateBtn.querySelector('.btn-label').textContent = 'Stop';

    visSection.style.display  = 'block';
    downloadBtn.style.display = 'none';
    nowPlaying.textContent    = `Now playing: ${MOODS[selectedMood].label} · ${durationMinutes} min`;

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
    engine.pause();
    stopProgress();
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
  stopProgress();
  stopVisualizer();
  if (engine) { engine.stop(); engine = null; }
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
    recorder.onstop = () => { if (recordedChunks.length) downloadBtn.style.display = 'inline-flex'; };
  }
  isPlaying    = false;
  isGenerating = false;

  generateBtn.classList.remove('generating');
  generateBtn.querySelector('.btn-icon').textContent  = '▶';
  generateBtn.querySelector('.btn-label').textContent = `Generate "${MOODS[selectedMood].label}"`;
  generateBtn.disabled = false;
  playPauseBtn.textContent = '⏸ Pause';

  progressBar.style.width = finished ? '100%' : progressBar.style.width;
  statusText.textContent  = finished ? 'Done! Download your track below.' : 'Stopped.';
  nowPlaying.textContent  = '';
}

// ─── Download ─────────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  if (!recordedChunks.length) return;
  const blob = new Blob(recordedChunks, { type: 'audio/webm' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ambientforge-${selectedMood}-${durationMinutes}min.webm`;
  a.click();
  URL.revokeObjectURL(url);
});
