// Evidence for the in-app features (real UI, real clicks): Focus view, apartment lighting at night (auto / off),
// the assistant welcome in Arabic, and the looping Showroom film. Usage: node tools/feature_evidence.mjs [outDir]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'project_artifacts/evidence/features';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const open = async (hash, vp = { width: 1366, height: 768 }) => {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: vp.width < 700, isMobile: vp.width < 700 });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(`http://127.0.0.1:4173/?e2e=1${hash}`);
  await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 30000 });
  await page.waitForTimeout(3800);
  return { page, ctx, errors };
};
const log = {};
{ // Focus view
  const { page, ctx, errors } = await open('#/en/tour?f=F04&u=U04A&r=A.living&v=room&m=guided&t=900');
  await page.screenshot({ path: `${out}/01_room_with_interface.png` });
  await page.getByTestId('focus').click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/02_focus_view.png` });
  log.focusHidden = await page.evaluate(() => getComputedStyle(document.querySelector('.topbar')).visibility);
  await page.getByTestId('focus-exit').click(); await page.waitForTimeout(500);
  log.focusRestored = await page.evaluate(() => getComputedStyle(document.querySelector('.topbar')).visibility);
  log.focusErrors = errors; await ctx.close();
}
{ // Apartment lighting at night: auto -> off -> on
  const { page, ctx, errors } = await open('#/en/tour?f=F04&u=U04A&r=A.living&v=room&m=guided&t=1320');
  await page.screenshot({ path: `${out}/03_night_lights_auto.png` });
  await page.getByTestId('lights').click(); await page.waitForTimeout(300); await page.getByTestId('lights').click(); await page.waitForTimeout(900);   // auto -> on -> off
  log.lightsState = await page.evaluate(() => window.__nakhla.store.getState().lights);
  await page.screenshot({ path: `${out}/04_night_lights_off.png` });
  await page.getByTestId('lights').click(); await page.waitForTimeout(300); await page.getByTestId('lights').click(); await page.waitForTimeout(900);   // off -> auto -> on
  await page.screenshot({ path: `${out}/05_night_lights_on.png` });
  log.lightsErrors = errors; await ctx.close();
}
{ // Assistant welcome, Arabic (RTL)
  const { page, ctx, errors } = await open('#/ar/explore');
  await page.getByTestId('ask').click().catch(async () => { await page.locator('[data-testid=ask], button:has-text("نخلة")').first().click(); });
  await page.waitForTimeout(700);
  log.welcome = await page.getByTestId('ai-welcome').innerText().catch(() => null);
  await page.screenshot({ path: `${out}/06_assistant_welcome_ar.png` });
  log.aiErrors = errors; await ctx.close();
}
{ // Showroom film: start from the menu, watch it advance, leave with Escape, state restored
  const { page, ctx, errors } = await open('#/en/explore');
  await page.getByTestId('menu').click(); await page.getByTestId('menu-showcase').click();
  await page.waitForTimeout(5000); await page.screenshot({ path: `${out}/07_showcase_shot_1.png` });
  const c0 = await page.evaluate(() => window.__nakhla.store.getState().cine.chapter);
  await page.waitForTimeout(13000); await page.screenshot({ path: `${out}/08_showcase_shot_2.png` });
  const c1 = await page.evaluate(() => window.__nakhla.store.getState().cine.chapter);
  await page.evaluate(() => window.__nakhla.store.getState().setCine({ chapter: 14 })); await page.waitForTimeout(13000);
  const c2 = await page.evaluate(() => window.__nakhla.store.getState().cine.chapter);          // must have wrapped to the start
  await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
  const st = await page.evaluate(() => { const s = window.__nakhla.store.getState(); return { showcase: s.showcase, focus: s.focus, cine: s.cine.active, view: s.view }; });
  log.showcase = { chapterAt5s: c0, chapterAt18s: c1, afterLastShot: c2, afterEscape: st, errors };
  await page.screenshot({ path: `${out}/09_after_showcase_exit.png` }); await ctx.close();
}
{ // Focus view on a phone, Arabic
  const { page, ctx, errors } = await open('#/ar/tour?f=F04&u=U04A&r=A.living&v=room&m=guided&t=1080', { width: 390, height: 844 });
  await page.screenshot({ path: `${out}/10_phone_room_ar.png` });
  await page.getByTestId('menu').click(); await page.getByTestId('menu-focus').click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/11_phone_focus_ar.png` });
  log.phoneErrors = errors; await ctx.close();
}
console.log(JSON.stringify(log, null, 1));
await browser.close();
