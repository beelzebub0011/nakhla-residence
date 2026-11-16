import { describe, expect, it } from 'vitest';
import { runAudit, unitNetArea } from '../../src/domain/audit';
import { CROWN_H, buildCrown, buildFloorInterior, buildFloorShell, buildRoof } from '../../src/domain/prims';
import { FLOORS } from '../../src/domain/tower';

describe('V7 G1 geometry source of truth', () => {
  const audit = runAudit();
  it('passes every structural assertion', () => {
    expect(audit.errors).toEqual([]);
    expect(audit.ok).toBe(true);
  });
  it('models 12 levels and 18 units', () => {
    expect(audit.summary.floors).toBe(12);
    expect(audit.summary.units).toBe(18);
  });
  it('unit net areas match the concept within 1%', () => {
    expect(unitNetArea('TYPE_A')).toBeCloseTo(124.86, 1);
    expect(unitNetArea('TYPE_B')).toBeCloseTo(145.02, 1);
  });
  it('builds primitives for every floor without NaN', () => {
    for (const f of FLOORS) {
      const prims = [...buildFloorShell(f.id), ...buildFloorInterior(f.id)];
      expect(prims.length).toBeGreaterThan(50);
      for (const p of prims) for (const v of Object.values(p)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    }
    expect(buildRoof().length).toBeGreaterThan(10);
  });
});

describe('V11.4 open roof crown (D18, adopted by the owner)', () => {
  it('is part of the standard roof, so both renderers show it', () => {
    expect(buildRoof().filter((p) => p.sem === 'ROOF.crown').length).toBe(buildCrown().length);
  });
  it('stays within the roofed outline, below CROWN_H, with finite numbers', () => {
    const c = buildCrown();
    expect(c.length).toBeGreaterThan(100);
    for (const p of c) {
      if (p.k !== 'box') continue;
      expect(p.z1).toBeLessThanOrEqual(CROWN_H + 1e-9);
      expect(p.x0).toBeGreaterThanOrEqual(-0.66); expect(p.x1).toBeLessThanOrEqual(18.66);
      expect(p.y0).toBeGreaterThanOrEqual(-0.66); expect(p.y1).toBeLessThanOrEqual(20.16);   // north terraces stay open
      for (const v of Object.values(p)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    }
  });
});
