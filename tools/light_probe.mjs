// Diagnostic: which light source tints a region of the live frame? Switches each source off in turn and prints the
// mean colour of a screen region (default: the sofa in the living-room view). Usage: node tools/light_probe.mjs
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
await page.goto('http://127.0.0.1:4173/?e2e=1#/en/tour?f=F04&u=U04A&r=A.living&v=room&m=guided&t=900');
await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 30000 });
await page.waitForTimeout(4500);
await page.addStyleTag({ content: 'body *:not(canvas):not(:has(canvas)) { visibility: hidden !important; }' });
const [rx, ry] = (process.argv[2] ?? '560,480').split(',').map(Number); const region = { x: rx, y: ry, width: 90, height: 40 }; // default: sofa seat cushions
const mean = async () => {
  const buf = await page.screenshot({ clip: region });
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4; return [Math.round(r / n), Math.round(gg / n), Math.round(b / n)];
  }, buf.toString('base64'));
};
const info = await page.evaluate(() => {
  const e = window.__nakhla.engine; const out = { hemi: e.env.hemi.intensity, hemiC: e.env.hemi.color.getHexString(), envI: e.scene.environmentIntensity, sun: e.env.sun.intensity, exposure: e.renderer.toneMappingExposure,
    sky: e.lib.lmUniforms.uLmSky.value.toArray().map((v) => +v.toFixed(2)), sunB: e.lib.lmUniforms.uLmSun.value.toArray().map((v) => +v.toFixed(2)), lamp: e.lib.lmUniforms.uLmLamp.value.toArray().map((v) => +v.toFixed(2)),
    floorTex: (() => { const t = e.lib.ambUniforms.uNkFloor.value; return t.image ? [t.image.width, t.image.height] : null; })(), sofa: [] };
  e.scene.traverse((o) => { if (o.isMesh && o.userData.slot === 'fabric_sand') out.sofa.push({ mat: o.material.name, color: o.material.color.toArray().map((v) => +v.toFixed(2)), amb: !!o.userData.amb, map: o.material.map?.image?.width }); });
  return out;
});
console.log(JSON.stringify(info));
console.log('baseline', await mean());
const tests = {
  'hemi off': () => { const e = window.__nakhla.engine; e.env.hemi.visible = false; e.invalidate(); },
  'env off': () => { const e = window.__nakhla.engine; e.env.hemi.visible = true; e.__env = e.scene.environment; e.scene.environment = null; e.invalidate(); },
  'sun off': () => { const e = window.__nakhla.engine; e.scene.environment = e.__env; e.env.sun.visible = false; e.invalidate(); },
  'fill off': () => { const e = window.__nakhla.engine; e.env.sun.visible = true; e.scene.traverse((o) => { if (o.isPointLight) o.visible = false; }); e.invalidate(); },
};
for (const [name, fn] of Object.entries(tests)) { await page.evaluate(fn); await page.waitForTimeout(500); console.log(name, await mean()); }
await browser.close();
