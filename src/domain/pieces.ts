import { Model, bez, piece, rnd, type BuiltPiece, type V3 } from './modelkit';

// ---------------------------------------------------------------------------------------------
// Loose furniture, soft furnishings, lighting and decor. ORIGINAL geometry, real dimensions (m).
// Local frame of every piece: origin at the back-left corner, x → right, y → forward, z up.
// ---------------------------------------------------------------------------------------------

const leg = (m: Model, x: number, y: number, h: number, r = 0.013, dx = 0, dy = 0, r1 = r * 0.75) => m.tube([[x, y, h], [x + dx, y + dy, 0]], r, 8, r1);

// ------------------------------------------------------------------------------------ decor
function books(m: Model, x: number, y: number, z: number, n: number, deg = 0, seed = 1) {
  const r = rnd(seed); let zz = z;
  for (let i = 0; i < n; i++) {
    const w = 0.21 + r() * 0.07, d = 0.15 + r() * 0.04, t = 0.018 + r() * 0.016;
    m.at(x, y, zz, deg + (r() - 0.5) * 14, () => {
      m.mat(['book_a', 'book_b', 'book_c', 'book_d'][Math.floor(r() * 4)]).box(-w / 2, -d / 2, 0, w / 2, d / 2, t, 0.002);
      m.mat('paper').box(-w / 2 + 0.004, -d / 2 + 0.003, 0.003, w / 2 + 0.0015, d / 2 - 0.003, t - 0.003);
    });
    zz += t;
  }
  return zz;
}
function vase(m: Model, x: number, y: number, z: number, s = 1, mat = 'ceramic_sand', stems = 0, seed = 3) {
  m.mat(mat).lathe(x, y, [[0, z], [0.05 * s, z], [0.085 * s, z + 0.07 * s], [0.09 * s, z + 0.14 * s], [0.06 * s, z + 0.24 * s], [0.035 * s, z + 0.29 * s], [0.042 * s, z + 0.32 * s], [0.032 * s, z + 0.32 * s], [0.026 * s, z + 0.28 * s]], 18);
  const r = rnd(seed);
  for (let i = 0; i < stems; i++) {
    const a = r() * 6.28, l = (0.32 + r() * 0.3) * s, o = 0.1 + r() * 0.16; const top: V3 = [x + Math.cos(a) * o, y + Math.sin(a) * o, z + 0.3 * s + l];
    m.mat('stem').tube(bez([x, y, z + 0.26 * s], [x + Math.cos(a) * o * 0.2, y + Math.sin(a) * o * 0.2, z + 0.3 * s + l * 0.6], top, 5), 0.003, 5, 0.0015);
    for (let k = 0; k < 4; k++) { const t = 0.45 + k * 0.17; m.mat('leaf_dry').ball(x + Math.cos(a) * o * t * t, y + Math.sin(a) * o * t * t, z + 0.3 * s + l * t, 0.016, 0.016, 0.028, 6); }
  }
}
function bowl(m: Model, x: number, y: number, z: number, r = 0.16, mat = 'ceramic_dark', fruit = 0) {
  m.mat(mat).lathe(x, y, [[0, z], [r * 0.45, z], [r * 0.9, z + r * 0.36], [r, z + r * 0.5], [r * 0.96, z + r * 0.5], [r * 0.84, z + r * 0.34], [r * 0.4, z + 0.012], [0, z + 0.012]], 20);
  const q = rnd(9);
  for (let i = 0; i < fruit; i++) { const a = (i / fruit) * 6.28 + q(), d = i === 0 ? 0 : r * 0.42; m.mat(i % 2 ? 'fruit_g' : 'fruit_y').ball(x + Math.cos(a) * d, y + Math.sin(a) * d, z + 0.05 + (i === 0 ? 0.03 : 0), 0.036, 0.036, 0.034, 10); }
}
function candle(m: Model, x: number, y: number, z: number, h = 0.12) {
  m.mat('glass_clear').lathe(x, y, [[0, z], [0.04, z], [0.04, z + h], [0.036, z + h], [0.036, z + 0.006]], 14);
  m.mat('candle').cyl(x, y, z + 0.004, z + h * 0.6, 0.033, 0.033, 12);
}

/** Leafy plant: pot, soil, stems and individually modelled leaves. kind: tree | bush | grass */
function foliage(m: Model, x: number, y: number, z0: number, h: number, kind: 'tree' | 'bush' | 'grass', seed: number) {
  const r = rnd(seed);
  const leaf = (p: V3, yaw: number, pitch: number, L: number, W: number, mat: string) => {
    m.mat(mat).push().move(p[0], p[1], p[2]).rotZ(yaw).rotX(pitch);
    m.sheet(3, 2, (u, v) => [(v - 0.5) * W * Math.sin(Math.PI * (0.08 + 0.92 * u)) ** 0.8, u * L, -0.35 * L * u * u + Math.abs(v - 0.5) * W * 0.5], { double: true, su: 0.2, sv: 0.2 });
    m.pop();
  };
  if (kind === 'grass') {
    for (let i = 0; i < 46; i++) { const a = r() * 6.28, d = r() * 0.14, L = h * (0.55 + r() * 0.45); leaf([x + Math.cos(a) * d, y + Math.sin(a) * d, z0], a * 57.3 + 90, 62 + r() * 24, L, 0.022, i % 3 ? 'leaf' : 'leaf_light'); }
    return;
  }
  const nb = kind === 'tree' ? 5 : 7;
  for (let b = 0; b < nb; b++) {
    const a = (b / nb) * 6.28 + r(), sp = kind === 'tree' ? 0.16 + r() * 0.22 : 0.1 + r() * 0.2, top = h * (0.72 + r() * 0.28);
    const tipX = x + Math.cos(a) * sp * h, tipY = y + Math.sin(a) * sp * h;
    const path = bez([x + Math.cos(a) * 0.02, y + Math.sin(a) * 0.02, z0], [x + Math.cos(a) * sp * h * 0.15, y + Math.sin(a) * sp * h * 0.15, z0 + top * 0.7], [tipX, tipY, z0 + top], 6);
    m.mat('stem').tube(path, kind === 'tree' ? 0.011 : 0.006, 5, 0.003);
    const nl = kind === 'tree' ? 9 : 6;
    for (let k = 0; k < nl; k++) {
      const t = kind === 'tree' ? 0.42 + (k / nl) * 0.58 : 0.25 + (k / nl) * 0.75; const p = path[Math.min(path.length - 1, Math.round(t * (path.length - 1)))];
      const L = (kind === 'tree' ? 0.2 : 0.15) * (0.7 + r() * 0.6) * Math.min(1.25, h);
      leaf(p, a * 57.3 - 90 + (k % 2 ? 68 : -68) + (r() - 0.5) * 40, 8 + r() * 34, L, L * 0.46, k % 4 === 0 ? 'leaf_light' : 'leaf');
    }
  }
}
export const plantPot = (s = 1, kind: 'tree' | 'bush' | 'grass' = 'tree', pot = 'pot') => piece(`plant|${s}|${kind}|${pot}`, (m) => {
  const R = (kind === 'tree' ? 0.2 : 0.16) * s, H = (kind === 'tree' ? 0.44 : 0.3) * s;
  m.mat(pot).lathe(0, 0, [[0, 0], [R * 0.72, 0], [R * 0.98, H * 0.92], [R, H], [R * 0.9, H], [R * 0.86, H * 0.9]], 22);
  m.mat('soil').lathe(0, 0, [[R * 0.9, H * 0.9], [0, H * 0.9]], 14);
  foliage(m, 0, 0, H * 0.9, (kind === 'tree' ? 1.45 : kind === 'bush' ? 0.6 : 0.7) * s, kind, Math.round(s * 100) + kind.length);
  m.solid(-R, -R, R, R, 0, 1.4 * s);
});
/** Rectangular planter trough with grasses / shrubs. */
export const planter = (w: number, d: number, h = 0.5, kind: 'bush' | 'grass' = 'grass') => piece(`planter|${w}|${d}|${h}|${kind}`, (m) => {
  m.mat('pot').box(0, 0, 0, w, d, h, 0.012); m.mat('soil').box(0.03, 0.03, h - 0.03, w - 0.03, d - 0.03, h + 0.004);
  const n = Math.max(1, Math.round(Math.max(w, d) / 0.42));
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; foliage(m, w > d ? w * t : w / 2, w > d ? d / 2 : d * t, h, kind === 'grass' ? 0.75 : 0.55, kind, 11 + i * 7); }
  m.solid(0, 0, w, d, 0, h + 0.5);
});

// ------------------------------------------------------------------------------------ seating
/** Upholstered sofa: plinth legs, frame, crowned seat + back cushions, scatter pillows, throw. */
export const sofa = (w = 2.6, d = 0.98, fab = 'fabric_sand', o: { outdoor?: boolean; pillows?: number; throw?: boolean } = {}) => piece(`sofa|${w}|${d}|${fab}|${o.outdoor ? 1 : 0}|${o.pillows ?? 3}|${o.throw ? 1 : 0}`, (m) => {
  const arm = o.outdoor ? 0.1 : 0.17, seatZ = 0.3, n = Math.max(1, Math.round((w - 2 * arm) / 0.78)), cw = (w - 2 * arm) / n;
  if (o.outdoor) { // teak slat frame
    m.mat('teak').tex(true);
    for (const x of [0.03, w - 0.09]) { m.box(x, 0.03, 0, x + 0.06, 0.09, 0.62, 0.006); m.box(x, d - 0.09, 0, x + 0.06, d - 0.03, 0.56, 0.006); m.box(x, 0.03, 0.56, x + 0.06, d - 0.03, 0.62, 0.006); }
    m.box(0.03, 0.03, 0.2, w - 0.03, d - 0.03, 0.26, 0.006);
    for (let i = 0; i < 7; i++) m.box(0.09, 0.03, 0.3 + i * 0.07, w - 0.09, 0.055, 0.345 + i * 0.07, 0.004);
    m.tex();
  } else {
    m.mat('black_metal'); for (const [x, y] of [[0.09, 0.1], [w - 0.09, 0.1], [0.09, d - 0.1], [w - 0.09, d - 0.1]]) m.box(x - 0.02, y - 0.02, 0, x + 0.02, y + 0.02, 0.13, 0.004);
    m.mat(fab).box(0, 0, 0.12, w, d - 0.02, seatZ, 0.03, { bs: 2 });
    m.box(0, 0.01, 0.12, arm, d - 0.02, 0.6, 0.06, { belly: 0.012, sub: 3 }); m.box(w - arm, 0.01, 0.12, w, d - 0.02, 0.6, 0.06, { belly: 0.012, sub: 3 });
    m.box(arm - 0.02, 0, 0.12, w - arm + 0.02, 0.2, 0.74, 0.06, { belly: 0.01, sub: 3 });
  }
  m.mat(o.outdoor ? 'fabric_outdoor' : fab);
  for (let i = 0; i < n; i++) {
    const x0 = arm + i * cw + 0.004, x1 = arm + (i + 1) * cw - 0.004;
    m.box(x0, 0.2, seatZ, x1, d + 0.01, seatZ + 0.17, 0.05, { crown: 0.028, belly: 0.01, sub: 5 });
    m.at(x0, 0.185, 0.93, 0, () => { m.rotX(-79); m.box(0.004, 0, 0, x1 - x0 - 0.004, 0.47, 0.17, 0.065, { crown: 0.035, belly: 0.012, sub: 5 }); });
  }
  const np = o.pillows ?? 3; const pm = ['velvet_olive', 'linen_sand', 'velvet_rust', 'linen_white'];
  for (let i = 0; i < np; i++) {
    const left = i % 2 === 0, k = Math.floor(i / 2); const x = left ? arm + 0.3 + k * 0.42 : w - arm - 0.3 - k * 0.42;
    m.mat(pm[(i + (fab === 'fabric_taupe' ? 1 : 0)) % 4]).at(x, 0.5 + k * 0.03, seatZ + 0.36, (left ? 1 : -1) * (14 + k * 9), () => { m.rotX(-66 + k * 6); m.pillow(0.46 - k * 0.06, 0.46 - k * 0.06, 0.15, 7); });
  }
  if (o.throw) { // blanket folded over the right arm
    m.mat('throw').sheet(14, 5, (u, v) => {
      const s = u * 1.5; const x = s < 0.45 ? w - arm - 0.28 + s * 0.4 : s < 0.75 ? w - arm - 0.1 + (s - 0.45) * 0.62 : w + 0.012;
      const z = s < 0.45 ? seatZ + 0.19 + s * 0.52 : s < 0.75 ? 0.615 + Math.sin(((s - 0.45) / 0.3) * Math.PI) * 0.012 : 0.615 - (s - 0.75) * 0.5;
      return [Math.min(x, w + 0.012), 0.34 + v * 0.44 + Math.sin(u * 9) * 0.008, z + Math.sin(v * 13 + u * 5) * 0.004];
    }, { double: true, su: 1.5, sv: 0.45 });
  }
  m.solid(0, 0, w, d, 0, 0.8);
});

export const ottoman = (w = 0.9, d = 0.5, fab = 'velvet_olive') => piece(`ottoman|${w}|${d}|${fab}`, (m) => {
  m.mat('brass'); for (const [x, y] of [[0.06, 0.06], [w - 0.06, 0.06], [0.06, d - 0.06], [w - 0.06, d - 0.06]]) leg(m, x, y, 0.16, 0.011);
  m.mat(fab).box(0, 0, 0.15, w, d, 0.44, 0.05, { crown: 0.02, belly: 0.008, sub: 5 });
  m.solid(0, 0, w, d, 0, 0.45);
});

/** Dining / desk chair: upholstered seat and curved back on tapered timber legs. */
export const chair = (fab = 'fabric_taupe', frame = 'oak') => piece(`chair|${fab}|${frame}`, (m) => {
  const w = 0.48, d = 0.5;
  m.mat(frame);
  leg(m, 0.06, 0.07, 0.44, 0.016, -0.015, -0.03); leg(m, w - 0.06, 0.07, 0.44, 0.016, 0.015, -0.03);
  leg(m, 0.06, d - 0.06, 0.44, 0.016, -0.015, 0.02); leg(m, w - 0.06, d - 0.06, 0.44, 0.016, 0.015, 0.02);
  m.tube([[0.07, 0.065, 0.44], [0.085, 0.025, 0.8]], 0.014, 8); m.tube([[w - 0.07, 0.065, 0.44], [w - 0.085, 0.025, 0.8]], 0.014, 8);
  m.mat(fab).box(0.02, 0.03, 0.43, w - 0.02, d, 0.5, 0.03, { crown: 0.014, belly: 0.004, sub: 4 });
  m.sheet(8, 4, (u, v) => { const a = (u - 0.5) * 1.0; return [w / 2 + Math.sin(a) * 0.4, 0.05 + (1 - Math.cos(a)) * 0.28 - v * 0.045, 0.56 + v * 0.3]; }, { double: true, su: 0.44, sv: 0.3 });
  m.sheet(8, 4, (u, v) => { const a = (u - 0.5) * 1.0; return [w / 2 + Math.sin(a) * 0.4, 0.028 + (1 - Math.cos(a)) * 0.28 - v * 0.045, 0.56 + v * 0.3]; }, { double: true, su: 0.44, sv: 0.3 });
  m.solid(0, 0, w, d, 0, 0.86);
});
/** Counter stool with footrest ring. */
export const stool = (fab = 'leather_tan') => piece(`stool|${fab}`, (m) => {
  m.mat('black_metal'); for (let i = 0; i < 4; i++) { const a = (i + 0.5) * 1.5708; m.tube([[Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0.63], [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0]], 0.011, 8); }
  const ring: V3[] = []; for (let i = 0; i <= 20; i++) { const a = (i / 20) * 6.2832; ring.push([Math.cos(a) * 0.178, Math.sin(a) * 0.178, 0.22]); } m.tube(ring, 0.008, 6, 0.008, false);
  m.mat(fab).lathe(0, 0, [[0, 0.62], [0.17, 0.62], [0.19, 0.645], [0.185, 0.68], [0.15, 0.7], [0, 0.705]], 22);
  m.sheet(8, 3, (u, v) => { const a = (u - 0.5) * 1.5 - 1.5708; return [Math.cos(a) * 0.185, Math.sin(a) * 0.185, 0.7 + v * 0.17]; }, { double: true, su: 0.4, sv: 0.17 });
  m.solid(-0.2, -0.2, 0.2, 0.2, 0, 0.7);
});

// ------------------------------------------------------------------------------------ tables
export const roundTable = (r: number, h: number, top = 'stone_top', decor = 0) => piece(`rt|${r}|${h}|${top}|${decor}`, (m) => {
  const t = h > 0.6 ? 0.035 : 0.028;
  m.mat(top).lathe(0, 0, [[0, h - t], [r - 0.012, h - t], [r, h - t + 0.01], [r, h - 0.005], [r - 0.005, h], [0, h]], 36);
  if (h > 0.6) { m.mat('black_metal').lathe(0, 0, [[0, 0], [r * 0.52, 0], [r * 0.5, 0.012], [0.06, 0.035], [0.035, 0.1], [0.035, h - t - 0.03], [0.1, h - t], [0, h - t]], 22); }
  else { m.mat('black_metal'); for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; m.tube([[Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25, h - t], [Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, 0]], 0.011, 8); }
    const ring: V3[] = []; for (let i = 0; i <= 18; i++) { const a = (i / 18) * 6.2832; ring.push([Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, h * 0.42]); } m.tube(ring, 0.006, 6, 0.006, false); }
  if (decor === 1) { const z = books(m, -r * 0.3, r * 0.1, h, 2, 20, 5); bowl(m, -r * 0.3, r * 0.1, z, 0.07, 'brass'); vase(m, r * 0.35, -r * 0.2, h, 0.8, 'ceramic_sand', 3, 4); }
  if (decor === 2) { candle(m, r * 0.2, 0.05, h, 0.1); candle(m, -r * 0.15, -r * 0.2, h, 0.07); }
  m.solid(-r, -r, r, r, 0, h);
});
export const diningTable = (w = 1.9, d = 0.95, surf?: string) => piece(`dt|${w}|${d}|${surf}`, (m) => {
  m.mat('oak', { surf }).tex(true).box(0, 0, 0.715, w, d, 0.755, 0.006).tex();
  m.box(0.14, 0.12, 0.64, w - 0.14, 0.15, 0.715); m.box(0.14, d - 0.15, 0.64, w - 0.14, d - 0.12, 0.715);
  for (const [x, y, dx, dy] of [[0.13, 0.13, -0.03, -0.03], [w - 0.13, 0.13, 0.03, -0.03], [0.13, d - 0.13, -0.03, 0.03], [w - 0.13, d - 0.13, 0.03, 0.03]]) m.tube([[x, y, 0.715], [x + dx, y + dy, 0]], 0.032, 12, 0.02);
  m.mat('linen_sand').box(w * 0.5 - 0.5, d * 0.5 - 0.17, 0.755, w * 0.5 + 0.5, d * 0.5 + 0.17, 0.758);
  bowl(m, w * 0.5, d * 0.5, 0.758, 0.17, 'ceramic_dark', 5); candle(m, w * 0.5 - 0.36, d * 0.5, 0.758, 0.11); candle(m, w * 0.5 + 0.36, d * 0.5 + 0.03, 0.758, 0.08);
  m.solid(0, 0, w, d, 0, 0.76);
});
export const desk = (w = 1.4, surf?: string) => piece(`desk|${w}|${surf}`, (m) => {
  m.mat('oak', { surf }).tex(true).box(0, 0, 0.72, w, 0.6, 0.752, 0.005).tex(); m.box(w - 0.45, 0.02, 0.6, w - 0.02, 0.56, 0.72, 0.003);
  m.mat('gap_dark').box(w - 0.44, 0.56, 0.612, w - 0.03, 0.563, 0.708);
  m.mat('black_metal'); for (const x of [0.04, w - 0.04]) { m.tube([[x, 0.05, 0.72], [x, 0.05, 0.015], [x, 0.55, 0.015], [x, 0.55, 0.72]], 0.012, 8); }
  m.mat('laptop').box(0.42, 0.2, 0.752, 0.76, 0.44, 0.764, 0.004); m.at(0.42, 0.2, 0.764, 0, () => { m.rotX(-78); m.mat('laptop').box(0, -0.235, 0, 0.34, 0, 0.006, 0.003); m.mat('tv_screen').box(0.008, -0.228, 0.006, 0.332, -0.008, 0.0065); });
  books(m, 0.16, 0.14, 0.752, 3, 8, 12);
  m.mat('black_metal').cyl(w - 0.18, 0.14, 0.752, 0.762, 0.07); m.tube(bez([w - 0.18, 0.14, 0.76], [w - 0.18, 0.14, 1.2], [w - 0.42, 0.26, 1.12], 8), 0.007, 6);
  m.lathe(w - 0.42, 0.26, [[0.012, 1.13], [0.06, 1.06], [0.055, 1.06], [0.01, 1.12]], 14); m.mat('led').ball(w - 0.42, 0.26, 1.085, 0.018, 0.018, 0.018, 8);
  m.solid(0, 0, w, 0.6, 0, 0.76);
});
export const console = (w = 2.2, d = 0.36, surf?: string) => piece(`console|${w}|${d}|${surf}`, (m) => {
  m.mat('oak', { surf }).tex(true).box(0, 0, 0.78, w, d, 0.81, 0.004).tex();
  m.mat('black_metal'); for (const x of [0.05, w - 0.05]) m.tube([[x, 0.04, 0.78], [x, 0.04, 0.012], [x, d - 0.04, 0.012], [x, d - 0.04, 0.78]], 0.01, 8);
  m.mat('oak', { surf }).tex(true).box(0.05, 0.03, 0.2, w - 0.05, d - 0.03, 0.225, 0.003).tex();
  vase(m, 0.32, d / 2, 0.81, 1.15, 'ceramic_dark', 5, 21); books(m, w - 0.5, d / 2, 0.81, 3, -6, 31); bowl(m, w / 2 + 0.1, d / 2, 0.81, 0.11, 'ceramic_sand');
  m.mat('basket').lathe(0.45, d / 2, [[0, 0.225], [0.15, 0.225], [0.17, 0.5], [0.16, 0.5], [0.14, 0.24]], 18); m.lathe(w - 0.5, d / 2, [[0, 0.225], [0.13, 0.225], [0.15, 0.44], [0.14, 0.44], [0.12, 0.24]], 18);
  m.solid(0, 0, w, d, 0, 0.82);
});

// ------------------------------------------------------------------------------------ lighting
export const pendant = (r = 0.18, drop = 0.75, mat = 'brass') => piece(`pendant|${r}|${drop}|${mat}`, (m) => {
  // local z = 0 is the ceiling; the shade hangs `drop` below
  const z = -drop;
  m.mat('black_metal').cyl(0, 0, -0.025, 0, 0.055).tube([[0, 0, -0.02], [0, 0, z + r * 0.9]], 0.0035, 5);
  m.mat(mat).lathe(0, 0, [[0.02, z + r * 0.95], [r * 0.45, z + r * 0.8], [r * 0.85, z + r * 0.42], [r, z], [r * 0.985, z], [r * 0.83, z + r * 0.4], [r * 0.43, z + r * 0.76], [0.02, z + r * 0.9]], 26);
  m.mat('led').ball(0, 0, z + r * 0.42, r * 0.2, r * 0.2, r * 0.24, 10);
});
export const floorLamp = () => piece('floorlamp', (m) => {
  m.mat('marble').cyl(0, 0, 0, 0.035, 0.17, 0.17, 28);
  m.mat('brass').tube([[0, 0, 0.03], [0, 0, 1.2], ...bez([0, 0, 1.2], [0, 0, 2.02], [0.78, 0, 1.78], 12)], 0.011, 8);
  m.lathe(0.78, 0, [[0.02, 1.8], [0.14, 1.72], [0.2, 1.58], [0.195, 1.58], [0.135, 1.71], [0.02, 1.785]], 24);
  m.mat('led').ball(0.78, 0, 1.64, 0.04, 0.04, 0.045, 10);
  m.solid(-0.17, -0.17, 0.17, 0.17, 0, 1.2);
});
export const tableLamp = (base = 'ceramic_sand') => piece(`tlamp|${base}`, (m) => {
  m.mat(base).lathe(0, 0, [[0, 0], [0.06, 0], [0.085, 0.07], [0.07, 0.17], [0.03, 0.24], [0.016, 0.26]], 18);
  m.mat('brass').cyl(0, 0, 0.255, 0.33, 0.008, 0.008, 8);
  m.mat('lamp_shade').lathe(0, 0, [[0.115, 0.3], [0.095, 0.48], [0, 0.48]], 22).lathe(0, 0, [[0, 0.3], [0.115, 0.3]], 22);
});
export const downlight = () => piece('downlight', (m) => {
  m.mat('ceiling_trim').lathe(0, 0, [[0.052, -0.004], [0.036, -0.004], [0.036, 0]], 16); m.mat('led').lathe(0, 0, [[0.036, -0.0025], [0, -0.0025]], 16);
});

// ------------------------------------------------------------------------------------ soft goods
/** Gathered curtain stack: length L along x at the wall (y=0), hanging from height h. */
export const curtain = (L: number, h: number, mat = 'curtain_fabric') => piece(`curtain|${L}|${h}|${mat}`, (m) => {
  const folds = Math.max(3, Math.round(L / 0.085));
  m.mat(mat).sheet(folds * 6, 6, (u, v) => {
    const a = u * folds * 6.2832; const amp = 0.034 * (0.75 + 0.25 * Math.sin(u * 17)) * (0.82 + 0.18 * v);
    return [u * L + Math.sin(a * 0.5 + v) * 0.004, 0.05 + Math.sin(a) * amp + 0.008 * Math.sin(v * 4 + u * 30), 0.015 + (1 - v) * (h - 0.015)];
  }, { double: true, su: L * 2.6, sv: h });
  m.mat('black_metal').box(-0.05, 0.03, h, L + 0.05, 0.07, h + 0.02);
});
export const rug = (w: number, d: number, mat = 'rug') => piece(`rug|${w}|${d}|${mat}`, (m) => { m.mat(mat, { ns: true }).box(0, 0, 0.006, w, d, 0.019, 0.006, { bs: 2 }); });
/** Framed artwork hanging on the wall at y=0 (thickness grows toward +y). */
export const art = (w: number, h: number, mat = 'art_a', frame = 'oak') => piece(`art|${w}|${h}|${mat}|${frame}`, (m) => {
  const f = 0.022, dp = 0.032;
  m.mat(frame).box(0, 0, 0, w, dp, f).box(0, 0, h - f, w, dp, h).box(0, 0, f, f, dp, h - f).box(w - f, 0, f, w, dp, h - f);
  m.mat('paper', { ns: true }).box(f, 0.004, f, w - f, 0.014, h - f);
  const b = Math.min(w, h) * 0.11;
  m.mat(mat, { ns: true }).sheet(1, 1, (u, v) => [w - f - b - u * (w - 2 * f - 2 * b), 0.0155, f + b + v * (h - 2 * f - 2 * b)], { su: 1, sv: 1 });
});

// ------------------------------------------------------------------------------------ beds
export const bed = (w = 1.8, l = 2.05, headSurf?: string, fab = 'fabric_taupe', duvet = 'linen_grey') => piece(`bed|${w}|${l}|${headSurf}|${fab}|${duvet}`, (m) => {
  const hw = w + 0.24; // headboard: timber surround + channel-tufted upholstery
  m.mat('oak', { surf: headSurf }).box(-0.12, 0, 0.1, w + 0.12, 0.045, 1.24, 0.004);
  const nch = Math.round(hw / 0.19), cw = (hw - 0.06) / nch;
  m.mat(fab); for (let i = 0; i < nch; i++) m.box(-0.09 + i * cw + 0.003, 0.04, 0.3, -0.09 + (i + 1) * cw - 0.003, 0.115, 1.2, 0.034, { belly: 0.012, sub: 3 });
  m.mat('black_metal'); for (const [x, y] of [[0.08, 0.2], [w - 0.08, 0.2], [0.08, l - 0.08], [w - 0.08, l - 0.08]]) m.box(x - 0.025, y - 0.025, 0, x + 0.025, y + 0.025, 0.12, 0.004);
  m.mat(fab).box(-0.035, 0.1, 0.11, w + 0.035, l + 0.04, 0.33, 0.03, { bs: 2 });
  m.mat('linen_white').box(0.005, 0.115, 0.33, w - 0.005, l + 0.01, 0.57, 0.055, { bs: 3 });
  m.mat(duvet).box(-0.05, 0.78, 0.29, w + 0.05, l + 0.065, 0.655, 0.075, { crown: 0.03, belly: 0.014, sub: 7 });
  m.mat('linen_white').box(-0.052, 0.68, 0.56, w + 0.052, 1.0, 0.682, 0.04, { crown: 0.014, sub: 6 });
  m.mat('throw').box(-0.056, l - 0.5, 0.3, w + 0.056, l - 0.06, 0.688, 0.035, { crown: 0.012, sub: 6 });
  const pw = Math.min(0.74, w / 2 - 0.1);
  for (const s of [0, 1]) {
    const cx = s ? w * 0.75 : w * 0.25;
    m.mat('linen_white').at(cx, 0.24, 0.8, s ? -3 : 4, () => { m.rotX(-64); m.pillow(pw, 0.48, 0.17, 8); });
    m.mat(duvet).at(cx + (s ? -0.01 : 0.02), 0.42, 0.73, s ? 5 : -4, () => { m.rotX(-52); m.pillow(pw - 0.06, 0.44, 0.16, 8); });
  }
  m.mat('velvet_rust').at(w * 0.5, 0.6, 0.71, 3, () => { m.rotX(-48); m.pillow(0.62, 0.3, 0.13, 7); });
  m.solid(-0.12, 0, w + 0.12, l + 0.06, 0, 1.0);
});
export const nightstand = (surf?: string, lamp = true) => piece(`ns|${surf}|${lamp ? 1 : 0}`, (m) => {
  const w = 0.52, d = 0.42;
  m.mat('brass'); for (const [x, y] of [[0.05, 0.05], [w - 0.05, 0.05], [0.05, d - 0.05], [w - 0.05, d - 0.05]]) leg(m, x, y, 0.17, 0.011);
  m.mat('gap_dark').box(0.006, 0.01, 0.17, w - 0.006, d - 0.004, 0.51);
  m.mat('oak', { surf }).tex(true).box(0, 0, 0.165, w, d - 0.02, 0.185, 0.003).box(0, 0, 0.5, w, d, 0.525, 0.004).tex().box(0, 0, 0.185, 0.018, d - 0.02, 0.5).box(w - 0.018, 0, 0.185, w, d - 0.02, 0.5);
  m.tex(true).box(0.021, d - 0.02, 0.188, w - 0.021, d, 0.34, 0.002).box(0.021, d - 0.02, 0.344, w - 0.021, d, 0.497, 0.002).tex();
  m.mat('brass').ball(w / 2, d + 0.012, 0.264, 0.012).ball(w / 2, d + 0.012, 0.42, 0.012);
  if (lamp) { m.at(w * 0.36, d * 0.42, 0.525, 0, () => { const t = tableLamp('ceramic_sand'); addPiece(m, t); }); books(m, w * 0.72, d * 0.52, 0.525, 2, 12, 41); }
  else vase(m, w * 0.5, d * 0.45, 0.525, 0.7, 'ceramic_dark', 3, 51);
  m.solid(0, 0, w, d, 0, 0.55);
});
export const bench = (w = 1.3, fab = 'velvet_olive') => piece(`bench|${w}|${fab}`, (m) => {
  m.mat('brass'); for (const x of [0.07, w - 0.07]) m.tube([[x, 0.05, 0.36], [x, 0.05, 0.012], [x, 0.37, 0.012], [x, 0.37, 0.36]], 0.011, 8);
  m.mat(fab).box(0, 0, 0.34, w, 0.42, 0.46, 0.045, { crown: 0.018, belly: 0.006, sub: 6 });
  m.solid(0, 0, w, 0.42, 0, 0.46);
});
export const dresser = (w = 1.2, surf?: string) => piece(`dresser|${w}|${surf}`, (m) => {
  const d = 0.46, h = 0.8;
  m.mat('brass'); for (const [x, y] of [[0.06, 0.06], [w - 0.06, 0.06], [0.06, d - 0.06], [w - 0.06, d - 0.06]]) leg(m, x, y, 0.14, 0.012);
  m.mat('gap_dark').box(0.006, 0.01, 0.14, w - 0.006, d - 0.004, h - 0.01);
  m.mat('oak', { surf }).tex(true).box(0, 0, h - 0.025, w, d, h, 0.004).box(0, 0, 0.135, w, d - 0.02, 0.155).tex().box(0, 0, 0.155, 0.018, d - 0.02, h - 0.025).box(w - 0.018, 0, 0.155, w, d - 0.02, h - 0.025);
  const rows = 3, cols = 2, rh = (h - 0.025 - 0.158) / rows, cwid = (w - 0.042) / cols;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x0 = 0.021 + c * cwid + 0.0015, z0 = 0.158 + r * rh + 0.0015;
    m.mat('oak', { surf }).tex(true).box(x0, d - 0.02, z0, x0 + cwid - 0.003, d, z0 + rh - 0.003, 0.002).tex();
    m.mat('brass').box(x0 + cwid / 2 - 0.06, d, z0 + rh - 0.035, x0 + cwid / 2 + 0.06, d + 0.012, z0 + rh - 0.025, 0.002);
  }
  vase(m, w * 0.2, d * 0.5, h, 1, 'ceramic_sand', 4, 61); books(m, w * 0.62, d * 0.5, h, 2, -10, 71); candle(m, w * 0.85, d * 0.4, h, 0.09);
  m.solid(0, 0, w, d, 0, h);
});
export const roundMirror = (r = 0.38) => piece(`rmirror|${r}`, (m) => {
  m.mat('mirror', { ns: true }).push().rotX(90).lathe(0, 0, [[0, -0.014], [r - 0.012, -0.014]], 40).pop();
  const ring: V3[] = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * 6.2832; ring.push([Math.cos(a) * r, 0.014, Math.sin(a) * r]); } m.mat('brass').tube(ring, 0.012, 8, 0.012, false);
});
export const lounger = (outdoor = true) => piece(`lounger|${outdoor ? 1 : 0}`, (m) => {
  const w = 0.7, l = 1.95;
  m.mat('teak').tex(true).box(0, 0, 0.2, 0.05, l, 0.27, 0.006).box(w - 0.05, 0, 0.2, w, l, 0.27, 0.006);
  for (let i = 0; i < 12; i++) m.box(0.05, 0.62 + i * 0.11, 0.215, w - 0.05, 0.69 + i * 0.11, 0.24, 0.003);
  for (const [x, y] of [[0.03, 0.12], [w - 0.07, 0.12], [0.03, l - 0.16], [w - 0.07, l - 0.16]]) m.box(x, y, 0, x + 0.045, y + 0.045, 0.2, 0.004);
  m.tex();
  m.at(0, 0.62, 0.24, 0, () => { m.rotX(152); m.mat('teak').box(0.05, 0, -0.03, w - 0.05, 0.62, -0.005); m.mat('linen_white').box(0.04, 0.0, -0.11, w - 0.04, 0.63, -0.03, 0.03, { belly: 0.006, sub: 4 }); });
  m.mat('linen_white').box(0.04, 0.6, 0.24, w - 0.04, l - 0.02, 0.32, 0.03, { crown: 0.012, sub: 5 });
  m.mat(outdoor ? 'fabric_outdoor' : 'linen_sand').at(w / 2, 0.2, 0.52, 0, () => { m.rotX(-30); m.pillow(0.44, 0.26, 0.1, 6); });
  m.solid(0, 0, w, l, 0, 0.5);
});

/** Copy an already built piece into the model being built (at the current transform). */
export function addPiece(m: Model, b: BuiltPiece) {
  for (const p of b.parts) m.mat(p.mat, { surf: p.surf, ns: p.ns }).raw(p.pos, p.nrm, p.uv);
}
