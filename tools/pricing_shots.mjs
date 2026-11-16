// V11.4 demo-pricing evidence: REAL browser screenshots of the pricing UI in both experiences (production build at
// http://127.0.0.1:4173). Usage: node tools/pricing_shots.mjs [outDir]   (default REVIEW_PACK/REAL_WEB_SCREENSHOTS)
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const OUT = process.argv[2] ?? 'REVIEW_PACK/REAL_WEB_SCREENSHOTS'; mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:4173/?e2e=1';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ready = (page) => page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 60000 });
const log = [];
async function shot(name, hash, { w = 1440, h = 900, mobile = false, threeD = true, act = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(BASE + hash);
  if (threeD) await ready(page).catch(() => errors.push('3D not ready in 60 s'));
  await page.waitForTimeout(2500);
  if (act) { await act(page); await page.waitForTimeout(2200); }
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  log.push({ name, hash, viewport: `${w}x${h}${mobile ? ' mobile' : ''}`, errors }); await ctx.close();
}
const pick = (id) => async (p) => { await p.getByTestId(`price-row-${id}`).click(); await p.waitForTimeout(400); await p.getByTestId('price-detail').scrollIntoViewIfNeeded(); };
await shot('pricing_3d_en_list', '#/en/explore?pr=1');
await shot('pricing_3d_en_unit07B', '#/en/explore?f=F07&u=U07B&v=unit&pr=1', { act: pick('U07B') });
await shot('pricing_3d_ar_unit_panel', '#/ar/explore?f=F07&u=U07B&v=unit');
await shot('pricing_photo_ar_scene_chip', '#/ar/visual/B_living', { threeD: false });
await shot('pricing_photo_ar_sheet', '#/ar/visual/B_living?pr=U05B', { threeD: false, act: async (p) => { await p.getByTestId('price-detail').scrollIntoViewIfNeeded(); } });
await shot('pricing_photo_en_home', '#/en/visual/home', { threeD: false, act: async (p) => { await p.getByTestId('vs-pricing-open').scrollIntoViewIfNeeded(); } });
await shot('pricing_photo_ckb_sheet', '#/ckb/visual/home?pr=1', { threeD: false });
await shot('pricing_photo_zh_sheet', '#/zh/visual/home?pr=U09B', { threeD: false, act: async (p) => { await p.getByTestId('price-detail').scrollIntoViewIfNeeded(); } });
await shot('pricing_phone_ar_3d', '#/ar/explore?f=F04&u=U04A&v=unit&pr=1', { w: 390, h: 844, mobile: true });
await shot('pricing_phone_en_photo', '#/en/visual/A_hall?pr=U04A', { w: 390, h: 844, mobile: true, threeD: false });
writeFileSync(join(OUT, 'pricing_capture_log.json'), JSON.stringify({ captured: new Date().toISOString(), build: 'vite preview 127.0.0.1:4173', shots: log }, null, 2));
await browser.close();
console.log(log.map((l) => `${l.name}: ${l.errors.length ? l.errors.join('; ') : 'ok'}`).join('\n'));
