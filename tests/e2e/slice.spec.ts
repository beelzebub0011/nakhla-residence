import { expect, test } from '@playwright/test';
import { act, colorDist, expectNoErrors, gpuInfo, meanColor, open, perf, project, ready, saveEvidence, settle, state } from './helpers';

// V8 GATE 8 — the real interactive vertical slice, driven by real pointer input on the WebGL canvas:
// tower orbit -> select floor -> select unit -> enter room -> swap material -> back.

test.describe('V8 vertical slice', () => {
  test('landing is legible first, silent, and one tap enters the tower', async ({ page }) => {
    const errors = await open(page, '#/ar/explore', { landing: true });
    await expect(page.getByTestId('enter')).toBeVisible();                       // usable before 3D is required
    await expect(page.locator('#gw-title')).toHaveText('نخلة ريزيدنس');   // V11.2 gateway replaces the V8 landing
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('sound')).toHaveAttribute('aria-pressed', 'false');
    await page.getByTestId('enter').click();
    await expect(page.locator('.gateway')).toHaveCount(0);
    await ready(page);
    expect((await state(page)).view).toBe('tower');
    expect(await page.evaluate(() => (window as any).__nakhla.audio().contextCreated)).toBe(false); // nothing audio-related exists yet
    expectNoErrors(errors);
  });

  test('tower -> floor -> unit -> room -> material -> back, with real clicks and frame timing', async ({ page }) => {
    const errors = await open(page); await ready(page);
    await page.evaluate(() => (window as any).__nakhla.engine.clearPerf());

    // 1) orbit: drag rotates the tower with inertia and never selects a floor
    const before = await page.evaluate(() => (window as any).__nakhla.engine.director.orbit.az);
    await page.mouse.move(500, 420); await page.mouse.down(); await page.mouse.move(620, 430, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => (window as any).__nakhla.engine.director.orbit.az);
    expect(Math.abs(after - before)).toBeGreaterThan(0.05);
    expect((await state(page)).floorId).toBeNull();
    await page.evaluate(() => (window as any).__nakhla.engine.resetCamera()); await settle(page);

    // 2) click floor 04 on the facade itself (semantic picking of the real mesh stack)
    const ffl = await page.evaluate(() => (window as any).__nakhla.engine.floors.F04.group.position.y);
    const p = await project(page, -9.05, ffl + 1.6, 6);
    await page.mouse.move(p.x, p.y); await page.waitForTimeout(120);
    await expect(page.locator('.floor-tip strong')).toHaveText('الطابق 04');   // hover feedback names the floor
    await page.mouse.click(p.x, p.y);
    await settle(page);
    let s = await state(page); expect(s.floorId).toBe('F04'); expect(s.view).toBe('floor');
    await expect(page).toHaveURL(/f=F04/);

    // 3) choose apartment 04A from its 3D hotspot
    await page.locator('.label-unit', { hasText: 'Model One' }).click();
    await settle(page);
    s = await state(page); expect(s.unitId).toBe('U04A'); expect(s.view).toBe('unit');

    // 4) enter the living room from its hotspot: a collision-safe descent through the open top
    await page.locator('.label-room', { hasText: 'المعيشة والطعام' }).click();
    await settle(page, 500);
    s = await state(page); expect(s.view).toBe('room'); expect(s.roomKey).toBe('A.living'); expect(s.section).toBe('tour');
    const eye = await page.evaluate(() => { const e = (window as any).__nakhla.engine; return { y: e.camera.position.y - e.floors.F04.group.position.y, rig: e.director.rig }; });
    expect(eye.rig).toBe('look'); expect(eye.y).toBeGreaterThan(1.55); expect(eye.y).toBeLessThan(1.7); // human eye height

    // 5) Design: pick the floor surface, swap ivory porcelain -> engineered oak, and prove the GPU surface changed
    await page.getByRole('button', { name: 'صمّم', exact: true }).first().click();
    await settle(page, 300);
    // the room is furnished now, so the pixel proof uses the room's canonical guided viewpoint (same state, set through
    // the shareable URL) where a patch of bare floor beside the rug is known to be visible — measured in tools/swap_evidence.mjs
    await page.evaluate(() => { location.hash = '#/ar/design?f=F04&u=U04A&r=A.living&v=room&m=guided&t=900'; });
    await settle(page, 600);
    const region: [number, number, number, number] = [0.62, 0.92, 0.76, 0.99];
    await page.getByTestId('surf-living.flooring').click();
    await expect(page.getByTestId('passport')).toBeVisible();
    await settle(page, 500);                                                     // selection highlight is now part of BOTH measurements
    const c0 = await meanColor(page, ...region);
    const t0 = Date.now();
    await page.getByTestId('mat-MAT_ENGINEERED_OAK').click();
    expect((await state(page)).overrides['living.flooring']).toBe('MAT_ENGINEERED_OAK');
    const ackMs = Date.now() - t0;
    await page.waitForTimeout(1200);                                             // 240 ms reveal + scanned texture decode on first use
    const c1 = await meanColor(page, ...region);
    expect(colorDist(c0, c1), `floor colour ${c0} -> ${c1}`).toBeGreaterThan(8);   // scanned oak is paler than the old procedural oak (was > 18). Both readings include the selection highlight.
    expect(c1[0] - c1[2]).toBeGreaterThan(c0[0] - c0[2]);                        // oak is warmer than ivory tile
    expect(await page.evaluate(() => (window as any).__nakhla.engine.lib.surfaceMaterialId('living.flooring'))).toBe('MAT_ENGINEERED_OAK');
    await expect(page).toHaveURL(/o=0-ENGINEERED_OAK/);

    // 6) back, back, back — the choice survives the whole way out
    for (const expected of ['unit', 'floor', 'tower']) { await page.getByTestId('back').click(); await settle(page); expect((await state(page)).view).toBe(expected); }
    s = await state(page); expect(s.overrides['living.flooring']).toBe('MAT_ENGINEERED_OAK'); expect(s.phase).toBe('IDLE');

    const pf = await perf(page); const gpu = await gpuInfo(page);
    const ids = pf.transitions.map((t: { id: string }) => t.id);
    for (const id of ['M03_tower_to_floor', 'M04_floor_to_unit', 'M05_unit_to_room', 'M05r_room_to_dollhouse', 'M12_return_to_tower']) expect(ids, id).toContain(id);
    saveEvidence('motion-vertical-slice.json', { capturedAt: new Date().toISOString(), tool: 'Playwright + Google Chrome (headless, GPU via ANGLE/D3D11), production build', gpu, tier: s.tier, materialAckMs: ackMs, frames: pf.frames, transitions: pf.transitions, stats: pf.stats });
    for (const t of pf.transitions) {
      expect(t.n, `${t.id} frames`).toBeGreaterThan(8);
      expect(t.durationMs, `${t.id} duration`).toBeLessThan(1700);               // never a forced 2 s wait
    }
    expect(ackMs).toBeLessThan(350);
    expectNoErrors(errors);
  });

  test('room to room travels through the real doorway and switching modes keeps the pose', async ({ page }) => {
    const errors = await open(page, '#/en/tour?f=F04&u=U04A&r=A.living&v=room&m=guided'); await ready(page);
    await page.getByTestId('room-A.kitchen').click();
    // sample the camera while it travels: it must stay inside the apartment's rooms or doorways
    const samples = await page.evaluate(async () => {
      const { engine } = (window as any).__nakhla; const out: number[][] = [];
      await new Promise<void>((res) => { const t0 = performance.now(); const tick = () => { out.push([engine.camera.position.x + 9, 12 - engine.camera.position.z, engine.camera.position.y]); if (!engine.director.busy && performance.now() - t0 > 300) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      return out;
    });
    expect(samples.length).toBeGreaterThan(10);
    const eyeY = samples[0][2];
    for (const [x, y, h] of samples) { expect(Math.abs(h - eyeY)).toBeLessThan(0.02); expect(x).toBeGreaterThan(4.6); expect(x).toBeLessThan(17.7); expect(y).toBeGreaterThan(0.3); expect(y).toBeLessThan(6.2); }
    expect((await state(page)).roomKey).toBe('A.kitchen');
    const tr = (await perf(page)).transitions.at(-1); expect(tr.id).toBe('M06_room_to_room'); expect(tr.kind).toContain('path');

    // M08 guided -> free walk: same pose, new controller
    const pose = () => page.evaluate(() => { const c = (window as any).__nakhla.engine.camera; return [...c.position.toArray(), ...c.quaternion.toArray()]; });
    const a = await pose(); await page.getByTestId('mode-free_walk').click(); await page.waitForTimeout(200); const b = await pose();
    for (let i = 0; i < 7; i++) expect(b[i]).toBeCloseTo(a[i], 4);
    expect((await state(page)).mode).toBe('free_walk');
    // walk forward with the keyboard: position changes, stays inside modelled space, stops at walls
    await page.keyboard.down('w'); await page.waitForTimeout(1500); await page.keyboard.up('w'); await page.waitForTimeout(400);
    const c = await pose(); expect(Math.hypot(c[0] - b[0], c[2] - b[2])).toBeGreaterThan(0.4);
    expect(await page.evaluate(() => { const e = (window as any).__nakhla.engine; const s = (window as any).__nakhla.store.getState(); return s.roomKey && s.roomKey.startsWith('A.'); })).toBe(true);
    // dollhouse mode returns to the orbit view of the same apartment
    await page.getByTestId('mode-property_explorer').click(); await settle(page);
    const s = await state(page); expect(s.view).toBe('unit'); expect(s.unitId).toBe('U04A');
    expectNoErrors(errors);
  });

  test('amenities: level 10 pool and level 11 café are reachable and distinct', async ({ page }) => {
    const errors = await open(page, '#/en/explore'); await ready(page);
    await page.getByRole('button', { name: 'Amenities', exact: true }).first().click(); await settle(page);
    let s = await state(page); expect(s.floorId).toBe('F10'); expect(s.unitId).toBeNull(); expect(s.section).toBe('amenities');
    await page.getByTestId('zone-pool').click(); await settle(page, 400);
    s = await state(page); expect(s.roomKey).toBe('zone.pool'); expect(s.view).toBe('room');
    await expect(page.getByTestId('panel-amenities')).toContainText('not a designed value');   // honest pool caveat
    await page.getByTestId('amen-F11').click(); await settle(page, 400);
    await page.getByTestId('zone-cafe').click(); await settle(page, 400);
    s = await state(page); expect(s.floorId).toBe('F11'); expect(s.roomKey).toBe('zone.cafe');
    await expect(page.getByTestId('panel-amenities')).toContainText('conditional proposal');
    await page.getByTestId('back').click(); await settle(page); await page.getByTestId('back').click(); await settle(page);
    expect((await state(page)).view).toBe('tower');
    expectNoErrors(errors);
  });

  test('environment: time, season and weather blend without touching selections', async ({ page }) => {
    const errors = await open(page, '#/en/explore?f=F04&u=U04A&v=unit'); await ready(page);
    await act(page, 'setOverride', 'living.flooring', 'MAT_ENGINEERED_OAK');
    const day = await meanColor(page, 0.05, 0.1, 0.3, 0.3);
    await page.getByTestId('env').click();
    await page.getByTestId('preset-1260').click();                                 // night
    await page.getByTestId('weather-dust').click(); await page.getByTestId('season-winter').click();
    // V11.5: wait for the environment blend to finish (a fixed sleep raced it under full-suite load), then two frames
    await page.waitForFunction(() => !(window as any).__nakhla.engine.env.blending, null, { timeout: 15000 }); await page.waitForTimeout(800);
    const night = await meanColor(page, 0.05, 0.1, 0.3, 0.3);
    expect(colorDist(day, night)).toBeGreaterThan(24);   // V12: PBR Neutral + glass UI; night still clearly darker (≈30)
    const s = await state(page);
    expect(s.env).toEqual({ timeMinutes: 1260, seasonId: 'winter', weatherId: 'dust' });
    expect(s.unitId).toBe('U04A'); expect(s.overrides['living.flooring']).toBe('MAT_ENGINEERED_OAK'); expect(s.view).toBe('unit');
    await expect(page.getByTestId('sheet-env')).toContainText('not live weather');
    expectNoErrors(errors);
  });
});
