// V11.4: real photo-website screenshots of chosen scenes (for the private Form Architects four-way boards).
// Usage: node tools/fa_capture.mjs <outDir> <sceneId,sceneId,...>
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const [OUT, ids] = [process.argv[2], (process.argv[3] ?? '').split(',').filter(Boolean)]; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const id of ids) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); const page = await ctx.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(`http://127.0.0.1:4173/?e2e=1#/en/visual/${id}`); await page.waitForSelector('[data-testid="visual-scene"]'); await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, `photo_${id}.png`) }); await ctx.close(); console.log('saved', id);
}
await browser.close();
