// Render every sound scene OFFLINE with the site's own audio graph (OfflineAudioContext in Chrome) and save WAVs for
// measurement with earshot (LUFS, true peak, loop seams, critique). Usage: node tools/audio_render.mjs [outDir] [seconds]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'project_artifacts/evidence/audio';
const seconds = Number(process.argv[3] ?? 24);
mkdirSync(out, { recursive: true });
const JOBS = [
  ['exterior_day', 'exterior', {}], ['exterior_night', 'exterior', { night: 1 }], ['exterior_rain', 'exterior', { rain: 1 }], ['exterior_dust_wind', 'exterior', { dust: 1, wind: 1 }],
  ['terrace_evening', 'terrace', { night: 0.6 }], ['home_day', 'home', {}], ['home_rain', 'home', { rain: 1 }], ['lobby', 'lobby', {}],
  ['pool', 'pool', {}], ['gym', 'gym', {}], ['spa', 'spa', {}], ['restaurant', 'restaurant', {}], ['cafe', 'cafe', {}], ['home_day_with_music', 'home', { music: true }], ['music_only', 'home', { music: true, ambience: false }],
];
const wav = (sr, L, R) => {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4); }
  return b;
};
const gpu = process.env.AUDIO_GPU === '1';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu'] : ['--disable-gpu'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
await page.goto('http://127.0.0.1:4173/?e2e=1#/en/explore');
await page.waitForFunction(() => !!window.__nakhla?.renderScene, null, { timeout: 120000 });
const summary = [];
const only = (process.argv[4] ?? '').split(',').filter(Boolean);
for (const [name, scene, opts] of JOBS) {
  if (only.length && !only.includes(name)) continue;
  const r = await page.evaluate(async ([scene, opts, seconds]) => {
    const x = await window.__nakhla.renderScene(scene, { ...opts, seconds });
    let pk = 0, ss = 0; for (const c of [x.left, x.right]) for (const v of c) { pk = Math.max(pk, Math.abs(v)); ss += v * v; }
    return { sr: x.sampleRate, L: Array.from(x.left), R: Array.from(x.right), peak: pk, rms: Math.sqrt(ss / (x.left.length * 2)) };
  }, [scene, opts, seconds]);
  writeFileSync(`${out}/${name}.wav`, wav(r.sr, r.L, r.R));
  summary.push({ name, peakDb: +(20 * Math.log10(r.peak + 1e-9)).toFixed(1), rmsDb: +(20 * Math.log10(r.rms + 1e-9)).toFixed(1) });
  console.log(name, summary.at(-1));
}
writeFileSync(`${out}/_render_summary.json`, JSON.stringify(summary, null, 1));
await browser.close();
