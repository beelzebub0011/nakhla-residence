import type { MeshPrim, Prim } from './types';

// ---------------------------------------------------------------------------------------------
// ORIGINAL procedural modelling kit (no third-party meshes). Furniture and fittings are modelled
// as real triangle meshes — bevelled edges, crowned cushions, lathed ceramics, swept tubes and
// draped cloth — in plan metres (x east, y north, z up). The SAME meshes feed the WebGL scene,
// the Blender/Cycles scene and the light bake, so nothing is modelled twice.
// ---------------------------------------------------------------------------------------------

export type V3 = [number, number, number];
interface PartBuf { mat: string; surf?: string; ns: boolean; pos: number[]; nrm: number[]; uv: number[] }
export interface BuiltPart { mat: string; surf?: string; ns: boolean; pos: Float32Array; nrm: Float32Array; uv: Float32Array }
export interface BuiltPiece { parts: BuiltPart[]; foot: number[][]; tris: number }

const D2R = Math.PI / 180;
let dry = false;
/** Footprint-only mode: pieces report their collision boxes but generate no triangles. */
export function setDry(v: boolean) { dry = v; }

export class Model {
  private parts = new Map<string, PartBuf>();
  private cur!: PartBuf;
  /** collision / contact footprints in local space: [x0,y0,x1,y1,z0,z1] */
  foot: number[][] = [];
  private m = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  private stack: number[][] = [];
  private swap = false; private uk = 1; private uo = 0; private vo = 0;

  mat(mat: string, o: { surf?: string; ns?: boolean } = {}): this {
    const key = `${mat}|${o.surf ?? ''}|${o.ns ? 1 : 0}`;
    let p = this.parts.get(key);
    if (!p) { p = { mat, surf: o.surf, ns: !!o.ns, pos: [], nrm: [], uv: [] }; this.parts.set(key, p); }
    this.cur = p; return this;
  }
  /** texture mapping controls: swap = grain runs along the horizontal axis; k = density scale */
  tex(swap = false, k = 1, uo = 0, vo = 0): this { this.swap = swap; this.uk = k; this.uo = uo; this.vo = vo; return this; }
  push(): this { this.stack.push(this.m.slice()); return this; }
  pop(): this { this.m = this.stack.pop()!; return this; }
  move(x: number, y: number, z = 0): this { const m = this.m; m[9] += m[0] * x + m[1] * y + m[2] * z; m[10] += m[3] * x + m[4] * y + m[5] * z; m[11] += m[6] * x + m[7] * y + m[8] * z; return this; }
  private mul(r: number[]) { const a = this.m; const o = a.slice(); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * r[j] + a[i * 3 + 1] * r[3 + j] + a[i * 3 + 2] * r[6 + j]; this.m = o; }
  rotZ(deg: number): this { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); this.mul([c, -s, 0, s, c, 0, 0, 0, 1]); return this; }
  rotX(deg: number): this { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); this.mul([1, 0, 0, 0, c, -s, 0, s, c]); return this; }
  rotY(deg: number): this { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); this.mul([c, 0, s, 0, 1, 0, -s, 0, c]); return this; }
  /** run `fn` in a local frame at (x,y,z) rotated about z */
  at(x: number, y: number, z: number, deg: number, fn: () => void): this { this.push().move(x, y, z); if (deg) this.rotZ(deg); fn(); return this.pop(); }
  solid(x0: number, y0: number, x1: number, y1: number, z0 = 0, z1 = 1): this { this.foot.push([x0, y0, x1, y1, z0, z1]); return this; }

  /** Emit one triangle from flat local arrays. N = smooth normals (also fixes winding), U = explicit uv. */
  private tri(P: ArrayLike<number>, a: number, b: number, c: number, N?: ArrayLike<number> | null, U?: ArrayLike<number> | null) {
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], bx = P[b * 3], by = P[b * 3 + 1], bz = P[b * 3 + 2], cx = P[c * 3], cy = P[c * 3 + 1], cz = P[c * 3 + 2];
    let fx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), fy = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), fz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const fl = Math.hypot(fx, fy, fz); if (fl < 1e-11) return; fx /= fl; fy /= fl; fz /= fl;
    if (N) {
      const d = fx * (N[a * 3] + N[b * 3] + N[c * 3]) + fy * (N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1]) + fz * (N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]);
      if (d < 0) { const t = b; b = c; c = t; fx = -fx; fy = -fy; fz = -fz; }
    }
    const m = this.m, o = this.cur; const X = Math.abs(fx), Y = Math.abs(fy), Z = Math.abs(fz);
    for (const i of [a, b, c]) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      o.pos.push(m[0] * x + m[1] * y + m[2] * z + m[9], m[3] * x + m[4] * y + m[5] * z + m[10], m[6] * x + m[7] * y + m[8] * z + m[11]);
      const nx = N ? N[i * 3] : fx, ny = N ? N[i * 3 + 1] : fy, nz = N ? N[i * 3 + 2] : fz;
      o.nrm.push(m[0] * nx + m[1] * ny + m[2] * nz, m[3] * nx + m[4] * ny + m[5] * nz, m[6] * nx + m[7] * ny + m[8] * nz);
      let u: number, v: number;
      if (U) { u = U[i * 2]; v = U[i * 2 + 1]; }
      else if (Z >= X && Z >= Y) { u = x; v = y; } else if (X >= Y) { u = y; v = z; } else { u = x; v = z; }
      if (this.swap) { const t = u; u = v; v = t; }
      o.uv.push(u * this.uk + this.uo, v * this.uk + this.vo);
    }
  }
  private quad(P: ArrayLike<number>, a: number, b: number, c: number, d: number, N?: ArrayLike<number> | null, U?: ArrayLike<number> | null) { this.tri(P, a, b, c, N, U); this.tri(P, a, c, d, N, U); }

  /** Smooth vertex normals for an indexed triangle list (area weighted). */
  private static smooth(P: number[], F: number[]): number[] {
    const N = new Array<number>(P.length).fill(0);
    for (let i = 0; i < F.length; i += 3) {
      const a = F[i] * 3, b = F[i + 1] * 3, c = F[i + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; }
    }
    for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
    return N;
  }

  /**
   * Box with real rounded edges. r = edge radius. Options: bs bevel segments, sub = flat-face subdivisions,
   * crown = bulge of the top (m), belly = bulge of the sides (m) — crown/belly make upholstery cushions.
   */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r = 0, o: { bs?: number; sub?: number; crown?: number; belly?: number } = {}): this {
    if (dry) return this;
    if (x0 > x1) { const t = x0; x0 = x1; x1 = t; } if (y0 > y1) { const t = y0; y0 = y1; y1 = t; } if (z0 > z1) { const t = z0; z0 = z1; z1 = t; }
    const hx = (x1 - x0) / 2, hy = (y1 - y0) / 2, hz = (z1 - z0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const soft = !!(o.crown || o.belly);
    r = Math.min(r, hx - 1e-4, hy - 1e-4, hz - 1e-4);
    if (r < 0.0008 && !soft) {
      const P = [x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1];
      this.quad(P, 4, 5, 6, 7); this.quad(P, 3, 2, 1, 0); this.quad(P, 0, 1, 5, 4); this.quad(P, 2, 3, 7, 6); this.quad(P, 1, 2, 6, 5); this.quad(P, 3, 0, 4, 7);
      return this;
    }
    r = Math.max(r, 0.0008);
    const bs = o.bs ?? (r > 0.03 ? 3 : r > 0.008 ? 2 : 1), sub = o.sub ?? (soft ? 4 : 1);
    const axis = (h: number) => { const a: number[] = []; const inner = h - r;
      for (let k = bs; k >= 1; k--) a.push(-inner - r * Math.tan((45 * k / bs) * D2R));
      for (let k = 0; k <= sub; k++) a.push(-inner + (2 * inner * k) / sub);
      for (let k = 1; k <= bs; k++) a.push(inner + r * Math.tan((45 * k / bs) * D2R));
      return a; };
    const A = [axis(hx), axis(hy), axis(hz)], H = [hx, hy, hz]; const n = A[0].length, K = n + 1;
    const P: number[] = [], N: number[] = [], F: number[] = []; const idx = new Map<number, number>();
    const vert = (i: number, j: number, k: number) => {
      const key = i + j * K + k * K * K; let v = idx.get(key); if (v !== undefined) return v;
      const c = [A[0][i], A[1][j], A[2][k]]; const q = c.map((t, a) => Math.max(-(H[a] - r), Math.min(H[a] - r, t)));
      let dx = c[0] - q[0], dy = c[1] - q[1], dz = c[2] - q[2]; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      let px = q[0] + dx * r, py = q[1] + dy * r, pz = q[2] + dz * r;
      if (soft) {
        const wx = 1 - (px / hx) ** 2, wy = 1 - (py / hy) ** 2, wz = 1 - (pz / hz) ** 2;
        const up = (o.crown ?? 0) * wx * wy * Math.max(0, dz), side = (o.belly ?? 0) * wz;
        px += dx * side * wy; py += dy * side * wx; pz += up;
      }
      v = P.length / 3; P.push(px + cx, py + cy, pz + cz); N.push(dx, dy, dz); idx.set(key, v); return v;
    };
    const face = (ax: number, side: number) => {
      const a1 = (ax + 1) % 3, a2 = (ax + 2) % 3; const fix = side > 0 ? n - 1 : 0;
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) {
        const id = (p: number, q: number) => { const c = [0, 0, 0]; c[ax] = fix; c[a1] = p; c[a2] = q; return vert(c[0], c[1], c[2]); };
        F.push(id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j), id(i + 1, j + 1), id(i, j + 1));
      }
    };
    for (let ax = 0; ax < 3; ax++) { face(ax, 1); face(ax, -1); }
    const NN = soft ? Model.smooth(P, F) : N;
    if (soft) { // orient smooth normals outward
      for (let i = 0; i < NN.length; i += 3) if (NN[i] * N[i] + NN[i + 1] * N[i + 1] + NN[i + 2] * N[i + 2] < 0) { NN[i] = -NN[i]; NN[i + 1] = -NN[i + 1]; NN[i + 2] = -NN[i + 2]; }
    }
    for (let i = 0; i < F.length; i += 3) this.tri(P, F[i], F[i + 1], F[i + 2], NN);
    return this;
  }

  /** Surface of revolution about the vertical axis at (cx,cy). prof = [radius, z] pairs; sy squashes it into an ellipse. */
  lathe(cx: number, cy: number, prof: [number, number][], seg = 20, sy = 1): this {
    if (dry) return this;
    const sn: [number, number][] = [];
    for (let i = 0; i < prof.length - 1; i++) { const dr = prof[i + 1][0] - prof[i][0], dz = prof[i + 1][1] - prof[i][1]; const l = Math.hypot(dr, dz) || 1; sn.push([dz / l, -dr / l]); }
    for (let i = 0; i < prof.length - 1; i++) {
      const blend = (a: [number, number], b?: [number, number]): [number, number] => { if (!b || a[0] * b[0] + a[1] * b[1] < 0.35) return a; const x = a[0] + b[0], z = a[1] + b[1], l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
      const n0 = blend(sn[i], sn[i - 1]), n1 = blend(sn[i], sn[i + 1]);
      const P: number[] = [], N: number[] = [];
      for (let s = 0; s <= seg; s++) {
        const a = (s / seg) * Math.PI * 2, c = Math.cos(a), sI = Math.sin(a);
        for (const [pt, nn] of [[prof[i], n0], [prof[i + 1], n1]] as [[number, number], [number, number]][]) {
          P.push(cx + c * pt[0], cy + sI * pt[0] * sy, pt[1]);
          const nx = c * nn[0], ny = (sI * nn[0]) / sy, nz = nn[1], l = Math.hypot(nx, ny, nz) || 1; N.push(nx / l, ny / l, nz / l);
        }
      }
      for (let s = 0; s < seg; s++) { const a = s * 2; this.quad(P, a, a + 2, a + 3, a + 1, N); }
    }
    return this;
  }
  cyl(cx: number, cy: number, z0: number, z1: number, r: number, r2 = r, seg = 20): this { return this.lathe(cx, cy, [[0, z0], [r, z0], [r2, z1], [0, z1]], seg); }
  /** Ellipsoid. */
  ball(cx: number, cy: number, cz: number, rx: number, ry = rx, rz = rx, seg = 12): this {
    if (dry) return this;
    const P: number[] = [], N: number[] = []; const rows = Math.max(4, Math.round(seg * 0.6));
    for (let i = 0; i <= rows; i++) { const t = (i / rows) * Math.PI, st = Math.sin(t), ct = Math.cos(t);
      for (let j = 0; j <= seg; j++) { const a = (j / seg) * Math.PI * 2; const x = st * Math.cos(a), y = st * Math.sin(a), z = -ct;
        P.push(cx + x * rx, cy + y * ry, cz + z * rz); const nx = x / rx, ny = y / ry, nz = z / rz, l = Math.hypot(nx, ny, nz) || 1; N.push(nx / l, ny / l, nz / l); } }
    const W = seg + 1; for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) { const a = i * W + j; this.quad(P, a, a + 1, a + W + 1, a + W, N); }
    return this;
  }
  /** Round tube swept along a polyline (legs, taps, rails, stems). r1 tapers the far end. */
  tube(pts: V3[], r: number, seg = 8, r1 = r, caps = true): this {
    if (dry) return this;
    const P: number[] = [], N: number[] = []; const n = pts.length;
    let ux = 0, uy = 0, uz = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      if (i === 0) { if (Math.abs(tz) < 0.9) { ux = -ty; uy = tx; uz = 0; } else { ux = 1; uy = 0; uz = 0; } }
      const d = ux * tx + uy * ty + uz * tz; ux -= d * tx; uy -= d * ty; uz -= d * tz; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
      const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux; const rr = r + ((r1 - r) * i) / Math.max(1, n - 1);
      for (let s = 0; s <= seg; s++) { const g = (s / seg) * Math.PI * 2, c = Math.cos(g), sI = Math.sin(g); const nx = ux * c + vx * sI, ny = uy * c + vy * sI, nz = uz * c + vz * sI;
        P.push(pts[i][0] + nx * rr, pts[i][1] + ny * rr, pts[i][2] + nz * rr); N.push(nx, ny, nz); }
    }
    const W = seg + 1; for (let i = 0; i < n - 1; i++) for (let s = 0; s < seg; s++) { const a = i * W + s; this.quad(P, a, a + 1, a + W + 1, a + W, N); }
    if (caps) for (const e of [0, n - 1]) { const c = P.length / 3; P.push(pts[e][0], pts[e][1], pts[e][2]); for (let s = 0; s < seg; s++) { const a = e * W + s; if (e === 0) this.tri(P, c, a + 1, a); else this.tri(P, c, a, a + 1); } }
    return this;
  }
  /** Parametric cloth / leaf surface with smooth normals. f maps (u,v) in [0,1]² to a point; su/sv = uv size in metres. */
  sheet(nu: number, nv: number, f: (u: number, v: number) => V3, o: { double?: boolean; su?: number; sv?: number } = {}): this {
    if (dry) return this;
    const P: number[] = [], U: number[] = [], F: number[] = []; const W = nu + 1;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const p = f(i / nu, j / nv); P.push(p[0], p[1], p[2]); U.push((i / nu) * (o.su ?? 1), (j / nv) * (o.sv ?? 1)); }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * W + i; F.push(a, a + 1, a + W + 1, a, a + W + 1, a + W); }
    const N = Model.smooth(P, F);
    for (let i = 0; i < F.length; i += 3) this.tri(P, F[i], F[i + 1], F[i + 2], N, U);
    if (o.double) { const M = N.map((v) => -v); for (let i = 0; i < F.length; i += 3) this.tri(P, F[i], F[i + 1], F[i + 2], M, U); }
    return this;
  }
  /** Stuffed pillow lying flat at the local origin: w × d, thickness t. */
  pillow(w: number, d: number, t: number, n = 8): this {
    if (dry) return this;
    for (const s of [1, -1]) this.sheet(n, n, (u, v) => {
      const a = u * 2 - 1, b = v * 2 - 1;
      const x = (w / 2) * a * (1 - 0.07 * (1 - b * b)), y = (d / 2) * b * (1 - 0.07 * (1 - a * a));
      const z = s * (t / 2) * Math.pow(Math.max(0, (1 - a ** 4) * (1 - b ** 4)), 0.42);
      return s > 0 ? [x, y, z + t / 2] : [-x, y, z + t / 2];
    }, { su: w, sv: d });
    return this;
  }
  /** Extruded convex polygon (plan outline) between z0 and z1. */
  prism(poly: [number, number][], z0: number, z1: number): this {
    if (dry) return this;
    const n = poly.length; const P: number[] = [];
    for (const [x, y] of poly) P.push(x, y, z0); for (const [x, y] of poly) P.push(x, y, z1);
    for (let i = 1; i < n - 1; i++) { this.tri(P, n, n + i, n + i + 1); this.tri(P, 0, i + 1, i); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.quad(P, i, j, n + j, n + i); }
    return this;
  }

  /** Append an already finished buffer at the current transform. */
  raw(P: Float32Array, N: Float32Array, U: Float32Array): this {
    if (dry) return this;
    const m = this.m, o = this.cur;
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i], y = P[i + 1], z = P[i + 2], nx = N[i], ny = N[i + 1], nz = N[i + 2];
      o.pos.push(m[0] * x + m[1] * y + m[2] * z + m[9], m[3] * x + m[4] * y + m[5] * z + m[10], m[6] * x + m[7] * y + m[8] * z + m[11]);
      o.nrm.push(m[0] * nx + m[1] * ny + m[2] * nz, m[3] * nx + m[4] * ny + m[5] * nz, m[6] * nx + m[7] * ny + m[8] * nz);
    }
    for (let i = 0; i < U.length; i++) o.uv.push(U[i]);
    return this;
  }

  build(): BuiltPiece {
    const parts: BuiltPart[] = []; let tris = 0;
    for (const p of this.parts.values()) { if (!p.pos.length) continue; tris += p.pos.length / 9; parts.push({ mat: p.mat, surf: p.surf, ns: p.ns, pos: new Float32Array(p.pos), nrm: new Float32Array(p.nrm), uv: new Float32Array(p.uv) }); }
    return { parts, foot: this.foot, tris };
  }
}

const cache = new Map<string, BuiltPiece>();
/** Build a piece once per key; every placement of the same piece reuses the cached mesh. */
export function piece(key: string, build: (m: Model) => void): BuiltPiece {
  const ck = dry ? `dry|${key}` : key;
  let b = cache.get(ck);
  if (!b) {
    // lazy: the mesh is generated on first use, so a piece that is filtered out (see setPlaceFilter) costs nothing
    let built: BuiltPiece | null = null; const isDry = dry;
    const get = () => { if (!built) { const was = dry; dry = isDry; const m = new Model(); m.mat('wood_mid'); build(m); built = m.build(); dry = was; } return built; };
    b = { get parts() { return get().parts; }, get foot() { return get().foot; }, get tris() { return get().tris; } } as BuiltPiece;
    cache.set(ck, b);
  }
  return b;
}

export interface PlaceCtx { out: Prim[]; f: string; room: string; grp?: MeshPrim['grp'] }
let placeFilter: ((room: string) => boolean) | null = null;
/** Restrict placement to some rooms (e.g. only outdoor rooms for the always-visible overview shell). */
export function setPlaceFilter(fn: ((room: string) => boolean) | null) { placeFilter = fn; }
export const placeAllowed = (room: string) => !placeFilter || placeFilter(room);
/** Instance a piece at plan position (x,y), rotated `deg` about the vertical axis, lifted by z. */
export function place(c: PlaceCtx, name: string, b: BuiltPiece, x: number, y: number, deg = 0, z = 0) {
  if (placeFilter && !placeFilter(c.room)) return;
  const cs = Math.cos(deg * D2R), sn = Math.sin(deg * D2R); const sem = `${c.f}.${c.room}.furn.${name}`;
  for (const p of b.parts) {
    const n = p.pos.length; const pos = new Float32Array(n), nrm = new Float32Array(n);
    for (let i = 0; i < n; i += 3) {
      const px = p.pos[i], py = p.pos[i + 1]; pos[i] = px * cs - py * sn + x; pos[i + 1] = px * sn + py * cs + y; pos[i + 2] = p.pos[i + 2] + z;
      const nx = p.nrm[i], ny = p.nrm[i + 1]; nrm[i] = nx * cs - ny * sn; nrm[i + 1] = nx * sn + ny * cs; nrm[i + 2] = p.nrm[i + 2];
    }
    const prim: MeshPrim = { k: 'mesh', sem, room: c.room, grp: c.grp ?? 'furn', mat: p.surf ? `surf:${p.surf}` : p.mat, surf: p.surf, noShadow: p.ns, pos, nrm, uv: p.uv };
    c.out.push(prim);
  }
  for (const f of b.foot) {
    const xs = [f[0], f[2]], ys = [f[1], f[3]]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const a of xs) for (const bq of ys) { const px = a * cs - bq * sn + x, py = a * sn + bq * cs + y; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    c.out.push({ k: 'box', sem, room: c.room, grp: 'nav', mat: 'nav', x0, x1, y0, y1, z0: f[4] + z, z1: f[5] + z });
  }
}

/** Sample a quadratic Bézier as a polyline (tap spouts, lamp arcs, stems). */
export function bez(a: V3, b: V3, c: V3, n = 8): V3[] {
  const o: V3[] = []; for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; o.push([s * s * a[0] + 2 * s * t * b[0] + t * t * c[0], s * s * a[1] + 2 * s * t * b[1] + t * t * c[1], s * s * a[2] + 2 * s * t * b[2] + t * t * c[2]]); } return o;
}
/** Deterministic pseudo-random in [0,1). */
export function rnd(seed: number) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
