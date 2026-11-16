import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MotionDirector, dampAlpha, easeFrom, frameStats, type Dest } from '../../src/engine/motion';

const orbitDest = (dist: number, az = 1): Dest => ({ rig: 'orbit', limits: { minDist: 5, maxDist: 300, minPol: 0.1, maxPol: 1.5 }, state: { target: new THREE.Vector3(0, 15, 0), az, pol: 0.8, dist, fov: 32 } });
const run = (d: MotionDirector, dt: number, seconds: number) => { for (let t = 0; t < seconds; t += dt) d.update(dt); };

describe('V8 MotionDirector', () => {
  it('easing is bounded, monotonic and hits its end points for any carried speed', () => {
    for (const v of [0, 0.5, 1, 1.4]) {
      expect(easeFrom(0, v)).toBe(0); expect(easeFrom(1, v)).toBeCloseTo(1, 6);
      let prev = 0;
      for (let t = 0; t <= 1.0001; t += 0.01) { const s = easeFrom(Math.min(1, t), v); expect(s).toBeGreaterThanOrEqual(prev - 1e-9); expect(s).toBeLessThanOrEqual(1); prev = s; }
    }
  });
  it('damping is frame-rate independent', () => {
    const lambda = 9; let a = 0, b = 0;
    for (let i = 0; i < 60; i++) a += (1 - a) * dampAlpha(lambda, 1 / 60);
    for (let i = 0; i < 30; i++) b += (1 - b) * dampAlpha(lambda, 1 / 30);
    expect(a).toBeCloseTo(b, 6);
  });
  it('a trip lasts the same wall time at 120, 60 and 30 Hz and ends on the exact destination', () => {
    const ends: number[][] = []; const times: number[] = [];
    for (const hz of [120, 60, 30]) {
      const d = new MotionDirector(new THREE.PerspectiveCamera(32, 1.6, 0.1, 5000)); d.go(orbitDest(40), { id: 't', band: [0.65, 1.1] });
      let t = 0; while (d.busy && t < 5) { d.update(1 / hz); t += 1 / hz; }
      times.push(t); ends.push(d.camera.position.toArray());
      expect(d.phase).toBe('IDLE'); expect(d.orbit.dist).toBeCloseTo(40, 6);
    }
    expect(Math.abs(times[0] - times[2])).toBeLessThan(0.05);
    for (let i = 0; i < 3; i++) expect(ends[0][i]).toBeCloseTo(ends[2][i], 5);
  });
  it('clamps a huge frame delta (tab resume) to 50 ms of motion', () => {
    const d = new MotionDirector(new THREE.PerspectiveCamera()); d.go(orbitDest(40), { id: 't', band: [1, 1] });
    const before = d.camera.position.clone(); d.update(8); // an 8 s stall
    expect(d.busy).toBe(true); expect(d.camera.position.distanceTo(before)).toBeLessThan(3);
  });
  it('retargets from the current rendered pose without a jump', () => {
    const d = new MotionDirector(new THREE.PerspectiveCamera()); d.go(orbitDest(40, 2), { id: 'a', band: [1, 1] }); run(d, 1 / 60, 0.45);
    const prev = d.camera.position.clone(); d.update(1 / 60); const mid = d.camera.position.clone(); const stepBefore = mid.distanceTo(prev);
    d.go(orbitDest(20, -1), { id: 'b', band: [1, 1] }); d.update(1 / 60);
    // the first frame of the new trip moves no further than the camera was already travelling
    expect(d.camera.position.distanceTo(mid)).toBeLessThan(stepBefore * 1.6 + 0.05); expect(d.stats.retargets).toBe(1);
    run(d, 1 / 60, 1.2); expect(d.busy).toBe(false); expect(d.orbit.dist).toBeCloseTo(20, 5);
    expect(d.records.find((r) => r.id === 'a')?.interrupted).toBe(true);
  });
  it('a drag during a directed orbit hands control to the visitor from the current pose', () => {
    const d = new MotionDirector(new THREE.PerspectiveCamera()); let arrived = 0;
    d.go(orbitDest(40, 2), { id: 'a', band: [1, 1], onArrive: () => arrived++ }); run(d, 1 / 60, 0.3);
    const p = d.camera.position.clone(); d.dragStart(); expect(d.busy).toBe(false); expect(d.phase).toBe('IDLE'); expect(arrived).toBe(1);
    d.update(1 / 60); expect(d.camera.position.distanceTo(p)).toBeLessThan(8); // eases on toward the intended framing, no snap back
    run(d, 1 / 60, 2); expect(d.orbit.dist).toBeCloseTo(40, 1);
  });
  it('never rolls the camera and takes the shortest way round', () => {
    const d = new MotionDirector(new THREE.PerspectiveCamera()); d.snap(orbitDest(60, 3.0)); d.go(orbitDest(60, -3.0), { id: 'wrap', band: [1, 1] });
    let maxStep = 0; let prev = d.orbit.az;
    for (let i = 0; i < 70; i++) {
      d.update(1 / 60); const e = new THREE.Euler().setFromQuaternion(d.camera.quaternion, 'YXZ'); expect(Math.abs(e.z)).toBeLessThan(1e-4);
      const step = Math.abs(Math.atan2(Math.sin(d.orbit.az - prev), Math.cos(d.orbit.az - prev))); maxStep = Math.max(maxStep, step); prev = d.orbit.az;
    }
    expect(maxStep).toBeLessThan(0.05); // crosses ±π the short way (0.28 rad in total), never the 6 rad long way
  });
  it('reduced motion arrives through a short veil instead of flying', () => {
    const d = new MotionDirector(new THREE.PerspectiveCamera()); d.reduced = true; const start = d.camera.position.clone();
    d.go(orbitDest(30, 2), { id: 'r', band: [0.65, 1.1] }); expect(d.phase).toBe('REDUCED_MOTION');
    d.update(1 / 60); expect(d.camera.position.distanceTo(start)).toBeLessThan(1e-6); // no spatial flight before the cut
    run(d, 1 / 60, 0.4); expect(d.busy).toBe(false); expect(d.orbit.dist).toBeCloseTo(30, 6); expect(d.value('veil')).toBeLessThan(0.01);
    expect(d.records[0].reduced).toBe(true);
  });
  it('scalar tweens resolve, and are superseded cleanly', async () => {
    const d = new MotionDirector(new THREE.PerspectiveCamera()); const a = d.animate('explode', 1, 0.5); run(d, 1 / 60, 0.2); const b = d.animate('explode', 0, 0.2);
    expect(await a).toBe(false); run(d, 1 / 60, 0.3); expect(await b).toBe(true); expect(d.value('explode')).toBe(0);
  });
  it('walking is collision-resolved and frame-rate independent', () => {
    const mk = () => {
      const d = new MotionDirector(new THREE.PerspectiveCamera()); d.snap({ rig: 'look', state: { pos: new THREE.Vector3(0, 1.62, 0), yaw: 0, pitch: 0, fov: 66 } });
      d.walkEnabled = true; d.collide = (x, z) => [x, Math.max(z, -2)]; return d;
    };
    const a = mk(), b = mk(); a.setMove(1, 0, 0, false); b.setMove(1, 0, 0, false); run(a, 1 / 60, 3); run(b, 1 / 30, 3);
    expect(a.look.pos.z).toBeCloseTo(-2, 5); expect(b.look.pos.z).toBeCloseTo(-2, 5); // the wall at z = -2 stops both
  });
  it('frame statistics report percentiles and hitches', () => {
    const st = frameStats([16, 16, 17, 16, 60, 16, 16, 16, 16, 16]); expect(st.hitches50).toBe(1); expect(st.p50).toBe(16); expect(st.max).toBe(60);
  });
});
