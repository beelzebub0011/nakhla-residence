import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Prim, PrimGroup } from '../domain/types';
import { toWorldX, toWorldZ } from '../domain/tower';
import type { MatLib } from './matlib';

// Prim list -> merged meshes. Geometry is floor-local: X east, Y up from FFL, Z south.
// UVs are in metres so texture scale is physically consistent on every surface.

function boxGeo(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.BufferGeometry {
  const X0 = toWorldX(x0), X1 = toWorldX(x1), Za = toWorldZ(y0), Zb = toWorldZ(y1); // Za > Zb (south > north)
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const face = (p: number[][], n: number[], uvs: number[][]) => {
    for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...p[i]); nor.push(...n); uv.push(...uvs[i]); }
  };
  // top / bottom
  face([[X0, z1, Za], [X1, z1, Za], [X1, z1, Zb], [X0, z1, Zb]], [0, 1, 0], [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  face([[X0, z0, Zb], [X1, z0, Zb], [X1, z0, Za], [X0, z0, Za]], [0, -1, 0], [[x0, y1], [x1, y1], [x1, y0], [x0, y0]]);
  // south (+Z) / north (-Z)
  face([[X0, z0, Za], [X1, z0, Za], [X1, z1, Za], [X0, z1, Za]], [0, 0, 1], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  face([[X1, z0, Zb], [X0, z0, Zb], [X0, z1, Zb], [X1, z1, Zb]], [0, 0, -1], [[x1, z0], [x0, z0], [x0, z1], [x1, z1]]);
  // east (+X) / west (-X)
  face([[X1, z0, Za], [X1, z0, Zb], [X1, z1, Zb], [X1, z1, Za]], [1, 0, 0], [[y0, z0], [y1, z0], [y1, z1], [y0, z1]]);
  face([[X0, z0, Zb], [X0, z0, Za], [X0, z1, Za], [X0, z1, Zb]], [-1, 0, 0], [[y1, z0], [y0, z0], [y0, z1], [y1, z1]]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

function primGeo(p: Prim): THREE.BufferGeometry {
  if (p.k === 'mesh') {
    const n = p.pos.length; const pos = new Float32Array(n), nor = new Float32Array(n);
    for (let i = 0; i < n; i += 3) {
      pos[i] = toWorldX(p.pos[i]); pos[i + 1] = p.pos[i + 2]; pos[i + 2] = toWorldZ(p.pos[i + 1]);
      nor[i] = p.nrm[i]; nor[i + 1] = p.nrm[i + 2]; nor[i + 2] = -p.nrm[i + 1];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(p.uv, 2));
    return g;
  }
  if (p.k === 'box') {
    if (p.r && p.r > 0.005) {
      const w = p.x1 - p.x0, h = p.z1 - p.z0, d = p.y1 - p.y0;
      const r = Math.min(p.r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
      const rb = new RoundedBoxGeometry(w, h, d, 2, Math.max(0.002, r)); const g = rb.index ? rb.toNonIndexed() : rb;
      g.translate(toWorldX((p.x0 + p.x1) / 2), (p.z0 + p.z1) / 2, toWorldZ((p.y0 + p.y1) / 2));
      // scale default 0..1 UVs into rough metres so fabric/wood grain keeps its density
      const uv = g.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d), uv.getY(i) * Math.max(h, d));
      return g;
    }
    return boxGeo(p.x0, p.x1, p.y0, p.y1, p.z0, p.z1);
  }
  if (p.k === 'cyl') {
    const h = p.z1 - p.z0; const cg = new THREE.CylinderGeometry(p.r2 ?? p.r, p.r, h, 22, 1); const g = cg.index ? cg.toNonIndexed() : cg;
    g.translate(toWorldX(p.cx), (p.z0 + p.z1) / 2, toWorldZ(p.cy));
    return g;
  }
  if (p.k === 'slab') {
    const X0 = toWorldX(p.x0), X1 = toWorldX(p.x1), Za = toWorldZ(p.y0), Zb = toWorldZ(p.y1); const y = p.z;
    const g = new THREE.BufferGeometry();
    const P = p.up ? [[X0, y, Za], [X1, y, Za], [X1, y, Zb], [X0, y, Zb]] : [[X0, y, Zb], [X1, y, Zb], [X1, y, Za], [X0, y, Za]];
    const U = p.mat === 'contact' || p.mat === 'glow_pool' ? [[0, 0], [1, 0], [1, 1], [0, 1]] : p.up ? [[p.x0, p.y0], [p.x1, p.y0], [p.x1, p.y1], [p.x0, p.y1]] : [[p.x0, p.y1], [p.x1, p.y1], [p.x1, p.y0], [p.x0, p.y0]];
    const pos: number[] = [], nor: number[] = [], uv: number[] = [];
    for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...P[i]); nor.push(0, p.up ? 1 : -1, 0); uv.push(...U[i]); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (p.lm) { const [a, b, c, d] = p.lm; const L = p.up ? [[a, b], [c, b], [c, d], [a, d]] : [[a, d], [c, d], [c, b], [a, b]]; const u1: number[] = []; for (const i of [0, 1, 2, 0, 2, 3]) u1.push(...L[i]); g.setAttribute('uv1', new THREE.Float32BufferAttribute(u1, 2)); }
    return g;
  }
  // vertical lining quad
  const horiz = Math.abs(p.ay - p.by) < 1e-6;
  const a = [toWorldX(p.ax), toWorldZ(p.ay)], b = [toWorldX(p.bx), toWorldZ(p.by)];
  const n = [p.nx, 0, -p.ny];
  const ua = horiz ? p.ax : p.ay, ub = horiz ? p.bx : p.by;
  let P = [[a[0], p.z0, a[1]], [b[0], p.z0, b[1]], [b[0], p.z1, b[1]], [a[0], p.z1, a[1]]];
  let U = [[ua, p.z0], [ub, p.z0], [ub, p.z1], [ua, p.z1]];
  let L = p.lm ? [[p.lm[0], p.lm[1]], [p.lm[2], p.lm[1]], [p.lm[2], p.lm[3]], [p.lm[0], p.lm[3]]] : null;
  // ensure counter-clockwise winding as seen from the normal side
  const e1 = [P[1][0] - P[0][0], 0, P[1][2] - P[0][2]];
  const cy = [-(e1[2] * 1), 0, e1[0] * 1]; // e1 x up(0,1,0) projected: (e1.y*0 - e1.z*1, ..., e1.x*1)
  const facing = cy[0] * n[0] + cy[2] * n[2];
  if (facing < 0) { P = [P[1], P[0], P[3], P[2]]; U = [U[1], U[0], U[3], U[2]]; if (L) L = [L[1], L[0], L[3], L[2]]; }
  const g = new THREE.BufferGeometry(); const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...P[i]); nor.push(...n); uv.push(...U[i]); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (L) { const u1: number[] = []; for (const i of [0, 1, 2, 0, 2, 3]) u1.push(...L[i]); g.setAttribute('uv1', new THREE.Float32BufferAttribute(u1, 2)); }
  return g;
}

export interface Built { root: THREE.Group; byGrp: Partial<Record<PrimGroup, THREE.Group>>; triangles: number; meshCount: number }

/** Merged geometry of one draw batch — plain typed arrays, so it can be produced in a Web Worker and transferred. */
export interface MergedBucket { grp: PrimGroup; mat: string; surf?: string; room?: string; noShadow: boolean; pos: Float32Array; nor: Float32Array; uv: Float32Array; uv1?: Float32Array }

/** Geometry only (no materials, no DOM): bucket the prims and merge each bucket. Safe to run off the main thread. */
export function mergeBuckets(prims: Prim[]): MergedBucket[] {
  const buckets = new Map<string, { prims: Prim[]; grp: PrimGroup; mat: string; surf?: string; room?: string; noShadow: boolean }>();
  for (const p of prims) {
    if (p.grp === 'nav' || p.grp === 'mirror') continue;
    const pickRoom = p.grp === 'leaf' || p.grp === 'floor' || p.grp === 'lining' || (p.grp === 'furn' && p.surf) || (p.grp === 'shell' && p.k === 'slab') ? p.room ?? '' : '';
    const ns = p.k === 'box' || p.k === 'mesh' ? !!p.noShadow : false;
    // V11.5: light-mapped slabs carry a second UV set; ceiling-mounted fittings in the same group do not, so they bucket apart
    const lmk = (p.k === 'slab' || p.k === 'quad') && (p as { lm?: unknown }).lm ? 1 : 0;
    const key = `${p.grp}|${p.mat}|${p.surf ?? ''}|${pickRoom}|${ns ? 1 : 0}|${lmk}`;
    let b = buckets.get(key);
    if (!b) { b = { prims: [], grp: p.grp, mat: p.mat, surf: p.surf, room: pickRoom || undefined, noShadow: ns }; buckets.set(key, b); }
    b.prims.push(p);
  }
  const out: MergedBucket[] = [];
  for (const b of buckets.values()) {
    const geos = b.prims.map(primGeo);
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) continue;
    // a single-prim bucket still points at the prim's own arrays (cached furniture pieces share them): copy, so transferring never detaches the cache
    const arr = (n: string) => { const a0 = merged.getAttribute(n)?.array as Float32Array | undefined; return a0 && geos.length === 1 ? a0.slice() : a0; };
    out.push({ grp: b.grp, mat: b.mat, surf: b.surf, room: b.room, noShadow: b.noShadow, pos: arr('position')!, nor: arr('normal')!, uv: arr('uv')!, uv1: arr('uv1') });
  }
  return out;
}

/** Main-thread half: wrap merged buckets in meshes and bind materials. */
export function meshesFromBuckets(buckets: MergedBucket[], lib: MatLib, opts: { shadows: boolean; lightmap?: boolean }): Built {
  const root = new THREE.Group(); const byGrp: Built['byGrp'] = {}; let triangles = 0; let meshCount = 0;
  for (const b of buckets) {
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(b.pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(b.nor, 3)); merged.setAttribute('uv', new THREE.BufferAttribute(b.uv, 2));
    if (b.uv1) merged.setAttribute('uv1', new THREE.BufferAttribute(b.uv1, 2));
    merged.computeBoundingSphere(); merged.computeBoundingBox();
    const lm = !!opts.lightmap && (b.grp === 'lining' || b.grp === 'floor' || b.grp === 'ceiling') && !!b.uv1;
    // everything else inside a baked floor (furniture, doors, partitions) takes its ambient light from the baked floor irradiance
    const amb = !!opts.lightmap && !lm && (b.grp === 'furn' || b.grp === 'interior' || b.grp === 'ceiling') && b.mat !== 'contact';
    const mesh = new THREE.Mesh(merged, lm ? lib.getLM(b.mat) : amb ? lib.getAmb(b.mat) : lib.get(b.mat));
    const isGlass = b.grp === 'glass' || b.mat === 'glass' || b.mat === 'water' || b.mat === 'glass_bal' || b.mat === 'contact' || b.mat === 'glass_clear' || b.mat === 'glow_pool';
    const flat = b.grp === 'floor' || b.grp === 'lining' || b.grp === 'ceiling' || b.grp === 'fill';
    mesh.castShadow = opts.shadows && !isGlass && !b.noShadow && !flat || (opts.shadows && b.grp === 'ceiling');
    mesh.receiveShadow = opts.shadows && !isGlass && b.grp !== 'fill';
    if (isGlass) mesh.renderOrder = b.mat === 'contact' ? 2 : 5;
    mesh.userData = { grp: b.grp, slot: b.mat, surf: b.surf, room: b.room, lm, amb };
    mesh.matrixAutoUpdate = false;
    let g = byGrp[b.grp];
    if (!g) { g = new THREE.Group(); g.name = b.grp; byGrp[b.grp] = g; root.add(g); }
    g.add(mesh);
    triangles += b.pos.length / 9; meshCount++;
  }
  return { root, byGrp, triangles, meshCount };
}

export function buildMeshes(prims: Prim[], lib: MatLib, opts: { shadows: boolean; lightmap?: boolean }): Built {
  return meshesFromBuckets(mergeBuckets(prims), lib, opts);
}

/** Free GPU buffers of a built group (materials/textures are owned by MatLib and stay cached). */
export function disposeBuilt(root: THREE.Object3D) {
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); const r = o as unknown as { isReflector?: boolean; dispose?: () => void }; if (r.isReflector) r.dispose?.(); });
  root.removeFromParent();
}
