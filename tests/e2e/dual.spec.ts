import { expect, test, type Page } from '@playwright/test';
import { expectNoErrors, open, ready, saveEvidence } from './helpers';

// V11.2 §30 — dual experience: gateway, Experience B (photoreal website), context-preserving switch.

const st = (page: Page) => page.evaluate(() => {
  const s = (window as any).__nakhlaStore.getState();
  return { experience: s.experience, sceneId: s.sceneId, landing: s.landing, floorId: s.floorId, unitId: s.unitId, roomKey: s.roomKey, view: s.view, section: s.section, locale: s.locale, muted: s.audio.muted, notice: s.sceneNotice, time: s.env.timeMinutes };
});

test('UX-ENTRY-01/03: cold gateway paints two equal choices before any 3D, keyboard reachable, sound off', async ({ page }) => {
  const errors = await open(page, '#/en/explore', { landing: true });
  const t0 = Date.now();
  await expect(page.getByTestId('gateway')).toBeVisible();
  const paintMs = Date.now() - t0;
  await expect(page.getByTestId('enter')).toBeVisible(); await expect(page.getByTestId('enter-visual')).toBeVisible();
  // the two cards have the same size (equal choices, not a primary + a fallback)
  const [a, b] = await Promise.all([page.getByTestId('enter').boundingBox(), page.getByTestId('enter-visual').boundingBox()]);
  expect(Math.abs(a!.width - b!.width)).toBeLessThan(2); expect(Math.abs(a!.height - b!.height)).toBeLessThan(2);
  // neither card is pre-selected; both are reached in order with Tab
  let reached = ''; for (let i = 0; i < 8 && !reached.includes('enter-visual'); i++) { await page.keyboard.press('Tab'); reached += `${await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '')},`; }
  expect(reached).toMatch(/enter,.*enter-visual/);
  expect(await page.evaluate(() => (window as any).__nakhla?.audio?.state?.() ?? 'none')).not.toBe('running');
  expect(await page.locator('canvas').count()).toBe(0);           // the 3D engine has not started under the gateway yet
  saveEvidence('dual-gateway.json', { paintMs, note: 'Playwright wall-clock from navigation to gateway visible (one desktop, local server)' });
  expectNoErrors(errors);
});

test('UX-VISUAL-01: photo choice opens the photoreal website without starting WebGL', async ({ page }) => {
  const errors = await open(page, '#/en/explore', { landing: true });
  await page.getByTestId('enter-visual').click();
  await expect(page.getByTestId('visual-scene')).toBeVisible();
  expect((await st(page)).sceneId).toBe('street_arrival_dusk');
  expect(await page.locator('canvas').count()).toBe(0);
  await expect(page).toHaveURL(/#\/en\/visual\/street_arrival_dusk$/);
  // navigate: next view, variants, overview page, chapter
  await page.getByRole('button', { name: 'Next view' }).click(); expect((await st(page)).sceneId).toBe('street_arrival');
  await page.getByRole('button', { name: 'Overview', exact: true }).click(); await expect(page.getByTestId('visual-home')).toBeVisible();
  await page.getByRole('button', { name: 'Model Two', exact: true }).first().click(); expect((await st(page)).sceneId).toBe('B_living');
  await expect(page.locator('.vs-render-note')).toContainText('not a photograph');
  expectNoErrors(errors);
});

test('UX-SWITCH-01/02: photo → 3D → photo keeps the same room, time and language', async ({ page }) => {
  const errors = await open(page, '#/ar/visual/kitchen');
  await expect(page.getByTestId('visual-scene')).toHaveAttribute('data-scene', 'kitchen');
  await page.getByTestId('xp-3d').click(); await ready(page);
  let s = await st(page);
  expect(s).toMatchObject({ experience: '3d', floorId: 'F04', unitId: 'U04A', roomKey: 'A.kitchen', view: 'room', locale: 'ar', time: 900, muted: true });
  await page.getByTestId('xp-visual').click();
  await expect(page.getByTestId('visual-scene')).toHaveAttribute('data-scene', 'kitchen');
  s = await st(page); expect(s.locale).toBe('ar'); expect(s.notice).toBeNull();
  expect(await page.locator('canvas').count()).toBe(0);           // WebGL released when leaving 3D
  expectNoErrors(errors);
});

test('UX-SWITCH-01: 3D in my own Type B apartment ↔ photo keeps my apartment (same plan, honest note)', async ({ page }) => {
  const errors = await open(page, '#/en/tour?f=F07&u=U07B&r=B.master&v=room&m=guided'); await ready(page);
  await page.getByTestId('xp-visual').click();
  await expect(page.getByTestId('visual-scene')).toHaveAttribute('data-scene', 'B_master');
  await page.getByTestId('xp-3d').click(); await ready(page);
  const s = await st(page);
  expect(s).toMatchObject({ unitId: 'U07B', floorId: 'F07', roomKey: 'B.master', notice: 'same_type_other_floor' });
  await expect(page.locator('.xp-notice')).toBeVisible();
  expectNoErrors(errors);
});

test('UX-SWITCH-03: a room without a rendered view maps to its honest parent with a notice', async ({ page }) => {
  const errors = await open(page, '#/en/tour?f=F04&u=U04A&r=A.laundry&v=room&m=guided'); await ready(page);
  await page.getByTestId('xp-visual').click();
  const s = await st(page);
  expect(s.sceneId?.startsWith('living')).toBe(true); expect(s.notice).toBe('room_not_rendered');
  await expect(page.locator('.vs-notice')).toContainText('no rendered view');
  expectNoErrors(errors);
});

test('UX-SWITCH-04/06: rapid back-and-forth switching leaves one canvas, no errors; cold vs warm switch timed', async ({ page }) => {
  const errors = await open(page, '#/en/tour?f=F04&u=U04A&r=A.living&v=room&m=guided'); await ready(page);
  const times: { dir: string; ms: number }[] = [];
  for (let i = 0; i < 3; i++) {
    let t = Date.now(); await page.getByTestId('xp-visual').click(); await expect(page.getByTestId('visual-scene')).toBeVisible(); times.push({ dir: 'to-photo', ms: Date.now() - t });
    t = Date.now(); await page.getByTestId('xp-3d').click(); await ready(page); times.push({ dir: 'to-3d (engine ready)', ms: Date.now() - t });
  }
  // fast clicks without waiting
  for (let i = 0; i < 6; i++) await page.getByTestId(i % 2 ? 'xp-3d' : 'xp-visual').click({ timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  expect(await page.locator('canvas').count()).toBeLessThanOrEqual(1);
  const s = await st(page); expect(['3d', 'visual']).toContain(s.experience);
  saveEvidence('dual-switch-times.json', { times, note: 'wall-clock incl. Playwright overhead; to-3d includes a full engine start (the 3D context is released while the photo site is open)' });
  expectNoErrors(errors);
});

test('UX-SWITCH-09: deep links, Back and refresh land in the right experience and scene', async ({ page }) => {
  const errors = await open(page, '#/en/visual/pool');
  await expect(page.getByTestId('visual-scene')).toHaveAttribute('data-scene', 'pool');
  await page.getByRole('button', { name: 'Next view' }).click(); await expect(page.getByTestId('visual-scene')).toHaveAttribute('data-scene', 'gym');
  await page.goBack(); await expect(page.getByTestId('visual-scene')).toHaveAttribute('data-scene', 'pool');
  await page.reload(); await expect(page.getByTestId('visual-scene')).toHaveAttribute('data-scene', 'pool');
  await page.goto('/?e2e=1#/en/visual/not_a_scene'); await expect(page.getByTestId('visual-home')).toBeVisible();
  expectNoErrors(errors);
});
