// Diagnostic: does a deep link's language win on a FRESH profile? Usage: node tools/locale_probe.mjs
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const hash of ['#/en/explore', '#/en/explore?f=F04&v=floor', '#/zh/explore', '#/ckb/tour?f=F04&u=U04A&r=A.living&v=room&m=guided']) {
  for (const entered of [true, false]) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    if (entered) await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
    await page.goto(`http://127.0.0.1:4173/${process.argv[2] ?? ''}${hash}`); await page.waitForTimeout(2500);
    console.log(hash.padEnd(52), entered ? 'entered ' : 'landing ', await page.evaluate(() => `${document.documentElement.lang} -> ${location.hash}`));
    await ctx.close();
  }
}
await browser.close();
