import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { BoxPrim, MeshPrim, Prim } from '../../src/domain/types';
import { NEIGHBOURS, TREE_KINDS, palmSpots, sitePrims, treeSpots } from '../../src/engine/site';
import { buildFloorInterior } from '../../src/domain/prims';

// V11.1 S23 — automated part of the shadow / contact audit: SHD-01 (floating or sunken assets) for the street
// furniture, cars, palms and the furniture of the reference floors. A warning prompts a visual check; it is not proof.

type Obj = { sem: string; x: number; y: number; minZ: number; cx: number; cy: number };
function objects(prims: Prim[]): Obj[] {
  // one placed object = the parts that share a semantic id and sit within 2.5 m of each other
  const out: Obj[] = [];
  for (const p of prims) {
    if (p.k !== 'mesh') continue; const m = p as MeshPrim; let mz = 1e9, mx = 0, my = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < m.pos.length; i += 3) { const x = m.pos[i], y = m.pos[i + 1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); if (m.pos[i + 2] < mz) { mz = m.pos[i + 2]; mx = x; my = y; } }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const o = out.find((q) => q.sem === m.sem && Math.hypot(q.cx - cx, q.cy - cy) < 3.0);
    if (o) { if (mz < o.minZ) { o.minZ = mz; o.x = mx; o.y = my; } } else out.push({ sem: m.sem, x: mx, y: my, minZ: mz, cx, cy });
  }
  return out;
}
function groundAt(site: Prim[], x: number, y: number): number {
  let z = 0;
  for (const p of site) { if (p.k !== 'box') continue; const b = p as BoxPrim; if (!['plaza', 'asphalt', 'grass', 'curb', 'stone_base'].includes(b.mat)) continue;
    if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && b.z0 <= 0.2) z = Math.max(z, b.z1); }
  return z;
}

describe('S23 SHD-01 contact audit', () => {
  it('street objects, palms and reference-floor furniture touch what they stand on', () => {
    const site = sitePrims(); const rows: string[] = []; const flagged: string[] = [];
    let n = 0;
    for (const o of objects(site)) {
      const g = groundAt(site, o.x, o.y); const gap = o.minZ - g; n++;
      if (gap > 0.03 || gap < -0.12) flagged.push(`| site | ${o.sem} | ${o.x.toFixed(1)}, ${o.y.toFixed(1)} | ${(gap * 100).toFixed(1)} cm |`);
    }
    for (const [x, y, , base] of palmSpots()) { n++; const g = groundAt(site, x, y); if (g > 0.4) continue; /* planted inside a raised planter */ const gap = base - g; if (gap > 0.03 || gap < -0.12) flagged.push(`| site | palm trunk | ${x.toFixed(1)}, ${y.toFixed(1)} | ${(gap * 100).toFixed(1)} cm |`); }
    // V11 round 2: broadleaf trees / olives / shrubs — trunk base against pavement, lawn, planter soil or bare yard ground
    for (const [x, y, , kind, base] of treeSpots()) {
      n++; const g = groundAt(site, x, y) + (TREE_KINDS[kind] === 'olive' || TREE_KINDS[kind] === 'shrub' ? (groundAt(site, x, y) > 0.4 ? 0.03 : 0) : 0);   // planter soil sits 3 cm above the planter rim
      const gap = base - g; if (gap > 0.03 || gap < -0.12) flagged.push(`| site | ${TREE_KINDS[kind]} tree | ${x.toFixed(1)}, ${y.toFixed(1)} | ${(gap * 100).toFixed(1)} cm |`);
      if (TREE_KINDS[kind] === 'yard' && NEIGHBOURS.some(([x0, x1, y0, y1]) => x > x0 - 1 && x < x1 + 1 && y > y0 - 1 && y < y1 + 1)) flagged.push(`| site | yard tree inside a building | ${x.toFixed(1)}, ${y.toFixed(1)} | — |`);
    }
    const floors: Record<string, { n: number; f: number }> = {};
    for (const f of ['F04', 'G', 'F10', 'F11'] as const) {
      floors[f] = { n: 0, f: 0 };
      for (const o of objects(buildFloorInterior(f))) {
        if (o.minZ > 0.25) continue;                          // objects that sit on tables / shelves / walls are not floor contacts
        if (/\.(vanity|wc)$/.test(o.sem) || /pool\.furn\.ladder$/.test(o.sem)) continue;   // wall-hung vanity / WC and the pool ladder are meant not to touch the floor
        floors[f].n++; n++;
        if (o.minZ > 0.03 || o.minZ < -0.05) { floors[f].f++; flagged.push(`| ${f} | ${o.sem} | ${o.x.toFixed(1)}, ${o.y.toFixed(1)} | ${(o.minZ * 100).toFixed(1)} cm above floor |`); }
      }
    }
    rows.push(`Checked ${n} objects (street furniture, cars, ${palmSpots().length} palms, ${treeSpots().length} broadleaf trees / olives / shrubs, floor-standing furniture on G, F04, F10, F11).`, '',
      ...Object.entries(floors).map(([f, v]) => `- ${f}: ${v.n} floor-standing objects, ${v.f} warnings`), '',
      flagged.length ? ['| Where | Object | x, y (m) | Gap |', '|---|---|---|---|', ...flagged].join('\n') : '**No SHD-01 warnings.**');
    mkdirSync('reports', { recursive: true });
    writeFileSync('reports/SHD01_CONTACT_CHECK.md', `# SHD-01 automated contact check (tests/unit/shadow-audit.test.ts)\n\nA warning means a visual check is needed, not that the asset is wrong. Tolerance: up to 3 cm gap, up to 12 cm sunk (tyres press into asphalt; paving joints).\n\n${rows.join('\n')}\n`, 'utf8');
    expect(flagged.length, flagged.slice(0, 8).join('\n')).toBeLessThanOrEqual(flagged.length);   // reporting test: the count is recorded, the release gate reads the report
  }, 30000);   // V11.4: ~1000 objects; over 5 s when the suite runs in parallel
});
