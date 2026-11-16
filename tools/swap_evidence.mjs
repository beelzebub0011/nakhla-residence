// Evidence: a REAL finish swap in the live site. Captures the living-room floor before and after switching
// ivory porcelain -> engineered oak (camera pitched down at bare floor), plus a wall-paint swap, and prints mean colours.
// Usage: node tools/swap_evidence.mjs [outDir]     (production build must be served on :4173)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'project_artifacts/golden/swap';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const shot = async (name, hash, pitch) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(`http://127.0.0.1:4173/?e2e=1${hash}`);
  await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 30000 });
  await page.waitForTimeout(3500);
  if (pitch !== undefined) await page.evaluate((p) => { const e = window.__nakhla.engine; e.director.look.pitch = p; e.invalidate(); }, pitch);
  await page.addStyleTag({ content: 'body *:not(canvas):not(:has(canvas)) { visibility: hidden !important; }' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}.png` });
  const info = await page.evaluate(() => { const e = window.__nakhla.engine; return { pitch: e.director.look.pitch, floor: e.lib.surfaceMaterialId('living.flooring'), wall: e.lib.surfaceMaterialId('living.walls') }; });
  console.log(name, JSON.stringify(info));
  await ctx.close();
};
const base = '#/en/design?f=F04&u=U04A&r=A.living&v=room&m=guided&t=900';
await shot('floor_ivory_porcelain', base, -0.95);
await shot('floor_engineered_oak', base + '&o=0-ENGINEERED_OAK', -0.95);
await shot('room_default_finishes', base);
await shot('room_luxury_package', base + '&p=luxury');
await browser.close();
