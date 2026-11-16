import { useStore, type AppState } from '../state/store';
import { FLOOR_BY_ID } from '../domain/tower';
import { getFloorPlan } from '../domain/plans';
import { sunDirection } from '../engine/environment';

// ---------------------------------------------------------------------------------------------
// Sound design (remediation §8 / addendum T17). ORIGINAL and procedural: every sound is synthesised in
// the Web Audio graph from noise and oscillators — nothing is downloaded, nothing to license.
//
// QUIET BY DEFAULT: no AudioContext exists until the visitor presses the sound control; opt-in is never
// persisted, every page load starts silent, hiding the tab silences it (V4).
//
// Graph:  layers ─► ambience bus ─┐
//         music pad ─► music bus ──┼─► master ─► limiter ─► speakers
//         one-shots ─► effects bus ┘
// A "scene" (home, pool, café, exterior …) is a set of layer levels; changing scene / weather / time only
// re-targets those levels with a smooth time constant, so nothing ever starts or stops abruptly.
// ---------------------------------------------------------------------------------------------

export type SceneId = 'exterior' | 'terrace' | 'home' | 'lobby' | 'pool' | 'gym' | 'spa' | 'restaurant' | 'cafe';
const LAYERS = ['traffic', 'wind', 'birds', 'crickets', 'roomtone', 'hvac', 'water', 'murmur', 'clinks', 'rainOut', 'rainIn'] as const;
type Layer = (typeof LAYERS)[number];
type Levels = Partial<Record<Layer, number>>;

const SCENES: Record<SceneId, Levels> = {
  exterior: { traffic: 0.55, wind: 0.35, birds: 0.5, crickets: 0.5, rainOut: 1 },
  terrace: { traffic: 0.28, wind: 0.6, birds: 0.35, crickets: 0.45, rainOut: 1, murmur: 0.12 },
  home: { roomtone: 0.6, hvac: 0.35, traffic: 0.1, birds: 0.08, rainIn: 1 },
  lobby: { roomtone: 0.5, hvac: 0.4, traffic: 0.18, murmur: 0.12, rainIn: 0.8 },
  pool: { roomtone: 0.35, hvac: 0.3, water: 0.8, rainIn: 0.8 },
  gym: { roomtone: 0.45, hvac: 0.55, traffic: 0.08, rainIn: 0.8 },
  spa: { roomtone: 0.4, hvac: 0.2, water: 0.25, rainIn: 0.6 },
  restaurant: { roomtone: 0.35, hvac: 0.3, murmur: 0.6, clinks: 0.45, rainIn: 0.8 },
  cafe: { roomtone: 0.35, hvac: 0.3, murmur: 0.45, clinks: 0.7, rainIn: 0.8 },
};
/** Loudness of each layer at level 1 (linear). Balanced by measurement (see SOUND_DESIGN.md). */
const TRIM: Record<Layer, number> = { traffic: 0.5, wind: 0.42, birds: 0.07, crickets: 0.04, roomtone: 0.26, hvac: 0.1, water: 0.4, murmur: 0.36, clinks: 0.045, rainOut: 0.36, rainIn: 0.22 };

export interface Mix { music: number; ambience: number; effects: number }
export interface SceneState { scene: SceneId; night: number; rain: number; wind: number; dust: number }

// ------------------------------------------------------------------ deterministic noise / helpers
const rng = (seed: number) => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
/** RBJ biquad (in place) — used only to pre-shape buffers. */
function biquad(x: Float32Array, sr: number, type: 'bp' | 'lp' | 'hp', f: number, q: number) {
  const w = (2 * Math.PI * f) / sr, al = Math.sin(w) / (2 * q), c = Math.cos(w);
  let b0, b1, b2; const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; } else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
}
/** Make a buffer loop seamlessly: cross-fade its tail into its head (equal power). */
function seamless(d: Float32Array, xf: number): Float32Array {
  const n = d.length - xf; const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = d[i];
  for (let i = 0; i < xf; i++) { const t = i / xf; out[i] = d[i] * Math.sin((t * Math.PI) / 2) + d[n + i] * Math.cos((t * Math.PI) / 2); }
  return out;
}
function normalise(d: Float32Array, peak = 0.9) { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m; return d; }
function mkBuffer(ctx: BaseAudioContext, chans: Float32Array[]): AudioBuffer {
  const b = ctx.createBuffer(chans.length, chans[0].length, ctx.sampleRate); chans.forEach((c, i) => b.copyToChannel(c as Float32Array<ArrayBuffer>, i)); return b;
}
function noise(sr: number, sec: number, color: 'white' | 'pink' | 'brown', seed: number): Float32Array {
  const n = Math.round(sr * sec), d = new Float32Array(n), r = rng(seed);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    if (color === 'white') d[i] = w;
    else if (color === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  }
  return d;
}

// ------------------------------------------------------------------ procedural textures (built once per context)
function babble(sr: number, seed: number): Float32Array[] {
  // ~12 distant, indistinct voices: glottal pulse trains (95–230 Hz) shaped by vowel formants per syllable, with
  // short unvoiced consonants — no words, no language, just the texture of quiet conversation in a room
  const VOWELS: [number, number, number][] = [[730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [300, 870, 2240], [640, 1190, 2390], [490, 1350, 1690]];
  const sec = 10, n = Math.round(sr * sec) + sr, L = new Float32Array(n), R = new Float32Array(n), r = rng(seed);
  for (let v = 0; v < 22; v++) {
    const f0base = r() < 0.5 ? 95 + r() * 45 : 175 + r() * 55, voice = new Float32Array(n); let t = Math.floor(r() * sr * 2), phase = 0;
    while (t < n) {
      const words = 2 + Math.floor(r() * 7);
      for (let w = 0; w < words && t < n; w++) {
        const syl = 1 + Math.floor(r() * 3);
        for (let k = 0; k < syl && t < n; k++) {
          const len = Math.floor(sr * (0.08 + r() * 0.14)), vw = VOWELS[Math.floor(r() * VOWELS.length)], seg = new Float32Array(len), f0 = f0base * (0.9 + r() * 0.25), glide = (r() - 0.5) * 0.25;
          const breath = noise(sr, len / sr + 0.01, 'white', seed + t + v);
          for (let i = 0; i < len; i++) { phase += (f0 * (1 + glide * (i / len))) / sr; phase -= Math.floor(phase); seg[i] = (phase * 2 - 1) * 0.55 + breath[i] * 0.45; }   // voiced + breathy
          const a = Float32Array.from(seg), b = Float32Array.from(seg), c = Float32Array.from(seg);
          biquad(a, sr, 'bp', vw[0], 5); biquad(b, sr, 'bp', vw[1], 7); biquad(c, sr, 'bp', vw[2], 9);
          for (let i = 0; i < len && t + i < n; i++) voice[t + i] += (a[i] + 0.55 * b[i] + 0.2 * c[i]) * Math.sin((Math.PI * i) / len) ** 0.8;
          t += len;
          if (r() < 0.45) { const cl = Math.floor(sr * (0.02 + r() * 0.05)); const nz = noise(sr, cl / sr + 0.01, 'white', seed + t); biquad(nz, sr, 'bp', 3500 + r() * 2500, 1.2); for (let i = 0; i < cl && t + i < n; i++) voice[t + i] += nz[i] * 0.12 * Math.sin((Math.PI * i) / cl); t += cl; }
        }
        t += Math.floor(sr * (0.03 + r() * 0.12));
      }
      t += Math.floor(sr * (0.5 + r() * 2.5));                                   // pause, then the next phrase
    }
    const g = (0.5 + r() * 0.5) * (v < 6 ? 1 : 0.55), pan = r();   // a few nearer tables, many distant ones
    for (let i = 0; i < n; i++) { const x = voice[i] * g; L[i] += x * (1 - pan * 0.7); R[i] += x * (0.3 + pan * 0.7); }
  }
  biquad(L, sr, 'lp', 2400, 0.7); biquad(R, sr, 'lp', 2400, 0.7); biquad(L, sr, 'hp', 110, 0.7); biquad(R, sr, 'hp', 110, 0.7);
  return [normalise(seamless(L, sr), 0.8), normalise(seamless(R, sr), 0.8)];
}
function crickets(sr: number, seed: number): Float32Array[] {
  const sec = 6, n = Math.round(sr * sec) + sr / 2, out = [new Float32Array(n), new Float32Array(n)], r = rng(seed);
  for (let k = 0; k < 4; k++) {
    const f = 4300 + r() * 900, ch = out[k % 2], rate = 0.22 + r() * 0.25; let t = Math.floor(r() * sr);
    while (t < n) { const pulses = 3 + Math.floor(r() * 3); for (let p = 0; p < pulses; p++) { const len = Math.floor(sr * 0.012); for (let i = 0; i < len && t + i < n; i++) ch[t + i] += Math.sin((2 * Math.PI * f * (t + i)) / sr) * Math.sin((Math.PI * i) / len) * 0.5; t += Math.floor(sr * 0.022); } t += Math.floor(sr * (rate + r() * 0.2)); }
  }
  return out.map((c) => normalise(seamless(c, Math.floor(sr / 2)), 0.6));
}
function rainBed(sr: number, seed: number): Float32Array[] {
  const sec = 5, n = Math.round(sr * sec) + sr / 2, r = rng(seed);
  return [0, 1].map((ch) => {
    const d = noise(sr, n / sr, 'pink', seed + ch); biquad(d, sr, 'hp', 700, 0.7); biquad(d, sr, 'lp', 8000, 0.7);
    for (let k = 0; k < 900; k++) { const t = Math.floor(r() * (n - 400)), a = 0.4 + r() * 1.2, f = 2500 + r() * 4000; for (let i = 0; i < 300; i++) d[t + i] += a * Math.exp(-i / 40) * Math.sin((2 * Math.PI * f * i) / sr); }   // droplets
    return normalise(seamless(d, Math.floor(sr / 2)), 0.7);
  });
}

// ------------------------------------------------------------------ the graph (works on AudioContext AND OfflineAudioContext)
interface Graph {
  ctx: BaseAudioContext; master: GainNode; bus: Record<keyof Mix, GainNode>; layer: Record<Layer, GainNode>;
  extras: { windLfo: GainNode; rainOutTone: BiquadFilterNode };
  schedule(from: number, to: number, st: SceneState): void;
}

function buildGraph(ctx: BaseAudioContext, dest: AudioNode, seed = 7): Graph {
  const sr = ctx.sampleRate, r = rng(seed);
  const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -9; limiter.knee.value = 6; limiter.ratio.value = 12; limiter.attack.value = 0.004; limiter.release.value = 0.25;
  const master = ctx.createGain(); master.gain.value = 0; master.connect(limiter).connect(dest);
  const bus = { music: ctx.createGain(), ambience: ctx.createGain(), effects: ctx.createGain() };
  for (const b of Object.values(bus)) b.connect(master);
  const layer = {} as Record<Layer, GainNode>;
  for (const l of LAYERS) { const g = ctx.createGain(); g.gain.value = 0; g.connect(bus.ambience); layer[l] = g; }
  // a small, soft room: generated impulse (decaying, darkening noise), fed by the indoor detail layers
  const room = ctx.createConvolver(); { const len = Math.floor(sr * 1.1), L = noise(sr, len / sr, 'white', seed + 90), R = noise(sr, len / sr, 'white', seed + 91);
    for (let i = 0; i < len; i++) { const e = Math.exp((-i / sr) * 5.5); L[i] *= e; R[i] *= e; } biquad(L, sr, 'lp', 3500, 0.7); biquad(R, sr, 'lp', 3500, 0.7); room.buffer = mkBuffer(ctx, [normalise(L, 0.5), normalise(R, 0.5)]); }
  const roomSend = ctx.createGain(); roomSend.gain.value = 0.35; roomSend.connect(room).connect(bus.ambience);
  const loop = (buf: AudioBuffer, to: AudioNode, offset = 0) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(to); s.start(0, offset % buf.duration); return s; };
  const lfo = (freq: number, depth: number, target: AudioParam) => { const o = ctx.createOscillator(); o.frequency.value = freq; const g = ctx.createGain(); g.gain.value = depth; o.connect(g).connect(target); o.start(); };
  const filt = (type: BiquadFilterType, f: number, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };

  const brown = mkBuffer(ctx, [seamless(noise(sr, 7, 'brown', seed), sr / 2), seamless(noise(sr, 7, 'brown', seed + 1), sr / 2)]);
  const pink = mkBuffer(ctx, [seamless(noise(sr, 6, 'pink', seed + 2), sr / 2), seamless(noise(sr, 6, 'pink', seed + 3), sr / 2)]);
  // traffic: distant city rumble with slow swells
  { const lp = filt('lowpass', 240), g = ctx.createGain(); g.gain.value = TRIM.traffic; loop(brown, lp, 1.3); lp.connect(g).connect(layer.traffic); lfo(0.06, TRIM.traffic * 0.35, g.gain); }
  // wind: band-limited pink noise with two slow gust LFOs (gust depth rises with the "windy" weather)
  const windLfo = ctx.createGain(); windLfo.gain.value = 0;
  { const bp = filt('bandpass', 520, 0.6), g = ctx.createGain(); g.gain.value = TRIM.wind; loop(pink, bp, 2.1); bp.connect(g).connect(layer.wind); lfo(0.07, TRIM.wind * 0.4, g.gain); lfo(0.19, TRIM.wind * 0.18, g.gain); const o = ctx.createOscillator(); o.frequency.value = 0.11; o.connect(windLfo).connect(g.gain); o.start(); lfo(0.05, 140, bp.frequency); }
  // room tone + ventilation
  { const lp = filt('lowpass', 160), g = ctx.createGain(); g.gain.value = TRIM.roomtone; loop(brown, lp, 3.7); lp.connect(g).connect(layer.roomtone); }
  { const hp = filt('highpass', 140), lp = filt('lowpass', 1100), g = ctx.createGain(); g.gain.value = TRIM.hvac; loop(pink, hp, 0.4); hp.connect(lp).connect(g).connect(layer.hvac); }
  // pool water: slow swelling low-mid wash
  { const bp = filt('bandpass', 420, 0.9), g = ctx.createGain(); g.gain.value = TRIM.water * 0.6; loop(pink, bp, 4.4); bp.connect(g).connect(layer.water); lfo(0.23, TRIM.water * 0.25, g.gain); lfo(0.09, 120, bp.frequency); }
  // conversation + crickets + rain beds
  { const g = ctx.createGain(); g.gain.value = TRIM.murmur; loop(mkBuffer(ctx, babble(sr, seed + 20)), g, 0); g.connect(layer.murmur); }
  { const g = ctx.createGain(); g.gain.value = TRIM.crickets; loop(mkBuffer(ctx, crickets(sr, seed + 30)), g, 0); g.connect(layer.crickets); }
  const rainBuf = mkBuffer(ctx, rainBed(sr, seed + 40));
  const rainOutTone = filt('lowpass', 9000);
  { const g = ctx.createGain(); g.gain.value = TRIM.rainOut; loop(rainBuf, rainOutTone, 0); rainOutTone.connect(g).connect(layer.rainOut); }
  { const lp = filt('lowpass', 700), g = ctx.createGain(); g.gain.value = TRIM.rainIn; loop(rainBuf, lp, 1.7); lp.connect(g).connect(layer.rainIn); }   // heard through the glass

  // ---- music (V11.3, original): a slow piece in D major at 60 bpm. Warm string-like pad chords that CROSS-FADE (no pitch
  // glides), soft low piano-like notes, and a sparse plucked melody (Karplus-Strong, pre-rendered per pitch) that walks
  // between chord tones — all in a generated 3.6 s hall. Deterministic (seeded), so offline renders are reproducible.
  const musicIn = ctx.createGain(); const musicDry = ctx.createGain(); musicDry.gain.value = 0.62; const hallSend = ctx.createGain(); hallSend.gain.value = 0.55;
  const hall = ctx.createConvolver(); { const len = Math.floor(sr * 3.6), pre = Math.floor(sr * 0.022);
    const chans = [0, 1].map((c) => { const d = noise(sr, len / sr, 'white', seed + 120 + c); for (let i = 0; i < len; i++) d[i] = i < pre ? 0 : d[i] * Math.exp((-(i - pre) / sr) * 1.9); biquad(d, sr, 'lp', 3200, 0.7); biquad(d, sr, 'hp', 140, 0.7); return normalise(d, 0.5); });
    hall.buffer = mkBuffer(ctx, chans); }
  const hallOut = ctx.createGain(); hallOut.gain.value = 0.5;
  const musicLevel = ctx.createGain(); musicLevel.gain.value = 5.0; musicLevel.connect(bus.music);   // measured: music alone ≈ −30 LUFS at the default slider (earshot)
  musicIn.connect(musicDry).connect(musicLevel); musicIn.connect(hallSend).connect(hall).connect(hallOut).connect(musicLevel);
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  // Dmaj9 · Bm9 · Gmaj7♯11 · Asus2 (16 s each): calm and open rather than melancholic; melody pool = D major pentatonic + C♯/G
  const PROG: { pad: number[]; bass: number; tones: number[] }[] = [
    { pad: [50, 54, 57, 61, 64], bass: 38, tones: [62, 64, 66, 69, 71, 73] },
    { pad: [47, 54, 57, 61, 62], bass: 35, tones: [61, 62, 66, 69, 71, 74] },
    { pad: [43, 50, 54, 59, 61], bass: 31, tones: [62, 66, 67, 69, 71, 73] },
    { pad: [45, 52, 57, 59, 64], bass: 33, tones: [61, 64, 66, 69, 71, 76] },
  ];
  const mr = rng(seed + 77); const plucks = new Map<number, AudioBuffer>();
  const pluckBuf = (m: number) => { let b = plucks.get(m); if (b) return b;
    const f = hz(m), n = Math.floor(sr * 3.4), N = Math.max(2, Math.round(sr / f)), y = new Float32Array(n), pr = rng(seed + m);
    for (let i = 0; i < N; i++) y[i] = (pr() * 2 - 1) * (0.6 + 0.4 * Math.sin((Math.PI * i) / N));
    for (let i = N + 1; i < n; i++) y[i] = 0.4985 * (y[i - N] + y[i - N - 1]);          // string loss: ~3 s decay
    biquad(y, sr, 'lp', 6200, 0.7); for (let i = 0; i < 48; i++) y[i] *= i / 48;
    b = mkBuffer(ctx, [normalise(y, 0.55)]); plucks.set(m, b); return b; };
  const padNote = (t: number, m: number, dur: number, amp: number) => {
    const out = ctx.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(amp, t + 3.2); out.gain.setValueAtTime(amp, t + dur - 4); out.gain.linearRampToValueAtTime(0, t + dur);
    const lp = filt('lowpass', 700 + mr() * 350, 0.5); lp.connect(out).connect(musicIn);
    for (const det of [-7, 6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det; const g = ctx.createGain(); g.gain.value = 0.5; o.connect(g).connect(lp); o.start(t); o.stop(t + dur + 0.05); }
  };
  const lowNote = (t: number, m: number, amp: number) => {
    const out = ctx.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(amp, t + 0.02); out.gain.exponentialRampToValueAtTime(0.0008, t + 6); out.connect(musicIn);
    for (const [k, a] of [[1, 1], [2, 0.22], [3, 0.06]] as [number, number][]) { const o = ctx.createOscillator(); o.frequency.value = hz(m) * k; const g = ctx.createGain(); g.gain.value = a; o.connect(g).connect(out); o.start(t); o.stop(t + 6.1); }
  };
  const pluck = (t: number, m: number, amp: number, pan: number) => { const s = ctx.createBufferSource(); s.buffer = pluckBuf(m); const g = ctx.createGain(); g.gain.value = amp; const p = ctx.createStereoPanner(); p.pan.value = pan; s.connect(g).connect(p).connect(musicIn); s.start(t); };
  let melodyIdx = 2, musicFrom = -1;
  const scheduleMusic = (from: number, to: number) => {
    const BAR = 4, CH = 16;
    const chordAt = (t: number) => PROG[Math.floor(t / CH) % PROG.length];
    let first = musicFrom < 0 ? Math.floor(from / CH) * CH : Math.ceil(from / CH) * CH; if (musicFrom < 0) musicFrom = from;
    for (let t0 = first; t0 < to; t0 += CH) {
      const c = chordAt(t0 + 0.01), start = Math.max(t0, from);
      c.pad.forEach((m, i) => padNote(start, m, CH + 3, 0.05 - i * 0.004));
      lowNote(start + 0.05, c.bass, 0.09); if (mr() < 0.6) lowNote(t0 + CH / 2 + 0.05, c.bass + 12, 0.05);
    }
    // melody: phrases of 2 bars, then a bar of rest; 1–3 notes per bar, on beats with a little human timing
    for (let b = Math.ceil(from); b < to; b += 1) {
      const bar = Math.floor(b / BAR), beat = b % BAR, phrase = bar % 3;
      if (phrase === 2 || mr() > (beat === 0 ? 0.78 : 0.34)) continue;
      const tones = chordAt(b).tones; melodyIdx = Math.max(0, Math.min(tones.length - 1, melodyIdx + (mr() < 0.5 ? -1 : 1) * (mr() < 0.8 ? 1 : 2)));
      pluck(b + (mr() - 0.5) * 0.06, tones[melodyIdx], 0.34 + mr() * 0.14, (mr() - 0.5) * 0.5);
    }
  };

  // ---- one-shot events (birds, cup clinks, water drips) are scheduled ahead in small windows
  const chirp = (t: number, f0: number, pan: number, amp: number, to: AudioNode = layer.birds, dur = 0.12) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = pan;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + r() * 0.4), t + 0.05); o.frequency.exponentialRampToValueAtTime(f0 * 0.85, t + 0.11);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(p).connect(to); o.start(t); o.stop(t + dur + 0.02);
  };
  const ping = (t: number, f: number, pan: number, amp: number, to: AudioNode, decay = 0.35, ratios = [1, 2.76, 5.4]) => {
    const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(to);
    for (const [k, a] of ratios.map((k, i) => [k, [1, 0.5, 0.25][i] ?? 0.2]) as [number, number][]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * k; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * a, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0005, t + decay / k); o.connect(g).connect(p); o.start(t); o.stop(t + decay / k + 0.02); }
  };
  const schedule = (from: number, to: number, st: SceneState) => {
    scheduleMusic(from, to);
    const lv = SCENES[st.scene];
    if ((lv.birds ?? 0) > 0 && st.night < 0.5 && st.rain < 0.5) for (let t = from + r() * 2.5; t < to; t += 3 + r() * 6) { const n = 2 + Math.floor(r() * 4), f0 = 2600 + r() * 1800, pan = r() * 1.6 - 0.8; for (let k = 0; k < n; k++) chirp(t + k * (0.13 + r() * 0.08), f0 * (0.95 + r() * 0.1), pan, 0.5 + r() * 0.5); }
    if ((lv.clinks ?? 0) > 0) for (let t = from + r() * 3; t < to; t += 3 + r() * 7) { const glass = r() < 0.4; ping(t, glass ? 3200 + r() * 1500 : 1700 + r() * 900, r() * 1.4 - 0.7, 0.35 + r() * 0.4, layer.clinks, glass ? 0.22 : 0.09, glass ? [1, 2.32, 4.25] : [1, 2.71, 5.15]); if (r() < 0.3) ping(t + 0.07 + r() * 0.05, 1900 + r() * 800, r() * 1.4 - 0.7, 0.2, layer.clinks, 0.07, [1, 2.71, 5.15]); }
    if ((lv.water ?? 0) > 0) for (let t = from + r(); t < to; t += 0.9 + r() * 2.8) chirp(t, 650 + r() * 500, r() * 1.6 - 0.8, 0.1 + r() * 0.1, layer.water, 0.035);   // short pitched plink, not a bell
  };
  for (const l of ['murmur', 'clinks', 'water'] as Layer[]) layer[l].connect(roomSend);
  return { ctx, master, bus, layer, extras: { windLfo, rainOutTone }, schedule };
}

/** Re-target every layer for a scene state. tc = time constant (s) of the cross-fade. */
function applyScene(g: Graph, st: SceneState, tc: number) {
  const t = g.ctx.currentTime, base = SCENES[st.scene];
  for (const l of LAYERS) {
    let v = base[l] ?? 0;
    if (l === 'birds') v *= (1 - st.night) * (1 - st.rain) * (1 - st.dust * 0.7);
    if (l === 'crickets') v *= st.night * (1 - st.rain);
    if (l === 'traffic') v *= 1 - st.night * 0.45;
    if (l === 'wind') v *= 0.55 + st.wind * 0.9 + st.dust * 0.5;
    if (l === 'murmur' || l === 'clinks') v *= st.scene === 'terrace' ? 1 - st.rain : 1;
    if (l === 'rainOut' || l === 'rainIn') v *= st.rain;
    g.layer[l].gain.setTargetAtTime(v, t, tc);
  }
  g.extras.windLfo.gain.setTargetAtTime(TRIM.wind * 0.35 * (st.wind + st.dust), t, tc);
}

// ------------------------------------------------------------------ scene from the app state
const KIND_SCENE: Record<string, SceneId> = { pool: 'pool', gym: 'gym', spa: 'spa', changing: 'spa', 'wellness-lounge': 'spa', restaurant: 'restaurant', cafe: 'cafe', 'kitchen-commercial': 'restaurant', reception: 'lobby', lobby: 'lobby', terrace: 'terrace', 'shisha-conditional': 'terrace', balcony: 'terrace' };
export function sceneFor(s: Pick<AppState, 'view' | 'floorId' | 'roomKey' | 'env'>): SceneState {
  const el = sunDirection(s.env.timeMinutes, s.env.seasonId).elevationDeg;
  const night = Math.min(1, Math.max(0, (2 - el) / 10));
  const w = s.env.weatherId; const rain = w === 'light_rain' ? 1 : 0, wind = w === 'windy' ? 1 : w === 'overcast' ? 0.3 : 0, dust = w === 'dust' ? 1 : 0;
  let scene: SceneId = 'exterior';
  if (s.view === 'room' && s.floorId && s.roomKey) {
    const room = getFloorPlan(s.floorId).rooms.find((r) => r.key === s.roomKey);
    scene = room ? KIND_SCENE[room.kind] ?? (room.outdoor ? 'terrace' : FLOOR_BY_ID[s.floorId].category === 'residential' ? 'home' : 'lobby') : 'exterior';
  }
  return { scene, night, rain, wind, dust };
}

// ------------------------------------------------------------------ real-time controller
let ctx: AudioContext | null = null; let graph: Graph | null = null; let started = false; let horizon = 0; let timer = 0;
let mix: Mix = { music: 0.4, ambience: 0.85, effects: 0.6 };
const MASTER = 0.8;

function tick() {
  if (!ctx || !graph) return;
  const st = sceneFor(useStore.getState()); const now = ctx.currentTime;
  if (horizon < now) horizon = now;
  if (horizon < now + 4) { graph.schedule(horizon, now + 6, st); horizon = now + 6; }
}
function build() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC({ latencyHint: 'playback' });
  graph = buildGraph(ctx, ctx.destination);
  setMix(mix); applyScene(graph, sceneFor(useStore.getState()), 0.01);
  started = true;
  // the scene follows the visitor: every state change re-targets the layers (smooth cross-fade, no restarts)
  useStore.subscribe((s, p) => {
    if (!graph || s.audio.muted) return;
    if (s.view !== p.view || s.roomKey !== p.roomKey || s.floorId !== p.floorId || s.env !== p.env) applyScene(graph, sceneFor(s), s.motionPref === 'reduced' ? 0.4 : 1.2);
    if (s.view !== p.view || s.section !== p.section) whoosh();
  });
}

/** Called ONLY from the explicit sound control (a user gesture). */
export function setAmbience(on: boolean) {
  if (on && !started) { try { build(); } catch { return; } }
  if (!ctx || !graph) return;
  const t = ctx.currentTime; const m = graph.master.gain;
  m.cancelScheduledValues(t); m.setValueAtTime(m.value, t);
  if (on) { void ctx.resume(); m.linearRampToValueAtTime(MASTER, t + 1.6); window.clearInterval(timer); timer = window.setInterval(tick, 1000); tick(); }
  else { m.linearRampToValueAtTime(0, t + 0.35); window.clearInterval(timer); window.setTimeout(() => { if (useStore.getState().audio.muted) void ctx?.suspend(); }, 450); }
}
export function setMix(next: Partial<Mix>) {
  mix = { ...mix, ...next };
  if (!ctx || !graph) return; const t = ctx.currentTime;
  for (const k of Object.keys(mix) as (keyof Mix)[]) graph.bus[k].gain.setTargetAtTime(mix[k] * mix[k], t, 0.08);     // perceptual (square) taper
}
export const getMix = () => mix;
/** A soft air movement on view / section changes (effects bus; only ever heard with sound on). */
function whoosh() {
  if (!ctx || !graph || mix.effects <= 0) return;
  const t = ctx.currentTime, n = ctx.createBufferSource(), sr = ctx.sampleRate; const d = noise(sr, 0.9, 'pink', Math.floor(t * 1000));
  n.buffer = mkBuffer(ctx, [d]); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.setValueAtTime(380, t); bp.frequency.exponentialRampToValueAtTime(1500, t + 0.55);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.25); g.gain.linearRampToValueAtTime(0, t + 0.85);
  n.connect(bp).connect(g).connect(graph.bus.effects); n.start(t); n.stop(t + 0.9);
}

export const audioDebug = () => ({ contextCreated: ctx !== null, state: ctx?.state ?? 'none', gain: graph?.master.gain.value ?? 0, scene: sceneFor(useStore.getState()).scene, mix });

/** Offline render of one scene for measurement (loudness, peaks, loop seams). Never touches the live context. */
export async function renderScene(scene: SceneId, opts: { seconds?: number; night?: number; rain?: number; wind?: number; dust?: number; music?: boolean; ambience?: boolean } = {}): Promise<{ sampleRate: number; left: Float32Array; right: Float32Array }> {
  const sr = 44100, sec = opts.seconds ?? 20; const oc = new OfflineAudioContext(2, sr * sec, sr);
  const g = buildGraph(oc, oc.destination);
  g.master.gain.value = MASTER; g.bus.music.gain.value = opts.music ? mix.music ** 2 : 0; g.bus.ambience.gain.value = opts.ambience === false ? 0 : mix.ambience ** 2; g.bus.effects.gain.value = mix.effects ** 2;
  const st: SceneState = { scene, night: opts.night ?? 0, rain: opts.rain ?? 0, wind: opts.wind ?? 0, dust: opts.dust ?? 0 };
  applyScene(g, st, 0.001); g.schedule(0, sec, st);
  const buf = await oc.startRendering();
  return { sampleRate: sr, left: buf.getChannelData(0), right: buf.getChannelData(1) };
}

if (typeof document !== 'undefined') {
  // leaving the tab silences the experience; coming back needs a fresh gesture
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return; const s = useStore.getState();
    if (!s.audio.muted) { setAmbience(false); useStore.setState({ audio: { ...s.audio, muted: true } }); }
  });
}
