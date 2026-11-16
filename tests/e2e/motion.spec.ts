import { expect, test } from '@playwright/test';
import { act, expectNoErrors, gpuInfo, open, perf, ready, saveEvidence, settle, state } from './helpers';

// V8 motion discipline: interruption, retargeting, reduced motion, recovery and 20-cycle stability.

test.describe('V8 motion behaviour', () => {
  test('rapid floor changes: last intent wins, the camera never jumps', async ({ page }) => {
    const errors = await open(page); await ready(page);
    const trace = await page.evaluate(async () => {
      const { engine, store } = (window as any).__nakhla; const s = () => store.getState(); const pos: number[][] = [];
      let on = true; const rec = () => { pos.push(engine.camera.position.toArray()); if (on) requestAnimationFrame(rec); }; requestAnimationFrame(rec);
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      s().selectFloor('F03'); await wait(180); s().selectFloor('F07'); await wait(120); s().selectFloor('F05'); await wait(90); s().selectUnit('U05B');
      await new Promise<void>((res) => { const t = () => (engine.director.busy || engine.openFloor !== 'F05' || engine.director.value('explode') < 0.999 ? requestAnimationFrame(t) : res()); setTimeout(t, 300); });
      on = false; let maxStep = 0; for (let i = 1; i < pos.length; i++) maxStep = Math.max(maxStep, Math.hypot(pos[i][0] - pos[i - 1][0], pos[i][1] - pos[i - 1][1], pos[i][2] - pos[i - 1][2]));
      return { frames: pos.length, maxStep, stats: engine.director.stats, exploded: engine.exploded };
    });
    const s = await state(page);
    expect(s.floorId).toBe('F05'); expect(s.unitId).toBe('U05B'); expect(s.view).toBe('unit'); expect(s.phase).toBe('IDLE');
    expect(trace.exploded).toBe('F05');                       // the 3D cutaway agrees with the semantic state
    expect(trace.stats.retargets).toBeGreaterThanOrEqual(2);
    expect(trace.maxStep, 'largest per-frame camera step (m)').toBeLessThan(9);
    expectNoErrors(errors);
  });

  test('Back during a transition interrupts immediately and state stays consistent', async ({ page }) => {
    const errors = await open(page); await ready(page);
    await act(page, 'selectFloor', 'F06'); await page.waitForTimeout(200);
    await act(page, 'selectUnit', 'U06A'); await page.waitForTimeout(150);
    await page.keyboard.press('Escape');                       // nothing to close: must not trap
    await act(page, 'home'); await settle(page);
    const s = await state(page); expect(s.view).toBe('tower'); expect(s.floorId).toBeNull();
    const lifted = await page.evaluate(() => { const e = (window as any).__nakhla.engine; return Object.values(e.floors).filter((f: any) => !f.group.visible || f.ghosted).length; });
    expect(lifted).toBe(0);                                    // every level is back, solid and visible
    expectNoErrors(errors);
  });

  test('reduced motion: OS preference is honoured at first paint and mid-session', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await open(page); await ready(page);
    expect((await state(page)).motionPref).toBe('reduced');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.evaluate(() => (window as any).__nakhla.engine.clearPerf());
    const t0 = Date.now(); await act(page, 'selectFloor', 'F04'); await settle(page, 50); const ms = Date.now() - t0;
    await act(page, 'selectUnit', 'U04A'); await settle(page, 50); await act(page, 'enterRoom', 'A.living'); await settle(page, 50);
    const pf = await perf(page);
    // COLD: this floor was opened the instant the page became ready, so its first transition includes waiting for the
    // interior to be prepared. That wait has its own budget (2.0 s; measured 0.5-1.7 s when the floor is opened in the same instant the tower appears); it is not a V8 motion band.
    for (const t of pf.transitions) { expect(t.reduced, t.id).toBe(true); expect(t.kind).toBe('reduced'); }
    expect(Math.max(...pf.transitions.map((t: { durationMs: number }) => t.durationMs)), 'cold first-entry wait (ms)').toBeLessThan(2000);
    expect(ms).toBeLessThan(2500);
    // WARM: the same moves again, content already prepared -> the V8 reduced-motion band (< 450 ms) applies strictly
    await act(page, 'back'); await settle(page, 50); await act(page, 'back'); await settle(page, 50); await act(page, 'back'); await settle(page, 50);
    await page.evaluate(() => (window as any).__nakhla.engine.clearPerf());
    await act(page, 'selectFloor', 'F04'); await settle(page, 50); await act(page, 'selectUnit', 'U04A'); await settle(page, 50); await act(page, 'enterRoom', 'A.living'); await settle(page, 50);
    const warm = await perf(page);
    expect(warm.transitions.length).toBeGreaterThan(0);
    for (const t of warm.transitions) { expect(t.reduced, t.id).toBe(true); expect(t.durationMs, `warm ${t.id}`).toBeLessThan(450); }
    const s = await state(page); expect(s.view).toBe('room'); expect(s.roomKey).toBe('A.living'); // functionality and state intact
    // switch back to gentle from the in-app control: spatial moves return
    await page.getByTestId('menu').click(); await page.getByTestId('motion-gentle').click(); await page.keyboard.press('Escape');
    await page.evaluate(() => (window as any).__nakhla.engine.clearPerf());
    await act(page, 'back'); await settle(page);
    expect((await perf(page)).transitions.at(-1).reduced).toBe(false);
    expectNoErrors(errors);
  });

  test('OS reduced-motion change during a transition switches behaviour without breaking state', async ({ page }) => {
    const errors = await open(page); await ready(page);
    await act(page, 'selectFloor', 'F08'); await page.waitForTimeout(250);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await settle(page); expect((await state(page)).motionPref).toBe('reduced');
    await act(page, 'selectUnit', 'U08A'); await settle(page, 50);
    const s = await state(page); expect(s.unitId).toBe('U08A'); expect(s.phase).toBe('IDLE');
    expect((await perf(page)).transitions.at(-1).kind).toBe('reduced');
    expectNoErrors(errors);
  });

  test('WebGL context loss: selections survive, 2D is offered, 3D recovers', async ({ page }) => {
    const errors = await open(page, '#/en/design?f=F04&u=U04A&r=A.kitchen&v=room&m=guided&p=premium'); await ready(page);
    await act(page, 'setOverride', 'kitchen.countertop', 'MAT_DARK_GRANITELOOK');
    expect(await page.evaluate(() => (window as any).__nakhla.engine.simulateContextLoss(1200))).toBe(true);
    await expect(page.locator('.notice')).toBeVisible();
    let s = await state(page); expect(s.webgl).toBe('lost');
    expect(s.unitId).toBe('U04A'); expect(s.roomKey).toBe('A.kitchen'); expect(s.overrides['kitchen.countertop']).toBe('MAT_DARK_GRANITELOOK');
    await expect(page.getByTestId('panel-design')).toBeVisible();          // controls and facts stay usable
    await page.getByTestId('ask').click(); await expect(page.getByTestId('sheet-ai')).toBeVisible(); await page.keyboard.press('Escape');
    await page.waitForFunction(() => (window as any).__nakhla.store.getState().webgl === 'ok', null, { timeout: 8000 });
    await expect(page.locator('.notice')).toHaveCount(0);
    s = await state(page); expect(s.overrides['kitchen.countertop']).toBe('MAT_DARK_GRANITELOOK');
    const c = await page.evaluate(() => (window as any).__nakhla.engine.counters); expect(c.contextLost).toBe(1); expect(c.contextRestored).toBe(1);
    const filtered = errors.filter((e) => !/context|CONTEXT_LOST|WebGL/i.test(e)); expectNoErrors(filtered);
  });

  test('20 navigation cycles: no resource growth, frame-time record exported', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = await open(page); await ready(page);
    await page.evaluate(() => (window as any).__nakhla.runSlice(1));           // warm every path once
    await page.waitForFunction(() => (window as any).__nakhla.engine.finishesReady === true, null, { timeout: 60_000 }); // all finishes uploaded
    const mem0 = await page.evaluate(() => { (window as any).gc?.(); const e = (window as any).__nakhla.engine; const i = e.renderer.info; return { geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs.length, heap: (performance as any).memory?.usedJSHeapSize ?? 0 }; });
    await page.evaluate(async () => {
      const { engine, store } = (window as any).__nakhla; const s = () => store.getState();
      const idle = () => new Promise<void>((res) => { const t0 = performance.now(); const t = () => { const e = engine.director.value('explode'); const st = s(); (!engine.director.busy && (e < 0.001 || e > 0.999) && engine.openFloor === (st.view === 'tower' ? null : st.floorId) && performance.now() - t0 > 60) ? res() : requestAnimationFrame(t); }; requestAnimationFrame(t); });
      engine.clearPerf();
      const counts = () => { const i = engine.renderer.info; return { geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs.length }; };
      (window as any).__memAfter4 = null;
      for (let i = 0; i < 20; i++) {
        if (i === 4) (window as any).__memAfter4 = counts();          // after one full rotation of floors, units and packages
        const f = ['F02', 'F04', 'F06', 'F09'][i % 4]; s().selectFloor(f); await idle(); s().selectUnit('U' + f.slice(1) + (i % 2 ? 'B' : 'A')); await idle();
        s().enterRoom((i % 2 ? 'B' : 'A') + '.living'); await idle(); s().setPackage(['premium', 'luxury', 'standard'][i % 3]); await idle(); s().home(); await idle();
      }
    });
    const mem1 = await page.evaluate(() => { (window as any).gc?.(); const e = (window as any).__nakhla.engine; const i = e.renderer.info; return { geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs.length, heap: (performance as any).memory?.usedJSHeapSize ?? 0 }; });
    const pf = await perf(page); const gpu = await gpuInfo(page); const s = await state(page);
    const byId: Record<string, number[]> = {};
    for (const t of pf.transitions) (byId[t.id] ??= []).push(t.p95);
    const memAfter4 = await page.evaluate(() => (window as any).__memAfter4);
    saveEvidence('motion-20-cycles.json', { capturedAt: new Date().toISOString(), tool: 'Playwright + Google Chrome (headless, GPU), production build', gpu, tier: s.tier, cycles: 20, memoryBefore: mem0, memoryAfterCycle4: memAfter4, memoryAfter: mem1, frames: pf.frames, stats: pf.stats, counters: pf.counters, transitions: pf.transitions });
    const head = 'transitionId,kind,deviceTier,browser,fpsMedian,frameMsP50,frameMsP95,frameMsP99,frameMsMax,hitchesOver50ms,frames,durationMs,interrupted,reducedMotion,evidencePath,verdict,notes';
    const rows = pf.transitions.map((t: any) => [t.id, t.kind, s.tier, '"Chrome headless (GPU)"', t.fpsMedian, t.p50, t.p95, t.p99, t.max, t.hitches50, t.n, t.durationMs, t.interrupted, t.reduced, 'project_artifacts/evidence/motion-20-cycles.json', t.p95 <= 20 && t.hitches50 === 0 ? 'WITHIN_PROPOSED_DESKTOP_TARGET' : 'OUTSIDE_PROPOSED_TARGET', '"automated run; not a physical-device or human comfort test"'].join(','));
    saveEvidence('motion-benchmark.csv', [head, ...rows].join('\n'));
    expect(pf.transitions.length).toBeGreaterThanOrEqual(60);
    expect(mem1.geo, 'GPU geometries').toBeLessThanOrEqual(mem0.geo + 4);
    expect(mem1.tex, 'GPU textures').toBeLessThanOrEqual(mem0.tex + 4);
    // leak test: once every floor / unit / finish package has been visited (4 cycles), the next 16 cycles must not add a
    // single shader program, geometry or texture (one-time variants compile during the first rotation)
    const mid = await page.evaluate(() => (window as any).__memAfter4);
    expect(mem1.prog, 'shader programs after cycle 4 -> 20').toBeLessThanOrEqual(mid.prog);
    expect(mem1.geo, 'GPU geometries after cycle 4 -> 20').toBeLessThanOrEqual(mid.geo);
    expect(mem1.tex, 'GPU textures after cycle 4 -> 20').toBeLessThanOrEqual(mid.tex);
    expect(mid.prog - mem0.prog, 'one-time shader variants in the first rotation').toBeLessThanOrEqual(12);
    expect(pf.stats.tripsStarted).toBe(pf.stats.tripsCompleted + pf.stats.retargets + pf.stats.cancelledByUser);
    expect(s.view).toBe('tower'); expect(s.phase).toBe('IDLE');
    expectNoErrors(errors);
  });
});
