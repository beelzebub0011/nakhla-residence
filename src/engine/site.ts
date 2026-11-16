import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Prim } from '../domain/types';
import { PLINTH, toWorldX, toWorldZ } from '../domain/tower';
import { buildMeshes } from './builder';
import { bez, piece, place, rnd } from '../domain/modelkit';
import { palmEmblem } from '../domain/amenityPieces';
import type { MatLib } from './matlib';

// FICTIONAL SITE (illustrative, Basrah-inspired, NOT a real address or view): a corner plot on a main street with a
// side street and a rear lane; low/mid-rise neighbours with real window grids; kerbs, crossings, street lamps,
// parked cars, hedges, lawn and a far skyline band. Three distance zones: near (modelled), mid (textured massing),
// far (hazy silhouettes). See ENVIRONMENT_DESIGN_SPEC.md.

const P0 = 0.15; // plaza / pavement level (m above road datum)
/** palm trunks are set slightly into the paving / soil so they read planted on both (S23 SHD-01) */
export const PALM_BASE = 0.09;
/** broadleaf street trees stand in grates set into the pavement */
const PAVE_BASE = P0 - 0.03;
/** V11 round 2 entrance portal (plot coordinates): fins at x0 / x1, canopy from the façade (y 0) out to y0, underside z0, top z1 */
export const CANOPY = { x0: 3.4, x1: 14.6, y0: -4.6, z0: 3.96, z1: 4.42 };
/** V11.5 entrance monolith: dark stone slab at the west of the forecourt with the bronze palm emblem and lit lettering. */
export const MONOLITH = { x0: -0.35, x1: 1.45, y0: -4.98, y1: -4.64, z1: 2.55, sign: { x: 0.55, y: -4.98, z: 0.62 + 0.15, text: 'NAKHLA' } };
/** recessed downlights in the canopy soffit [x, y] (shared with Blender for real spot lights) */
export function canopyDownlights(): [number, number][] {
  const out: [number, number][] = [];
  for (let x = 5.0; x <= 13.01; x += 2) for (const y of [-3.7, -1.9]) out.push([x, y]);
  return out;
}

// V11: lofted car bodies (no boxes). Superellipse sections along the length, wheel arches cut by raising the underbody,
// glass cabin, painted roof panel, tyres + rims, head/tail lights, mirrors. Local frame: x 0..L (front at +x), y 0..W, z up.
const sgnPow = (c: number, e: number) => Math.sign(c) * Math.pow(Math.abs(c), e);
const smooth = (a: number, b: number, t: number) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const car = (paint: string, kind: 'sedan' | 'suv' = 'sedan') => piece(`car2|${paint}|${kind}`, (m) => {
  const suv = kind === 'suv'; const L = suv ? 4.7 : 4.6, W = 1.84, hw = W / 2 - 0.02, lift = suv ? 0.08 : 0;
  const wx = [0.95, L - 1.0], wr = suv ? 0.37 : 0.33;
  const endK = (v: number) => { const e = Math.max(0, Math.abs(2 * v - 1) - 0.86) / 0.14; return Math.sqrt(Math.max(0, 1 - e * e)); };
  const top = (v: number) => lift + (0.62 + 0.24 * smooth(0, 0.22, v) + 0.1 * smooth(0.22, 0.36, v) + 0.02 * smooth(0.7, 0.86, v) - 0.16 * smooth(0.88, 1, v)) + (suv ? 0.05 : 0);
  const bot = (x: number) => { let b = 0.2 + lift; for (const c of wx) { const d = (x - c) / (wr + 0.1); if (Math.abs(d) < 1) b = Math.max(b, 0.2 + lift + (2 * wr + 0.03 - 0.2 - lift) * Math.sqrt(1 - d * d)); } return b; };
  m.mat(paint).sheet(28, 40, (u, v) => {
    const th = u * Math.PI * 2, k = endK(v), x = v * L; const zt = top(v), zb = bot(x); const zc = (zt + zb) / 2, hh = ((zt - zb) / 2) * (0.35 + 0.65 * k);
    return [x, W / 2 + sgnPow(Math.cos(th), 0.35) * hw * (0.55 + 0.45 * k), zc + sgnPow(Math.sin(th), 0.5) * hh];
  }, { su: 2, sv: L });
  // glass cabin: belt → roof, narrower at the top
  const c0 = suv ? 0.3 : 0.34, c1 = suv ? 0.9 : 0.8, roofZ = lift + (suv ? 1.66 : 1.42);
  const roofAt = (v: number) => { const t = (v - c0) / (c1 - c0); return smooth(0, suv ? 0.2 : 0.34, t) * (1 - smooth(suv ? 0.9 : 0.66, 1, t)); };
  const cab = (mat: string, grow: number, u0: number, u1: number, v0: number, v1: number) => m.mat(mat).sheet(18, 26, (u, w) => {
    const v = v0 + (v1 - v0) * w; const belt = top(v) - 0.03; const r = roofAt(v); const zt = belt + (roofZ - belt) * r;
    const th = (u0 + (u1 - u0) * u) * Math.PI * 2; const sz = Math.sin(th), cy = Math.cos(th);
    const z = belt + Math.max(0, sz) * (zt - belt) * grow; const t = (z - belt) / Math.max(0.01, roofZ - belt);
    return [v * L, W / 2 + sgnPow(cy, 0.4) * (hw - 0.05 - 0.2 * t) * grow, z];
  }, { su: 2, sv: L });
  cab('car_glass', 1, 0, 0.5, c0, c1);
  cab(paint, 1.012, 0.16, 0.34, c0 + (c1 - c0) * (suv ? 0.2 : 0.36), c0 + (c1 - c0) * (suv ? 0.9 : 0.64));
  // wheels: tyre (lathe about the axle) + rim
  for (const x of wx) for (const side of [0, 1]) m.at(x, side ? W - 0.13 : 0.13, wr, 0, () => {
    m.rotX(90); m.mat('tyre').lathe(0, 0, [[wr * 0.64, -0.11], [wr * 0.9, -0.12], [wr, -0.085], [wr, 0.085], [wr * 0.9, 0.12], [wr * 0.64, 0.11]], 22);
    m.mat('rim').cyl(0, 0, side ? -0.105 : 0.095, side ? -0.095 : 0.105, wr * 0.64, wr * 0.6, 18);
  });
  // lights + mirrors
  const fz = top(0.04);
  m.mat('lamp_head').box(L - 0.12, 0.18, fz - 0.12, L - 0.02, 0.5, fz - 0.04, 0.02).box(L - 0.12, W - 0.5, fz - 0.12, L - 0.02, W - 0.18, fz - 0.04, 0.02);
  const rz = top(0.97);
  m.mat('tail_light').box(0.0, 0.14, rz - 0.13, 0.08, 0.55, rz - 0.04, 0.02).box(0.0, W - 0.55, rz - 0.13, 0.08, W - 0.14, rz - 0.04, 0.02);
  m.mat(paint).box(L * (c0 + 0.04), -0.1, top(0.35) + 0.04, L * (c0 + 0.04) + 0.16, 0.06, top(0.35) + 0.16, 0.03).box(L * (c0 + 0.04), W - 0.06, top(0.35) + 0.04, L * (c0 + 0.04) + 0.16, W + 0.1, top(0.35) + 0.16, 0.03);
  m.solid(0, 0, L, W, 0, 1.5);
});
const streetLamp = () => piece('streetlamp', (m) => {
  m.mat('lamp_pole').cyl(0, 0, 0, 0.25, 0.14, 0.1, 12).tube([[0, 0, 0.2], [0, 0, 6.6], ...bez([0, 0, 6.6], [0, 0, 7.5], [0, 1.5, 7.4], 6)], 0.07, 8, 0.045);
  m.box(-0.14, 1.2, 7.3, 0.14, 1.95, 7.4, 0.02); m.mat('lamp_head').box(-0.11, 1.26, 7.285, 0.11, 1.9, 7.3);
});
const bollardLight = () => piece('bollard', (m) => { m.mat('lamp_pole').cyl(0, 0, 0, 0.72, 0.06, 0.06, 10).cyl(0, 0, 0.8, 0.86, 0.065, 0.065, 10); m.mat('lamp_head').cyl(0, 0, 0.72, 0.8, 0.055, 0.055, 10); });
const bench = () => piece('bench_site', (m) => {
  m.mat('lamp_pole'); for (const x of [0.15, 1.65]) m.box(x, 0.05, 0, x + 0.06, 0.5, 0.42);
  m.mat('teak'); for (let i = 0; i < 4; i++) m.box(0, 0.04 + i * 0.125, 0.42, 1.86, 0.14 + i * 0.125, 0.46, 0.006);
});

/** façade material per neighbour variant (V11.3: five tones — ivory, grey, cream, warm sand, grey-beige) */
const FACADES = ['ctx_a', 'ctx_b', 'ctx_c', 'ctx_d', 'ctx_e', 'ctx_f', 'ctx_g', 'ctx_h'];   // V11.5: eight tones
/** V11.3 district grid around the modelled core (plot coordinates, metres). Roads run on the grid lines. */
// grid lines are aligned with the centre lines of the main street (y −13.5) and the side street (x 30), so both continue
// as avenues through the district
export const DISTRICT = { x0: 30 - 72 * 10, x1: 30 + 72 * 10, y0: -13.5 - 60 * 11, y1: -13.5 + 60 * 12, pitchX: 72, pitchY: 60, road: 12, core: [-132, 154, -104, 122] as const };
/** lower-left corner [x, y] of every district block (block = pitch minus the road) outside the modelled core */
export function districtBlocks(): [number, number][] {
  const out: [number, number][] = []; const [cx0, cx1, cy0, cy1] = DISTRICT.core;
  for (let x = DISTRICT.x0; x + DISTRICT.pitchX <= DISTRICT.x1; x += DISTRICT.pitchX) for (let y = DISTRICT.y0; y + DISTRICT.pitchY <= DISTRICT.y1; y += DISTRICT.pitchY) {
    const bx0 = x + DISTRICT.road / 2, by0 = y + DISTRICT.road / 2, bx1 = x + DISTRICT.pitchX - DISTRICT.road / 2, by1 = y + DISTRICT.pitchY - DISTRICT.road / 2;
    if (bx0 >= cx0 && bx1 <= cx1 && by0 >= cy0 && by1 <= cy1) continue;             // fully inside the modelled core (it has its own streets)
    out.push([bx0, by0]);
  }
  return out;
}

/** V11.5: carriageway + pavement rectangles of the modelled core streets [x0, x1, y0, y1] (plot coordinates). */
export const CORE_ROADS: [number, number, number, number][] = [
  [-140, 160, -22.6, -5],      // main street with both pavements
  [23.2, 36.8, -7.8, 122],     // side street (east), run through to the district grid road
  [-110, 25.6, 29.2, 38],      // rear lane (north)
];
export function onCoreRoad(x0: number, x1: number, y0: number, y1: number, margin = 1.2) {
  return CORE_ROADS.some(([a0, a1, b0, b1]) => x1 > a0 - margin && x0 < a1 + margin && y1 > b0 - margin && y0 < b1 + margin);
}
/**
 * Neighbouring buildings: [x0, x1, y0, y1, storeys, variant]. Storey = 3.3 m so window rows match the façade texture.
 * Generated per street block as individual plots with side yards — low-rise next to the tower (it stays the tallest
 * object by far), slightly taller in the second ring. Deterministic; nothing here depicts a real place.
 */
/** V11.5: plots left empty by the generator become planted gardens [x0, x1, y0, y1] (lawn + trees), as in the reference reels. */
export const GARDENS: number[][] = [];
export const NEIGHBOURS: number[][] = (() => {
  const out: number[][] = []; let seed = 23; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const block = (bx0: number, bx1: number, by0: number, by1: number, lotW: number, lotD: number, sMin: number, sMax: number, skip = 0.12) => {
    const nx = Math.max(1, Math.round((bx1 - bx0) / (lotW + 3.5))), ny = Math.max(1, Math.round((by1 - by0) / (lotD + 3.5)));
    const cw = (bx1 - bx0) / nx, cd = (by1 - by0) / ny;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      if (rnd() < skip) { GARDENS.push([bx0 + i * cw + 1.2, bx0 + (i + 1) * cw - 1.2, by0 + j * cd + 1.2, by0 + (j + 1) * cd - 1.2]); continue; }   // an empty plot = a garden
      const mx = 1.4 + rnd() * 1.6, my = 1.4 + rnd() * 1.6;
      out.push([bx0 + i * cw + mx, bx0 + (i + 1) * cw - mx, by0 + j * cd + my, by0 + (j + 1) * cd - my, sMin + Math.floor(rnd() * (sMax - sMin + 1)), Math.floor(rnd() * FACADES.length)]);
    }
  };
  block(-58, -8, -4, 28.5, 13, 13, 2, 4);            // west of the plot
  block(37.5, 86, -4, 34, 14, 15, 2, 4);             // east, across the side street
  block(-58, 22, 38.5, 62, 15, 20, 2, 4);            // north, across the rear lane
  block(37.5, 86, 38.5, 62, 14, 20, 3, 5);
  block(-76, 82, -44, -23.5, 16, 18, 2, 3);          // south, across the main street: kept low so the street stays visible
  block(-128, -64, -44, 62, 20, 22, 3, 5, 0.2);      // second ring
  block(92, 150, -44, 62, 20, 22, 3, 6, 0.2);
  block(-128, 150, 68, 118, 22, 22, 3, 6, 0.2);
  block(-128, 150, -100, -50, 22, 22, 3, 6, 0.2);
  // V11.5 fix: the second-ring blocks span the core streets. Lots that touch a carriageway or its pavements are dropped
  // (they used to stand in the middle of the main street, the side street and the rear lane).
  for (let k = out.length - 1; k >= 0; k--) if (onCoreRoad(out[k][0], out[k][1], out[k][2], out[k][3])) out.splice(k, 1);
  for (let k = GARDENS.length - 1; k >= 0; k--) if (onCoreRoad(GARDENS[k][0], GARDENS[k][1], GARDENS[k][2], GARDENS[k][3])) GARDENS.splice(k, 1);
  // V11.3 midground district (≈150–700 m): street blocks on a 72 × 60 m grid (12 m roads) with 2 × 2 lots each, mostly
  // 2–5 storeys and an occasional 7–11 storey block, so aerial and long street views end in a city, not an empty plain.
  for (const [bx0, by0] of districtBlocks()) {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      if (rnd() < 0.1) { const lw = (DISTRICT.pitchX - DISTRICT.road) / 2, ld = (DISTRICT.pitchY - DISTRICT.road) / 2; GARDENS.push([bx0 + i * lw + 1.5, bx0 + (i + 1) * lw - 1.5, by0 + j * ld + 1.5, by0 + (j + 1) * ld - 1.5]); continue; }
      const lw = (DISTRICT.pitchX - DISTRICT.road) / 2, ld = (DISTRICT.pitchY - DISTRICT.road) / 2; const mx = 1.5 + rnd() * 2.5, my = 1.5 + rnd() * 2.5;
      const st = rnd() < 0.06 ? 7 + Math.floor(rnd() * 5) : 2 + Math.floor(rnd() * 4);
      const r: number[] = [bx0 + i * lw + mx, bx0 + (i + 1) * lw - mx, by0 + j * ld + my, by0 + (j + 1) * ld - my, st, Math.floor(rnd() * FACADES.length)];
      const [cx0, cx1, cy0, cy1] = DISTRICT.core;
      if (r[1] > cx0 && r[0] < cx1 && r[3] > cy0 && r[2] < cy1) continue;            // lots overlapping the modelled core are left out
      out.push(r);
    }
  }
  return out;
})();

/** Street lamp posts [x, y, facing°] in plot coordinates (shared with the Blender export for real lamp lights). */
export function streetLamps(): [number, number, number][] {
  const lamps: [number, number, number][] = [];
  for (let x = -96; x <= 120; x += 24) { lamps.push([x, -6.2, 180]); if (x + 12 <= 126) lamps.push([x + 12, -20.8, 0]); }   // no lamp beyond the end of the pavement (S23)
  for (let y = 8; y <= 100; y += 24) { lamps.push([24.3, y, 270]); lamps.push([35.7, y + 12, 90]); }
  for (let x = -90; x <= 10; x += 25) lamps.push([x, 30.3, 0]);
  return lamps;
}
/** World position of each lamp head (the luminaire sits 1.6 m out on the arm, 7.28 m up). */
export function streetLampHeads(): [number, number, number][] {
  return streetLamps().map(([x, y, d]) => { const a = (d * Math.PI) / 180; return [+(x - 1.6 * Math.sin(a)).toFixed(2), +(y + 1.6 * Math.cos(a)).toFixed(2), 7.28 + 0.15] as [number, number, number]; });
}

export function sitePrims(): Prim[] {
  const out: Prim[] = []; const sem = 'SITE';
  const box = (mat: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, noShadow = false) => out.push({ k: 'box', sem, mat, grp: 'site', x0, x1, y0, y1, z0, z1, noShadow });
  const ctx = { out, f: 'SITE', room: 'site', grp: 'site' as const };
  // ---- ground: plot paving, pavements with kerbs, asphalt carriageways, lawn
  box('plaza', -3, 21, -5, 27, 0, P0, true);                                  // tower plot (24 x 32 m hypothesis)
  box('plaza', -110, 130, -7.6, -5, 0, P0, true); box('curb', -110, 130, -7.8, -7.6, 0, P0 + 0.02, true);   // north pavement of the main street
  box('asphalt', -140, 160, -19.2, -7.8, 0, 0.03, true);                      // main street
  box('curb', -110, 130, -19.4, -19.2, 0, P0 + 0.02, true); box('plaza', -110, 130, -22.6, -19.4, 0, P0, true);
  box('asphalt', 25.6, 34.4, -7.8, 122, 0, 0.03, true);                       // side street (east)
  box('curb', 25.4, 25.6, -5, 122, 0, P0 + 0.02, true); box('plaza', 23.2, 25.4, -5, 122, 0, P0, true);
  box('curb', 34.4, 34.6, -5, 122, 0, P0 + 0.02, true); box('plaza', 34.6, 36.8, -5, 122, 0, P0, true);
  box('asphalt', -110, 25.6, 31.2, 36.8, 0, 0.03, true);                      // rear lane (north)
  box('plaza', -110, 23.2, 29.2, 31.2, 0, P0, true); box('plaza', -110, 23.2, 36.8, 38, 0, P0, true);
  box('grass', 21, 23.2, -5, 29.2, 0, 0.1, true); box('grass', -3, 21, 27, 29.2, 0, 0.1, true); box('grass', -6.6, -3, -5, 29.2, 0, 0.1, true);
  // V11.5 gardens on the empty plots: lawn with a paved edge (trees come from treeSpots)
  for (const [x0, x1, y0, y1] of GARDENS) { if (onCoreRoad(x0, x1, y0, y1)) continue; box('plaza', x0, x1, y0, y1, 0, 0.04, true); box('grass', x0 + 0.8, x1 - 0.8, y0 + 0.8, y1 - 0.8, 0, 0.07, true); }
  // lane markings + zebra crossing in front of the entrance
  for (let x = -104; x < 126; x += 9) { if (x > 2 && x < 16) continue; box('road_line', x, x + 3.6, -13.58, -13.42, 0.03, 0.036, true); }
  for (let y = -2; y < 104; y += 9) box('road_line', 29.92, 30.08, y, y + 3.6, 0.03, 0.036, true);
  for (let i = 0; i < 9; i++) box('road_line', 5.2 + i * 0.95, 5.75 + i * 0.95, -18.4, -8.6, 0.03, 0.038, true);
  // ---- tower base: steps, plinth skirt, entrance portal, planters, boundary wall + hedge
  box('stone_base', 4.2, 13.8, -1.0, 0, P0, PLINTH - 0.15); box('stone_base', 4.2, 13.8, -0.5, 0, PLINTH - 0.15, PLINTH);
  box('stone_base', -0.06, 18.06, -0.06, 24.06, P0, PLINTH - 0.3);
  // V11 round 2 — arrival portal: two stone fins carry a deep cantilevered canopy (bronze powder coat, teak slat soffit,
  // recessed downlights, a light line along the front edge); a lit reveal on each fin; polished granite forecourt.
  const [cx0, cx1, cy0] = [CANOPY.x0, CANOPY.x1, CANOPY.y0];
  for (const [f0, f1, rx] of [[cx0, cx0 + 0.4, cx0 + 0.4], [cx1 - 0.4, cx1, cx1 - 0.4]]) {
    box('stone_base', f0, f1, cy0, 0, P0, CANOPY.z0);                                               // dark stone fin
    box('lamp_head', rx - (rx > 9 ? 0.012 : 0), rx + (rx > 9 ? 0 : 0.012), cy0 + 0.35, cy0 + 0.41, P0 + 0.45, CANOPY.z0 - 0.3, true);   // lit reveal
  }
  box('bronze_pc', cx0, cx1, cy0, 0, CANOPY.z0 + 0.06, CANOPY.z1);                                 // canopy body
  for (let x = cx0 + 0.5; x < cx1 - 0.45; x += 0.16) box('teak', x, x + 0.075, cy0 + 0.08, -0.05, CANOPY.z0, CANOPY.z0 + 0.06, true);   // soffit slats
  box('lamp_head', cx0 + 0.45, cx1 - 0.45, cy0 + 0.06, cy0 + 0.12, CANOPY.z0 - 0.012, CANOPY.z0, true);   // front light line
  for (const [x, y] of canopyDownlights()) out.push({ k: 'cyl', sem, mat: 'lamp_head', grp: 'site', cx: x, cy: y, r: 0.07, z0: CANOPY.z0 - 0.012, z1: CANOPY.z0 + 0.01 });
  box('granite_polish', cx0 + 0.4, cx1 - 0.4, cy0, -1.0, P0, P0 + 0.012, true);                   // polished forecourt
  // V11.5 entrance identity: stone monolith with the bronze palm emblem, a lit reveal and a night uplight
  { const M = MONOLITH; box('stone_base', M.x0, M.x1, M.y0, M.y1, P0, P0 + M.z1);
    box('granite_polish', M.x0 - 0.12, M.x1 + 0.12, M.y0 - 0.12, M.y1 + 0.12, P0, P0 + 0.06);
    box('lamp_head', M.x0 + 0.18, M.x1 - 0.18, M.y0 - 0.006, M.y0, P0 + 0.42, P0 + 0.44, true);              // lit reveal under the name
    place(ctx, 'emblem', palmEmblem(0.95), (M.x0 + M.x1) / 2 - 0.04, M.y0 - 0.035, 0, P0 + 1.02);
    out.push({ k: 'cyl', sem, mat: 'lamp_head', grp: 'site', cx: (M.x0 + M.x1) / 2, cy: M.y0 - 0.5, r: 0.05, z0: P0 + 0.06, z1: P0 + 0.1 });
    out.push({ k: 'slab', sem, mat: 'glow_pool', grp: 'site', x0: M.x0 - 1.2, x1: M.x1 + 1.2, y0: M.y0 - 2.4, y1: M.y1 + 0.2, z: P0 + 0.065, up: true }); }
  for (const [x0, x1, y0, y1] of [[-2.4, 3.4, -4.4, -3.6], [14.6, 20.4, -4.4, -3.6], [-2.6, -1.8, 1, 23], [19.8, 20.6, 1, 23]]) {
    box('stone_base', x0, x1, y0, y1, P0, P0 + 0.5);
    if (y1 - y0 < 1) box('mulch', x0 + 0.08, x1 - 0.08, y0 + 0.08, y1 - 0.08, P0 + 0.5, P0 + 0.53, true);   // front planters: soil + shrubs + an olive
    else box('hedge', x0 + 0.08, x1 - 0.08, y0 + 0.08, y1 - 0.08, P0 + 0.5, P0 + 0.95);
  }
  // tree pits along the pavements (dark steel grates around the trunks)
  for (const [x, y, , kind, base] of treeSpots()) if (TREE_KINDS[kind] === 'street' && base === PAVE_BASE) box('tree_grate', x - 0.65, x + 0.65, y - 0.65, y + 0.65, P0, P0 + 0.008, true);
  box('stone', -6.75, -6.6, -5, 29.2, 0, 1.1); box('hedge', -6.55, -5.9, -4.6, 28.8, 0.1, 1.25);      // west boundary
  box('stone', -6.75, 23.2, 29.2, 29.35, 0, 1.1);                                                      // north boundary
  for (const x of [2.2, 3.0, 15.0, 16.8]) place(ctx, 'bollard', bollardLight(), x, -4.75, 0, P0);   // stand ON the paving (S23 SHD-01)
  place(ctx, 'bench', bench(), -1.6, -6.9, 0, P0); place(ctx, 'bench', bench(), 16.2, -6.9, 0, P0);
  // ---- street lamps with soft light pools (pools are visible only at night)
  for (const [x, y, d] of streetLamps()) {
    place(ctx, 'lamp', streetLamp(), x, y, d, P0);
    const hx = x + (d === 270 ? 1.6 : d === 90 ? -1.6 : 0), hy = y + (d === 0 ? 1.6 : d === 180 ? -1.6 : 0);
    out.push({ k: 'slab', sem, mat: 'glow_pool', grp: 'site', x0: hx - 6.5, x1: hx + 6.5, y0: hy - 6.5, y1: hy + 6.5, z: P0 + 0.03, up: true });
  }
  // ---- parked cars (scale cues)
  // parked along the kerbs (front wheels to the traffic direction), restrained colours, sedans and SUVs mixed
  const parked: [number, number, number, string, 'sedan' | 'suv'][] = [
    [-30, -9.95, 0, 'car_white', 'suv'], [-22, -9.9, 0, 'car_dark', 'sedan'], [-15.5, -9.95, 0, 'car_sand', 'sedan'], [19.5, -9.9, 0, 'car_grey', 'suv'], [26.2 - 30, -9.9, 0, 'car_bronze', 'sedan'],
    [-58, -17.1, 180, 'car_sand', 'sedan'], [-12, -17.05, 180, 'car_white', 'sedan'], [44, -17.1, 180, 'car_grey', 'sedan'],
    [27.7, 44, 90, 'car_grey', 'sedan'], [27.7, 52, 90, 'car_white', 'suv'], [32.3, 70, 270, 'car_sand', 'sedan'],
    // V11.4 (G6, Form Architects study): the streets round the tower read busier. The kerbs stay clear at the zebra crossing
    // (x 5–14), the side-street junction (x 25–35 on the north kerb) and the rear-lane mouth (y 29–39).
    [-52, -9.95, 0, 'car_grey', 'sedan'], [-44.5, -9.9, 0, 'car_white', 'sedan'], [-37.5, -9.95, 0, 'car_dark', 'suv'], [42, -9.9, 0, 'car_white', 'sedan'], [48.5, -9.95, 0, 'car_sand', 'suv'], [55, -9.9, 0, 'car_grey', 'sedan'],
    [-35, -17.1, 180, 'car_white', 'suv'], [-27.5, -17.05, 180, 'car_grey', 'sedan'], [-20.5, -17.1, 180, 'car_dark', 'sedan'], [-4, -17.05, 180, 'car_sand', 'sedan'], [18, -17.1, 180, 'car_white', 'sedan'], [24.5, -17.05, 180, 'car_bronze', 'suv'], [31, -17.1, 180, 'car_grey', 'sedan'], [37.5, -17.05, 180, 'car_white', 'sedan'], [51, -17.1, 180, 'car_dark', 'suv'],
    [27.7, 3, 90, 'car_white', 'sedan'], [27.7, 10, 90, 'car_sand', 'suv'], [27.7, 17, 90, 'car_dark', 'sedan'], [27.7, 60, 90, 'car_grey', 'sedan'],
    [32.3, 6, 270, 'car_grey', 'suv'], [32.3, 13, 270, 'car_white', 'sedan'], [32.3, 21, 270, 'car_bronze', 'sedan'], [32.3, 44.5, 270, 'car_dark', 'sedan'], [32.3, 52, 270, 'car_white', 'suv']];
  for (const [x, y, d, paint, kind] of parked) place(ctx, 'car', car(paint, kind), x, y, d);
  // ---- V11.4 façade kit for the district 75–250 m out (REMAINING_ISSUES #1). Every lot gets a shop podium on the faces
  // that front a road (piers, open or closed shopfronts, a fascia with sign panels and a light line), then one of four
  // upper-floor treatments so neighbouring lots stop reading as the same box: floor bands, continuous balconies,
  // vertical fins, or a set-back penthouse with a cornice. Same prims feed both renderers; no new materials, so the
  // live draw-call count barely moves (buckets are merged per material).
  type Face = { a: number; b: number; at: number; axis: 'x' | 'y'; dir: number };
  const fboxAt = (f: Face, mat: string, a0: number, a1: number, d0: number, d1: number, z0: number, z1: number, ns = false) => {
    const p0 = f.at + f.dir * d0, p1 = f.at + f.dir * d1; const lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    if (f.axis === 'y') box(mat, a0, a1, lo, hi, z0, z1, ns); else box(mat, lo, hi, a0, a1, z0, z1, ns);
  };
  const districtFacade = (x0: number, x1: number, y0: number, y1: number, h: number, st: number, v: number, i: number, ns: boolean) => {
    const rr = rnd(i * 131 + 7); const [kx0, kx1, ky0, ky1] = DISTRICT.core;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const inCore = cx > kx0 && cx < kx1 && cy > ky0 && cy < ky1;
    // a face fronts a road when it lies within road/2 + 5 m of a grid line (district lots); core lots: all four faces
    const near = (at: number, base: number, pitch: number, side: number) => { const m = (((at - base) % pitch) + pitch) % pitch; return (side < 0 ? m : pitch - m) < DISTRICT.road / 2 + 5; };
    const all: [Face, boolean][] = [
      [{ a: x0, b: x1, at: y0, axis: 'y', dir: -1 }, near(y0, DISTRICT.y0, DISTRICT.pitchY, -1)],
      [{ a: x0, b: x1, at: y1, axis: 'y', dir: 1 }, near(y1, DISTRICT.y0, DISTRICT.pitchY, 1)],
      [{ a: y0, b: y1, at: x0, axis: 'x', dir: -1 }, near(x0, DISTRICT.x0, DISTRICT.pitchX, -1)],
      [{ a: y0, b: y1, at: x1, axis: 'x', dir: 1 }, near(x1, DISTRICT.x0, DISTRICT.pitchX, 1)]];
    const faces = all.filter(([, r]) => inCore || r).map(([f]) => f);
    const style = (i * 7 + v * 3) % 4;
    for (const f of faces) {
      const len = f.b - f.a; const bays = Math.max(1, Math.round(len / 4.6)); const bw = len / bays;
      for (let b = 0; b < bays; b++) {
        const r = rr(); const a0 = f.a + b * bw + 0.22, a1 = f.a + (b + 1) * bw - 0.22;
        fboxAt(f, r < 0.5 ? 'shop_lit' : r < 0.85 ? 'shop_glass' : 'render_sand', a0, a1, 0, 0.04, 0.12, 2.9, true);
        if (r < 0.5 && rr() < 0.6) fboxAt(f, rr() < 0.5 ? 'bronze_pc' : 'stone_base', a0 + 0.4, a1 - 0.4, 0.2, 0.3, 3.0, 3.5, true);   // sign panel
        if (r < 0.5) {   // V11.4 (G4): warm light spilling from an open shop onto the pavement after dark (web-only stand-in; Cycles has real light)
          const p0 = f.at + f.dir * 0.05, p1 = f.at + f.dir * 2.7; const lo = Math.min(p0, p1), hi = Math.max(p0, p1);
          out.push(f.axis === 'y' ? { k: 'slab', sem, mat: 'glow_pool', grp: 'site', x0: a0 - 0.4, x1: a1 + 0.4, y0: lo, y1: hi, z: 0.135, up: true } : { k: 'slab', sem, mat: 'glow_pool', grp: 'site', x0: lo, x1: hi, y0: a0 - 0.4, y1: a1 + 0.4, z: 0.135, up: true });
        }
      }
      for (let b = 0; b <= bays; b++) fboxAt(f, v % 2 ? 'stone_base' : 'render_sand', f.a + b * bw - 0.22, f.a + b * bw + 0.22, 0, 0.14, 0.02, 3.3, ns);   // piers
      fboxAt(f, 'render_ivory', f.a - 0.1, f.b + 0.1, 0, 0.2, 2.9, 3.6, ns);                                            // fascia
      fboxAt(f, 'lamp_head', f.a + 0.3, f.b - 0.3, 0.16, 0.2, 2.86, 2.9, true);                                         // light line
      if (st < 2) continue;
      if (style === 1) for (let k = 1; k < st; k++) {                                                                  // continuous balconies
        fboxAt(f, 'render_ivory', f.a + 0.3, f.b - 0.3, 0, 1.15, k * 3.3 - 0.04, k * 3.3 + 0.16, ns);
        fboxAt(f, 'glass', f.a + 0.35, f.b - 0.35, 1.09, 1.12, k * 3.3 + 0.16, k * 3.3 + 1.05, true);
        fboxAt(f, 'lamp_pole', f.a + 0.3, f.b - 0.3, 1.09, 1.15, k * 3.3 + 1.03, k * 3.3 + 1.08, true);
      }
      if (style === 2) { const n = Math.max(2, Math.round(len / 2.4)); for (let k = 0; k <= n; k++) {                // vertical fins
        const a = f.a + 0.3 + (k * (len - 0.6)) / n; fboxAt(f, v % 2 ? 'render_ivory' : 'stone_base', a - 0.09, a + 0.09, 0, 0.42, 3.6, h - 0.1, ns);
      } }
    }
    if (style === 0) for (let k = 1; k < st; k++) box('render_ivory', x0 - 0.08, x1 + 0.08, y0 - 0.08, y1 + 0.08, k * 3.3 - 0.06, k * 3.3 + 0.1, ns);   // floor bands
    if (style === 3 && st >= 3) {                                                                                       // set-back penthouse + cornice
      box('render_ivory', x0 - 0.25, x1 + 0.25, y0 - 0.25, y1 + 0.25, h - 0.35, h, ns);
      const ix = (x1 - x0) * 0.22, iy = (y1 - y0) * 0.22;
      box(FACADES[(v + 2) % FACADES.length], x0 + ix, x1 - ix, y0 + iy, y1 - iy, h + 0.45, h + 3.3, ns);
      box('ctx_roof', x0 + ix - 0.15, x1 - ix + 0.15, y0 + iy - 0.15, y1 - iy + 0.15, h + 3.3, h + 3.6, ns);
      // pergola over the front terrace: two posts and an edge beam, side beams back to the penthouse wall, slats
      const py = y0 + iy * 0.2;
      for (const x of [x0 + ix + 0.1, x1 - ix - 0.1]) { box('bronze_pc', x - 0.08, x + 0.08, py - 0.08, py + 0.08, h + 0.45, h + 3.0, true); box('bronze_pc', x - 0.06, x + 0.06, py, y0 + iy, h + 2.84, h + 3.0, true); }
      box('bronze_pc', x0 + ix, x1 - ix, py - 0.07, py + 0.07, h + 2.84, h + 3.0, true);
      for (let k = 0; k < 7; k++) { const y = py + 0.25 + (k * (iy * 0.8 - 0.4)) / 6; box('teak', x0 + ix + 0.1, x1 - ix - 0.1, y, y + 0.12, h + 3.0, h + 3.1, true); }
    }
  };
  // ---- neighbours: textured massing with parapet, roof slab and roof-top services
  NEIGHBOURS.forEach(([x0, x1, y0, y1, st, v], i) => {
    const h = st * 3.3; const mat = FACADES[v];
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const far = Math.hypot(cx - 9, cy - 12) > 160;
    box(mat, x0, x1, y0, y1, 0.02, h, far);
    box('ctx_roof', x0 - 0.12, x1 + 0.12, y0 - 0.12, y1 + 0.12, h, h + 0.45, far);    // parapet band
    if (!far) box('ctx_roof', x0 + 0.5, x1 - 0.5, y0 + 0.5, y1 - 0.5, h + 0.1, h + 0.5, true);
    box('ctx_roof', cx - 1.6 + (i % 3) * 0.6, cx + 1.2 + (i % 3) * 0.6, cy - 1.5, cy + 1.5, h + 0.45, h + 2.9, far);   // stair bulkhead
    const dist = Math.hypot(cx - 9, cy - 12);
    if (dist > 75 && dist <= 250) districtFacade(x0, x1, y0, y1, h, st, v, i, dist > 160);
    if (far) { if (i % 3 === 0) out.push({ k: 'cyl', sem, mat: 'water_tank', grp: 'site', cx: x0 + 2.2, cy: y1 - 2.4, r: 0.7, z0: h + 0.45, z1: h + 1.8 }); return; }   // district: massing + roof silhouette only
    out.push({ k: 'cyl', sem, mat: 'ctx_far', grp: 'site', cx: x0 + 2.2, cy: y1 - 2.4, r: 0.75, z0: h + 0.45, z1: h + 2.0 });
    if (i % 2 === 0) out.push({ k: 'cyl', sem, mat: 'ctx_far', grp: 'site', cx: x0 + 4.2, cy: y1 - 2.4, r: 0.75, z0: h + 0.45, z1: h + 2.0 });
    for (let k = 0; k < 2 + (i % 2); k++) box('lamp_pole', x1 - 2.0 - k * 1.3, x1 - 1.2 - k * 1.3, y0 + 1.2, y0 + 1.9, h + 0.45, h + 1.1);        // condenser units
    // V11 relief on faces that front a street within ~70 m of the tower (eye-level views): shop band, fascia, balconies,
    // wall-mounted AC units, rooftop water tanks (a common sight on Iraqi roofs). Far neighbours stay as textured massing.
    if (Math.hypot(cx - 9, cy - 12) > 75) return;
    const rr = rnd(i * 97 + 13);
    for (let k = 0; k < 2 + Math.floor(rr() * 3); k++) out.push({ k: 'cyl', sem, mat: rr() < 0.6 ? 'water_tank' : 'ctx_dark', grp: 'site', cx: x0 + 1.5 + rr() * (x1 - x0 - 3), cy: y0 + 1.5 + rr() * (y1 - y0 - 3), r: 0.55 + rr() * 0.2, z0: h + 0.45, z1: h + 1.75 });
    const faces: { a: number; b: number; at: number; axis: 'x' | 'y'; dir: number }[] = [];
    if (y0 > -6 && y0 < 2) faces.push({ a: x0, b: x1, at: y0, axis: 'y', dir: -1 });          // north side of the main street (faces south)
    if (y1 < -18 && y1 > -28) faces.push({ a: x0, b: x1, at: y1, axis: 'y', dir: 1 });         // south side of the main street (faces north)
    if (x0 > 34 && x0 < 42) faces.push({ a: y0, b: y1, at: x0, axis: 'x', dir: -1 });          // east of the side street (faces west)
    if (y0 > 36 && y0 < 44) faces.push({ a: x0, b: x1, at: y0, axis: 'y', dir: -1 });          // north of the rear lane
    const fbox = (f: typeof faces[number], mat: string, a0: number, a1: number, d0: number, d1: number, z0: number, z1: number, ns = false) => {
      const p0 = f.at + f.dir * d0, p1 = f.at + f.dir * d1; const lo = Math.min(p0, p1), hi = Math.max(p0, p1);
      if (f.axis === 'y') box(mat, a0, a1, lo, hi, z0, z1, ns); else box(mat, lo, hi, a0, a1, z0, z1, ns);
    };
    for (const f of faces) {
      const len = f.b - f.a; const bays = Math.max(1, Math.round(len / 3.6)); const bw = len / bays;
      // ground floor: dark shop glazing between rendered piers, fascia band above, a few fabric awnings
      // V11 round 2: about half of the shop bays are open (lit from inside after sunset), the rest closed
      for (let b = 0; b < bays; b++) fbox(f, rr() < 0.55 ? 'shop_lit' : 'shop_glass', f.a + b * bw + 0.18, f.a + (b + 1) * bw - 0.18, 0.0, 0.03, 0.15, 2.85);
      for (let b = 0; b <= bays; b++) fbox(f, 'render_sand', f.a + b * bw - 0.18, f.a + b * bw + 0.18, 0, 0.12, 0.02, 3.3);
      fbox(f, 'render_ivory', f.a, f.b, 0, 0.22, 2.85, 3.45);
      for (let b = 0; b < bays; b++) if (rr() < 0.45) fbox(f, 'awning', f.a + b * bw + 0.3, f.a + (b + 1) * bw - 0.3, 0.22, 1.25, 2.55, 2.68, true);
      // upper floors: balcony slabs with railings on alternate bays, AC units under some windows
      for (let k = 1; k < st; k++) {
        const z = k * 3.3;
        for (let b = 0; b < bays; b++) {
          const a0 = f.a + b * bw + 0.35, a1 = f.a + (b + 1) * bw - 0.35;
          if ((b + k + i) % 3 === 0 && v !== 1) { fbox(f, 'render_ivory', a0, a1, 0, 1.0, z - 0.02, z + 0.16); fbox(f, 'lamp_pole', a0, a1, 0.94, 1.0, z + 0.98, z + 1.04, true); fbox(f, 'glass', a0 + 0.03, a1 - 0.03, 0.96, 0.98, z + 0.16, z + 0.98, true); }
          else if (rr() < 0.35) fbox(f, 'ac_unit', (a0 + a1) / 2 - 0.42, (a0 + a1) / 2 + 0.42, 0, 0.32, z + 0.35, z + 0.95);
        }
        fbox(f, 'render_ivory', f.a, f.b, 0, 0.06, z - 0.08, z + 0.04, true);   // slab edge line
      }
    }
  });
  // ---- V11.3 district roads on the grid lines (clipped around the modelled core, which has its own streets)
  // V11.4: two-lane carriageways (with parking lanes) and paved sidewalks either side, for the avenue trees
  { const [cx0, cx1, cy0, cy1] = DISTRICT.core; const hw = AVENUE.carriage, po = AVENUE.paveOut;
    const seg = (a0: number, a1: number, lo: number, hi: number, along: 'x' | 'y', at: number) => {
      if (a1 - a0 < 1) return; void lo; void hi;
      if (along === 'x') { box('asphalt', a0, a1, at - hw, at + hw, 0, 0.03, true); box('plaza', a0, a1, at - po, at - hw, 0, AVENUE.pave, true); box('plaza', a0, a1, at + hw, at + po, 0, AVENUE.pave, true); }
      else { box('asphalt', at - hw, at + hw, a0, a1, 0, 0.03, true); box('plaza', at - po, at - hw, a0, a1, 0, AVENUE.pave, true); box('plaza', at + hw, at + po, a0, a1, 0, AVENUE.pave, true); }
    };
    for (let x = DISTRICT.x0; x <= DISTRICT.x1 + 1e-6; x += DISTRICT.pitchX) { const inX = x > cx0 && x < cx1; if (inX) { seg(DISTRICT.y0, cy0, 0, 0, 'y', x); seg(cy1, DISTRICT.y1, 0, 0, 'y', x); } else seg(DISTRICT.y0, DISTRICT.y1, 0, 0, 'y', x); }
    for (let y = DISTRICT.y0; y <= DISTRICT.y1 + 1e-6; y += DISTRICT.pitchY) { const inY = y > cy0 && y < cy1; if (inY) { seg(DISTRICT.x0, cx0, 0, 0, 'x', y); seg(cx1, DISTRICT.x1, 0, 0, 'x', y); } else seg(DISTRICT.x0, DISTRICT.x1, 0, 0, 'x', y); }
  }
  // ---- V11.4 parked cars along the district kerbs (low-poly: body, glass cabin, roof, axles), within 230 m
  for (const [x, y, axis, side, paint] of districtStreetscape().cars) {
    const L = 4.4, W = 1.78;
    const bx = (a0: number, a1: number, w: number, z0: number, z1: number, mat: string) => {
      if (axis === 'x') box(mat, x + a0, x + a1, y - w / 2, y + w / 2, z0, z1, true); else box(mat, x - w / 2, x + w / 2, y + a0, y + a1, z0, z1, true);
    };
    const f = side;   // the cabin sits slightly back from the bonnet, which points along that kerb's traffic direction
    bx(-L / 2, L / 2, W, 0.3, 0.92, paint);
    bx(f > 0 ? -1.35 : -0.95, f > 0 ? 0.95 : 1.35, W - 0.18, 0.92, 1.38, 'car_glass');
    bx(f > 0 ? -1.25 : -0.85, f > 0 ? 0.85 : 1.25, W - 0.26, 1.38, 1.45, paint);
    for (const a of [-1.38, 1.38]) bx(a - 0.32, a + 0.32, W + 0.04, 0.0, 0.6, 'tyre');
  }
  // ---- V11.4 night uplights under the street trees near the tower (the pools show only after sunset)
  for (const [x, y, , kind, base] of treeSpots()) if (TREE_KINDS[kind] === 'street') {
    out.push({ k: 'cyl', sem, mat: 'lamp_head', grp: 'site', cx: x + 0.55, cy: y, r: 0.06, z0: base, z1: base + 0.05 });
    out.push({ k: 'slab', sem, mat: 'glow_pool', grp: 'site', x0: x - 2.2, x1: x + 2.2, y0: y - 2.2, y1: y + 2.2, z: base + 0.02, up: true });
  }
  // ---- far skyline band beyond the district (≈0.8–2.6 km): plain hazy massing, a few taller blocks for a skyline line
  // (no claim to depict a real skyline)
  let seed = 11; const rndF = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 340; i++) {
    const a = rndF() * Math.PI * 2, r = 780 + rndF() * 1800; const cx = 9 + Math.cos(a) * r, cy = 12 + Math.sin(a) * r; const w = 18 + rndF() * 34, d = 16 + rndF() * 30;
    const h = rndF() < 0.12 ? 22 + rndF() * 30 : 6 + rndF() * rndF() * 18;
    if (cx + w / 2 > DISTRICT.x0 - 20 && cx - w / 2 < DISTRICT.x1 + 20 && cy + d / 2 > DISTRICT.y0 - 20 && cy - d / 2 < DISTRICT.y1 + 20) continue;   // V11.5: never on the district roads
    box('ctx_far', cx - w / 2, cx + w / 2, cy - d / 2, cy + d / 2, 0, h, true);
  }
  return out.filter((p) => p.grp !== 'nav');
}

function leafTexture(): THREE.CanvasTexture {
  // solid feather silhouette (wide filled leaflets) so mip-mapped alpha stays opaque at distance
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d')!;
  g.clearRect(0, 0, 128, 512); g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(60, 512); g.lineTo(68, 512); g.lineTo(66, 0); g.lineTo(62, 0); g.closePath(); g.fill();
  for (let i = 0; i < 30; i++) {
    const y = 500 - i * 16.4; const len = 56 * Math.sin(Math.min(1, (i + 2.5) / 30) * Math.PI * 0.94) + 6;
    for (const dir of [-1, 1]) { g.beginPath(); g.moveTo(64, y + 7); g.lineTo(64 + dir * len, y - 22); g.lineTo(64, y - 9); g.closePath(); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** Date-palm crown as plain arrays (shared by the website and the Blender export). Fronds are bent strips carrying the
 *  leaflet texture; `dead` = the brown skirt of old fronds hanging under the crown (typical of date palms). */
export function palmCrown(dead = false): { pos: number[]; uv: number[]; idx: number[] } {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const mk = (len: number, rise: number, droop: number, yaw: number, width = 1.1) => {
    const base = pos.length / 3; const segs = 9;
    for (let j = 0; j <= segs; j++) for (let i = 0; i <= 1; i++) {
      const t = j / segs, w = (i - 0.5) * width * (1 - 0.55 * t);
      const r = len * t * (1 - 0.18 * t), y = len * (rise * t - droop * t * t);
      const c = Math.cos(yaw), sn = Math.sin(yaw);   // along = (c, 0, -sn), across = (sn, 0, c)
      pos.push(r * c + w * sn, y + Math.abs(w) * 0.12 * Math.sin(t * 3), -r * sn + w * c);
      uv.push(i, t);
    }
    for (let j = 0; j < segs; j++) { const a = base + j * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  };
  if (dead) { for (let i = 0; i < 11; i++) mk(2.2, -1.2, -0.15, (i / 11) * Math.PI * 2 + 0.3, 0.8); return { pos, uv, idx }; }
  for (let i = 0; i < 13; i++) mk(3.9, 0.32, 0.92, (i / 13) * Math.PI * 2 + 0.2);
  for (let i = 0; i < 11; i++) mk(3.4, 0.78, 0.82, (i / 11) * Math.PI * 2);
  for (let i = 0; i < 8; i++) mk(2.7, 1.25, 0.56, (i / 8) * Math.PI * 2 + 0.5);
  for (let i = 0; i < 4; i++) mk(1.7, 1.7, 0.12, (i / 4) * Math.PI * 2 + 0.9, 0.6);
  return { pos, uv, idx };
}
function crownGeometry(dead = false): THREE.BufferGeometry {
  const d = palmCrown(dead); const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2)); g.setIndex(d.idx); g.computeVertexNormals();
  return g;
}

/** Palm positions [x, y, height] in plot coordinates (deterministic). Shared with the Blender export. */
export function palmSpots(): [number, number, number, number][] {
  const spots: [number, number, number][] = [];
  let ps = 5; const pr = () => { ps = (ps * 16807) % 2147483647; return ps / 2147483647; };
  for (let x = -98; x <= 124; x += 11 + Math.floor(pr() * 5)) { if (x > 1 && x < 17) continue; spots.push([x + pr() * 1.5, -6.4 + pr() * 0.5, 6.4 + pr() * 3.2]); }
  for (let x = -92; x <= 118; x += 15 + Math.floor(pr() * 7)) spots.push([x, -21 + pr() * 0.6, 6 + pr() * 3]);
  for (let y = 4; y <= 100; y += 13 + Math.floor(pr() * 6)) spots.push([35.6 + pr() * 0.5, y, 6 + pr() * 2.6]);
  spots.push([-1.6, -4.0, 6.4], [19.6, -4.0, 6.8], [-4.6, 3, 8.6], [-4.9, 10.5, 7.2], [-4.4, 19, 9.0], [22.1, 6, 7.6], [22.0, 17, 8.8], [4, 28.1, 7.0], [13, 28.2, 8.2],
    [-32, 37.4, 6.8], [2, -21.4, 7.2]);                               // (-32, 37.4) was in the rear-lane carriageway: moved onto the pavement (S03)
  const yards: [number, number, number][] = [[-18, 12.6, 7.4], [-46, 16, 8.2], [48, 15, 7.8], [12, 61, 8.4]];   // neighbours' gardens: bare soil level
  return [...spots.map(([x, y, h]) => [x, y, h, PALM_BASE] as [number, number, number, number]), ...yards.map(([x, y, h]) => [x, y, h, -0.06] as [number, number, number, number])];
}

// ---------------------------------------------------------------- V11 round 2: broadleaf trees, olives and shrubs
// Shared geometry (plain arrays, three.js axes: y up) used by the website (instanced) and the Blender build (linked
// duplicates). Crowns are leaf-cluster cards (public/textures/leaf_cluster.png) filling a lumpy ellipsoid; each card is
// emitted twice (both windings) with the same outward-blended normals so the crown shades as a volume from any side.
export type TreeKind = 'street' | 'yard' | 'olive' | 'shrub' | 'far' | 'avenue';
export const TREE_KINDS: TreeKind[] = ['street', 'yard', 'olive', 'shrub', 'far', 'avenue'];
const TREE_P: Record<TreeKind, { h: number; trunk: number; r: number; R: number; Rv: number; cards: number; card: number; branches: number; seed: number }> = {
  street: { h: 6.4, trunk: 2.3, r: 0.15, R: 2.4, Rv: 1.8, cards: 330, card: 1.0, branches: 4, seed: 3 },     // shade tree in a pavement grate
  yard: { h: 7.8, trunk: 2.5, r: 0.21, R: 3.1, Rv: 2.4, cards: 460, card: 1.15, branches: 5, seed: 9 },      // older tree in a private garden
  olive: { h: 3.3, trunk: 1.0, r: 0.1, R: 1.35, Rv: 0.95, cards: 140, card: 0.7, branches: 3, seed: 17 },    // ornamental olive in a planter
  shrub: { h: 0.9, trunk: 0, r: 0, R: 0.6, Rv: 0.45, cards: 36, card: 0.55, branches: 0, seed: 29 },
  far: { h: 8.2, trunk: 2.6, r: 0.22, R: 3.3, Rv: 2.5, cards: 30, card: 2.6, branches: 0, seed: 41 },   // district tree, read from 150 m+ only (few large cards)
  avenue: { h: 6.6, trunk: 2.5, r: 0.14, R: 2.0, Rv: 1.7, cards: 70, card: 1.45, branches: 0, seed: 53 },   // V11.4 district avenue tree (75–230 m): light, read from above and from the street ends
};
export interface TreeGeo { wood: { pos: number[]; nrm: number[]; idx: number[] }; leaves: { pos: number[]; nrm: number[]; uv: number[]; idx: number[] } }
export function broadleafTree(kind: TreeKind): TreeGeo {
  const P = TREE_P[kind]; const r = rnd(P.seed * 7919 + 1);
  const wood = { pos: [] as number[], nrm: [] as number[], idx: [] as number[] };
  const tube = (pts: number[][], rad: number[], sides = 7) => {
    const base = wood.pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let ux = 0, uy = tz, uz = -ty; if (Math.hypot(ux, uy, uz) < 0.2) { ux = ty; uy = -tx; uz = 0; }
      const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
      const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
      for (let s = 0; s < sides; s++) {
        const an = (s / sides) * Math.PI * 2, c = Math.cos(an), sn = Math.sin(an); const nx = ux * c + vx * sn, ny = uy * c + vy * sn, nz = uz * c + vz * sn;
        wood.pos.push(pts[i][0] + nx * rad[i], pts[i][1] + ny * rad[i], pts[i][2] + nz * rad[i]); wood.nrm.push(nx, ny, nz);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < sides; s++) { const a = base + i * sides + s, b = base + i * sides + ((s + 1) % sides), c = a + sides, d = b + sides; wood.idx.push(a, b, c, b, d, c); }
  };
  const cy = P.h - P.Rv;
  if (P.trunk > 0) {
    const lx = (r() - 0.5) * 0.3, lz = (r() - 0.5) * 0.3; const top = [lx, P.trunk, lz];
    tube([[0, -0.04, 0], [lx * 0.3, P.trunk * 0.35, lz * 0.3], [lx * 0.7, P.trunk * 0.7, lz * 0.7], top], [P.r * 1.35, P.r * 1.08, P.r, P.r * 0.92]);
    tube([top, [lx * 1.2, (P.trunk + cy) / 2, lz * 1.2], [lx, cy + P.Rv * 0.3, lz]], [P.r * 0.8, P.r * 0.55, P.r * 0.25]);   // leader
    for (let b = 0; b < P.branches; b++) {
      const an = (b / P.branches) * Math.PI * 2 + r() * 0.8; const reach = P.R * (0.5 + r() * 0.2);
      const end = [Math.cos(an) * reach, cy + (r() - 0.25) * P.Rv * 0.5, Math.sin(an) * reach];
      const mid = [top[0] + (end[0] - top[0]) * 0.45, top[1] + (end[1] - top[1]) * 0.7, top[2] + (end[2] - top[2]) * 0.45];
      tube([top, mid, end], [P.r * 0.62, P.r * 0.42, P.r * 0.16], 6);
      for (let t = 0; t < 2; t++) { const a2 = an + (t ? 0.6 : -0.6); const e2 = [Math.cos(a2) * P.R * 0.8, cy + (r() - 0.2) * P.Rv * 0.6, Math.sin(a2) * P.R * 0.8]; tube([mid, [(mid[0] + e2[0]) / 2, (mid[1] + e2[1]) / 2 + 0.2, (mid[2] + e2[2]) / 2], e2], [P.r * 0.3, P.r * 0.18, P.r * 0.06], 5); }
    }
  }
  const L = { pos: [] as number[], nrm: [] as number[], uv: [] as number[], idx: [] as number[] };
  const nrmz = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  for (let i = 0; i < P.cards; i++) {
    let d: number[]; do { d = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]; } while (Math.hypot(d[0], d[1], d[2]) > 1 || Math.hypot(d[0], d[1], d[2]) < 0.05);
    d = nrmz(d); if (d[1] < -0.55) d = nrmz([d[0], d[1] * 0.4, d[2]]);                  // flatter underside
    const s = 0.5 + 0.5 * Math.sqrt(r()); const lobe = 1 + 0.13 * Math.sin(d[0] * 5 + P.seed) * Math.cos(d[2] * 4 + d[1] * 3);
    const c = [d[0] * P.R * s * lobe, cy + d[1] * P.Rv * s * lobe, d[2] * P.R * s * lobe];
    const n = nrmz([d[0] + (r() - 0.5) * 1.4, d[1] + 0.3 + (r() - 0.5) * 1.4, d[2] + (r() - 0.5) * 1.4]);
    const dn = d[0] * n[0] + d[1] * n[1] + d[2] * n[2]; let up = [d[0] - n[0] * dn, d[1] - n[1] * dn, d[2] - n[2] * dn];
    if (Math.hypot(up[0], up[1], up[2]) < 0.15) up = [-n[0] * n[1], 1 - n[1] * n[1], -n[2] * n[1]];
    up = nrmz(up); const side = cross(up, n); const h = (P.card * (0.75 + r() * 0.5)) / 2;
    const sn = nrmz([0.65 * d[0] + 0.35 * n[0], 0.65 * (d[1] * 0.8 + 0.25) + 0.35 * n[1], 0.65 * d[2] + 0.35 * n[2]]);
    for (const back of [0, 1]) {
      const o = back ? -0.003 : 0; const base = L.pos.length / 3;
      for (const [a, b, u, v] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
        L.pos.push(c[0] + (side[0] * a + up[0] * b) * h + n[0] * o, c[1] + (side[1] * a + up[1] * b) * h + n[1] * o, c[2] + (side[2] * a + up[2] * b) * h + n[2] * o);
        L.nrm.push(sn[0], sn[1], sn[2]); L.uv.push(u, v);
      }
      if (back) L.idx.push(base, base + 2, base + 1, base, base + 3, base + 2); else L.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return { wood, leaves: L };
}

/** Broadleaf trees, olives and shrubs: [x, y, scale, kind index (TREE_KINDS), base z] in plot coordinates (deterministic). */
export function treeSpots(): [number, number, number, number, number][] {
  const out: [number, number, number, number, number][] = []; const r = rnd(4242);
  const palms = palmSpots(); const lamps = streetLamps();
  const push = (x: number, y: number, kind: TreeKind, base: number, s = 0.88 + r() * 0.24) => out.push([+x.toFixed(2), +y.toFixed(2), +s.toFixed(3), TREE_KINDS.indexOf(kind), base]);
  // main-street pavements: a shade tree in each long gap between palms (kept clear of the tower frontage and of the
  // foreground of the street-arrival camera on the south pavement)
  for (const [line, y] of [[-6.4, -6.35], [-21.0, -21.3]]) {
    const xs = palms.filter((p) => Math.abs(p[1] - line) < 0.8).map((p) => p[0]).sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) {
      let m = (xs[i] + xs[i + 1]) / 2; if (xs[i + 1] - xs[i] < 9 || (m > -6 && m < 23) || (y < -20 && m > -52 && m < -28)) continue;
      if (lamps.some(([lx, ly]) => Math.abs(ly - y) < 1.5 && Math.abs(lx - m) < 2)) m += 2.6;
      push(m, y, 'street', PAVE_BASE);
    }
  }
  for (const y of [44, 68, 92]) push(24.2, y, 'street', PAVE_BASE);                         // side street, west pavement
  push(-4.8, 25.6, 'street', 0.07); push(22.1, 11.5, 'street', 0.07); push(22.1, 23.4, 'street', 0.07);   // tower plot lawns
  push(8.5, 28.1, 'olive', 0.07); push(17.4, 28.15, 'olive', 0.07);                           // rear garden
  push(1.3, -4.0, 'olive', P0 + 0.52, 1); push(16.7, -4.0, 'olive', P0 + 0.52, 1);               // front planters
  for (const [a, b, skip] of [[-2.0, 3.0, [-1.6, 1.3]], [15.0, 20.0, [16.7, 19.6]]] as [number, number, number[]][])
    for (let x = a; x <= b + 1e-6; x += 0.8) if (skip.every((q) => Math.abs(q - x) > 0.45)) push(x, -4.0, 'shrub', P0 + 0.52, 0.85 + r() * 0.3);
  // gardens of the neighbouring plots: older trees wherever a plot has room (clear of walls and palms)
  const clear = (x: number, y: number) => Math.min(...NEIGHBOURS.map(([x0, x1, y0, y1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1))));
  const blocks = [[-58, -8, -4, 28.5], [37.5, 86, -4, 34], [-58, 22, 38.5, 62], [37.5, 86, 38.5, 62], [-76, 82, -44, -23.5]];
  const yards: [number, number][] = [];
  for (const [x0, x1, y0, y1] of blocks) for (let x = x0 + 3; x <= x1 - 3; x += 2) for (let y = y0 + 3; y <= y1 - 3; y += 2) {
    if (clear(x, y) < 3.4 || palms.some((p) => Math.hypot(p[0] - x, p[1] - y) < 4.5) || yards.some(([a, b]) => Math.hypot(a - x, b - y) < 7.5)) continue;
    yards.push([x, y]);
  }
  for (const [x, y] of yards.slice(0, 40)) push(x + (r() - 0.5) * 0.6, y + (r() - 0.5) * 0.6, 'yard', -0.05, 0.75 + r() * 0.3);
  // V11.4 (Form Architects study, P1): canopy in the open yards and gaps of the inner ring too, so the aerial
  // views read as a planted city rather than bare roofs. Light 'avenue' trees, clear of walls, palms and each other.
  const ring2 = [[-128, -64, -44, 62], [92, 150, -44, 62], [-128, 150, 68, 118], [-128, 150, -100, -50], [-58, 22, 38.5, 62], [37.5, 86, 38.5, 62], [-76, 82, -44, -23.5]];
  const inner: [number, number][] = []; const r2r = rnd(5151);
  for (const [x0, x1, y0, y1] of ring2) for (let x = x0 + 2.5; x <= x1 - 2.5; x += 3) for (let y = y0 + 2.5; y <= y1 - 2.5; y += 3) {
    const jx = x + (r2r() - 0.5) * 1.6, jy = y + (r2r() - 0.5) * 1.6;
    const onStreet = (jx > 22.6 && jx < 37.4 && jy > -8 && jy < 124) || (jy > -23.2 && jy < -4.4) || (jy > 28.6 && jy < 38.6 && jx < 26);   // modelled streets + pavements
    if (onStreet || clear(jx, jy) < 2.6 || palms.some((p) => Math.hypot(p[0] - jx, p[1] - jy) < 4.5) || yards.some(([a, b]) => Math.hypot(a - jx, b - jy) < 6) || inner.some(([a, b]) => Math.hypot(a - jx, b - jy) < 6.5)) continue;
    inner.push([jx, jy]);
  }
  for (const [x, y] of inner.slice(0, 170)) push(x, y, 'avenue', -0.05, 0.85 + r2r() * 0.35);
  // V11.3 district: one or two garden trees per block where a lot is empty or a corner is clear of buildings
  const far = NEIGHBOURS.filter(([x0, x1, y0, y1]) => Math.hypot((x0 + x1) / 2 - 9, (y0 + y1) / 2 - 12) > 140);
  for (const [bx0, by0] of districtBlocks()) {
    const bw = DISTRICT.pitchX - DISTRICT.road, bd = DISTRICT.pitchY - DISTRICT.road; let placed = 0;
    for (let k = 0; k < 6 && placed < 2; k++) {
      const x = bx0 + 3 + r() * (bw - 6), y = by0 + 3 + r() * (bd - 6);
      const c = Math.min(...far.filter(([x0, x1, y0, y1]) => x1 > bx0 - 2 && x0 < bx0 + bw + 2 && y1 > by0 - 2 && y0 < by0 + bd + 2).map(([x0, x1, y0, y1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1))), 99);
      if (c < 3.2) continue; push(x, y, 'far', -0.05, 0.8 + r() * 0.35); placed++;
    }
  }
  // V11.5 garden trees: a loose group of three to five per empty plot
  for (const [x0, x1, y0, y1] of GARDENS) {
    if (onCoreRoad(x0, x1, y0, y1)) continue; const n = 3 + Math.floor(r() * 3); const near = Math.hypot((x0 + x1) / 2 - 9, (y0 + y1) / 2 - 12) < 160;
    for (let k = 0; k < n; k++) push(x0 + 2.5 + r() * Math.max(0.5, x1 - x0 - 5), y0 + 2.5 + r() * Math.max(0.5, y1 - y0 - 5), near ? 'yard' : 'far', 0.02, 0.8 + r() * 0.4);
  }
  // V11.4 tree-lined district avenues (Form Architects study, P1): both pavements, within 230 m of the tower
  for (const [x, y] of districtStreetscape().trees) push(x, y, 'avenue', AVENUE.pave, 0.85 + r() * 0.3);
  return out;
}

// ---------------------------------------------------------------- V11.4 district streetscape (trees + parked cars)
/** district road cross-section (metres from the road centre line): carriageway, parking lane, pavement, tree line */
export const AVENUE = { carriage: 4.2, park: 3.25, pave: 0.12, paveOut: 6.0, tree: 5.1, radius: 230, treeStep: 14, crossClear: 9 } as const;
type Street = { trees: [number, number][]; cars: [number, number, 'x' | 'y', number, string][] };
let streetscapeCache: Street | null = null;
/** Deterministic avenue trees [x, y] and parked cars [x, y, axis, facing ±1, paint] along the district roads. */
export function districtStreetscape(): Street {
  if (streetscapeCache) return streetscapeCache;
  const out: Street = { trees: [], cars: [] }; const r = rnd(9311); const [cx0, cx1, cy0, cy1] = DISTRICT.core;
  const near = (x: number, y: number) => Math.hypot(x - 9, y - 12) <= AVENUE.radius;
  const inCore = (x: number, y: number) => x > cx0 && x < cx1 && y > cy0 && y < cy1;
  const lotsNear = NEIGHBOURS.filter(([x0, x1, y0, y1]) => Math.hypot((x0 + x1) / 2 - 9, (y0 + y1) / 2 - 12) < AVENUE.radius + 60);
  const freeOf = (x: number, y: number, m: number) => lotsNear.every(([x0, x1, y0, y1]) => x < x0 - m || x > x1 + m || y < y0 - m || y > y1 + m);
  const paints = ['car_white', 'car_white', 'car_grey', 'car_sand', 'car_dark', 'car_white', 'car_bronze'];
  const xs: number[] = [], ys: number[] = [];
  for (let x = DISTRICT.x0; x <= DISTRICT.x1 + 1e-6; x += DISTRICT.pitchX) xs.push(x);
  for (let y = DISTRICT.y0; y <= DISTRICT.y1 + 1e-6; y += DISTRICT.pitchY) ys.push(y);
  const lines: { axis: 'x' | 'y'; at: number; a0: number; a1: number; cross: number[] }[] = [];
  for (const x of xs) lines.push({ axis: 'y', at: x, a0: DISTRICT.y0, a1: DISTRICT.y1, cross: ys });   // road running north–south at x
  for (const y of ys) lines.push({ axis: 'x', at: y, a0: DISTRICT.x0, a1: DISTRICT.x1, cross: xs });   // road running east–west at y
  for (const L of lines) for (const side of [-1, 1]) {
    const pt = (along: number, off: number): [number, number] => (L.axis === 'y' ? [L.at + side * off, along] : [along, L.at + side * off]);
    const clearOfCross = (a: number, m: number) => L.cross.every((c) => Math.abs(c - a) > m);
    for (let a = L.a0 + 4 + r() * 6; a < L.a1 - 4; a += AVENUE.treeStep * (0.85 + r() * 0.3)) {
      const [x, y] = pt(a, AVENUE.tree); if (!near(x, y) || inCore(x, y) || !clearOfCross(a, AVENUE.crossClear) || !freeOf(x, y, 0.9)) continue;
      out.trees.push([+x.toFixed(2), +y.toFixed(2)]);
    }
    for (let a = L.a0 + 3 + r() * 8; a < L.a1 - 3; a += 5.6 + r() * 15) {
      const [x, y] = pt(a, AVENUE.park); if (!near(x, y) || inCore(x, y) || !clearOfCross(a, AVENUE.crossClear + 1.5)) continue;
      out.cars.push([+x.toFixed(2), +y.toFixed(2), L.axis, side, paints[Math.floor(r() * paints.length)]]);
    }
  }
  streetscapeCache = out; return out;
}

// ---------------------------------------------------------------- V11.3 slow traffic on the main street
// Two lanes (eastbound y −12.2, westbound y −14.8) between the parking lanes; six cars per lane, evenly spaced over the
// whole district length so the wrap-around happens 700 m away in the haze. Speeds 36–40 km/h. t = 0 is the arrangement
// rendered by Cycles and used by automated captures; the live site animates from there (not under reduced motion).
const TRAFFIC_LANES = [{ y: -12.2, deg: 0, v: 11 }, { y: -14.8, deg: 180, v: 10 }];
const TRAFFIC_PAINTS: [string, 'sedan' | 'suv'][] = [['car_white', 'sedan'], ['car_grey', 'suv'], ['car_dark', 'sedan'], ['car_sand', 'suv'], ['car_bronze', 'sedan'], ['car_white', 'suv']];
const TRAFFIC_X0 = DISTRICT.x0 + 10, TRAFFIC_X1 = DISTRICT.x1 - 10;
/** moving cars at time t (s): [plan x of the car centre, plan y, heading°, paint index] */
export function trafficAt(t: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = []; const L = TRAFFIC_X1 - TRAFFIC_X0;
  TRAFFIC_LANES.forEach((ln, li) => {
    for (let i = 0; i < 6; i++) {
      const s0 = (i / 6 + li * 0.028 + 0.1315) * L; const d = (((s0 + ln.v * t) % L) + L) % L;   // phases put a car in front of the street cameras at t = 0
      out.push([ln.deg === 0 ? TRAFFIC_X0 + d : TRAFFIC_X1 - d, ln.y, ln.deg, (i + li * 3) % TRAFFIC_PAINTS.length]);
    }
  });
  return out;
}
/** prims of one traffic car centred on plan (cx, cy) with the given heading (used by the Blender export for the t = 0 stills) */
export function trafficCarPrims(cx: number, cy: number, deg: number, paintIdx: number): Prim[] {
  const out: Prim[] = []; const [paint, kind] = TRAFFIC_PAINTS[paintIdx]; const L = kind === 'suv' ? 4.7 : 4.6, W = 1.84;
  const a = (deg * Math.PI) / 180; const ox = cx - (Math.cos(a) * L - Math.sin(a) * W) / 2, oy = cy - (Math.sin(a) * L + Math.cos(a) * W) / 2;
  place({ out, f: 'SITE', room: 'site', grp: 'site' }, 'traffic', car(paint, kind), ox, oy, deg); return out;
}

export interface Site { root: THREE.Group; setTraffic(t: number): void; nightLights: THREE.PointLight[]; setWind(w: number, t: number): void; setFoliage(c: THREE.Color): void; dispose(): void }

export function buildSite(lib: MatLib, shadows: boolean): Site {
  const root = new THREE.Group(); root.name = 'site';
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3000, 64), lib.get('ground'));   // V11.3: reaches the far skyline band
  const uv = ground.geometry.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6000, uv.getY(i) * 6000);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = shadows; ground.matrixAutoUpdate = false; ground.updateMatrix();
  root.add(ground);
  const built = buildMeshes(sitePrims(), lib, { shadows }); root.add(built.root);

  // palms (instanced: 3 draw calls for all of them) — positions shared with the Blender export
  const spots = palmSpots();
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.27, 1, 12, 1); trunkGeo.translate(0, 0.5, 0);
  { const tu = trunkGeo.getAttribute('uv') as THREE.BufferAttribute; for (let i = 0; i < tu.count; i++) tu.setXY(i, tu.getX(i) * 1.4, tu.getY(i) * 7.5); }   // bark at real scale
  const trunks = new THREE.InstancedMesh(trunkGeo, lib.get('trunk'), spots.length);
  const time = { value: 0 }, wind = { value: 0.1 };
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.82, color: '#4c6a38', envMapIntensity: 0.4 });
  leafMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time; shader.uniforms.uWind = wind;
    shader.vertexShader = 'uniform float uTime; uniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n float nkSw = sin(uTime * 1.7 + position.x * 0.7 + position.z * 0.5) * uWind * 0.22 * smoothstep(0.0, 3.2, length(position.xz));\n transformed.x += nkSw; transformed.y += nkSw * 0.45;');
  };
  const crownGeo = crownGeometry();
  const crowns = new THREE.InstancedMesh(crownGeo, leafMat, spots.length);
  const deadMat = leafMat.clone(); deadMat.color.set('#7a6243'); deadMat.onBeforeCompile = leafMat.onBeforeCompile;
  const deadGeo = crownGeometry(true); const skirts = new THREE.InstancedMesh(deadGeo, deadMat, spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  spots.forEach(([x, y, h, base], i) => {
    p.set(toWorldX(x), base, toWorldZ(y)); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7);
    trunks.setMatrixAt(i, m.compose(p, q, s.set(1, h, 1)));
    const k = 0.85 + (i % 4) * 0.08;
    crowns.setMatrixAt(i, m.compose(p.clone().setY(base + h - 0.04), q, s.set(k, k, k)));
    skirts.setMatrixAt(i, m.compose(p.clone().setY(base + h - 0.19), q, s.set(k, k, k)));
  });
  trunks.castShadow = crowns.castShadow = skirts.castShadow = shadows; trunks.receiveShadow = shadows;
  trunks.instanceMatrix.needsUpdate = true; crowns.instanceMatrix.needsUpdate = true; skirts.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere(); crowns.computeBoundingSphere(); skirts.computeBoundingSphere();
  root.add(trunks, crowns, skirts);

  // V11 round 2: broadleaf trees, olives, shrubs (instanced per kind; same geometry and leaf texture as the Blender build)
  const leafTex = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/leaf_cluster.png`); leafTex.colorSpace = THREE.SRGBColorSpace; leafTex.anisotropy = 4;
  const treeTime = time, treeWind = wind;
  const treeLeaf = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, roughness: 0.78, envMapIntensity: 0.35 });
  treeLeaf.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = treeTime; shader.uniforms.uWind = treeWind;
    shader.vertexShader = 'uniform float uTime; uniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n float nkSw = sin(uTime * 2.1 + position.x * 1.3 + position.y * 0.9) * uWind * 0.06 * smoothstep(0.5, 6.0, position.y);\n transformed.x += nkSw; transformed.z += nkSw * 0.6;');
  };
  const oliveLeaf = treeLeaf.clone(); oliveLeaf.onBeforeCompile = treeLeaf.onBeforeCompile; oliveLeaf.color.set('#c8d0b4');   // silver-green olive
  const FOLIAGE0 = new THREE.Color('#4a6a39');
  const tspots = treeSpots(); const treeGeos: THREE.BufferGeometry[] = [];
  TREE_KINDS.forEach((kind, ki) => {
    const list = tspots.filter((t) => t[3] === ki); if (!list.length) return;
    const g = broadleafTree(kind);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(g.leaves.pos, 3)); lg.setAttribute('normal', new THREE.Float32BufferAttribute(g.leaves.nrm, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(g.leaves.uv, 2)); lg.setIndex(g.leaves.idx);
    const leaves = new THREE.InstancedMesh(lg, kind === 'olive' ? oliveLeaf : treeLeaf, list.length); treeGeos.push(lg);
    let wood: THREE.InstancedMesh | null = null;
    if (g.wood.pos.length) { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(g.wood.pos, 3)); wg.setAttribute('normal', new THREE.Float32BufferAttribute(g.wood.nrm, 3)); wg.setIndex(g.wood.idx); wood = new THREE.InstancedMesh(wg, lib.get('bark'), list.length); treeGeos.push(wg); }
    list.forEach(([x, y, sc, , base], i) => {
      p.set(toWorldX(x), base, toWorldZ(y)); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i * 2.3 + x * 0.17) % (Math.PI * 2)); m.compose(p, q, s.set(sc, sc, sc));
      leaves.setMatrixAt(i, m); wood?.setMatrixAt(i, m);
    });
    for (const im of [leaves, wood]) if (im) { im.castShadow = shadows && kind !== 'shrub' && kind !== 'far'; im.receiveShadow = shadows; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); root.add(im); }
  });

  // V11.3 traffic: one built template per paint/body, cloned per car; a soft contact blob instead of a moving shadow
  // (moving shadow casters would force a shadow-map redraw every frame)
  const templates = TRAFFIC_PAINTS.map((_, pi) => { const b = buildMeshes(trafficCarPrims(9, 12, 0, pi), lib, { shadows: false }); b.root.traverse((o) => { o.castShadow = false; }); return b; });
  const blobGeo = new THREE.PlaneGeometry(5.0, 2.3); blobGeo.rotateX(-Math.PI / 2);
  const cars = trafficAt(0).map(([, , , pi]) => {
    const g = new THREE.Group(); g.add(templates[pi].root.clone()); const blob = new THREE.Mesh(blobGeo, lib.get('contact')); blob.position.y = 0.035; blob.renderOrder = 2; g.add(blob); g.matrixAutoUpdate = false; root.add(g); return g;
  });
  const setTraffic = (t: number) => trafficAt(t).forEach(([x, y, deg], i) => { const g = cars[i]; g.position.set(toWorldX(x), 0, toWorldZ(y)); g.rotation.set(0, (deg * Math.PI) / 180, 0); g.updateMatrix(); g.updateMatrixWorld(true); });
  setTraffic(0);

  // brand lettering on the canopy fascia (text is live canvas, not baked into a render)
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 64; const sg = sc.getContext('2d')!;
  sg.fillStyle = '#f3e7cf'; sg.font = '500 34px "Cormorant Garamond", Georgia, serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle';
  sg.fillText('N A K H L A   R E S I D E N C E', 512, 34);
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; st.anisotropy = 4;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.22), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false }));
  { // V11.5: the name on the entrance monolith, same live-canvas lettering
    const mc = document.createElement('canvas'); mc.width = 512; mc.height = 96; const mg = mc.getContext('2d')!;
    mg.fillStyle = '#e9d6b0'; mg.font = '500 58px "Cormorant Garamond", Georgia, serif'; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText('N A K H L A', 256, 50);
    const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace; mt.anisotropy = 4;
    const ms = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.28), new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false }));
    ms.position.set(toWorldX(MONOLITH.sign.x), MONOLITH.sign.z, toWorldZ(MONOLITH.sign.y) + 0.008); root.add(ms); }
  sign.position.set(toWorldX(9), (CANOPY.z0 + 0.06 + CANOPY.z1) / 2, toWorldZ(CANOPY.y0) + 0.012); root.add(sign);

  // two warm lights at the entrance and podium: at night the base of the tower reads, instead of sinking into black
  const nightLights: THREE.PointLight[] = [];
  for (const [x, y, z] of [[9, -3.0, 3.6], [9, -9, 6.5]] as number[][]) { const l = new THREE.PointLight('#ffc98f', 0, 46, 1.4); l.position.set(toWorldX(x), z, toWorldZ(y)); l.castShadow = false; nightLights.push(l); root.add(l); }

  return {
    root, nightLights, setTraffic,
    setWind(w, t) { wind.value = w; time.value = t; },
    setFoliage(c) {
      treeLeaf.color.setRGB(Math.min(1.6, c.r / FOLIAGE0.r), Math.min(1.6, c.g / FOLIAGE0.g), Math.min(1.6, c.b / FOLIAGE0.b));
      oliveLeaf.color.set('#c8d0b4').multiply(treeLeaf.color);
      leafMat.color.copy(c); (lib.get('foliage') as THREE.MeshStandardMaterial).color.copy(c).multiplyScalar(0.92); (lib.get('hedge') as THREE.MeshStandardMaterial).color.copy(c).multiplyScalar(1.05); },
    dispose() { for (const t of templates) t.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); blobGeo.dispose(); for (const g of treeGeos) g.dispose(); treeLeaf.dispose(); oliveLeaf.dispose(); leafTex.dispose(); ground.geometry.dispose(); trunkGeo.dispose(); crownGeo.dispose(); deadGeo.dispose(); deadMat.dispose(); leafMat.map?.dispose(); leafMat.dispose(); st.dispose(); sign.geometry.dispose(); (sign.material as THREE.Material).dispose(); built.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); },
  };
}
