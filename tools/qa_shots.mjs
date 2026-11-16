// V11.5: QA captures of specific live-site states (hash list), 1600 × 900 with the UI visible.
// Usage: node tools/qa_shots.mjs <outDir> name=hash [name=hash ...]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const shots = process.argv.slice(3).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [name, hash] of shots) {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(`http://127.0.0.1:4173/?e2e=1${hash}`);
  try { await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true' || !!document.querySelector('.vs'), null, { timeout: 40000 }); } catch {}
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${out}/${name}.png` }); console.log('saved', name);
  await page.context().close();
}
await browser.close();
