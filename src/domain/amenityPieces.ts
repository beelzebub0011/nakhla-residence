import { Model, bez, piece, rnd, type V3 } from './modelkit';
import { addPiece, chair, roundTable } from './pieces';

// ---------------------------------------------------------------------------------------------
// Amenity furniture and equipment: gym, spa, pool, restaurant, café, lobby, terrace, majlis.
// ORIGINAL geometry at real dimensions (m). Local frame: origin at the back-left corner, x → right,
// y → forward (away from the wall / toward the user), z up — same convention as pieces.ts.
// ---------------------------------------------------------------------------------------------

/** Cylinder lying along local x or y, centred at (x,y,z). */
function hcyl(m: Model, x: number, y: number, z: number, axis: 'x' | 'y', len: number, r: number, seg = 18) {
  m.push().move(x, y, z); if (axis === 'x') m.rotY(90); else m.rotX(-90); m.cyl(0, 0, -len / 2, len / 2, r, r, seg); return m.pop();
}
const bottle = (m: Model, x: number, y: number, z: number, h: number, mat: string) => m.mat(mat).lathe(x, y, [[0, z], [0.036, z], [0.038, z + h * 0.62], [0.016, z + h * 0.82], [0.013, z + h], [0, z + h]], 10);
const glass = (m: Model, x: number, y: number, z: number, kind: 'wine' | 'tumbler' | 'tea' = 'tumbler') => {
  if (kind === 'wine') m.mat('glass_clear').lathe(x, y, [[0, z], [0.035, z], [0.035, z + 0.004], [0.004, z + 0.008], [0.004, z + 0.09], [0.035, z + 0.13], [0.04, z + 0.19], [0, z + 0.19]], 12);
  else if (kind === 'tea') { m.mat('brass').lathe(x, y, [[0, z], [0.045, z], [0.045, z + 0.004], [0, z + 0.004]], 14); m.mat('glass_amber').lathe(x, y, [[0, z + 0.004], [0.018, z + 0.004], [0.026, z + 0.05], [0.02, z + 0.07], [0.026, z + 0.1], [0, z + 0.1]], 10); }
  else m.mat('glass_clear').lathe(x, y, [[0, z], [0.032, z], [0.036, z + 0.1], [0, z + 0.1]], 12);
};
const plate = (m: Model, x: number, y: number, z: number, r = 0.135) => m.mat('ceramic').lathe(x, y, [[0, z], [r * 0.55, z], [r * 0.62, z + 0.006], [r, z + 0.018], [r * 0.97, z + 0.02], [r * 0.6, z + 0.011], [0, z + 0.011]], 20);
const cup = (m: Model, x: number, y: number, z: number) => { m.mat('ceramic').lathe(x, y, [[0, z], [0.032, z], [0.042, z + 0.075], [0, z + 0.075]], 12); m.tube(bez([x + 0.04, y, z + 0.06], [x + 0.075, y, z + 0.045], [x + 0.038, y, z + 0.022], 4), 0.005, 5); };

// ------------------------------------------------------------------------------------ gym
export const treadmill = () => piece('treadmill', (m) => {
  const w = 0.86, l = 2.05;                                                  // console at y = 0, runner faces -y
  m.mat('equip_dark').box(0, 0.32, 0.0, w, l, 0.2, 0.03).box(0.04, 0, 0.0, w - 0.04, 0.44, 0.34, 0.06, { bs: 2 });   // frame stands on the floor (S23 SHD-01)
  m.mat('rubber').box(0.1, 0.44, 0.2, w - 0.1, l - 0.08, 0.214, 0.004);
  m.mat('steel_dark'); for (const x of [0.07, w - 0.07]) { m.tube([[x, 0.32, 0.3], [x, 0.16, 1.28]], 0.028, 10); m.tube([[x, 0.2, 1.05], [x, 0.78, 1.0], [x, 0.8, 0.95]], 0.02, 8); }
  m.at(w / 2, 0.16, 1.3, 0, () => { m.rotX(32); m.mat('equip_dark').box(-0.36, -0.1, -0.04, 0.36, 0.1, 0.04, 0.02); m.mat('tv_screen').box(-0.22, -0.07, 0.04, 0.22, 0.07, 0.043); });
  m.solid(0, 0, w, l, 0, 1.4);
});
export const spinBike = () => piece('spinbike', (m) => {                     // centred on x; rider faces -y
  m.mat('steel_dark').tube([[-0.28, 0.1, 0.035], [0.28, 0.1, 0.035]], 0.035, 8).tube([[-0.25, 1.0, 0.035], [0.25, 1.0, 0.035]], 0.035, 8);
  m.mat('equip_dark').tube([[0, 0.1, 0.06], [0, 0.35, 0.55], [0, 0.55, 0.62]], 0.04, 10).tube([[0, 1.0, 0.06], [0, 0.7, 0.55], [0, 0.62, 0.95]], 0.045, 10).tube([[0, 0.2, 0.4], [0, 0.2, 1.05]], 0.03, 8);
  m.tube([[-0.24, 0.14, 1.07], [-0.18, 0.22, 1.1], [0.18, 0.22, 1.1], [0.24, 0.14, 1.07]], 0.017, 8);
  m.mat('steel'); hcyl(m, 0, 0.35, 0.36, 'x', 0.06, 0.24, 26);
  m.mat('leather_black').box(-0.09, 0.6, 0.97, 0.09, 0.86, 1.03, 0.03, { crown: 0.01 });
  m.at(0, 0.15, 1.16, 0, () => { m.rotX(40); m.mat('tv_screen').box(-0.08, -0.05, 0, 0.08, 0.05, 0.012, 0.004); });
  m.solid(-0.3, 0, 0.3, 1.05, 0, 1.1);
});
export const powerRack = () => piece('powerrack', (m) => {
  const w = 1.25, d = 1.3, h = 2.3;
  m.mat('teak').box(-0.6, -0.5, 0, w + 0.6, d + 0.5, 0.03, 0.004);          // lifting platform: timber centre…
  m.mat('rubber').box(-0.6, -0.5, 0.03, -0.1, d + 0.5, 0.035).box(w + 0.1, -0.5, 0.03, w + 0.6, d + 0.5, 0.035);   // …rubber landing strips
  m.mat('steel_dark'); for (const [x, y] of [[0, 0], [w, 0], [0, d], [w, d]]) m.box(x - 0.04, y - 0.04, 0.03, x + 0.04, y + 0.04, h, 0.004);
  for (const y of [0, d]) m.box(-0.04, y - 0.03, h - 0.08, w + 0.04, y + 0.03, h, 0.003);
  for (const x of [0, w]) m.box(x - 0.03, -0.04, h - 0.08, x + 0.03, d + 0.04, h, 0.003).box(x - 0.03, -0.04, 0.03, x + 0.03, d + 0.04, 0.09, 0.003);
  m.mat('steel'); hcyl(m, w / 2, 0.1, 1.35, 'x', 2.2, 0.014, 10);
  for (const s of [-1, 1]) { m.mat('steel_dark'); for (const [o, r] of [[0.8, 0.225], [0.86, 0.17]] as [number, number][]) hcyl(m, w / 2 + s * o, 0.1, 1.35, 'x', 0.05, r, 28); }
  for (const s of [0, 1]) for (let i = 0; i < 3; i++) { m.mat('steel_dark'); hcyl(m, s ? w + 0.22 : -0.22, d - 0.1 - i * 0.07, 0.23, 'y', 0.05, 0.2, 24); }   // plates stored upright
  m.solid(-0.6, -0.5, w + 0.6, d + 0.5, 0, h);
});
export const dumbbellRack = (len = 1.8) => piece(`dbrack|${len}`, (m) => {
  m.mat('steel_dark');
  for (const x of [0.05, len / 2, len - 0.05]) { m.box(x - 0.03, 0, 0, x + 0.03, 0.06, 0.82, 0.003).box(x - 0.03, 0.38, 0, x + 0.03, 0.44, 0.56, 0.003).tube([[x, 0.03, 0.82], [x, 0.41, 0.56]], 0.02, 6); }
  m.box(0, 0.0, 0.76, len, 0.2, 0.78, 0.003).box(0, 0.24, 0.5, len, 0.44, 0.52, 0.003);
  const n = Math.floor(len / 0.3);
  for (let i = 0; i < n; i++) {
    const x = 0.15 + (i * (len - 0.3)) / Math.max(1, n - 1), r = 0.045 + i * 0.008;
    for (const [y, z] of [[0.1, 0.78], [0.34, 0.52]] as [number, number][]) { m.mat('steel'); hcyl(m, x, y, z + r, 'y', 0.16, 0.016, 8); m.mat('equip_dark'); for (const s of [-1, 1]) hcyl(m, x, y + s * 0.1, z + r, 'y', 0.05, r, 14); }
  }
  m.solid(0, 0, len, 0.46, 0, 0.9);
});
export const weightBench = () => piece('wbench', (m) => {                   // centred on x, length along y
  m.mat('steel_dark').box(-0.04, 0.05, 0, 0.04, 1.15, 0.06, 0.005).box(-0.25, 0.05, 0, 0.25, 0.12, 0.04, 0.005).box(-0.25, 1.08, 0, 0.25, 1.15, 0.04, 0.005);
  m.box(-0.03, 0.2, 0.06, 0.03, 0.26, 0.38).box(-0.03, 0.9, 0.06, 0.03, 0.96, 0.38);
  m.mat('leather_black').box(-0.14, 0.05, 0.38, 0.14, 0.45, 0.46, 0.03, { crown: 0.01 }).box(-0.14, 0.48, 0.38, 0.14, 1.2, 0.46, 0.03, { crown: 0.01 });
  m.solid(-0.26, 0, 0.26, 1.2, 0, 0.46);
});
export const kettlebellShelf = (n = 6) => piece(`kb|${n}`, (m) => {
  const L = n * 0.32;
  m.mat('teak').tex(true).box(0, 0, 0.16, L, 0.35, 0.2, 0.008).tex(); m.mat('steel_dark'); for (const x of [0.04, L - 0.04]) m.box(x - 0.03, 0.02, 0, x + 0.03, 0.33, 0.16);
  for (let i = 0; i < n; i++) { const s = 0.75 + i * 0.06, cx = 0.16 + i * 0.32; m.mat('equip_dark').ball(cx, 0.17, 0.2 + 0.1 * s, 0.1 * s, 0.1 * s, 0.1 * s, 12); m.tube(bez([cx - 0.06 * s, 0.17, 0.2 + 0.17 * s], [cx, 0.17, 0.2 + 0.33 * s], [cx + 0.06 * s, 0.17, 0.2 + 0.17 * s], 6), 0.014 * s, 6); }
  m.solid(0, 0, L, 0.35, 0, 0.5);
});
export const stretchZone = () => piece('stretch', (m) => {
  const mats = ['mat_sage', 'mat_sand', 'mat_slate'];
  for (let i = 0; i < 3; i++) m.mat(mats[i], { ns: true }).box(i * 0.85, 0, 0.002, i * 0.85 + 0.62, 1.83, 0.008, 0.003);
  m.mat('teak').tex(true).box(2.7, 0, 0, 3.4, 0.42, 0.04, 0.004).box(2.7, 0, 0.5, 3.4, 0.42, 0.53, 0.004).box(2.7, 0, 0.95, 3.4, 0.42, 0.98, 0.004).tex();
  m.mat('steel_dark').box(2.7, 0, 0, 2.73, 0.42, 0.98).box(3.37, 0, 0, 3.4, 0.42, 0.98);
  for (let i = 0; i < 3; i++) { m.mat(mats[i]); hcyl(m, 3.05, 0.1 + i * 0.12, 0.6, 'x', 0.6, 0.055, 14); }
  for (let i = 0; i < 2; i++) { m.mat('equip_dark'); hcyl(m, 3.05, 0.13 + i * 0.16, 0.12, 'x', 0.6, 0.07, 14); }
  m.mat('ball_grey').ball(3.15, 1.1, 0.33, 0.33, 0.33, 0.33, 18);
  m.solid(2.65, 0, 3.45, 0.45, 0, 1.0); m.solid(2.82, 0.77, 3.48, 1.43, 0, 0.66);
});
export const hydrationStation = () => piece('hydration', (m) => {
  m.mat('oak').tex(true).box(0, 0, 0, 1.2, 0.45, 0.9, 0.006).tex(); m.mat('stone_top').box(-0.01, 0, 0.9, 1.21, 0.47, 0.93, 0.003);
  m.mat('steel').box(0.1, 0.05, 0.93, 0.42, 0.38, 1.38, 0.02); m.mat('glass_clear').lathe(0.26, 0.21, [[0, 1.38], [0.13, 1.38], [0.14, 1.7], [0.05, 1.78], [0, 1.78]], 16);
  for (let i = 0; i < 4; i++) m.mat('towel').box(0.55, 0.06, 0.93 + i * 0.06, 1.1, 0.4, 0.99 + i * 0.06, 0.02, { crown: 0.005 });
  m.solid(0, 0, 1.2, 0.47, 0, 1.4);
});
export const lockers = (w: number, h = 2.1) => piece(`lockers|${w}|${h}`, (m) => {
  const d = 0.5; m.mat('kick_dark').box(0.01, 0.03, 0, w - 0.01, d - 0.05, 0.12); m.mat('carcass').box(0, 0, 0.12, w, d - 0.02, h);
  const cols = Math.max(1, Math.round(w / 0.4)), cw = w / cols, rows = 3, rh = (h - 0.12) / rows;
  for (let i = 0; i < cols; i++) for (let r = 0; r < rows; r++) {
    const x0 = i * cw, z0 = 0.12 + r * rh;
    m.mat('oak').tex(true).box(x0 + 0.0015, d - 0.02, z0 + 0.0015, x0 + cw - 0.0015, d, z0 + rh - 0.0015, 0.0015, { bs: 1 }).tex();
    m.mat('brass').box(x0 + cw - 0.075, d, z0 + rh * 0.5 - 0.05, x0 + cw - 0.06, d + 0.012, z0 + rh * 0.5 + 0.05, 0.002).box(x0 + cw / 2 - 0.03, d, z0 + rh - 0.09, x0 + cw / 2 + 0.03, d + 0.003, z0 + rh - 0.05);
  }
  m.solid(0, 0, w, d, 0, h);
});

// ------------------------------------------------------------------------------------ spa / pool
export const sauna = (w: number, d: number, h: number) => piece(`sauna|${w}|${d}|${h}`, (m) => {
  m.mat('cedar').tex(true).box(0, 0, 0, w, 0.05, h, 0.003).box(0, 0, 0, 0.05, d, h, 0.003).box(w - 0.05, 0, 0, w, d, h, 0.003).box(0, 0, h - 0.05, w, d, h, 0.003);
  for (const [y0, y1, z] of [[0.05, 0.62, 0.9], [0.62, 1.12, 0.46]] as number[][]) {
    for (let y = y0; y < y1 - 0.04; y += 0.1) m.box(0.06, y, z - 0.03, w - 0.06, y + 0.085, z, 0.004);
    for (const x of [0.12, w / 2, w - 0.12]) m.box(x - 0.03, y0, 0, x + 0.03, y0 + 0.06, z - 0.03);
  }
  m.tex();
  m.mat('led', { ns: true }).box(0.1, 0.6, 0.42, w - 0.1, 0.62, 0.43).box(0.1, 0.06, 0.86, w - 0.1, 0.08, 0.87);
  const hx = w - 0.42, hy = d - 0.62;
  m.mat('steel_dark').box(hx - 0.2, hy - 0.16, 0, hx + 0.2, hy + 0.16, 0.6, 0.01); m.mat('cedar').box(hx - 0.26, hy - 0.22, 0, hx + 0.26, hy - 0.18, 0.72).box(hx - 0.26, hy + 0.18, 0, hx + 0.26, hy + 0.22, 0.72);
  const r = rnd(7); for (let i = 0; i < 14; i++) m.mat('stone_grey').ball(hx + (r() - 0.5) * 0.3, hy + (r() - 0.5) * 0.24, 0.63 + r() * 0.04, 0.045, 0.04, 0.032, 6);
  m.mat('glass_clear', { ns: true }).box(0.05, d - 0.012, 0.02, w - 0.05, d, h - 0.05, 0.002);
  m.mat('cedar').box(w * 0.5, d - 0.05, 0, w * 0.5 + 0.05, d + 0.005, h - 0.05).tube([[w * 0.5 + 0.12, d + 0.005, 0.95], [w * 0.5 + 0.12, d + 0.04, 0.95], [w * 0.5 + 0.12, d + 0.04, 1.35], [w * 0.5 + 0.12, d + 0.005, 1.35]], 0.012, 6);
  m.mat('cedar').lathe(0.4, d - 0.4, [[0, 0.46], [0.13, 0.46], [0.15, 0.68], [0, 0.66]], 14);              // bucket on the low bench
  m.solid(0, 0, w, d, 0, h);
});
export const massageTable = () => piece('massage', (m) => {
  m.mat('cedar'); for (const [x, y] of [[0.08, 0.1], [0.62, 0.1], [0.08, 1.8], [0.62, 1.8]]) m.box(x - 0.025, y - 0.025, 0, x + 0.025, y + 0.025, 0.62);
  m.box(0.05, 0.08, 0.16, 0.65, 1.82, 0.19, 0.004);
  m.mat('leather_cream').box(0, 0, 0.62, 0.7, 1.9, 0.7, 0.035, { crown: 0.01 });
  m.mat('towel').box(0.02, 1.1, 0.7, 0.68, 1.75, 0.725, 0.015, { crown: 0.006 }); hcyl(m, 0.35, 0.22, 0.75, 'x', 0.5, 0.05, 14);
  for (let i = 0; i < 3; i++) m.mat('towel').box(0.12, 0.3, 0.19 + i * 0.05, 0.58, 0.7, 0.235 + i * 0.05, 0.02);
  m.solid(0, 0, 0.7, 1.9, 0, 0.75);
});
export const poolLounger = () => piece('poollounger', (m) => {
  const w = 0.72, l = 1.95;
  m.mat('steel'); for (const x of [0.03, w - 0.03]) m.tube([[x, 0.15, 0], [x, 0.15, 0.3], [x, l - 0.15, 0.3], [x, l - 0.15, 0]], 0.016, 8);
  m.mat('canvas').box(0.02, 0.6, 0.3, w - 0.02, l - 0.02, 0.36, 0.025, { crown: 0.01 });
  m.at(0, 0.62, 0.33, 0, () => { m.rotX(140); m.mat('canvas').box(0.02, 0, -0.06, w - 0.02, 0.66, 0, 0.025); });
  m.mat('towel').box(0.06, 1.05, 0.36, w - 0.06, 1.7, 0.385, 0.015, { crown: 0.006 }); hcyl(m, w / 2, 0.75, 0.62, 'x', w - 0.14, 0.055, 14);
  m.solid(0, 0, w, l, 0, 0.6);
});
export const sideTable = (top = 'teak', withGlass = true) => piece(`sidetable|${top}|${withGlass}`, (m) => {
  m.mat(top).lathe(0, 0, [[0, 0.47], [0.22, 0.47], [0.22, 0.5], [0, 0.5]], 22); m.mat('steel').tube([[0, 0, 0.47], [0, 0, 0.02]], 0.018, 8).lathe(0, 0, [[0, 0], [0.16, 0], [0.16, 0.02], [0, 0.02]], 16);
  if (withGlass) { glass(m, -0.06, 0.04, 0.5); m.mat('towel').box(0.0, -0.14, 0.5, 0.15, 0.0, 0.55, 0.015); }
  m.solid(-0.22, -0.22, 0.22, 0.22, 0, 0.5);
});
export const poolLadder = () => piece('poolladder', (m) => {
  m.mat('chrome'); for (const x of [0, 0.5]) m.tube([[x, -0.25, -1.0], [x, -0.06, -0.2], ...bez([x, -0.06, -0.2], [x, -0.06, 0.95], [x, 0.32, 0.8], 6), [x, 0.34, 0.05]], 0.022, 8);
  for (let i = 0; i < 3; i++) m.box(0, -0.2 + i * 0.05, -0.85 + i * 0.28, 0.5, -0.12 + i * 0.05, -0.83 + i * 0.28, 0.004);
});

// ------------------------------------------------------------------------------------ restaurant / café / bar
/** Round table with chairs and full place settings, centred on (0,0). */
export const tableSet = (r = 0.5, seats = 4, top = 'oak', fab = 'leather_tan', frame = 'oak', settings = true) => piece(`tset|${r}|${seats}|${top}|${fab}|${frame}|${settings}`, (m) => {
  addPiece(m, roundTable(r, 0.76, top));
  const ch = chair(fab, frame); let ex0 = -r, ex1 = r, ey0 = -r, ey1 = r;
  for (let i = 0; i < seats; i++) {
    const a = (i / seats) * Math.PI * 2 + Math.PI / 4, deg = (a * 180) / Math.PI + 90, Rc = r + 0.4;
    const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
    const ox = Rc * Math.cos(a) - (0.24 * c - 0.25 * s), oy = Rc * Math.sin(a) - (0.24 * s + 0.25 * c);
    m.at(ox, oy, 0, deg, () => addPiece(m, ch));
    const ccx = (r + 0.4) * Math.cos(a), ccy = (r + 0.4) * Math.sin(a); ex0 = Math.min(ex0, ccx - 0.35); ex1 = Math.max(ex1, ccx + 0.35); ey0 = Math.min(ey0, ccy - 0.35); ey1 = Math.max(ey1, ccy + 0.35);
    if (settings) {
      const px = (r - 0.17) * Math.cos(a), py = (r - 0.17) * Math.sin(a); plate(m, px, py, 0.76);
      m.at(px, py, 0.771, deg, () => { m.mat('linen_white').box(-0.06, -0.04, 0, 0.06, 0.04, 0.012, 0.004); });
      m.at(px, py, 0.76, deg, () => { m.mat('steel').box(0.15, -0.08, 0, 0.162, 0.1, 0.004).box(-0.165, -0.08, 0, -0.153, 0.1, 0.004); });
      glass(m, px + Math.cos(a + 0.7) * 0.18, py + Math.sin(a + 0.7) * 0.18, 0.76, 'wine');
    }
  }
  m.mat('glass_clear').lathe(0, 0, [[0, 0.76], [0.03, 0.76], [0.034, 0.86], [0.02, 0.9], [0, 0.9]], 12); m.mat('stem').tube(bez([0, 0, 0.8], [0.02, 0, 0.95], [0.05, 0.02, 1.05], 4), 0.003, 4);
  m.mat('leaf_dry').ball(0.05, 0.02, 1.06, 0.022, 0.022, 0.03, 6);
  m.solid(ex0, ey0, ex1, ey1, 0, 0.8);
});
/** Table for two in front of a banquette: one loose chair, the banquette takes the other side. Back of chair at y = 0. */
export const tableForTwo = (top = 'marble') => piece(`t2|${top}`, (m) => {
  m.mat(top).box(0, 0.6, 0.73, 0.75, 1.3, 0.76, 0.006); m.mat('black_metal').tube([[0.375, 0.95, 0.73], [0.375, 0.95, 0.02]], 0.03, 10).lathe(0.375, 0.95, [[0, 0], [0.24, 0], [0.24, 0.02], [0, 0.02]], 18);
  m.at(0.135, 0, 0, 0, () => addPiece(m, chair('fabric_taupe', 'oak')));
  plate(m, 0.375, 0.78, 0.76); plate(m, 0.375, 1.12, 0.76); glass(m, 0.56, 0.84, 0.76, 'wine'); glass(m, 0.2, 1.06, 0.76, 'wine');
  m.mat('candle').cyl(0.12, 0.95, 0.76, 0.82, 0.025, 0.025, 10);
  m.solid(0, 0, 0.75, 1.3, 0, 0.86);
});
export const banquette = (len: number, fab = 'velvet_olive') => piece(`banq|${len}|${fab}`, (m) => {
  m.mat('oak').box(0.03, 0.03, 0, len - 0.03, 0.56, 0.08, 0.004);
  m.mat(fab).box(0, 0, 0.08, len, 0.6, 0.45, 0.03, { crown: 0.02, sub: 6 });
  const n = Math.max(2, Math.round(len / 0.24)), cw = len / n;
  for (let i = 0; i < n; i++) m.box(i * cw + 0.004, 0.0, 0.45, (i + 1) * cw - 0.004, 0.15, 1.15, 0.035, { belly: 0.012, sub: 3 });
  m.mat('brass').box(0, 0.0, 1.15, len, 0.15, 1.17, 0.003);
  m.solid(0, 0, len, 0.62, 0, 1.17);
});
/** Counter with fluted front: staff side at y = 0, guests at y > d. */
export const barCounter = (len: number, h = 1.08, top = 'marble', front = 'oak') => piece(`bar|${len}|${h}|${top}|${front}`, (m) => {
  const d = 0.62;
  m.mat('kick_dark').box(0.02, 0.08, 0, len - 0.02, d, 0.1); m.mat('carcass').box(0, 0.05, 0.1, len, d, h - 0.04);
  m.mat(front, { ns: true }); for (let x = 0.01; x < len - 0.03; x += 0.045) m.box(x, d, 0.1, x + 0.035, d + 0.022, h - 0.04, 0.004);
  m.mat(top).box(-0.03, 0, h - 0.04, len + 0.03, d + 0.12, h, 0.004);
  m.mat('stone_top').box(0.02, 0.02, h - 0.3, len - 0.02, 0.4, h - 0.27);                                   // staff work shelf
  if (h > 1.05) { m.mat('brass').tube([[0.05, d + 0.17, 0.2], [len - 0.05, d + 0.17, 0.2]], 0.02, 8); for (let x = 0.3; x < len - 0.1; x += 0.9) m.tube([[x, d + 0.022, 0.2], [x, d + 0.17, 0.2]], 0.012, 6); }
  m.mat('led', { ns: true }).box(0.04, d + 0.023, 0.1, len - 0.04, d + 0.028, 0.115);
  m.solid(0, 0, len, d + 0.2, 0, h);
});
/** Back bar: base cupboards, stone top, mirror, glass shelves with bottles and under-shelf light. Wall at y = 0. */
export const backBar = (len: number, h = 2.4, bottles = true) => piece(`backbar|${len}|${h}|${bottles}`, (m) => {
  m.mat('kick_dark').box(0.02, 0.03, 0, len - 0.02, 0.38, 0.1); m.mat('carcass').box(0, 0, 0.1, len, 0.4, 0.9);
  const n = Math.max(1, Math.round(len / 0.5)), dw = len / n; m.mat('oak'); for (let i = 0; i < n; i++) m.box(i * dw + 0.0015, 0.38, 0.103, (i + 1) * dw - 0.0015, 0.4, 0.897, 0.0015, { bs: 1 });
  m.mat('marble').box(0, 0, 0.9, len, 0.43, 0.93, 0.003);
  m.mat('mirror', { ns: true }).box(0.02, 0, 0.93, len - 0.02, 0.012, h - 0.12);
  m.mat('oak').box(0, 0, h - 0.12, len, 0.3, h, 0.004);
  const r = rnd(len * 100); const mats = ['glass_amber', 'glass_green', 'glass_clear', 'glass_amber', 'glass_smoke'];
  for (const z of [1.32, 1.72]) {
    m.mat('glass_clear', { ns: true }).box(0.02, 0.012, z - 0.012, len - 0.02, 0.26, z); m.mat('led', { ns: true }).box(0.04, 0.2, z - 0.016, len - 0.04, 0.215, z - 0.012);
    if (bottles) for (let x = 0.08; x < len - 0.06; x += 0.1 + r() * 0.03) bottle(m, x, 0.12, z, 0.24 + r() * 0.08, mats[Math.floor(r() * mats.length)]);
  }
  if (bottles) for (let x = 0.1; x < len - 0.08; x += 0.14) bottle(m, x, 0.2, 0.93, 0.26 + r() * 0.06, mats[Math.floor(r() * mats.length)]);
  m.solid(0, 0, len, 0.43, 0, h);
});
export const espressoMachine = () => piece('espresso', (m) => {
  m.mat('steel').box(0, 0, 0, 0.78, 0.55, 0.42, 0.025).box(0.03, 0.05, 0.42, 0.75, 0.5, 0.47, 0.01);
  m.mat('brass').box(0.02, 0.548, 0.06, 0.76, 0.556, 0.4, 0.002);
  m.mat('steel_dark').box(0.06, 0.55, 0, 0.72, 0.8, 0.03, 0.004);
  for (const x of [0.22, 0.56]) { m.mat('steel').cyl(x, 0.6, 0.24, 0.31, 0.05, 0.045, 14); m.mat('black_metal').tube([[x, 0.6, 0.22], [x, 0.84, 0.21]], 0.014, 6); }
  m.mat('steel').tube(bez([0.72, 0.55, 0.36], [0.82, 0.62, 0.3], [0.8, 0.66, 0.08], 6), 0.007, 6);
  for (let i = 0; i < 6; i++) cup(m, 0.12 + i * 0.1, 0.27, 0.47);
  m.solid(0, 0, 0.78, 0.82, 0, 0.55);
});
export const grinder = () => piece('grinder', (m) => {
  m.mat('black_metal').box(-0.1, -0.12, 0, 0.1, 0.12, 0.38, 0.02); m.mat('glass_clear').lathe(0, 0, [[0.05, 0.38], [0.11, 0.55], [0, 0.55]], 14); m.mat('coffee').lathe(0, 0, [[0.05, 0.381], [0.09, 0.48], [0, 0.48]], 14);
  m.mat('steel').box(-0.05, 0.12, 0.12, 0.05, 0.16, 0.18);
});
export const pastryCase = (len = 1.2) => piece(`pastry|${len}`, (m) => {
  const d = 0.5, h = 0.5;
  m.mat('glass_clear', { ns: true }).box(0, 0, 0, len, d, 0.012).box(0, d - 0.01, 0, len, d, h).box(0, 0, h - 0.012, len, d, h).box(0, 0, 0, 0.01, d, h).box(len - 0.01, 0, 0, len, d, h).box(0.01, 0.02, 0.24, len - 0.01, d - 0.02, 0.25);
  m.mat('led', { ns: true }).box(0.02, 0.05, h - 0.02, len - 0.02, 0.07, h - 0.013);
  const r = rnd(5);
  for (const z of [0.012, 0.25]) for (let x = 0.08; x < len - 0.06; x += 0.16) { plate(m, x, d * 0.5, z, 0.07); for (let k = 0; k < 2; k++) m.mat(r() > 0.5 ? 'pastry' : 'pastry_light').ball(x + (k - 0.5) * 0.05, d * 0.5 + (r() - 0.5) * 0.04, z + 0.035, 0.035, 0.03, 0.022, 8); }
  m.solid(0, 0, len, d, 0, h);
});
export const menuBoard = (w = 1.4, h = 0.9) => piece(`menu|${w}|${h}`, (m) => {
  m.mat('oak').box(0, 0, 0, w, 0.03, h, 0.004); m.mat('board_dark', { ns: true }).box(0.04, 0.03, 0.04, w - 0.04, 0.034, h - 0.04);
  const r = rnd(3); m.mat('chalk', { ns: true });
  m.box(0.12, 0.034, h - 0.16, w * 0.55, 0.036, h - 0.12);
  for (let i = 0; i < 6; i++) { const z = h - 0.26 - i * 0.09; m.box(0.12, 0.034, z, 0.12 + (0.35 + r() * 0.3) * (w - 0.5), 0.036, z + 0.025).box(w - 0.3, 0.034, z, w - 0.14, 0.036, z + 0.025); }
});

// ------------------------------------------------------------------------------------ lobby
export const receptionDesk = (len = 3.0) => piece(`reception|${len}`, (m) => {
  const d = 0.78, h = 1.08;
  m.mat('kick_dark').box(0.05, 0.1, 0, len - 0.05, d - 0.04, 0.12); m.mat('carcass').box(0, 0, 0.12, len, d, h - 0.05);
  m.mat('oak', { ns: true }); for (let x = 0.01; x < len - 0.03; x += 0.05) m.box(x, d, 0.12, x + 0.04, d + 0.025, h - 0.05, 0.005);
  m.mat('marble').box(-0.04, d - 0.32, h - 0.05, len + 0.04, d + 0.08, h, 0.004).box(-0.04, 0, 0.72, 0.04, d + 0.08, h, 0.003).box(len - 0.04, 0, 0.72, len + 0.04, d + 0.08, h, 0.003);
  m.mat('stone_top').box(0.04, 0.02, 0.72, len - 0.04, d - 0.32, 0.75);
  m.mat('brass').box(0, d + 0.025, 0.95, len, d + 0.03, 0.965);
  for (const x of [len * 0.3, len * 0.7]) { m.mat('black_metal').box(x - 0.04, 0.12, 0.75, x + 0.04, 0.2, 1.02).box(x - 0.27, 0.18, 1.02, x + 0.27, 0.21, 1.34, 0.004); m.mat('tv_screen').box(x - 0.25, 0.21, 1.04, x + 0.25, 0.212, 1.32); }
  m.mat('ceramic_sand').lathe(len * 0.5, d - 0.12, [[0, h], [0.06, h], [0.08, h + 0.12], [0.04, h + 0.24], [0.045, h + 0.27], [0, h + 0.27]], 16);
  for (let i = 0; i < 5; i++) { const a = i * 1.25; m.mat('stem').tube(bez([len * 0.5, d - 0.12, h + 0.24], [len * 0.5 + Math.cos(a) * 0.05, d - 0.12 + Math.sin(a) * 0.05, h + 0.55], [len * 0.5 + Math.cos(a) * 0.22, d - 0.12 + Math.sin(a) * 0.22, h + 0.62], 5), 0.003, 4); m.mat('leaf').ball(len * 0.5 + Math.cos(a) * 0.22, d - 0.12 + Math.sin(a) * 0.22, h + 0.63, 0.05, 0.05, 0.02, 7); }
  m.solid(0, 0, len, d + 0.08, 0, h);
});
/** Fluted timber feature wall with a brass name band and LED wash. Wall at y = 0. */
export const featureWall = (w: number, h: number) => piece(`fwall|${w}|${h}`, (m) => {
  m.mat('carcass').box(0, 0, 0, w, 0.012, h);
  m.mat('oak', { ns: true }); for (let x = 0.004; x < w - 0.03; x += 0.046) m.box(x, 0.012, 0.0, x + 0.034, 0.03, h);
  m.mat('brass').box(w * 0.2, 0.03, h * 0.58, w * 0.8, 0.045, h * 0.58 + 0.12, 0.004);
  m.mat('led', { ns: true }).box(0.05, 0.03, h - 0.04, w - 0.05, 0.05, h - 0.02);
});
export const mailboxes = (w = 3.0, h = 1.5) => piece(`mail|${w}|${h}`, (m) => {
  const d = 0.32; m.mat('carcass').box(0, 0, 0, w, d - 0.01, h);
  const cols = Math.round(w / 0.3), rows = Math.round(h / 0.3), cw = w / cols, rh = h / rows;
  for (let i = 0; i < cols; i++) for (let r = 0; r < rows; r++) { const x0 = i * cw, z0 = r * rh; m.mat('bronze').box(x0 + 0.002, d - 0.012, z0 + 0.002, x0 + cw - 0.002, d, z0 + rh - 0.002, 0.002); m.mat('gap_dark').box(x0 + 0.05, d, z0 + rh - 0.06, x0 + cw - 0.05, d + 0.002, z0 + rh - 0.05); m.mat('steel').box(x0 + cw - 0.05, d, z0 + 0.06, x0 + cw - 0.04, d + 0.008, z0 + 0.1); }
  m.solid(0, 0, w, d, 0, h);
});

// ------------------------------------------------------------------------------------ terrace / majlis
export const lantern = (h = 0.5) => piece(`lantern|${h}`, (m) => {
  m.mat('black_metal').lathe(0, 0, [[0, 0], [0.11, 0], [0.11, 0.03], [0.09, 0.04], [0, 0.04]], 14).lathe(0, 0, [[0.09, h - 0.06], [0.11, h - 0.04], [0.05, h], [0, h]], 14);
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.78; m.tube([[Math.cos(a) * 0.095, Math.sin(a) * 0.095, 0.04], [Math.cos(a) * 0.095, Math.sin(a) * 0.095, h - 0.05]], 0.006, 5); }
  m.tube(bez([-0.04, 0, h], [0, 0, h + 0.1], [0.04, 0, h], 6), 0.007, 6);
  m.mat('glass_clear', { ns: true }).lathe(0, 0, [[0.085, 0.04], [0.085, h - 0.06]], 14);
  m.mat('candle').cyl(0, 0, 0.04, 0.16, 0.035, 0.035, 10);
  m.solid(-0.11, -0.11, 0.11, 0.11, 0, h);
});
/** Low majlis seating: platform, seat cushion, back cushions and end bolsters. Back at y = 0, facing +y. */
export const majlis = (len: number, depth = 0.85) => piece(`majlis|${len}|${depth}`, (m) => {
  m.mat('teak').tex(true).box(0, 0, 0, len, depth, 0.16, 0.008).tex();
  m.mat('linen_sand').box(0.02, 0.02, 0.16, len - 0.02, depth - 0.02, 0.29, 0.035, { crown: 0.018, sub: 6 });
  const n = Math.max(2, Math.round(len / 0.7)), cw = (len - 0.1) / n; const cols = ['velvet_rust', 'linen_sand', 'velvet_olive', 'kilim'];
  for (let i = 0; i < n; i++) m.mat(cols[i % 2 ? 1 : 0]).at(0.05 + cw * (i + 0.5), 0.12, 0.48, 0, () => { m.rotX(-72); m.pillow(cw - 0.04, 0.4, 0.18, 7); });
  for (let i = 0; i < Math.max(1, n - 1); i++) m.mat(cols[2 + (i % 2)]).at(0.2 + cw * (i + 0.8), 0.3, 0.42, (i % 2 ? 1 : -1) * 12, () => { m.rotX(-58); m.pillow(0.4, 0.4, 0.13, 6); });
  for (const x of [0.12, len - 0.12]) { m.mat('velvet_rust'); hcyl(m, x, depth * 0.5, 0.39, 'y', depth - 0.1, 0.1, 16); }
  m.solid(0, 0, len, depth, 0, 0.6);
});
/** Brass tray table with tea glasses (centred). */
export const trayTable = (r = 0.42) => piece(`tray|${r}`, (m) => {
  m.mat('teak'); for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.78; m.tube([[Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 0], [Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, 0.36]], 0.018, 6); }
  m.mat('brass').lathe(0, 0, [[0, 0.36], [r, 0.36], [r + 0.01, 0.385], [r - 0.005, 0.385], [r - 0.01, 0.37], [0, 0.37]], 32);
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; glass(m, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0.37, 'tea'); }
  m.mat('brass').lathe(0, 0, [[0, 0.37], [0.07, 0.37], [0.085, 0.43], [0.06, 0.5], [0.03, 0.52], [0.045, 0.56], [0, 0.57]], 14);
  m.solid(-r, -r, r, r, 0, 0.4);
});
/** Water pipe (shisha) — shown only on the separate, conditional terrace; smoke-free presentation (no smoke, no coals). */
export const shisha = () => piece('shisha', (m) => {
  m.mat('glass_smoke').lathe(0, 0, [[0, 0], [0.09, 0], [0.12, 0.08], [0.11, 0.18], [0.05, 0.25], [0.035, 0.27], [0, 0.27]], 18);
  m.mat('brass').lathe(0, 0, [[0.03, 0.26], [0.045, 0.28], [0.03, 0.31], [0.022, 0.31]], 12).tube([[0, 0, 0.3], [0, 0, 0.66]], 0.018, 10);
  for (const z of [0.38, 0.5]) m.lathe(0, 0, [[0.02, z], [0.05, z + 0.01], [0.02, z + 0.025]], 12);
  m.lathe(0, 0, [[0, 0.6], [0.09, 0.6], [0.09, 0.606], [0, 0.606]], 16);
  m.mat('ceramic_dark').lathe(0, 0, [[0.015, 0.606], [0.045, 0.63], [0.05, 0.68], [0.04, 0.68], [0, 0.66]], 12);
  const hose: V3[] = [[0.02, 0, 0.45], [0.12, 0.02, 0.42], [0.2, 0.08, 0.2], [0.22, 0.18, 0.04], [0.32, 0.26, 0.03], [0.42, 0.3, 0.1], [0.45, 0.3, 0.3]];
  m.mat('leather_black').tube(hose, 0.014, 8); m.mat('brass').tube([[0.45, 0.3, 0.3], [0.45, 0.3, 0.42]], 0.012, 8);
  m.solid(-0.13, -0.13, 0.13, 0.13, 0, 0.7);
});
export const outdoorDining = (r = 0.45) => tableSet(r, 4, 'teak', 'fabric_outdoor', 'teak', false);

/** V11.5: festoon string under the terrace pergola: a sagging black cable with warm globe bulbs (each bulb is a light in Cycles). Local x along the run, z = 0 at the fixing height. */
export const festoonCable = (len: number, sag = 0.28) => piece(`festoon|${len}|${sag}`, (m) => {
  const pts: [number, number, number][] = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([t * len, 0, -sag * 4 * t * (1 - t)]); }
  m.mat('black_metal').tube(pts, 0.004, 5, 0.004, false);
});
export const festoonBulb = () => piece('festoon_bulb', (m) => {
  m.mat('black_metal').cyl(0, 0, -0.035, 0, 0.012, 0.012, 8);
  m.mat('led', { ns: true }).lathe(0, 0, [[0, -0.035], [0.022, -0.042], [0.03, -0.06], [0.022, -0.08], [0, -0.085]], 10);
});

/** V11.5: NAKHLA palm emblem in brushed bronze (trunk + seven fronds), drawn in the x–z plane, about 1.1 m tall at s = 1.
 *  Used on the entrance monolith and on the lobby wall behind reception. */
export const palmEmblem = (s = 1) => piece(`emblem|${s}`, (m) => {
  const top: V3 = [0.04 * s, 0, 0.62 * s];
  m.mat('brass').tube(bez([0, 0, 0], [0.05 * s, 0, 0.3 * s], top, 8), 0.024 * s, 8, 0.018 * s);
  for (const [a, L] of [[-78, 0.44], [-50, 0.48], [-24, 0.46], [0, 0.42], [24, 0.46], [50, 0.48], [78, 0.44]] as [number, number][]) {
    const r = (a * Math.PI) / 180; const dx = Math.sin(r), dz = Math.cos(r); const len = L * s;
    const mid: V3 = [top[0] + dx * len * 0.55, 0, top[2] + dz * len * 0.55 + 0.06 * s];
    const tip: V3 = [top[0] + dx * len, 0, top[2] + dz * len - (Math.abs(a) > 40 ? 0.16 : 0.04) * s];
    m.tube(bez(top, mid, tip, 10), 0.016 * s, 6, 0.003 * s);
  }
  m.cyl(top[0] - 0.05 * s, 0, top[2] - 0.06 * s, top[2] - 0.0, 0.03 * s, 0.03 * s, 8).cyl(top[0] + 0.05 * s, 0, top[2] - 0.07 * s, top[2] - 0.01 * s, 0.028 * s, 0.028 * s, 8);   // date clusters
});
