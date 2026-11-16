import type { FloorId, Opening, Prim, Rect } from './types';
import { FLOOR_BY_ID, ROOF_PLANT_H, SLAB } from './tower';
import { FOOT, POOL_BASIN, getFloorPlan, rectMinus, type FloorPlan, type PlacedRoom } from './plans';
import { generateWalls, outdoorOpenEdges, roomLiningSegs, type WallPiece } from './wallgen';
import { surfaceFor } from './materials';
import { COVE, furnishFloor } from './furniture';
import { place } from './modelkit';
import { acDiffuser, leverHandle, smokeDetector, socket, wallSwitch } from './fitments';

// ---------------------------------------------------------------------------------------------
// Floor primitives. Everything is expressed in plan metres relative to the floor's FFL (z = 0)
// so the SAME list builds the WebGL scene, the Blender scene, collision and the audit.
// ---------------------------------------------------------------------------------------------

const wallCache = new Map<string, WallPiece[]>();
export function getWalls(floorId: FloorId): WallPiece[] {
  const cat = FLOOR_BY_ID[floorId].category;
  let w = wallCache.get(cat);
  if (!w) { w = generateWalls(getFloorPlan(floorId)); wallCache.set(cat, w); }
  return w;
}

const SWING_LOW = new Set(['A.d.hall_e.bathroom']);
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const alongX = (r: Rect) => r.x1 - r.x0 > r.y1 - r.y0;

/** Outward normal of an opening in an external wall (toward open air), or null if internal. */
export function outwardNormal(op: Opening, plan: FloorPlan): [number, number] | null {
  if (op.facade === 'S') return [0, -1];
  if (op.facade === 'N') return [0, 1];
  if (op.facade === 'E') return [1, 0];
  if (op.facade === 'W') return [-1, 0];
  const r = op.rect; const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  const probes: [number, number][] = alongX(r) ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
  for (const [nx, ny] of probes) {
    const px = cx + nx * ((r.x1 - r.x0) / 2 + 0.2), py = cy + ny * ((r.y1 - r.y0) / 2 + 0.2);
    const room = plan.rooms.find((rm) => rm.rects.some((q) => px > q.x0 && px < q.x1 && py > q.y0 && py < q.y1));
    if (room?.outdoor) return [nx, ny];
  }
  return null;
}

function openingInfill(out: Prim[], f: FloorId, op: Opening, isExt: boolean) {
  const r = op.rect; const ax = alongX(r);
  const len = ax ? r.x1 - r.x0 : r.y1 - r.y0;
  const mid = ax ? (r.y0 + r.y1) / 2 : (r.x0 + r.x1) / 2;
  const a = ax ? r.x0 : r.y0;
  const sem = `${f}.op.${op.id}`;
  const box = (mat: string, u0: number, u1: number, d0: number, d1: number, z0: number, z1: number, grp: Prim['grp'] = isExt ? 'shell' : 'interior', noShadow = false): Prim =>
    ax ? { k: 'box', sem, mat, grp, x0: u0, x1: u1, y0: d0, y1: d1, z0, z1, noShadow }
      : { k: 'box', sem, mat, grp, x0: d0, x1: d1, y0: u0, y1: u1, z0, z1, noShadow };
  const fr = 0.05, fd = 0.05; // frame width / half-depth
  if (op.kind === 'slider') {
    // sliding glass doors: long ones are bi-parting (fixed outer panels, two centre leaves that slide outward and clear the
    // middle half — where the camera path crosses); short ones are a single pocket leaf that slides into the wall
    const z0 = op.sill, z1 = op.head, pocket = len < 1.6;
    const pane = (u0: number, u1: number, d: number, grp: Prim['grp'], tag?: string) => {
      const add = (p: Prim) => { if (tag) { (p as { room?: string }).room = `${op.id}#${tag}`; (p as { grp: Prim['grp'] }).grp = p.mat === 'glass' ? 'leaf' : 'leaf'; } out.push(p); };
      add(box('glass', u0 + fr, u1 - fr, mid + d - 0.01, mid + d + 0.01, z0 + fr * 0.6, z1 - fr, grp, true));
      for (const [a0, a1, b0, b1] of [[u0, u1, z1 - fr, z1], [u0, u1, z0, z0 + fr * 0.6], [u0, u0 + fr, z0, z1], [u1 - fr, u1, z0, z1]]) add(box('frame', a0, a1, mid + d - 0.025, mid + d + 0.025, b0, b1, grp));
      if (tag) add(box('black_metal', tag === 'R' || tag === 'P' ? u0 + 0.04 : u1 - 0.06, tag === 'R' || tag === 'P' ? u0 + 0.06 : u1 - 0.04, mid + d + 0.025, mid + d + 0.045, z0 + 0.9, z0 + 1.25, grp));   // pull handle
    };
    out.push(box('frame', a, a + len, mid - fd, mid + fd, z1 - 0.02, z1), box('frame', a, a + len, mid - fd, mid + fd, z0, z0 + 0.012));   // head + sill tracks
    if (pocket) pane(a, a + len, 0.02, 'leaf', 'P');
    else { const q = len / 4; pane(a, a + q, -0.03, isExt ? 'shell' : 'interior'); pane(a + 3 * q, a + len, -0.03, isExt ? 'shell' : 'interior'); pane(a + q, a + 2 * q, 0.03, 'leaf', 'L'); pane(a + 2 * q, a + 3 * q, 0.03, 'leaf', 'R'); }
    return;
  }
  if (op.kind === 'window' || op.kind === 'screen') {
    const z0 = op.sill, z1 = op.head;
    out.push(box('glass', a + fr, a + len - fr, mid - 0.012, mid + 0.012, z0 + fr * 0.6, z1 - fr, 'glass', true));
    out.push(box('frame', a, a + len, mid - fd, mid + fd, z1 - fr, z1));
    out.push(box('frame', a, a + len, mid - fd, mid + fd, z0, z0 + fr * 0.6));
    out.push(box('frame', a, a + fr, mid - fd, mid + fd, z0, z1));
    out.push(box('frame', a + len - fr, a + len, mid - fd, mid + fd, z0, z1));
    const n = Math.max(0, Math.ceil(len / 1.45) - 1);
    for (let i = 1; i <= n; i++) {
      const u = a + (len * i) / (n + 1);
      out.push(box('frame', u - 0.025, u + 0.025, mid - fd, mid + fd, z0, z1));
    }
    // V11.4 up-close façade detail: outside the glass every mullion and jamb gets a slim pressure cap (a profile, not a flat bar),
    // and the opening gets a projecting stone sill with a drip edge that throws a crisp shadow line.
    if (isExt && op.facade && op.kind === 'window') {
      const o = op.facade === 'S' || op.facade === 'W' ? -1 : 1;           // outward along the wall's depth axis
      const outer = o < 0 ? (ax ? r.y0 : r.x0) : (ax ? r.y1 : r.x1);
      const capD = (d: number) => mid + o * fd + o * d;                      // depth measured outward from the frame face
      for (let i = 0; i <= n + 1; i++) {
        const u = i === 0 ? a + 0.025 : i === n + 1 ? a + len - 0.025 : a + (len * i) / (n + 1);
        out.push(box('frame', u - 0.016, u + 0.016, Math.min(capD(0), capD(0.045)), Math.max(capD(0), capD(0.045)), z0 + 0.03, z1 - 0.03, 'shell', true));
      }
      out.push(box('frame', a + 0.03, a + len - 0.03, Math.min(capD(0), capD(0.04)), Math.max(capD(0), capD(0.04)), z1 - 0.05, z1 - 0.02, 'shell', true));   // head cap
      if (z0 > 0.2) {
        const s0 = Math.min(outer - o * 0.02, outer + o * 0.07), s1 = Math.max(outer - o * 0.02, outer + o * 0.07);
        out.push(box('band', a - 0.04, a + len + 0.04, Math.min(mid, s0), Math.max(mid, s1), z0 - 0.06, z0 + 0.008, 'shell'));         // sill (top just above the wall's, no coplanar faces)
        out.push(box('band', a - 0.04, a + len + 0.04, Math.min(outer + o * 0.05, outer + o * 0.07), Math.max(outer + o * 0.05, outer + o * 0.07), z0 - 0.085, z0 - 0.06, 'shell', true));   // drip lip
      }
    }
  } else if (op.kind === 'door') {
    // leaf drawn open 90° at the low jamb, swinging toward +side
    const leaf = Math.min(len - 0.08, 0.86);
    // wet rooms are small: their doors open outward (toward the low side) so the leaf never blocks the room
    const outw = SWING_LOW.has(op.id); const t = outw ? (ax ? r.y0 : r.x0) - leaf : (ax ? r.y1 : r.x1);
    out.push(ax
      ? { k: 'box', sem, mat: 'door_leaf', grp: 'interior', x0: a + 0.03, x1: a + 0.07, y0: t, y1: t + leaf, z0: 0.01, z1: op.head - 0.03 }
      : { k: 'box', sem, mat: 'door_leaf', grp: 'interior', x0: t, x1: t + leaf, y0: a + 0.03, y1: a + 0.07, z0: 0.01, z1: op.head - 0.03 });
    // lever handle on both faces of the leaf
    const hz = 1.02, hu = outw ? t + 0.08 : t + leaf - 0.08;
    place({ out, f, room: 'door' }, 'lever', leverHandle(), ax ? a + 0.05 : hu, ax ? hu : a + 0.05, ax ? (outw ? 0 : 180) + 90 : (outw ? 0 : 180), hz);
    const d0 = ax ? r.y0 : r.x0, d1 = ax ? r.y1 : r.x1;
    out.push(box('frame', a, a + 0.03, d0 - 0.01, d1 + 0.01, 0, op.head, 'interior'));
    out.push(box('frame', a + len - 0.03, a + len, d0 - 0.01, d1 + 0.01, 0, op.head, 'interior'));
    out.push(box('frame', a, a + len, d0 - 0.01, d1 + 0.01, op.head - 0.03, op.head, 'interior'));
  } else if (op.kind === 'entry') {
    out.push(box('door_entry', a + 0.04, a + len - 0.04, mid - 0.03, mid + 0.03, 0.01, op.head - 0.04));
    out.push(box('frame', a, a + 0.04, mid - 0.07, mid + 0.07, 0, op.head));
    out.push(box('frame', a + len - 0.04, a + len, mid - 0.07, mid + 0.07, 0, op.head));
    out.push(box('frame', a, a + len, mid - 0.07, mid + 0.07, op.head - 0.04, op.head));
  }
}

function facadeFins(out: Prim[], f: FloorId, op: Opening, hExt: number) {
  if (!op.facade || op.kind !== 'window') return;
  const r = op.rect; const sem = `${f}.fin.${op.id}`;
  const depth = 0.3, th = 0.06;
  const n = Math.max(0, Math.ceil((alongX(r) ? r.x1 - r.x0 : r.y1 - r.y0) / 1.45) - 1);
  const stations: number[] = [];
  const a = alongX(r) ? r.x0 : r.y0, len = alongX(r) ? r.x1 - r.x0 : r.y1 - r.y0;
  for (let i = 0; i <= n + 1; i++) stations.push(a + (len * i) / (n + 1));
  for (const u of stations) {
    if (op.facade === 'S') out.push({ k: 'box', sem, mat: 'bronze', grp: 'shell', x0: u - th / 2, x1: u + th / 2, y0: -depth, y1: 0, z0: 0, z1: hExt });
    if (op.facade === 'N') out.push({ k: 'box', sem, mat: 'bronze', grp: 'shell', x0: u - th / 2, x1: u + th / 2, y0: FOOT.y1, y1: FOOT.y1 + depth, z0: 0, z1: hExt });
    if (op.facade === 'W') out.push({ k: 'box', sem, mat: 'bronze', grp: 'shell', x0: -depth, x1: 0, y0: u - th / 2, y1: u + th / 2, z0: 0, z1: hExt });
    if (op.facade === 'E') out.push({ k: 'box', sem, mat: 'bronze', grp: 'shell', x0: FOOT.x1, x1: FOOT.x1 + depth, y0: u - th / 2, y1: u + th / 2, z0: 0, z1: hExt });
  }
  // horizontal brise-soleil above sun-exposed south openings
  if (op.facade === 'S') out.push({ k: 'box', sem, mat: 'bronze', grp: 'shell', x0: r.x0 - 0.1, x1: r.x1 + 0.1, y0: -0.45, y1: 0, z0: op.head + 0.06, z1: op.head + 0.12 });
}

function wallPrims(out: Prim[], f: FloorId, w: WallPiece, hExt: number, clear: number, stone: string, withInterior: boolean, withShell: boolean) {
  const { rect: r, ext, opening: op } = w;
  if (ext && !withShell) return;
  if (!ext && !withInterior) return;
  const top = ext ? hExt : clear;
  const mat = ext ? stone : 'wallcore';
  const grp: Prim['grp'] = ext ? 'shell' : 'interior';
  const sem = `${f}.wall.${ext ? 'ext' : 'int'}`;
  const b = (z0: number, z1: number): Prim => ({ k: 'box', sem, mat, grp, x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, z0, z1 });
  if (!op) { out.push(b(0, top)); return; }
  if (op.sill > 0.01) out.push(b(0, op.sill));
  if (op.kind !== 'screen' && op.head < top - 0.01) out.push(b(op.head, top));
  openingInfill(out, f, op, ext);
}

/** Exterior shell of a floor: slab, facade walls with real openings, glazing, fins, balconies. */
export function buildFloorShell(f: FloorId): Prim[] {
  const def = FLOOR_BY_ID[f]; const plan = getFloorPlan(f); const walls = getWalls(f);
  const hExt = def.floorToFloor - SLAB;
  const stone = def.category === 'ground' ? 'stone_base' : 'stone';
  const out: Prim[] = [];
  if (def.category === 'wellness') {
    // the pool basin is recessed into the slab zone (concept transfer structure, engineer review required)
    for (const q of rectMinus(FOOT, POOL_BASIN)) out.push({ k: 'box', sem: `${f}.slab`, mat: 'slab', grp: 'shell', x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1, z0: -SLAB, z1: 0 });
    out.push({ k: 'box', sem: `${f}.slab`, mat: 'slab', grp: 'shell', x0: POOL_BASIN.x0, x1: POOL_BASIN.x1, y0: POOL_BASIN.y0, y1: POOL_BASIN.y1, z0: -SLAB, z1: -0.275 });
  } else {
    out.push({ k: 'box', sem: `${f}.slab`, mat: 'slab', grp: 'shell', x0: FOOT.x0, x1: FOOT.x1, y0: FOOT.y0, y1: FOOT.y1, z0: -SLAB, z1: 0 });
  }
  const bz0 = -SLAB, bz1 = 0, p = 0.06;
  out.push({ k: 'box', sem: `${f}.band`, mat: 'band', grp: 'shell', x0: -p, x1: 18 + p, y0: -p, y1: 0, z0: bz0, z1: bz1 });
  out.push({ k: 'box', sem: `${f}.band`, mat: 'band', grp: 'shell', x0: -p, x1: 18 + p, y0: 24, y1: 24 + p, z0: bz0, z1: bz1 });
  out.push({ k: 'box', sem: `${f}.band`, mat: 'band', grp: 'shell', x0: -p, x1: 0, y0: 0, y1: 24, z0: bz0, z1: bz1 });
  out.push({ k: 'box', sem: `${f}.band`, mat: 'band', grp: 'shell', x0: 18, x1: 18 + p, y0: 0, y1: 24, z0: bz0, z1: bz1 });
  for (const w of walls) wallPrims(out, f, w, hExt, def.clear, stone, false, true);
  for (const op of plan.openings) facadeFins(out, f, op, hExt);

  for (const room of plan.rooms.filter((r) => r.outdoor)) {
    const isBalcony = room.kind === 'balcony';
    const h = isBalcony ? 1.1 : 1.4;
    for (const r of room.rects) {
      // projecting slab part outside the footprint
      const parts: Rect[] = [];
      if (r.y0 < FOOT.y0) parts.push({ x0: r.x0 - 0.3, x1: r.x1 + 0.3, y0: r.y0 - 0.06, y1: FOOT.y0 });
      if (r.y1 > FOOT.y1) parts.push({ x0: r.x0 - 0.3, x1: r.x1 + 0.3, y0: FOOT.y1, y1: r.y1 + 0.06 });
      for (const q of parts) out.push({ k: 'box', sem: `${f}.${room.key}.slab`, mat: 'band', grp: 'shell', x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1, z0: -0.22, z1: 0 });
    }
    for (const e of outdoorOpenEdges(room, plan, walls)) {
      const horiz = Math.abs(e.ay - e.by) < 1e-6;
      const sem = `${f}.${room.key}.balustrade`;
      const a = horiz ? e.ax : e.ay, bb = horiz ? e.bx : e.by, c = horiz ? e.ay : e.ax;
      const mk = (mat: string, grp: Prim['grp'], u0: number, u1: number, t: number, z0: number, z1: number): Prim =>
        horiz ? { k: 'box', sem, mat, grp, x0: u0, x1: u1, y0: c - t, y1: c + t, z0, z1, noShadow: grp === 'glass' }
          : { k: 'box', sem, mat, grp, x0: c - t, x1: c + t, y0: u0, y1: u1, z0, z1, noShadow: grp === 'glass' };
      out.push(mk('glass_bal', 'glass', a, bb, 0.008, 0.06, h - 0.05));
      out.push(mk('bronze', 'shell', a, bb, 0.03, h - 0.05, h));
      out.push(mk('bronze', 'shell', a, bb, 0.03, 0, 0.06));
      const n = Math.max(1, Math.round((bb - a) / 1.6));
      for (let i = 0; i <= n; i++) { const u = a + ((bb - a) * i) / n; out.push(mk('bronze', 'shell', u - 0.02, u + 0.02, 0.025, 0, h)); }
    }
    for (const r of room.rects) out.push({ k: 'slab', sem: `${f}.${room.key}.floor`, room: room.key, mat: isBalcony ? 'paving_balcony' : (room.kind === 'terrace' ? 'deck_wood' : 'paving_dark'), grp: 'shell', x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, z: 0.006, up: true });
  }

  // dark / lit infill behind glazing while the interior is not built (reads as tinted glass by day,
  // some lit rooms at night) — one box per indoor room, replaced by the real interior on demand.
  for (const room of plan.rooms.filter((r) => !r.outdoor)) {
    const lit = hash(`${f}:${room.key}`) % 5 < 3 &&   // V11: ~60 % of rooms occupied after dark (warm windows read as a lived-in tower)
      room.kind !== 'lift' && room.kind !== 'service' && room.kind !== 'plant';
    for (const r of room.rects) out.push({ k: 'box', sem: `${f}.fill`, mat: lit ? 'fill_lit' : 'fill_dark', grp: 'fill', x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, z0: 0.02, z1: hExt - 0.02, noShadow: true });
  }
  // balcony / terrace / rooftop furniture is part of the shell: visible in the whole-tower view at every zoom level
  for (const p of furnishFloor(f, 'outdoor')) if (p.grp !== 'nav') out.push(p);
  return out;
}

const FIXED_FLOOR: Record<string, string> = {
  lobby: 'floor_stone', stair: 'floor_concrete', lift: 'floor_concrete', service: 'floor_concrete', plant: 'floor_concrete',
  reception: 'floor_stone', security: 'floor_stone', management: 'floor_stone', mail: 'floor_stone',
  gym: 'floor_rubber', pool: 'floor_pool', spa: 'floor_wood', changing: 'floor_pool', 'wellness-lounge': 'floor_wood',
  restaurant: 'floor_wood', cafe: 'floor_stone', 'kitchen-commercial': 'floor_concrete', laundry: 'floor_utility',
};
const FIXED_WALL: Record<string, string> = {
  lobby: 'wall_lobby', stair: 'wall_plain', lift: 'wall_dark', service: 'wall_plain', plant: 'wall_plain',
  reception: 'wall_lobby', security: 'wall_plain', management: 'wall_plain', mail: 'wall_plain',
  gym: 'wall_plain', pool: 'wall_pool', spa: 'wall_wood', changing: 'wall_pool', 'wellness-lounge': 'wall_lobby',
  restaurant: 'wall_lobby', cafe: 'wall_lobby', 'kitchen-commercial': 'wall_plain',
};

export const roomIsUnit = (room: PlacedRoom) => room.owner === 'A' || room.owner === 'B';

/** Switches beside doors, sockets along walls, a cooling diffuser and a smoke detector per habitable room (concept positions). */
function addMep(out: Prim[], f: FloorId, plan: FloorPlan, room: PlacedRoom, clear: number) {
  const k = room.kind; if (k === 'lift' || k === 'service' || k === 'plant' || k === 'stair') return;
  const c = { out, f, room: room.key, grp: 'interior' as const };
  const doors = plan.openings.filter((o) => o.kind === 'door' || o.kind === 'arch' || o.kind === 'entry');
  const nearDoor = (x: number, y: number) => doors.some((o) => x > o.rect.x0 - 0.05 && x < o.rect.x1 + 0.05 && y > o.rect.y0 - 0.05 && y < o.rect.y1 + 0.05);
  const wet = k === 'bathroom' || k === 'master_bath' || k === 'pool' || k === 'changing';
  let switches = 0;
  for (const e of roomLiningSegs(room, plan, clear)) {
    if (!e.full) continue;
    const len = Math.hypot(e.bx - e.ax, e.by - e.ay); if (len < 0.45) continue;
    const dx = (e.bx - e.ax) / len, dy = (e.by - e.ay) / len, deg = (Math.atan2(-e.nx, e.ny) * 180) / Math.PI;
    const at = (t: number): [number, number] => [e.ax + dx * t + e.nx * 0.006, e.ay + dy * t + e.ny * 0.006];
    let swEnd = -1;
    for (const end of [0, 1]) {
      const px = end ? e.bx + dx * 0.1 : e.ax - dx * 0.1, py = end ? e.by + dy * 0.1 : e.ay - dy * 0.1;
      if (switches < 3 && swEnd < 0 && nearDoor(px - e.nx * 0.06, py - e.ny * 0.06)) { const [x, y] = at(end ? len - 0.17 : 0.17); place(c, 'switch', wallSwitch(), x, y, deg, 1.05); swEnd = end; switches++; }
    }
    if (!wet && len >= 1.2) {
      const t0 = swEnd === 0 ? len - 0.45 : 0.45; { const [x, y] = at(t0); place(c, 'socket', socket(), x, y, deg, 0.3); }
      if (len > 3.8) { const [x, y] = at(len / 2); place(c, 'socket', socket(), x, y, deg, 0.3); }
    }
  }
  const r = room.rects[0]; const w = r.x1 - r.x0, d = r.y1 - r.y0; if (w * d < 5) return;
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  place({ ...c, grp: 'ceiling' }, 'smoke', smokeDetector(), cx + 0.35, cy + 0.35, 0, clear);
  if (['living', 'master', 'second_bedroom', 'third_bedroom', 'reception', 'restaurant', 'cafe', 'gym', 'wellness-lounge', 'lobby', 'kitchen'].includes(k)) {
    const cove = COVE.rooms.has(room.key);   // V11.4 D20: a linear slot in the underside of the cove band
    const yy = cove ? r.y1 - 0.2 : cy < 12 ? r.y1 - 0.55 : r.y0 + 0.55; place({ ...c, grp: 'ceiling' }, 'ac', acDiffuser(Math.min(1.5, w * 0.35)), cx, yy, 0, cove ? clear - COVE.drop : clear);
  }
}

/** Interior of a floor: partitions, doors, wall linings, floor finishes, ceilings, furniture. */
export function buildFloorInterior(f: FloorId): Prim[] {
  const def = FLOOR_BY_ID[f]; const plan = getFloorPlan(f); const walls = getWalls(f);
  const hExt = def.floorToFloor - SLAB; const clear = def.clear;
  const out: Prim[] = [];
  for (const w of walls) wallPrims(out, f, w, hExt, clear, 'stone', true, false);
  for (const op of plan.openings) {
    if (op.kind === 'door' || op.kind === 'arch' || op.kind === 'slider' || op.kind === 'entry')
      out.push({ k: 'slab', sem: `${f}.threshold.${op.id}`, mat: 'threshold', grp: 'interior', x0: op.rect.x0, x1: op.rect.x1, y0: op.rect.y0, y1: op.rect.y1, z: 0.003, up: true });
  }
  for (const room of plan.rooms) {
    if (room.outdoor) continue;
    const unit = roomIsUnit(room);
    const floorSurf = unit ? surfaceFor(room.id, 'floor') : null;
    const wallSurf = unit ? surfaceFor(room.id, 'wall') : null;
    const floorMat = floorSurf ? `surf:${floorSurf}` : (FIXED_FLOOR[room.kind] ?? 'floor_concrete');
    const wallMat = wallSurf ? `surf:${wallSurf}` : (FIXED_WALL[room.kind] ?? 'wall_plain');
    for (const r of room.rects) {
      for (const q of room.kind === 'pool' ? rectMinus(r, POOL_BASIN) : [r])
        out.push({ k: 'slab', sem: `${f}.${room.key}.floor`, room: room.key, mat: floorMat, grp: 'floor', x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1, z: 0.004, up: true, surf: floorSurf ?? undefined });
      out.push({ k: 'slab', sem: `${f}.${room.key}.ceiling`, room: room.key, mat: 'ceiling', grp: 'ceiling', x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, z: clear, up: false });
    }
    addMep(out, f, plan, room, clear);
    // V11.5: lift shafts and service rooms are closed at ceiling height by a solid core cap (as a plan shows the core),
    // so cut-away views no longer look down into empty dark boxes
    if (room.kind === 'lift' || room.kind === 'service') for (const r of room.rects) out.push({ k: 'box', sem: `${f}.${room.key}.cap`, room: room.key, mat: 'core_cap', grp: 'interior', x0: r.x0 - 0.06, x1: r.x1 + 0.06, y0: r.y0 - 0.06, y1: r.y1 + 0.06, z0: clear - 0.02, z1: clear + 0.04 });
    const wet = room.kind === 'bathroom' || room.kind === 'master_bath' || room.kind === 'pool' || room.kind === 'changing';
    for (const e of roomLiningSegs(room, plan, clear)) {
      const o = 0.004;
      out.push({ k: 'quad', sem: `${f}.${room.key}.wall`, room: room.key, mat: wallMat, grp: 'lining', ax: e.ax + e.nx * o, ay: e.ay + e.ny * o, bx: e.bx + e.nx * o, by: e.by + e.ny * o, z0: e.z0, z1: e.z1, nx: e.nx, ny: e.ny, surf: wallSurf ?? undefined });
      if (e.full && !wet && room.kind !== 'lift' && room.kind !== 'service' && room.kind !== 'plant') {
        const t = 0.014;
        const x0 = Math.min(e.ax, e.bx) + (e.nx > 0 ? 0 : e.nx < 0 ? -t : 0), x1 = Math.max(e.ax, e.bx) + (e.nx > 0 ? t : 0);
        const y0 = Math.min(e.ay, e.by) + (e.ny > 0 ? 0 : e.ny < 0 ? -t : 0), y1 = Math.max(e.ay, e.by) + (e.ny > 0 ? t : 0);
        out.push({ k: 'box', sem: `${f}.${room.key}.skirting`, mat: 'skirting', grp: 'interior', x0, x1, y0, y1, z0: 0.004, z1: 0.085, noShadow: true });
      }
    }
  }
  out.push(...furnishFloor(f, 'indoor'));
  packLightmap(out);
  return out;
}

/** Lightmap atlas side in pixels. One atlas per floor category; texel density is solved to fit. */
export const LM_SIZE = 2048;
/**
 * Give every wall lining, floor finish and ceiling a rectangle in the lightmap atlas (shelf packing in metres).
 * The SAME rectangles are exported to Blender, which bakes the indirect light into that atlas with Cycles.
 */
function packLightmap(prims: Prim[]) {
  const items: { p: Extract<Prim, { k: 'quad' | 'slab' }>; w: number; h: number }[] = [];
  for (const p of prims) {
    if (p.k === 'quad' && p.grp === 'lining') items.push({ p, w: Math.hypot(p.bx - p.ax, p.by - p.ay), h: p.z1 - p.z0 });
    else if (p.k === 'slab' && (p.grp === 'floor' || p.grp === 'ceiling')) items.push({ p, w: p.x1 - p.x0, h: p.y1 - p.y0 });
  }
  items.sort((a, b) => b.h - a.h || b.w - a.w);
  const area = items.reduce((s, i) => s + i.w * i.h, 0); const pad = 3;
  let d = Math.floor(Math.sqrt((0.7 * LM_SIZE * LM_SIZE) / Math.max(1, area)));
  for (; d > 4; d = Math.floor(d * 0.93)) {
    let x = 0, y = 0, rowH = 0; let ok = true; const rects: number[][] = [];
    for (const it of items) {
      const w = Math.max(2, Math.ceil(it.w * d)) + 2 * pad, h = Math.max(2, Math.ceil(it.h * d)) + 2 * pad;
      if (w > LM_SIZE) { ok = false; break; }
      if (x + w > LM_SIZE) { x = 0; y += rowH; rowH = 0; }
      if (y + h > LM_SIZE) { ok = false; break; }
      rects.push([(x + pad) / LM_SIZE, (y + pad) / LM_SIZE, (x + w - pad) / LM_SIZE, (y + h - pad) / LM_SIZE]);
      x += w; rowH = Math.max(rowH, h);
    }
    if (ok) { items.forEach((it, i) => { it.p.lm = rects[i] as [number, number, number, number]; }); return; }
  }
}

/** Roof crown above F11: partial roof slab, parapets, plant screen, pergola. z relative to roof level. */
export function buildRoof(): Prim[] {
  const out: Prim[] = [];
  const plan = getFloorPlan('F11');
  const sem = 'ROOF';
  for (const r of plan.roofRects) {
    out.push({ k: 'box', sem, mat: 'slab', grp: 'roof', x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, z0: -SLAB, z1: 0 });
  }
  // crown fascia + parapet around the roofed pavilion
  const par = (x0: number, x1: number, y0: number, y1: number) => out.push({ k: 'box', sem, mat: 'stone', grp: 'roof', x0, x1, y0, y1, z0: -SLAB - 0.15, z1: 0.9 });
  par(-0.08, 18.08, -0.08, 0.2); par(-0.08, 0.2, 0.2, 19.8); par(17.8, 18.08, 0.2, 14.4);
  par(8.9, 17.8, 14.2, 14.48); par(-0.08, 8.98, 19.6, 19.88); par(8.7, 8.98, 14.48, 19.6);
  // unoccupied roof plant enclosure (NOT a floor) — bronze louvre screen + lift overrun
  const s0 = { x0: 3.0, x1: 15.0, y0: 3.2, y1: 13.6 };
  const t = 0.08;
  out.push({ k: 'box', sem, mat: 'bronze', grp: 'roof', x0: s0.x0, x1: s0.x1, y0: s0.y0, y1: s0.y0 + t, z0: 0, z1: ROOF_PLANT_H });
  out.push({ k: 'box', sem, mat: 'bronze', grp: 'roof', x0: s0.x0, x1: s0.x1, y0: s0.y1 - t, y1: s0.y1, z0: 0, z1: ROOF_PLANT_H });
  out.push({ k: 'box', sem, mat: 'bronze', grp: 'roof', x0: s0.x0, x1: s0.x0 + t, y0: s0.y0, y1: s0.y1, z0: 0, z1: ROOF_PLANT_H });
  out.push({ k: 'box', sem, mat: 'bronze', grp: 'roof', x0: s0.x1 - t, x1: s0.x1, y0: s0.y0, y1: s0.y1, z0: 0, z1: ROOF_PLANT_H });
  out.push({ k: 'box', sem, mat: 'stone', grp: 'roof', x0: 3.1, x1: 7.2, y0: 8.4, y1: 10.7, z0: 0, z1: ROOF_PLANT_H + 0.5 });
  out.push({ k: 'box', sem, mat: 'slab', grp: 'roof', x0: 9.2, x1: 13.8, y0: 4.2, y1: 7.4, z0: 0, z1: 1.5 });
  out.push(...buildCrown());   // V11.4 (D18): the open crown is part of the standard roof
  return out;
}

/** V11.4 open roof crown (owner adopted it after the preview, 2026-11-14; DECISION_LOG D18). The façade frame continues above the
 *  roof as stone piers and a ring beam, with bronze fins between them that screen the plant enclosure; a pale screen round the
 *  enclosure and soffit light lines make it read as a lantern after sunset. It follows the roofed pavilion's outline (the north
 *  terraces stay open). Part of buildRoof(), so both renderers show it. z relative to roof level. */
export const CROWN_H = 3.4;
export function buildCrown(): Prim[] {
  const out: Prim[] = []; const sem = 'ROOF.crown'; const H = CROWN_H, beam = 0.45, out0 = 0.3, in0 = 0.3, pierW = 0.7, finStep = 0.6;
  // [axis: 'x' = runs along x at y = c, 'y' = runs along y at x = c, c, outward sign, piers (along-coordinates, ends included)]
  const edges: ['x' | 'y', number, 1 | -1, number[]][] = [
    ['x', 0, -1, [0, 5.75, 11.55, 18]],          // south: piers over the façade's solid stone
    ['y', 0, -1, [0, 4.45, 8.9, 13.85, 19.8]],   // west
    ['y', 18, 1, [0, 4.45, 8.9, 14.4]],          // east (roofed part)
    ['x', 14.4, 1, [8.9, 13.45, 18]],            // north, over the east terrace (13.45 lines up with the pergola's middle beam)
    ['x', 19.8, 1, [0, 4.45, 8.9]],              // north, over the west terrace
    ['y', 8.9, 1, [14.4, 19.8]],                 // the step between the two terraces
  ];
  for (const [ax, c, n, st] of edges) {
    // across-coordinate range from the inner offset to the outer one, along-range a..b
    const box = (mat: string, a: number, b: number, d0: number, d1: number, z0: number, z1: number, noShadow = false) => {
      const lo = Math.min(c + n * d0, c + n * d1), hi = Math.max(c + n * d0, c + n * d1);
      out.push(ax === 'x' ? { k: 'box', sem, mat, grp: 'roof', x0: a, x1: b, y0: lo, y1: hi, z0, z1, noShadow } : { k: 'box', sem, mat, grp: 'roof', x0: lo, x1: hi, y0: a, y1: b, z0, z1, noShadow });
    };
    const a0 = st[0], a1 = st[st.length - 1];
    box('stone', a0 - out0, a1 + out0, -in0, out0, H - beam, H);                          // ring beam
    for (const s of st) box('stone', s - pierW / 2, s + pierW / 2, -in0, out0, -SLAB - 0.15, H - beam);   // piers, down to the parapet's base
    for (let i = 0; i + 1 < st.length; i++) {
      const u0 = st[i] + pierW / 2, u1 = st[i + 1] - pierW / 2, span = u1 - u0; const k = Math.max(1, Math.round(span / finStep));
      for (let j = 0; j < k; j++) { const u = u0 + (span * (j + 0.5)) / k; box('bronze', u - 0.03, u + 0.03, 0, 0.26, -SLAB - 0.15, H - beam); }   // fins, continuing the façade's fin plane
      box('lantern', u0, u1, -0.24, -0.06, H - beam - 0.025, H - beam, true);              // soffit light line, inner side
      box('lantern', u0, u1, -0.2, -0.1, 0.9, 0.92, true);                                 // uplight line on the parapet, behind the fins
    }
  }
  // the lantern itself: a pale screen wrapped round the plant enclosure, seen through the fins (cream by day, warm glow at night)
  const s0 = { x0: 3.0, x1: 15.0, y0: 3.2, y1: 13.6 }, o = 0.03, z0 = 0.15, z1 = ROOF_PLANT_H - 0.15;
  out.push({ k: 'box', sem, mat: 'lantern', grp: 'roof', x0: s0.x0 - o, x1: s0.x1 + o, y0: s0.y0 - o - 0.02, y1: s0.y0 - o, z0, z1, noShadow: true });
  out.push({ k: 'box', sem, mat: 'lantern', grp: 'roof', x0: s0.x0 - o, x1: s0.x1 + o, y0: s0.y1 + o, y1: s0.y1 + o + 0.02, z0, z1, noShadow: true });
  out.push({ k: 'box', sem, mat: 'lantern', grp: 'roof', x0: s0.x0 - o - 0.02, x1: s0.x0 - o, y0: s0.y0 - o, y1: s0.y1 + o, z0, z1, noShadow: true });
  out.push({ k: 'box', sem, mat: 'lantern', grp: 'roof', x0: s0.x1 + o, x1: s0.x1 + o + 0.02, y0: s0.y0 - o, y1: s0.y1 + o, z0, z1, noShadow: true });
  return out;
}

/** The terrace pergola (posts AND slatted beams) belongs to level 11, so it stays in place when the roof crown lifts away
 *  and a visitor standing on the terrace is under it, as designed. */
export function pergolaPosts(): Prim[] {
  const out: Prim[] = [];
  const h = FLOOR_BY_ID.F11.floorToFloor - 1.3;
  const pz = h + 0.15; const sem = 'F11.pergola';
  const beam = (x0: number, x1: number, y0: number, y1: number, z0 = pz, z1 = pz + 0.16) => out.push({ k: 'box', sem, mat: 'bronze_pc', grp: 'shell', x0, x1, y0, y1, z0, z1 });
  for (let y = 15.0; y <= 23.6; y += 0.72) beam(9.3, 17.7, y, y + 0.07);
  beam(9.3, 9.42, 14.9, 23.7, pz - 0.14, pz); beam(17.58, 17.7, 14.9, 23.7, pz - 0.14, pz); beam(13.4, 13.52, 14.9, 23.7, pz - 0.14, pz);
  for (let y = 20.3; y <= 23.6; y += 0.72) beam(0.3, 8.3, y, y + 0.07);
  beam(0.3, 0.42, 20.2, 23.7, pz - 0.14, pz); beam(8.18, 8.3, 20.2, 23.7, pz - 0.14, pz);
  for (const [x, y] of [[9.36, 15.0], [9.36, 23.6], [17.64, 15.0], [17.64, 23.6], [13.46, 23.6], [0.36, 20.3], [0.36, 23.6], [8.24, 23.6]] as [number, number][])
    out.push({ k: 'box', sem: 'F11.pergola', mat: 'bronze_pc', grp: 'shell', x0: x - 0.05, x1: x + 0.05, y0: y - 0.05, y1: y + 0.05, z0: 0, z1: h });
  return out;
}
