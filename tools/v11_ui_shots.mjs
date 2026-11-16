// V11.2 evidence: gateway + photoreal website screenshots (no WebGL needed). Usage: node tools/v11_ui_shots.mjs [outDir]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'project_artifacts/evidence/v11_ui'; mkdirSync(out, { recursive: true });
const shots = [
  ['gateway_en_1440', '#/en/explore', 1440, 900, true], ['gateway_ar_1440', '#/ar/explore', 1440, 900, true], ['gateway_ar_390', '#/ar/explore', 390, 844, true], ['gateway_zh_820', '#/zh/explore', 820, 1180, true],
  ['visual_scene_en_1440', '#/en/visual/street_arrival_dusk', 1440, 900, false], ['visual_scene_ar_1440', '#/ar/visual/living_evening', 1440, 900, false],
  ['visual_home_en_1440', '#/en/visual/home', 1440, 900, false], ['visual_scene_ar_390', '#/ar/visual/kitchen', 390, 844, false], ['visual_home_ckb_390', '#/ckb/visual/home', 390, 844, false],
];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [name, hash, w, h, landing] of shots) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  if (!landing) await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(`http://127.0.0.1:4173/?e2e=1${hash}`);
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.fonts?.ready);
  await page.screenshot({ path: `${out}/${name}.png` }); console.log('saved', name);
  if (name === 'visual_home_en_1440') { await page.mouse.wheel(0, 1700); await page.waitForTimeout(900); await page.screenshot({ path: `${out}/visual_home_en_1440_scrolled.png` }); }
  await page.context().close();
}
await browser.close();
