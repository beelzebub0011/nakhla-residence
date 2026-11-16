import { describe, expect, it } from 'vitest';
import { CORE_ROADS, DISTRICT, NEIGHBOURS } from '../../src/engine/site';

// V11.5: no building may stand on a street. The core streets are listed in CORE_ROADS; the district roads run on the grid lines.
describe('V11.5 streets are clear of buildings', () => {
  it('no neighbour lot overlaps a core street or its pavements', () => {
    const bad = NEIGHBOURS.filter(([x0, x1, y0, y1]) => CORE_ROADS.some(([a0, a1, b0, b1]) => x1 > a0 && x0 < a1 && y1 > b0 && y0 < b1));
    expect(bad.map((b) => b.slice(0, 4).map((v) => Math.round(v)))).toEqual([]);
  });
  it('no neighbour lot outside the core sits on a district road', () => {
    const half = DISTRICT.road / 2; const [cx0, cx1, cy0, cy1] = DISTRICT.core;
    const onGrid = (lo: number, hi: number, base: number, pitch: number) => { for (let g = base; g <= base + pitch * 40; g += pitch) if (hi > g - half && lo < g + half) return true; return false; };
    const bad = NEIGHBOURS.filter(([x0, x1, y0, y1]) => {
      const inCore = x1 > cx0 && x0 < cx1 && y1 > cy0 && y0 < cy1; if (inCore) return false;
      return onGrid(x0, x1, DISTRICT.x0, DISTRICT.pitchX) || onGrid(y0, y1, DISTRICT.y0, DISTRICT.pitchY);
    });
    expect(bad.length).toBe(0);
  });
});
