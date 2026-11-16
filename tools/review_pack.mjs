// V11.3 review pack: REAL browser screenshots of both experiences (not Blender), photo-site pages, Cycles references,
// and short interaction clips, captured from the production build at http://127.0.0.1:4173.
// Usage: node tools/review_pack.mjs [outDir]   (default REVIEW_PACK)
import { chromium } from '@playwright/test';
import { copyFileSync, mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const OUT = process.argv[2] ?? 'REVIEW_PACK';
const WEB = join(OUT, 'REAL_WEB_SCREENSHOTS'), PHOTO = join(OUT, 'PHOTO_MODE_SCREENSHOTS'), CYC = join(OUT, 'BLENDER_CYCLES_REFERENCES'), MOT = join(OUT, 'MOTION_CLIPS');
for (const d of [WEB, PHOTO, CYC, MOT]) mkdirSync(d, { recursive: true });
const BASE = 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const log = [];
const ready = (page) => page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 60000 });

async function shot(name, url, { w = 1440, h = 900, mobile = false, entered = true, wait = 2500, threeD = true, act = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (entered) await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(BASE + url);
  if (threeD) await ready(page).catch(() => errors.push('3D not ready in 60 s'));
  await page.waitForTimeout(wait);
  if (act) { await act(page); await page.waitForTimeout(2200); }
  const file = join(name.startsWith('photo_') ? PHOTO : WEB, `${name}.png`);
  await page.screenshot({ path: file });
  log.push({ name, url, viewport: `${w}x${h}${mobile ? ' mobile' : ''}`, errors });
  await ctx.close();
}

// ---- first entry (gateway) in four languages + phone
for (const l of ['ar', 'en', 'ckb', 'zh']) await shot(`gateway_${l}_1440`, `?e2e=1#/${l}`, { entered: false, threeD: false, wait: 1800 });
await shot('gateway_ar_phone', '?e2e=1#/ar', { w: 390, h: 844, mobile: true, entered: false, threeD: false, wait: 1800 });
// ---- interactive 3D
await shot('3d_tower_ar', '?e2e=1#/ar/explore');
await shot('3d_tower_golden_en', '?e2e=1#/en/explore?t=1080');
await shot('3d_tower_night_en', '?e2e=1#/en/explore?t=1290');
await shot('3d_street_view_en', '?e2e=1#/en/explore?t=1165', { act: (p) => p.evaluate(() => window.__nakhla.engine.goStreetView('street_arrival_dusk')) });
await shot('3d_floor_F04_en', '?e2e=1#/en/explore?f=F04&v=floor');
await shot('3d_unit_U04A_ar', '?e2e=1#/ar/explore?f=F04&u=U04A&v=unit');
await shot('3d_room_A_living_en', '?e2e=1#/en/tour?f=F04&u=U04A&r=A.living&v=room&m=guided');
await shot('3d_room_A_kitchen_night_en', '?e2e=1#/en/tour?f=F04&u=U04A&r=A.kitchen&v=room&m=guided&t=1290');
await shot('3d_room_B_living_en', '?e2e=1#/en/tour?f=F04&u=U04B&r=B.living&v=room&m=guided');
await shot('3d_lobby_en', '?e2e=1#/en/amenities?f=G&r=zone.lobby_hall&v=room&m=guided');
await shot('3d_pool_en', '?e2e=1#/en/amenities?f=F10&r=zone.pool&v=room&m=guided');
await shot('3d_terrace_dusk_en', '?e2e=1#/en/amenities?f=F11&r=zone.terrace&v=room&m=guided&t=1165');
await shot('3d_tower_ckb', '?e2e=1#/ckb/explore');
await shot('3d_tower_zh', '?e2e=1#/zh/explore');
await shot('3d_tower_phone_ar', '?e2e=1#/ar/explore', { w: 390, h: 844, mobile: true });
await shot('3d_tower_tablet_en', '?e2e=1#/en/explore', { w: 820, h: 1180, mobile: true });
await shot('3d_ai_panel_en', '?e2e=1#/en/explore', { act: (p) => p.getByTestId('ask').click() });
// ---- photoreal website
await shot('photo_home_ar', '?e2e=1#/ar/visual', { threeD: false });
await shot('photo_home_en', '?e2e=1#/en/visual', { threeD: false });
for (const id of ['street_arrival_dusk', 'street_entrance_night', 'exterior_golden', 'lobby_night', 'living_golden', 'B_bedroom3', 'A_master_bath', 'pool', 'terrace_dusk', 'shisha_lounge'])
  await shot(`photo_${id}_en`, `?e2e=1#/en/visual/${id}`, { threeD: false, wait: 2200 });
await shot('photo_scene_phone_ar', '?e2e=1#/ar/visual/street_arrival_dusk', { w: 390, h: 844, mobile: true, threeD: false });

// ---- Cycles references (copies of the stills the photo site uses)
for (const f of readdirSync('public/renders')) if (f.endsWith('.jpg')) copyFileSync(join('public/renders', f), join(CYC, f));

// ---- short interaction clips (Playwright video, 1280 × 720)
async function clip(name, url, steps) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: MOT, size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(BASE + url); await ready(page).catch(() => {}); await page.waitForTimeout(1500);
  await steps(page); await page.waitForTimeout(800);
  const v = page.video(); await ctx.close(); const p = await v.path(); renameSync(p, join(MOT, `${name}.webm`));
}
const st = (p, fn, ...a) => p.evaluate(([fn, a]) => window.__nakhla.store.getState()[fn](...a), [fn, a]);
await clip('tower_to_apartment_and_back', '?e2e=1&live=1#/en/explore', async (p) => { await st(p, 'selectFloor', 'F04'); await p.waitForTimeout(2600); await st(p, 'selectUnit', 'U04A'); await p.waitForTimeout(2400); await st(p, 'enterRoom', 'A.living'); await p.waitForTimeout(2800); await st(p, 'home'); await p.waitForTimeout(2600); });
await clip('street_traffic_dusk', '?e2e=1&live=1#/en/explore?t=1165', async (p) => { await p.evaluate(() => window.__nakhla.engine.goStreetView('street_arrival_dusk')); await p.waitForTimeout(7000); });
await clip('switch_3d_to_photo_and_back', '?e2e=1&live=1#/en/tour?f=F04&u=U04A&r=A.living&v=room&m=guided', async (p) => { await p.getByTestId('xp-visual').first().click(); await p.waitForTimeout(3000); await p.getByTestId('xp-3d').first().click(); await p.waitForTimeout(4500); });

writeFileSync(join(OUT, 'capture_log.json'), JSON.stringify({ capturedAt: new Date().toISOString(), tool: 'Playwright + installed Chrome (headless, GPU), production build', shots: log }, null, 1));
console.log('review pack:', log.length, 'screenshots; errors in', log.filter((x) => x.errors.length).length);
await browser.close();
