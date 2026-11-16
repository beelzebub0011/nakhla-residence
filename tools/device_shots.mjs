// V12: device simulation for the mobile / tablet UX pass (iPhone 15, Pixel 7, iPad Air portrait + landscape).
// Usage: node tools/device_shots.mjs <outDir> [base=http://127.0.0.1:4173/] [devices=iphone,pixel,ipadP,ipadL] [screens=...]
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'project_artifacts/device_qa'; const base = process.argv[3] ?? 'http://127.0.0.1:4173/';
const wantD = (process.argv[4] ?? '').split(',').filter(Boolean); const wantS = (process.argv[5] ?? '').split(',').filter(Boolean);
mkdirSync(out, { recursive: true });
const DEV = {
  iphone: { ...devices['iPhone 15'], defaultBrowserType: undefined },
  pixel: { ...devices['Pixel 7'], defaultBrowserType: undefined },
  ipadP: { ...devices['iPad (gen 7)'], viewport: { width: 820, height: 1180 }, defaultBrowserType: undefined },
  ipadL: { ...devices['iPad (gen 7) landscape'], viewport: { width: 1180, height: 820 }, defaultBrowserType: undefined },
};
const SCREENS = [
  ['gateway', '#/ar', false], ['tower', '#/ar/explore', true], ['floor', '#/ar/explore?f=F04&v=floor', true], ['unit', '#/ar/explore?f=F04&u=U04A&v=unit', true],
  ['room', '#/ar/tour?f=F04&u=U04A&r=A.living&v=room&m=guided', true], ['photos', '#/ar/visual', true], ['viewer', '#/ar/visual/living_golden', true],
  ['plans', '#/ar/plans?f=F04', true], ['plansRoom', '#/ar/plans?f=F04&u=U04A&r=A.living', true], ['menu', '#/ar/explore', true],
];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [dn, d] of Object.entries(DEV)) {
  if (wantD.length && !wantD.includes(dn)) continue;
  for (const [sn, hash, entered] of SCREENS) {
    if (wantS.length && !wantS.includes(sn)) continue;
    const ctx = await browser.newContext({ ...d }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    if (entered) await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
    await page.goto(base + '?e2e=1' + hash);
    await page.waitForTimeout(sn === 'gateway' ? 2500 : 7000);
    if (sn === 'menu') { const b = page.locator('[data-testid="menu-btn"], button[aria-label*="Menu"], button[aria-label*="القائمة"]').first(); if (await b.count()) { await b.click(); await page.waitForTimeout(800); } }
    // overflow check: anything wider than the viewport
    const over = await page.evaluate(() => { const w = innerWidth; return [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('svg'); }).slice(0, 5).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`); });
    const small = await page.evaluate(() => [...document.querySelectorAll('button, a, [role=button]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 36 || r.height < 36) && getComputedStyle(e).visibility !== 'hidden'; }).length);
    await page.screenshot({ path: `${out}/${dn}_${sn}.png` });
    console.log(`${dn} ${sn}: errors ${errs.length}${errs.length ? ' ' + errs[0].slice(0, 120) : ''} | overflow ${over.join(' ') || '-'} | small targets ${small}`);
    await ctx.close();
  }
}
await browser.close();
