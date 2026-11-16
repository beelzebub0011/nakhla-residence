import { describe, expect, it } from 'vitest';
import { BODY_RADIUS, buildNav, resolveCollision, roomAt, roomPath, safeEye, segmentClear, waypoints } from '../../src/domain/nav';
import { getFloorPlan } from '../../src/domain/plans';

describe('V7 G4 walk graph and collision', () => {
  const nav = buildNav('F04'); const plan = getFloorPlan('F04');
  it('every Type A and B room is reachable from its entry through real doors', () => {
    for (const side of ['A', 'B'] as const) for (const r of plan.rooms.filter((x) => x.owner === side)) expect(roomPath(nav, `${side}.entry`, r.key), r.key).not.toBeNull();
  });
  it('apartments are not connected to each other or to the core (closed entry doors)', () => {
    expect(roomPath(nav, 'A.living', 'B.living')).toBeNull(); expect(roomPath(nav, 'A.entry', 'core.lobby')).toBeNull();
  });
  it('a walking body never penetrates a wall or furniture', () => {
    // random walk in small steps from a valid viewpoint, exactly like free-walk input
    for (const start of plan.rooms.filter((r) => r.view && r.owner === 'A')) {
      let [x, y] = safeEye('F04', start); let seed = 17; let worst = Infinity;
      for (let i = 0; i < 500; i++) {
        seed = (seed * 16807) % 2147483647; const a = (seed / 2147483647) * Math.PI * 2;
        [x, y] = resolveCollision(nav, x + Math.cos(a) * 0.05, y + Math.sin(a) * 0.05);
        for (const r of nav.solids) { const qx = Math.max(r.x0, Math.min(x, r.x1)), qy = Math.max(r.y0, Math.min(y, r.y1)); worst = Math.min(worst, Math.hypot(x - qx, y - qy)); }
      }
      expect(worst, start.key).toBeGreaterThan(BODY_RADIUS - 0.06);
      expect(roomAt(plan, x, y)?.owner, start.key).toBe('A'); // never leaves the apartment
    }
  });
  it('waypoints go through the doorway, not the wall', () => {
    const living = plan.rooms.find((r) => r.key === 'A.living')!, master = plan.rooms.find((r) => r.key === 'A.master')!;
    const pts = waypoints(nav, living.view!.eye, 'A.living', master.view!.eye, 'A.master')!;
    expect(pts.length).toBeGreaterThan(4);
    expect(segmentClear(nav, living.view!.eye, master.view!.eye)).toBe(false); // the straight line would cross walls
    for (const [x, y] of pts) expect(roomAt(plan, x, y) !== null || nav.edges.some((e) => Math.hypot(e.portal[0] - x, e.portal[1] - y) < 0.01)).toBe(true);
  });
  it('every room viewpoint stands on free floor inside its own room', () => {
    const bad: string[] = [];
    for (const f of ['F04', 'G', 'F10', 'F11'] as const) {
      const n = buildNav(f); const p = getFloorPlan(f);
      for (const r of p.rooms) {
        if (!r.view) continue; const [x, y] = r.view.eye;
        if (roomAt(p, x, y)?.key !== r.key) bad.push(`${f} ${r.key} outside room`);
        const [sx, sy] = safeEye(f, r); if (roomAt(p, sx, sy)?.key !== r.key) bad.push(`${f} ${r.key} safe eye left the room`);
        if (Math.hypot(sx - x, sy - y) > 0.5) bad.push(`${f} ${r.key} viewpoint moved ${Math.hypot(sx - x, sy - y).toFixed(2)} m`);
        const [cx, cy] = resolveCollision(n, sx, sy); if (Math.hypot(cx - sx, cy - sy) > 0.02) bad.push(`${f} ${r.key} still blocked`);
      }
    }
    expect(bad).toEqual([]);
  });
});
