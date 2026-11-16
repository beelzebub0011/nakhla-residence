// V11.5: live-site frames across hours, seasons and weathers (sky / light QA). UI hidden, 1600 × 900, headless Chrome.
// Usage: node tools/env_shots.mjs <outDir> [name,name,...]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'project_artifacts/env_qa';
const only = (process.argv[3] ?? '').split(',').filter(Boolean);
mkdirSync(out, { recursive: true });
const SHOTS = [
  ['noon_clear', 't=750&s=summer&w=clear'], ['morning_spring', 't=540&s=spring&w=clear'], ['afternoon_partly', 't=900&s=autumn&w=partly_cloudy'],
  ['golden', 't=1080&s=summer&w=clear'], ['sunset', 't=1110&s=summer&w=clear'], ['blue_hour', 't=1170&s=summer&w=clear'], ['night', 't=1290&s=summer&w=clear'],
  ['overcast', 't=780&s=winter&w=overcast'], ['rain', 't=840&s=winter&w=light_rain'], ['dust', 't=900&s=summer&w=dust'], ['winter_clear', 't=660&s=winter&w=clear'],
].map(([n, q]) => [n, `#/en/explore?${q}`]);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [name, hash] of SHOTS) {
  if (only.length && !only.includes(name)) continue;
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(`http://127.0.0.1:4173/?e2e=1${hash}`);
  await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 40000 });
  await page.waitForTimeout(3500);
  // a low three-quarter aerial that shows sky, tower, neighbours and streets together
  await page.evaluate(() => { const e = window.__nakhla.engine; const d = e.director; d.limits = { minDist: 1, maxDist: 600, minPol: 0.2, maxPol: Math.PI / 2 };
    d.orbit.az = 0.62; d.orbit.pol = 1.36; d.orbit.dist = 150; d.orbit.target.set(0, 26, 0); d.orbit.fov = 40; d.goalDist = 150; d.velAz = 0; d.velPol = 0; d.writeCamera(); e.invalidate(); });
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: 'body *:not(canvas):not(:has(canvas)) { visibility: hidden !important; }' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}.png` }); console.log('saved', name);
  await page.context().close();
}
await browser.close();
