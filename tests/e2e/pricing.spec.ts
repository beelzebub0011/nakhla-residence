import { expect, test, type Page } from '@playwright/test';
import { expectNoErrors, open, ready } from './helpers';

// V11.4 demo pricing in both experiences: one dataset, disclaimer everywhere, no sales mechanics.

const st = (page: Page) => page.evaluate(() => { const s = (window as any).__nakhlaStore.getState(); return { experience: s.experience, unitId: s.unitId, overlay: s.overlay, sceneId: s.sceneId, view: s.view }; });
const DISCLAIMER_AR = 'أسعار افتراضية للعرض فقط — المشروع تصوّري وغير مطروح للبيع';

test('PRICE-01: 3D — open from the menu, filter, select a unit on the tower, compare, see the same price in the unit panel', async ({ page }) => {
  const errors = await open(page, '#/en/explore'); await ready(page);
  await page.getByTestId('menu').click(); await page.getByTestId('menu-pricing').click();
  const sheet = page.getByTestId('sheet-pricing'); await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('price-disclaimer')).toContainText('not for sale');
  await expect(sheet.getByTestId('price-count')).toContainText('18');
  await sheet.getByTestId('price-band-high').click(); await expect(sheet.getByTestId('price-count')).toContainText('6');
  await sheet.getByTestId('price-budget-280000000').click();
  const rows = sheet.locator('[data-testid^="price-row-"]'); expect(await rows.count()).toBeGreaterThan(0);
  await sheet.getByTestId('price-row-U08A').click();
  expect(await st(page)).toMatchObject({ unitId: 'U08A', view: 'unit', overlay: 'pricing' });   // the tower moves to the unit while the list stays open
  const total = await sheet.getByTestId('price-total').innerText(); expect(total).toMatch(/^[\d,]+ IQD$/);
  await sheet.getByTestId('price-pkg-luxury').click(); const lux = await sheet.getByTestId('price-total').innerText(); expect(lux).not.toBe(total);
  await sheet.getByTestId('price-pkg-standard').click();
  await sheet.getByTestId('price-compare').click();
  await sheet.getByTestId('price-show3d').click(); await expect(sheet).toBeHidden();
  const badge = page.getByTestId('price-badge'); await expect(badge).toBeVisible();
  const m = Number(total.replace(/\D/g, '')) / 1e6; await expect(badge).toContainText(`${m} M IQD`);
  // no sales mechanics anywhere on the page
  expect(await page.locator('body').innerText()).not.toMatch(/buy now|book now|reserve now|deposit|sold out|available now/i);
  expectNoErrors(errors);
});

test('PRICE-02: photoreal site — Arabic disclaimer, price chip, deep link restore, switch to 3D keeps the unit', async ({ page }) => {
  const errors = await open(page, '#/ar/visual/B_living');
  await expect(page.getByTestId('visual-scene')).toBeVisible();
  await expect(page.getByTestId('vs-price-chip')).toContainText('مليون د.ع');
  await page.getByTestId('vs-price-chip').click();
  const sheet = page.getByTestId('sheet-pricing'); await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('price-disclaimer')).toHaveText(DISCLAIMER_AR);
  await sheet.getByTestId('price-row-U05B').click();
  await expect(page).toHaveURL(/#\/ar\/visual\/B_living\?pr=U05B$/);
  const total = await sheet.getByTestId('price-total').innerText();
  // deep link restore in a fresh load
  await page.reload(); await expect(page.getByTestId('sheet-pricing')).toBeVisible();
  expect(await st(page)).toMatchObject({ experience: 'visual', unitId: 'U05B', overlay: 'pricing' });
  await expect(page.getByTestId('price-total')).toHaveText(total);
  // the same unit and price in the 3D experience
  await page.getByTestId('price-show3d').click(); await ready(page);
  expect(await st(page)).toMatchObject({ experience: '3d', unitId: 'U05B' });
  await expect(page.getByTestId('price-badge')).toContainText(String(Number(total.replace(/\D/g, '')) / 1e6));
  expectNoErrors(errors);
});

test('PRICE-03: the assistant answers demo prices from the dataset with the disclaimer', async ({ page }) => {
  const errors = await open(page, '#/en/explore?f=F04&u=U04A&v=unit'); await ready(page);
  await page.getByTestId('ask').click();
  await page.getByTestId('ai-input').fill('What is the price of this apartment?'); await page.getByTestId('ai-send').click();
  const log = page.getByTestId('ai-log');
  await expect(log).toContainText('hypothetical demonstration values'); await expect(log).toContainText('IQD');
  await page.getByTestId('ai-input').fill('How is the price calculated?'); await page.getByTestId('ai-send').click();
  await expect(log).toContainText('1,850,000');
  await page.getByTestId('ai-action').last().click(); await expect(page.getByTestId('sheet-pricing')).toBeVisible();
  // the printed summary carries the price and the disclaimer
  await page.getByTestId('sheet-close').click(); await page.getByTestId('menu').click(); await page.getByTestId('menu-summary').click();
  await expect(page.getByTestId('sum-price')).toContainText('IQD'); await expect(page.getByTestId('sheet-summary').getByTestId('price-disclaimer')).toBeVisible();
  expectNoErrors(errors);
});
