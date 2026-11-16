import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { furnishFloor } from '../../src/domain/furniture';
import { getFloorPlan } from '../../src/domain/plans';
import type { FloorId, Prim } from '../../src/domain/types';

// Model validation (addendum T07 / T18): furniture must stand on the floor, stay inside its own room, and not
// interpenetrate other pieces. Uses the collision footprints (3D boxes) that every placed piece reports.
// Writes project_artifacts/model_validation.json (read by MODEL_VALIDATION_REPORT.md).

type Box = Extract<Prim, { k: 'box' }>;
const FLOORS: FloorId[] = ['G', 'F04', 'F10', 'F11'];

function analyse(f: FloorId) {
  const all = furnishFloor(f, 'all'); const plan = getFloorPlan(f);
  const nav = all.filter((p): p is Box => p.k === 'box' && p.grp === 'nav');
  const meshes = all.filter((p): p is Extract<Prim, { k: 'mesh' }> => p.k === 'mesh');
  // 1. nothing below the finished floor (pool basin items excepted)
  const below: string[] = [];
  for (const m of meshes) { if (m.room === 'zone.pool' && m.sem.includes('ladder')) continue; let z = 1e9; for (let i = 2; i < m.pos.length; i += 3) z = Math.min(z, m.pos[i]); if (z < -0.015) below.push(`${m.sem} (${z.toFixed(3)} m)`); }
  // 2. every piece inside its own room (5 cm tolerance; outdoor furniture may sit on the balcony / terrace edge)
  const outside: string[] = [];
  for (const b of nav) {
    const room = plan.rooms.find((r) => r.key === b.room); if (!room) continue;
    const tol = room.outdoor ? 0.12 : 0.05;
    const inside = room.rects.some((r) => b.x0 >= r.x0 - tol && b.x1 <= r.x1 + tol && b.y0 >= r.y0 - tol && b.y1 <= r.y1 + tol);
    if (!inside) outside.push(`${b.sem} [${b.x0.toFixed(2)},${b.y0.toFixed(2)}–${b.x1.toFixed(2)},${b.y1.toFixed(2)}]`);
  }
  // 3. pairwise 3D overlaps between different pieces (stacked pieces whose height ranges do not overlap are fine)
  const overlaps: { a: string; b: string; volume: number }[] = []; const intended: { a: string; b: string; volume: number; why?: string }[] = [];
  for (let i = 0; i < nav.length; i++) for (let j = i + 1; j < nav.length; j++) {
    const a = nav[i], b = nav[j]; if (a.room !== b.room) continue;
    const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0), dz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
    if (!(dx > 0.02 && dy > 0.02 && dz > 0.02)) continue;
    // intended assemblies: an object standing ON furniture (raised placement), and dining chairs tucked under their table
    const why = Math.max(a.z0, b.z0) >= 0.6 ? 'placed on a surface' : (/\.dining$/.test(a.sem) && /\.chair$/.test(b.sem)) || (/\.dining$/.test(b.sem) && /\.chair$/.test(a.sem)) ? 'chair tucked under the table' : null;
    (why ? intended : overlaps).push({ a: a.sem, b: b.sem, volume: +(dx * dy * dz).toFixed(4), ...(why ? { why } : {}) });
  }
  return { floor: f, pieces: nav.length, meshes: meshes.length, below, outside, overlaps, intended };
}

describe('model validation', () => {
  const report = FLOORS.map(analyse);
  it('writes the validation ledger', () => {
    mkdirSync('project_artifacts', { recursive: true });
    writeFileSync('project_artifacts/model_validation.json', JSON.stringify({ generatedBy: 'tests/unit/model-validation.test.ts', note: 'Footprint-level checks of the concept model (not a clash detection of a construction model).', report }, null, 1));
    expect(report.length).toBe(4);
  });
  it('no furniture sinks below the finished floor', () => { for (const r of report) expect(r.below, r.floor).toEqual([]); });
  it('every piece stays inside its own room', () => { for (const r of report) expect(r.outside, r.floor).toEqual([]); });
  it('pieces do not interpenetrate (intended assemblies are listed in the ledger, not here)', () => {
    for (const r of report) expect(r.overlaps.filter((o) => o.volume > 0.005), `${r.floor}: ${JSON.stringify(r.overlaps.slice(0, 6))}`).toEqual([]);
  });
});
