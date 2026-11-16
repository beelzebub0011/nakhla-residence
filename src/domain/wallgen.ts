import type { Opening, Rect } from './types';
import type { FloorPlan, PlacedRoom } from './plans';
import { FOOT } from './plans';

// Wall solids are the COMPLEMENT of the rooms inside the footprint, computed on a compressed
// coordinate grid. This guarantees walls, room areas, openings and collision share one source.

export interface WallPiece { rect: Rect; ext: boolean; opening: Opening | null }

const EPS = 1e-6;
const key = (n: number) => Math.round(n * 10000);
const uniqSorted = (vals: number[]) => {
  const m = new Map<number, number>();
  for (const v of vals) m.set(key(v), v);
  return [...m.values()].sort((a, b) => a - b);
};
const inside = (r: Rect, x: number, y: number) => x > r.x0 + EPS && x < r.x1 - EPS && y > r.y0 + EPS && y < r.y1 - EPS;

export function generateWalls(plan: FloorPlan): WallPiece[] {
  const rects = plan.rooms.flatMap((r) => r.rects);
  const outdoor = plan.rooms.filter((r) => r.outdoor).flatMap((r) => r.rects);
  const clampX = (v: number) => Math.min(FOOT.x1, Math.max(FOOT.x0, v));
  const clampY = (v: number) => Math.min(FOOT.y1, Math.max(FOOT.y0, v));
  const xs = uniqSorted([FOOT.x0, FOOT.x1, ...rects.flatMap((r) => [clampX(r.x0), clampX(r.x1)]), ...plan.openings.flatMap((o) => [clampX(o.rect.x0), clampX(o.rect.x1)])]);
  const ys = uniqSorted([FOOT.y0, FOOT.y1, ...rects.flatMap((r) => [clampY(r.y0), clampY(r.y1)]), ...plan.openings.flatMap((o) => [clampY(o.rect.y0), clampY(o.rect.y1)])]);

  type Cell = { k: string; ext: boolean; op: Opening | null } | null;
  const grid: Cell[][] = [];
  for (let j = 0; j < ys.length - 1; j++) {
    const row: Cell[] = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      if (rects.some((r) => inside(r, cx, cy))) { row.push(null); continue; }
      const cell: Rect = { x0: xs[i], x1: xs[i + 1], y0: ys[j], y1: ys[j + 1] };
      const touchesEdge = cell.x0 <= FOOT.x0 + EPS || cell.x1 >= FOOT.x1 - EPS || cell.y0 <= FOOT.y0 + EPS || cell.y1 >= FOOT.y1 - EPS;
      const nearOutdoor = outdoor.some((o) => {
        const dx = Math.max(o.x0 - cell.x1, cell.x0 - o.x1, 0);
        const dy = Math.max(o.y0 - cell.y1, cell.y0 - o.y1, 0);
        if (dx <= EPS && dy <= EPS) return true; // touches open air
        // composite external wall (partition + 300 mm leaf): thin cell sandwiched next to open air
        if (dy <= EPS && dx <= 0.43 && cell.x1 - cell.x0 <= 0.43) return true;
        if (dx <= EPS && dy <= 0.43 && cell.y1 - cell.y0 <= 0.43) return true;
        return false;
      });
      const op = plan.openings.find((o) => inside(o.rect, cx, cy)) ?? null;
      const ext = touchesEdge || nearOutdoor;
      row.push({ k: `${ext ? 'e' : 'i'}|${op ? op.id : ''}`, ext, op });
    }
    grid.push(row);
  }

  // merge horizontally into runs, then vertically where x-extent and class match
  type Run = { x0: number; x1: number; y0: number; y1: number; k: string; ext: boolean; op: Opening | null };
  const runs: Run[] = [];
  for (let j = 0; j < grid.length; j++) {
    let i = 0;
    while (i < grid[j].length) {
      const c = grid[j][i];
      if (!c) { i++; continue; }
      let e = i;
      while (e + 1 < grid[j].length && grid[j][e + 1]?.k === c.k) e++;
      runs.push({ x0: xs[i], x1: xs[e + 1], y0: ys[j], y1: ys[j + 1], k: c.k, ext: c.ext, op: c.op });
      i = e + 1;
    }
  }
  const merged: Run[] = [];
  for (const r of runs) {
    const prev = merged.find((m) => m.k === r.k && key(m.x0) === key(r.x0) && key(m.x1) === key(r.x1) && key(m.y1) === key(r.y0));
    if (prev) prev.y1 = r.y1; else merged.push({ ...r });
  }
  return merged.map((m) => ({ rect: { x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1 }, ext: m.ext, opening: m.op }));
}

// ---------------------------------------------------------------------------------------------
// Room edge segments (wall linings facing into the room) with opening cut-outs.

export interface EdgeSeg {
  ax: number; ay: number; bx: number; by: number;
  nx: number; ny: number;       // direction the lining faces (into the room)
  z0: number; z1: number;
  full: boolean;                // full-height (eligible for skirting)
}

type Iv = [number, number];
const subtract = (base: Iv[], cut: Iv): Iv[] => {
  const out: Iv[] = [];
  for (const [a, b] of base) {
    if (cut[1] <= a + EPS || cut[0] >= b - EPS) { out.push([a, b]); continue; }
    if (cut[0] > a + EPS) out.push([a, cut[0]]);
    if (cut[1] < b - EPS) out.push([cut[1], b]);
  }
  return out;
};

interface EdgeDef { horizontal: boolean; c: number; a: number; b: number; nx: number; ny: number; outside: (o: Rect) => Iv | null }

function rectEdges(r: Rect): EdgeDef[] {
  const near = (u: number, v: number) => Math.abs(u - v) < 1e-4;
  const ovX = (o: Rect): Iv | null => { const a = Math.max(o.x0, r.x0), b = Math.min(o.x1, r.x1); return b - a > EPS ? [a, b] : null; };
  const ovY = (o: Rect): Iv | null => { const a = Math.max(o.y0, r.y0), b = Math.min(o.y1, r.y1); return b - a > EPS ? [a, b] : null; };
  return [
    { horizontal: true, c: r.y0, a: r.x0, b: r.x1, nx: 0, ny: 1, outside: (o) => (near(o.y1, r.y0) ? ovX(o) : null) },   // south edge
    { horizontal: true, c: r.y1, a: r.x0, b: r.x1, nx: 0, ny: -1, outside: (o) => (near(o.y0, r.y1) ? ovX(o) : null) },  // north edge
    { horizontal: false, c: r.x0, a: r.y0, b: r.y1, nx: 1, ny: 0, outside: (o) => (near(o.x1, r.x0) ? ovY(o) : null) },  // west edge
    { horizontal: false, c: r.x1, a: r.y0, b: r.y1, nx: -1, ny: 0, outside: (o) => (near(o.x0, r.x1) ? ovY(o) : null) }, // east edge
  ];
}

/** Lining segments for an indoor room: every edge minus abutting rooms, split at openings. */
export function roomLiningSegs(room: PlacedRoom, plan: FloorPlan, height: number): EdgeSeg[] {
  const all = plan.rooms.flatMap((r) => r.rects);
  const segs: EdgeSeg[] = [];
  for (const rect of room.rects) {
    for (const e of rectEdges(rect)) {
      let ivs: Iv[] = [[e.a, e.b]];
      for (const o of all) { if (o === rect) continue; const iv = e.outside(o); if (iv) ivs = subtract(ivs, iv); }
      const ops: { iv: Iv; op: Opening }[] = [];
      for (const op of plan.openings) { const iv = e.outside(op.rect); if (iv) ops.push({ iv, op }); }
      let solid = ivs;
      for (const o of ops) solid = subtract(solid, o.iv);
      const mk = (a: number, b: number, z0: number, z1: number, full: boolean): EdgeSeg =>
        e.horizontal ? { ax: a, ay: e.c, bx: b, by: e.c, nx: e.nx, ny: e.ny, z0, z1, full }
          : { ax: e.c, ay: a, bx: e.c, by: b, nx: e.nx, ny: e.ny, z0, z1, full };
      for (const [a, b] of solid) if (b - a > 0.01) segs.push(mk(a, b, 0, height, true));
      for (const { iv, op } of ops) {
        // only where the base interval still exists (not removed by an abutting room)
        for (const [a, b] of ivs) {
          const s = Math.max(a, iv[0]), t = Math.min(b, iv[1]);
          if (t - s < 0.01) continue;
          if (op.sill > 0.01) segs.push(mk(s, t, 0, op.sill, false));
          if (op.head < height - 0.01 && op.kind !== 'screen') segs.push(mk(s, t, op.head, height, false));
        }
      }
    }
  }
  return segs;
}

/** Open-air edge intervals of an outdoor room (no wall, room or opening behind) -> balustrades. */
export function outdoorOpenEdges(room: PlacedRoom, plan: FloorPlan, walls: WallPiece[]): EdgeSeg[] {
  const blockers = [...plan.rooms.flatMap((r) => r.rects), ...walls.map((w) => w.rect)];
  const segs: EdgeSeg[] = [];
  for (const rect of room.rects) {
    for (const e of rectEdges(rect)) {
      let ivs: Iv[] = [[e.a, e.b]];
      for (const o of blockers) { if (o === rect) continue; const iv = e.outside(o); if (iv) ivs = subtract(ivs, iv); }
      for (const [a, b] of ivs) {
        if (b - a < 0.05) continue;
        segs.push(e.horizontal ? { ax: a, ay: e.c, bx: b, by: e.c, nx: e.nx, ny: e.ny, z0: 0, z1: 1.1, full: true }
          : { ax: e.c, ay: a, bx: e.c, by: b, nx: e.nx, ny: e.ny, z0: 0, z1: 1.1, full: true });
      }
    }
  }
  return segs;
}
