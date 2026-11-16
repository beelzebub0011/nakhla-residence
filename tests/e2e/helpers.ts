import { expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

export const EVIDENCE = 'project_artifacts/evidence';
mkdirSync(EVIDENCE, { recursive: true });

export interface OpenOpts { landing?: boolean; query?: string }

/** Open the production build; `?e2e=1` exposes read-only test hooks (engine + store). */
export async function open(page: Page, hash = '#/ar/explore', opts: OpenOpts = {}) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  if (!opts.landing) await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch { /* ignore */ } });
  await page.goto(`/?e2e=1${opts.query ?? ''}${hash}`);
  return errors;
}
export async function ready(page: Page) {
  await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 30_000 });
  await settle(page, 400);
}
/** Wait until the MotionDirector is idle and the floor lift has finished. */
export async function settle(page: Page, minMs = 150) {
  await page.evaluate(async (min) => {
    const { engine } = (window as any).__nakhla; const t0 = performance.now();
    await new Promise<void>((res) => { const tick = () => { const e = engine.director.value('explode'); const el = performance.now() - t0; const want = (window as any).__nakhla.store.getState(); const open = want.view === 'tower' ? null : want.floorId; if ((!engine.director.busy && (e < 0.001 || e > 0.999) && engine.exploded === open && el >= min) || el > 9000) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  }, minMs);
}
export const state = (page: Page) => page.evaluate(() => {
  const s = (window as any).__nakhla.store.getState();
  return { locale: s.locale, section: s.section, view: s.view, floorId: s.floorId, unitId: s.unitId, roomKey: s.roomKey, mode: s.mode, packageId: s.packageId, overrides: s.overrides, env: s.env, muted: s.audio.muted, overlay: s.overlay, webgl: s.webgl, motionPref: s.motionPref, lite: s.lite, phase: s.motionPhase, tier: s.tier, landing: s.landing, selectedSurfaceId: s.selectedSurfaceId };
});
export const act = (page: Page, fn: string, ...args: unknown[]) => page.evaluate(([f, a]) => { const s = (window as any).__nakhla.store.getState(); return s[f as string](...(a as unknown[])); }, [fn, args] as const);
export const perf = (page: Page) => page.evaluate(() => (window as any).__nakhla.engine.perf());

/** Client coordinates of a world point, through the live camera (includes the view offset). */
export async function project(page: Page, x: number, y: number, z: number): Promise<{ x: number; y: number }> {
  return page.evaluate(([wx, wy, wz]) => {
    const { engine } = (window as any).__nakhla; const v = engine.camera.position.clone().set(wx, wy, wz).project(engine.camera);
    const r = engine.canvas.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  }, [x, y, z]);
}
/** Mean colour of a region of the WebGL canvas, read back from the GPU frame. */
export async function meanColor(page: Page, fx0: number, fy0: number, fx1: number, fy1: number): Promise<[number, number, number]> {
  return page.evaluate(async ([a, b, c, d]) => {
    const { engine } = (window as any).__nakhla; const url = engine.capture('image/png');
    const img = new Image(); await new Promise((r) => { img.onload = r; img.src = url; });
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d')!; g.drawImage(img, 0, 0);
    const x = Math.floor(a * img.width), y = Math.floor(b * img.height), w = Math.max(1, Math.floor((c - a) * img.width)), h = Math.max(1, Math.floor((d - b) * img.height));
    const px = g.getImageData(x, y, w, h).data; let R = 0, G = 0, B = 0; const n = px.length / 4;
    for (let i = 0; i < px.length; i += 4) { R += px[i]; G += px[i + 1]; B += px[i + 2]; }
    return [R / n, G / n, B / n] as [number, number, number];
  }, [fx0, fy0, fx1, fy1]);
}
export const colorDist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function saveEvidence(name: string, data: unknown) {
  writeFileSync(`${EVIDENCE}/${name}`, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
}
export async function gpuInfo(page: Page) {
  return page.evaluate(() => {
    const gl = (window as any).__nakhla.engine.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), ua: navigator.userAgent, dpr: devicePixelRatio, viewport: `${innerWidth}x${innerHeight}` };
  });
}
export function expectNoErrors(errors: string[]) { expect(errors, errors.join('\n')).toEqual([]); }
