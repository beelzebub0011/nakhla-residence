// V11.3 Gate 1 — hitch probe. Replays the 20-cycle navigation of tests/e2e/motion.spec.ts (floor → unit → room →
// finish package → home) on the production build and attributes every long frame (> 40 ms) to what ran inside it:
// WebGL call classes (shader compile/link, texture upload, buffer upload, draw) and Engine methods (wall time).
// Usage: node tools/hitch_probe.mjs [outJson] [--cold] [--cycles=N]
//   --cold : skip the warm-up slice (first visit of every path)
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'project_artifacts/evidence/hitch-probe.json';
const cold = process.argv.includes('--cold');
const cycles = +(process.argv.find((a) => a.startsWith('--cycles='))?.split('=')[1] ?? 20);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
await page.goto('http://127.0.0.1:4173/?e2e=1#/en/explore');
await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 60000 });
if (!cold) {
  await page.evaluate(() => window.__nakhla.runSlice(1));
  await page.waitForFunction(() => window.__nakhla.engine.finishesReady === true, null, { timeout: 60000 });
}
const res = await page.evaluate(async ({ cycles }) => {
  const { engine, store } = window.__nakhla; const s = () => store.getState();
  const gl = engine.renderer.getContext(); const bucket = {}; const add = (k, ms) => { bucket[k] = (bucket[k] ?? 0) + ms; };
  const cls = { compileShader: 'gl.shader', linkProgram: 'gl.shader', getProgramParameter: 'gl.shader(sync)', getShaderParameter: 'gl.shader(sync)', getProgramInfoLog: 'gl.shader(sync)', getShaderInfoLog: 'gl.shader(sync)',
    texImage2D: 'gl.texUpload', texSubImage2D: 'gl.texUpload', texStorage2D: 'gl.texUpload', compressedTexImage2D: 'gl.texUpload', generateMipmap: 'gl.mipmap',
    bufferData: 'gl.bufUpload', bufferSubData: 'gl.bufUpload', drawElements: 'gl.draw', drawArrays: 'gl.draw', drawElementsInstanced: 'gl.draw', drawArraysInstanced: 'gl.draw', readPixels: 'gl.readPixels', finish: 'gl.finish', getError: 'gl.getError' };
  for (const [fn, k] of Object.entries(cls)) { const o = gl[fn]; if (typeof o !== 'function') continue; gl[fn] = function (...a) { const t = performance.now(); const r = o.apply(this, a); add(k, performance.now() - t); return r; }; }
  // engine methods: wrap only the top-level call (depth 0) so time is not double-counted
  let depth = 0; const proto = Object.getPrototypeOf(engine);
  for (const n of Object.getOwnPropertyNames(proto)) {
    if (n === 'constructor') continue; const d = Object.getOwnPropertyDescriptor(proto, n); if (!d || typeof d.value !== 'function') continue; const o = d.value;
    engine[n] = function (...a) { if (depth > 0) return o.apply(this, a); depth++; const t = performance.now(); try { return o.apply(this, a); } finally { depth--; add('engine.' + n, performance.now() - t); } };
  }
  const frames = []; let last = performance.now(); let on = true; let phase = 'start';
  const progs = () => engine.renderer.info.programs.length;
  let p0 = progs(); let tex0 = engine.renderer.info.memory.textures; let known = new Set(engine.renderer.info.programs);
  const loop = () => {
    const now = performance.now(); const dt = now - last; last = now;
    const p = progs(), tx = engine.renderer.info.memory.textures;
    const fresh = engine.renderer.info.programs.filter((x) => !known.has(x)); known = new Set(engine.renderer.info.programs);
    if (dt > 40) frames.push({ dt: +dt.toFixed(1), phase, newPrograms: p - p0, newTextures: tx - tex0, programNames: fresh.map((x) => x.name + ' ' + (x.cacheKey || '').replace(/\s+/g, '').slice(0, 30)), top: Object.entries(bucket).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, +v.toFixed(1)]) });
    p0 = p; tex0 = tx; for (const k in bucket) delete bucket[k];
    if (on) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const idle = () => new Promise((res) => { const t0 = performance.now(); const t = () => { const e = engine.director.value('explode'); const st = s(); (!engine.director.busy && (e < 0.001 || e > 0.999) && engine.openFloor === (st.view === 'tower' ? null : st.floorId) && performance.now() - t0 > 60) ? res() : requestAnimationFrame(t); }; requestAnimationFrame(t); });
  const all = []; let n = 0;
  const count = () => { all.push(1); };
  for (let i = 0; i < cycles; i++) {
    const f = ['F02', 'F04', 'F06', 'F09'][i % 4];
    phase = `c${i}:floor ${f}`; s().selectFloor(f); await idle();
    phase = `c${i}:unit`; s().selectUnit('U' + f.slice(1) + (i % 2 ? 'B' : 'A')); await idle();
    phase = `c${i}:room`; s().enterRoom((i % 2 ? 'B' : 'A') + '.living'); await idle();
    phase = `c${i}:package`; s().setPackage(['premium', 'luxury', 'standard'][i % 3]); await idle();
    phase = `c${i}:home`; s().home(); await idle();
  }
  on = false; await new Promise((r) => setTimeout(r, 50));
  return { frames, programs: progs(), textures: engine.renderer.info.memory.textures };
}, { cycles });
mkdirSync('project_artifacts/evidence', { recursive: true });
writeFileSync(out, JSON.stringify({ capturedAt: new Date().toISOString(), cold, cycles, ...res }, null, 1));
for (const f of res.frames) console.log(f.dt, f.phase, 'newProg', f.newPrograms, 'newTex', f.newTextures, JSON.stringify(f.top.slice(0, 4)), '| programs:', f.programNames.join(' | '));
console.log('long frames (>40ms):', res.frames.length, '| programs', res.programs, '| textures', res.textures);
await browser.close();
