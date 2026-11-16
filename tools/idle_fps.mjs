// V11.3: frame times while the world is LIVE (traffic moving, ?live=1) in the tower orbit and the street view, plus draw
// calls / triangles. Usage: node tools/idle_fps.mjs [outJson]
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const out = process.argv[2] ?? 'project_artifacts/evidence/live-frame-times.json';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const res = {};
for (const [name, hash, street, vp] of [['tower_1366', '#/en/explore', null, [1366, 768]], ['street_dusk_1366', '#/en/explore?t=1165', 'street_arrival_dusk', [1366, 768]], ['tower_1920', '#/en/explore', null, [1920, 1080]]]) {
  const page = await (await browser.newContext({ viewport: { width: vp[0], height: vp[1] } })).newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto('http://127.0.0.1:4173/?e2e=1&live=1' + hash);
  await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 60000 });
  if (street) await page.evaluate((id) => window.__nakhla.engine.goStreetView(id), street);
  await page.waitForTimeout(6000);
  res[name] = await page.evaluate(async () => {
    const e = window.__nakhla.engine; const ts = []; let last = performance.now();
    await new Promise((r) => { const t0 = last; const f = () => { const n = performance.now(); ts.push(n - last); last = n; if (n - t0 < 6000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
    ts.shift(); ts.sort((a, b) => a - b); const q = (p) => +ts[Math.min(ts.length - 1, Math.floor(p * ts.length))].toFixed(1);
    const i = e.renderer.info;
    return { frames: ts.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: +ts[ts.length - 1].toFixed(1), over50: ts.filter((x) => x > 50).length, drawCalls: i.render.calls, triangles: i.render.triangles };
  });
  await page.close();
}
writeFileSync(out, JSON.stringify({ capturedAt: new Date().toISOString(), note: 'live world (traffic moving), production build, Chrome headless with GPU (RTX 3050)', ...res }, null, 1));
console.log(JSON.stringify(res, null, 1));
await browser.close();
