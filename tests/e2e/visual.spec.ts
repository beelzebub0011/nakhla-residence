import { expect, test } from '@playwright/test';
import { act, open, ready, settle } from './helpers';

// V7 GATE 6 — golden screenshots with a deterministic camera, locale, timezone and environment.
// First run records the baselines (tests/e2e/__screenshots__); later runs diff against them.

const shots: { name: string; hash: string; w: number; h: number; before?: (page: import('@playwright/test').Page) => Promise<void> }[] = [
  { name: 'tower-ar-desktop', hash: '#/ar/explore', w: 1366, h: 768 },
  { name: 'floor04-en-desktop', hash: '#/en/explore?f=F04&v=floor', w: 1366, h: 768 },
  { name: 'unit04a-ckb-desktop', hash: '#/ckb/explore?f=F04&u=U04A&v=unit', w: 1366, h: 768 },
  { name: 'living-zh-desktop', hash: '#/zh/tour?f=F04&u=U04A&r=A.living&v=room&m=guided', w: 1366, h: 768 },
  { name: 'kitchen-walnut-en-desktop', hash: '#/en/design?f=F04&u=U04A&r=A.kitchen&v=room&m=guided&p=premium', w: 1366, h: 768 },
  { name: 'master-luxury-ar-desktop', hash: '#/ar/design?f=F04&u=U04A&r=A.master&v=room&m=guided&p=luxury', w: 1366, h: 768 },
  { name: 'bathroom-marble-en-desktop', hash: '#/en/design?f=F04&u=U04A&r=A.bathroom&v=room&m=guided&p=luxury', w: 1366, h: 768 },
  { name: 'pool-f10-en-desktop', hash: '#/en/amenities?f=F10&r=zone.pool&v=room&m=guided', w: 1366, h: 768 },
  { name: 'gym-f10-ar-desktop', hash: '#/ar/amenities?f=F10&r=zone.gym&v=room&m=guided', w: 1366, h: 768 },
  { name: 'restaurant-f11-golden-en', hash: '#/en/amenities?f=F11&r=zone.restaurant&v=room&m=guided&t=1050', w: 1366, h: 768 },
  { name: 'terrace-f11-floor-zh', hash: '#/zh/amenities?f=F11&v=floor', w: 1366, h: 768 },
  { name: 'tower-night-en', hash: '#/en/explore?t=1260', w: 1366, h: 768 },
  { name: 'tower-dust-autumn-ar', hash: '#/ar/explore?w=dust&s=autumn', w: 1366, h: 768 },
  { name: 'tower-rain-winter-ckb', hash: '#/ckb/explore?w=overcast&s=winter&t=600', w: 1366, h: 768 },
  { name: 'tower-ar-phone', hash: '#/ar/explore', w: 390, h: 844 },
  { name: 'unit-en-phone', hash: '#/en/explore?f=F04&u=U04A&v=unit', w: 390, h: 844 },
  { name: 'living-ar-tablet', hash: '#/ar/tour?f=F04&u=U04A&r=A.living&v=room&m=guided', w: 820, h: 1180 },
  { name: 'assistant-ckb-phone', hash: '#/ckb/explore?f=F04&u=U04A&v=unit', w: 390, h: 844, before: async (p) => { await p.getByTestId('ask').click(); await p.getByTestId('ai-chip').first().click(); await p.waitForTimeout(300); } },
  { name: 'summary-en-desktop', hash: '#/en/design?f=F04&u=U04A&r=A.living&v=room&m=guided&p=premium&o=0-ENGINEERED_OAK', w: 1366, h: 768, before: async (p) => { await p.getByTestId('open-summary').click(); await p.waitForTimeout(350); } },
  { name: 'environment-sheet-ar', hash: '#/ar/explore?t=1050', w: 1366, h: 768, before: async (p) => { await p.getByTestId('env').click(); await p.waitForTimeout(350); } },
];

for (const s of shots) {
  test(`visual: ${s.name}`, async ({ page }) => {
    await page.setViewportSize({ width: s.w, height: s.h });
    await open(page, s.hash); await ready(page); await settle(page, 900);
    if (s.before) await s.before(page);
    await page.evaluate(() => (window as any).__nakhla.engine.invalidate()); await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot(`${s.name}.png`, { maxDiffPixelRatio: 0.035 });
  });
}

test('visual: 2D Lite plan (no WebGL)', async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch { /* ignore */ } });
  await page.goto('/?lite=1&e2e=1#/ar/explore?f=F04&u=U04A&v=unit');
  await expect(page.getByTestId('lite-plan')).toBeVisible({ timeout: 20_000 }); await page.waitForTimeout(600);
  await expect(page).toHaveScreenshot('lite-plan-ar.png', { maxDiffPixelRatio: 0.02 });
});

test('visual: landing screen in four languages', async ({ page }) => {
  await open(page, '#/ar/explore', { landing: true });
  await expect(page.getByTestId('enter')).toBeVisible(); await ready(page);
  for (const l of ['ar', 'en', 'ckb', 'zh'] as const) {
    await act(page, 'setLocale', l); await page.waitForTimeout(700);
    await expect(page).toHaveScreenshot(`landing-${l}.png`, { maxDiffPixelRatio: 0.035 });
  }
});
