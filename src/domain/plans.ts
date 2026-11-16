import { R } from './types';
import type { FloorId, Opening, OpeningKind, Rect, Room, UnitPlan } from './types';
import { FLOOR_BY_ID } from './tower';

// ---------------------------------------------------------------------------------------------
// Canonical plan data (metres). Rooms are clear-floor rectangles; the gaps between rooms ARE the
// walls (0.12 partitions, 0.24 party walls, 0.30 external walls) — wall solids are derived from
// the room layout by wallgen.ts, so plans, 3D walls, areas and collision can never disagree.
// CONCEPT GEOMETRY — authored for visualisation; not reviewed by a licensed architect/engineer.
// ---------------------------------------------------------------------------------------------

export const FOOT: Rect = R(0, 0, 18, 24);
/** F10 pool basin (12 x 5 m water surface). Depth is NOT a designed value — see facts ledger. */
export const POOL_BASIN: Rect = R(3.0, 16.6, 15.0, 21.6);

/** r minus hole -> up to 4 rectangles. */
export function rectMinus(r: Rect, h: Rect): Rect[] {
  const x0 = Math.max(r.x0, h.x0), x1 = Math.min(r.x1, h.x1), y0 = Math.max(r.y0, h.y0), y1 = Math.min(r.y1, h.y1);
  if (x1 <= x0 || y1 <= y0) return [r];
  const out: Rect[] = [];
  if (y0 > r.y0) out.push(R(r.x0, r.y0, r.x1, y0));
  if (y1 < r.y1) out.push(R(r.x0, y1, r.x1, r.y1));
  if (x0 > r.x0) out.push(R(r.x0, y0, x0, y1));
  if (x1 < r.x1) out.push(R(x1, y0, r.x1, y1));
  return out;
}

const vx = (id: string, kind: OpeningKind, xLo: number, xHi: number, yFrom: number, yTo: number, sill: number, head: number, facade?: Opening['facade']): Opening =>
  ({ id, kind, rect: R(xLo, yFrom, xHi, yTo), sill, head, facade });
const hy = (id: string, kind: OpeningKind, yLo: number, yHi: number, xFrom: number, xTo: number, sill: number, head: number, facade?: Opening['facade']): Opening =>
  ({ id, kind, rect: R(xFrom, yLo, xTo, yHi), sill, head, facade });

// ------------------------------------------------------------------ Model One (south, hero) ~125 m²
export const UNIT_A: UnitPlan = {
  typeId: 'TYPE_A',
  outline: [[0.3, 0.3], [4.62, 0.3], [4.62, 2.1], [11.62, 2.1], [11.62, 0.3], [17.7, 0.3], [17.7, 8.2], [0.3, 8.2]],
  rooms: [
    { id: 'living', kind: 'living', tier: 'hero', rects: [R(4.62, 2.1, 11.62, 6.2)], view: { eye: [10.72, 5.88], look: [5.4, 3.0], photo: { z: 1.38, fov: 62, shiftY: 0.03 } } },   // V11.4 D20: from the corner, level
    { id: 'kitchen', kind: 'kitchen', tier: 'hero', rects: [R(11.74, 0.3, 17.7, 3.9)], view: { eye: [12.35, 1.15], look: [15.8, 3.1] } },
    { id: 'master', kind: 'master', tier: 'hero', rects: [R(0.3, 0.3, 4.5, 4.4)], view: { eye: [1.05, 1.75], look: [3.7, 2.35] } },
    { id: 'bathroom', kind: 'bathroom', tier: 'hero', rects: [R(11.74, 5.62, 13.6, 8.2)], view: { eye: [13.2, 5.95], look: [12.05, 7.5] } },
    { id: 'balcony', kind: 'balcony', tier: 'hero', outdoor: true, rects: [R(4.92, -0.8, 11.32, 1.8)], view: { eye: [10.95, 1.4], look: [6.6, 0.25] } },
    { id: 'second_bedroom', kind: 'second_bedroom', tier: 'secondary', rects: [R(13.72, 4.02, 17.7, 8.2)], view: { eye: [14.3, 4.6], look: [16.6, 7.2] } },
    { id: 'master_bath', kind: 'master_bath', tier: 'secondary', rects: [R(0.3, 4.52, 2.45, 8.2)], view: { eye: [1.9, 5.0], look: [1.0, 7.6] } },
    { id: 'dressing', kind: 'dressing', tier: 'secondary', rects: [R(2.57, 4.52, 4.5, 8.2)], view: { eye: [3.9, 7.7], look: [3.2, 5.2] } },
    { id: 'laundry', kind: 'laundry', tier: 'secondary', rects: [R(10.42, 6.32, 11.62, 8.2)], view: { eye: [10.75, 6.7], look: [11.2, 8.0] } },
    { id: 'entry', kind: 'entry', tier: 'secondary', rects: [R(8.5, 6.32, 10.3, 8.2)], view: { eye: [9.4, 7.8], look: [9.4, 4.0] } },
    { id: 'hall', kind: 'hall', tier: 'secondary', rects: [R(4.62, 6.32, 8.38, 8.2)], view: { eye: [8.0, 7.3], look: [5.0, 7.2] } },
    { id: 'hall_e', kind: 'hall', tier: 'secondary', rects: [R(11.74, 4.02, 13.6, 5.5)], view: { eye: [12.0, 4.8], look: [13.5, 4.8] } },
  ],
  openings: [
    hy('A.w.master.S', 'window', 0, 0.3, 1.2, 3.6, 0.45, 2.45, 'S'),
    vx('A.w.master.W', 'window', 0, 0.3, 1.4, 3.0, 0.9, 2.45, 'W'),
    vx('A.w.master_bath.W', 'window', 0, 0.3, 5.9, 6.9, 1.5, 2.3, 'W'),
    hy('A.g.living.S', 'slider', 1.8, 2.1, 5.22, 11.02, 0, 2.5),
    hy('A.w.kitchen.S', 'window', 0, 0.3, 13.0, 16.4, 0.9, 2.45, 'S'),
    vx('A.w.kitchen.E', 'window', 17.7, 18, 1.2, 3.0, 0.9, 2.45, 'E'),
    vx('A.g.kitchen.balcony', 'slider', 11.32, 11.74, 0.7, 1.6, 0, 2.3),
    vx('A.w.second_bedroom.E', 'window', 17.7, 18, 5.0, 7.2, 0.6, 2.45, 'E'),
    hy('A.d.entry', 'entry', 8.2, 8.44, 8.9, 9.9, 0, 2.2),
    hy('A.o.entry.living', 'arch', 6.2, 6.32, 8.6, 10.2, 0, 2.4),
    vx('A.o.entry.hall', 'arch', 8.38, 8.5, 6.5, 8.0, 0, 2.4),
    vx('A.d.entry.laundry', 'door', 10.3, 10.42, 6.9, 7.7, 0, 2.1),
    vx('A.d.hall.dressing', 'door', 4.5, 4.62, 6.8, 7.7, 0, 2.1),
    hy('A.d.dressing.master', 'door', 4.4, 4.52, 3.2, 4.1, 0, 2.1),
    vx('A.d.dressing.master_bath', 'door', 2.45, 2.57, 5.0, 5.8, 0, 2.1),
    vx('A.o.living.kitchen', 'arch', 11.62, 11.74, 2.3, 3.8, 0, 2.4),
    vx('A.o.living.hall_e', 'arch', 11.62, 11.74, 4.3, 5.2, 0, 2.1),
    hy('A.d.hall_e.bathroom', 'door', 5.5, 5.62, 12.2, 13.0, 0, 2.1),
    vx('A.d.hall_e.second_bedroom', 'door', 13.6, 13.72, 4.4, 5.3, 0, 2.1),
  ],
};

// ------------------------------------------------------------------ Model Two (north) ~145 m²
export const UNIT_B: UnitPlan = {
  typeId: 'TYPE_B',
  outline: [[0.3, 14.4], [17.7, 14.4], [17.7, 23.7], [12.2, 23.7], [12.2, 21.3], [5.2, 21.3], [5.2, 23.7], [0.3, 23.7]],
  rooms: [
    { id: 'living', kind: 'living', tier: 'secondary', rects: [R(5.2, 17.2, 12.2, 21.3)], view: { eye: [6.0, 17.8], look: [10.4, 20.4] } },
    { id: 'kitchen', kind: 'kitchen', tier: 'secondary', rects: [R(12.32, 20.0, 17.7, 23.7)], view: { eye: [13.9, 20.4], look: [16.6, 23.2] } },
    { id: 'master', kind: 'master', tier: 'secondary', rects: [R(0.3, 19.7, 5.08, 23.7)], view: { eye: [4.3, 22.75], look: [1.0, 21.3] } },
    { id: 'bathroom', kind: 'bathroom', tier: 'secondary', rects: [R(10.42, 14.4, 12.2, 17.08)], view: { eye: [11.3, 16.7], look: [11.3, 14.6] } },
    { id: 'balcony', kind: 'balcony', tier: 'secondary', outdoor: true, rects: [R(5.5, 21.6, 11.9, 24.8)], view: { eye: [6.3, 22.2], look: [10.6, 24.2] } },
    { id: 'second_bedroom', kind: 'second_bedroom', tier: 'secondary', rects: [R(12.32, 14.4, 17.7, 18.2)], view: { eye: [12.9, 17.6], look: [16.4, 15.4] } },
    { id: 'third_bedroom', kind: 'third_bedroom', tier: 'secondary', rects: [R(0.3, 14.4, 5.08, 17.08)], view: { eye: [4.6, 16.6], look: [1.4, 15.2] } },
    { id: 'master_bath', kind: 'master_bath', tier: 'secondary', rects: [R(0.3, 17.2, 2.5, 19.58)], view: { eye: [2.3, 18.55], look: [0.55, 18.35] } },
    { id: 'dressing', kind: 'dressing', tier: 'secondary', rects: [R(2.62, 17.2, 5.08, 19.58)], view: { eye: [4.85, 19.38], look: [2.9, 17.45] } },   // V11.4: diagonal across the room (was a tight close-up)
    { id: 'laundry', kind: 'laundry', tier: 'secondary', rects: [R(12.32, 18.32, 17.7, 19.88)], view: { eye: [12.8, 19.1], look: [17.0, 19.1] } },
    { id: 'entry', kind: 'entry', tier: 'secondary', rects: [R(8.5, 14.4, 10.3, 17.08)], view: { eye: [9.4, 14.8], look: [9.4, 19.0] } },
    { id: 'hall', kind: 'hall', tier: 'secondary', rects: [R(5.2, 14.4, 8.38, 17.08)], view: { eye: [8.0, 15.7], look: [5.4, 15.7] } },
  ],
  openings: [
    hy('B.w.master.N', 'window', 23.7, 24, 1.3, 3.9, 0.45, 2.45, 'N'),
    vx('B.w.master.W', 'window', 0, 0.3, 20.8, 22.6, 0.9, 2.45, 'W'),
    vx('B.w.master_bath.W', 'window', 0, 0.3, 17.9, 18.9, 1.5, 2.3, 'W'),
    vx('B.w.third_bedroom.W', 'window', 0, 0.3, 15.0, 16.6, 0.9, 2.45, 'W'),
    hy('B.g.living.N', 'slider', 21.3, 21.6, 5.8, 11.6, 0, 2.5),
    hy('B.w.kitchen.N', 'window', 23.7, 24, 13.4, 16.6, 0.9, 2.45, 'N'),
    vx('B.w.kitchen.E', 'window', 17.7, 18, 20.8, 22.8, 0.9, 2.45, 'E'),
    vx('B.g.kitchen.balcony', 'slider', 11.9, 12.32, 22.2, 23.1, 0, 2.3),
    vx('B.w.second_bedroom.E', 'window', 17.7, 18, 15.2, 17.4, 0.6, 2.45, 'E'),
    hy('B.d.entry', 'entry', 14.16, 14.4, 8.9, 9.9, 0, 2.2),
    hy('B.o.entry.living', 'arch', 17.08, 17.2, 8.6, 10.2, 0, 2.4),
    vx('B.o.entry.hall', 'arch', 8.38, 8.5, 14.8, 16.6, 0, 2.4),
    vx('B.d.entry.bathroom', 'door', 10.3, 10.42, 15.2, 16.0, 0, 2.1),
    vx('B.d.hall.third_bedroom', 'door', 5.08, 5.2, 15.2, 16.1, 0, 2.1),
    vx('B.d.living.dressing', 'door', 5.08, 5.2, 17.5, 18.4, 0, 2.1),
    hy('B.d.dressing.master', 'door', 19.58, 19.7, 3.6, 4.5, 0, 2.1),
    vx('B.d.dressing.master_bath', 'door', 2.5, 2.62, 17.9, 18.7, 0, 2.1),
    vx('B.o.living.kitchen', 'arch', 12.2, 12.32, 20.1, 21.2, 0, 2.4),
    vx('B.d.living.second_bedroom', 'door', 12.2, 12.32, 17.4, 18.1, 0, 2.1),
    hy('B.d.kitchen.laundry', 'door', 19.88, 20.0, 13.0, 13.9, 0, 2.1),
  ],
};

// ------------------------------------------------------------------ Shared core (all levels)
const CORE_ROOMS: Room[] = [
  { id: 'stair_w', kind: 'stair', tier: 'proxy', rects: [R(0.3, 8.44, 3.0, 14.16)] },
  { id: 'stair_e', kind: 'stair', tier: 'proxy', rects: [R(15.0, 8.44, 17.7, 14.16)] },
  { id: 'lobby', kind: 'lobby', tier: 'secondary', rects: [R(7.3, 8.44, 10.7, 14.16), R(3.12, 10.74, 7.3, 12.14), R(10.7, 10.74, 14.88, 12.14)], view: { eye: [9.0, 13.4], look: [9.0, 9.0] } },
  { id: 'lift_1', kind: 'lift', tier: 'proxy', rects: [R(3.12, 8.44, 5.09, 10.62)] },
  { id: 'lift_2', kind: 'lift', tier: 'proxy', rects: [R(5.21, 8.44, 7.18, 10.62)] },
  { id: 'lift_service', kind: 'lift', tier: 'proxy', rects: [R(10.82, 8.44, 13.0, 10.62)] },
  { id: 'riser_e', kind: 'service', tier: 'proxy', rects: [R(13.12, 8.44, 14.88, 10.62)] },
  { id: 'refuse', kind: 'service', tier: 'proxy', rects: [R(3.12, 12.26, 5.09, 14.16)] },
  { id: 'electrical', kind: 'service', tier: 'proxy', rects: [R(5.21, 12.26, 7.18, 14.16)] },
  { id: 'riser_w', kind: 'service', tier: 'proxy', rects: [R(10.82, 12.26, 12.79, 14.16)] },
  { id: 'store', kind: 'service', tier: 'proxy', rects: [R(12.91, 12.26, 14.88, 14.16)] },
];
const CORE_OPENINGS: Opening[] = [
  vx('C.d.stair_w', 'door', 3.0, 3.12, 10.94, 11.94, 0, 2.1),
  vx('C.d.stair_e', 'door', 14.88, 15.0, 10.94, 11.94, 0, 2.1),
  vx('C.w.stair_w', 'window', 0, 0.3, 10.3, 12.3, 0.9, 2.45, 'W'),
  vx('C.w.stair_e', 'window', 17.7, 18, 10.3, 12.3, 0.9, 2.45, 'E'),
];

// ------------------------------------------------------------------ Ground floor
const G_ROOMS: Room[] = [
  { id: 'lobby_hall', kind: 'reception', tier: 'secondary', rects: [R(3.2, 0.3, 14.8, 8.2)], view: { eye: [9.4, 0.95], look: [8.6, 6.2] } },
  { id: 'security', kind: 'security', tier: 'proxy', rects: [R(0.3, 0.3, 3.08, 4.0)] },
  { id: 'management', kind: 'management', tier: 'proxy', rects: [R(0.3, 4.12, 3.08, 8.2)] },
  { id: 'mail', kind: 'mail', tier: 'proxy', rects: [R(14.92, 0.3, 17.7, 4.0)] },
  { id: 'back_office', kind: 'service', tier: 'proxy', rects: [R(14.92, 4.12, 17.7, 8.2)] },
  { id: 'plant', kind: 'plant', tier: 'proxy', rects: [R(0.3, 14.4, 8.8, 23.7)] },
  { id: 'loading', kind: 'service', tier: 'proxy', rects: [R(8.92, 14.4, 17.7, 23.7)] },
];
const G_OPENINGS: Opening[] = [
  hy('G.g.lobby.S', 'slider', 0, 0.3, 4.2, 13.8, 0, 3.3, 'S'),
  hy('G.w.security.S', 'window', 0, 0.3, 0.9, 2.5, 1.0, 2.8, 'S'),
  hy('G.w.mail.S', 'window', 0, 0.3, 15.5, 17.1, 1.0, 2.8, 'S'),
  vx('G.w.management.W', 'window', 0, 0.3, 5.0, 7.2, 1.0, 2.8, 'W'),
  vx('G.w.back_office.E', 'window', 17.7, 18, 5.0, 7.2, 1.0, 2.8, 'E'),
  vx('G.d.security', 'door', 3.08, 3.2, 1.5, 2.4, 0, 2.2),
  vx('G.d.management', 'door', 3.08, 3.2, 6.0, 6.9, 0, 2.2),
  vx('G.d.mail', 'door', 14.8, 14.92, 1.5, 2.4, 0, 2.2),
  vx('G.d.back_office', 'door', 14.8, 14.92, 6.0, 6.9, 0, 2.2),
  hy('G.o.core.S', 'arch', 8.2, 8.44, 7.7, 10.3, 0, 2.8),
  hy('G.d.core.N', 'door', 14.16, 14.4, 9.0, 9.9, 0, 2.2),
  hy('G.d.loading.N', 'entry', 23.7, 24, 11.0, 14.0, 0, 3.0, 'N'),
];

// ------------------------------------------------------------------ F10 wellness
const F10_ROOMS: Room[] = [
  { id: 'gym', kind: 'gym', tier: 'secondary', rects: [R(0.3, 0.3, 9.9, 8.2)], view: { eye: [8.95, 7.0], look: [3.2, 2.0] } },
  { id: 'wellness-lounge', kind: 'wellness-lounge', tier: 'secondary', rects: [R(10.02, 0.3, 17.7, 3.9)], view: { eye: [10.45, 1.0], look: [16.2, 2.7] } },
  { id: 'changing', kind: 'changing', tier: 'proxy', rects: [R(10.02, 4.02, 13.6, 8.2)], view: { eye: [10.6, 4.6], look: [13.0, 7.6] } },
  { id: 'spa', kind: 'spa', tier: 'secondary', rects: [R(13.72, 4.02, 17.7, 8.2)], view: { eye: [16.35, 4.45], look: [14.6, 7.4] } },
  { id: 'pool', kind: 'pool', tier: 'secondary', rects: [R(0.3, 14.4, 17.7, 23.7)], view: { eye: [16.4, 15.2], look: [5.0, 20.6] } },
];
const F10_OPENINGS: Opening[] = [
  hy('F10.w.gym.S', 'window', 0, 0.3, 0.9, 9.3, 0.3, 3.6, 'S'),
  vx('F10.w.gym.W', 'window', 0, 0.3, 1.0, 7.5, 0.3, 3.6, 'W'),
  hy('F10.w.lounge.S', 'window', 0, 0.3, 10.6, 17.1, 0.3, 3.6, 'S'),
  vx('F10.w.lounge.E', 'window', 17.7, 18, 0.9, 3.3, 0.3, 3.6, 'E'),
  vx('F10.w.spa.E', 'window', 17.7, 18, 5.0, 7.2, 1.6, 3.2, 'E'),
  hy('F10.w.pool.N', 'window', 23.7, 24, 0.9, 17.1, 0.3, 3.6, 'N'),
  vx('F10.w.pool.W', 'window', 0, 0.3, 15.2, 22.9, 0.3, 3.6, 'W'),
  vx('F10.w.pool.E', 'window', 17.7, 18, 15.2, 22.9, 0.3, 3.6, 'E'),
  hy('F10.o.core.S', 'arch', 8.2, 8.44, 8.4, 9.7, 0, 2.6),
  hy('F10.o.core.N', 'arch', 14.16, 14.4, 8.4, 9.8, 0, 2.6),
  vx('F10.o.gym.lounge', 'arch', 9.9, 10.02, 1.4, 2.8, 0, 2.6),
  vx('F10.d.gym.changing', 'door', 9.9, 10.02, 5.4, 6.4, 0, 2.2),
  vx('F10.d.changing.spa', 'door', 13.6, 13.72, 5.6, 6.5, 0, 2.2),
];

// ------------------------------------------------------------------ F11 sky dining
const F11_ROOMS: Room[] = [
  { id: 'restaurant', kind: 'restaurant', tier: 'secondary', rects: [R(0.3, 0.3, 11.5, 8.2)], view: { eye: [10.6, 7.4], look: [3.6, 2.4] } },
  { id: 'cafe', kind: 'cafe', tier: 'secondary', rects: [R(11.62, 0.3, 17.7, 8.2)], view: { eye: [12.3, 7.4], look: [16.4, 2.0] } },
  { id: 'kitchen', kind: 'kitchen-commercial', tier: 'proxy', rects: [R(0.3, 14.4, 8.6, 19.5)], view: { eye: [7.9, 17.0], look: [1.2, 16.4] } },   // V12: from the door side, across the cooking line to the window
  { id: 'terrace', kind: 'terrace', tier: 'secondary', outdoor: true, rects: [R(8.9, 14.4, 18, 24)], view: { eye: [9.8, 15.4], look: [15.6, 22.4] } },
  { id: 'shisha-conditional', kind: 'shisha-conditional', tier: 'secondary', outdoor: true, rects: [R(0, 19.8, 8.6, 24)], view: { eye: [6.6, 20.6], look: [2.2, 23.0] } },
];
const F11_OPENINGS: Opening[] = [
  hy('F11.w.restaurant.S', 'window', 0, 0.3, 0.9, 10.9, 0.3, 3.1, 'S'),
  vx('F11.w.restaurant.W', 'window', 0, 0.3, 1.0, 7.5, 0.3, 3.1, 'W'),
  hy('F11.w.cafe.S', 'window', 0, 0.3, 12.2, 17.1, 0.3, 3.1, 'S'),
  vx('F11.w.cafe.E', 'window', 17.7, 18, 1.0, 7.5, 0.3, 3.1, 'E'),
  vx('F11.o.restaurant.cafe', 'arch', 11.5, 11.62, 2.0, 6.0, 0, 2.7),
  hy('F11.o.core.S', 'slider', 8.2, 8.44, 8.3, 9.9, 0, 2.6),   // V11.5: glazed entrance doors from the lift lobby to the restaurant
  hy('F11.g.core.terrace', 'slider', 14.16, 14.4, 9.3, 10.5, 0, 2.5),
  hy('F11.d.core.kitchen', 'door', 14.16, 14.4, 7.5, 8.4, 0, 2.2),
  vx('F11.d.kitchen.terrace', 'door', 8.6, 8.9, 15.4, 16.3, 0, 2.2),
  vx('F11.w.kitchen.W', 'window', 0, 0.3, 15.4, 18.6, 1.4, 2.7, 'W'),
  vx('F11.s.shisha.terrace.a', 'screen', 8.6, 8.9, 19.8, 22.3, 0, 2.2),
  vx('F11.g.shisha.terrace', 'slider', 8.6, 8.9, 22.3, 23.4, 0, 2.2),
  vx('F11.s.shisha.terrace.b', 'screen', 8.6, 8.9, 23.4, 24, 0, 2.2),
];

// ------------------------------------------------------------------ Assembly
export interface PlacedRoom extends Room {
  /** Globally unique semantic id on the floor, e.g. "A.living", "core.lobby", "zone.pool". */
  key: string;
  owner: 'A' | 'B' | 'core' | 'zone';
}
export interface FloorPlan {
  floorId: FloorId;
  rooms: PlacedRoom[];
  openings: Opening[];
  /** indoor roofed regions for levels whose roof is not the full plate (F11) */
  roofRects: Rect[];
}

const place = (rooms: Room[], owner: PlacedRoom['owner']): PlacedRoom[] =>
  rooms.map((r) => ({ ...r, owner, key: `${owner}.${r.id}` }));

const cache = new Map<string, FloorPlan>();

export function getFloorPlan(floorId: FloorId): FloorPlan {
  const cat = FLOOR_BY_ID[floorId].category;
  const hit = cache.get(cat);
  if (hit) return { ...hit, floorId };
  let rooms: PlacedRoom[]; let openings: Opening[]; let roofRects: Rect[] = [FOOT];
  if (cat === 'residential') {
    rooms = [...place(UNIT_A.rooms, 'A'), ...place(UNIT_B.rooms, 'B'), ...place(CORE_ROOMS, 'core')];
    openings = [...UNIT_A.openings, ...UNIT_B.openings, ...CORE_OPENINGS];
  } else if (cat === 'ground') {
    rooms = [...place(G_ROOMS, 'zone'), ...place(CORE_ROOMS, 'core')];
    openings = [...G_OPENINGS, ...CORE_OPENINGS];
  } else if (cat === 'wellness') {
    rooms = [...place(F10_ROOMS, 'zone'), ...place(CORE_ROOMS, 'core')];
    openings = [...F10_OPENINGS, ...CORE_OPENINGS];
  } else {
    rooms = [...place(F11_ROOMS, 'zone'), ...place(CORE_ROOMS, 'core')];
    openings = [...F11_OPENINGS, ...CORE_OPENINGS];
    roofRects = [R(0, 0, 18, 14.4), R(0, 14.4, 8.9, 19.8)];
  }
  const plan: FloorPlan = { floorId, rooms, openings, roofRects };
  cache.set(cat, plan);
  return plan;
}

export const UNIT_PLANS = { TYPE_A: UNIT_A, TYPE_B: UNIT_B } as const;

/** Bounding rectangle of each unit's internal box, used for picking/framing. */
export const UNIT_BOUNDS = { A: R(0, 0, 18, 8.32), B: R(0, 14.28, 18, 24) } as const;

/** Amenity zone -> room key on its floor (single source for the Amenities section and Nakhla AI). */
export const AMENITY_ZONES: { id: string; floorId: FloorId; roomKey: string; conditional?: boolean }[] = [
  { id: 'gym', floorId: 'F10', roomKey: 'zone.gym' },
  { id: 'pool', floorId: 'F10', roomKey: 'zone.pool' },
  { id: 'spa', floorId: 'F10', roomKey: 'zone.spa' },
  { id: 'changing', floorId: 'F10', roomKey: 'zone.changing' },
  { id: 'wellness-lounge', floorId: 'F10', roomKey: 'zone.wellness-lounge' },
  { id: 'restaurant', floorId: 'F11', roomKey: 'zone.restaurant' },
  { id: 'cafe', floorId: 'F11', roomKey: 'zone.cafe' },
  { id: 'terrace', floorId: 'F11', roomKey: 'zone.terrace' },
  { id: 'shisha-conditional', floorId: 'F11', roomKey: 'zone.shisha-conditional', conditional: true },
];
