// Diagnostic for the "rapid floor changes" motion test: records per-frame camera steps and frame times right after load.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
await page.goto('http://127.0.0.1:4173/?e2e=1#/ar/explore');
await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 30000 });
const wait0 = Number(process.argv[2] ?? 0); if (wait0) await page.waitForTimeout(wait0);
const trace = await page.evaluate(async () => {
  const { engine, store } = window.__nakhla; const s = () => store.getState(); const pos = []; const ts = [];
  let on = true; const rec = (t) => { pos.push(engine.camera.position.toArray()); ts.push(t); if (on) requestAnimationFrame(rec); }; requestAnimationFrame(rec);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  s().selectFloor('F03'); await wait(180); s().selectFloor('F07'); await wait(120); s().selectFloor('F05'); await wait(90); s().selectUnit('U05B');
  await new Promise((res) => { const t = () => (engine.director.busy || engine.openFloor !== 'F05' || engine.director.value('explode') < 0.999 ? requestAnimationFrame(t) : res()); setTimeout(t, 300); });
  on = false; const steps = [];
  for (let i = 1; i < pos.length; i++) steps.push({ i, step: +Math.hypot(pos[i][0] - pos[i - 1][0], pos[i][1] - pos[i - 1][1], pos[i][2] - pos[i - 1][2]).toFixed(2), dt: Math.round(ts[i] - ts[i - 1]) });
  return { frames: pos.length, top: steps.sort((a, b) => b.step - a.step).slice(0, 5), slow: steps.sort((a, b) => b.dt - a.dt).slice(0, 5), stats: engine.director.stats };
});
console.log(JSON.stringify(trace));
await browser.close();
