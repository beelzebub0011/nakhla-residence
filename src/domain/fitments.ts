import { Model, bez, piece, type V3 } from './modelkit';
import { stool } from './pieces';
import { addPiece } from './pieces';

// ---------------------------------------------------------------------------------------------
// Fixed joinery, kitchens, sanitaryware and fittings. ORIGINAL geometry, real dimensions (m).
// Local frame: origin at the back-left corner on the wall, x → right along the wall, y → into the
// room, z up. Cabinet fronts are separate panels with real 3 mm joints; handles, taps, appliances,
// basins and glass are modelled, not textured.
// ---------------------------------------------------------------------------------------------

const FRONT = 'kitchen.cabinet_fronts', TOP = 'kitchen.countertop';

/** Row of cabinet fronts between x0..x1 with 3 mm joints. rows = horizontal splits (drawers). */
function fronts(m: Model, x0: number, x1: number, y: number, z0: number, z1: number, modW: number, surf: string | undefined, rows = 1, t = 0.019) {
  const n = Math.max(1, Math.round((x1 - x0) / modW)), w = (x1 - x0) / n, rh = (z1 - z0) / rows;
  m.mat('laminate', { surf });
  for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) m.box(x0 + i * w + 0.0015, y, z0 + r * rh + 0.0015, x0 + (i + 1) * w - 0.0015, y + t, z0 + (r + 1) * rh - 0.0015, 0.0012, { bs: 1 });
  return { n, w };
}
function barHandle(m: Model, x: number, y: number, z0: number, z1: number, mat = 'brass') {
  m.mat(mat).tube([[x, y, z0], [x, y + 0.03, z0 + 0.012], [x, y + 0.03, z1 - 0.012], [x, y, z1]], 0.0055, 6);
}
function tap(m: Model, x: number, y: number, z: number, mat = 'chrome', h = 0.34, reach = 0.2) {
  m.mat(mat).cyl(x, y, z, z + 0.035, 0.024, 0.02, 14);
  m.tube([[x, y, z + 0.03], [x, y, z + h * 0.72], ...bez([x, y, z + h * 0.72], [x, y, z + h * 1.06], [x, y + reach * 0.62, z + h], 6), [x, y + reach, z + h * 0.82]], 0.011, 10);
  m.tube([[x + 0.022, y, z + 0.05], [x + 0.075, y + 0.01, z + 0.075]], 0.006, 6);
}

export interface KitchenOpts { wall?: boolean; tall?: 'start' | 'end'; hob?: number; sink?: number; clear?: number }
/** Straight kitchen run: handleless base units with a recessed grip rail, stone worktop + full-height splashback,
 *  wall units with under-cabinet light, optional oven/fridge tower, induction hob with hood, undermount sink with tap. */
export const kitchenRun = (len: number, o: KitchenOpts = {}) => piece(`krun|${len}|${JSON.stringify(o)}`, (m) => {
  const d = 0.6, clear = o.clear ?? 2.7, tallW = o.tall ? 1.24 : 0;
  const b0 = o.tall === 'start' ? tallW : 0, b1 = o.tall === 'end' ? len - tallW : len;
  // base units
  m.mat('kick_dark').box(b0 + 0.01, 0.04, 0, b1 - 0.01, d - 0.07, 0.1);
  m.mat('carcass').box(b0, 0, 0.1, b1, d - 0.02, 0.87);
  m.mat('black_metal').box(b0, d - 0.045, 0.832, b1, d - 0.02, 0.87); // recessed grip rail
  const hob = o.hob, sink = o.sink;
  const segs: [number, number, number][] = []; // x0,x1,rows
  let x = b0; const cuts = [hob !== undefined ? [hob, hob + 0.6, 3] : null, sink !== undefined ? [sink - 0.3, sink + 0.3, 1] : null].filter(Boolean).sort((a, b) => a![0] - b![0]) as number[][];
  for (const c of cuts) { if (c[0] > x + 0.05) segs.push([x, c[0], 1]); segs.push([c[0], c[1], c[2]]); x = c[1]; }
  if (b1 > x + 0.05) segs.push([x, b1, 1]);
  segs.forEach((s, i) => fronts(m, s[0], s[1], d - 0.02, 0.103, 0.829, 0.6, FRONT, i === 0 && s[2] === 1 && s[1] - s[0] < 1.3 ? 3 : s[2]));
  // worktop (with a real opening for the sink) + splashback
  m.mat('stone_top', { surf: TOP });
  if (sink !== undefined) {
    const s0 = sink - 0.26, s1 = sink + 0.26, f0 = 0.1, f1 = 0.5;
    m.box(b0, 0, 0.87, s0, d + 0.02, 0.9, 0.003).box(s1, 0, 0.87, b1, d + 0.02, 0.9, 0.003).box(s0, 0, 0.87, s1, f0, 0.9).box(s0, f1, 0.87, s1, d + 0.02, 0.9, 0.003);
    m.mat('steel').box(s0, f0, 0.68, s1, f1, 0.69).box(s0 - 0.004, f0 - 0.004, 0.69, s0, f1 + 0.004, 0.872).box(s1, f0 - 0.004, 0.69, s1 + 0.004, f1 + 0.004, 0.872).box(s0, f0 - 0.004, 0.69, s1, f0, 0.872).box(s0, f1, 0.69, s1, f1 + 0.004, 0.872);
    m.cyl(sink, (f0 + f1) / 2, 0.69, 0.693, 0.03, 0.03, 12);
    tap(m, sink, 0.055, 0.9, 'chrome', 0.36, 0.22);
    m.mat('ceramic_sand').lathe(s1 + 0.12, 0.1, [[0, 0.9], [0.032, 0.9], [0.034, 1.02], [0.016, 1.05], [0.012, 1.09], [0, 1.09]], 12);
  } else m.box(b0, 0, 0.87, b1, d + 0.02, 0.9, 0.003);
  m.mat('stone_top', { surf: TOP, ns: true }).box(b0, 0, 0.9, b1, 0.014, 1.45);
  if (hob !== undefined) {
    m.mat('glass_black').box(hob + 0.02, 0.06, 0.9, hob + 0.58, 0.55, 0.905, 0.003);
    m.mat('hob_ring'); for (const [hx, hy, hr] of [[0.17, 0.2, 0.085], [0.43, 0.2, 0.07], [0.17, 0.42, 0.07], [0.43, 0.42, 0.1]]) m.lathe(hob + hx, hy, [[hr, 0.9056], [hr - 0.004, 0.9056]], 26);
    if (o.wall !== false) m.mat('steel').box(hob, 0.02, 1.4, hob + 0.6, 0.36, 1.452, 0.003);
    m.mat('black_metal').lathe(hob - 0.25, 0.2, [[0, 0.9], [0.09, 0.9], [0.1, 1.0], [0.094, 1.0], [0.085, 0.912], [0, 0.912]], 18); // pan
    m.tube([[hob - 0.16, 0.2, 0.99], [hob - 0.02, 0.26, 0.995]], 0.008, 6);
  }
  // wall units
  if (o.wall !== false) {
    m.mat('carcass').box(b0, 0, 1.45, b1, 0.33, 2.25);
    fronts(m, b0, b1, 0.33, 1.452, 2.248, 0.6, FRONT);
    m.mat('led').box(b0 + 0.04, 0.26, 1.444, b1 - 0.04, 0.285, 1.45);
    m.mat('wallcore').box(b0, 0, 2.25, b1, 0.34, clear);
  }
  // oven + fridge tower
  if (o.tall) {
    const t0 = o.tall === 'start' ? 0 : len - tallW, w = tallW / 2;
    m.mat('kick_dark').box(t0 + 0.01, 0.04, 0, t0 + tallW - 0.01, d - 0.07, 0.1);
    m.mat('carcass').box(t0, 0, 0.1, t0 + tallW, d - 0.02, 2.25);
    m.mat('wallcore').box(t0, 0, 2.25, t0 + tallW, d, clear);
    // fridge-freezer: two tall doors
    fronts(m, t0, t0 + w, d - 0.02, 0.103, 0.78, w, FRONT); fronts(m, t0, t0 + w, d - 0.02, 0.783, 2.248, w, FRONT);
    barHandle(m, t0 + w - 0.045, d, 0.86, 1.5, 'black_metal'); barHandle(m, t0 + w - 0.045, d, 0.38, 0.72, 'black_metal');
    // oven tower
    const ox = t0 + w;
    fronts(m, ox, ox + w, d - 0.02, 0.103, 0.6, w, FRONT); fronts(m, ox, ox + w, d - 0.02, 1.66, 2.248, w, FRONT);
    for (const [z0, z1] of [[0.605, 1.2], [1.205, 1.655]]) {
      m.mat('glass_black').box(ox + 0.004, d - 0.02, z0, ox + w - 0.004, d + 0.004, z1, 0.003);
      m.mat('steel').box(ox + 0.004, d + 0.004, z1 - 0.075, ox + w - 0.004, d + 0.006, z1 - 0.004);
      m.mat('tv_screen').box(ox + w / 2 - 0.07, d + 0.006, z1 - 0.058, ox + w / 2 + 0.07, d + 0.0065, z1 - 0.022);
      m.mat('steel').tube([[ox + 0.06, d + 0.004, z1 - 0.12], [ox + 0.06, d + 0.04, z1 - 0.12], [ox + w - 0.06, d + 0.04, z1 - 0.12], [ox + w - 0.06, d + 0.004, z1 - 0.12]], 0.007, 6);
    }
  }
  m.solid(0, 0, len, d + 0.02, 0, 2.25);
});

/** Island: stone waterfall ends, panelled kitchen side, fluted timber seating side, three stools, styling. */
export const island = (w = 2.4, d = 0.95, stools = 3) => piece(`island|${w}|${d}|${stools}`, (m) => {
  const body = d - 0.3;
  m.mat('kick_dark').box(0.06, 0.05, 0, w - 0.06, body - 0.02, 0.1);
  m.mat('carcass').box(0.04, 0.02, 0.1, w - 0.04, body, 0.87);
  m.mat('black_metal').box(0.04, 0.0, 0.832, w - 0.04, 0.02, 0.87);
  fronts(m, 0.04, w - 0.04, 0, 0.103, 0.829, 0.6, FRONT, 1, 0.02);
  m.mat('oak', { ns: true }).tex(false, 1); for (let x = 0.045; x < w - 0.06; x += 0.03) m.box(x, body, 0.02, x + 0.02, body + 0.016, 0.868);
  m.mat('stone_top', { surf: TOP }).box(-0.005, -0.02, 0.87, w + 0.005, d + 0.02, 0.91, 0.003).box(-0.005, -0.02, 0, 0.035, d + 0.02, 0.87, 0.003).box(w - 0.035, -0.02, 0, w + 0.005, d + 0.02, 0.87, 0.003);
  // styling: board, bowl of fruit, vase
  m.mat('oak').tex(true).box(w * 0.2, 0.2, 0.91, w * 0.2 + 0.42, 0.46, 0.928, 0.006).tex();
  m.mat('ceramic_dark').lathe(w * 0.62, body * 0.5, [[0, 0.91], [0.08, 0.91], [0.16, 0.975], [0.172, 0.99], [0.16, 0.99], [0.08, 0.925], [0, 0.922]], 22);
  for (let i = 0; i < 5; i++) { const a = i * 1.257; m.mat(i % 2 ? 'fruit_g' : 'fruit_y').ball(w * 0.62 + (i ? Math.cos(a) * 0.07 : 0), body * 0.5 + (i ? Math.sin(a) * 0.07 : 0), 0.965 + (i ? 0 : 0.035), 0.036, 0.036, 0.034, 10); }
  m.mat('glass_clear').lathe(w * 0.86, body * 0.4, [[0, 0.91], [0.045, 0.91], [0.05, 1.12], [0.03, 1.2], [0.034, 1.24], [0.028, 1.24], [0.024, 1.2], [0.044, 1.12], [0.04, 0.92]], 16);
  for (let i = 0; i < 4; i++) { const a = i * 1.7; m.mat('stem').tube(bez([w * 0.86, body * 0.4, 0.95], [w * 0.86 + Math.cos(a) * 0.03, body * 0.4 + Math.sin(a) * 0.03, 1.4], [w * 0.86 + Math.cos(a) * 0.2, body * 0.4 + Math.sin(a) * 0.2, 1.52 + i * 0.05], 5), 0.003, 5); m.mat('leaf').ball(w * 0.86 + Math.cos(a) * 0.2, body * 0.4 + Math.sin(a) * 0.2, 1.53 + i * 0.05, 0.035, 0.035, 0.02, 7); }
  const st = stool();
  for (let i = 0; i < stools; i++) m.at(w * (i + 0.5) / stools, d + 0.14, 0, 0, () => addPiece(m, st));
  m.solid(0, -0.02, w, d + 0.34, 0, 0.91);
});

/** Wall-hung WC with soft-close seat and flush plate. */
export const wc = () => piece('wc', (m) => {
  const cx = 0.19, cy = 0.31;
  m.mat('ceramic').box(0.03, 0, 0.11, 0.35, 0.16, 0.41, 0.03);
  m.lathe(cx, cy, [[0, 0.1], [0.11, 0.1], [0.16, 0.2], [0.178, 0.34], [0.18, 0.4], [0.168, 0.405], [0.15, 0.36], [0.1, 0.24], [0, 0.22]], 26, 1.5);
  m.lathe(cx, cy, [[0.182, 0.405], [0.184, 0.42], [0.176, 0.432], [0, 0.436]], 26, 1.5);
  m.mat('chrome_matte').box(0.07, 0, 0.98, 0.31, 0.012, 1.13, 0.004); m.mat('chrome').push().move(0.14, 0.012, 1.055).rotX(-90).cyl(0, 0, 0, 0.004, 0.028, 0.028, 16).cyl(0.1, 0, 0, 0.004, 0.02, 0.02, 16).pop();
  m.solid(0, 0, 0.38, 0.6, 0, 0.44);
});

/** Floating vanity: drawer fronts with joints, stone top, vessel basin(s), wall taps, backlit mirror, towels. */
export const vanity = (w: number, topSurf = 'bathroom.vanity', basins = 1, bodySurf = 'living.feature_panel') => piece(`vanity|${w}|${topSurf}|${basins}|${bodySurf}`, (m) => {
  const d = 0.5;
  m.mat('carcass').box(0.004, 0, 0.42, w - 0.004, d - 0.02, 0.82);
  const n = Math.max(1, Math.round(w / 0.8)), fw = w / n;
  m.mat('oak', { surf: bodySurf }).tex(true);
  for (let i = 0; i < n; i++) for (const [z0, z1] of [[0.42, 0.615], [0.618, 0.818]]) m.box(i * fw + 0.0015, d - 0.02, z0, (i + 1) * fw - 0.0015, d, z1, 0.0015, { bs: 1 });
  m.tex().box(0, 0, 0.42, 0.018, d - 0.02, 0.82).box(w - 0.018, 0, 0.42, w, d - 0.02, 0.82);
  m.mat('black_metal'); for (let i = 0; i < n; i++) for (const z of [0.59, 0.79]) m.box(i * fw + fw / 2 - 0.09, d, z, i * fw + fw / 2 + 0.09, d + 0.011, z + 0.009, 0.002);
  m.mat('stone_top', { surf: topSurf }).box(-0.006, 0, 0.82, w + 0.006, d + 0.012, 0.86, 0.003).box(-0.006, 0, 0.86, w + 0.006, 0.014, 0.96);
  for (let i = 0; i < basins; i++) {
    const x = (w * (i + 0.5)) / basins;
    m.mat('ceramic').lathe(x, 0.27, [[0, 0.86], [0.12, 0.86], [0.2, 0.955], [0.208, 0.985], [0.198, 0.985], [0.186, 0.955], [0.11, 0.885], [0, 0.878]], 28, 0.86);
    m.mat('brass').push().move(x, 0, 1.13).rotX(-90).cyl(0, 0, 0, 0.008, 0.028, 0.028, 16).pop();
    m.tube([[x, 0.006, 1.13], [x, 0.17, 1.13], [x, 0.185, 1.115]], 0.0095, 8);
    m.push().move(x + 0.11, 0, 1.13).rotX(-90).cyl(0, 0, 0, 0.008, 0.024, 0.024, 16).pop(); m.tube([[x + 0.11, 0.006, 1.13], [x + 0.11, 0.045, 1.13], [x + 0.15, 0.05, 1.13]], 0.006, 6);
  }
  // backlit mirror
  m.mat('led', { ns: true }).box(0.045, 0.004, 1.085, w - 0.045, 0.02, 1.975, 0.004);
  m.mat('mirror', { ns: true }).box(0.06, 0.02, 1.1, w - 0.06, 0.026, 1.96, 0.003);
  // styling
  m.mat('ceramic_sand').lathe(w - 0.14, 0.14, [[0, 0.86], [0.03, 0.86], [0.032, 0.97], [0.012, 1.0], [0.01, 1.03], [0, 1.03]], 12);
  m.mat('glass_clear').lathe(0.13, 0.13, [[0, 0.86], [0.034, 0.86], [0.036, 0.96], [0.032, 0.96], [0.03, 0.87]], 12);
  m.mat('towel').box(0.1, 0.06, 0.24, w * 0.45, d - 0.1, 0.3, 0.02, { crown: 0.006 }).box(0.11, 0.07, 0.3, w * 0.45 - 0.01, d - 0.11, 0.355, 0.02, { crown: 0.006 });
  m.mat('oak', { surf: bodySurf }).tex(true).box(0.02, 0.02, 0.215, w - 0.02, d - 0.04, 0.24, 0.003).tex();
  m.mat('black_metal'); for (const x of [0.03, w - 0.03]) m.tube([[x, 0.03, 0.42], [x, 0.03, 0.228]], 0.007, 6).tube([[x, d - 0.06, 0.42], [x, d - 0.06, 0.228]], 0.007, 6);
  m.solid(0, 0, w, d, 0.2, 1.0);
});

/** Built-in bath with a sculpted basin, tiled-in rim and deck-mounted filler. */
export const bathtub = (w: number, l = 0.82, surf?: string) => piece(`tub|${w}|${l}|${surf}`, (m) => {
  const H = 0.56, rx = w / 2 - 0.07, ry = l / 2 - 0.07, cx = w / 2, cy = l / 2;
  m.mat('ceramic').box(0, l - 0.03, 0, w, l, H - 0.004, 0.004);
  m.sheet(56, 1, (u, v) => { // rim: from basin ellipse out to the rectangular edge
    const a = u * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const k = 1 / Math.max(Math.abs(c) / (w / 2), Math.abs(s) / (l / 2));
    const ex = cx + c * rx, ey = cy + s * ry, ox = cx + c * k, oy = cy + s * k; return [ex + (ox - ex) * v, ey + (oy - ey) * v, H];
  }, { su: 1, sv: 1 });
  m.lathe(cx, cy, [[rx, H], [rx - 0.012, H - 0.02], [rx - 0.05, 0.3], [rx - 0.13, 0.14], [rx - 0.3, 0.1], [0, 0.095]], 44, ry / rx);
  m.mat('chrome').cyl(cx, cy, 0.096, 0.1, 0.025, 0.025, 12);
  m.mat('brass'); m.cyl(0.2, 0.05, H, H + 0.03, 0.022, 0.018, 12).tube([[0.2, 0.05, H + 0.02], [0.2, 0.05, H + 0.16], [0.2, 0.17, H + 0.17], [0.2, 0.19, H + 0.14]], 0.01, 8); m.cyl(0.32, 0.05, H, H + 0.05, 0.016, 0.014, 10).cyl(0.08, 0.05, H, H + 0.05, 0.016, 0.014, 10);
  m.mat('towel').box(w - 0.5, l - 0.2, H, w - 0.12, l - 0.04, H + 0.05, 0.02, { crown: 0.006 });
  m.solid(0, 0, w, l, 0, H);
});

/** Walk-in shower: low tray with linear drain, frameless glass with brace bar, rain head, thermostatic mixer, hand shower, shelf. */
export const shower = (w: number, d: number) => piece(`shower|${w}|${d}`, (m) => {
  m.mat('ceramic').box(0, 0, 0.004, w, d, 0.03, 0.006);
  m.mat('steel').box(0.1, 0.03, 0.03, w - 0.1, 0.075, 0.032);
  const gl = w * 0.64;
  m.mat('glass_clear', { ns: true }).box(0, d - 0.006, 0.03, gl, d + 0.004, 2.05, 0.002);
  m.mat('chrome').box(-0.0, d - 0.012, 0.03, 0.012, d + 0.01, 2.05).tube([[gl - 0.03, d, 2.02], [gl - 0.03, 0.0, 2.02]], 0.008, 8);
  const hx = w - 0.42;
  m.tube([[hx, 0, 2.12], [hx, 0.34, 2.12]], 0.011, 8).lathe(hx, 0.34, [[0, 2.105], [0.12, 2.105], [0.125, 2.095], [0.12, 2.088], [0, 2.088]], 26);
  m.push().move(hx, 0, 1.12).rotX(-90).lathe(0, 0, [[0, 0], [0.065, 0], [0.065, 0.012], [0.03, 0.014], [0.03, 0.05], [0, 0.052]], 20).pop();
  m.tube([[hx + 0.3, 0.025, 0.95], [hx + 0.3, 0.025, 1.72]], 0.009, 8).tube([[hx + 0.3, 0.0, 0.96], [hx + 0.3, 0.025, 0.96]], 0.007, 6).tube([[hx + 0.3, 0.0, 1.7], [hx + 0.3, 0.025, 1.7]], 0.007, 6);
  m.tube([[hx + 0.3, 0.05, 1.5], [hx + 0.3, 0.1, 1.62]], 0.012, 8, 0.02).lathe(hx + 0.3, 0.115, [[0, 1.66], [0.04, 1.65], [0.04, 1.63], [0, 1.625]], 14);
  m.mat('glass_clear', { ns: true }).box(0.12, 0, 1.2, 0.52, 0.11, 1.208);
  for (const [bx, mt, h] of [[0.2, 'ceramic_sand', 0.17], [0.3, 'ceramic_dark', 0.14], [0.41, 'book_c', 0.19]] as [number, string, number][]) m.mat(mt).lathe(bx, 0.055, [[0, 1.208], [0.028, 1.208], [0.03, 1.208 + h * 0.75], [0.012, 1.208 + h * 0.9], [0.012, 1.208 + h], [0, 1.208 + h]], 12);
  m.solid(0, d - 0.03, gl, d + 0.03, 0, 2.05);
});

export const towelRail = () => piece('towelrail', (m) => {
  m.mat('chrome'); for (const x of [0, 0.5]) m.tube([[x, 0.05, 0.75], [x, 0.05, 1.75]], 0.012, 8);
  for (let i = 0; i < 8; i++) { const z = 0.82 + i * 0.125; m.tube([[0, 0.05, z], [0.5, 0.05, z]], 0.008, 6); }
  for (const z of [0.8, 1.7]) for (const x of [0, 0.5]) m.tube([[x, 0, z], [x, 0.05, z]], 0.008, 6);
  m.mat('towel').sheet(6, 10, (u, v) => { const s = v * 1.0; const over = s < 0.5; return [0.06 + u * 0.38 + Math.sin(v * 9) * 0.003, over ? 0.075 + Math.sin(u * 14) * 0.003 : 0.03, over ? 1.46 - (0.5 - s) * 1.0 * 0 - (0.5 - s) * 0.9 + 0.0 : 1.46 - (s - 0.5) * 0.7]; }, { double: true, su: 0.4, sv: 0.9 });
});

/** Full-height wardrobe: door pairs with joints and long bar handles, recessed plinth. */
export const wardrobe = (w: number, h = 2.4, surf?: string) => piece(`wardrobe|${w}|${h}|${surf}`, (m) => {
  const d = 0.6;
  m.mat('kick_dark').box(0.01, 0.03, 0, w - 0.01, d - 0.06, 0.08);
  m.mat('carcass').box(0, 0, 0.08, w, d - 0.02, h);
  const n = Math.max(1, Math.round(w / 0.5)), dw = w / n;
  m.mat('oak', { surf }); for (let i = 0; i < n; i++) m.box(i * dw + 0.0015, d - 0.02, 0.083, (i + 1) * dw - 0.0015, d, h - 0.002, 0.0015, { bs: 1 });
  for (let i = 0; i < n; i++) barHandle(m, i % 2 === 0 ? (i + 1) * dw - 0.04 : i * dw + 0.04, d, 0.95, 1.4);
  m.solid(0, 0, w, d, 0, h);
});

/** Media wall: fluted timber panel, wall-hung screen, floating console with drawer joints and LED wash. */
export const mediaWall = (w: number, h: number, surf?: string) => piece(`media|${w}|${h}|${surf}`, (m) => {
  m.mat('carcass').box(0, 0, 0, w, 0.012, h);
  m.mat('oak', { surf, ns: true }); for (let x = 0.004; x < w - 0.03; x += 0.046) m.box(x, 0.012, 0.0, x + 0.034, 0.026, h); // slats do not cast: no shadow-map moire
  const cw = Math.min(2.6, w - 0.6), c0 = (w - cw) / 2;
  m.mat('carcass').box(c0 + 0.004, 0.03, 0.26, c0 + cw - 0.004, 0.4, 0.6);
  m.mat('oak', { surf }).tex(true).box(c0, 0.03, 0.6, c0 + cw, 0.43, 0.625, 0.004).box(c0, 0.03, 0.235, c0 + cw, 0.42, 0.26, 0.003);
  const n = 4, fw = cw / n; for (let i = 0; i < n; i++) m.box(c0 + i * fw + 0.0015, 0.4, 0.262, c0 + (i + 1) * fw - 0.0015, 0.42, 0.598, 0.0015, { bs: 1 });
  m.tex();
  m.mat('led', { ns: true }).box(c0 + 0.05, 0.05, 0.225, c0 + cw - 0.05, 0.07, 0.233);
  const tw = 1.46, th = 0.84, t0 = (w - tw) / 2;
  m.mat('black_metal').box(t0, 0.032, 1.02, t0 + tw, 0.062, 1.02 + th, 0.004); m.mat('tv_screen', { ns: true }).box(t0 + 0.008, 0.062, 1.028, t0 + tw - 0.008, 0.0635, 1.02 + th - 0.008);
  m.mat('black_metal').box(w / 2 - 0.45, 0.2, 0.625, w / 2 + 0.45, 0.29, 0.69, 0.012);
  m.mat('ceramic_sand').lathe(c0 + 0.3, 0.24, [[0, 0.625], [0.06, 0.625], [0.1, 0.72], [0.085, 0.86], [0.04, 0.93], [0.05, 0.96], [0.04, 0.96], [0.03, 0.93]], 18);
  m.mat('book_b').box(c0 + cw - 0.52, 0.1, 0.625, c0 + cw - 0.28, 0.28, 0.65, 0.002).mat('book_a').box(c0 + cw - 0.5, 0.11, 0.65, c0 + cw - 0.29, 0.27, 0.672, 0.002).mat('brass').ball(c0 + cw - 0.4, 0.19, 0.71, 0.04, 0.04, 0.04, 12);
  m.solid(c0, 0, c0 + cw, 0.43, 0.2, 0.7);
});

/** Lever handle pair for a door leaf of thickness t: local origin on the leaf face centre line. */
export const leverHandle = () => piece('lever', (m) => {
  for (const s of [1, -1]) {
    m.mat('black_metal').push().move(0, s * 0.02, 0).rotX(s > 0 ? -90 : 90).cyl(0, 0, 0, 0.007, 0.026, 0.026, 14).pop();
    m.tube([[0, s * 0.02, 0], [0, s * 0.062, 0], [0.11, s * 0.066, 0]], 0.0085, 8);
  }
});

// ---- electrical / mechanical details (concept positions, realistic sizes; not an MEP design)
export const wallSwitch = () => piece('switch', (m) => {
  m.mat('switch_plate').box(-0.043, 0, -0.043, 0.043, 0.009, 0.043, 0.002); m.mat('switch_rocker').box(-0.02, 0.009, -0.026, 0.02, 0.013, 0.026, 0.002);
});
export const socket = () => piece('socket', (m) => {
  m.mat('switch_plate').box(-0.073, 0, -0.043, 0.073, 0.009, 0.043, 0.002);
  for (const x of [-0.035, 0.035]) { m.mat('switch_rocker').push().move(x, 0.009, 0).rotX(-90).cyl(0, 0, 0, 0.004, 0.024, 0.024, 14).pop(); m.mat('gap_dark').box(x - 0.012, 0.0132, -0.004, x - 0.006, 0.0136, 0.004).box(x + 0.006, 0.0132, -0.004, x + 0.012, 0.0136, 0.004); }
});
/** Linear slot diffuser for cooling (ceiling, z = 0 at the ceiling plane). */
/** V12 stair balustrade along a flight: steel balusters every ~0.3 m under an oak handrail at height h above the pitch line.
 *  Local x along the run (0…L), the flight rises R over it. */
export const stairRail = (L: number, R: number, h = 0.9) => piece(`srail|${L}|${R}|${h}`, (m) => {
  m.mat('oak').tube([[-0.05, 0, h], [L + 0.05, 0, R + h]], 0.025, 10);
  m.mat('black_metal').tube([[0, 0, h - 0.12], [L, 0, R + h - 0.12]], 0.008, 6);
  const nb = Math.max(2, Math.round(L / 0.3)); for (let i = 0; i <= nb; i++) { const x = (L * i) / nb, z = (R * i) / nb; m.cyl(x, 0, z, z + h - 0.02, 0.011, 0.011, 6); }
  m.solid(0, -0.05, L, 0.05, 0, h + R);
});
/** V12 wall handrail on brackets, following the pitch line (local x along the run). */
export const wallRail = (L: number, R: number) => piece(`wrail|${L}|${R}`, (m) => {
  m.mat('oak').tube([[0, -0.06, 0.9], [L, -0.06, R + 0.9]], 0.022, 10);   // placed at 90°: −y is away from the wall
  m.mat('black_metal'); for (let i = 0; i <= 3; i++) { const x = (L * i) / 3, z = (R * i) / 3 + 0.9; m.box(x - 0.01, -0.06, z - 0.06, x + 0.01, 0, z - 0.02); }
});
/** LED tape for a ceiling cove, lying in the cove trough (local x along the run, z up). Each placed run becomes a cove light in Cycles. */
export const coveStrip = (len: number) => piece(`cove|${len}`, (m) => {
  m.mat('led', { ns: true }).box(0, -0.006, 0, len, 0.006, 0.008);
});
export const acDiffuser = (len = 1.2) => piece(`ac|${len}`, (m) => {
  m.mat('ceiling_trim').box(-len / 2, -0.075, -0.012, len / 2, 0.075, 0, 0.002);
  m.mat('gap_dark'); for (const y of [-0.035, 0, 0.035]) m.box(-len / 2 + 0.03, y - 0.009, -0.0125, len / 2 - 0.03, y + 0.009, -0.011);
});
export const smokeDetector = () => piece('smoke', (m) => {
  m.mat('ceiling_trim').lathe(0, 0, [[0, -0.035], [0.05, -0.035], [0.055, -0.02], [0.055, 0], [0, 0]], 18); m.mat('led').cyl(0.025, 0, -0.0362, -0.035, 0.003, 0.003, 6);
});

export type { V3 };
