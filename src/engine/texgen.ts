import type { Recipe } from '../domain/materials';

// ---------------------------------------------------------------------------------------------
// ORIGINAL procedural PBR texture sets (albedo + normal + roughness) generated at runtime.
// No third-party images are used, so there is nothing to license and nothing to download.
// UVs are authored in METRES; each set declares the real-world size one texture tile covers,
// so a 600×1200 mm tile is really 600×1200 mm on every surface (V7 Gate 2).
// ---------------------------------------------------------------------------------------------

export type TexRecipe = Recipe
  | { type: 'concrete'; base: string; rough: number }
  | { type: 'fabric'; base: string; rough: number }
  | { type: 'mosaic'; base: string; grout: string; module: [number, number]; rough: number }
  /** neighbouring-building façade: 4 bays x 3 storeys of windows (3.2 m bays, 3.3 m storeys). lit = emissive mask of lit windows */
  | { type: 'facade'; base: string; glass: string; trim: string; rough: number; lit?: boolean; balcony?: boolean; brick?: boolean; mortar?: string }
  /** original abstract artwork: soft colour fields + a few bold strokes */
  | { type: 'art'; base: string; palette: string[]; rough: number };


const mulberry = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hex = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const strHash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Tileable value noise on a wrapping lattice. */
function makeNoise(seed: number, period: number) {
  const rnd = mulberry(seed); const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y); const fx = sm(x - xi), fy = sm(y - yi);
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const a = g[y0 * period + x0], b = g[y0 * period + x1], c = g[y1 * period + x0], d = g[y1 * period + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

/** Original abstract canvas: layered soft colour fields with sweeping strokes and canvas grain. */
function paintArt(recipe: { base: string; palette: string[] }, N: number, seed: number, put: (i: number, r: number, g: number, b: number, h: number, ro: number) => void, mk: typeof makeNoise) {
  const a = mk(seed + 3, 4), b = mk(seed + 11, 9), g = mk(seed + 29, 64); const pal = recipe.palette.map(hex); const base = hex(recipe.base);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N; const w = a(u * 3 + 0.3, v * 3) * 0.7 + b(u * 7, v * 7) * 0.3;
    const band = (v * 1.35 + (w - 0.5) * 0.9 + Math.sin(u * 2.2 + w * 3) * 0.12) * pal.length;
    const k = Math.max(0, Math.min(pal.length - 1, Math.floor(band))); const f = Math.max(0, Math.min(1, (band - k - 0.5) * 6 + 0.5)); const c0 = pal[k], c1 = pal[Math.min(pal.length - 1, k + 1)];
    let r = c0[0] + (c1[0] - c0[0]) * f, gg = c0[1] + (c1[1] - c0[1]) * f, bb = c0[2] + (c1[2] - c0[2]) * f;
    const arc = Math.abs(Math.hypot(u - 0.3, v - 0.62) - 0.34 - (b(u * 5, v * 5) - 0.5) * 0.05);
    if (arc < 0.012) { const t = 1 - arc / 0.012; r += (base[0] - r) * t * 0.9; gg += (base[1] - gg) * t * 0.9; bb += (base[2] - bb) * t * 0.9; }
    const gr = (g(u * 220, v * 220) - 0.5) * 16;
    put(y * N + x, r + gr, gg + gr, bb + gr, 0.5 + gr / 60, 0.85);
  }
}

export interface Fields { size: number; rgb: Uint8ClampedArray; height: Float32Array; rough: Float32Array }

export function generate(recipe: TexRecipe, size: number, seedKey: string): { f: Fields; cover: [number, number] } {
  const N = size; const rgb = new Uint8ClampedArray(N * N * 4); const height = new Float32Array(N * N); const rough = new Float32Array(N * N);
  const seed = strHash(seedKey);
  const n8 = makeNoise(seed, 8), n32 = makeNoise(seed + 7, 32), n128 = makeNoise(seed + 13, 128);
  const fbm = (u: number, v: number) => 0.5 * n8(u * 8, v * 8) + 0.3 * n32(u * 32, v * 32) + 0.2 * n128(u * 128, v * 128);
  const base = hex((recipe as { base: string }).base);
  let cover: [number, number] = [1, 1];
  const put = (i: number, r: number, g: number, b: number, h: number, ro: number) => {
    rgb[i * 4] = r; rgb[i * 4 + 1] = g; rgb[i * 4 + 2] = b; rgb[i * 4 + 3] = 255; height[i] = h; rough[i] = ro;
  };
  const tint = (c: [number, number, number], k: number): [number, number, number] => [c[0] * k, c[1] * k, c[2] * k];
  const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  if (recipe.type === 'facade') {
    cover = [12.8, 9.9]; const glass = hex(recipe.glass), trim = hex(recipe.trim);
    // V11.4 (G2): the day map and its lit-window map share ONE seed (the "_lit" key used to reseed, so lit panes drifted off
    // the windows), and each façade gets 2–3 window rhythms: column types stay the same up the building, as on real blocks.
    const rnd = mulberry(strHash(seedKey.replace(/_lit$/, '')) + 41);
    const colKind: number[] = []; for (let i = 0; i < 4; i++) colKind.push(Math.floor(rnd() * 4));
    const cells: { lit: number; tone: number; bal: boolean; blind: number; cool: boolean; ac: boolean; curtain: number }[] = [];
    for (let i = 0; i < 12; i++) { const r = [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()]; cells.push({ lit: r[0], tone: 0.85 + r[1] * 0.3, bal: !!recipe.balcony && r[2] < 0.45, blind: r[3], cool: r[4] < 0.35, ac: r[5] < 0.3, curtain: r[6] }); }
    type Win = [number, number, number, number];
    const windowsOf = (kind: number, bal: boolean): Win[] => {
      if (bal) return [[0.5, 2.7, 0.12, 2.55]];                                   // balcony door
      if (kind === 1) return [[0.35, 2.85, 0.75, 2.6]];                           // wide picture window
      if (kind === 2) return [[0.4, 1.4, 0.95, 2.5], [1.8, 2.8, 0.95, 2.5]];      // a pair of narrow windows
      if (kind === 3) return [[0.95, 2.25, 0.2, 2.6]];                            // tall French window with a guard rail
      return [[0.65, 2.55, 0.95, 2.55]];                                          // standard
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = 1 - y / N; const cx = Math.min(3, Math.floor(u * 4)), cyy = Math.min(2, Math.max(0, Math.floor(v * 3))); const c = cells[cyy * 4 + cx];
      const lx = (u * 4 - cx) * 3.2, lz = (v * 3 - cyy) * 3.3; const i = y * N + x;            // metres inside the bay
      const kind = colKind[cx]; const wins = windowsOf(kind, c.bal); const w = wins.find(([a0, a1, b0, b1]) => lx > a0 && lx < a1 && lz > b0 && lz < b1);
      const inWin = !!w; const [w0, w1, z0, z1] = w ?? wins[0];
      const frame = inWin && (lx < w0 + 0.07 || lx > w1 - 0.07 || lz < z0 + 0.07 || lz > z1 - 0.07 || (w1 - w0 > 1.2 && Math.abs(lx - (w0 + w1) / 2) < 0.035));
      if (recipe.lit) {
        const on = inWin && !frame && c.lit < 0.34; const k = on ? (0.55 + 0.45 * c.tone) * (lz - z0 < (z1 - z0) * (0.25 + 0.5 * c.blind) ? 1 : 0.55) : 0;
        if (c.cool) put(i, 236 * k, 232 * k, 214 * k, 0.5, 1); else put(i, 255 * k, 205 * k, 140 * k, 0.5, 1);   // LED-white or warm rooms (G4)
        continue;
      }
      const n = fbm(u * 3, v * 3);
      if (inWin && !frame) {
        const t = (lz - z0) / (z1 - z0); const sky = 0.75 + 0.5 * t;
        if (kind === 3 && !c.bal && lz < z0 + 0.95 && Math.abs((lx * 7) % 1 - 0.5) > 0.4) { put(i, trim[0], trim[1], trim[2], 0.65, 0.5); continue; }   // guard rail bars
        if (c.curtain < 0.4 && t > 0.55) { const cc = 0.62 + 0.15 * c.curtain; put(i, 214 * cc, 200 * cc, 178 * cc, 0.4, 0.8); continue; }        // drawn curtain behind the glass
        put(i, glass[0] * sky * c.tone, glass[1] * sky * c.tone, glass[2] * sky * c.tone, 0.35, 0.12); continue;
      }
      if (frame) { put(i, trim[0], trim[1], trim[2], 0.6, 0.5); continue; }
      const slab = lz < 0.1 || lz > 3.2; const bal = c.bal && lz > 0.1 && lz < 1.1 && lx > 0.25 && lx < 2.95; const joint = Math.abs(lx - 0.0) < 0.02 || Math.abs(lx - 3.2) < 0.02;
      let k = 1 + (n - 0.5) * 0.08; if (slab) k *= 0.9; if (joint) k *= 0.88;
      // V11.5 weathering: broad mottling, rain streaks under every sill, damp stain under the slab edge (real blocks are never clean)
      k *= 1 + (fbm(u * 0.6 + 3.1, v * 0.6) - 0.5) * 0.22;
      if (lz > 3.2 - 0.55 && lz < 3.2) k *= 1 - 0.07 * (1 - (3.2 - lz) / 0.55);
      for (const [a0, a1, b0] of wins) if (lz < b0 && lz > b0 - 1.5 && lx > a0 - 0.05 && lx < a1 + 0.05) {
        const st = n128(x * 0.9, 3.0) * n32(x * 0.25, 1.0); k *= 1 - 0.2 * st * (1 - (b0 - lz) / 1.5);
      }
      if (recipe.brick && !slab) {   // traditional Basra yellow brick: 6.5 cm courses, stretcher bond, lime mortar
        const course = Math.floor(lz / 0.065), bx = lx + (course % 2) * 0.12; const mort = (lz % 0.065) < 0.011 || (bx % 0.24) < 0.011;
        const bt = 0.88 + 0.24 * n128(Math.floor(bx / 0.24) * 3.7, course * 1.3);
        if (mort) { const mo = hex(recipe.mortar ?? '#c9bda4'); put(i, mo[0] * k, mo[1] * k, mo[2] * k, 0.45, 0.95); continue; }
        k *= bt;
      }
      for (const [a0, a1, , b1] of wins) {
        if (lz > b1 && lz < b1 + 0.12 && lx > a0 - 0.1 && lx < a1 + 0.1) k *= 0.8;                                   // lintel shadow
        if (kind === 0 && !c.bal && lz > b1 + 0.02 && lz < b1 + 0.2 && lx > a0 && lx < a1) k *= 0.72;               // roller-shutter box
      }
      if (bal) { const rail = lz > 1.0 || Math.abs((lx * 6) % 1 - 0.5) > 0.42; put(i, (rail ? trim[0] : base[0] * 0.78), (rail ? trim[1] : base[1] * 0.78), (rail ? trim[2] : base[2] * 0.78), 0.7, 0.6); continue; }
      if (c.ac && !c.bal && lx > 2.72 && lx < 3.12 && lz > 1.15 && lz < 1.6) {                                          // split-AC outdoor unit
        const grille = Math.abs(((lz - 1.15) * 40) % 1 - 0.5) > 0.3; const g = grille ? 0.62 : 0.86; put(i, 232 * g, 232 * g, 226 * g, 0.75, 0.5); continue;
      }
      put(i, base[0] * k, base[1] * k, base[2] * k, 0.5 + (n - 0.5) * 0.1, recipe.rough);
    }
  }
  else if (recipe.type === 'art') { cover = [1, 1]; paintArt(recipe, N, seed, put, makeNoise); }
  else if (recipe.type === 'tile' || recipe.type === 'mosaic') {
    const [mw, mh] = recipe.module;
    const nx = recipe.type === 'mosaic' ? 8 : Math.max(1, Math.round(1.2 / mw)), ny = recipe.type === 'mosaic' ? 8 : Math.max(1, Math.round(1.2 / mh));
    cover = [nx * mw, ny * mh];
    const grout = hex(recipe.grout); const gpx = Math.max(1.2, (((recipe.type === 'tile' && recipe.groutW) || 0.004) / cover[0]) * N);   // V11.4: façade stone uses wider open joints
    const vein = recipe.type === 'tile' && recipe.vein ? hex(recipe.vein) : null;
    const veinAmt = recipe.type === 'tile' ? recipe.veinAmount ?? 0 : 0; const speck = recipe.type === 'tile' ? recipe.speckle ?? 0 : 0.1;
    const rnd = mulberry(seed + 99); const tone: number[] = []; const off: number[] = [];
    const tv = (recipe.type === 'tile' && recipe.toneVar) || 0.045; for (let i = 0; i < nx * ny; i++) { tone.push(1 + (rnd() - 0.5) * tv); off.push(rnd() * 10); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N; const tx = Math.floor(u * nx), ty = Math.floor(v * ny); const ti = ty * nx + tx;
      const lx = (u * nx - tx) * (N / nx), ly = (v * ny - ty) * (N / ny);
      const edge = Math.min(lx, N / nx - lx, ly, N / ny - ly);
      const i = y * N + x;
      if (edge < gpx) { put(i, grout[0], grout[1], grout[2], 0.25, 0.9); continue; }
      const bevel = Math.min(1, (edge - gpx) / 2.2);
      let c = tint(base, tone[ti] * (1 + (fbm(u + off[ti], v) - 0.5) * 0.05));
      let ro = recipe.rough;
      if (vein && veinAmt > 0) {
        const w = fbm(u * 0.9 + off[ti], v * 0.9 + off[ti] * 0.3);
        const line = Math.abs(Math.sin((u * 2.2 + v * 1.1 + w * 2.6 + off[ti]) * Math.PI));
        const a = Math.pow(1 - line, 14) * veinAmt * (0.4 + 0.6 * n8(u * 8 + off[ti], v * 8));
        const soft = Math.pow(1 - line, 3) * 0.12 * veinAmt;
        c = mix(c, vein, Math.min(0.85, a + soft));
      }
      if (speck > 0) { const s = n128(u * 128 * 2, v * 128 * 2); c = tint(c, 1 + (s - 0.5) * speck * 0.5); ro += (s - 0.5) * 0.08; }
      put(i, c[0], c[1], c[2], 0.5 + bevel * 0.5 + (recipe.rough > 0.5 ? (n128(u * 128, v * 128) - 0.5) * 0.06 : 0), ro);
    }
  } else if (recipe.type === 'plank') {
    const [pw, pl] = recipe.module; const rows = 8; cover = [rows * pw, pl];
    const dark = hex(recipe.dark); const rnd = mulberry(seed + 5); const tone: number[] = [], shift: number[] = [];
    for (let i = 0; i < rows * 3; i++) { tone.push(rnd()); shift.push(rnd()); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N; const row = Math.floor(u * rows); const vv = (v + shift[row]) % 1; const seg = Math.floor(vv * 1) + row;
      const lx = (u * rows - row) * (N / rows); const i = y * N + x;
      const endJoint = Math.abs(vv - 0.0) < 1.5 / N || Math.abs(vv - 1) < 1.5 / N;
      const grain = n32(u * rows * 6 + row * 3.1, vv * 3) * 0.6 + n128(u * rows * 22 + row, vv * 9) * 0.4;
      const ring = 0.5 + 0.5 * Math.sin((u * rows * 5 + grain * 2.4 + row) * Math.PI);
      const k = 0.35 + 0.65 * tone[seg % tone.length];
      let c = mix(dark, base, 0.25 + 0.75 * (0.55 * grain + 0.45 * ring) * (0.75 + 0.25 * k));
      c = tint(c, 0.94 + k * 0.1);
      if (lx < 1.1 || endJoint) { c = tint(c, 0.55); put(i, c[0], c[1], c[2], 0.2, 0.8); continue; }
      put(i, c[0], c[1], c[2], 0.6 + (grain - 0.5) * 0.25, recipe.rough + (grain - 0.5) * 0.12);
    }
  } else if (recipe.type === 'veneer') {
    cover = [1.2, 2.4]; const dark = hex(recipe.dark);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N; const i = y * N + x;
      const grain = n32(u * 26, v * 2.5) * 0.55 + n128(u * 90, v * 6) * 0.45;
      const ring = 0.5 + 0.5 * Math.sin((u * 9 + n8(u * 3, v * 2) * 3.2) * Math.PI);
      const c = mix(dark, base, 0.2 + 0.8 * (0.5 * grain + 0.5 * ring));
      put(i, c[0], c[1], c[2], 0.5 + (grain - 0.5) * 0.3, recipe.rough + (grain - 0.5) * 0.1);
    }
  } else if (recipe.type === 'stone') {
    cover = [1.6, 1.6]; const vein = recipe.vein ? hex(recipe.vein) : null; const speck = recipe.speckle ?? 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N; const i = y * N + x; let c = tint(base, 1 + (fbm(u, v) - 0.5) * 0.06);
      if (speck > 0) { const s = n128(u * 128 * 3, v * 128 * 3), s2 = n128(u * 128 * 1.3 + 9, v * 128 * 1.3); c = tint(c, 1 + (s - 0.5) * speck + (s2 > 0.8 ? speck * 0.5 : 0)); }
      if (vein) { const w = fbm(u * 0.8, v * 0.8); const line = Math.abs(Math.sin((u * 1.6 - v * 1.2 + w * 3.0) * Math.PI)); c = mix(c, vein, Math.min(0.8, Math.pow(1 - line, 12) * (recipe.veinAmount ?? 0.6) + Math.pow(1 - line, 3) * 0.1)); }
      put(i, c[0], c[1], c[2], 0.5, recipe.rough + (n32(u * 32, v * 32) - 0.5) * 0.05);
    }
  } else if (recipe.type === 'fabric') {
    cover = [0.5, 0.5];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N; const i = y * N + x;
      const weave = 0.5 + 0.25 * Math.sin(u * N * 0.5 * Math.PI) * Math.sin(v * N * 0.5 * Math.PI) + (n128(u * 128, v * 128) - 0.5) * 0.3;
      const c = tint(base, 0.92 + weave * 0.14); put(i, c[0], c[1], c[2], weave, recipe.rough);
    }
  } else {
    // paint / laminate / concrete — nearly uniform with micro variation
    cover = recipe.type === 'concrete' ? [3, 3] : [1.5, 1.5];
    const amp = recipe.type === 'concrete' ? 0.1 : recipe.type === 'paint' ? 0.02 : 0.012;
    const bump = recipe.type === 'concrete' ? 0.5 : recipe.type === 'paint' ? 0.16 : 0.03;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N; const i = y * N + x; const n = fbm(u, v), m = n128(u * 128 * 2, v * 128 * 2);
      const c = tint(base, 1 + (n - 0.5) * amp + (m - 0.5) * amp * 0.5);
      put(i, c[0], c[1], c[2], 0.5 + (m - 0.5) * bump, recipe.rough + (n - 0.5) * 0.06);
    }
  }
  return { f: { size: N, rgb, height, rough }, cover };
}

export interface MapArrays { size: number; cover: [number, number]; albedo: Uint8ClampedArray; normal: Uint8ClampedArray; rough: Uint8ClampedArray }

/** Pure (DOM-free) texture synthesis: runs on the main thread or inside the texture worker. */
export function synthesize(key: string, recipe: TexRecipe, size: number): MapArrays {
  const { f, cover } = generate(recipe, size, key); const N = f.size;
  const strength = recipe.type === 'tile' || recipe.type === 'mosaic' ? 2.2 : recipe.type === 'plank' ? 1.6 : recipe.type === 'concrete' ? 1.4 : 1.0;
  const normal = new Uint8ClampedArray(N * N * 4); const rough = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const xl = (x + N - 1) % N, xr = (x + 1) % N, yu = (y + N - 1) % N, yd = (y + 1) % N;
    const dx = (f.height[y * N + xr] - f.height[y * N + xl]) * strength, dy = (f.height[yd * N + x] - f.height[yu * N + x]) * strength;
    const l = Math.hypot(dx, dy, 1); const i = (y * N + x) * 4;
    normal[i] = (-dx / l) * 127.5 + 127.5; normal[i + 1] = (dy / l) * 127.5 + 127.5; normal[i + 2] = (1 / l) * 127.5 + 127.5; normal[i + 3] = 255;
    const v = Math.max(0.04, Math.min(1, f.rough[y * N + x])) * 255; rough[i] = v; rough[i + 1] = v; rough[i + 2] = v; rough[i + 3] = 255;
  }
  return { size: N, cover, albedo: f.rgb, normal, rough };
}
