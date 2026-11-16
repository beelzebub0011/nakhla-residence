import type { FloorId } from '../domain/types';
import { FLOOR_BY_ID } from '../domain/tower';
import { UNIT_BOUNDS, getFloorPlan } from '../domain/plans';
import { rectCenter } from '../domain/types';
import { buildNav } from '../domain/nav';
import type { AppState } from './store';

// Hotspot anchors shared by the 3D engine (projection) and the HTML label layer (text + action).

export interface Anchor {
  id: string;
  kind: 'unit' | 'room' | 'portal';
  floorId: FloorId;
  plan: [number, number];
  z: number;            // metres above the floor's FFL
  /** unit id for kind=unit, room key otherwise */
  target: string;
}

type S = Pick<AppState, 'view' | 'floorId' | 'unitId' | 'roomKey'>;

export function getAnchors(s: S): Anchor[] {
  if (!s.floorId || s.view === 'tower') return [];
  const f = FLOOR_BY_ID[s.floorId]; const plan = getFloorPlan(s.floorId); const out: Anchor[] = [];
  if (s.view === 'floor') {
    if (f.category === 'residential') {
      for (const u of f.unitIds) { const b = UNIT_BOUNDS[u.endsWith('A') ? 'A' : 'B']; out.push({ id: `unit:${u}`, kind: 'unit', floorId: f.id, plan: rectCenter(b), z: 3.4, target: u }); }
    } else {
      for (const r of plan.rooms) if (r.owner === 'zone' && r.view && r.tier !== 'proxy') out.push({ id: `room:${r.key}`, kind: 'room', floorId: f.id, plan: rectCenter(r.rects[0]), z: 2.2, target: r.key });
    }
  } else if (s.view === 'unit' && s.unitId) {
    const side = s.unitId.endsWith('A') ? 'A' : 'B';
    for (const r of plan.rooms) if (r.owner === side && r.view && r.kind !== 'hall') out.push({ id: `room:${r.key}`, kind: 'room', floorId: f.id, plan: rectCenter(r.rects[0]), z: 1.5, target: r.key });
  } else if (s.view === 'room' && s.roomKey) {
    const nav = buildNav(s.floorId);
    for (const e of nav.edges) {
      const other = e.a === s.roomKey ? e.b : e.b === s.roomKey ? e.a : null; if (!other) continue;
      const room = plan.rooms.find((r) => r.key === other); if (!room?.view) continue;
      out.push({ id: `portal:${e.opId}`, kind: 'portal', floorId: f.id, plan: e.portal, z: 1.25, target: other });
    }
  }
  return out;
}
