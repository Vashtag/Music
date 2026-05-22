// ─── Mood Definitions ────────────────────────────────────────────────────────
const MOODS = {
  'forest-rain': {
    label: 'Forest Rain',
    style: 'nature',
    key: 'C4',
    scale: ['C4','E4','G4','A4','C5','E5','G5'],
    chords: [['C3','G3','E4'],['A2','E3','C4'],['F2','C3','A3'],['G2','D3','B3']],
    bpm: 52,
    padType: 'sine',
    layers: { pad: true, melody: true, bass: true, texture: 'rain', perc: false },
    reverbWet: 0.75,
    filterFreq: 1800,
    color: '#2ecc71',
  },
  'ocean-drift': {
    label: 'Ocean Drift',
    style: 'nature',
    key: 'D4',
    scale: ['D4','F4','A4','C5','D5','F5'],
    chords: [['D3','A3','F4'],['Bb2','F3','D4'],['G2','D3','Bb3'],['A2','E3','C4']],
    bpm: 44,
    padType: 'sine',
    layers: { pad: true, melody: true, bass: true, texture: 'ocean', perc: false },
    reverbWet: 0.85,
    filterFreq: 1400,
    color: '#3498db',
  },
  'peaceful-meadow': {
    label: 'Peaceful Meadow',
    style: 'nature',
    key: 'G4',
    scale: ['G4','A4','B4','D5','E5','G5'],
    chords: [['G3','D4','B4'],['E3','G3','B3'],['C3','G3','E4'],['D3','A3','F#4']],
    bpm: 60,
    padType: 'triangle',
    layers: { pad: true, melody: true, bass: true, texture: 'wind', perc: false },
    reverbWet: 0.65,
    filterFreq: 2400,
    color: '#27ae60',
  },
  'deep-space': {
    label: 'Deep Space',
    style: 'space',
    key: 'A2',
    scale: ['A2','C3','D3','E3','G3','A3','C4','D4'],
    chords: [['A1','E2','A2'],['F1','C2','F2'],['G1','D2','G2'],['E1','B1','E2']],
    bpm: 32,
    padType: 'sawtooth',
    layers: { pad: true, melody: false, bass: true, texture: 'space', perc: false },
    reverbWet: 0.92,
    filterFreq: 900,
    color: '#6c63ff',
  },
  'nebula-drift': {
    label: 'Nebula Drift',
    style: 'space',
    key: 'E3',
    scale: ['E3','G3','A3','B3','D4','E4'],
    chords: [['E2','B2','G3'],['C2','G2','E3'],['A1','E2','C3'],['D2','A2','F3']],
    bpm: 38,
    padType: 'sawtooth',
    layers: { pad: true, melody: true, bass: true, texture: 'space', perc: false },
    reverbWet: 0.88,
    filterFreq: 1100,
    color: '#9b59b6',
  },
  'stellar-journey': {
    label: 'Stellar Journey',
    style: 'space',
    key: 'C3',
    scale: ['C3','Eb3','G3','Ab3','Bb3','C4'],
    chords: [['C2','G2','Eb3'],['Ab1','Eb2','C3'],['F1','C2','Ab2'],['Bb1','F2','D3']],
    bpm: 50,
    padType: 'sawtooth',
    layers: { pad: true, melody: true, bass: true, texture: 'space', perc: false },
    reverbWet: 0.82,
    filterFreq: 1300,
    color: '#3498db',
  },
  'late-night': {
    label: 'Late Night Study',
    style: 'lofi',
    key: 'D4',
    scale: ['D4','E4','F4','A4','C5','D5'],
    chords: [['D3','F3','A3'],['Bb2','F3','D4'],['G3','Bb3','D4'],['A3','E4','C5']],
    bpm: 75,
    padType: 'triangle',
    layers: { pad: true, melody: true, bass: true, texture: 'vinyl', perc: true },
    reverbWet: 0.45,
    filterFreq: 3200,
    color: '#e67e22',
  },
  'rainy-cafe': {
    label: 'Rainy Café',
    style: 'lofi',
    key: 'F4',
    scale: ['F4','G4','Ab4','C5','Eb5','F5'],
    chords: [['F3','Ab3','C4'],['Db3','Ab3','F4'],['Bb2','Db3','F3'],['C3','G3','Eb4']],
    bpm: 80,
    padType: 'triangle',
    layers: { pad: true, melody: true, bass: true, texture: 'rain', perc: true },
    reverbWet: 0.5,
    filterFreq: 3000,
    color: '#e67e22',
  },
  'nostalgic': {
    label: 'Nostalgic Afternoon',
    style: 'lofi',
    key: 'C4',
    scale: ['C4','D4','E4','G4','A4','C5'],
    chords: [['C3','G3','E4'],['A3','C4','E4'],['F3','C4','A4'],['G3','D4','B4']],
    bpm: 70,
    padType: 'triangle',
    layers: { pad: true, melody: true, bass: true, texture: 'vinyl', perc: true },
    reverbWet: 0.4,
    filterFreq: 3500,
    color: '#d35400',
  },
  'tense': {
    label: 'Tense Atmosphere',
    style: 'dark',
    key: 'C3',
    scale: ['C3','Db3','E3','F3','Gb3','Ab3','B3'],
    chords: [['C2','Gb2','B2'],['Ab1','Eb2','G2'],['F1','B1','Eb2'],['Db1','Ab1','F2']],
    bpm: 58,
    padType: 'sawtooth',
    layers: { pad: true, melody: false, bass: true, texture: 'wind', perc: false },
    reverbWet: 0.7,
    filterFreq: 800,
    color: '#8e44ad',
  },
  'mysterious': {
    label: 'Mysterious Cave',
    style: 'dark',
    key: 'E3',
    scale: ['E3','F3','G3','Ab3','Bb3','E4'],
    chords: [['E3','G3','B3'],['C3','G3','Eb4'],['A3','E4','C5'],['B3','F#4','D5']],
    bpm: 48,
    padType: 'sawtooth',
    layers: { pad: true, melody: true, bass: true, texture: 'space', perc: false },
    reverbWet: 0.8,
    filterFreq: 1000,
    color: '#6c3483',
  },
  'epic': {
    label: 'Epic Horizon',
    style: 'dark',
    key: 'D3',
    scale: ['D3','E3','F3','G3','A3','Bb3','C4','D4'],
    chords: [['D3','F3','A3'],['Bb2','F3','D4'],['G3','Bb3','D4'],['C3','G3','E4']],
    bpm: 68,
    padType: 'sawtooth',
    layers: { pad: true, melody: true, bass: true, texture: 'wind', perc: false },
    reverbWet: 0.65,
    filterFreq: 1600,
    color: '#922b21',
  },
};

// ─── State ────────────────────────────────────────────────────────────────────
let selectedMood = null;
let durationMinutes = 30;
let isPlaying = false;
let isGenerating = false;
let engine = null;
let recorder = null;
let recordedChunks = [];
let playbackStartTime = 0;
let progressTimer = null;
let visualizerAF = null;

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const generateBtn    = document.getElementById('generate-btn');
const statusRow      = document.getElementById('status-row');
const progressBar    = document.getElementById('progress-bar');
const statusText     = document.getElementById('status-text');
const visSection     = document.getElementById('visualizer-section');
const visCanvas      = document.getElementById('visualizer');
const playPauseBtn   = document.getElementById('play-pause-btn');
const stopBtn        = document.getElementById('stop-btn');
const downloadBtn    = document.getElementById('download-btn');
const nowPlaying     = document.getElementById('now-playing');
const bgCanvas       = document.getElementById('bg-canvas');

// ─── Background Particle Canvas ───────────────────────────────────────────────
(function initBg() {
  const ctx = bgCanvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = bgCanvas.width  = window.innerWidth;
    H = bgCanvas.height = window.innerHeight;
  }

  function initParticles() {
    particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.6 + 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108,99,255,${p.alpha})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); initParticles(); });
  resize(); initParticles(); draw();
})();

// ─── Mood Card Selection ──────────────────────────────────────────────────────
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
    this.mood = MOODS[moodKey];
    this.parts = [];
    this.synths = [];
    this.analyser = null;
    this.dest = null;
  }

  async init() {
    await Tone.start();
    Tone.Transport.bpm.value = this.mood.bpm;

    const m = this.mood;

    // Master chain
    const reverb  = new Tone.Reverb({ decay: m.reverbWet > 0.7 ? 14 : 8, wet: m.reverbWet }).toDestination();
    const filter   = new Tone.Filter(m.filterFreq, 'lowpass').connect(reverb);
    const limiter  = new Tone.Limiter(-3).connect(filter);
    const vol      = new Tone.Volume(-6).connect(limiter);
    this.analyser  = new Tone.Analyser('waveform', 512);
    vol.connect(this.analyser);
    this.masterVol = vol;

    await reverb.ready;

    // ── Pad layer ──
    if (m.layers.pad) {
      const padSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: m.padType === 'sawtooth' ? 'fatsawtooth' : (m.padType === 'triangle' ? 'triangle' : 'sine'),
          count: m.padType === 'sawtooth' ? 3 : 1,
          spread: m.padType === 'sawtooth' ? 25 : 0,
        },
        envelope: { attack: 3.5, decay: 1, sustain: 0.9, release: 5 },
        volume: m.style === 'lofi' ? -14 : -10,
      }).connect(vol);
      this.synths.push(padSynth);

      const chords = m.chords;
      let ci = 0;
      const padPart = new Tone.Part((time, chord) => {
        // slight humanize
        const jitter = (Math.random() - 0.5) * 0.06;
        padSynth.releaseAll(time);
        chord.forEach((note, i) => {
          padSynth.triggerAttack(note, time + jitter + i * 0.04, 0.5 + Math.random() * 0.15);
        });
      }, this._buildChordEvents(chords, 7)); // chord every 7 seconds
      padPart.loop = true;
      padPart.loopEnd = `${chords.length * 7}s`;
      this.parts.push(padPart);
    }

    // ── Bass layer ──
    if (m.layers.bass) {
      const bassSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 4, decay: 0.5, sustain: 0.85, release: 6 },
        volume: m.style === 'space' ? -8 : -16,
      }).connect(vol);
      this.synths.push(bassSynth);

      const bassNotes = m.chords.map(c => {
        const root = c[0];
        const note = Tone.Frequency(root).toNote();
        // drop two octaves for bass
        const freq = Tone.Frequency(root).toFrequency() / 4;
        return Tone.Frequency(freq).toNote();
      });
      const bassEvents = bassNotes.map((n, i) => ({ time: i * 7, note: n }));
      const bassPart = new Tone.Part((time, ev) => {
        bassSynth.triggerAttackRelease(ev.note, '6s', time, 0.6 + Math.random() * 0.15);
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = `${bassNotes.length * 7}s`;
      this.parts.push(bassPart);
    }

    // ── Melody layer ──
    if (m.layers.melody) {
      const melSynth = new Tone.Synth({
        oscillator: { type: m.style === 'lofi' ? 'triangle' : 'sine' },
        envelope: { attack: 0.8, decay: 0.5, sustain: 0.6, release: 3 },
        volume: m.style === 'lofi' ? -12 : -18,
      }).connect(vol);
      this.synths.push(melSynth);

      const melPart = new Tone.Part((time, ev) => {
        if (Math.random() < 0.6) {
          const note = m.scale[Math.floor(Math.random() * m.scale.length)];
          const dur  = ['2n', '2n.', '1n', '4n'][Math.floor(Math.random() * 4)];
          melSynth.triggerAttackRelease(note, dur, time, 0.2 + Math.random() * 0.25);
        }
      }, this._buildMelodyEvents(30));
      melPart.loop = true;
      melPart.loopEnd = '30s';
      this.parts.push(melPart);
    }

    // ── Lo-fi percussion ──
    if (m.layers.perc) {
      const kick = new Tone.MembraneSynth({ volume: -22 }).connect(vol);
      const snare = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.05 },
        volume: -26,
      }).connect(vol);
      const hihat = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
        volume: -34,
      }).connect(vol);
      this.synths.push(kick, snare, hihat);

      const beatPart = new Tone.Sequence((time, step) => {
        if (step === 0 || step === 4) kick.triggerAttackRelease('C1', '8n', time);
        if (step === 2 || step === 6) snare.triggerAttackRelease('8n', time);
        // sparse hihat - skip some
        if (Math.random() < 0.55) hihat.triggerAttackRelease('32n', time);
      }, [0,1,2,3,4,5,6,7], '8n');
      this.parts.push(beatPart);
    }

    // ── Texture / noise layer ──
    this._addTexture(m.layers.texture, vol);
  }

  _addTexture(type, dest) {
    if (!type) return;

    if (type === 'rain' || type === 'ocean') {
      const noise = new Tone.Noise('pink').start();
      const env   = new Tone.AmplitudeEnvelope({ attack: 4, decay: 0, sustain: 1, release: 4 });
      const filt  = new Tone.Filter(type === 'ocean' ? 600 : 1200, 'bandpass').connect(dest);
      const vol2  = new Tone.Volume(-28).connect(filt);
      noise.connect(env); env.connect(vol2);
      env.triggerAttack('+0.1');
      this.synths.push(noise, env);
    }

    if (type === 'space') {
      const noise = new Tone.Noise('brown').start();
      const filt  = new Tone.Filter(300, 'lowpass').connect(dest);
      const vol2  = new Tone.Volume(-38).connect(filt);
      noise.connect(vol2);
      this.synths.push(noise);
    }

    if (type === 'wind') {
      const noise = new Tone.Noise('pink').start();
      const lfo   = new Tone.LFO({ frequency: 0.08, min: -36, max: -28 }).start();
      const vol2  = new Tone.Volume(-36).connect(dest);
      lfo.connect(vol2.volume);
      const filt  = new Tone.Filter(700, 'bandpass').connect(vol2);
      noise.connect(filt);
      this.synths.push(noise, lfo);
    }

    if (type === 'vinyl') {
      const noise = new Tone.Noise('pink').start();
      const filt  = new Tone.Filter(4000, 'highpass').connect(dest);
      const vol2  = new Tone.Volume(-42).connect(filt);
      noise.connect(vol2);
      // crackle via LFO amplitude modulation
      const lfo = new Tone.LFO({ frequency: 0.4, min: -46, max: -40 }).start();
      lfo.connect(vol2.volume);
      this.synths.push(noise, lfo);
    }
  }

  _buildChordEvents(chords, intervalSec) {
    return chords.map((chord, i) => ({ time: i * intervalSec, chord }));
  }

  _buildMelodyEvents(windowSec) {
    const events = [];
    let t = 0;
    while (t < windowSec) {
      events.push({ time: t });
      t += 2 + Math.random() * 6;
    }
    return events;
  }

  start() {
    this.parts.forEach(p => p.start(0));
    Tone.Transport.start();
    isPlaying = true;
  }

  pause() {
    Tone.Transport.pause();
    isPlaying = false;
  }

  resume() {
    Tone.Transport.start();
    isPlaying = true;
  }

  stop() {
    Tone.Transport.stop();
    this.parts.forEach(p => p.stop().dispose());
    this.synths.forEach(s => { try { s.dispose(); } catch(e){} });
    isPlaying = false;
  }

  getWaveform() {
    return this.analyser ? this.analyser.getValue() : new Float32Array(512);
  }
}

// ─── Visualizer ───────────────────────────────────────────────────────────────
function startVisualizer() {
  const ctx  = visCanvas.getContext('2d');
  const W    = visCanvas.width  = visCanvas.offsetWidth;
  const H    = visCanvas.height = 120;
  const color = engine ? engine.mood.color : '#6c63ff';

  function draw() {
    visualizerAF = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);

    const data = engine ? engine.getWaveform() : new Float32Array(512);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

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

// ─── Progress Timer ───────────────────────────────────────────────────────────
function startProgressTimer(totalMs) {
  playbackStartTime = Date.now();
  progressTimer = setInterval(() => {
    const elapsed = Date.now() - playbackStartTime;
    const pct = Math.min((elapsed / totalMs) * 100, 100);
    progressBar.style.width = pct + '%';
    const remaining = Math.max(0, totalMs - elapsed);
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    statusText.textContent = `Playing — ${m}:${s.toString().padStart(2,'0')} remaining`;
    if (pct >= 100) stopPlayback(true);
  }, 1000);
}

function stopProgressTimer() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

// ─── MediaRecorder Setup ──────────────────────────────────────────────────────
function setupRecorder() {
  try {
    const stream = Tone.getDestination().context.createMediaStreamDestination();
    Tone.getDestination().connect(stream);
    recorder = new MediaRecorder(stream.stream, { mimeType: 'audio/webm;codecs=opus' });
    recordedChunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    recorder.start(1000);
  } catch (e) {
    console.warn('MediaRecorder not available:', e);
  }
}

// ─── Generate / Play ──────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  if (isGenerating) return;
  if (isPlaying) { stopPlayback(false); return; }

  isGenerating = true;
  generateBtn.disabled = true;
  generateBtn.querySelector('.btn-label').textContent = 'Initializing...';
  statusRow.style.display = 'block';
  progressBar.style.width = '0%';
  statusText.textContent = 'Building synthesis engine...';

  try {
    if (engine) { engine.stop(); engine = null; }
    engine = new AmbientEngine(selectedMood);
    await engine.init();

    statusText.textContent = 'Starting playback...';
    progressBar.style.width = '10%';

    setupRecorder();
    engine.start();
    isGenerating = false;
    isPlaying    = true;

    generateBtn.classList.add('generating');
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-icon').textContent = '⬛';
    generateBtn.querySelector('.btn-label').textContent = 'Stop';

    visSection.style.display = 'block';
    downloadBtn.style.display = 'none';
    nowPlaying.textContent    = `Now generating: ${MOODS[selectedMood].label} · ${durationMinutes} min`;

    startVisualizer();
    startProgressTimer(durationMinutes * 60 * 1000);

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
    stopProgressTimer();
    playPauseBtn.textContent = '▶ Resume';
  } else {
    engine.resume();
    startProgressTimer((durationMinutes * 60 * 1000) - (Date.now() - playbackStartTime));
    playPauseBtn.textContent = '⏸ Pause';
  }
  isPlaying = !isPlaying;
});

stopBtn.addEventListener('click', () => stopPlayback(false));

function stopPlayback(finished) {
  stopProgressTimer();
  stopVisualizer();
  if (engine) { engine.stop(); engine = null; }
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
    recorder.onstop = () => { if (recordedChunks.length) downloadBtn.style.display = 'inline-flex'; };
  }
  isPlaying    = false;
  isGenerating = false;

  generateBtn.classList.remove('generating');
  generateBtn.querySelector('.btn-icon').textContent = '▶';
  generateBtn.querySelector('.btn-label').textContent = `Generate "${MOODS[selectedMood].label}"`;
  generateBtn.disabled = false;
  playPauseBtn.textContent = '⏸ Pause';

  progressBar.style.width = finished ? '100%' : progressBar.style.width;
  statusText.textContent   = finished ? 'Done! Download your track below.' : 'Stopped.';
  nowPlaying.textContent   = finished ? `Finished: ${MOODS[selectedMood].label}` : '';
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
