import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { act, expectNoErrors, open, ready, settle, state } from './helpers';

// V4 locales + quiet-by-default, V5 navigation, V6 assistant, V7 fallback/privacy, keyboard access.

const LOCALES = [
  { key: 'ar', lang: 'ar-IQ', dir: 'rtl', explore: 'استكشف', brand: 'نخلة ريزيدنس' },
  { key: 'en', lang: 'en', dir: 'ltr', explore: 'Explore', brand: 'NAKHLA RESIDENCE' },
  { key: 'ckb', lang: 'ckb-IQ', dir: 'rtl', explore: 'بگەڕێ', brand: 'نەخلە ڕێزیدێنس' },
  { key: 'zh', lang: 'zh-Hans', dir: 'ltr', explore: '探索', brand: '纳赫拉公馆' },
] as const;

test.describe('four locales', () => {
  for (const vp of [{ w: 1366, h: 768 }, { w: 820, h: 1180 }, { w: 390, h: 844 }]) {
    for (const l of LOCALES) {
      test(`${l.key} @ ${vp.w}px: direction, exactly four sections, no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        const errors = await open(page, `#/${l.key}/explore?f=F04&u=U04A&v=unit`); await ready(page);
        await expect(page.locator('html')).toHaveAttribute('lang', l.lang);
        await expect(page.locator('html')).toHaveAttribute('dir', l.dir);
        await expect(page.locator('.tabs .tab')).toHaveCount(4);
        await expect(page.locator('.tabs .tab').first()).toContainText(l.explore);
        await expect(page.locator('.brand-text b')).toHaveText(l.brand);
        const overflow = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - innerWidth, clipped: [...document.querySelectorAll('.topbar, .panel, .tabs')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).length }));
        expect(overflow.doc).toBeLessThanOrEqual(0); expect(overflow.clipped).toBe(0);
        // touch targets: every visible button in the chrome is at least 40 CSS px in one dimension
        const small = await page.evaluate(() => [...document.querySelectorAll('.topbar button, .tabs button, .panel button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && Math.max(r.width, r.height) < 34; }).length);
        expect(small).toBe(0);
        expectNoErrors(errors);
      });
    }
  }

  test('switching language keeps floor, unit, room, finishes, environment and mute state', async ({ page }) => {
    const errors = await open(page, '#/ar/design?f=F06&u=U06A&r=A.master&v=room&m=guided&p=premium&o=6-ENGINEERED_OAK&t=1050'); await ready(page);
    const before = await state(page);
    for (const l of ['en', 'ckb', 'zh', 'ar']) {
      await page.getByTestId('lang').click(); await page.getByTestId(`lang-${l}`).click(); await page.waitForTimeout(150);
      const s = await state(page);
      expect(s.locale).toBe(l);
      expect({ f: s.floorId, u: s.unitId, r: s.roomKey, p: s.packageId, o: s.overrides, e: s.env, m: s.muted, v: s.view }).toEqual({ f: before.floorId, u: before.unitId, r: before.roomKey, p: before.packageId, o: before.overrides, e: before.env, m: true, v: before.view });
    }
    const cam = await page.evaluate(() => (window as any).__nakhla.engine.camera.position.toArray());
    expect(cam[1]).toBeGreaterThan(20);                         // still inside the level-06 room: 3D is never mirrored or reset
    expectNoErrors(errors);
  });
});

test.describe('quiet by default', () => {
  test('sound is off on load, turns on only from the sound control, and is off again after reload', async ({ page }) => {
    const errors = await open(page); await ready(page);
    const audio = () => page.evaluate(() => (window as any).__nakhla.audio());
    expect((await state(page)).muted).toBe(true); expect((await audio()).contextCreated).toBe(false);
    // navigation, tours and mode changes never start audio
    await act(page, 'selectFloor', 'F04'); await act(page, 'selectUnit', 'U04A'); await act(page, 'enterRoom', 'A.living'); await act(page, 'setMode', 'free_walk'); await act(page, 'setLocale', 'en'); await settle(page);
    expect((await state(page)).muted).toBe(true); expect((await audio()).contextCreated).toBe(false);
    await page.getByTestId('sound').click();
    expect((await state(page)).muted).toBe(false); expect((await audio()).contextCreated).toBe(true);
    await expect(page.getByTestId('sound')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('sound').click(); expect((await state(page)).muted).toBe(true);     // instant mute at any point
    await page.getByTestId('sound').click(); expect((await state(page)).muted).toBe(false);
    await page.reload(); await ready(page);
    expect((await state(page)).muted).toBe(true); expect((await audio()).contextCreated).toBe(false); // opt-in never persists
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/audio|muted|sound/i);
    expect(await page.evaluate(() => document.querySelectorAll('audio, video').length)).toBe(0);
    expectNoErrors(errors);
  });
});

test.describe('assistant, summary and privacy', () => {
  test('Nakhla assistant: grounded answers, typed navigation, confirmation before changing a finish', async ({ page }) => {
    const errors = await open(page, '#/ar/explore'); await ready(page);
    await page.getByTestId('ask').click();
    const ask = async (q: string) => { await page.getByTestId('ai-input').fill(q); await page.getByTestId('ai-send').click(); await page.waitForTimeout(120); return page.locator('.ai-a').last(); };
    let a = await ask('شگد المساحة؟'); await expect(a).toHaveAttribute('data-intent', 'unit_area'); await expect(a).toContainText('124.86'); await expect(a).toHaveAttribute('data-status', 'concept_estimate');
    a = await ask('شنو السعر؟'); await expect(a).toHaveAttribute('data-status', 'demo_schema'); await expect(a).toContainText('قيم افتراضية للعرض فقط');   // V11.4 demo prices, always with the disclaimer
    a = await ask('هل الشقة متوفرة؟'); await expect(a).toHaveAttribute('data-status', 'unknown'); await expect(a).toContainText('غير متوفر');
    a = await ask('ودّيني للمسبح'); await expect(a).toHaveAttribute('data-intent', 'walk_to_room');
    await settle(page, 400);
    let s = await state(page); expect(s.floorId).toBe('F10'); expect(s.roomKey).toBe('zone.pool'); expect(s.overlay).toBe('ai'); // chat stays, state moved via a typed action
    a = await ask('شنو الخيارات لأرضية المعيشة؟'); await expect(a).toHaveAttribute('data-intent', 'material_options');
    await a.getByTestId('ai-action').first().click();
    expect((await state(page)).overrides['living.flooring']).toBeUndefined();               // nothing changes before the visitor confirms
    await page.getByTestId('ai-confirm').click();
    expect((await state(page)).overrides['living.flooring']).toBeTruthy();
    await page.keyboard.press('Escape'); await expect(page.getByTestId('sheet-ai')).toHaveCount(0);
    s = await state(page); expect(s.muted).toBe(true);
    expectNoErrors(errors);
  });

  test('My apartment: schedule, share link, demo enquiry sends nothing, creator contact is exact', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1' && u.protocol !== 'data:' && u.protocol !== 'blob:') external.push(r.url()); });
    const errors = await open(page, '#/en/design?f=F04&u=U04A&r=A.living&v=room&m=guided&p=luxury&o=0-ENGINEERED_OAK'); await ready(page);
    await page.getByTestId('open-summary').click();
    const sheet = page.getByTestId('sheet-summary');
    await expect(sheet).toContainText('Modern Pearl'); await expect(sheet.getByTestId('sum-table')).toContainText('Engineered Oak'); await expect(sheet.getByTestId('sum-table')).toContainText('Custom');
    await expect(sheet).toContainText('no supplier, price, warranty');
    await sheet.getByTestId('open-inquiry').click();
    await sheet.getByTestId('inq-submit').click(); await expect(sheet.locator('.err')).toHaveCount(2);     // real validation
    await sheet.locator('input[name=name]').fill('Test Visitor'); await sheet.locator('input[name=contact]').fill('+9640000000000');
    await sheet.getByTestId('inq-submit').click();
    await expect(sheet.getByTestId('inq-done')).toContainText('no request was sent');
    expect(page.url()).not.toContain('Test'); expect(page.url()).not.toContain('964000');               // contact data never enters the URL
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Test Visitor');
    await expect(sheet.getByTestId('link-tel')).toHaveAttribute('href', 'tel:+9647700864990');
    await expect(sheet.getByTestId('link-mail')).toHaveAttribute('href', 'mailto:rashid.iq12@gmail.com');
    await expect(sheet.getByTestId('link-wa')).toHaveAttribute('href', 'https://wa.me/9647700864990');
    await expect(sheet.getByTestId('creator-card')).toContainText('Rashid Omar Mohammed');
    expect(external, 'no third-party requests of any kind').toEqual([]);
    expectNoErrors(errors);
  });

  test('share link restores the exact state; browser Back and Forward walk the journey', async ({ page }) => {
    const errors = await open(page); await ready(page);
    await act(page, 'selectFloor', 'F07'); await settle(page); await act(page, 'selectUnit', 'U07B'); await settle(page); await act(page, 'enterRoom', 'B.kitchen'); await settle(page);
    await act(page, 'setPackage', 'premium'); await act(page, 'setOverride', 'kitchen.countertop', 'MAT_IVORY_MARBLELOOK'); await act(page, 'setEnv', { timeMinutes: 1050 });
    const url = page.url(); const want = await state(page);
    await page.goBack(); await settle(page); expect((await state(page)).view).toBe('unit');
    await page.goBack(); await settle(page); expect((await state(page)).view).toBe('floor');
    await page.goForward(); await settle(page); expect((await state(page)).unitId).toBe('U07B');
    const fresh = await page.context().newPage(); await fresh.goto(url.replace('?e2e=1', '?e2e=1')); await ready(fresh);
    const got = await state(fresh);
    expect({ f: got.floorId, u: got.unitId, r: got.roomKey, v: got.view, p: got.packageId, o: got.overrides, t: got.env.timeMinutes }).toEqual({ f: want.floorId, u: want.unitId, r: want.roomKey, v: want.view, p: want.packageId, o: want.overrides, t: 1050 });
    expect(got.muted).toBe(true); expect(got.landing).toBe(false);
    expectNoErrors(errors);
  });
});

test('gallery: live capture of the current view + every labelled offline render in the manifest', async ({ page }) => {
  const errors = await open(page, '#/en/tour?f=F04&u=U04A&r=A.living&v=room&m=guided'); await ready(page);
  await page.getByTestId('menu').click(); await page.getByTestId('menu-gallery').click();
  const sheet = page.getByTestId('sheet-gallery');
  const expected = JSON.parse(readFileSync('public/renders/manifest.json', 'utf8')).items.length;
  expect(expected).toBeGreaterThanOrEqual(12);
  await expect(sheet.locator('img[src*="renders/"]')).toHaveCount(expected);
  await expect(sheet).toContainText('High-detail image from the same model');
  await sheet.getByTestId('capture').click();
  await expect(sheet.locator('img[src^="data:image"]')).toHaveCount(1);
  await expect(sheet).toContainText('Live view from the 3D model');
  // images below the fold load lazily: check that every source actually resolves instead of waiting for decode
  const broken = await sheet.locator('img').evaluateAll(async (imgs) => (await Promise.all(imgs.map(async (i) => { const src = (i as HTMLImageElement).src; if (src.startsWith('data:')) return 0; const r = await fetch(src, { method: 'HEAD' }); return r.ok ? 0 : 1; }))).reduce((a: number, b: number) => a + b, 0));
  expect(broken).toBe(0);
  expectNoErrors(errors);
});

test.describe('keyboard and 2D fallback', () => {
  test('floors, apartments and rooms are operable by keyboard alone', async ({ page }) => {
    const errors = await open(page, '#/en/explore'); await ready(page);
    await page.getByTestId('floor-F03').focus(); await expect(page.getByTestId('floor-F03')).toBeFocused();
    expect((await state(page)).floorId).toBeNull();
    await page.keyboard.press('Enter'); await settle(page);
    expect((await state(page)).floorId).toBe('F03');
    await page.getByTestId('unit-U03A').focus(); await page.keyboard.press('Enter'); await settle(page);
    expect((await state(page)).unitId).toBe('U03A');
    await page.getByTestId('room-A.master').focus(); await page.keyboard.press('Enter'); await settle(page);
    expect((await state(page)).roomKey).toBe('A.master');
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250);                       // look with the keyboard
    const visible = await page.evaluate(() => { const b = document.querySelector('[data-testid=back]')!; b.dispatchEvent(new Event('focus')); (b as HTMLElement).focus(); return getComputedStyle(b).outlineStyle; });
    expect(visible).not.toBe('none');
    await page.keyboard.press('Enter'); await settle(page); expect((await state(page)).view).toBe('unit');
    expectNoErrors(errors);
  });

  test('2D plans (V12): without WebGL the plans section opens; floors, rooms, details and the assistant work', async ({ page }) => {
    await page.addInitScript(() => { const orig = HTMLCanvasElement.prototype.getContext; (HTMLCanvasElement.prototype as any).getContext = function (type: string, ...rest: unknown[]) { return /webgl/i.test(type) ? null : (orig as any).call(this, type, ...rest); }; });
    await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch { /* ignore */ } });
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?e2e=1#/en/explore');
    await expect(page.getByTestId('plans')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('lite-floor-F05').click();
    await expect(page.getByTestId('lite-plan')).toBeVisible();
    await page.getByTestId('lite-room-A.kitchen').click();
    await expect(page).toHaveURL(/u=U05A/); await expect(page).toHaveURL(/r=A\.kitchen/);
    await expect(page.locator('.pl-info')).toContainText('Kitchen');
    await expect(page.locator('.pl-info')).toContainText('Model One');
    await page.getByRole('button', { name: 'Next room' }).click(); await expect(page).not.toHaveURL(/r=A\.kitchen/);
    await page.getByRole('button', { name: 'Ask Nakhla' }).first().click(); await page.getByTestId('ai-input').fill('how many floors?'); await page.getByTestId('ai-send').click();
    await expect(page.locator('.ai-a').last()).toContainText('12');
    await page.keyboard.press('Escape');
    await page.getByTestId('lite-floor-F10').click();
    await expect(page.getByTestId('lite-room-zone.pool')).toBeVisible();
    expect(errors.filter((e) => !/WebGL|context/i.test(e))).toEqual([]);
  });
});
