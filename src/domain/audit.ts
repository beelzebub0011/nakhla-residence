import { polygonArea, rectsArea, type FloorId, type Rect, type UnitTypeId } from './types';
import { FLOORS, FLOOR_IDS, UNITS, UNIT_TYPES, FOOTPRINT, SITE } from './tower';
import { FOOT, UNIT_PLANS, getFloorPlan, type PlacedRoom } from './plans';
import { buildNav, roomPath, PASSABLE } from './nav';
import { buildFloorInterior, buildFloorShell, getWalls } from './prims';
import { SURFACES } from './materials';

// ---------------------------------------------------------------------------------------------
// V7 GATE 1 — geometry audit. Every figure the UI or Nakhla AI quotes comes from here, computed
// from the authored plan polygons. Status is "concept model measurement": coherent and
// reproducible, but NOT surveyed, NOT as-built and NOT reviewed by a licensed professional.
// ---------------------------------------------------------------------------------------------

export interface LedgerRow {
  semanticId: string;
  kind: string;
  areaSqm: number;
  widthM: number | null;
  depthM: number | null;
  source: 'authored_plan_polygons';
  status: 'concept_model_measured';
  professionallyVerified: false;
}
export interface AuditResult { ok: boolean; errors: string[]; ledger: LedgerRow[]; summary: Record<string, number | string> }

const r2 = (n: number) => Math.round(n * 100) / 100;
const overlap = (a: Rect, b: Rect) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1e-6 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 1e-6;
const pip = (pts: [number, number][], x: number, y: number) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export function roomDims(room: PlacedRoom): { area: number; w: number | null; d: number | null } {
  const area = rectsArea(room.rects);
  if (room.rects.length === 1) { const r = room.rects[0]; return { area, w: r2(r.x1 - r.x0), d: r2(r.y1 - r.y0) }; }
  return { area, w: null, d: null };
}

export function unitNetArea(typeId: UnitTypeId) { return polygonArea(UNIT_PLANS[typeId].outline); }
export function unitBalconyArea(typeId: UnitTypeId) { return rectsArea(UNIT_PLANS[typeId].rooms.filter((r) => r.outdoor).flatMap((r) => r.rects)); }

export function runAudit(): AuditResult {
  const errors: string[] = []; const ledger: LedgerRow[] = [];
  const must = (ok: boolean, msg: string) => { if (!ok) errors.push(msg); };

  must(FLOORS.length === 12, 'tower must have exactly 12 occupied levels');
  must(FLOORS.filter((f) => f.category === 'residential').length === 9, '9 residential levels');
  must(UNITS.length === 18, 'exactly 18 units');
  must(new Set(UNITS.map((u) => u.id)).size === 18, 'unit ids unique');
  must(new Set(FLOOR_IDS).size === 12, 'floor ids unique');
  must(FLOORS.every((f) => (f.category === 'residential' ? f.unitIds.length === 2 : f.unitIds.length === 0)), 'two units per residential floor, none elsewhere');
  must(UNITS.every((u) => FLOORS.find((f) => f.id === u.floorId)?.unitIds.includes(u.id)), 'unit -> floor parent consistency');
  for (let i = 1; i < FLOORS.length; i++) must(Math.abs(FLOORS[i].ffl - (FLOORS[i - 1].ffl + FLOORS[i - 1].floorToFloor)) < 1e-6, `level stack continuity at ${FLOORS[i].id}`);
  must(FOOTPRINT.w <= SITE.frontage && FOOTPRINT.d <= SITE.depth, 'footprint fits site hypothesis');

  const seenCats = new Set<string>();
  for (const f of FLOORS) {
    if (seenCats.has(f.category)) continue; seenCats.add(f.category);
    const id = f.id as FloorId; const plan = getFloorPlan(id); const walls = getWalls(id); const nav = buildNav(id);
    must(new Set(plan.rooms.map((r) => r.key)).size === plan.rooms.length, `${id}: duplicate room keys`);
    const all = plan.rooms.flatMap((r) => r.rects.map((q) => ({ key: r.key, q, outdoor: !!r.outdoor })));
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) must(!overlap(all[i].q, all[j].q), `${id}: rooms overlap ${all[i].key} / ${all[j].key}`);
    for (const a of all) if (!a.outdoor) must(a.q.x0 >= FOOT.x0 + 0.24 - 1e-6 && a.q.x1 <= FOOT.x1 - 0.24 + 1e-6 && a.q.y0 >= FOOT.y0 + 0.24 - 1e-6 && a.q.y1 <= FOOT.y1 - 0.24 + 1e-6, `${id}: indoor room ${a.key} breaches external wall zone`);
    for (const op of plan.openings) {
      must(!all.some((a) => overlap(a.q, op.rect)), `${id}: opening ${op.id} overlaps a room (must sit in a wall)`);
      must(walls.some((w) => w.opening?.id === op.id), `${id}: opening ${op.id} cuts no wall`);
      must(op.head > op.sill && op.head <= f.floorToFloor, `${id}: opening ${op.id} heights invalid`);
      if (PASSABLE.includes(op.kind) && !op.facade) must(nav.edges.some((e) => e.opId === op.id), `${id}: passable opening ${op.id} does not connect two rooms`);
    }
    must(new Set(plan.openings.map((o) => o.id)).size === plan.openings.length, `${id}: duplicate opening ids`);
    // wall thickness sanity: no sliver thinner than 100 mm
    for (const w of walls) must(Math.min(w.rect.x1 - w.rect.x0, w.rect.y1 - w.rect.y0) >= 0.1 - 1e-6, `${id}: wall sliver ${JSON.stringify(w.rect)}`);
    // reachability
    if (f.category === 'residential') {
      for (const side of ['A', 'B'] as const) {
        const rooms = plan.rooms.filter((r) => r.owner === side);
        for (const r of rooms) must(roomPath(nav, `${side}.entry`, r.key) !== null, `${id}: ${r.key} unreachable from entry`);
      }
    } else {
      for (const r of plan.rooms.filter((x) => x.owner === 'zone' && x.tier !== 'proxy')) must(roomPath(nav, 'core.lobby', r.key) !== null, `${id}: ${r.key} unreachable from lobby`);
    }
    for (const room of plan.rooms) {
      const d = roomDims(room);
      ledger.push({ semanticId: `${f.category}:${room.key}`, kind: room.kind, areaSqm: r2(d.area), widthM: d.w, depthM: d.d, source: 'authored_plan_polygons', status: 'concept_model_measured', professionallyVerified: false });
    }
    // every prim carries a semantic id
    const prims = [...buildFloorShell(id), ...buildFloorInterior(id)];
    must(prims.every((p) => p.sem && p.mat), `${id}: prim without semantic id or material`);
    if (f.category === 'residential') {
      const surfs = new Set(prims.map((p) => p.surf).filter(Boolean));
      for (const s of SURFACES) must(surfs.has(s.id), `surface ${s.id} has no geometry`);
      for (const s of surfs) must(SURFACES.some((x) => x.id === s), `geometry references unknown surface ${s}`);
    }
  }

  for (const typeId of ['TYPE_A', 'TYPE_B'] as UnitTypeId[]) {
    const plan = UNIT_PLANS[typeId]; const net = unitNetArea(typeId); const concept = UNIT_TYPES[typeId].conceptAreaSqm;
    must(Math.abs(net - concept) / concept < 0.01, `${typeId}: modelled net area ${net.toFixed(2)} deviates >1% from concept ${concept}`);
    for (const room of plan.rooms) {
      if (room.outdoor) continue;
      for (const q of room.rects) for (const [x, y] of [[q.x0 + 0.01, q.y0 + 0.01], [q.x1 - 0.01, q.y0 + 0.01], [q.x1 - 0.01, q.y1 - 0.01], [q.x0 + 0.01, q.y1 - 0.01]])
        must(pip(plan.outline, x, y), `${typeId}: room ${room.id} outside unit outline`);
    }
    const indoor = rectsArea(plan.rooms.filter((r) => !r.outdoor).flatMap((r) => r.rects));
    must(indoor < net, `${typeId}: clear room area must be below net internal area`);
    ledger.push({ semanticId: `${typeId}:net_internal`, kind: 'unit_net_internal', areaSqm: r2(net), widthM: null, depthM: null, source: 'authored_plan_polygons', status: 'concept_model_measured', professionallyVerified: false });
    ledger.push({ semanticId: `${typeId}:balcony`, kind: 'unit_balcony', areaSqm: r2(unitBalconyArea(typeId)), widthM: null, depthM: null, source: 'authored_plan_polygons', status: 'concept_model_measured', professionallyVerified: false });
  }

  const summary = {
    floors: FLOORS.length, units: UNITS.length,
    typeANetSqm: r2(unitNetArea('TYPE_A')), typeBNetSqm: r2(unitNetArea('TYPE_B')),
    typeABalconySqm: r2(unitBalconyArea('TYPE_A')), typeBBalconySqm: r2(unitBalconyArea('TYPE_B')),
    plateSqm: FOOTPRINT.w * FOOTPRINT.d, towerTopM: r2(FLOORS[11].ffl + FLOORS[11].floorToFloor),
    ledgerRows: ledger.length, status: 'CONCEPT • NOT BUILT • not professionally verified',
  };
  return { ok: errors.length === 0, errors, ledger, summary };
}
