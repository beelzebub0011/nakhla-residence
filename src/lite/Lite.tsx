import { useMemo } from 'react';
import { useStore, sideOf } from '../state/store';
import { FLOORS, FLOOR_BY_ID, SLAB } from '../domain/tower';
import { POOL_BASIN, getFloorPlan, type PlacedRoom } from '../domain/plans';
import { getWalls } from '../domain/prims';
import { MATERIAL_BY_ID, resolveSurfaceMaterial, surfaceFor } from '../domain/materials';
import { roomDims } from '../domain/audit';
import { floorLabel, fmtNum, roomLabel, useT } from '../i18n';
import { ContextPanel } from '../ui/Panels';
import { Icon } from '../ui/Icon';

// 2D Lite: a complete, accessible alternative drawn from the SAME plan data as the 3D model.
// It is honest about what it is — an interactive plan, not a live PBR scene.

const Y = (y: number) => 24 - y; // north up

function LevelStack() {
  const { t } = useT(); const floorId = useStore((s) => s.floorId); const selectFloor = useStore((s) => s.selectFloor);
  const total = FLOORS.reduce((a, f) => a + f.floorToFloor, 0); const W = 120; const k = 300 / total;
  let y = 300;
  return (
    <svg viewBox={`0 0 ${W + 70} 312`} role="group" aria-label={t('lite.section')}>
      {FLOORS.map((f) => {
        const h = f.floorToFloor * k; y -= h; const sel = floorId === f.id;
        const fill = sel ? '#1f211f' : f.category === 'ground' ? '#57524c' : f.category === 'wellness' ? '#cfe3e6' : f.category === 'dining' ? '#ead9bf' : '#f4eee2';
        return (
          <g key={f.id} className="room" role="button" tabIndex={0} aria-pressed={sel} aria-label={`${floorLabel(t, f.id)} — ${t(`floor.cat.${f.category}`)}`}
            onClick={() => selectFloor(f.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFloor(f.id); } }} data-testid={`lite-floor-${f.id}`}>
            <rect x={4} y={y + 0.6} width={W} height={h - 1.2} fill={fill} stroke="#1f211f" strokeWidth={0.6} rx={1.5} />
            <text x={W + 12} y={y + h / 2 + 4} fontSize={11} fontWeight={sel ? 700 : 500} fill="#1f211f">{f.id === 'G' ? 'G' : String(f.number).padStart(2, '0')}</text>
            <text x={W / 2 + 4} y={y + h / 2 + 3.5} fontSize={8.5} textAnchor="middle" fill={sel || f.category === 'ground' ? '#faf7f1' : '#5f5f58'} style={{ pointerEvents: 'none' }}>{t(`floor.cat.${f.category}`)}</text>
          </g>
        );
      })}
      <line x1={0} y1={306} x2={W + 8} y2={306} stroke="#1f211f" strokeWidth={1.4} />
    </svg>
  );
}

function PlanSvg() {
  const { t, locale } = useT();
  const floorId = useStore((s) => s.floorId) ?? 'F04'; const unitId = useStore((s) => s.unitId); const roomKey = useStore((s) => s.roomKey);
  const pkg = useStore((s) => s.packageId); const overrides = useStore((s) => s.overrides);
  const selectUnit = useStore((s) => s.selectUnit); const enterRoom = useStore((s) => s.enterRoom); const selectFloor = useStore((s) => s.selectFloor);
  const plan = useMemo(() => getFloorPlan(floorId), [floorId]); const walls = useMemo(() => getWalls(floorId), [floorId]);
  const f = FLOOR_BY_ID[floorId];
  const pick = (r: PlacedRoom) => {
    if (useStore.getState().floorId !== floorId) selectFloor(floorId);
    if (r.owner === 'A' || r.owner === 'B') { const u = f.unitIds.find((x) => sideOf(x) === r.owner); if (!u) return; if (useStore.getState().unitId !== u) selectUnit(u); if (r.view) useStore.getState().enterRoom(r.key); }
    else if (r.view && r.tier !== 'proxy') enterRoom(r.key);
  };
  const fillOf = (r: PlacedRoom) => {
    if (r.outdoor) return '#e4ede2';
    if (r.owner === 'A' || r.owner === 'B') { const sid = surfaceFor(r.id, 'floor'); return sid ? MATERIAL_BY_ID[resolveSurfaceMaterial(sid, pkg, overrides)].swatch : '#e9e6df'; }
    return r.owner === 'core' ? '#dedbd3' : r.kind === 'pool' ? '#dfe9ea' : '#efe6d6';
  };
  return (
    <svg viewBox="-1.4 -1.6 20.8 27.4" role="group" aria-label={`${t('lite.plan')} — ${floorLabel(t, floorId)}`} data-testid="lite-plan">
      <rect x={0} y={0} width={18} height={24} fill="#fff" />
      {plan.rooms.map((r) => r.rects.map((q, i) => {
        const active = (r.owner === 'A' || r.owner === 'B' || (r.view && r.tier !== 'proxy')); const sel = roomKey === r.key || (unitId && !roomKey && r.owner === sideOf(unitId));
        return <rect key={`${r.key}${i}`} className={active ? 'room' : undefined} x={q.x0} y={Y(q.y1)} width={q.x1 - q.x0} height={q.y1 - q.y0} fill={fillOf(r)} fillOpacity={sel ? 1 : 0.72} stroke={sel ? '#8a6c4b' : 'none'} strokeWidth={0.12}
          role={active && i === 0 ? 'button' : undefined} tabIndex={active && i === 0 ? 0 : undefined} aria-pressed={active && i === 0 ? !!sel : undefined}
          aria-label={active && i === 0 ? `${roomLabel(t, r.kind)} ${fmtNum(roomDims(r).area, locale)} m²` : undefined} data-testid={i === 0 ? `lite-room-${r.key}` : undefined}
          onClick={active ? () => pick(r) : undefined} onKeyDown={active ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r); } } : undefined} />;
      }))}
      {f.category === 'wellness' && <rect x={POOL_BASIN.x0} y={Y(POOL_BASIN.y1)} width={POOL_BASIN.x1 - POOL_BASIN.x0} height={POOL_BASIN.y1 - POOL_BASIN.y0} fill="#4a9bb0" opacity={0.85} rx={0.15} style={{ pointerEvents: 'none' }} />}
      {walls.map((w, i) => {
        const op = w.opening; const r = w.rect;
        const fill = !op ? '#2b2d2b' : op.kind === 'window' || op.kind === 'slider' || op.kind === 'screen' ? '#8fc0cc' : op.kind === 'entry' ? '#8a6c4b' : '#ffffff';
        return <rect key={i} x={r.x0} y={Y(r.y1)} width={r.x1 - r.x0} height={r.y1 - r.y0} fill={fill} style={{ pointerEvents: 'none' }} />;
      })}
      {plan.rooms.filter((r) => r.kind !== 'lift' && r.kind !== 'service' && r.kind !== 'hall').map((r) => {
        const q = r.rects[0]; const w = q.x1 - q.x0, h = q.y1 - q.y0; if (Math.min(w, h) < 1.7 || w < 2.1) return null;
        const d = roomDims(r); const cx = (q.x0 + q.x1) / 2, cy = Y((q.y0 + q.y1) / 2);
        return <g key={`t${r.key}`} style={{ pointerEvents: 'none' }}><text x={cx} y={cy - 0.08} fontSize={Math.min(0.48, w / 9)} textAnchor="middle" fill="#1f211f" fontWeight={600}>{roomLabel(t, r.kind)}</text>
          <text x={cx} y={cy + 0.52} fontSize={0.36} textAnchor="middle" fill="#5f5f58">{fmtNum(d.area, locale)} m²</text></g>;
      })}
      <g style={{ pointerEvents: 'none' }} fontSize={0.42} fill="#5f5f58">
        <line x1={0} y1={25.1} x2={5} y2={25.1} stroke="#1f211f" strokeWidth={0.08} /><line x1={0} y1={24.9} x2={0} y2={25.3} stroke="#1f211f" strokeWidth={0.08} /><line x1={5} y1={24.9} x2={5} y2={25.3} stroke="#1f211f" strokeWidth={0.08} />
        <text x={2.5} y={24.85} textAnchor="middle">5 m</text>
        <text x={18} y={-0.7} textAnchor="end">N ↑</text>
        <text x={9} y={-0.7} textAnchor="middle" fill="#8a6c4b" fontWeight={700}>{t('concept.badge')}</text>
        <text x={18} y={25.2} textAnchor="end">{t('floor.height', { h: fmtNum(f.floorToFloor, locale) })} · slab {SLAB} m</text>
      </g>
    </svg>
  );
}

export function Lite() {
  const { t } = useT(); const set = useStore((s) => s.set); const webgl = useStore((s) => s.webgl); const quality = useStore((s) => s.quality);
  const floorId = useStore((s) => s.floorId);
  const can3d = webgl !== 'unavailable' && webgl !== 'lost' && quality !== 'lite';
  return (
    <div className="lite" data-testid="lite">
      <div className="lite-banner">
        <span><strong>{t('lite.title')}</strong> — {t('lite.note')}</span>
        {can3d && <button type="button" className="btn btn-secondary" onClick={() => set({ lite: false })} data-testid="back-3d"><Icon name="cube" size={16} />{t('ui.back3d')}</button>}
      </div>
      <div className="lite-grid">
        <section className="lite-card"><h2>{t('lite.section')}</h2><LevelStack /></section>
        <section className="lite-card"><h2>{t('lite.plan')} — {floorLabel(t, floorId ?? 'F04')}</h2><p className="fine">{t('lite.pick')}</p><PlanSvg /></section>
        <section className="lite-side"><ContextPanel /></section>
      </div>
    </div>
  );
}
