// Live-website frames from EXACTLY the Cycles cameras (blender/scene_prims.json): exterior orbit cameras are set on the
// MotionDirector (same target, azimuth, polar angle, distance, 32° FOV, same hour); room cameras use the same guided view.
// UI hidden, 1600 × 900. Usage: node tools/parity_shots.mjs <outDir> [id,id,...]
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
const out = process.argv[2] ?? 'project_artifacts/parity/web';
const only = (process.argv[3] ?? '').split(',').filter(Boolean);
const extra = process.argv[4] ?? "";   // V11.4: extra query string appended after e2e=1 (e.g. &lite=1)
mkdirSync(out, { recursive: true });
const scene = JSON.parse(readFileSync('blender/scene_prims.json', 'utf8'));
const ROOM = { living: ['F04', 'U04A', 'A.living'], living_golden: ['F04', 'U04A', 'A.living'], living_evening: ['F04', 'U04A', 'A.living'], living_night: ['F04', 'U04A', 'A.living'], kitchen: ['F04', 'U04A', 'A.kitchen'], master: ['F04', 'U04A', 'A.master'], bathroom: ['F04', 'U04A', 'A.bathroom'], balcony: ['F04', 'U04A', 'A.balcony'], B_living: ['F04', 'U04B', 'B.living'], lobby: ['G', null, 'zone.lobby_hall'], spa: ['F10', null, 'zone.spa'], pool: ['F10', null, 'zone.pool'], gym: ['F10', null, 'zone.gym'], restaurant: ['F11', null, 'zone.restaurant'], cafe: ['F11', null, 'zone.cafe'], terrace: ['F11', null, 'zone.terrace'] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const cam of [...scene.cameras, ...(scene.crownPreviewCameras ?? [])]) {
  if (only.length && !only.includes(cam.id)) continue;
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  let hash;
  if (cam.floor === null) hash = `#/en/explore?t=${cam.time}`;
  else { const [f, u, r] = ROOM[cam.id]; hash = `#/en/${u ? 'tour' : 'amenities'}?f=${f}${u ? `&u=${u}` : ''}&r=${r}&v=room&m=guided&t=${cam.time}`; }
  await page.goto(`http://127.0.0.1:4173/?e2e=1${extra}${hash}`);
  await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 30000 });
  await page.waitForTimeout(3500);
  if (cam.floor === null) {
    // Blender camera: pos (X east, Y north, Z up) looking at `look` → orbit around that target (three: x = X, y = Z, z = -Y)
    const [x, y, z] = cam.pos, [lx, ly, lz] = cam.look; const dx = x - lx, dy = z - lz, dz = -(y - ly); const dist = Math.hypot(dx, dy, dz);
    const pol = Math.acos(dy / dist), az = Math.atan2(dx, dz);
    await page.evaluate(({ az, pol, dist, t, fov, shiftY }) => {
      const e = window.__nakhla.engine; const d = e.director;
      d.limits = { minDist: 1, maxDist: 400, minPol: 0.2, maxPol: Math.PI / 2 };
      d.orbit.az = az; d.orbit.pol = pol; d.orbit.dist = dist; d.orbit.target.set(t[0], t[1], t[2]); d.orbit.fov = fov; d.goalDist = dist; d.velAz = 0; d.velPol = 0;
      // no side-panel offset; lens shift like Blender (shift in units of the image width, landscape)
      e.updateViewOffset = () => { e.camera.clearViewOffset(); e.camera.updateProjectionMatrix(); };
      const upd = e.camera.updateProjectionMatrix.bind(e.camera);
      e.camera.updateProjectionMatrix = () => { upd(); if (shiftY) { e.camera.projectionMatrix.elements[9] += 2 * shiftY; e.camera.projectionMatrixInverse.copy(e.camera.projectionMatrix).invert(); } };
      d.writeCamera(); e.updateViewOffset(); e.invalidate();
    }, { az, pol, dist, t: [lx, lz, -ly], fov: cam.fovDeg, shiftY: cam.shiftY ?? 0 });
    await page.waitForTimeout(2500);
  }
  await page.addStyleTag({ content: 'body *:not(canvas):not(:has(canvas)) { visibility: hidden !important; }' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${cam.id}.png` }); console.log('saved', cam.id);
  await page.context().close();
}
await browser.close();
