import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useStore, sideOf } from '../state/store';
import { FLOORS, FLOOR_BY_ID, UNIT_TYPES } from '../domain/tower';
import { POOL_BASIN, getFloorPlan, type PlacedRoom } from '../domain/plans';
import { getWalls } from '../domain/prims';
import { furnishFloor } from '../domain/furniture';
import { MATERIAL_BY_ID, resolveSurfaceMaterial, surfaceFor } from '../domain/materials';
import { roomDims, unitNetArea } from '../domain/audit';
import { compactValue, PRICE_BY_UNIT } from '../domain/pricing';
import { floorLabel, fmtNum, roomLabel, useT, type MsgKey } from '../i18n';
import type { FloorId } from '../domain/types';
import { Icon, LogoMark } from '../ui/Icon';
import { ExperienceSwitch } from '../ui/ExperienceSwitch';
import { sceneForPlace } from '../visual/catalog';
import './plans.css';

// ---------------------------------------------------------------------------------------------
// V12 — the 2D PLANS section (third experience, rebuilt from scratch on owner + visitor feedback).
// Vector drawings generated from the SAME plan data as the 3D model: walls with door swings and windows,
// furniture outlines from the furniture footprints, dimension lines, north arrow and scale. SVG, so it stays
// sharp at any zoom. Drag / pinch / wheel to zoom, a level picker, and a details card (bottom sheet on phones)
// with previous / next room, Open in 3D and See the photo.
// ---------------------------------------------------------------------------------------------

const W = 18, H = 24; const Y = (y: number) => H - y;
type VB = { x: number; y: number; w: number; h: number };
const FULL: VB = { x: -2.2, y: -2.2, w: W + 4.4, h: H + 4.4 };
const isUnit = (r: PlacedRoom) => r.owner === 'A' || r.owner === 'B';

const furnCache = new Map<string, { x0: number; x1: number; y0: number; y1: number }[]>();
function furnitureOf(f: FloorId) {
  const cat = FLOOR_BY_ID[f].category; const k = cat === 'residential' ? 'res' : f;
  let v = furnCache.get(k);
  if (!v) {
    v = [];
    for (const p of furnishFloor(f, 'nav')) if (p.k === 'box') { const a = (p.x1 - p.x0) * (p.y1 - p.y0); if (a > 0.04 && a < 14 && p.z1 - p.z0 > 0.2) v.push({ x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1 }); }
    furnCache.set(k, v);
  }
  return v;
}

export function Plans() {
  const { t, locale } = useT();
  const floorId = (useStore((s) => s.floorId) ?? 'F04') as FloorId; const roomKey = useStore((s) => s.roomKey); const unitId = useStore((s) => s.unitId);
  const pkg = useStore((s) => s.packageId); const overrides = useStore((s) => s.overrides);
  const openOverlay = useStore((s) => s.openOverlay);
  const plan = useMemo(() => getFloorPlan(floorId), [floorId]); const walls = useMemo(() => getWalls(floorId), [floorId]);
  const furn = useMemo(() => furnitureOf(floorId), [floorId]); const fdef = FLOOR_BY_ID[floorId];
  const [vb, setVb] = useState<VB>(FULL); const [layers, setLayers] = useState({ furn: true, dims: true, names: true });
  const [sheet, setSheet] = useState<'peek' | 'open'>('peek'); const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null); const ptrs = useRef(new Map<number, { x: number; y: number }>()); const moved = useRef(0);
  const room = roomKey ? plan.rooms.find((r) => r.key === roomKey) ?? null : null;
  const pickable = (r: PlacedRoom) => isUnit(r) || (r.view && r.tier !== 'proxy') || r.owner === 'zone' || r.key === 'core.lobby';
  const order = useMemo(() => plan.rooms.filter((r) => pickable(r) && r.kind !== 'hall' && r.kind !== 'lift' && r.kind !== 'service' && r.kind !== 'stair'), [plan]);

  const setFloor = (f: FloorId) => { useStore.setState({ floorId: f, unitId: null, roomKey: null }); setVb(FULL); setTip(null); };
  const pick = useCallback((r: PlacedRoom | null) => {
    if (!r) { useStore.setState({ roomKey: null, unitId: null }); return; }
    const u = isUnit(r) ? fdef.unitIds.find((x) => sideOf(x) === r.owner) ?? null : null;
    useStore.setState({ roomKey: r.key, unitId: u }); setSheet('open');
  }, [fdef]);
  const step = (d: number) => { if (!order.length) return; const i = room ? order.findIndex((r) => r.key === room.key) : -1; pick(order[(i + d + order.length) % order.length]); };

  // ---- pan / pinch / wheel zoom on the viewBox (vector, so it stays sharp)
  const toLocal = (cx: number, cy: number, v: VB) => { const r = svgRef.current!.getBoundingClientRect(); const s = Math.max(v.w / r.width, v.h / r.height); const ox = (r.width * s - v.w) / 2, oy = (r.height * s - v.h) / 2; return { x: v.x - ox + (cx - r.left) * s, y: v.y - oy + (cy - r.top) * s, s }; };
  const zoomAt = (cx: number, cy: number, k: number) => setVb((v) => { const p = toLocal(cx, cy, v); const w = Math.min(FULL.w * 1.4, Math.max(2.5, v.w * k)), h = (v.h * w) / v.w; return { x: p.x - ((p.x - v.x) * w) / v.w, y: p.y - ((p.y - v.y) * h) / v.h, w, h }; });
  const zoomBtn = (k: number) => { const r = svgRef.current!.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, k); };
  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0015)); };
    el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel);
  });
  const onDown = (e: RPointerEvent<SVGSVGElement>) => { ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = 0; };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const prev = ptrs.current.get(e.pointerId); if (!prev) return;
    const all = [...ptrs.current.entries()];
    if (all.length === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y; moved.current += Math.abs(dx) + Math.abs(dy);
      if (moved.current > 6) { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); setVb((v) => { const s = toLocal(0, 0, v).s; return { ...v, x: v.x - dx * s, y: v.y - dy * s }; }); setTip(null); }
    } else if (all.length === 2) {
      const other = all.find(([id]) => id !== e.pointerId)![1]; const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (d0 > 0 && d1 > 0) zoomAt((e.clientX + other.x) / 2, (e.clientY + other.y) / 2, d0 / d1); moved.current += 20;
    }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onUp = (e: RPointerEvent<SVGSVGElement>) => { ptrs.current.delete(e.pointerId); };

  const fillOf = (r: PlacedRoom) => {
    if (r.outdoor) return '#e3ecdf';
    if (isUnit(r)) { const sid = surfaceFor(r.id, 'floor'); return sid ? MATERIAL_BY_ID[resolveSurfaceMaterial(sid, pkg, overrides)].swatch : '#efe9df'; }
    if (r.kind === 'lift' || r.kind === 'service') return '#d6d2ca'; if (r.kind === 'stair') return '#e2ded6';
    return r.owner === 'core' ? '#ebe7df' : r.kind === 'pool' ? '#dcebee' : '#f1e9dc';
  };
  const roomAt = (x: number, y: number) => plan.rooms.find((r) => r.rects.some((q) => x > q.x0 && x < q.x1 && y > q.y0 && y < q.y1));
  const k = vb.w / FULL.w;   // < 1 when zoomed in: labels and dimension text scale with the zoom so they stay readable
  const fs = (base: number) => base * Math.max(0.42, Math.min(1, k * 1.15));
  const scene = room ? sceneForPlace({ floorId, unitId, roomKey: room.key, view: 'room', timeMinutes: 900 }) : null;
  const priceOf = (u: string) => compactValue(PRICE_BY_UNIT[u].total[pkg], locale);

  return (
    <div className="pl" data-testid="plans" data-sheet={sheet}>
      <header className="pl-bar">
        <div className="pl-brand"><LogoMark size={22} /><span><b>{t('brand.name')}</b><small>{t('concept.badge')}</small></span></div>
        <ExperienceSwitch />
        <div className="pl-utils">
          <button type="button" className="pl-icon" onClick={() => openOverlay('ai')} aria-label={t('ui.ask')} data-tip={t('ui.ask')}><Icon name="ask" size={18} /></button>
          <button type="button" className="pl-icon" onClick={() => openOverlay('lang')} aria-label={t('ui.language')} data-tip={t('ui.language')}><Icon name="globe" size={18} /></button>
        </div>
      </header>

      <nav className="pl-levels" aria-label={t('pl.levels')}>
        <p className="pl-cap">{t('pl.building')}</p>
        <ol>{[...FLOORS].reverse().map((f) => (
          <li key={f.id}><button type="button" aria-pressed={f.id === floorId} ref={(el) => { if (el && f.id === floorId) el.scrollIntoView({ block: 'nearest', inline: 'center' }); }} onClick={() => setFloor(f.id)} data-testid={`lite-floor-${f.id}`} data-tip={`${floorLabel(t, f.id)} · ${t(`floor.cat.${f.category}`)}`}>
            <span className="pl-lv-n">{f.id === 'G' ? 'G' : String(f.number).padStart(2, '0')}</span><span className={`pl-lv-bar pl-cat-${f.category}`} /><span className="pl-lv-t">{t(`floor.cat.${f.category}`)}</span>
          </button></li>))}</ol>
      </nav>

      <main className="pl-canvas" aria-label={`${t('xp.plans')} — ${floorLabel(t, floorId)}`}>
        <div className="pl-canvas-head"><h1>{floorLabel(t, floorId)}</h1><span>{t(`floor.cat.${fdef.category}`)}</span>
          <div className="pl-tools" role="toolbar" aria-label={t('pl.layers')}>
          <button type="button" onClick={() => zoomBtn(0.7)} aria-label={t('vs.zoom')} data-tip={t('vs.zoom')}><Icon name="zoomIn" size={18} /></button>
          <button type="button" onClick={() => zoomBtn(1 / 0.7)} aria-label={t('vs.zoomOut')} data-tip={t('vs.zoomOut')}><Icon name="zoomOut" size={18} /></button>
          <button type="button" onClick={() => setVb(FULL)} aria-label={t('pl.fit')} data-tip={t('pl.fit')}><Icon name="reset" size={17} /></button>
          <span className="pl-sep" aria-hidden="true" />
          {([['furn', 'pl.furniture', 'layers'], ['dims', 'pl.dims', 'scale'], ['names', 'pl.names', 'tag']] as const).map(([id, key, ic]) => (
            <button key={id} type="button" aria-pressed={layers[id]} onClick={() => setLayers((l) => ({ ...l, [id]: !l[id] }))} aria-label={t(key)} data-tip={t(key)}><Icon name={ic} size={17} /></button>))}
        </div>
        </div>
        <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" data-testid="lite-plan" role="group" aria-label={`${floorLabel(t, floorId)}`}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => setTip(null)}>
          <defs><pattern id="pl-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="#e9e4da" strokeWidth="0.015" /></pattern></defs>
          <rect x={-2.2} y={-2.2} width={W + 4.4} height={H + 4.4} fill="url(#pl-grid)" />
          {/* rooms */}
          {plan.rooms.map((r) => r.rects.map((q, i) => {
            const can = pickable(r); const sel = room?.key === r.key || (!!unitId && !room && isUnit(r) && r.owner === sideOf(unitId));
            return <rect key={`${r.key}${i}`} className={`pl-room${can ? ' can' : ''}${sel ? ' sel' : ''}`} x={q.x0} y={Y(q.y1)} width={q.x1 - q.x0} height={q.y1 - q.y0} fill={fillOf(r)}
              role={can && i === 0 ? 'button' : undefined} tabIndex={can && i === 0 ? 0 : undefined} aria-pressed={can && i === 0 ? sel : undefined}
              aria-label={can && i === 0 ? `${roomLabel(t, r.kind)} · ${fmtNum(roomDims(r).area, locale)} m²` : undefined} data-testid={i === 0 ? `lite-room-${r.key}` : undefined}
              onClick={can ? () => { if (moved.current < 7) pick(r); } : undefined} onKeyDown={can ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r); } } : undefined}
              onPointerMove={(e) => { if (ptrs.current.size === 0) setTip({ x: e.clientX, y: e.clientY, text: `${roomLabel(t, r.kind)} · ${fmtNum(roomDims(r).area, locale)} m²` }); }} />;
          }))}
          {fdef.category === 'wellness' && <rect x={POOL_BASIN.x0} y={Y(POOL_BASIN.y1)} width={POOL_BASIN.x1 - POOL_BASIN.x0} height={POOL_BASIN.y1 - POOL_BASIN.y0} fill="#7fbfcf" rx={0.12} className="pl-noev" />}
          {/* furniture outlines */}
          {layers.furn && <g className="pl-noev pl-furn">{furn.map((b, i) => <rect key={i} x={b.x0} y={Y(b.y1)} width={b.x1 - b.x0} height={b.y1 - b.y0} rx={0.05} />)}</g>}
          {/* walls, windows, doors */}
          <g className="pl-noev">
            {walls.map((w, i) => {
              const r = w.rect; const op = w.opening;
              if (!op) return <rect key={i} x={r.x0} y={Y(r.y1)} width={r.x1 - r.x0} height={r.y1 - r.y0} fill="#2a2826" />;
              const horiz = r.x1 - r.x0 >= r.y1 - r.y0;
              if (op.kind === 'window' || op.kind === 'screen') return <g key={i}><rect x={r.x0} y={Y(r.y1)} width={r.x1 - r.x0} height={r.y1 - r.y0} fill="#ffffff" stroke="#2a2826" strokeWidth={0.03} />
                {horiz ? <line x1={r.x0} x2={r.x1} y1={Y((r.y0 + r.y1) / 2)} y2={Y((r.y0 + r.y1) / 2)} stroke="#5aa6bd" strokeWidth={0.05} /> : <line y1={Y(r.y0)} y2={Y(r.y1)} x1={(r.x0 + r.x1) / 2} x2={(r.x0 + r.x1) / 2} stroke="#5aa6bd" strokeWidth={0.05} />}</g>;
              if (op.kind === 'slider') return <g key={i}><rect x={r.x0} y={Y(r.y1)} width={r.x1 - r.x0} height={r.y1 - r.y0} fill="#ffffff" />
                {horiz ? <><line x1={r.x0} x2={(r.x0 + r.x1) / 2 + 0.1} y1={Y(r.y0 + (r.y1 - r.y0) * 0.35)} y2={Y(r.y0 + (r.y1 - r.y0) * 0.35)} stroke="#5aa6bd" strokeWidth={0.05} /><line x1={(r.x0 + r.x1) / 2 - 0.1} x2={r.x1} y1={Y(r.y0 + (r.y1 - r.y0) * 0.65)} y2={Y(r.y0 + (r.y1 - r.y0) * 0.65)} stroke="#5aa6bd" strokeWidth={0.05} /></>
                  : <><line y1={Y(r.y0)} y2={Y((r.y0 + r.y1) / 2 + 0.1)} x1={r.x0 + (r.x1 - r.x0) * 0.35} x2={r.x0 + (r.x1 - r.x0) * 0.35} stroke="#5aa6bd" strokeWidth={0.05} /><line y1={Y((r.y0 + r.y1) / 2 - 0.1)} y2={Y(r.y1)} x1={r.x0 + (r.x1 - r.x0) * 0.65} x2={r.x0 + (r.x1 - r.x0) * 0.65} stroke="#5aa6bd" strokeWidth={0.05} /></>}</g>;
              if (op.kind === 'arch') return <rect key={i} x={r.x0} y={Y(r.y1)} width={r.x1 - r.x0} height={r.y1 - r.y0} fill={fillOf(roomAt((r.x0 + r.x1) / 2 + (horiz ? 0 : 0.3), (r.y0 + r.y1) / 2 + (horiz ? 0.3 : 0)) ?? plan.rooms[0])} />;
              // door / entry: opening gap + leaf + swing arc into the room on the far side
              const len = horiz ? r.x1 - r.x0 : r.y1 - r.y0; const mid = horiz ? (r.y0 + r.y1) / 2 : (r.x0 + r.x1) / 2;
              const into = horiz ? (roomAt(r.x0 + len / 2, r.y1 + 0.4) ? 1 : -1) : (roomAt(r.x1 + 0.4, r.y0 + len / 2) ? 1 : -1);
              const hx = horiz ? r.x0 : mid, hy = horiz ? mid : r.y0; const lx = horiz ? hx : hx + into * len, ly = horiz ? hy + into * len : hy; const ex = horiz ? r.x1 : hx, ey = horiz ? hy : r.y1;
              const sweep = horiz ? (into > 0 ? 1 : 0) : (into > 0 ? 0 : 1);
              return <g key={i}><rect x={r.x0} y={Y(r.y1)} width={r.x1 - r.x0} height={r.y1 - r.y0} fill="#ffffff" />
                <line x1={hx} y1={Y(hy)} x2={lx} y2={Y(ly)} stroke={op.kind === 'entry' ? '#8a6c4b' : '#2a2826'} strokeWidth={0.045} />
                <path d={`M ${lx} ${Y(ly)} A ${len} ${len} 0 0 ${sweep} ${ex} ${Y(ey)}`} fill="none" stroke="#9a948a" strokeWidth={0.02} strokeDasharray="0.08 0.06" /></g>;
            })}
          </g>
          {/* labels */}
          {layers.names && <g className="pl-noev">
            {plan.rooms.filter((r) => r.kind !== 'lift' && r.kind !== 'service' && r.kind !== 'hall').map((r) => {
              const q = r.rects[0]; const w = q.x1 - q.x0, h = q.y1 - q.y0; if (Math.min(w, h) < 1.3) return null; const d = roomDims(r); const cx = (q.x0 + q.x1) / 2, cy = Y((q.y0 + q.y1) / 2);
              const f1 = Math.min(fs(0.4), w / 8);
              return <g key={`l${r.key}`}><text x={cx} y={cy - f1 * 0.25} fontSize={f1} className="pl-t1" textAnchor="middle">{roomLabel(t, r.kind)}</text>
                <text x={cx} y={cy + f1 * 0.95} fontSize={f1 * 0.72} className="pl-t2" textAnchor="middle">{fmtNum(d.area, locale)} m²</text>
                {layers.dims && d.w && d.d && <text x={cx} y={cy + f1 * 1.85} fontSize={f1 * 0.66} className="pl-t3" textAnchor="middle" direction="ltr">{fmtNum(d.w, locale, 2)} × {fmtNum(d.d, locale, 2)}</text>}</g>;
            })}
          </g>}
          {/* dimension lines, north arrow, scale bar */}
          {layers.dims && <g className="pl-noev pl-dim">
            <line x1={0} x2={W} y1={-0.9} y2={-0.9} /><line x1={0} x2={0} y1={-1.15} y2={-0.65} /><line x1={W} x2={W} y1={-1.15} y2={-0.65} />
            <text x={W / 2} y={-1.08} fontSize={fs(0.42)} textAnchor="middle" direction="ltr">{fmtNum(W, locale, 2)} m</text>
            <line x1={-0.9} x2={-0.9} y1={0} y2={H} /><line x1={-1.15} x2={-0.65} y1={0} y2={0} /><line x1={-1.15} x2={-0.65} y1={H} y2={H} />
            <text x={-1.1} y={H / 2} fontSize={fs(0.42)} textAnchor="middle" transform={`rotate(-90 -1.1 ${H / 2})`} direction="ltr">{fmtNum(H, locale, 2)} m</text>
          </g>}
          <g className="pl-noev" transform={`translate(${W + 1.15} 0.2)`}><circle r={0.55} cx={0} cy={0.6} fill="#fff" stroke="#2a2826" strokeWidth={0.03} /><path d="M0 0.12 L0.22 0.86 L0 0.72 L-0.22 0.86 Z" fill="#2a2826" /><text y={1.62} fontSize={0.34} textAnchor="middle" className="pl-t2">{t('pl.north')}</text></g>
          <g className="pl-noev pl-dim" transform={`translate(0 ${H + 0.9})`}><line x1={0} x2={5} y1={0} y2={0} strokeWidth={0.08} /><line x1={0} x2={0} y1={-0.2} y2={0.2} /><line x1={5} x2={5} y1={-0.2} y2={0.2} /><text x={2.5} y={0.62} fontSize={fs(0.36)} textAnchor="middle" direction="ltr">5 m</text></g>
        </svg>
        <p className="pl-note">{t('pl.note')}</p>
        {tip && <div className="pl-tip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">{tip.text}</div>}
      </main>

      <aside className="pl-info" aria-live="polite">
        <button type="button" className="pl-handle" onClick={() => setSheet((s) => (s === 'open' ? 'peek' : 'open'))} aria-label={t('pl.close')} aria-expanded={sheet === 'open'}><span /></button>
        {!room && !unitId && (
          <div className="pl-card">
            <h2>{floorLabel(t, floorId)}</h2>
            <p className="pl-sub">{t('pl.height')}: {fmtNum(fdef.clear, locale, 2)} m · {t(`floor.cat.${fdef.category}`)}</p>
            {fdef.category === 'residential' ? <div className="pl-units">{fdef.unitIds.map((u) => { const tid = u.endsWith('A') ? 'TYPE_A' as const : 'TYPE_B' as const; const ty = UNIT_TYPES[tid]; const r0 = plan.rooms.find((r) => r.owner === sideOf(u) && r.kind === 'living'); return (
              <button key={u} type="button" className="pl-unit" onClick={() => r0 && pick(r0)} data-tip={t('pl.pick')}>
                <b>{t(u.endsWith('A') ? 'unit.typeA' : 'unit.typeB')}</b><span>{t('pl.bedrooms', { n: ty.bedrooms })} · {fmtNum(unitNetArea(tid), locale)} m²</span><em><bdi>{t('price.demoShort')}: {priceOf(u)}</bdi></em>
              </button>); })}</div>
              : <ul className="pl-zones">{plan.rooms.filter((r) => r.owner === 'zone').map((r) => <li key={r.key}><button type="button" onClick={() => pick(r)}><span>{roomLabel(t, r.kind)}</span><small>{fmtNum(roomDims(r).area, locale)} m²</small></button></li>)}</ul>}
            <p className="pl-hint">{t('pl.pick')}</p>
          </div>
        )}
        {(room || unitId) && (() => { const r = room ?? plan.rooms.find((x) => isUnit(x) && unitId && x.owner === sideOf(unitId))!; const d = roomDims(r); const sid = isUnit(r) ? surfaceFor(r.id, 'floor') : null; return (
          <div className="pl-card">
            <div className="pl-card-top">
              <button type="button" className="pl-icon" onClick={() => step(-1)} aria-label={t('pl.prevRoom')} data-tip={t('pl.prevRoom')}><span className="pl-flip"><Icon name="back" size={18} /></span></button>
              <span className="pl-step">{order.length ? `${Math.max(1, order.findIndex((x) => x.key === r.key) + 1)} / ${order.length}` : ''}</span>
              <button type="button" className="pl-icon" onClick={() => step(1)} aria-label={t('pl.nextRoom')} data-tip={t('pl.nextRoom')}><span className="pl-arrow"><Icon name="back" size={18} /></span></button>
            </div>
            <h2>{roomLabel(t, r.kind)}</h2>
            <p className="pl-sub">{isUnit(r) && unitId ? t('unit.name', { id: unitId.slice(1) }) : floorLabel(t, floorId)}</p>
            <dl className="pl-facts">
              {d.w && d.d && <div><dt>{t('pl.size')}</dt><dd dir="ltr">{fmtNum(d.w, locale, 2)} × {fmtNum(d.d, locale, 2)} m</dd></div>}
              <div><dt>{t('pl.area')}</dt><dd>{fmtNum(d.area, locale)} m²</dd></div>
              <div><dt>{t('pl.height')}</dt><dd>{fmtNum(fdef.clear, locale, 2)} m</dd></div>
              {sid && <div><dt>{t('pl.finish')}</dt><dd>{MATERIAL_BY_ID[resolveSurfaceMaterial(sid, pkg, overrides)].name[locale]}</dd></div>}
            </dl>
            <div className="pl-actions">
              <button type="button" className="pl-btn pl-btn-solid" onClick={() => { useStore.setState({ view: r.view ? 'room' : unitId ? 'unit' : 'floor', mode: 'guided', section: isUnit(r) ? 'tour' : 'amenities' }); useStore.getState().chooseExperience('3d'); }} data-testid="pl-open3d"><Icon name="cube" size={16} />{t('pl.open3d')}</button>
              {scene && <button type="button" className="pl-btn" onClick={() => { useStore.setState({ sceneId: scene.sceneId }); useStore.getState().chooseExperience('visual'); }}><Icon name="camera" size={16} />{t('pl.photo')}</button>}
            </div>
            <button type="button" className="pl-link" onClick={() => pick(null)}>{t('pl.close')}</button>
          </div>); })()}
      </aside>
    </div>
  );
}
