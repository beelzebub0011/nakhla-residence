// V11.5: screenshots of the photoreal website (overview sections + viewer + drawer) for design review.
// Usage: node tools/visual_shots.mjs <outDir> [locale]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'project_artifacts/visual_qa'; const loc = process.argv[3] ?? 'en';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(`http://127.0.0.1:4173/?e2e=1#/${loc}/visual`);
  await page.waitForSelector('[data-testid="visual-home"]', { timeout: 30000 }); await page.waitForTimeout(2500);
  const secs = await page.$$eval('.vs-scroll > section, .vs-scroll > footer', (els) => els.map((e) => e.offsetTop));
  for (let i = 0; i < secs.length; i++) {
    await page.$eval('.vs-scroll', (el, y) => { el.style.scrollBehavior = 'auto'; el.scrollTop = y; }, secs[i]); await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${tag}_home_${i}.png` });
  }
  await page.goto(`http://127.0.0.1:4173/?e2e=1#/${loc}/visual/living_golden`); await page.waitForSelector('[data-testid="visual-scene"]'); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${tag}_viewer.png` });
  const all = page.getByRole('button', { name: /All views|كل المشاهد/ }); if (await all.count()) { await all.first().click(); await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/${tag}_drawer.png` }); await page.keyboard.press('Escape'); }
  await page.mouse.click(w * 0.62, h * 0.4); await page.waitForTimeout(1000); await page.screenshot({ path: `${out}/${tag}_zoom.png` });
  await page.context().close(); console.log('done', tag);
}
await browser.close();
