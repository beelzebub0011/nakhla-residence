import type { FloorId, Prim } from './types';
import { FLOOR_BY_ID } from './tower';
import { POOL_BASIN, getFloorPlan } from './plans';
import { place, placeAllowed, setDry, setPlaceFilter, type PlaceCtx } from './modelkit';
import * as P from './pieces';
import * as F from './fitments';
import * as A from './amenityPieces';

// Furniture & fittings. Loose and fitted pieces are REAL modelled meshes (modelkit.ts / pieces.ts /
// fitments.ts); a few legacy box/cylinder items remain only on floors that have not yet been through
// the Golden Apartment standard (tracked in QUALITY_GAP_AUDIT.md).

type Rot = 0 | 1 | 2 | 3;
type Ctx = PlaceCtx & { f: FloorId };
interface Fr {
  box(mat: string, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, o?: { r?: number; surf?: string; noShadow?: boolean }): void;
  cyl(mat: string, x: number, y: number, r: number, z0: number, z1: number, r2?: number): void;
}
/** Legacy primitive frame (boxes / cylinders). */
function frame(c: Ctx, name: string, ox: number, oy: number, rot: Rot = 0): Fr {
  const sem = `${c.f}.${c.room}.furn.${name}`;
  const t = (x: number, y: number) => tx(ox, oy, rot, x, y);
  return {
    box(mat, x0, y0, x1, y1, z0, z1, o) {
      if (!placeAllowed(c.room)) return;
      const [ax, ay] = t(x0, y0), [bx, by] = t(x1, y1); const surf = o?.surf;
      c.out.push({ k: 'box', sem, room: c.room, grp: c.grp ?? 'furn', mat: surf ? `surf:${surf}` : mat, surf, x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: Math.min(ay, by), y1: Math.max(ay, by), z0, z1, r: o?.r, noShadow: o?.noShadow });
    },
    cyl(mat, x, y, r, z0, z1, r2) { if (!placeAllowed(c.room)) return; const [cx, cy] = t(x, y); c.out.push({ k: 'cyl', sem, room: c.room, grp: 'furn', mat, cx, cy, r, z0, z1, r2 }); },
  };
}
const clearOf = (c: Ctx) => FLOOR_BY_ID[c.f].clear;
const D = (rot: Rot) => rot * 90;
function tx(ox: number, oy: number, rot: Rot, x: number, y: number): [number, number] { return rot === 0 ? [ox + x, oy + y] : rot === 1 ? [ox - y, oy + x] : rot === 2 ? [ox - x, oy - y] : [ox + y, oy - x]; }

// ------------------------------------------------------------------------------ placement helpers
function sofa(c: Ctx, ox: number, oy: number, rot: Rot, w = 2.6, d = 0.95, mat = 'fabric_sand') {
  place(c, 'sofa', P.sofa(w, Math.max(d, 0.85), mat, { outdoor: mat === 'fabric_outdoor', pillows: w > 2 ? 3 : w > 1.2 ? 2 : 1 }), ox, oy, D(rot));
}
function roundTable(c: Ctx, x: number, y: number, r: number, h: number, top = 'stone_top') { place(c, 'table', P.roundTable(r, h, top, h < 0.6 && r > 0.38 ? 1 : 0), x, y); }
function chair(c: Ctx, ox: number, oy: number, rot: Rot, mat = 'fabric_taupe') { place(c, 'chair', P.chair(mat, mat === 'fabric_outdoor' ? 'teak' : 'oak'), ox, oy, D(rot)); }
function diningSet(c: Ctx, ox: number, oy: number, rot: Rot, w = 1.8, d = 0.95, perSide = 3, topSurf?: string, fab = 'leather_tan') {
  place(c, 'dining', P.diningTable(w, d, topSurf), ox, oy, D(rot));
  const step = w / perSide; const ch = P.chair(fab, 'oak');
  for (let i = 0; i < perSide; i++) {
    const cx = step * (i + 0.5) - 0.24;
    const [ax, ay] = tx(ox, oy, rot, cx, -0.4); place(c, 'chair', ch, ax, ay, D(rot) + (i % 2 ? 4 : -3));
    const [bx, by] = tx(ox, oy, rot, cx + 0.48, d + 0.4); place(c, 'chair', ch, bx, by, D(rot) + 180 + (i % 2 ? -5 : 3));
  }
}
function kitchenRun(c: Ctx, ox: number, oy: number, rot: Rot, len: number, o: { wall?: boolean; tallAt?: 'start' | 'end'; cooktop?: number } = {}) {
  const end = len - (o.tallAt === 'end' ? 1.24 : 0);
  const sink = o.cooktop === undefined ? undefined : o.cooktop + 1.95 <= end ? o.cooktop + 1.6 : o.cooktop + 1.45 <= end ? o.cooktop + 1.1 : undefined;
  place(c, 'run', F.kitchenRun(len, { wall: o.wall, tall: o.tallAt, hob: o.cooktop, sink, clear: clearOf(c) }), ox, oy, D(rot));
}
function island(c: Ctx, ox: number, oy: number, rot: Rot, w = 2.4, d = 0.95) { place(c, 'island', F.island(w, d, 3), ox, oy, D(rot)); }
function wc(c: Ctx, ox: number, oy: number, rot: Rot) { place(c, 'wc', F.wc(), ox, oy, D(rot)); }
function vanity(c: Ctx, ox: number, oy: number, rot: Rot, w: number, topSurf = 'bathroom.vanity', basins = 1) {
  place(c, 'vanity', F.vanity(w, topSurf, basins), ox, oy, D(rot));
  if (!placeAllowed(c.room)) return;
  const [ax, ay] = tx(ox, oy, rot, 0.06, 0.028), [bx, by] = tx(ox, oy, rot, w - 0.06, 0.028), [nx, ny] = [[0, 1], [-1, 0], [0, -1], [1, 0]][rot];
  c.out.push({ k: 'quad', sem: `${c.f}.${c.room}.mirror`, room: c.room, grp: 'mirror', mat: 'mirror', ax, ay, bx, by, z0: 1.1, z1: 1.96, nx, ny });
}
/** Legacy origin = room-side corner; the modelled tub has its back on the wall. */
function bathtub(c: Ctx, ox: number, oy: number, rot: Rot, w: number, l = 0.82) { const [bx, by] = tx(ox, oy, rot, w, l); place(c, 'tub', F.bathtub(w, l), bx, by, D(rot) + 180); }
function shower(c: Ctx, ox: number, oy: number, rot: Rot, w: number, d: number) { place(c, 'shower', F.shower(w, d), ox, oy, D(rot)); }
function wardrobe(c: Ctx, ox: number, oy: number, rot: Rot, w: number, h = 2.4, surf = 'master.feature_panel') { place(c, 'wardrobe', F.wardrobe(w, Math.min(h, clearOf(c) - 0.02), surf), ox, oy, D(rot)); }
function desk(c: Ctx, ox: number, oy: number, rot: Rot, w = 1.4) { place(c, 'desk', P.desk(w, 'master.feature_panel'), ox, oy, D(rot)); }
function rug(c: Ctx, x0: number, y0: number, x1: number, y1: number, mat = 'rug') { place(c, 'rug', P.rug(Math.round((x1 - x0) * 100) / 100, Math.round((y1 - y0) * 100) / 100, mat), x0, y0); }
function plant(c: Ctx, x: number, y: number, s = 1, kind: 'tree' | 'bush' | 'grass' = 'tree') { place(c, 'plant', P.plantPot(s, kind, s > 1.25 ? 'pot' : 'pot_white'), x, y, Math.round((x * 37 + y * 91) % 360)); }
function pendant(c: Ctx, x: number, y: number, z: number, ceil: number, r = 0.18) { place(c, 'pendant', P.pendant(r, Math.round((ceil - z) * 100) / 100, 'brass'), x, y, 0, ceil); }
function bed(c: Ctx, ox: number, oy: number, rot: Rot, w = 1.8, l = 2.05, headSurf?: string) { place(c, 'bed', P.bed(w, l, headSurf, w > 1.7 ? 'fabric_taupe' : 'fabric_sand', w > 1.7 ? 'linen_grey' : 'linen_sand'), ox, oy, D(rot)); }
function nightstand(c: Ctx, ox: number, oy: number, rot: Rot, surf?: string) { place(c, 'nightstand', P.nightstand(surf, true), ox, oy, D(rot)); }
function lounger(c: Ctx, ox: number, oy: number, rot: Rot) { place(c, 'lounger', P.lounger(true), ox, oy, D(rot)); }
/** Curtain stack inside the legacy box (x0,y0)-(x1,y1); folds face the room centre. */
function curtain(c: Ctx, x0: number, y0: number, x1: number, y1: number, _h = 2.62) {
  const room = getFloorPlan(c.f).rooms.find((r) => r.key === c.room); const rr = room?.rects[0];
  const rcx = rr ? (rr.x0 + rr.x1) / 2 : 9, rcy = rr ? (rr.y0 + rr.y1) / 2 : 12; const h = clearOf(c) - 0.05;
  if (x1 - x0 > y1 - y0) { const L = Math.round((x1 - x0) * 100) / 100; if (rcy > y0) place(c, 'curtain', P.curtain(L, h), x0, y0 - 0.03); else place(c, 'curtain', P.curtain(L, h), x1, y1 + 0.03, 180); }
  else { const L = Math.round((y1 - y0) * 100) / 100; if (rcx < x0) place(c, 'curtain', P.curtain(L, h), x1 + 0.03, y0, 90); else place(c, 'curtain', P.curtain(L, h), x0 - 0.03, y1, 270); }
}
function downlights(c: Ctx, xs: number[], ys: number[]) { const z = clearOf(c); const dl = P.downlight(); const cc = { ...c, grp: 'ceiling' as const }; for (const x of xs) for (const y of ys) place(cc, 'downlight', dl, x, y, 0, z); }   // V11.5: hidden with the ceiling in cut-away views (no floating dots)
/**
 * V11.4 (D20): perimeter bulkhead with a hidden LED cove that washes the central ceiling.
 * The field keeps the full clear height; the band drops `drop` m along the walls (above every door and slider head).
 * Profile from the wall: solid band, trough with the LED tape, upstand lip; the light leaves through the 7 cm slot above the lip.
 */
export const COVE = { w: 0.45, drop: 0.16, rooms: new Set(['A.living']) };   // rooms with a cove: their AC slot sits in the band (prims.ts addMep)
function ceilingCove(c: Ctx, x0: number, y0: number, x1: number, y1: number, w = COVE.w, drop = COVE.drop) {
  if (!placeAllowed(c.room)) return;
  c = { ...c, grp: 'ceiling' };   // V11.5: the cove belongs to the ceiling (hidden with it in cut-away views)
  const z = clearOf(c), zb = z - drop, tr = 0.12, lip = 0.04; const f = frame(c, 'cove', 0, 0);
  const ring = (i: number, t: number, z0: number, z1: number) => {
    const ax0 = x0 + i, ay0 = y0 + i, ax1 = x1 - i, ay1 = y1 - i;
    f.box('ceiling', ax0, ay0, ax1, ay0 + t, z0, z1); f.box('ceiling', ax0, ay1 - t, ax1, ay1, z0, z1);
    f.box('ceiling', ax0, ay0 + t, ax0 + t, ay1 - t, z0, z1); f.box('ceiling', ax1 - t, ay0 + t, ax1, ay1 - t, z0, z1);
  };
  ring(0, w - tr, zb, z);                    // band against the walls
  ring(w - tr, tr, zb, zb + 0.02);           // trough floor
  ring(w - lip, lip, zb + 0.02, z - 0.07);   // upstand lip
  // LED tape in runs of about 1 m along the trough, 1.5 cm off the band
  const o = w - tr + 0.015, lx0 = x0 + o, lx1 = x1 - o, ly0 = y0 + o, ly1 = y1 - o;
  const runs = (a: number, b: number, at: (s: number, len: number) => void) => { const n = Math.max(1, Math.round((b - a) / 1.0)); const len = Math.round(((b - a) / n - 0.02) * 1000) / 1000; for (let i = 0; i < n; i++) at(a + ((b - a) * i) / n + 0.01, len); };
  runs(lx0, lx1, (s, len) => { place(c, 'cove_led', F.coveStrip(len), s, ly0, 0, zb + 0.02); place(c, 'cove_led', F.coveStrip(len), s, ly1, 0, zb + 0.02); });
  runs(ly0 + 0.02, ly1 - 0.02, (s, len) => { place(c, 'cove_led', F.coveStrip(len), lx0, s, 90, zb + 0.02); place(c, 'cove_led', F.coveStrip(len), lx1, s, 90, zb + 0.02); });
}
/** V11.5: festoon strings across x from xa to xb at each y, fixed at height z (just under the pergola girders). */
function festoon(c: Ctx, xa: number, xb: number, ys: number[], z: number) {
  const len = Math.round((xb - xa) * 100) / 100, sag = 0.26; const n = Math.max(4, Math.round(len / 0.75));
  for (const y of ys) {
    place(c, 'festoon', A.festoonCable(len, sag), xa, y, 0, z);
    for (let i = 1; i < n; i++) { const t = i / n; place(c, 'festoon_bulb', A.festoonBulb(), xa + t * len, y, 0, z - sag * 4 * t * (1 - t)); }
    // warm pool on the deck under each string (web stand-in for the bulbs' light; Cycles has real lights). Night only.
    if (placeAllowed(c.room)) c.out.push({ k: 'slab', sem: `${c.f}.${c.room}.glow`, room: c.room, mat: 'glow_pool', grp: 'furn', x0: xa + 0.3, x1: xb - 0.3, y0: y - 1.5, y1: y + 1.5, z: 0.03, up: true });
  }
}
/**
 * Dog-leg stair in a protected core (V12: detailed like the apartments). Stone treads with a dark anti-slip nosing over a
 * concrete body, a landing, a steel balustrade with an oak handrail along the well, a wall handrail on brackets, and a
 * landing light. Steps above the clear height stop under the ceiling (the stair continues through the slab).
 */
function stairs(c: Ctx, x0: number, y0: number, x1: number, y1: number, rise: number, cap: number) {
  const f = frame(c, 'stair', 0, 0); const n = 10; const w = (x1 - x0 - 0.15) / 2;
  const run = (y1 - y0 - 1.45) / n; const dz = rise / (2 * n + 2); const tr = 0.03;
  const step = (xa: number, xb: number, ya: number, yb: number, z: number, front: 'lo' | 'hi') => {
    if (z <= tr) return;
    f.box('floor_concrete', xa, ya, xb, yb, 0, z - tr, { noShadow: true });                                        // concrete body
    const yo = front === 'lo' ? -0.025 : 0.025;                                                                      // tread overhangs the step below
    f.box('floor_stone', xa, Math.min(ya, ya + yo), xb, Math.max(yb, yb + yo), z - tr, z);                           // stone tread
    const ny = front === 'lo' ? ya + yo : yb + yo; f.box('steel_dark', xa + 0.04, Math.min(ny, ny + (front === 'lo' ? 0.05 : -0.05)), xb - 0.04, Math.max(ny, ny + (front === 'lo' ? 0.05 : -0.05)), z - 0.002, z + 0.002, { noShadow: true });   // anti-slip nosing
  };
  for (let i = 0; i < n; i++) step(x0 + 0.03, x0 + w, y0 + 0.1 + i * run, y0 + 0.1 + (i + 1) * run, Math.min(cap, dz * (i + 1)), 'lo');
  const zl = Math.min(cap, dz * (n + 1));
  f.box('floor_concrete', x0 + 0.03, y1 - 1.33, x1 - 0.03, y1 - 0.03, 0, zl - tr, { noShadow: true }); f.box('floor_stone', x0 + 0.03, y1 - 1.33, x1 - 0.03, y1 - 0.03, zl - tr, zl);   // landing
  for (let i = 0; i < n; i++) step(x1 - w, x1 - 0.03, y1 - 1.35 - (i + 1) * run, y1 - 1.35 - i * run, Math.min(cap, dz * (n + 2 + i)), 'hi');
  // balustrade + handrails (sloped: modelled pieces). Flight 1 rises along +y, flight 2 along −y; the rail stops below the ceiling.
  const xw = x0 + w + 0.04, xe = x1 - w - 0.04; const L = n * run, R = n * dz;
  place(c, 'stair_rail', F.stairRail(+L.toFixed(3), +R.toFixed(3), 0.9), xw, y0 + 0.1, 90, 0);
  const m2 = Math.max(2, Math.floor((cap - 0.95 - dz * (n + 1)) / dz)); const L2 = m2 * run, R2 = m2 * dz;
  place(c, 'stair_rail', F.stairRail(+L2.toFixed(3), +R2.toFixed(3), 0.9), xe, y1 - 1.35, 270, zl);
  place(c, 'wall_rail', F.wallRail(+L.toFixed(3), +R.toFixed(3)), x0 + 0.005, y0 + 0.1, 90, 0);
  place({ ...c, grp: 'ceiling' }, 'downlight', P.downlight(), (x0 + x1) / 2, y1 - 0.7, 0, cap);                     // landing light
}

// ------------------------------------------------------------------------------ Model One — GOLDEN APARTMENT
function furnishA(c0: Omit<Ctx, 'room'>, clear: number) {
  let c: Ctx = { ...c0, room: 'A.living' };
  {
    place(c, 'media', F.mediaWall(3.6, clear, 'living.feature_panel'), 8.4, 6.196, 180);
    place(c, 'sofa', P.sofa(2.8, 0.98, 'fabric_sand', { pillows: 4, throw: true }), 5.15, 3.0, 0);
    place(c, 'armchair', P.sofa(0.98, 0.9, 'fabric_taupe', { pillows: 1 }), 4.82, 5.55, 282);
    place(c, 'table', P.roundTable(0.5, 0.36, 'marble', 1), 6.55, 4.85);
    place(c, 'table', P.roundTable(0.26, 0.5, 'oak', 2), 4.95, 4.2);
    place(c, 'ottoman', P.ottoman(0.8, 0.46, 'velvet_olive'), 7.75, 4.55, 78);
    rug(c, 4.95, 3.05, 8.6, 5.85);
    place(c, 'lamp', P.floorLamp(), 8.3, 3.45, 160);
    diningSet(c, 8.95, 2.98, 0, 1.9, 0.95, 3, 'living.feature_panel');
    pendant(c, 9.42, 3.455, 1.52, clear, 0.2); pendant(c, 10.38, 3.455, 1.52, clear, 0.2);
    curtain(c, 4.66, 2.13, 5.2, 2.2); curtain(c, 11.04, 2.13, 11.58, 2.2);
    plant(c, 11.2, 5.75, 1.15);
    place(c, 'art', P.art(1.0, 1.3, 'art_a', 'black_metal'), 11.42, 6.196, 180, 1.0);
    place(c, 'art', P.art(1.3, 0.9, 'art_b'), 4.624, 5.75, 270, 1.3);
    downlights(c, [5.6, 7.3, 9.0, 10.7], [3.2, 5.2]);
    ceilingCove(c, 4.62, 2.1, 11.62, 6.2);
  }
  c = { ...c0, room: 'A.kitchen' };
  {
    kitchenRun(c, 17.7, 3.9, 2, 5.1, { tallAt: 'start', cooktop: 2.6 });
    island(c, 15.9, 2.4, 2, 2.4, 0.95);
    for (const x of [14.1, 14.7, 15.3]) pendant(c, x, 1.9, 1.68, clear, 0.11);
    plant(c, 17.25, 0.75, 0.9, 'bush');
    downlights(c, [12.8, 14.6, 16.4], [1.0, 2.95]);
  }
  c = { ...c0, room: 'A.master' };
  {
    const f = frame(c, 'joinery', 0, 0);
    f.box('wood_mid', 4.44, 0.42, 4.496, 3.95, 0, clear, { surf: 'master.feature_panel', noShadow: true });
    bed(c, 4.44, 1.25, 1, 1.8, 2.05, 'master.feature_panel');
    nightstand(c, 4.44, 0.56, 1, 'master.feature_panel'); nightstand(c, 4.44, 3.22, 1, 'master.feature_panel');
    place(c, 'bench', P.bench(1.3, 'velvet_olive'), 2.26, 1.5, 90);
    place(c, 'dresser', P.dresser(1.2, 'master.feature_panel'), 2.5, 4.396, 180);
    place(c, 'mirror', P.roundMirror(0.38), 1.9, 4.394, 180, 1.5);
    place(c, 'armchair', P.sofa(0.92, 0.86, 'fabric_sand', { pillows: 1 }), 0.45, 3.5, 285);
    rug(c, 1.35, 0.85, 4.3, 3.5);
    curtain(c, 0.72, 0.33, 1.2, 0.4); curtain(c, 3.6, 0.33, 4.08, 0.4);
    plant(c, 0.72, 0.75, 0.95);
    place(c, 'art', P.art(1.5, 0.62, 'art_b', 'black_metal'), 4.438, 1.4, 90, 1.5);
    downlights(c, [1.3, 3.1], [1.2, 3.3]);
  }
  c = { ...c0, room: 'A.bathroom' };
  {
    vanity(c, 11.74, 7.1, 3, 1.1);
    wc(c, 13.6, 6.5, 1);
    shower(c, 13.6, 8.2, 2, 1.86, 0.92);
    place(c, 'towelrail', F.towelRail(), 13.6, 5.8, 90);
    downlights(c, [12.67], [6.3, 7.75]);
  }
  c = { ...c0, room: 'A.master_bath' };
  {
    bathtub(c, 0.34, 7.34, 0, 2.07);
    vanity(c, 0.45, 4.52, 0, 1.6, 'bathroom.vanity', 2);
    wc(c, 0.3, 6.95, 3);
    downlights(c, [1.38], [5.4, 6.9]);
  }
  c = { ...c0, room: 'A.second_bedroom' };
  {
    bed(c, 16.55, 8.2, 2, 1.6, 2.0, 'master.feature_panel');
    nightstand(c, 17.22, 8.2, 2, 'master.feature_panel');
    wardrobe(c, 13.72, 8.18, 3, 2.2, 2.4);
    desk(c, 15.1, 4.02, 0, 1.5); chair(c, 16.1, 5.12, 2);
    rug(c, 14.5, 5.3, 17.0, 7.5);
    curtain(c, 17.6, 4.5, 17.67, 5.0); curtain(c, 17.6, 7.2, 17.67, 7.7);
    downlights(c, [14.9, 16.6], [5.2, 7.0]);
  }
  c = { ...c0, room: 'A.dressing' };
  { wardrobe(c, 2.57, 8.18, 3, 2.0, 2.4); wardrobe(c, 4.48, 8.2, 2, 1.25, 2.4); place(c, 'ottoman', P.ottoman(0.7, 0.42, 'fabric_sand'), 3.2, 5.42, 90); downlights(c, [3.55], [5.4, 7.0]); }
  c = { ...c0, room: 'A.laundry' };
  {
    const f = frame(c, 'appliances', 0, 0);
    f.box('ceramic', 10.98, 7.52, 11.6, 8.17, 0, 0.86, { r: 0.02 }); f.box('ceramic', 10.98, 7.52, 11.6, 8.17, 0.88, 1.74, { r: 0.02 });
    f.box('wood_mid', 11.24, 6.36, 11.6, 7.3, 0, 2.1, { surf: 'master.feature_panel' });
    downlights(c, [11.0], [7.2]);
  }
  c = { ...c0, room: 'A.hall' };
  {
    place(c, 'console', P.console(2.2, 0.36, 'living.feature_panel'), 7.55, 8.196, 180);
    place(c, 'art', P.art(1.4, 0.9, 'art_a'), 7.15, 8.196, 180, 1.15);
    downlights(c, [5.6, 7.4], [7.2]);
  }
  c = { ...c0, room: 'A.entry' };
  { downlights(c, [9.4], [7.2]); }
  c = { ...c0, room: 'A.balcony' };
  {
    place(c, 'sofa', P.sofa(2.0, 0.86, 'fabric_outdoor', { outdoor: true, pillows: 2 }), 5.04, 1.7, 270);
    place(c, 'chair', P.sofa(0.86, 0.82, 'fabric_outdoor', { outdoor: true, pillows: 1 }), 7.95, -0.3, 90);
    place(c, 'chair', P.sofa(0.86, 0.82, 'fabric_outdoor', { outdoor: true, pillows: 1 }), 7.95, 0.72, 90);
    place(c, 'table', P.roundTable(0.34, 0.34, 'teak', 2), 6.6, 0.68);
    rug(c, 5.85, -0.35, 7.95, 1.65, 'rug_outdoor');
    place(c, 'table', P.roundTable(0.34, 0.72, 'stone_top'), 9.95, 0.55);
    chair(c, 9.71, -0.3, 0, 'fabric_outdoor'); chair(c, 10.19, 1.4, 2, 'fabric_outdoor');
    place(c, 'planter', P.planter(2.4, 0.34, 0.45, 'grass'), 8.75, -0.76);
    plant(c, 5.25, -0.6, 1.1);
  }
}

// ------------------------------------------------------------------------------ Model Two — brought to the Golden standard
function furnishB(c0: Omit<Ctx, 'room'>, clear: number) {
  let c: Ctx = { ...c0, room: 'B.living' };
  {
    place(c, 'media', F.mediaWall(3.0, clear, 'living.feature_panel'), 5.35, 17.2, 0);                 // south wall, west of the entry arch
    place(c, 'sofa', P.sofa(2.7, 0.98, 'fabric_taupe', { pillows: 4, throw: true }), 8.25, 20.35, 180);   // faces the media wall
    place(c, 'armchair', P.sofa(0.95, 0.88, 'velvet_rust', { pillows: 1 }), 5.25, 19.3, 270);   // clear of the dressing-room door
    place(c, 'table', P.roundTable(0.48, 0.36, 'marble', 1), 6.9, 18.7);
    place(c, 'ottoman', P.ottoman(0.8, 0.46, 'fabric_sand'), 7.95, 18.15, 12);
    rug(c, 5.45, 17.85, 8.65, 20.45);
    place(c, 'lamp', P.floorLamp(), 5.55, 20.75, 300);
    diningSet(c, 9.55, 19.05, 0, 1.9, 0.95, 3, 'living.feature_panel', 'leather_tan');
    pendant(c, 10.0, 19.52, clear - 1.15, clear, 0.2); pendant(c, 11.0, 19.52, clear - 1.15, clear, 0.2);
    curtain(c, 5.24, 21.2, 5.75, 21.27); curtain(c, 11.66, 21.2, 12.16, 21.27);
    plant(c, 11.75, 17.65, 1.1);
    place(c, 'art', P.art(1.2, 0.9, 'art_b', 'black_metal'), 12.196, 18.55, 90, 1.35);
    downlights(c, [6.0, 7.8, 9.6, 11.2], [18.0, 20.4]);
  }
  c = { ...c0, room: 'B.kitchen' };
  {
    // east run under the window: base units only, so the window stays clear above the worktop
    kitchenRun(c, 17.7, 20.0, 1, 3.7, { tallAt: 'start', cooktop: 1.7, wall: false });
    island(c, 13.45, 21.55, 0, 2.3, 0.9);
    for (const x of [14.0, 14.6, 15.2]) pendant(c, x, 22.0, clear - 1.0, clear, 0.11);
    plant(c, 12.75, 23.3, 0.9, 'bush');
    downlights(c, [13.2, 14.9, 16.5], [20.6, 23.0]);
  }
  c = { ...c0, room: 'B.master' };
  {
    const f = frame(c, 'joinery', 0, 0);
    f.box('wood_mid', 0.304, 20.1, 0.36, 23.3, 0, clear, { surf: 'master.feature_panel', noShadow: true });
    bed(c, 0.36, 22.6, 3, 1.8, 2.05, 'master.feature_panel');
    nightstand(c, 0.36, 23.28, 3, 'master.feature_panel'); nightstand(c, 0.36, 20.62, 3, 'master.feature_panel');
    place(c, 'bench', P.bench(1.3, 'velvet_olive'), 2.95, 21.05, 90);
    place(c, 'dresser', P.dresser(1.2, 'master.feature_panel'), 5.08, 20.9, 90);
    place(c, 'mirror', P.roundMirror(0.36), 5.078, 21.5, 90, 1.5);
    rug(c, 0.75, 20.3, 3.7, 23.2);
    curtain(c, 1.0, 23.6, 1.45, 23.67); curtain(c, 3.75, 23.6, 4.2, 23.67);
    place(c, 'art', P.art(1.5, 0.62, 'art_a', 'black_metal'), 0.362, 22.45, 270, 1.5);
    plant(c, 4.65, 23.25, 0.95);
    downlights(c, [1.6, 3.6], [20.6, 22.8]);
  }
  c = { ...c0, room: 'B.second_bedroom' };
  {
    bed(c, 15.9, 14.4, 0, 1.6, 2.0, 'master.feature_panel'); nightstand(c, 15.25, 14.4, 0, 'master.feature_panel');
    wardrobe(c, 12.34, 14.42, 0, 2.4, 2.4); desk(c, 17.68, 17.95, 2, 1.5); chair(c, 16.6, 16.75, 0);
    rug(c, 14.6, 15.2, 17.2, 17.2);
    curtain(c, 17.6, 14.75, 17.67, 15.2); curtain(c, 17.6, 17.4, 17.67, 17.85);
    downlights(c, [14.0, 16.0], [15.4, 17.3]);
  }
  c = { ...c0, room: 'B.third_bedroom' };
  {
    bed(c, 0.32, 16.6, 3, 1.4, 2.0, 'master.feature_panel'); nightstand(c, 0.32, 15.05, 3, 'master.feature_panel');
    desk(c, 3.4, 14.42, 0, 1.4); chair(c, 4.3, 15.5, 2); wardrobe(c, 4.95, 17.06, 2, 1.5, 2.4);   // north wall: clear of the hall door
    rug(c, 0.9, 14.9, 3.3, 16.9, 'rug');
    curtain(c, 0.33, 14.55, 0.4, 15.0); curtain(c, 0.33, 16.6, 0.4, 17.0);
    downlights(c, [1.8, 3.6], [15.7]);
  }
  c = { ...c0, room: 'B.bathroom' };
  { vanity(c, 10.42, 16.4, 3, 1.0); wc(c, 12.2, 16.3, 1); shower(c, 10.44, 14.4, 0, 1.74, 0.9); place(c, 'towelrail', F.towelRail(), 12.2, 15.2, 90); downlights(c, [11.3], [15.2, 16.5]); }
  c = { ...c0, room: 'B.master_bath' };
  { bathtub(c, 0.34, 17.22, 0, 2.1, 0.8); vanity(c, 2.0, 19.58, 2, 1.5, 'bathroom.vanity', 2); downlights(c, [1.4], [17.9, 19.0]); }
  c = { ...c0, room: 'B.dressing' };
  { wardrobe(c, 2.66, 17.2, 0, 1.94, 2.4); place(c, 'ottoman', P.ottoman(0.7, 0.42, 'fabric_sand'), 3.4, 18.6, 0); downlights(c, [3.85], [18.4]); }
  c = { ...c0, room: 'B.laundry' };
  {
    const f = frame(c, 'appliances', 0, 0);
    f.box('ceramic', 17.05, 18.36, 17.68, 19.0, 0, 0.86, { r: 0.02 }); f.box('ceramic', 17.05, 19.05, 17.68, 19.7, 0, 0.86, { r: 0.02 });
    f.box('wood_mid', 14.6, 18.34, 16.8, 18.72, 0, 2.1, { surf: 'master.feature_panel' });
    downlights(c, [15.6], [19.1]);
  }
  c = { ...c0, room: 'B.hall' };
  { place(c, 'console', P.console(2.0, 0.36, 'living.feature_panel'), 5.6, 14.4, 0); place(c, 'art', P.art(1.4, 0.9, 'art_a'), 5.9, 14.404, 0, 1.15); downlights(c, [6.0, 7.6], [15.7]); }
  c = { ...c0, room: 'B.entry' };
  { downlights(c, [9.4], [15.7]); }
  c = { ...c0, room: 'B.balcony' };
  {
    place(c, 'sofa', P.sofa(2.0, 0.86, 'fabric_outdoor', { outdoor: true, pillows: 2 }), 5.55, 24.65, 270);
    place(c, 'chair', P.sofa(0.86, 0.82, 'fabric_outdoor', { outdoor: true, pillows: 1 }), 8.55, 22.75, 90);
    place(c, 'chair', P.sofa(0.86, 0.82, 'fabric_outdoor', { outdoor: true, pillows: 1 }), 8.55, 23.75, 90);
    place(c, 'table', P.roundTable(0.34, 0.34, 'teak', 2), 7.05, 23.65);
    rug(c, 6.45, 22.7, 7.65, 24.5, 'rug_outdoor');
    lounger(c, 10.9, 22.0, 0);
    place(c, 'planter', P.planter(2.4, 0.34, 0.45, 'grass'), 8.9, 24.4);
    plant(c, 11.62, 24.45, 1.0);
  }
}

// ------------------------------------------------------------------------------ core (all floors)
function furnishCore(c0: Omit<Ctx, 'room'>, f2f: number, clear: number) {
  // lift-lobby lighting on every floor (the core used to be unlit and read as a dark void through the arches)
  { const cl: Ctx = { ...c0, room: 'core.lobby' }; const dl = P.downlight(); for (const [x, y] of [[9.0, 9.4], [9.0, 11.4], [9.0, 13.3], [4.6, 11.44], [13.4, 11.44]] as [number, number][]) place(cl, 'downlight', dl, x, y, 0, clear); }
  const c: Ctx = { ...c0, room: 'core.lobby' };
  const f = frame(c, 'lifts', 0, 0);
  for (const [x0, x1] of [[3.6, 4.6], [5.7, 6.7], [11.35, 12.5]]) {
    f.box('steel_dark', x0, 10.735, x1, 10.752, 0, 2.2, { noShadow: true });
    f.box('bronze', x0 - 0.06, 10.735, x0, 10.76, 0, 2.26, { noShadow: true }); f.box('bronze', x1, 10.735, x1 + 0.06, 10.76, 0, 2.26, { noShadow: true });
    f.box('bronze', x0 - 0.06, 10.735, x1 + 0.06, 10.76, 2.2, 2.26, { noShadow: true });
  }
  // V11.5: the lift lobby and its two corridors are furnished like a hotel corridor (they read as empty grey voids):
  // a stone bench and art facing the lifts, corridor runners, a plant and a framed print at each corridor end, wall
  // sconces and a level plate beside the lifts
  if (placeAllowed('core.lobby')) {
    const fl = c0.f === 'G' ? 'G' : c0.f.replace('F', '');
    place(c, 'bench', P.bench(1.4, 'velvet_olive'), 7.74, 12.55, 90);                                      // west wall, clear of the apartment doors
    place(c, 'art', P.art(1.2, 0.8, 'art_b', 'black_metal'), 7.304, 13.25, 90, 1.25);
    rug(c, 3.3, 11.05, 7.2, 11.85, 'rug'); rug(c, 10.8, 11.05, 14.7, 11.85, 'rug');
    plant(c, 3.55, 11.8, 1.0, 'bush'); plant(c, 14.45, 11.8, 1.0, 'bush');
    place(c, 'art', P.art(0.9, 0.6, 'art_a', 'black_metal'), 3.124, 11.45, 90, 1.35);
    place(c, 'art', P.art(0.9, 0.6, 'art_b', 'black_metal'), 14.876, 11.45, 270, 1.35);
    f.box('bronze', 7.3, 9.9, 7.32, 10.5, 1.45, 1.75, { noShadow: true });                                 // level plate (bronze frame)
    f.box('led', 7.32, 9.95, 7.326, 10.45, 1.5, 1.7, { noShadow: true });                                  // backlit level panel
    void fl;
    for (const [x0, x1] of [[7.3, 7.34], [10.66, 10.7]]) for (const y of [9.2, 13.4]) f.box('led', x0, y - 0.06, x1, y + 0.06, 2.05, 2.25, { noShadow: true });   // slim wall sconces
  }
  if (placeAllowed('core.lobby')) {
    // V12: dark stone inlay with a brass border line in the lift lobby floor
    f.box('stone_base', 7.75, 9.0, 10.25, 13.6, 0.004, 0.009, { noShadow: true }); f.box('brass', 7.68, 8.93, 10.32, 9.0, 0.004, 0.01, { noShadow: true });
    f.box('brass', 7.68, 13.6, 10.32, 13.67, 0.004, 0.01, { noShadow: true }); f.box('brass', 7.68, 9.0, 7.75, 13.6, 0.004, 0.01, { noShadow: true }); f.box('brass', 10.25, 9.0, 10.32, 13.6, 0.004, 0.01, { noShadow: true });
    // call panels beside each lift door and a floor indicator above it
    for (const [x0, x1] of [[3.6, 4.6], [5.7, 6.7], [11.35, 12.5]] as [number, number][]) {
      f.box('steel_dark', x1 + 0.14, 10.72, x1 + 0.26, 10.735, 1.0, 1.3, { noShadow: true }); f.box('led', x1 + 0.17, 10.715, x1 + 0.23, 10.72, 1.08, 1.12, { noShadow: true }); f.box('led', x1 + 0.17, 10.715, x1 + 0.23, 10.72, 1.18, 1.22, { noShadow: true });
      f.box('ctx_dark', x0 + 0.2, 10.72, x1 - 0.2, 10.735, 2.32, 2.44, { noShadow: true }); f.box('led', (x0 + x1) / 2 - 0.08, 10.715, (x0 + x1) / 2 + 0.08, 10.72, 2.35, 2.41, { noShadow: true });
    }
    place(c, 'featurewall', A.featureWall(1.9, clear - 0.2), 10.696, 12.2, 90);                                     // oak slats on the east wall, north of the corridor
    ceilingCove(c, 7.3, 8.44, 10.7, 14.16, 0.35, 0.14);
  }
  stairs({ ...c0, room: 'core.stair_w' }, 0.3, 8.44, 3.0, 14.16, f2f, clear);
  stairs({ ...c0, room: 'core.stair_e' }, 15.0, 8.44, 17.7, 14.16, f2f, clear);
}

// ------------------------------------------------------------------------------ ground floor: lobby
function furnishG(c0: Omit<Ctx, 'room'>, clear: number) {
  let c: Ctx = { ...c0, room: 'zone.lobby_hall' };
  {
    // reception on the east side, facing the entrance route; staff zone behind keeps the back-office door free
    place(c, 'reception', A.receptionDesk(3.0), 13.7, 4.6, 90);
    place(c, 'emblem', A.palmEmblem(1.15), 14.77, 4.6, 90, 1.25);   // V11.5: the palm emblem on the wall behind reception
    place(c, 'featurewall', A.featureWall(4.0, clear), 7.45, 8.196, 180);              // west of the lift arch
    place(c, 'art', P.art(1.2, 1.6, 'art_a', 'black_metal'), 13.3, 8.196, 180, 0.9);   // east of the lift arch
    place(c, 'console', P.console(2.0, 0.36), 13.3, 8.196, 180);
    // lounge (west): sofa facing the lifts, two armchairs facing the entrance, coffee table, floor lamp
    rug(c, 3.75, 1.35, 7.15, 4.95);
    place(c, 'sofa', P.sofa(2.5, 0.96, 'fabric_sand', { pillows: 4 }), 4.2, 1.45, 0);
    place(c, 'armchair', P.sofa(0.95, 0.88, 'velvet_olive', { pillows: 1 }), 5.25, 4.8, 180);
    place(c, 'armchair', P.sofa(0.95, 0.88, 'velvet_olive', { pillows: 1 }), 6.65, 4.8, 180);
    place(c, 'table', P.roundTable(0.55, 0.38, 'marble', 1), 5.45, 3.15);
    place(c, 'lamp', P.floorLamp(), 3.75, 1.4, 20);
    // waiting seats by the window (east of the entrance)
    place(c, 'armchair', P.sofa(0.9, 0.86, 'fabric_taupe', { pillows: 1 }), 11.4, 0.55, 0);
    place(c, 'armchair', P.sofa(0.9, 0.86, 'fabric_taupe', { pillows: 1 }), 12.6, 0.55, 0);
    place(c, 'table', A.sideTable('marble', false), 12.45, 1.95);
    rug(c, 7.6, 0.4, 10.4, 1.5, 'rug_outdoor');                                        // entrance mat
    plant(c, 3.65, 7.7, 1.45); plant(c, 14.35, 0.85, 1.3); plant(c, 3.65, 0.8, 1.2); plant(c, 10.75, 7.75, 1.2, 'bush');
    for (const x of [4.6, 5.6]) pendant(c, x + 0.4, 3.15, clear - 1.3, clear, 0.32);
    downlights(c, [4.4, 6.4, 8.4, 10.4, 12.4, 14.2], [1.2, 3.6, 6.4]);
  }
  c = { ...c0, room: 'zone.mail' };
  { place(c, 'mailboxes', A.mailboxes(3.0, 1.5), 17.68, 0.6, 90, 0.35); downlights(c, [16.3], [1.4, 3.0]); }
  c = { ...c0, room: 'zone.security' };
  { desk(c, 0.6, 0.6, 0, 1.6); chair(c, 1.6, 1.75, 2, 'fabric_charcoal'); downlights(c, [1.7], [1.2, 3.0]); }
  c = { ...c0, room: 'zone.management' };
  { desk(c, 0.55, 5.0, 0, 1.6); chair(c, 1.55, 6.15, 2, 'fabric_charcoal'); place(c, 'shelf', A.backBar(1.6, 2.2, false), 1.95, 8.18, 180); downlights(c, [1.7], [5.0, 7.2]); }
}

// ------------------------------------------------------------------------------ F10 wellness
function furnishF10(c0: Omit<Ctx, 'room'>, clear: number) {
  let c: Ctx = { ...c0, room: 'zone.gym' };
  {
    // cardio along the south glazing (users look out), strength under the mirror wall, stretching in the quiet corner
    rug(c, 0.6, 0.45, 8.9, 2.75, 'rubber_mat');
    for (let i = 0; i < 4; i++) place(c, 'treadmill', A.treadmill(), 0.75 + i * 1.18, 0.55);
    for (let i = 0; i < 3; i++) place(c, 'bike', A.spinBike(), 6.0 + i * 0.95, 0.6);
    rug(c, 3.9, 3.7, 9.4, 8.05, 'rubber_mat');
    place(c, 'rack', A.powerRack(), 4.9, 4.35);
    place(c, 'dumbbells', A.dumbbellRack(2.4), 8.2, 8.18, 180);
    place(c, 'bench', A.weightBench(), 7.4, 5.25); place(c, 'bench', A.weightBench(), 8.5, 5.25);
    place(c, 'kettlebells', A.kettlebellShelf(6), 0.72, 3.15, 90);
    place(c, 'stretch', A.stretchZone(), 0.6, 5.9);
    place(c, 'hydration', A.hydrationStation(), 9.88, 6.8, 90);
    const f = frame(c, 'mirror', 0, 0); f.box('mirror', 5.0, 8.17, 8.25, 8.196, 0.25, 2.6, { noShadow: true });
    plant(c, 9.45, 3.4, 1.3);
    downlights(c, [1.6, 3.6, 5.6, 7.6, 9.2], [1.4, 4.2, 6.9]);
  }
  c = { ...c0, room: 'zone.wellness-lounge' };
  {
    rug(c, 10.6, 0.65, 15.0, 3.1);
    place(c, 'sofa', P.sofa(2.3, 0.92, 'fabric_sand', { pillows: 3 }), 13.15, 3.15, 180);   // faces the south window
    place(c, 'armchair', P.sofa(0.92, 0.86, 'velvet_olive', { pillows: 1 }), 11.0, 0.45, 0);
    place(c, 'table', P.roundTable(0.42, 0.38, 'marble', 1), 12.4, 1.75);
    place(c, 'teabar', A.barCounter(2.4, 0.95, 'stone_top'), 17.6, 3.88, 180);
    place(c, 'lounger', A.poolLounger(), 15.7, 0.5, 0);
    place(c, 'side', A.sideTable('oak'), 16.85, 1.0);
    plant(c, 14.9, 0.75, 1.2); plant(c, 10.45, 3.45, 1.1, 'bush');
    downlights(c, [11.2, 13.4, 15.6], [1.2, 2.9]);
  }
  c = { ...c0, room: 'zone.changing' };
  {
    place(c, 'lockers', A.lockers(3.4, 2.1), 13.5, 8.18, 180);
    vanity(c, 10.4, 4.04, 0, 1.6, 'bathroom.vanity', 2);
    place(c, 'bench', P.bench(1.6, 'leather_cream'), 10.95, 6.45);
    downlights(c, [11.0, 12.6], [5.0, 6.9]);
  }
  c = { ...c0, room: 'zone.spa' };
  {
    place(c, 'sauna', A.sauna(2.3, 1.62, 2.3), 16.05, 8.18, 180);            // west side: clears the door from the changing rooms
    place(c, 'massage', A.massageTable(), 16.88, 4.35);
    place(c, 'shelf', A.backBar(1.2, 2.0, false), 13.98, 4.04);
    plant(c, 17.3, 7.7, 1.0, 'bush');
    for (const [x, y] of [[16.45, 7.6], [16.62, 7.75]]) place(c, 'lantern', A.lantern(0.3), x, y);
    downlights(c, [14.6, 16.4], [4.8]);
  }
  c = { ...c0, room: 'zone.pool' };
  {
    const b = POOL_BASIN; const f = frame(c, 'pool', 0, 0); const cw = 0.32;
    f.box('stone_top', b.x0 - cw, b.y0 - cw, b.x1 + cw, b.y0, 0, 0.035, { noShadow: true }); f.box('stone_top', b.x0 - cw, b.y1, b.x1 + cw, b.y1 + cw, 0, 0.035, { noShadow: true });
    f.box('stone_top', b.x0 - cw, b.y0, b.x0, b.y1, 0, 0.035, { noShadow: true }); f.box('stone_top', b.x1, b.y0, b.x1 + cw, b.y1, 0, 0.035, { noShadow: true });
    f.box('gap_dark', b.x0 - cw - 0.04, b.y0 - cw - 0.06, b.x1 + cw + 0.04, b.y0 - cw - 0.03, 0, 0.006, { noShadow: true });   // deck drain slot
    if (placeAllowed(c.room)) c.out.push({ k: 'slab', sem: `${c.f}.zone.pool.water`, room: c.room, grp: 'furn', mat: 'water', x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, z: -0.06, up: true });
    if (placeAllowed(c.room)) c.out.push({ k: 'slab', sem: `${c.f}.zone.pool.basin`, room: c.room, grp: 'furn', mat: 'tile_pool', x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, z: -0.27, up: true });
    const q = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => placeAllowed(c.room) && c.out.push({ k: 'quad', sem: `${c.f}.zone.pool.basin`, room: c.room, grp: 'furn', mat: 'tile_pool', ax, ay, bx, by, z0: -0.27, z1: 0, nx, ny });
    q(b.x0, b.y0, b.x1, b.y0, 0, 1); q(b.x0, b.y1, b.x1, b.y1, 0, -1); q(b.x0, b.y0, b.x0, b.y1, 1, 0); q(b.x1, b.y0, b.x1, b.y1, -1, 0);
    for (const x of [5, 9, 13]) f.box('led', x - 0.12, b.y1 - 0.012, x + 0.12, b.y1 - 0.004, -0.2, -0.15, { noShadow: true });   // underwater lights
    for (let i = 0; i < 4; i++) { place(c, 'lounger', A.poolLounger(), 0.42, 16.75 + i * 1.25, 270); place(c, 'lounger', A.poolLounger(), 17.58, 16.05 + i * 1.25, 90); }
    for (let i = 0; i < 3; i++) { place(c, 'side', A.sideTable('teak'), 1.0, 17.02 + i * 1.25); place(c, 'side', A.sideTable('teak'), 17.0, 17.04 + i * 1.25); }   // in the gaps between loungers
    place(c, 'ladder', A.poolLadder(), b.x1 - 1.3, b.y0 + 0.02);
    place(c, 'hydration', A.hydrationStation(), 4.0, 23.68, 180);
    place(c, 'bench', P.bench(2.0, 'canvas'), 11.0, 23.2);
    plant(c, 0.95, 23.05, 1.5); plant(c, 17.05, 23.05, 1.5); plant(c, 17.05, 14.95, 1.4); plant(c, 0.95, 14.95, 1.4);
    downlights(c, [2.0, 5.0, 8.0, 11.0, 14.0, 16.4], [15.3, 22.8]); downlights(c, [1.4, 16.6], [17.5, 19.2, 20.9]);
  }
}

// ------------------------------------------------------------------------------ F11 dining
function furnishF11(c0: Omit<Ctx, 'room'>, clear: number) {
  let c: Ctx = { ...c0, room: 'zone.restaurant' };
  {
    // window tables for four, a central row, banquette tables for two along the north wall, bar on the east side
    for (const x of [2.0, 4.85, 7.7]) place(c, 'table', A.tableSet(0.5, 4), x, 1.95);
    for (const x of [2.0, 4.85]) place(c, 'table', A.tableSet(0.5, 4), x, 4.6);
    place(c, 'banquette', A.banquette(7.3, 'velvet_olive'), 7.9, 8.18, 180);
    for (let i = 0; i < 5; i++) place(c, 't2', A.tableForTwo(), 0.95 + i * 1.4, 6.15, 0);           // chair faces the banquette
    place(c, 'bar', A.barCounter(2.1), 11.35, 6.75, 180);
    place(c, 'backbar', A.backBar(1.45, clear - 0.3), 11.45, 8.18, 180);
    for (let i = 0; i < 3; i++) place(c, 'stool', P.stool('leather_tan'), 9.65 + i * 0.6, 5.45);
    for (const x of [2.0, 4.85, 7.7]) pendant(c, x, 1.95, clear - 1.35, clear, 0.24);
    for (const x of [2.0, 4.85]) pendant(c, x, 4.6, clear - 1.35, clear, 0.24);
    for (const x of [9.75, 10.35, 10.95]) pendant(c, x, 6.4, clear - 1.2, clear, 0.12);
    for (let i = 0; i < 5; i++) pendant(c, 0.95 + i * 1.4 + 0.33, 6.15, clear - 1.25, clear, 0.11);   // V11.5: every table for two has its own light
    place(c, 'art', P.art(1.6, 0.8, 'art_b', 'black_metal'), 2.0, 8.196, 180, 1.55); place(c, 'art', P.art(1.6, 0.8, 'art_a', 'black_metal'), 5.8, 8.196, 180, 1.55);
    plant(c, 0.72, 3.3, 1.35); plant(c, 10.9, 0.85, 1.35);
    downlights(c, [1.4, 3.4, 5.4, 7.4, 9.4, 11.0], [3.3, 7.3]);
  }
  c = { ...c0, room: 'zone.cafe' };
  {
    place(c, 'counter', A.barCounter(3.6, 1.0, 'stone_top', 'oak'), 16.6, 7.0, 180);
    place(c, 'backbar', A.backBar(3.6, clear - 0.4, false), 16.65, 8.18, 180);
    place(c, 'espresso', A.espressoMachine(), 15.95, 8.13, 180, 0.93);
    place(c, 'grinder', A.grinder(), 14.6, 7.95, 180, 0.93); place(c, 'grinder', A.grinder(), 14.25, 7.95, 180, 0.93);
    place(c, 'pastry', A.pastryCase(1.2), 15.2, 6.62, 180, 1.0);
    place(c, 'menu', A.menuBoard(1.5, 0.95), 15.0, 8.17, 180, 1.95);
    for (let i = 0; i < 4; i++) place(c, 'stool', P.stool('leather_tan'), 13.4 + i * 0.75, 5.85);
    for (const [x, y] of [[12.75, 1.55], [14.55, 1.55], [12.75, 3.75]] as [number, number][]) place(c, 'table', A.tableSet(0.36, 2, 'marble', 'fabric_taupe', 'oak', false), x, y);
    place(c, 'sofa', P.sofa(2.4, 0.86, 'fabric_taupe', { pillows: 3 }), 17.62, 2.1, 90);
    place(c, 'table', P.roundTable(0.4, 0.42, 'oak', 2), 16.0, 3.3);
    place(c, 'armchair', P.sofa(0.86, 0.82, 'velvet_rust', { pillows: 1 }), 14.75, 3.85, 270);
    for (const x of [13.5, 14.7, 15.9]) pendant(c, x, 6.4, clear - 1.3, clear, 0.13);
    for (const [x, y] of [[12.75, 1.55], [14.55, 1.55], [12.75, 3.75], [16.0, 3.3]] as [number, number][]) pendant(c, x, y, clear - 1.4, clear, 0.17);   // V11.5: café tables lit too
    plant(c, 17.25, 0.8, 1.3); plant(c, 17.2, 5.2, 1.1, 'bush');
    downlights(c, [12.5, 14.4, 16.4], [1.2, 3.6]);
  }
  c = { ...c0, room: 'zone.kitchen' };
  {
    // V12: commercial kitchen. Steel runs on legs with toe-kicks, worktops with an upstand against the wall (no gap
    // line), open shelves, a cooking line under an extraction hood with its duct and light, and a low prep table under the
    // window (the old 2 m block stood in front of it)
    const f = frame(c, 'steel', 0, 0);
    const run = (xa: number, xb: number, ya: number, yb: number, wallAt: 'lo' | 'hi') => {
      const wy0 = wallAt === 'lo' ? ya : yb - 0.03, wy1 = wallAt === 'lo' ? ya + 0.03 : yb;
      f.box('steel_dark', xa + 0.04, ya + (wallAt === 'lo' ? 0.04 : 0.08), xb - 0.04, yb - (wallAt === 'lo' ? 0.08 : 0.04), 0, 0.12, { noShadow: true });   // toe-kick
      f.box('steel', xa, ya, xb, yb, 0.12, 0.86);                                                                     // cabinets
      f.box('steel', xa - 0.01, ya - (wallAt === 'hi' ? 0.03 : 0), xb + 0.01, yb + (wallAt === 'lo' ? 0.03 : 0), 0.86, 0.9);   // worktop, front lip
      f.box('steel', xa, wy0, xb, wy1, 0.9, 1.5, { noShadow: true });                                                // upstand / splashback
      for (const z of [1.62, 2.02]) f.box('steel', xa + 0.1, wallAt === 'lo' ? ya : yb - 0.34, xb - 0.1, wallAt === 'lo' ? ya + 0.34 : yb, z, z + 0.03);   // open shelves
    };
    run(0.34, 6.6, 14.44, 15.1, 'lo'); run(0.34, 6.6, 18.8, 19.46, 'hi');
    // cooking line (island) + hood with duct, filters and a light strip
    f.box('steel_dark', 2.06, 16.46, 5.54, 17.44, 0, 0.12, { noShadow: true }); f.box('steel', 2.0, 16.4, 5.6, 17.5, 0.12, 0.88);
    f.box('steel_dark', 2.05, 16.45, 5.55, 17.45, 0.88, 0.9); for (const x of [2.5, 3.4, 4.3, 5.1]) f.cyl('steel_dark', x, 16.95, 0.17, 0.9, 0.93);
    f.box('steel', 2.0, 16.35, 5.6, 17.55, 2.2, 2.55); f.box('steel_dark', 2.1, 16.45, 5.5, 17.45, 2.18, 2.2); f.box('led', 2.2, 16.4, 5.4, 16.43, 2.15, 2.18, { noShadow: true });
    f.box('steel', 3.5, 16.75, 4.1, 17.15, 2.55, clear);                                                             // duct
    // prep table under the window (top below the sill), with an under-shelf
    f.box('steel', 0.36, 15.5, 1.0, 18.4, 0.84, 0.88); f.box('steel', 0.38, 15.55, 0.98, 18.35, 0.18, 0.2);
    for (const [x, y] of [[0.4, 15.54], [0.96, 15.54], [0.4, 18.36], [0.96, 18.36]] as [number, number][]) f.box('steel', x - 0.02, y - 0.02, x + 0.02, y + 0.02, 0, 0.84, { noShadow: true });
    downlights(c, [2.0, 4.0, 6.0], [15.6, 18.2]);
  }
  c = { ...c0, room: 'zone.terrace' };
  {
    // dining under the pergola, a lounge corner in the north-east, planted edge along the parapet
    for (const [x, y] of [[11.1, 16.25], [13.75, 16.25], [11.1, 18.95], [13.75, 18.95]] as [number, number][]) place(c, 'table', A.outdoorDining(0.45), x, y);
    place(c, 'sofa', P.sofa(2.6, 0.9, 'fabric_outdoor', { outdoor: true, pillows: 3 }), 16.85, 23.25, 180);
    place(c, 'sofa', P.sofa(2.4, 0.9, 'fabric_outdoor', { outdoor: true, pillows: 2 }), 17.62, 19.0, 90);
    rug(c, 14.15, 19.45, 16.6, 22.25, 'rug_outdoor');
    place(c, 'table', A.trayTable(0.48), 15.35, 21.0);
    place(c, 'lounger', P.lounger(true), 9.35, 21.4, 0); place(c, 'lounger', P.lounger(true), 10.35, 21.4, 0);
    place(c, 'side', A.sideTable('teak'), 11.55, 22.9);
    place(c, 'planter', P.planter(8.4, 0.45, 0.55, 'grass'), 9.2, 23.4);
    for (const [x, y] of [[17.35, 15.05], [9.45, 15.0]] as [number, number][]) plant(c, x, y, 1.4);
    for (const [x, y] of [[15.35, 21.0], [11.1, 16.25], [13.75, 16.25], [11.1, 18.95], [13.75, 18.95]] as [number, number][]) place(c, 'lantern', A.lantern(0.34), x + 0.18, y - 0.12, 0, x === 15.35 ? 0.385 : 0.76);
    for (const [x, y] of [[9.6, 17.6], [17.4, 17.6], [17.35, 21.9]] as [number, number][]) place(c, 'lantern', A.lantern(0.6), x, y);
    // V11.5: festoon strings under the pergola slats over each dining row and the lounge (warm 2200 K globes)
    festoon(c, 9.45, 17.55, [16.25, 18.95, 21.6], 2.9);
  }
  c = { ...c0, room: 'zone.shisha-conditional' };
  {
    // CONDITIONAL proposal: separate open-air majlis, screened from the main terrace by planting; smoke-free presentation
    place(c, 'majlis', A.majlis(3.4, 0.85), 0.35, 23.6, 270);
    place(c, 'majlis', A.majlis(3.5, 0.85), 4.85, 23.65, 180);
    rug(c, 1.35, 20.25, 5.35, 22.7, 'kilim');
    place(c, 'table', A.trayTable(0.42), 2.45, 21.55); place(c, 'table', A.trayTable(0.42), 4.15, 22.15);
    place(c, 'shisha', A.shisha(), 3.05, 20.75, 30); place(c, 'shisha', A.shisha(), 4.85, 21.45, 200);
    for (const x of [6.2, 6.95]) place(c, 'pouf', P.ottoman(0.55, 0.55, x < 6.5 ? 'velvet_rust' : 'velvet_olive'), x, 21.0);
    place(c, 'table', A.trayTable(0.32), 6.6, 22.3);
    for (const [x, y] of [[1.4, 20.35], [5.2, 23.0], [7.25, 20.3]] as [number, number][]) place(c, 'lantern', A.lantern(0.55), x, y);
    place(c, 'planter', P.planter(0.7, 3.5, 0.6, 'bush'), 7.6, 20.2);
    festoon(c, 0.45, 8.15, [21.2, 22.9], 2.9);
  }
}

export type FurnishMode = 'all' | 'nav' | 'outdoor' | 'indoor';
/**
 * mode 'nav'     = collision footprints only (no triangles; used by the navigation graph)
 * mode 'outdoor' = balcony / terrace furniture only — it lives in the always-visible floor SHELL so the tower
 *                  never looks unfurnished from a distance (rooftop seating, balcony sets)
 * mode 'indoor'  = everything else — streamed with the floor interior
 */
export function furnishFloor(f: FloorId, mode: FurnishMode | boolean = 'all'): Prim[] {
  const m: FurnishMode = mode === true ? 'nav' : mode === false ? 'all' : mode;
  const def = FLOOR_BY_ID[f]; const out: Prim[] = []; const c0 = { out, f };
  const outdoor = new Set(getFloorPlan(f).rooms.filter((r) => r.outdoor).map((r) => r.key));
  setDry(m === 'nav'); setPlaceFilter(m === 'outdoor' ? (r) => outdoor.has(r) : m === 'indoor' ? (r) => !outdoor.has(r) : null);
  try {
    if (m !== 'outdoor') furnishCore(c0, def.floorToFloor, def.clear);
    if (def.category === 'residential') { furnishA(c0, def.clear); furnishB(c0, def.clear); }
    else if (def.category === 'ground') furnishG(c0, def.clear);
    else if (def.category === 'wellness') furnishF10(c0, def.clear);
    else furnishF11(c0, def.clear);
  } finally { setDry(false); setPlaceFilter(null); }
  if (m === 'nav') return out;
  // soft contact shadows under furniture footprints (kept subtle; ambient occlusion does the rest)
  const contacts: Prim[] = [];
  for (const p of out) {
    let r: { x0: number; x1: number; y0: number; y1: number } | null = null;
    if (p.k === 'box' && (p.grp === 'nav' || p.grp === 'furn') && p.mat !== 'glass' && p.mat !== 'gap_dark' && p.z0 < 0.5 && p.z1 - p.z0 > 0.03 && p.z0 >= 0) r = p;
    else if (p.k === 'cyl' && p.grp === 'furn' && p.z0 < 0.5 && p.z1 - p.z0 > 0.03 && p.z0 >= 0) { const rr = Math.max(p.r, p.r2 ?? 0); r = { x0: p.cx - rr, x1: p.cx + rr, y0: p.cy - rr, y1: p.cy + rr }; }
    if (!r || (r.x1 - r.x0) * (r.y1 - r.y0) < 0.12) continue;
    const m = 0.14;
    contacts.push({ k: 'slab', sem: `${f}.contact`, mat: 'contact', grp: 'furn', x0: r.x0 - m, x1: r.x1 + m, y0: r.y0 - m, y1: r.y1 + m, z: 0.022, up: true });
  }
  out.push(...contacts);
  return out;
}
