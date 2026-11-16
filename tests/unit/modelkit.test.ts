import { describe, expect, it } from 'vitest';
import { buildFloorInterior } from '../../src/domain/prims';
import * as P from '../../src/domain/pieces';
import * as F from '../../src/domain/fitments';
import type { Prim } from '../../src/domain/types';

// The modelled furniture must be real, well-formed geometry, and the lightmap atlas must be a valid
// non-overlapping packing — both are consumed by the browser AND by Blender.

const meshes = (prims: Prim[]) => prims.filter((p): p is Extract<Prim, { k: 'mesh' }> => p.k === 'mesh');

describe('modelling kit', () => {
  it('every catalogue piece is a closed set of finite triangles with unit normals', () => {
    const pieces = { sofa: P.sofa(2.8, 0.98, 'fabric_sand', { pillows: 4, throw: true }), bed: P.bed(), chair: P.chair(), table: P.diningTable(), plant: P.plantPot(1), kitchen: F.kitchenRun(5.1, { tall: 'start', hob: 2.6, sink: 4.2 }), island: F.island(), vanity: F.vanity(1.1), wc: F.wc(), shower: F.shower(1.86, 0.92), tub: F.bathtub(2.07), wardrobe: F.wardrobe(2.2) };
    for (const [name, b] of Object.entries(pieces)) {
      expect(b.tris, name).toBeGreaterThan(150);          // not a box: real modelled detail
      for (const part of b.parts) {
        expect(part.pos.length % 9, name).toBe(0); expect(part.nrm.length).toBe(part.pos.length); expect(part.uv.length).toBe((part.pos.length / 3) * 2);
        for (let i = 0; i < part.pos.length; i += 3) {
          expect(Number.isFinite(part.pos[i] + part.pos[i + 1] + part.pos[i + 2]), `${name} position`).toBe(true);
          const l = Math.hypot(part.nrm[i], part.nrm[i + 1], part.nrm[i + 2]); expect(Math.abs(l - 1), `${name}/${part.mat} normal length ${l}`).toBeLessThan(0.02);
        }
      }
    }
  }, 30000);

  it('furniture is sized like real furniture', () => {
    const ext = (b: ReturnType<typeof P.sofa>) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z1 = -1e9; for (const p of b.parts) for (let i = 0; i < p.pos.length; i += 3) { x0 = Math.min(x0, p.pos[i]); x1 = Math.max(x1, p.pos[i]); y0 = Math.min(y0, p.pos[i + 1]); y1 = Math.max(y1, p.pos[i + 1]); z1 = Math.max(z1, p.pos[i + 2]); } return { w: x1 - x0, d: y1 - y0, h: z1 }; };
    const chair = ext(P.chair()); expect(chair.w).toBeGreaterThan(0.42); expect(chair.w).toBeLessThan(0.6); expect(chair.h).toBeGreaterThan(0.78); expect(chair.h).toBeLessThan(0.95);
    const table = ext(P.diningTable(1.9, 0.95)); expect(table.h).toBeGreaterThan(0.72); expect(table.h).toBeLessThan(1.0);
    const wc = ext(F.wc()); expect(wc.d).toBeGreaterThan(0.5); expect(wc.d).toBeLessThan(0.62);
    const run = ext(F.kitchenRun(3, {})); expect(run.d).toBeGreaterThan(0.6); expect(run.d).toBeLessThan(0.68);
  });

  it('the residential interior stays inside the real-time triangle budget', () => {
    const tris = meshes(buildFloorInterior('F04')).reduce((s, p) => s + p.pos.length / 9, 0);
    expect(tris).toBeGreaterThan(80000); expect(tris).toBeLessThan(450000);
  });

  it('lightmap rectangles cover every wall, floor and ceiling without overlapping', () => {
    for (const f of ['F04', 'G', 'F10', 'F11'] as const) {
      const prims = buildFloorInterior(f);
      const need = prims.filter((p) => (p.k === 'quad' && p.grp === 'lining') || (p.k === 'slab' && (p.grp === 'floor' || p.grp === 'ceiling')));
      const rects = need.map((p) => (p as { lm?: number[] }).lm);
      expect(rects.every((r) => r && r[0] >= 0 && r[1] >= 0 && r[2] <= 1 && r[3] <= 1 && r[2] > r[0] && r[3] > r[1]), `${f} all packed`).toBe(true);
      const rs = (rects as number[][]).slice().sort((a, b) => a[0] - b[0]); let overlaps = 0;
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length && rs[j][0] < rs[i][2]; j++) if (rs[j][1] < rs[i][3] && rs[j][3] > rs[i][1]) overlaps++;
      expect(overlaps, `${f} overlaps`).toBe(0);
    }
  });
});
