import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '../state/store';
import { getAnchors } from '../state/anchors';
import { getFloorPlan } from '../domain/plans';
import { FLOOR_BY_ID } from '../domain/tower';
import { CATALOG } from '../domain/materials';
import type { Engine, LabelPos } from '../engine/Engine';
import { floorLabel, roomLabel, unitCode, useT } from '../i18n';
import { Icon } from './Icon';
import { audioDebug, renderScene } from '../audio/ambience';

/** The one live engine instance (null while 3D is unavailable / in 2D Lite). */
export const engineRef: { current: Engine | null } = { current: null };

const idle = (fn: () => void, timeout = 1200) => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout }); else window.setTimeout(fn, 60);
};

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const labelEls = useRef(new Map<string, HTMLElement>());
  const { t } = useT();
  const view = useStore((s) => s.view); const floorId = useStore((s) => s.floorId); const unitId = useStore((s) => s.unitId); const roomKey = useStore((s) => s.roomKey);
  const hoverFloorId = useStore((s) => s.hoverFloorId); const ready = useStore((s) => s.ready3d); const landing = useStore((s) => s.landing);
  const enterRoom = useStore((s) => s.enterRoom); const selectUnit = useStore((s) => s.selectUnit); const setHoverKey = useStore((s) => s.setHoverKey);
  const section = useStore((s) => s.section); const focusRoom = useStore((s) => s.focusRoom);

  useEffect(() => {
    const canvas = canvasRef.current!; let disposed = false; let engine: Engine | null = null;
    // 3D is a separate chunk: the shell (navigation, floor list, facts) is usable before it arrives (V7 G3)
    import('../engine/Engine').then(async ({ Engine, detectTier }) => {
      if (disposed) return;
      try {
        const q = useStore.getState().quality; const tier = q === 'auto' || q === 'lite' ? detectTier() : q;
        useStore.getState().setTier(tier);
        engine = await Engine.create(canvas, {
          onVeil: (v) => { const el = veilRef.current; if (el) { el.style.opacity = String(v); el.style.visibility = v > 0.001 ? 'visible' : 'hidden'; } },
          onFloorTip: (tip) => { const el = tipRef.current; if (!el) return; if (!tip) { el.style.opacity = '0'; return; } el.style.opacity = '1'; el.style.transform = `translate3d(${Math.round(tip.x + 16)}px, ${Math.round(tip.y - 14)}px, 0)`; },
          onLabels: (list: LabelPos[]) => {
            for (const p of list) { const el = labelEls.current.get(p.id); if (!el) continue; el.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0) translate(-50%, -50%)`; el.style.visibility = p.hidden ? 'hidden' : 'visible'; }
          },
        }, tier);
        if (disposed) { engine.dispose(); return; }
        engineRef.current = engine; engine.start();
        useStore.setState({ webgl: 'ok', ready3d: true });
        if (import.meta.env.DEV || /[?&](hud|e2e)=1/.test(location.search)) { const eng = engine; (window as unknown as { __nakhla: unknown }).__nakhla = { engine: eng, store: useStore, audio: audioDebug, renderScene, runSlice: (n = 1) => import('../state/benchmark').then((b) => b.runSlice(eng, n)) }; }
        // prepare the hero floor and every finish off the interaction path
        // prepare the hero floor, then every finish, entirely off the interaction path
        const eng2 = engine;
        void eng2.prewarm('F04').then(() => { if (!disposed) void eng2.prewarmFinishes(CATALOG.map((m) => m.id)); });
      } catch (err) {
        console.error('[nakhla] 3D unavailable', err);
        useStore.setState({ webgl: 'unavailable', lite: true });
      }
    }).catch((err) => { console.error(err); useStore.setState({ webgl: 'unavailable', lite: true }); });
    return () => { disposed = true; engine?.dispose(); engineRef.current = null; useStore.setState({ ready3d: false }); };
  }, []);

  const anchors = useMemo(() => getAnchors({ view, floorId, unitId, roomKey }), [view, floorId, unitId, roomKey]);
  const plan = floorId ? getFloorPlan(floorId) : null;

  return (
    <div className="stage" data-ready={ready}>
      <canvas ref={canvasRef} className="stage-canvas" aria-label={t('a11y.canvas')} role="img" />
      {!ready && <div className="stage-loading" role="status"><span className="spinner" aria-hidden="true" />{t('ui.loading3d')}</div>}
      <div className="labels" aria-hidden={landing}>
        {anchors.map((a) => {
          const text = a.kind === 'unit' ? t('unit.name', { id: unitCode(a.target) }) : roomLabel(t, plan?.rooms.find((r) => r.key === a.target)?.kind ?? '');
          const onClick = () => { if (a.kind === 'unit') selectUnit(a.target); else if (section === 'design' && view === 'unit') focusRoom(a.target); else enterRoom(a.target); };
          return (
            <button key={a.id} type="button" className={`label label-${a.kind}`} data-minor={a.kind === 'room' && /bath|laundry|entry|dressing|hall|ensuite|master_bath|changing|lift|stair/.test(plan?.rooms.find((r) => r.key === a.target)?.kind ?? '') ? 'true' : undefined} tabIndex={-1} ref={(el) => { if (el) labelEls.current.set(a.id, el); else labelEls.current.delete(a.id); }}
              onClick={onClick} onPointerEnter={() => setHoverKey(a.target)} onPointerLeave={() => setHoverKey(null)}>
              {a.kind === 'portal' && <Icon name="forward" size={14} flip />}<span>{text}</span>
            </button>
          );
        })}
      </div>
      <div ref={tipRef} className="floor-tip" aria-hidden="true">
        {hoverFloorId && <><strong>{floorLabel(t, hoverFloorId)}</strong><span>{t(`floor.cat.${FLOOR_BY_ID[hoverFloorId].category}`)}</span></>}
      </div>
      <div ref={veilRef} className="veil" aria-hidden="true" />
    </div>
  );
}
