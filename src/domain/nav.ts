import type { FloorId, Opening, Rect } from './types';
import { getFloorPlan, POOL_BASIN, type FloorPlan, type PlacedRoom } from './plans';
import { getWalls } from './prims';
import { outdoorOpenEdges } from './wallgen';
import { furnishFloor } from './furniture';
import { FLOOR_BY_ID } from './tower';

// Walk graph + collision derived from the SAME plan data as the visible geometry.

export const PASSABLE: Opening['kind'][] = ['door', 'arch', 'slider'];
export const EYE_HEIGHT = 1.62;
export const BODY_RADIUS = 0.24;

export interface NavEdge { a: string; b: string; portal: [number, number]; opId: string; alongX: boolean }
export interface NavGraph {
  floorId: FloorId; plan: FloorPlan; edges: NavEdge[];
  /** solid obstacles at body height (walls, closed openings, tall furniture, balustrades) */
  solids: Rect[];
  /** obstacles that reach eye level — used to validate directed camera paths */
  tall: Rect[];
}

export function roomAt(plan: FloorPlan, x: number, y: number): PlacedRoom | null {
  for (const room of plan.rooms) for (const r of room.rects) if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return room;
  return null;
}

const cache = new Map<string, NavGraph>();

export function buildNav(floorId: FloorId): NavGraph {
  const cat = FLOOR_BY_ID[floorId].category;
  const hit = cache.get(cat);
  if (hit) return { ...hit, floorId };
  const plan = getFloorPlan(floorId); const walls = getWalls(floorId);
  const edges: NavEdge[] = [];
  for (const op of plan.openings) {
    if (!PASSABLE.includes(op.kind)) continue;
    const r = op.rect; const ax = r.x1 - r.x0 > r.y1 - r.y0;
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
    const off = (ax ? (r.y1 - r.y0) : (r.x1 - r.x0)) / 2 + 0.15;
    const ra = ax ? roomAt(plan, cx, cy - off) : roomAt(plan, cx - off, cy);
    const rb = ax ? roomAt(plan, cx, cy + off) : roomAt(plan, cx + off, cy);
    if (ra && rb && ra.key !== rb.key) edges.push({ a: ra.key, b: rb.key, portal: [cx, cy], opId: op.id, alongX: ax });
  }
  const solids: Rect[] = []; const tall: Rect[] = [];
  for (const w of walls) {
    if (w.opening && PASSABLE.includes(w.opening.kind)) continue;
    solids.push(w.rect); tall.push(w.rect);
  }
  for (const room of plan.rooms.filter((r) => r.outdoor)) {
    for (const e of outdoorOpenEdges(room, plan, walls)) {
      solids.push({ x0: Math.min(e.ax, e.bx) - 0.04, x1: Math.max(e.ax, e.bx) + 0.04, y0: Math.min(e.ay, e.by) - 0.04, y1: Math.max(e.ay, e.by) + 0.04 });
    }
  }
  for (const p of furnishFloor(floorId, true)) {
    if (p.k === 'box') {
      if (p.z0 > 1.3 || p.z1 < 0.25) continue;
      const rect = { x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1 };
      solids.push(rect); if (p.z1 > 1.5 && p.z0 < 1.7) tall.push(rect);
    } else if (p.k === 'cyl') {
      if (p.z0 > 1.3 || p.z1 < 0.25) continue;
      const rr = Math.max(p.r, p.r2 ?? 0);
      const rect = { x0: p.cx - rr, x1: p.cx + rr, y0: p.cy - rr, y1: p.cy + rr };
      solids.push(rect); if (p.z1 > 1.5 && p.z0 < 1.7) tall.push(rect);
    }
  }
  if (cat === 'wellness') solids.push(POOL_BASIN);
  const nav: NavGraph = { floorId, plan, edges, solids, tall };
  cache.set(cat, nav);
  return nav;
}

/** Breadth-first room path; returns the list of edges to traverse, or null when unreachable. */
export function roomPath(nav: NavGraph, from: string, to: string): NavEdge[] | null {
  if (from === to) return [];
  const prev = new Map<string, { room: string; edge: NavEdge }>();
  const q = [from]; const seen = new Set([from]);
  while (q.length) {
    const cur = q.shift()!;
    for (const e of nav.edges) {
      const nxt = e.a === cur ? e.b : e.b === cur ? e.a : null;
      if (!nxt || seen.has(nxt)) continue;
      seen.add(nxt); prev.set(nxt, { room: cur, edge: e }); q.push(nxt);
      if (nxt === to) {
        const path: NavEdge[] = []; let r = to;
        while (r !== from) { const p = prev.get(r)!; path.unshift(p.edge); r = p.room; }
        return path;
      }
    }
  }
  return null;
}

/** Waypoints (plan x,y) from a point in one room to a point in another, through door portals. */
export function waypoints(nav: NavGraph, from: [number, number], fromRoom: string, to: [number, number], toRoom: string): [number, number][] | null {
  const path = roomPath(nav, fromRoom, toRoom);
  if (!path) return null;
  const pts: [number, number][] = [from];
  let cur = fromRoom;
  for (const e of path) {
    const [px, py] = e.portal; const d = 0.42;
    // enter the portal perpendicular to its wall: a point before, the portal, a point after
    const before: [number, number] = e.alongX ? [px, py + (cur === e.a ? -d : d)] : [px + (cur === e.a ? -d : d), py];
    const after: [number, number] = e.alongX ? [px, py + (cur === e.a ? d : -d)] : [px + (cur === e.a ? d : -d), py];
    pts.push(before, [px, py], after);
    cur = cur === e.a ? e.b : e.a;
  }
  pts.push(to);
  return pts;
}

/** Resolve a body circle against the solids; returns the corrected position. */
export function resolveCollision(nav: NavGraph, x: number, y: number, radius = BODY_RADIUS): [number, number] {
  for (let iter = 0; iter < 6; iter++) {
    let moved = false;
    for (const r of nav.solids) {
      const qx = Math.max(r.x0, Math.min(x, r.x1)), qy = Math.max(r.y0, Math.min(y, r.y1));
      let dx = x - qx, dy = y - qy; const d2 = dx * dx + dy * dy;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-10) { const d = Math.sqrt(d2); x = qx + (dx / d) * radius; y = qy + (dy / d) * radius; }
      else {
        // centre is inside the rectangle: push out along the shallowest axis
        const l = x - r.x0, rr = r.x1 - x, b = y - r.y0, t = r.y1 - y; const m = Math.min(l, rr, b, t);
        if (m === l) x = r.x0 - radius; else if (m === rr) x = r.x1 + radius; else if (m === b) y = r.y0 - radius; else y = r.y1 + radius;
        dx = 0; dy = 0;
      }
      moved = true;
    }
    if (!moved) break;
  }
  return [x, y];
}

/** True when the straight segment a->b stays clear of obstacles that reach eye level. */
export function segmentClear(nav: NavGraph, a: [number, number], b: [number, number], pad = 0.12): boolean {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1));
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n;
    for (const r of nav.tall) if (x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad) return false;
  }
  return true;
}

/** Collision-free standing point for a room's authored viewpoint (never inside furniture). */
export function safeEye(floorId: FloorId, room: PlacedRoom): [number, number] {
  const r = room.rects[0]; const eye = room.view?.eye ?? [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
  const nav = buildNav(floorId); const [x, y] = resolveCollision(nav, eye[0], eye[1], BODY_RADIUS + 0.04);
  return roomAt(nav.plan, x, y)?.key === room.key ? [x, y] : [eye[0], eye[1]];
}
