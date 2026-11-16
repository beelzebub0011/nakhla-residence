import * as THREE from 'three';

// ---------------------------------------------------------------------------------------------
// V8 MotionDirector — the ONE owner of the camera transform and of every scene-level animated
// scalar (floor lift, ghost fade, ceiling fade, veil). Rules it enforces:
//  • one writer per frame: update() computes a pose from the active owner and writes it once
//  • monotonic clock, dt clamped to 50 ms (tab resume cannot fling the camera)
//  • frame-rate independent damping: alpha = 1 - exp(-lambda * dt)
//  • orientation by quaternion slerp / shortest-path angles, never raw Euler lerp
//  • new intent while moving => retarget from the CURRENT rendered pose and speed
//  • reduced motion => arrive promptly with a short veil instead of flying
// ---------------------------------------------------------------------------------------------

export type MotionPhase = 'IDLE' | 'PREPARING' | 'PLAYING' | 'PAUSED' | 'CANCELLING' | 'RECOVERING' | 'REDUCED_MOTION';
export type Rig = 'orbit' | 'look';

export interface OrbitState { target: THREE.Vector3; az: number; pol: number; dist: number; fov: number }
export interface OrbitLimits { minDist: number; maxDist: number; minPol: number; maxPol: number }
export interface LookState { pos: THREE.Vector3; yaw: number; pitch: number; fov: number }

export type Dest =
  | { rig: 'orbit'; state: OrbitState; limits: OrbitLimits; via?: THREE.Vector3[] }
  | { rig: 'look'; state: LookState; via?: THREE.Vector3[]; lookAlong?: boolean };

export interface TripOptions {
  id: string;
  /** duration tuning band in seconds [min, max] */
  band: [number, number];
  /** semantic cut through a short veil instead of a spatial move */
  cut?: boolean;
  onArrive?: () => void;
  /** cut trips only: called at the veil peak, right after the destination pose is applied */
  onMid?: () => void;
}

export interface TripRecord { id: string; startedAt: number; durationMs: number; frames: number[]; interrupted: boolean; reduced: boolean; kind: string }

const MAX_DT = 0.05;
const TAU = Math.PI * 2;
const wrapPi = (a: number) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Quintic ease with s(0)=0, s(1)=1, zero end velocity/acceleration and initial slope v0. */
export function easeFrom(t: number, v0 = 0): number {
  const v = clamp(v0, 0, 1.6); const a = 6 - 3 * v, b = 8 * v - 15, c = 10 - 6 * v;
  const t2 = t * t, t3 = t2 * t;
  return clamp(a * t3 * t2 + b * t2 * t2 + c * t3 + v * t, 0, 1);
}
export const dampAlpha = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);

export function orbitPosition(o: OrbitState, out = new THREE.Vector3()): THREE.Vector3 {
  const sp = Math.sin(o.pol);
  return out.set(o.target.x + o.dist * sp * Math.sin(o.az), o.target.y + o.dist * Math.cos(o.pol), o.target.z + o.dist * sp * Math.cos(o.az));
}
export function lookQuat(yaw: number, pitch: number, out = new THREE.Quaternion()): THREE.Quaternion {
  return out.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
}
/** yaw/pitch that look from `eye` toward `at` (yaw 0 = north / -Z). */
export function aimAt(eye: THREE.Vector3, at: THREE.Vector3): { yaw: number; pitch: number } {
  const dx = at.x - eye.x, dy = at.y - eye.y, dz = at.z - eye.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

interface Tween { from: number; to: number; t: number; dur: number; resolve?: (done: boolean) => void }

interface Trip {
  opts: TripOptions; token: number; t: number; dur: number; v0: number;
  kind: 'orbit' | 'path' | 'cut';
  dest: Dest;
  // orbit kind
  oFrom?: OrbitState;
  // path kind
  curve?: THREE.CatmullRomCurve3; qFrom?: THREE.Quaternion; qTo?: THREE.Quaternion; fovFrom?: number; yawFrom?: number; pitchFrom?: number;
  // cut kind
  cutStage?: 0 | 1;
  record: TripRecord;
}

export class MotionDirector {
  phase: MotionPhase = 'IDLE';
  rig: Rig = 'orbit';
  reduced = false;
  readonly orbit: OrbitState = { target: new THREE.Vector3(0, 21, 0), az: -0.66, pol: 1.34, dist: 96, fov: 32 };
  limits: OrbitLimits = { minDist: 50, maxDist: 170, minPol: 0.5, maxPol: 1.5 };
  readonly look: LookState = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, fov: 64 };

  // inertia
  private velAz = 0; private velPol = 0; private goalDist = 96;
  private velYaw = 0; private velPitch = 0;
  private dragging = false;
  // walking (look rig only)
  walkEnabled = false;
  private move = { f: 0, s: 0, turn: 0, run: false };
  private walkVel = new THREE.Vector2();
  private autoPath: THREE.Vector3[] = []; private autoT = 0;
  collide: ((x: number, z: number) => [number, number]) | null = null;

  private trip: Trip | null = null;
  private token = 0;
  private tweens = new Map<string, Tween>();
  private values = new Map<string, number>();
  private lastPos = new THREE.Vector3(); private speed = 0;
  private dirty = true;
  /** completed trip records (ring buffer) for the motion HUD / benchmark export */
  readonly records: TripRecord[] = [];
  onPhase: ((p: MotionPhase, tripId: string | null) => void) | null = null;
  /** counts for lifecycle evidence */
  stats = { tripsStarted: 0, tripsCompleted: 0, retargets: 0, cuts: 0, cancelledByUser: 0 };

  constructor(readonly camera: THREE.PerspectiveCamera) { this.writeCamera(); this.lastPos.copy(camera.position); }

  // ------------------------------------------------------------------ animated scalars
  value(name: string, fallback = 0) { return this.values.get(name) ?? fallback; }
  setValue(name: string, v: number) { this.tweens.get(name)?.resolve?.(false); this.tweens.delete(name); this.values.set(name, v); this.dirty = true; }
  /** Animate a scalar; resolves true when it finished, false when superseded. */
  animate(name: string, to: number, seconds: number): Promise<boolean> {
    const prev = this.tweens.get(name); prev?.resolve?.(false);
    const from = this.value(name);
    if (this.reduced || seconds <= 0 || Math.abs(from - to) < 1e-4) { this.tweens.delete(name); this.values.set(name, to); this.dirty = true; return Promise.resolve(true); }
    return new Promise((resolve) => { this.tweens.set(name, { from, to, t: 0, dur: seconds, resolve }); });
  }

  /** Veil-style tween that runs even in reduced motion (it is non-spatial). */
  private tweenRaw(name: string, from: number, to: number, seconds: number) {
    this.tweens.get(name)?.resolve?.(false);
    this.values.set(name, from); this.tweens.set(name, { from, to, t: 0, dur: Math.max(0.001, seconds) });
  }

  // ------------------------------------------------------------------ intents
  private setPhase(p: MotionPhase) { if (this.phase !== p) { this.phase = p; this.onPhase?.(p, this.trip?.opts.id ?? null); } }
  get busy() { return this.trip !== null; }
  get currentTripId() { return this.trip?.opts.id ?? null; }

  /** Current rendered pose regardless of owner (used to retarget without snapping). */
  private currentOrbitState(): OrbitState | null {
    if (this.trip?.kind === 'orbit' && this.trip.oFrom) return this.interpOrbit(this.trip, easeFrom(this.trip.t, this.trip.v0));
    if (!this.trip && this.rig === 'orbit') return { ...this.orbit, target: this.orbit.target.clone() };
    return null;
  }

  go(dest: Dest, opts: TripOptions): number {
    const token = ++this.token;
    const wasBusy = this.trip !== null;
    if (wasBusy) { this.finishRecord(this.trip!, true); this.stats.retargets++; this.setPhase('CANCELLING'); }
    this.stats.tripsStarted++;
    this.autoPath = []; this.walkVel.set(0, 0);
    const record: TripRecord = { id: opts.id, startedAt: performance.now(), durationMs: 0, frames: [], interrupted: false, reduced: this.reduced, kind: '' };
    const startPos = this.camera.position.clone(); const startQ = this.camera.quaternion.clone(); const startFov = this.camera.fov;

    if (this.reduced || opts.cut) {
      // semantic transition: brief veil, then the destination pose — no spatial flight
      const inDur = this.reduced ? 0.07 : 0.15;
      this.trip = { opts, token, t: 0, dur: inDur, v0: 0, kind: 'cut', dest, cutStage: 0, record };
      record.kind = this.reduced ? 'reduced' : 'cut'; this.stats.cuts++;
      this.setPhase(this.reduced ? 'REDUCED_MOTION' : 'PLAYING');
      this.tweenRaw('veil', this.value('veil'), 1, inDur);
      return token;
    }

    const from = this.currentOrbitState();
    if (dest.rig === 'orbit' && from) {
      const endPos = orbitPosition(dest.state); const chord = startPos.distanceTo(endPos);
      const dAz = Math.abs(wrapPi(dest.state.az - from.az));
      const dur = clamp(0.62 + chord * 0.009 + dAz * 0.22, opts.band[0], opts.band[1]);
      this.trip = { opts, token, t: 0, dur, v0: clamp((this.speed * dur) / Math.max(chord, 0.5), 0, 1.4), kind: 'orbit', dest, oFrom: from, record };
      record.kind = 'orbit';
    } else {
      const end = dest.rig === 'orbit' ? orbitPosition(dest.state) : dest.state.pos.clone();
      const via = dest.via ?? [];
      const pts = [startPos, ...via, end].filter((p, i, a) => i === 0 || p.distanceToSquared(a[i - 1]) > 1e-4);
      if (pts.length < 2) pts.push(end.clone().add(new THREE.Vector3(0, 0.001, 0)));
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const len = curve.getLength();
      const qTo = new THREE.Quaternion();
      if (dest.rig === 'orbit') { const m = new THREE.Matrix4().lookAt(end, dest.state.target, new THREE.Vector3(0, 1, 0)); qTo.setFromRotationMatrix(m); }
      else lookQuat(dest.state.yaw, dest.state.pitch, qTo);
      const dur = clamp(0.55 + len * 0.085, opts.band[0], opts.band[1]);
      const e = new THREE.Euler().setFromQuaternion(startQ, 'YXZ');
      this.trip = { opts, token, t: 0, dur, v0: clamp((this.speed * dur) / Math.max(len, 0.5), 0, 1.4), kind: 'path', dest, curve, qFrom: startQ, qTo, fovFrom: startFov, yawFrom: e.y, pitchFrom: e.x, record };
      record.kind = dest.rig === 'look' && dest.lookAlong ? 'path-lookalong' : 'path';
    }
    this.setPhase('PLAYING');
    return token;
  }

  /** Jump the active trip to its end state (Skip). */
  finishNow() { if (this.trip) { this.trip.t = 1; this.arrive(this.trip); } }
  pause() { if (this.trip && this.phase === 'PLAYING') this.setPhase('PAUSED'); }
  resume() { if (this.trip && this.phase === 'PAUSED') this.setPhase('PLAYING'); }

  /** Place the camera immediately (initial state / recovery). */
  snap(dest: Dest) {
    if (this.trip) { this.finishRecord(this.trip, true); this.trip = null; }
    this.applyDest(dest); this.setPhase('IDLE'); this.dirty = true;
  }

  private applyDest(dest: Dest) {
    if (dest.rig === 'orbit') {
      this.rig = 'orbit'; this.orbit.target.copy(dest.state.target); this.orbit.az = dest.state.az; this.orbit.pol = dest.state.pol; this.orbit.dist = dest.state.dist; this.orbit.fov = dest.state.fov;
      this.limits = dest.limits; this.goalDist = dest.state.dist; this.velAz = this.velPol = 0;
    } else {
      this.rig = 'look'; this.look.pos.copy(dest.state.pos); this.look.yaw = dest.state.yaw; this.look.pitch = dest.state.pitch; this.look.fov = dest.state.fov;
      this.velYaw = this.velPitch = 0; this.walkVel.set(0, 0);
    }
  }

  private finishRecord(trip: Trip, interrupted: boolean) {
    trip.record.durationMs = performance.now() - trip.record.startedAt; trip.record.interrupted = interrupted;
    this.records.push(trip.record); if (this.records.length > 200) this.records.shift();
  }

  private arrive(trip: Trip) {
    this.applyDest(trip.dest);
    this.finishRecord(trip, false); this.stats.tripsCompleted++;
    this.trip = null; this.setPhase('IDLE'); this.dirty = true;
    trip.opts.onArrive?.();
  }

  private interpOrbit(trip: Trip, s: number): OrbitState {
    const a = trip.oFrom!, b = (trip.dest as Extract<Dest, { rig: 'orbit' }>).state;
    return {
      target: a.target.clone().lerp(b.target, s), az: a.az + wrapPi(b.az - a.az) * s, pol: lerp(a.pol, b.pol, s),
      dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), s)), fov: lerp(a.fov, b.fov, s),
    };
  }

  // ------------------------------------------------------------------ user input (one owner)
  dragStart() {
    this.dragging = true; this.velAz = this.velPol = this.velYaw = this.velPitch = 0;
    // a drag during a directed ORBIT move hands control to the visitor from the current pose
    if (this.trip?.kind === 'orbit') {
      const cur = this.interpOrbit(this.trip, easeFrom(this.trip.t, this.trip.v0));
      const dest = this.trip.dest as Extract<Dest, { rig: 'orbit' }>;
      const done = this.trip; this.trip = null; this.finishRecord(done, true); this.stats.cancelledByUser++;
      this.applyDest({ rig: 'orbit', state: cur, limits: dest.limits });
      // keep easing the distance/target toward the intended framing while the user rotates
      this.goalDist = dest.state.dist; this.pendingTarget = dest.state.target.clone();
      this.setPhase('IDLE'); done.opts.onArrive?.();
    }
    this.autoPath = [];
  }
  private pendingTarget: THREE.Vector3 | null = null;
  drag(dxPx: number, dyPx: number, dt: number, viewportH: number) {
    if (this.trip) return;
    const k = (this.rig === 'orbit' ? 2.6 : 1.5 * (this.look.fov / 64)) / Math.max(320, viewportH);
    const da = -dxPx * k, dp = -dyPx * k; const inv = 1 / Math.max(dt, 1 / 240);
    if (this.rig === 'orbit') {
      this.orbit.az = wrapPi(this.orbit.az + da); this.orbit.pol = clamp(this.orbit.pol + dp, this.limits.minPol, this.limits.maxPol);
      this.velAz = lerp(this.velAz, da * inv, 0.35); this.velPol = lerp(this.velPol, dp * inv, 0.35);
    } else {
      // look rig: dragging "grabs" the view, so the scene follows the finger
      this.look.yaw = wrapPi(this.look.yaw - da); this.look.pitch = clamp(this.look.pitch - dp, -1.05, 1.05);
      this.velYaw = lerp(this.velYaw, -da * inv, 0.35); this.velPitch = lerp(this.velPitch, -dp * inv, 0.35);
    }
    this.dirty = true;
  }
  dragEnd() { this.dragging = false; }
  zoom(factor: number) {
    if (this.trip) return;
    if (this.rig === 'orbit') this.goalDist = clamp(this.goalDist * factor, this.limits.minDist, this.limits.maxDist);
    else this.look.fov = clamp(this.look.fov * (1 + (factor - 1) * 0.5), 42, 74);
    this.dirty = true;
  }
  setMove(f: number, s: number, turn: number, run: boolean) { this.move = { f, s, turn, run }; if (f || s) this.autoPath = []; }
  /** Glide along collision-safe waypoints (tap-to-move / guided hop). */
  walkAlong(points: THREE.Vector3[]) { this.autoPath = points.slice(); this.autoT = 0; }
  get walking() { return this.autoPath.length > 0 || this.walkVel.lengthSq() > 1e-4; }
  stopAll() { this.autoPath = []; this.walkVel.set(0, 0); this.velAz = this.velPol = this.velYaw = this.velPitch = 0; this.move = { f: 0, s: 0, turn: 0, run: false }; }

  // ------------------------------------------------------------------ frame
  /** Advance by dtRaw seconds. Returns true when the frame must be rendered. */
  update(dtRaw: number): boolean {
    const dt = clamp(dtRaw, 0, MAX_DT);
    let moved = this.dirty; this.dirty = false;

    for (const [name, tw] of this.tweens) {
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = tw.t * tw.t * (3 - 2 * tw.t);
      this.values.set(name, lerp(tw.from, tw.to, k)); moved = true;
      if (tw.t >= 1) { this.tweens.delete(name); tw.resolve?.(true); }
    }

    const trip = this.trip;
    if (trip && this.phase !== 'PAUSED') {
      trip.record.frames.push(dtRaw * 1000);
      trip.t = Math.min(1, trip.t + dt / trip.dur);
      if (trip.kind === 'cut') {
        if (trip.t >= 1) {
          if (trip.cutStage === 0) {
            this.applyDest(trip.dest); trip.cutStage = 1; trip.t = 0; trip.dur = this.reduced ? 0.12 : 0.22;
            this.values.set('veil', 1); this.tweenRaw('veil', 1, 0, trip.dur); trip.opts.onMid?.();
          } else this.arrive(trip);
        }
        moved = true;
      } else if (trip.kind === 'orbit') {
        const s = easeFrom(trip.t, trip.v0); const o = this.interpOrbit(trip, s);
        this.orbit.target.copy(o.target); this.orbit.az = o.az; this.orbit.pol = o.pol; this.orbit.dist = o.dist; this.orbit.fov = o.fov; this.rig = 'orbit';
        moved = true; if (trip.t >= 1) this.arrive(trip);
      } else {
        const s = easeFrom(trip.t, trip.v0);
        const p = trip.curve!.getPointAt(s); const q = new THREE.Quaternion();
        const dest = trip.dest;
        if (dest.rig === 'look' && dest.lookAlong) {
          // glance along the direction of travel in the middle of the move, settle on the target view
          const tan = trip.curve!.getTangentAt(clamp(s, 0.001, 0.999));
          const yawT = Math.atan2(-tan.x, -tan.z); const w = Math.sin(Math.PI * s) * 0.8;
          const baseYaw = trip.yawFrom! + wrapPi(dest.state.yaw - trip.yawFrom!) * s;
          const yaw = baseYaw + wrapPi(yawT - baseYaw) * w; const pitch = lerp(trip.pitchFrom!, dest.state.pitch, s) * (1 - w * 0.5);
          lookQuat(yaw, pitch, q);
        } else {
          const sr = easeFrom(clamp(trip.t * 1.12, 0, 1), trip.v0); // orientation leads the position slightly
          q.slerpQuaternions(trip.qFrom!, trip.qTo!, sr);
        }
        const fovTo = dest.rig === 'orbit' ? dest.state.fov : dest.state.fov;
        this.camera.position.copy(p); this.camera.quaternion.copy(q);
        const fov = lerp(trip.fovFrom!, fovTo, s);
        if (Math.abs(this.camera.fov - fov) > 1e-3) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
        this.trackSpeed(dt); moved = true;
        if (trip.t >= 1) { this.arrive(trip); this.writeCamera(); }
        return true;
      }
    } else if (!trip) {
      if (this.rig === 'orbit') moved = this.updateOrbit(dt) || moved;
      else moved = this.updateLook(dt) || moved;
    }
    if (moved) { this.writeCamera(); this.trackSpeed(dt); } else this.speed = 0;
    return moved;
  }

  private trackSpeed(dt: number) {
    if (dt > 1e-5) this.speed = lerp(this.speed, this.camera.position.distanceTo(this.lastPos) / dt, 0.5);
    this.lastPos.copy(this.camera.position);
  }

  private updateOrbit(dt: number): boolean {
    let moved = false; const o = this.orbit;
    if (!this.dragging) {
      if (Math.abs(this.velAz) > 1e-4 || Math.abs(this.velPol) > 1e-4) {
        o.az = wrapPi(o.az + this.velAz * dt); o.pol = clamp(o.pol + this.velPol * dt, this.limits.minPol, this.limits.maxPol);
        const decay = Math.exp(-5.2 * dt); this.velAz *= decay; this.velPol *= decay; moved = true;
      } else { this.velAz = this.velPol = 0; }
    }
    if (Math.abs(this.goalDist - o.dist) > 0.002) { o.dist = lerp(o.dist, this.goalDist, dampAlpha(9, dt)); moved = true; }
    if (this.pendingTarget) {
      o.target.lerp(this.pendingTarget, dampAlpha(6, dt)); moved = true;
      if (o.target.distanceToSquared(this.pendingTarget) < 1e-4) { o.target.copy(this.pendingTarget); this.pendingTarget = null; }
    }
    return moved;
  }

  private updateLook(dt: number): boolean {
    let moved = false; const l = this.look;
    if (!this.dragging && (Math.abs(this.velYaw) > 1e-4 || Math.abs(this.velPitch) > 1e-4)) {
      l.yaw = wrapPi(l.yaw + this.velYaw * dt); l.pitch = clamp(l.pitch + this.velPitch * dt, -1.05, 1.05);
      const decay = Math.exp(-7 * dt); this.velYaw *= decay; this.velPitch *= decay; moved = true;
    }
    if (this.move.turn) { l.yaw = wrapPi(l.yaw + this.move.turn * 1.5 * dt); moved = true; }
    if (!this.walkEnabled && this.autoPath.length === 0) return moved;

    const target = new THREE.Vector2();
    if (this.autoPath.length) {
      this.autoT += dt;
      const next = this.autoPath[0]; const dx = next.x - l.pos.x, dz = next.z - l.pos.z; const d = Math.hypot(dx, dz);
      const last = this.autoPath[this.autoPath.length - 1]; const remain = Math.hypot(last.x - l.pos.x, last.z - l.pos.z);
      if (d < 0.14) { this.autoPath.shift(); if (!this.autoPath.length) target.set(0, 0); }
      else {
        const v = 1.75 * Math.min(1, this.autoT / 0.35) * clamp(remain / 0.9, 0.25, 1);
        target.set((dx / d) * v, (dz / d) * v);
      }
      if (this.autoT > 14) this.autoPath = [];
    } else if (this.walkEnabled && (this.move.f || this.move.s)) {
      const sp = this.move.run ? 2.5 : 1.5; const sin = Math.sin(l.yaw), cos = Math.cos(l.yaw);
      const fx = -sin, fz = -cos, rx = cos, rz = -sin; let vx = fx * this.move.f + rx * this.move.s, vz = fz * this.move.f + rz * this.move.s;
      const n = Math.hypot(vx, vz); if (n > 1) { vx /= n; vz /= n; }
      target.set(vx * sp, vz * sp);
    }
    this.walkVel.lerp(target, dampAlpha(9, dt));
    if (this.walkVel.lengthSq() > 1e-5) {
      let nx = l.pos.x + this.walkVel.x * dt, nz = l.pos.z + this.walkVel.y * dt;
      if (this.collide) [nx, nz] = this.collide(nx, nz);
      l.pos.x = nx; l.pos.z = nz; moved = true;
    } else this.walkVel.set(0, 0);
    return moved;
  }

  private writeCamera() {
    const c = this.camera;
    if (this.rig === 'orbit') {
      orbitPosition(this.orbit, c.position); c.up.set(0, 1, 0); c.lookAt(this.orbit.target);
      if (Math.abs(c.fov - this.orbit.fov) > 1e-3) { c.fov = this.orbit.fov; c.updateProjectionMatrix(); }
    } else {
      c.position.copy(this.look.pos); lookQuat(this.look.yaw, this.look.pitch, c.quaternion);
      if (Math.abs(c.fov - this.look.fov) > 1e-3) { c.fov = this.look.fov; c.updateProjectionMatrix(); }
    }
  }
  invalidate() { this.dirty = true; }
  /** Slow, opt-in cinematic drift applied by the director itself (keeps one camera writer). */
  drift(radPerSec: number, dt: number) {
    if (this.trip || this.dragging) return;
    const d = radPerSec * Math.min(dt, MAX_DT);
    if (this.rig === 'orbit') this.orbit.az = wrapPi(this.orbit.az + d); else this.look.yaw = wrapPi(this.look.yaw + d);
    this.dirty = true;
  }
}

/** Frame-time statistics for a list of frame durations (ms). */
export function frameStats(frames: number[]) {
  if (!frames.length) return { n: 0, p50: 0, p95: 0, p99: 0, max: 0, hitches50: 0, fpsMedian: 0 };
  const s = [...frames].sort((a, b) => a - b); const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const p50 = q(0.5);
  return { n: s.length, p50: +p50.toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +s[s.length - 1].toFixed(2), hitches50: s.filter((f) => f > 50).length, fpsMedian: +(1000 / Math.max(p50, 0.01)).toFixed(1) };
}
