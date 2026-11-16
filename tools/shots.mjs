// Capture review screenshots of real rendered states (production build must be served on :4173).
// Usage: node tools/shots.mjs [outDir] [name=hash@WxH ...]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'project_artifacts/evidence/screens';
mkdirSync(out, { recursive: true });
const defaults = [
  'tower=#/ar/explore@1366x768', 'floor=#/ar/explore?f=F04&v=floor@1366x768', 'unit=#/ar/explore?f=F04&u=U04A&v=unit@1366x768',
  'living=#/ar/tour?f=F04&u=U04A&r=A.living&v=room&m=guided@1366x768',
];
const jobs = (process.argv.length > 3 ? process.argv.slice(3) : defaults).map((j) => { const [name, rest] = j.split(/=(.*)/s); const [hash, size] = rest.split('@'); const [w, h] = (size ?? '1366x768').split('x').map(Number); return { name, hash, w, h }; });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
for (const j of jobs) {
  const ctx = await browser.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1, hasTouch: j.w < 700, isMobile: j.w < 700 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${j.name}] pageerror`, e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${j.name}] console.error`, m.text()); });
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(`http://127.0.0.1:4173/?hud=0${j.hash.startsWith('?') ? '&' + j.hash.slice(1) : ''}${j.hash.startsWith('#') ? j.hash : ''}`);
  await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true' || !!document.querySelector('[data-testid=lite]'), null, { timeout: 30000 });
  const clean = j.name.endsWith('!'); const name = clean ? j.name.slice(0, -1) : j.name;
  // "name!" = clean plate: hide every UI layer so only the real-time 3D canvas is captured (evidence for render comparisons)
  if (clean) await page.addStyleTag({ content: 'body *:not(canvas):not(:has(canvas)) { visibility: hidden !important; }' });
  await page.waitForTimeout(clean ? 4200 : 2600);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('saved', `${out}/${name}.png`, await page.evaluate(() => document.documentElement.lang + ' ' + location.href));
  await ctx.close();
}
await browser.close();
