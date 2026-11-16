import { useStore } from './store';
import type { Engine } from '../engine/Engine';

// V8 evidence helper: drives the real vertical slice through the real store/engine and returns the
// frame-time record of every transition. Used by the dev HUD and by the Playwright motion tests.

const raf = () => new Promise<number>((r) => requestAnimationFrame(r));
export async function settle(engine: Engine, minMs = 120, maxMs = 6000) {
  const t0 = performance.now();
  for (;;) {
    await raf(); const e = engine.director.value('explode'); const el = performance.now() - t0;
    const st = useStore.getState(); const want = st.view === 'tower' ? null : st.floorId;
    const idle = !engine.director.busy && (e < 0.001 || e > 0.999) && engine.openFloor === want;
    if ((idle && el >= minMs) || el > maxMs) return;
  }
}

export async function runSlice(engine: Engine, cycles = 1) {
  const s = () => useStore.getState();
  engine.clearPerf(); s().enter(); s().home(); await settle(engine, 300);
  for (let i = 0; i < cycles; i++) {
    s().selectFloor('F04'); await settle(engine);
    s().selectUnit('U04A'); await settle(engine);
    s().enterRoom('A.living'); await settle(engine);
    s().setSection('design'); s().setOverride('living.flooring', 'MAT_ENGINEERED_OAK'); await settle(engine, 380);
    s().setOverride('living.flooring', 'MAT_PEARL_MARBLELOOK'); await settle(engine, 380);
    s().enterRoom('A.kitchen'); await settle(engine);
    s().back(); await settle(engine);
    s().back(); await settle(engine);
    s().back(); await settle(engine);
  }
  s().resetFinishes();
  return engine.perf();
}

export function perfToCsv(p: ReturnType<Engine['perf']>, meta: Record<string, string>): string {
  const head = 'transitionId,kind,deviceTier,browser,fpsMedian,frameMsP50,frameMsP95,frameMsP99,frameMsMax,hitchesOver50ms,frames,durationMs,interrupted,reducedMotion,notes';
  const rows = p.transitions.map((t) => [t.id, t.kind, meta.tier, `"${meta.browser}"`, t.fpsMedian, t.p50, t.p95, t.p99, t.max, t.hitches50, t.n, t.durationMs, t.interrupted, t.reduced, `"${meta.notes ?? ''}"`].join(','));
  return [head, ...rows].join('\n');
}
