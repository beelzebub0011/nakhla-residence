import * as THREE from 'three';
import type { FloorId, Prim, Rect } from '../domain/types';
import { FLOORS, FLOOR_BY_ID, FLOOR_IDS, ROOF_LEVEL, SLAB, UNIT_BY_ID, toWorldX, toWorldZ } from '../domain/tower';
import { UNIT_BOUNDS, getFloorPlan, type PlacedRoom } from '../domain/plans';
import { buildFloorInterior, buildFloorShell, buildRoof, pergolaPosts } from '../domain/prims';
import { EYE_HEIGHT, buildNav as buildNavGraph, resolveCollision, roomAt, safeEye, segmentClear, waypoints } from '../domain/nav';
import { MATERIAL_BY_ID, SURFACES, resolveSurfaceMaterial } from '../domain/materials';
import { useStore, sideOf, type AppState, type Tier } from '../state/store';
import { getAnchors, type Anchor } from '../state/anchors';
import { CHAPTERS } from '../state/chapters';
import { VIEW_BY_ID } from '../domain/views';
import { FIXED, MatLib } from './matlib';
import { buildMeshes, disposeBuilt, mergeBuckets, meshesFromBuckets, type Built, type MergedBucket } from './builder';
import { Environment } from './environment';
import { buildSite, type Site } from './site';
import { LIGHTMAPS } from './lightmaps';
import { MotionDirector, aimAt, frameStats, type Dest, type OrbitLimits, type TripOptions } from './motion';
import { disposeTextureCache, hasTextureSet, setPhotoLoadedHook, textureCacheSize } from './textures';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { furnishFloor } from '../domain/furniture';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
/** automated captures / tests: the world holds still (traffic stays at its t = 0 arrangement, as rendered by Cycles) */
const FROZEN_WORLD = typeof location !== 'undefined' && /[?&]e2e=1/.test(location.search) && !/[?&]live=1/.test(location.search);

// ---------------------------------------------------------------------------------------------
// Engine: one renderer, one RAF loop, one MotionDirector. Renders on demand (no idle 60 fps),
// builds interiors lazily, keeps a single live interior per floor category and disposes on exit.
// ---------------------------------------------------------------------------------------------

const TIER_CFG: Record<Exclude<Tier, 'lite'>, { dpr: number; shadows: boolean; shadowSize: number; tex: number; aniso: number; particles: boolean }> = {
  low: { dpr: 1, shadows: false, shadowSize: 512, tex: 256, aniso: 2, particles: false },
  balanced: { dpr: 1.3, shadows: true, shadowSize: 2048, tex: 512, aniso: 4, particles: true },
  high: { dpr: 1.8, shadows: true, shadowSize: 2048, tex: 512, aniso: 8, particles: true },
  ultra: { dpr: 2, shadows: true, shadowSize: 4096, tex: 1024, aniso: 16, particles: true },
};
const LIFT = 22;
/** colour of daylight after its first bounce off warm interior finishes */
const WARM_BOUNCE = new THREE.Color('#ffd4a6');
const TOWER_LIMITS: OrbitLimits = { minDist: 52, maxDist: 190, minPol: 0.45, maxPol: 1.5 };
const FLOOR_LIMITS: OrbitLimits = { minDist: 14, maxDist: 90, minPol: 0.1, maxPol: 1.32 };
const UNIT_LIMITS: OrbitLimits = { minDist: 7, maxDist: 52, minPol: 0.08, maxPol: 1.28 };

export interface LabelPos { id: string; x: number; y: number; hidden: boolean }
export interface EngineHooks {
  onLabels?(list: LabelPos[]): void;
  onVeil?(v: number): void;
  onFloorTip?(tip: { floorId: FloorId; x: number; y: number } | null): void;
}

interface FloorNode { id: FloorId; group: THREE.Group; fill: THREE.Group | undefined; ghosted: boolean }

export function detectTier(): Exclude<Tier, 'lite'> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = matchMedia('(pointer: coarse)').matches; const mem = nav.deviceMemory ?? 8; const cores = nav.hardwareConcurrency ?? 4;
  if (mem <= 2 || cores <= 2) return 'low';
  if (coarse) return mem >= 6 && cores >= 8 ? 'balanced' : 'low';
  if (mem >= 8 && cores >= 8) return 'high';
  return 'balanced';
}

// ---- interior geometry worker (module level so it can start before the engine exists)
let primWorker: Worker | null = null; const primJobs = new Map<number, (p: MergedBucket[]) => void>(); let primSeq = 0;
const bucketCache = new Map<string, Promise<MergedBucket[]>>();
/** diagnostics: time the worker spent building / merging each interior, and when the main thread received it */
/** boot diagnostics: [label, ms since navigation start] */
export const bootLog: [string, number][] = [];
const boot = (label: string) => bootLog.push([label, Math.round(performance.now())]);
export const requestedAt: number[] = [];
export const workerTimings: { build: number; merge: number; workerStart: number; receivedAt: number }[] = [];
/** Interior draw batches of a floor category, built and merged in a worker (main-thread fallback if workers fail). Cached until consumed. */
function requestBuckets(f: FloorId): Promise<MergedBucket[]> {
  const key = FLOOR_BY_ID[f].category; const hit = bucketCache.get(key); if (hit) return hit;
  const job = new Promise<MergedBucket[]>((resolve) => {
    try {
      if (!primWorker) {
        primWorker = new Worker(new URL('./prims.worker.ts', import.meta.url), { type: 'module' });
        primWorker.onmessage = (e: MessageEvent<{ id: number; buckets: MergedBucket[]; ms?: { build: number; merge: number; workerStart: number } }>) => { workerTimings.push({ ...(e.data.ms ?? { build: 0, merge: 0, workerStart: 0 }), receivedAt: Math.round(performance.now()) }); primJobs.get(e.data.id)?.(e.data.buckets); primJobs.delete(e.data.id); };
        primWorker.onerror = () => { const jobs = [...primJobs.values()]; primJobs.clear(); primWorker = null; for (const j of jobs) j([]); };
      }
      requestedAt.push(Math.round(performance.now()));
      const id = ++primSeq; primJobs.set(id, (b) => resolve(b.length ? b : mergeBuckets(buildFloorInterior(f))));
      primWorker.postMessage({ id, f });
    } catch { resolve(mergeBuckets(buildFloorInterior(f))); }
  });
  bucketCache.set(key, job); return job;
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.12, 5200);
  private trafficT = 0;
  private lensShift = 0;
  /** id of the street-level bookmark the visitor is looking from (null = normal orbit) */
  streetView: string | null = null;
  readonly director = new MotionDirector(this.camera);
  readonly lib: MatLib;
  readonly env: Environment;
  private site: Site;
  private floors = {} as Record<FloorId, FloorNode>;
  private roof!: THREE.Group; private roofGhosted = false;
  private interiors = new Map<string, Built>();
  private interiorHolder = new THREE.Group();
  private activeInterior: Built | null = null;
  private exploded: FloorId | null = null;
  private fillLights: THREE.PointLight[] = [];
  private hl!: { floor: THREE.Mesh; area: THREE.Mesh[]; surf: THREE.Group; floorOpacity: number; floorTarget: number; areaOpacity: number; areaTarget: number };
  private raf = 0; private last = 0; private running = false; private disposed = false;
  private needsRender = true; private shadowDirty = true;
  private transToken = 0;
  private anchors: Anchor[] = []; private labelsDirty = true;
  private pointers = new Map<number, { x: number; y: number }>(); private downAt: { x: number; y: number; t: number } | null = null; private dragged = false; private pinchDist = 0; private lastMoveT = 0;
  private keys = new Set<string>();
  private unsub: (() => void)[] = [];
  private ro: ResizeObserver;
  private tierCfg: (typeof TIER_CFG)['balanced'];
  private insideTarget = 0; private walkRoomUpdate = false;
  private cine = { t: 0, snapshot: null as Partial<AppState> | null, chapter: -1 };
  private frameLog: number[] = []; private windowSlow = 0; private windowFast = 0; private windowStart = 0; private windowFrames: number[] = [];
  private fadeOverlays: { mesh: THREE.Mesh; mat: THREE.Material; t: number }[] = [];
  private time = 0;
  private lastVeil = -1;
  /** interior post chain (ambient occlusion) — high / ultra tiers only, built on first use */
  private post: { composer: EffectComposer; gtao: GTAOPass } | null = null; private postTier = false;
  readonly counters = { renders: 0, interiorBuilds: 0, interiorDisposals: 0, contextLost: 0, contextRestored: 0 };

  /** Prepare the exterior texture sets in the worker, then construct (first frame never blocks on synthesis). */
  static async create(canvas: HTMLCanvasElement, hooks: EngineHooks, tier: Exclude<Tier, 'lite'>): Promise<Engine> {
    boot('create'); const cfg = TIER_CFG[tier]; const probe = new MatLib(cfg.tex, cfg.aniso);
    // cold-start head start: the first apartment floor's geometry (worker) and every interior texture begin loading now,
    // in parallel with the tower build, instead of when the visitor first opens a floor
    void probe.prepareSlots(Object.keys(FIXED).filter((k) => { const d = FIXED[k]; return d.t === 'tex' && d.recipe.type === 'photo'; }));   // scanned sets: fetch + decode off-thread now
    void requestBuckets('F04').then((b) => probe.prepareSlots(b.map((x) => x.mat)));                                                     // then exactly the finishes that floor needs
    await probe.prepareSlots(['stone', 'stone_base', 'paving_balcony', 'paving_dark', 'deck_wood', 'ground', 'plaza', 'asphalt', 'ctx_a', 'ctx_b', 'ctx_c', 'grass', 'hedge', 'teak', 'fabric_outdoor', 'linen_white', 'rug_outdoor', 'stone_top', 'pot', 'pot_white']);
    boot('exterior textures ready'); const e = new Engine(canvas, hooks, tier); boot('constructed');
    await e.warmStart(); boot('exterior shaders compiled (async)');
    return e;
  }

  constructor(private canvas: HTMLCanvasElement, private hooks: EngineHooks, tier: Exclude<Tier, 'lite'>) {
    // V11 street view: a vertical lens shift (architectural photography, same as the Cycles cameras) applied on top of
    // every projection update; 0 everywhere else
    { const cam = this.camera; const upd = cam.updateProjectionMatrix.bind(cam);
      cam.updateProjectionMatrix = () => { upd(); if (this.lensShift) { cam.projectionMatrix.elements[9] += 2 * this.lensShift; cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert(); } }; }
    this.tierCfg = TIER_CFG[tier];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping; // V11.5: Khronos PBR Neutral (true hues; AgX bleached sky and plaster to white). Cycles uses the same view transform
    this.postTier = tier === 'high' || tier === 'ultra';
    setPhotoLoadedHook(() => { this.needsRender = true; });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap; this.renderer.shadowMap.autoUpdate = false;
    this.renderer.setClearColor('#131716');
    this.lib = new MatLib(this.tierCfg.tex, Math.min(this.tierCfg.aniso, this.renderer.capabilities.getMaxAnisotropy()));
    const s = useStore.getState();
    this.lib.applyAll(s.packageId, s.overrides);
    boot('renderer'); this.env = new Environment(this.renderer, this.scene, s.env); boot('environment');
    this.env.configureShadows(this.tierCfg.shadowSize, this.tierCfg.shadows); this.env.particlesEnabled = this.tierCfg.particles;
    this.site = buildSite(this.lib, this.tierCfg.shadows); this.scene.add(this.site.root); boot('site');
    this.buildTower(); boot('tower');
    this.buildHelpers();
    this.director.reduced = s.motionPref === 'reduced';
    this.director.onPhase = (p) => { if (useStore.getState().motionPhase !== p) useStore.setState({ motionPhase: p }); };
    this.director.collide = (x, z) => this.collide(x, z);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.bindInput();
    this.applyState(s, null, true);
    this.unsub.push(useStore.subscribe((st, prev) => this.onState(st, prev)));
    canvas.addEventListener('webglcontextlost', this.onLost, false);
    canvas.addEventListener('webglcontextrestored', this.onRestored, false);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /**
   * Compile every exterior shader BEFORE the first frame, without blocking: the browser compiles in parallel while the
   * landing screen stays responsive. Previously the first frame froze the page for ~1.2 s doing this synchronously,
   * which also delayed the interior worker's reply and every texture behind it.
   */
  private async warmStart() {
    try {
      const s = useStore.getState(); const f = s.floorId ? FLOOR_BY_ID[s.floorId] : null;
      this.director.update(0); this.camera.updateMatrixWorld(true);
      this.env.update(0, new THREE.Vector3(0, f ? f.ffl : 22, 0), 46);          // sky + reflection map exist, so the compiled variants are the real ones
      this.lib.setNight(this.env.night);
      await this.renderer.compileAsync(this.scene, this.camera);
      if (this.postTier) await this.precompilePost();
    } catch { /* optimisation only */ }
  }

  /**
   * Inside rooms the scene is drawn into the ambient-occlusion render target, whose LINEAR output needs its own
   * variant of every shader. Compile those variants ahead (otherwise the first room entry froze for ~2 s).
   * The render target is set only for the synchronous part of the call; the frame loop never sees it.
   */
  private async compileForTarget(root: THREE.Object3D, onlyNew = false) {
    if (!this.postTier) return;
    const po = this.ensurePost(); const prev = this.renderer.getRenderTarget();
    let job: Promise<unknown> = Promise.resolve();
    try {
      this.renderer.setRenderTarget(po.composer.renderTarget1);
      job = this.renderer.compileAsync(root, this.camera, onlyNew ? this.scene : undefined);
    } catch { /* optimisation only */ } finally { this.renderer.setRenderTarget(prev); }
    try { await job; } catch { /* optimisation only */ }
  }
  /** Ghost (fading) material variants used while the upper floors lift away: compile them before the first floor open. */
  /** Variants needed only once the visitor opens a floor / enters a room: compiled in the background after the tower is
   *  on screen; the first floor opening (behind its veil) waits for this instead of freezing. */
  private variantsReady: Promise<void> | null = null;
  private startVariants() {
    if (this.variantsReady) return this.variantsReady;
    this.variantsReady = (async () => {
      await this.pace('variants');
      await this.compileGhosts(); boot('variants: ghosts');
      if (this.postTier && !this.disposed) {
        // one proxy mesh per distinct (material, attribute layout, instancing) — compiled a few per quiet frame
        const proxies: THREE.Mesh[] = []; const seen = new Set<string>();
        this.scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || Array.isArray(m.material)) return; const k = `${(m.material as THREE.Material).uuid}|${Object.keys(m.geometry.attributes).join(',')}|${(m as THREE.InstancedMesh).isInstancedMesh ? 1 : 0}`; if (seen.has(k)) return; seen.add(k);
          const pm = (m as THREE.InstancedMesh).isInstancedMesh ? new THREE.InstancedMesh(m.geometry, m.material, 1) : new THREE.Mesh(m.geometry, m.material); pm.frustumCulled = false; proxies.push(pm); });
        for (let i = 0; i < proxies.length && !this.disposed; i += 8) { await this.pace('variants'); const g = new THREE.Group(); for (const pm of proxies.slice(i, i + 8)) g.add(pm); await this.compileForTarget(g, true); g.clear(); }
        boot('variants: render-target');
        // one silent pass through the ambient-occlusion chain compiles its internal normal / depth / output shaders
        await this.precompilePost(); boot('variants: AO shaders (async)');
        await this.pace('variants'); const po = this.ensurePost(); po.gtao.blendIntensity = 0; po.composer.render(); this.needsRender = true; boot('variants: AO pass');
      }
    })();
    return this.variantsReady;
  }

  private async compileGhosts() {
    const proxy = new THREE.Scene(); const seen = new Set<string>();
    for (const node of Object.values(this.floors)) node.group.traverse((o) => {
      const m = o as THREE.Mesh; const slot = m.userData?.slot as string | undefined;
      if (!m.isMesh || !slot || seen.has(slot)) return; seen.add(slot);
      const g = new THREE.Mesh(m.geometry, this.lib.ghost(slot)); g.matrixAutoUpdate = false; g.matrix.copy(m.matrixWorld); g.matrixWorld.copy(m.matrixWorld); proxy.add(g);
    });
    this.roof.traverse((o) => { const m = o as THREE.Mesh; const slot = m.userData?.slot as string | undefined; if (m.isMesh && slot && !seen.has(slot)) { seen.add(slot); proxy.add(new THREE.Mesh(m.geometry, this.lib.ghost(slot))); } });
    const all = [...proxy.children]; proxy.clear();
    for (let i = 0; i < all.length && !this.disposed; i += 6) {
      await this.pace('variants'); const g = new THREE.Scene(); for (const c of all.slice(i, i + 6)) g.add(c);
      try { await this.renderer.compileAsync(g, this.camera, this.scene); } catch { /* optimisation only */ }
      if (this.postTier) await this.compileForTarget(g, true);
      g.clear();
    }
  }

  /** Compile the ambient-occlusion / output pass shaders in the background (they used to compile inside the first interior frame: ~0.9 s). */
  private async precompilePost() {
    const po = this.ensurePost(); const mats = new Set<THREE.Material>();
    for (const pass of po.composer.passes) for (const v of Object.values(pass as unknown as Record<string, unknown>)) {
      const m = v as (THREE.Material & { material?: THREE.Material }) | null | undefined;
      if (m && m.isMaterial) mats.add(m);
      if (m && m.material && m.material.isMaterial) mats.add(m.material);
    }
    // V11.3 Gate 1: the chain draws into LINEAR render targets (only the output pass draws to the screen), and the normal
    // pre-pass also draws instanced meshes — compile exactly those variants, asynchronously, or the first AO frame links
    // them synchronously (~220 ms measured by tools/hitch_probe.mjs --cold).
    // Program keys also carry the scene's fog and light counts (compile against this.scene), and the output pass sets its
    // colour-space / tone-mapping defines only inside render() — set them the same way first.
    const r = this.renderer; const outMats = new Set<THREE.Material>();
    for (const p of po.composer.passes) if (p instanceof OutputPass) {
      const op = p as unknown as { _outputColorSpace: string; _toneMapping: number; material: THREE.ShaderMaterial }; outMats.add(op.material);
      if ((op._outputColorSpace !== r.outputColorSpace || op._toneMapping !== r.toneMapping) && (r.toneMapping === THREE.AgXToneMapping || r.toneMapping === THREE.NeutralToneMapping || r.toneMapping === THREE.NoToneMapping)) {
        op._outputColorSpace = r.outputColorSpace; op._toneMapping = r.toneMapping; op.material.defines = {};
        if (THREE.ColorManagement.getTransfer(r.outputColorSpace) === THREE.SRGBTransfer) op.material.defines.SRGB_TRANSFER = '';
        if (r.toneMapping === THREE.AgXToneMapping) op.material.defines.AGX_TONE_MAPPING = '';
        if (r.toneMapping === THREE.NeutralToneMapping) op.material.defines.NEUTRAL_TONE_MAPPING = '';
        op.material.needsUpdate = true;
      }
    }
    const quad = new THREE.PlaneGeometry(2, 2); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const toScreen = new THREE.Scene(), toTarget = new THREE.Scene(); const normalMat = (po.gtao as unknown as { normalMaterial?: THREE.Material }).normalMaterial;
    if (normalMat) mats.add(normalMat);
    // full-screen passes draw a position + uv triangle (no normals), which is part of their program key
    const fs = new THREE.BufferGeometry(); fs.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3)); fs.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    // full-screen passes are drawn in their own empty scene (no fog, no lights); only the normal pre-pass draws the real scene
    const withScene = new THREE.Scene();
    for (const m of mats) {
      if (m === normalMat) {
        for (const mesh of [new THREE.Mesh(quad, m), new THREE.InstancedMesh(quad, m, 1)]) { mesh.frustumCulled = false; withScene.add(mesh); }   // it also draws instanced meshes
        continue;
      }
      const mesh = new THREE.Mesh(fs, m); mesh.frustumCulled = false; (outMats.has(m) ? toScreen : toTarget).add(mesh);
    }
    const prev = r.getRenderTarget(); const jobs: Promise<unknown>[] = [];
    try { r.setRenderTarget(po.composer.renderTarget1); jobs.push(r.compileAsync(toTarget, cam), r.compileAsync(withScene, this.camera, this.scene)); } catch { /* optimisation only */ } finally { r.setRenderTarget(prev); }
    try { await Promise.all([...jobs, r.compileAsync(toScreen, cam)]); } catch { /* optimisation only */ }
    quad.dispose(); fs.dispose();
  }

  // ------------------------------------------------------------------ scene construction
  private buildTower() {
    const shadows = this.tierCfg.shadows;
    const templates = new Map<string, Built>();
    for (const f of FLOORS) {
      let built: Built;
      if (f.category === 'residential') {
        let t = templates.get('res'); if (!t) { t = buildMeshes(buildFloorShell(f.id), this.lib, { shadows }); templates.set('res', t); }
        const root = t.root.clone(true); built = { ...t, root, byGrp: {} };
        for (const c of root.children) built.byGrp[c.name as keyof Built['byGrp']] = c as THREE.Group;
      } else {
        const prims = buildFloorShell(f.id); if (f.id === 'F11') prims.push(...pergolaPosts());
        built = buildMeshes(prims, this.lib, { shadows });
      }
      const group = new THREE.Group(); group.name = f.id; group.position.y = f.ffl; group.add(built.root);
      group.updateMatrixWorld(true); built.root.traverse((o) => { o.matrixAutoUpdate = false; o.updateMatrix(); });
      this.scene.add(group);
      this.floors[f.id] = { id: f.id, group, fill: built.byGrp.fill, ghosted: false };
    }
    const roofBuilt = buildMeshes(buildRoof(), this.lib, { shadows });
    this.roof = new THREE.Group(); this.roof.name = 'ROOF'; this.roof.position.y = ROOF_LEVEL; this.roof.add(roofBuilt.root); this.scene.add(this.roof);
    this.scene.add(this.interiorHolder);
    for (let i = 0; i < 3; i++) { const l = new THREE.PointLight('#fff0dc', 0, 14, 1.6); l.castShadow = false; this.fillLights.push(l); this.scene.add(l); }
  }

  private buildHelpers() {
    const bronze = new THREE.Color('#c79a5b');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(18.5, 1, 24.5), new THREE.MeshBasicMaterial({ color: bronze, transparent: true, opacity: 0, depthWrite: false }));
    floor.visible = false; floor.renderOrder = 6; this.scene.add(floor);
    const area: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: bronze, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 6; area.push(m); this.scene.add(m);
    }
    const surf = new THREE.Group(); this.scene.add(surf);
    this.hl = { floor, area, surf, floorOpacity: 0, floorTarget: 0, areaOpacity: 0, areaTarget: 0 };
  }

  // ------------------------------------------------------------------ interiors (lazy, cached per category)
  private interiorKey(f: FloorId) { return FLOOR_BY_ID[f].category; }
  private ensureInterior(f: FloorId, buckets?: MergedBucket[]): Built {
    const key = this.interiorKey(f);
    let b = this.interiors.get(key);
    if (!b) {
      b = meshesFromBuckets(buckets ?? mergeBuckets(buildFloorInterior(f)), this.lib, { shadows: this.tierCfg.shadows, lightmap: !!LIGHTMAPS[key] });
      this.addMirrors(f, b);
      this.loadLightmap(key);
      b.root.traverse((o) => { o.matrixAutoUpdate = false; o.updateMatrix(); });
      b.root.matrixAutoUpdate = false;
      this.interiors.set(key, b); this.counters.interiorBuilds++;
      // keep at most the residential interior + one other category alive (GPU memory budget)
      for (const [k, old] of this.interiors) {
        if (k !== key && k !== 'residential' && old !== this.activeInterior) { disposeBuilt(old.root); this.interiors.delete(k); this.prewarmJobs.delete(k); this.counters.interiorDisposals++; }
      }
    }
    return b;
  }

  /** stage timings of every interior preparation (diagnostics; read by the HUD / tests) */
  readonly prewarmLog: { key: string; stage: string; ms: number }[] = [];
  get workerDiagnostics() { return { requestedAt, workerTimings, bootLog }; }
  private lmLoaded = new Map<string, THREE.Texture>(); private floorIrr = new Map<string, THREE.Texture>(); private lmActive = '';
  /** Fetch the Cycles-baked indirect light of a floor category (once) and bind it when that interior is shown. */
  private loadLightmap(key: string) {
    const meta = LIGHTMAPS[key]; if (!meta || this.lmLoaded.has(key)) return;
    const tex = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}lightmaps/${meta.file}`, () => { this.needsRender = true; });
    tex.flipY = true; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    this.lmLoaded.set(key, tex);
    if (meta.floor) { const ft = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}lightmaps/${meta.floor}`, () => { this.needsRender = true; }); ft.flipY = true; ft.generateMipmaps = false; ft.minFilter = THREE.LinearFilter; ft.magFilter = THREE.LinearFilter; this.floorIrr.set(key, ft); }
  }

  /** Real planar reflections for the vanity mirrors (high / ultra tiers; other tiers keep the pale glass material). */
  private addMirrors(f: FloorId, b: Built) {
    if (!this.postTier) return;
    const quads = furnishFloor(f, 'nav').filter((p): p is Extract<Prim, { k: 'quad' }> => p.k === 'quad' && p.grp === 'mirror');
    if (!quads.length) return;
    const g = new THREE.Group(); g.name = 'mirror';
    for (const q of quads) {
      const len = Math.hypot(q.bx - q.ax, q.by - q.ay), h = q.z1 - q.z0;
      const r = new Reflector(new THREE.PlaneGeometry(len, h), { textureWidth: 640, textureHeight: Math.round((640 * h) / len), clipBias: 0.003, color: 0xb9c1c2 });
      r.position.set(toWorldX((q.ax + q.bx) / 2 + q.nx * 0.004), (q.z0 + q.z1) / 2, toWorldZ((q.ay + q.by) / 2 + q.ny * 0.004));
      r.rotation.y = Math.atan2(q.nx, -q.ny); r.userData = { mirror: q.room }; g.add(r);
    }
    b.root.add(g);
  }

  // ---- sliding glass doors: leaves of the open floor slide when the visitor is in one of the two rooms they connect
  private sliders = new Map<FloorId, { mesh: THREE.Mesh; dir: THREE.Vector3; dist: number; rooms: string[]; outdoor: string[]; cx: number; cy: number; t: number }[]>();
  private slidersOf(f: FloorId) {
    let list = this.sliders.get(f);
    if (list) return list;
    list = []; const plan = getFloorPlan(f); const nav = buildNavGraph(f);
    this.floors[f].group.traverse((o) => {
      const m = o as THREE.Mesh; const id = m.userData?.room as string | undefined;
      if (!m.isMesh || m.userData?.grp !== 'leaf' || !id) return;
      const [opId, tag] = id.split('#'); const op = plan.openings.find((x) => x.id === opId); if (!op) return;
      const along = op.rect.x1 - op.rect.x0 > op.rect.y1 - op.rect.y0, len = along ? op.rect.x1 - op.rect.x0 : op.rect.y1 - op.rect.y0;
      const sign = tag === 'L' ? -1 : 1, dist = tag === 'P' ? len * 0.94 : len / 4 - 0.02;
      const dir = along ? new THREE.Vector3(sign, 0, 0) : new THREE.Vector3(0, 0, -sign);     // plan +y is world -z
      const rooms = nav.edges.filter((e) => e.opId === opId).flatMap((e) => [e.a, e.b]);
      const outdoor = rooms.filter((k) => plan.rooms.find((r) => r.key === k)?.outdoor);
      list!.push({ mesh: m, dir, dist, rooms, outdoor, cx: (op.rect.x0 + op.rect.x1) / 2, cy: (op.rect.y0 + op.rect.y1) / 2, t: 0 });
    });
    this.sliders.set(f, list); return list;
  }
  private updateSliders(dt: number, s: AppState): boolean {
    const f = this.exploded; if (!f) return false;
    let moving = false; const k = 1 - Math.exp(-dt / 0.2); const px = this.camera.position.x + 9, py = 12 - this.camera.position.z;   // camera in plan metres
    for (const sl of this.slidersOf(f)) {
      // open while the camera is near the doorway, or while the visitor is out on the balcony / terrace it serves
      const near = Math.hypot(px - sl.cx, py - sl.cy) < 3.2, out = !!s.roomKey && sl.outdoor.includes(s.roomKey);
      const want = s.view === 'room' && (near || out) ? 1 : 0;
      if (Math.abs(want - sl.t) < 0.002) { if (sl.t !== want) { sl.t = want; } else continue; } else sl.t += (want - sl.t) * k;
      const e = sl.t * sl.t * (3 - 2 * sl.t);
      sl.mesh.position.copy(sl.dir).multiplyScalar(e * sl.dist); sl.mesh.updateMatrix(); sl.mesh.updateMatrixWorld(true); moving = true;
    }
    if (moving) this.shadowDirty = true;
    return moving;
  }

  private frameWaiters: (() => void)[] = [];
  private anyFrameWaiters: (() => void)[] = [];
  private urgent = new Set<string>();
  private prewarmJobs = new Map<string, Promise<void>>();
  finishesReady = false;
  /** Wait for a later frame. Background work waits for a quiet frame; urgent work (the visitor asked for this floor) uses every frame. */
  private pace(key: string): Promise<void> { return new Promise((r) => (this.urgent.has(key) ? this.anyFrameWaiters : this.frameWaiters).push(r)); }

  /**
   * Prepare an interior without ever blocking a frame: textures are synthesised in the worker, meshes are built once,
   * shaders compile asynchronously, then geometry buffers and textures are uploaded to the GPU a few per frame.
   * Resolves when the interior can be shown without a first-use hitch.
   */
  prewarm(f: FloorId, urgent = false): Promise<void> {
    const key = this.interiorKey(f);
    if (urgent) { this.urgent.add(key); for (const w of this.frameWaiters.splice(0)) this.anyFrameWaiters.push(w); }
    let job = this.prewarmJobs.get(key);
    if (!job) { job = this.runPrewarm(f, key).finally(() => { this.urgent.delete(key); }); this.prewarmJobs.set(key, job); }
    return job;
  }

  private async runPrewarm(f: FloorId, key: string) {
    if (this.disposed) return; const urgentAtStart = this.urgent.has(key);
    const existing = this.interiors.get(key);
    const t0 = performance.now(); const mark = (stage: string) => this.prewarmLog.push({ key, stage, ms: Math.round(performance.now() - t0) });
    const variants = this.startVariants();
    const prims = existing ? null : await requestBuckets(f); bucketCache.delete(key); mark('geometry (worker)');
    if (prims) await this.lib.prepareSlots(prims.map((p) => p.mat)); mark('textures decoded');
    if (this.disposed) return;
    await this.pace(key);
    const b = existing ?? this.ensureInterior(f, prims ?? undefined); mark('meshes created');
    const meshes: THREE.Mesh[] = []; b.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    const y = FLOOR_BY_ID[f].ffl;
    if (b !== this.activeInterior) {
      // NOTE: nothing is attached to the visible scene while compiling — a visible, half-compiled mesh forces a blocking compile on the next frame
      // compile in small groups on quiet frames: one big compile call froze the page for ~0.5 s right after load
      const seen = new Set<THREE.Material>(); let group: THREE.Mesh[] = [];
      const flush = async () => {
        if (!group.length) return;
        const tmp = new THREE.Group(); tmp.position.y = y; const parents = group.map((m) => m.parent);
        for (const m of group) tmp.add(m); tmp.updateMatrixWorld(true);
        try { await this.renderer.compileAsync(tmp, this.camera, this.scene); } catch { /* optimisation only */ }
        await this.compileForTarget(tmp, true);                              // the same meshes as drawn inside a room (AO target)
        group.forEach((m, j) => parents[j]?.add(m)); group = [];
        await this.pace(key);
      };
      for (const m of meshes) {
        if (this.disposed || b === this.activeInterior || this.interiors.get(key) !== b) break;
        const mat = m.material as THREE.Material; if (seen.has(mat)) continue; seen.add(mat); group.push(m);
        if (group.length >= (this.urgent.has(key) ? 10 : 6)) await flush();   // the visitor is waiting: slightly larger groups (large ones hitch the camera)
      }
      await flush(); mark('shaders compiled');
      if (this.fadeWarmed.size < 3) { await this.warmFadeVariants(b.root, y); mark('finish-crossfade variants compiled'); }
    }
    // geometry buffers: draw small batches into a 4x4 target with one basic material
    const rt = new THREE.WebGLRenderTarget(4, 4); const cam = new THREE.OrthographicCamera(-14, 14, 16, -16, 0.1, 80);
    cam.position.set(0, y + 40, 0); cam.lookAt(0, y, 0); cam.updateMatrixWorld(true);
    const basic = new THREE.MeshBasicMaterial(); const batchScene = new THREE.Scene(); batchScene.overrideMaterial = basic;
    for (let i = 0; i < meshes.length; i += 24) {
      await this.pace(key);
      if (b === this.activeInterior || this.disposed || this.interiors.get(key) !== b) break;
      const batch = meshes.slice(i, i + 24); const parents = batch.map((m) => m.parent);
      const tmp = new THREE.Group(); tmp.position.y = y; batchScene.add(tmp); for (const m of batch) tmp.add(m); tmp.updateMatrixWorld(true);
      const prevRT = this.renderer.getRenderTarget(); this.renderer.setRenderTarget(rt); this.renderer.render(batchScene, cam); this.renderer.setRenderTarget(prevRT);
      batch.forEach((m, j) => parents[j]!.add(m)); batchScene.remove(tmp);
    }
    rt.dispose(); basic.dispose();
    if (b !== this.activeInterior) b.root.updateMatrixWorld(true);
    // textures: a few uploads per frame
    const texs = new Set<THREE.Texture>();
    for (const m of meshes) { const mat = m.material as THREE.MeshStandardMaterial; for (const t of [mat.map, mat.normalMap, mat.roughnessMap]) if (t) texs.add(t); }
    let n = 0;
    mark('geometry uploaded');
    for (const t of texs) { if (this.disposed) break; if (n++ % 4 === 0) await this.pace(key); this.renderer.initTexture(t); }
    mark('textures uploaded');
    if (urgentAtStart) this.urgent.add('variants'); await variants; mark('done');
  }

  /** Prepare every catalogue finish (worker) and upload it, so a swap only rebinds ready GPU textures. */
  async prewarmFinishes(ids: string[]) {
    for (const id of ids) {
      if (this.disposed) return;
      await this.lib.prewarm(id);
      for (const t of this.lib.texturesOfMaterial(id)) { await this.pace('finishes'); if (this.disposed) return; this.renderer.initTexture(t); }
    }
    this.finishesReady = true;
  }

  private setExploded(f: FloorId | null) {
    if (this.exploded) { const prev = this.floors[this.exploded]; if (prev.fill) prev.fill.visible = true; }
    if (this.activeInterior) { this.interiorHolder.remove(this.activeInterior.root); this.activeInterior = null; }
    this.exploded = f;
    if (f) {
      const b = this.ensureInterior(f); this.activeInterior = b;
      const lk = this.interiorKey(f); this.lmActive = LIGHTMAPS[lk] ? lk : ''; const lt = this.lmLoaded.get(lk); if (lt) this.lib.setLightmap(lt); const fl = this.floorIrr.get(lk); if (fl) this.lib.setFloorIrradiance(fl);
      this.interiorHolder.position.y = FLOOR_BY_ID[f].ffl; this.interiorHolder.add(b.root); this.interiorHolder.updateMatrixWorld(true);
      b.root.updateMatrix(); b.root.updateMatrixWorld(true);
      const node = this.floors[f]; if (node.fill) node.fill.visible = false;
    }
    this.applyExplode(); this.shadowDirty = true; this.needsRender = true;
  }

  private setGhost(group: THREE.Object3D, on: boolean) {
    group.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh || !m.userData.slot) return;
      m.material = on ? this.lib.ghost(m.userData.slot) : this.lib.get(m.userData.slot);
      if (m.userData.cast === undefined) m.userData.cast = m.castShadow;
      m.castShadow = on ? false : m.userData.cast;
    });
  }

  /** Apply the director-owned `explode` scalar: lift + fade every level above the selected one. */
  private applyExplode() {
    const e = this.director.value('explode'); const sel = this.exploded ? FLOOR_BY_ID[this.exploded].number : 99;
    const k = e * e * (3 - 2 * e); const lift = k * LIFT; const active = e > 0.001 && this.exploded !== null;
    this.lib.setGhostOpacity(1 - k);
    for (const f of FLOORS) {
      const node = this.floors[f.id]; const upper = active && f.number > sel;
      node.group.position.y = f.ffl + (upper ? lift : 0);
      if (upper !== node.ghosted) { this.setGhost(node.group, upper); node.ghosted = upper; }
      node.group.visible = !(upper && e > 0.995);
      node.group.updateMatrixWorld(true);
    }
    const roofUpper = active;
    this.roof.position.y = ROOF_LEVEL + (roofUpper ? lift : 0);
    if (roofUpper !== this.roofGhosted) { this.setGhost(this.roof, roofUpper); this.roofGhosted = roofUpper; }
    this.roof.visible = !(roofUpper && e > 0.995); this.roof.updateMatrixWorld(true);
    if (this.activeInterior) this.activeInterior.root.visible = active;
  }

  // ------------------------------------------------------------------ camera destinations
  private aspectScale() { const a = this.camera.aspect; return a >= 1.25 ? 1 : Math.min(2.1, Math.pow(1.25 / a, 0.85)); }

  private destFor(s: AppState): Dest {
    const d = this.director; const curAz = d.rig === 'orbit' ? d.orbit.az : -0.6; const k = this.aspectScale();
    if (s.view === 'tower' || !s.floorId) return { rig: 'orbit', limits: TOWER_LIMITS, state: { target: new THREE.Vector3(0, 21, 0), az: curAz, pol: 1.34, dist: 114 * k, fov: 32 } };
    const f = FLOOR_BY_ID[s.floorId];
    if (s.view === 'floor') return { rig: 'orbit', limits: FLOOR_LIMITS, state: { target: new THREE.Vector3(0, f.ffl + 1, 0), az: curAz, pol: 0.74, dist: 62 * k, fov: 32 } };
    const plan = getFloorPlan(s.floorId);
    if (s.view === 'unit' && s.unitId) {
      const side = sideOf(s.unitId); const b = UNIT_BOUNDS[side];
      let az = side === 'A' ? Math.max(-0.95, Math.min(0.95, curAz)) : Math.PI + Math.max(-0.95, Math.min(0.95, Math.atan2(Math.sin(curAz - Math.PI), Math.cos(curAz - Math.PI))));
      if (Math.abs(az - (side === 'A' ? 0 : Math.PI)) < 0.2) az += 0.42;
      const room = s.roomKey ? plan.rooms.find((r) => r.key === s.roomKey) : null;
      if (room) { const r = room.rects[0]; return { rig: 'orbit', limits: UNIT_LIMITS, state: { target: new THREE.Vector3(toWorldX((r.x0 + r.x1) / 2), f.ffl + 0.8, toWorldZ((r.y0 + r.y1) / 2)), az, pol: 0.62, dist: 15 * k, fov: 32 } }; }
      return { rig: 'orbit', limits: UNIT_LIMITS, state: { target: new THREE.Vector3(toWorldX((b.x0 + b.x1) / 2), f.ffl + 0.8, toWorldZ((b.y0 + b.y1) / 2)), az, pol: 0.6, dist: 37 * k, fov: 32 } };
    }
    const room = plan.rooms.find((r) => r.key === s.roomKey) ?? plan.rooms.find((r) => r.view)!;
    const v = room.view ?? { eye: [(room.rects[0].x0 + room.rects[0].x1) / 2, (room.rects[0].y0 + room.rects[0].y1) / 2] as [number, number], look: [room.rects[0].x0, room.rects[0].y0] as [number, number] };
    const eye = safeEye(s.floorId, room);
    const pos = new THREE.Vector3(toWorldX(eye[0]), f.ffl + EYE_HEIGHT, toWorldZ(eye[1]));
    const a = aimAt(pos, new THREE.Vector3(toWorldX(v.look[0]), f.ffl + 1.2, toWorldZ(v.look[1])));
    return { rig: 'look', state: { pos, yaw: a.yaw, pitch: a.pitch, fov: this.camera.aspect < 1 ? 74 : 66 } };
  }

  // ------------------------------------------------------------------ state -> transitions
  private onState(s: AppState, prev: AppState) {
    if (s.lights !== prev.lights) this.needsRender = true;
    if (this.disposed) return;
    if (s.packageId !== prev.packageId || s.overrides !== prev.overrides || s.beforeAfter !== prev.beforeAfter) this.applyFinishes(s);
    if (s.env !== prev.env) { this.env.blendSeconds = s.motionPref === 'reduced' ? 0.25 : 0.9; this.env.setTarget(s.env); this.needsRender = true; }
    if (s.motionPref !== prev.motionPref) this.director.reduced = s.motionPref === 'reduced';
    if (s.tier !== prev.tier && s.tier !== 'lite') this.applyTier(s.tier);
    if (s.selectedSurfaceId !== prev.selectedSurfaceId || s.view !== prev.view || s.roomKey !== prev.roomKey || s.unitId !== prev.unitId) this.updateSurfaceHighlight(s);
    if (s.hoverFloorId !== prev.hoverFloorId || s.hoverKey !== prev.hoverKey || s.view !== prev.view) this.updateHover(s);
    if (s.cine.active !== prev.cine.active) this.onCineToggle(s, prev);
    if (s.hoverFloorId && s.hoverFloorId !== prev.hoverFloorId) void this.prewarm(s.hoverFloorId);
    if (s.section === 'amenities' && prev.section !== 'amenities') void this.prewarm('F11');
    if (s.landing !== prev.landing || s.locale !== prev.locale || (s.view === 'room') !== (prev.view === 'room')) requestAnimationFrame(() => this.updateViewOffset());
    const nav = s.view !== prev.view || s.floorId !== prev.floorId || s.unitId !== prev.unitId || s.roomKey !== prev.roomKey;
    if (nav) this.applyState(s, prev, false);
    if (s.mode !== prev.mode || s.view !== prev.view) { this.director.walkEnabled = s.view === 'room' && s.mode === 'free_walk'; if (!this.director.walkEnabled) this.director.setMove(0, 0, 0, false); }
    if (nav || s.section !== prev.section) { this.anchors = getAnchors(s); this.labelsDirty = true; this.needsRender = true; }
  }

  private finishGen = 0;
  private applyFinishes(s: AppState) {
    const showBefore = s.beforeAfter;
    const targets = SURFACES.map((sf) => ({ id: sf.id, mat: resolveSurfaceMaterial(sf.id, showBefore ? 'standard' : s.packageId, showBefore ? {} : s.overrides) }));
    const fade = !this.director.reduced && this.tierCfg.tex >= 512 && this.activeInterior !== null;
    // V11.3 Gate 1: a finish whose textures were never prepared used to be synthesised on the main thread here (167-306 ms
    // stalls on an early package change). Prepare them in the worker first, then apply the whole change at once (latest wins).
    const missing = [...new Set(targets.filter((t) => this.lib.surfaceMaterialId(t.id) !== t.mat && MATERIAL_BY_ID[t.mat].recipe.type !== 'photo' && !hasTextureSet(t.mat, this.lib.texSize)).map((t) => t.mat))];
    const gen = ++this.finishGen;
    if (missing.length) {
      void Promise.all(missing.map((id) => this.lib.prewarm(id))).then(() => { if (gen === this.finishGen && !this.disposed) this.applyFinishes(useStore.getState()); });
      return;
    }
    for (const t of targets) {
      if (this.lib.surfaceMaterialId(t.id) === t.mat) continue;
      if (fade) this.crossfadeSurface(t.id);
      this.lib.applySurface(t.id, t.mat);            // atomic: canonical state and GPU surface change together
    }
    this.needsRender = true;
  }

  /**
   * V11.3 Gate 1 — crossfade overlay materials are POOLED per shader path (0 plain, 1 lightmapped, 2 baked-ambient) and
   * never disposed mid-session. Disposing them released their (transparent-variant) shader programs, so every finish
   * change linked those programs again synchronously on the next frame: the 140–313 ms stalls measured by
   * tools/hitch_probe.mjs. A pooled material keeps its programs alive; reuse is a property copy + cache-key lookup.
   */
  private fadePool = new Map<number, THREE.Material[]>();
  private fadeKind = new WeakMap<THREE.Material, number>();
  private fadeWarmed = new Set<number>();
  private fadeSrc(lm: number, surfaceId: string): THREE.Material {
    return lm === 1 ? this.lib.getLM(`surf:${surfaceId}`) : lm === 2 ? this.lib.getAmb(`surf:${surfaceId}`) : this.lib.get(`surf:${surfaceId}`);
  }
  private fadeMat(lm: number, src: THREE.Material): THREE.Material {
    const pooled = this.fadePool.get(lm)?.pop();
    const m = pooled ?? src.clone();
    if (pooled) { m.copy(src); m.needsUpdate = true; }                     // same program key → the live program is reused
    m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey; // keep the baked-light shader path
    m.transparent = true; m.depthWrite = false; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; m.opacity = 1;
    this.fadeKind.set(m, lm); return m;
  }
  private releaseFadeMat(m: THREE.Material) {
    const lm = this.fadeKind.get(m); if (lm === undefined) { m.dispose(); return; }
    const pool = this.fadePool.get(lm) ?? []; if (!pool.includes(m)) pool.push(m); this.fadePool.set(lm, pool);
  }
  /** Compile the overlay variants ahead, in the background, from real meshes of a prepared interior (first use too). */
  private async warmFadeVariants(root: THREE.Object3D, y: number) {
    const reps = new Map<number, THREE.Mesh>();
    root.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || !m.userData.surf || m.userData.overlay) return; const lm = m.userData.lm ? 1 : m.userData.amb ? 2 : 0; if (!this.fadeWarmed.has(lm) && !reps.has(lm)) reps.set(lm, m); });
    if (!reps.size) return;
    const g = new THREE.Group(); g.position.y = y; const mats: THREE.Material[] = [];
    for (const [lm, src] of reps) { const mat = this.fadeMat(lm, this.fadeSrc(lm, src.userData.surf as string)); mats.push(mat); const p = new THREE.Mesh(src.geometry, mat); p.matrixAutoUpdate = false; p.matrix.copy(src.matrix); g.add(p); }
    g.updateMatrixWorld(true);
    try { await this.renderer.compileAsync(g, this.camera, this.scene); } catch { /* optimisation only */ }
    await this.compileForTarget(g, true);
    g.clear(); for (const m of mats) this.releaseFadeMat(m); for (const lm of reps.keys()) this.fadeWarmed.add(lm);
  }

  /** 240 ms reveal: the previous finish fades out over the already-updated surface (latest wins). */
  private crossfadeSurface(surfaceId: string) {
    if (!this.activeInterior) return;
    const dropped = new Set<THREE.Material>();
    this.fadeOverlays = this.fadeOverlays.filter((f) => { if (f.mesh.userData.surf !== surfaceId) return true; f.mesh.removeFromParent(); dropped.add(f.mat); return false; });
    for (const m of dropped) if (!this.fadeOverlays.some((x) => x.mat === m)) this.releaseFadeMat(m);
    const olds = new Map<number, THREE.Material>();
    const oldFor = (lm: number) => {
      let old = olds.get(lm);
      if (!old) { old = this.fadeMat(lm, this.fadeSrc(lm, surfaceId)); olds.set(lm, old); }
      return old;
    };
    this.activeInterior.root.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh || m.userData.surf !== surfaceId || m.userData.overlay) return;
      const old = oldFor(m.userData.lm ? 1 : m.userData.amb ? 2 : 0);
      const ov = new THREE.Mesh(m.geometry, old); ov.userData = { surf: surfaceId, overlay: true }; ov.renderOrder = 3; ov.matrixAutoUpdate = false; ov.castShadow = false; ov.receiveShadow = true;
      m.parent!.add(ov); this.fadeOverlays.push({ mesh: ov, mat: old, t: 0 });
    });
  }

  private applyTier(tier: Exclude<Tier, 'lite'>) {
    const c = TIER_CFG[tier]; this.tierCfg = { ...c, tex: this.tierCfg.tex, aniso: this.tierCfg.aniso };
    this.env.configureShadows(c.shadowSize, c.shadows); this.env.particlesEnabled = c.particles;
    this.resize(); this.shadowDirty = true; this.needsRender = true;
  }

  private tripOpts(s: AppState, prev: AppState | null): TripOptions {
    const pv = prev?.view ?? 'tower';
    if (s.view === 'tower') return { id: 'M12_return_to_tower', band: [0.5, 0.95] };
    if (s.view === 'floor') return pv === 'tower' ? { id: 'M03_tower_to_floor', band: [0.65, 1.1] } : { id: 'M04r_to_floor', band: [0.6, 1.0] };
    if (s.view === 'unit') return pv === 'room' ? { id: 'M05r_room_to_dollhouse', band: [0.7, 1.2] } : { id: 'M04_floor_to_unit', band: [0.65, 1.1] };
    return pv === 'room' ? { id: 'M06_room_to_room', band: [0.65, 1.4] } : { id: 'M05_unit_to_room', band: [0.8, 1.4] };
  }

  private applyState(s: AppState, prev: AppState | null, initial: boolean) {
    const tk = ++this.transToken; const d = this.director;
    const wantExploded = s.view === 'tower' ? null : s.floorId;
    this.clearStreetView(); let dest = this.destFor(s); const opts = this.tripOpts(s, prev);
    this.anchors = getAnchors(s); this.labelsDirty = true;
    this.updateFillLights(s);

    if (initial) {
      if (wantExploded) { this.setExploded(wantExploded); d.setValue('explode', 1); this.applyExplode(); }
      d.snap(dest); if (s.view === 'room') { d.setValue('inside', 1); this.insideTarget = 1; }
      d.walkEnabled = s.view === 'room' && s.mode === 'free_walk';
      this.needsRender = true; return;
    }
    if (this.walkRoomUpdate) { this.walkRoomUpdate = false; return; } // free-walk crossed a doorway: no camera trip

    const floorChanged = wantExploded !== this.exploded;
    const remote = floorChanged && this.exploded !== null && wantExploded !== null && (s.view === 'room' || prev?.view === 'room');
    if (remote) {
      // M09: long-distance jump between levels => semantic transit through a short veil
      const target = dest;
      void this.prewarm(wantExploded!, true).then(() => {
        if (tk !== this.transToken) return;
        d.go(target, { id: 'M09_remote_facility', band: [0.3, 0.6], cut: true, onMid: () => { if (tk !== this.transToken) return; this.setExploded(wantExploded); d.setValue('explode', 1); this.applyExplode(); this.shadowDirty = true; } });
      });
      return;
    }

    // room -> room on the same level: travel through real doorways when a clear path exists
    if (s.view === 'room' && prev?.view === 'room' && !floorChanged && s.floorId && prev.roomKey && s.roomKey && dest.rig === 'look') {
      const nav = buildNavGraph(s.floorId); const from: [number, number] = [d.look.pos.x + 9, 12 - d.look.pos.z]; const to: [number, number] = [dest.state.pos.x + 9, 12 - dest.state.pos.z];
      const here = roomAt(nav.plan, from[0], from[1])?.key ?? prev.roomKey;
      const pts = waypoints(nav, from, here, to, s.roomKey);
      let ok = !!pts && pts.length <= 12; let len = 0;
      if (pts) for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (!segmentClear(nav, pts[i - 1], pts[i])) ok = false; }
      if (ok && len < 15 && pts) {
        const y = dest.state.pos.y; dest = { ...dest, lookAlong: len > 3.2, via: pts.slice(1, -1).map(([x, yy]) => new THREE.Vector3(toWorldX(x), y, toWorldZ(yy))) };
        d.go(dest, opts);
      } else d.go(dest, { ...opts, id: 'M06_room_to_room_cut', cut: true });
      return;
    }
    if (dest.rig === 'look' && d.rig === 'orbit') {
      // M05: descend through the open top of the dollhouse, never through a wall
      const p = dest.state.pos; const c = this.camera.position;
      dest = { ...dest, via: [new THREE.Vector3(p.x + (c.x - p.x) * 0.16, p.y + 3.6, p.z + (c.z - p.z) * 0.16)] };
    } else if (dest.rig === 'orbit' && d.rig === 'look' && !d.busy) {
      // leave the room straight up through the open top before swinging out to the dollhouse view
      const c = this.camera.position; dest = { ...dest, via: [new THREE.Vector3(c.x, c.y + 3.6, c.z)] };
    }

    if (!floorChanged) { d.go(dest, opts); return; }
    if (this.exploded && wantExploded) {
      // floor -> another floor: close the stack, move the shared interior, open again (camera eases meanwhile)
      d.go(dest, opts);
      void Promise.all([d.animate('explode', 0, 0.3), this.prewarm(wantExploded, true)]).then(([done]) => {
        if (!done || tk !== this.transToken) return;
        this.setExploded(wantExploded); void d.animate('explode', 1, 0.6);
      });
    } else if (wantExploded) {
      d.go(dest, opts);
      // PREPARING: the camera is already easing; the lift starts as soon as the interior is ready on the GPU
      void this.prewarm(wantExploded, true).then(() => { if (tk !== this.transToken) return; this.setExploded(wantExploded); void d.animate('explode', 1, 0.75); });
    } else {
      d.go(dest, opts);
      void d.animate('explode', 0, 0.6).then((done) => { if (done && tk === this.transToken) this.setExploded(null); });
    }
  }

  private updateFillLights(s: AppState) {
    if (s.view !== 'room' || !s.floorId || !s.roomKey) return;
    const room = getFloorPlan(s.floorId).rooms.find((r) => r.key === s.roomKey); if (!room) return;
    const f = FLOOR_BY_ID[s.floorId]; const r = room.rects[0]; const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2; const w = r.x1 - r.x0, dd = r.y1 - r.y0;
    const pts: [number, number][] = w > dd ? [[cx - w * 0.28, cy], [cx + w * 0.28, cy], [cx, cy]] : [[cx, cy - dd * 0.28], [cx, cy + dd * 0.28], [cx, cy]];
    this.fillLights.forEach((l, i) => { l.position.set(toWorldX(pts[i][0]), f.ffl + Math.min(2.45, f.clear - 0.4), toWorldZ(pts[i][1])); l.distance = Math.max(8, Math.max(w, dd) * 1.6); });
  }

  // ------------------------------------------------------------------ highlights
  private updateHover(s: AppState) {
    const h = this.hl;
    if (s.view === 'tower' && s.hoverFloorId) {
      const f = FLOOR_BY_ID[s.hoverFloorId]; h.floor.visible = true; h.floor.scale.y = f.floorToFloor; h.floor.position.set(0, f.ffl - SLAB + f.floorToFloor / 2, 0); h.floorTarget = 0.26;
    } else h.floorTarget = 0;
    let rects: Rect[] = []; let y = 0;
    if (s.floorId && s.hoverKey) {
      const f = FLOOR_BY_ID[s.floorId]; y = f.ffl + 0.03;
      if (s.view === 'floor' && UNIT_BY_ID[s.hoverKey]) rects = [UNIT_BOUNDS[sideOf(s.hoverKey)]];
      else { const room = getFloorPlan(s.floorId).rooms.find((r) => r.key === s.hoverKey); if (room) rects = room.rects.slice(0, 3); }
    }
    h.area.forEach((m, i) => {
      const r = rects[i]; if (!r) { if (h.areaTarget === 0) m.visible = false; return; }
      m.visible = true; m.scale.set(r.x1 - r.x0, r.y1 - r.y0, 1); m.position.set(toWorldX((r.x0 + r.x1) / 2), y, toWorldZ((r.y0 + r.y1) / 2));
    });
    h.areaTarget = rects.length ? 0.24 : 0; this.needsRender = true;
  }

  private updateSurfaceHighlight(s: AppState) {
    const g = this.hl.surf; for (const c of [...g.children]) { ((c as THREE.Mesh).material as THREE.Material).dispose(); g.remove(c); }
    if (!s.selectedSurfaceId || !this.activeInterior || !s.unitId) { this.needsRender = true; return; }
    const side = sideOf(s.unitId);
    this.activeInterior.root.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh || m.userData.surf !== s.selectedSurfaceId || m.userData.overlay) return;
      if (m.userData.room && !String(m.userData.room).startsWith(side + '.')) return;
      const ov = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: '#d7a65e', transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      ov.position.y = this.interiorHolder.position.y; ov.renderOrder = 7; g.add(ov);
    });
    this.needsRender = true;
  }

  // ------------------------------------------------------------------ input
  private ray = new THREE.Raycaster(); private ndc = new THREE.Vector2();
  private setRay(x: number, y: number) { const r = this.canvas.getBoundingClientRect(); this.ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(this.ndc, this.camera); }
  private pickFloor(): FloorId | null {
    let best: FloorId | null = null; let bd = Infinity; const box = new THREE.Box3(); const hit = new THREE.Vector3();
    for (const f of FLOORS) {
      const y0 = this.floors[f.id].group.position.y - SLAB; box.min.set(-9.3, y0, -12.9); box.max.set(9.3, y0 + f.floorToFloor, 12.9);
      if (this.ray.ray.intersectBox(box, hit)) { const dd = hit.distanceToSquared(this.camera.position); if (dd < bd) { bd = dd; best = f.id; } }
    }
    return best;
  }
  private planPoint(height: number): [number, number] | null {
    const s = useStore.getState(); if (!s.floorId) return null;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(FLOOR_BY_ID[s.floorId].ffl + height)); const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(plane, p) ? [p.x + 9, 12 - p.z] : null;
  }
  private pickSurface(): { surf: string; room?: string } | null {
    if (!this.activeInterior) return null;
    const hits = this.ray.intersectObject(this.activeInterior.root, true);
    for (const h of hits) { const u = h.object.userData; if (u.overlay || u.grp === 'ceiling' && this.director.rig === 'orbit') continue; if (u.surf) return { surf: u.surf, room: u.room }; if (u.grp !== 'glass') return null; }
    return null;
  }
  private roomUnder(): PlacedRoom | null {
    const s = useStore.getState(); if (!s.floorId) return null; const p = this.planPoint(0.02); if (!p) return null;
    return roomAt(getFloorPlan(s.floorId), p[0], p[1]);
  }

  private hover(x: number, y: number) {
    const s = useStore.getState(); if (s.landing || this.director.busy) return;
    this.setRay(x, y);
    if (s.view === 'tower') {
      const f = this.pickFloor(); s.setHoverFloor(f); this.hooks.onFloorTip?.(f ? { floorId: f, x, y } : null);
      this.canvas.style.cursor = f ? 'pointer' : 'grab';
    } else if (s.view === 'floor' && s.floorId) {
      const p = this.planPoint(1.2); let key: string | null = null;
      if (p && FLOOR_BY_ID[s.floorId].category === 'residential') { for (const u of FLOOR_BY_ID[s.floorId].unitIds) { const b = UNIT_BOUNDS[sideOf(u)]; if (p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1) key = u; } }
      else { const r = this.roomUnder(); if (r && r.owner === 'zone' && r.view && r.tier !== 'proxy') key = r.key; }
      s.setHoverKey(key); this.canvas.style.cursor = key ? 'pointer' : 'grab';
    } else if (s.view === 'unit' && s.unitId) {
      const r = this.roomUnder(); const key = r && r.owner === sideOf(s.unitId) && r.view ? r.key : null;
      s.setHoverKey(key); this.canvas.style.cursor = key ? 'pointer' : 'grab';
    } else this.canvas.style.cursor = 'grab';
  }

  private tap(x: number, y: number) {
    const s = useStore.getState(); if (s.landing) return;
    this.setRay(x, y);
    if (s.view === 'tower') { const f = this.pickFloor(); if (f) s.selectFloor(f); return; }
    if (!s.floorId) return;
    if (s.view === 'floor') {
      const p = this.planPoint(1.2);
      if (p && FLOOR_BY_ID[s.floorId].category === 'residential') {
        for (const u of FLOOR_BY_ID[s.floorId].unitIds) { const b = UNIT_BOUNDS[sideOf(u)]; if (p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1) { s.selectUnit(u); return; } }
      } else { const r = this.roomUnder(); if (r && r.owner === 'zone' && r.view && r.tier !== 'proxy') s.enterRoom(r.key); }
      return;
    }
    if (s.section === 'design') {
      const hit = this.pickSurface();
      if (hit) { s.selectSurface(hit.surf); return; }
    }
    if (s.view === 'unit' && s.unitId) {
      const r = this.roomUnder(); if (!r) return;
      if (r.owner === sideOf(s.unitId) && r.view) { if (s.section === 'design') s.focusRoom(r.key); else s.enterRoom(r.key); }
      else if (r.owner === 'A' || r.owner === 'B') { const other = FLOOR_BY_ID[s.floorId].unitIds.find((u) => sideOf(u) === r.owner); if (other) s.selectUnit(other); }
      return;
    }
    if (s.view === 'room') {
      const p = this.planPoint(0.02); if (!p) return;
      const nav = buildNavGraph(s.floorId); const target = roomAt(nav.plan, p[0], p[1]); if (!target) return;
      const here = roomAt(nav.plan, this.director.look.pos.x + 9, 12 - this.director.look.pos.z);
      if (s.mode === 'free_walk' && here) {
        const [tx, ty] = resolveCollision(nav, p[0], p[1]);
        const pts = waypoints(nav, [this.director.look.pos.x + 9, 12 - this.director.look.pos.z], here.key, [tx, ty], target.key);
        if (pts) this.director.walkAlong(pts.slice(1).map(([px, py]) => new THREE.Vector3(toWorldX(px), this.director.look.pos.y, toWorldZ(py))));
        else s.notify('toast.unreachable');
      } else if (target.key !== s.roomKey && target.view && (target.owner === 'zone' || target.owner === 'core' || (s.unitId && target.owner === sideOf(s.unitId)))) s.enterRoom(target.key);
    }
  }

  private bindInput() {
    const c = this.canvas; c.style.touchAction = 'none';
    const down = (e: PointerEvent) => {
      if (useStore.getState().landing) return;
      c.setPointerCapture?.(e.pointerId); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) { this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; this.dragged = false; this.lastMoveT = performance.now(); }
      else if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y); this.dragged = true; this.director.dragEnd(); }
    };
    const move = (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) { if (e.pointerType === 'mouse') this.hover(e.clientX, e.clientY); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()]; const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDist > 0 && dist > 0) this.director.zoom(this.pinchDist / dist); this.pinchDist = dist; this.needsRender = true; return;
      }
      if (!this.downAt) return;
      const thr = e.pointerType === 'touch' ? 10 : 5;
      if (!this.dragged && Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > thr) { this.dragged = true; this.director.dragStart(); c.style.cursor = 'grabbing'; this.hooks.onFloorTip?.(null); }
      if (this.dragged) { const now = performance.now(); const dt = Math.min(0.05, (now - this.lastMoveT) / 1000); this.lastMoveT = now; this.director.drag(dx, dy, dt, c.clientHeight); this.needsRender = true; }
    };
    const up = (e: PointerEvent) => {
      const had = this.pointers.delete(e.pointerId); c.releasePointerCapture?.(e.pointerId);
      if (!had) return;
      if (this.pointers.size === 0) {
        if (this.dragged) this.director.dragEnd(); else if (this.downAt && e.type === 'pointerup') this.tap(e.clientX, e.clientY);
        this.downAt = null; c.style.cursor = 'grab';
      } else this.pinchDist = 0;
    };
    const wheel = (e: WheelEvent) => { if (useStore.getState().landing) return; e.preventDefault(); this.director.zoom(Math.exp(Math.max(-120, Math.min(120, e.deltaY)) * 0.0014)); this.needsRender = true; };
    const leave = () => { useStore.getState().setHoverFloor(null); useStore.getState().setHoverKey(null); this.hooks.onFloorTip?.(null); };
    const key = (e: KeyboardEvent, on: boolean) => {
      const t = e.target as HTMLElement | null; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const k = e.key.toLowerCase(); const s = useStore.getState();
      if (!['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) return;
      if (s.view !== 'room' || s.overlay) { this.keys.clear(); return; }
      if (k.startsWith('arrow')) e.preventDefault();
      if (on) this.keys.add(k); else this.keys.delete(k);
      const has = (...ks: string[]) => ks.some((q) => this.keys.has(q));
      const f = (has('w', 'arrowup') ? 1 : 0) - (has('s', 'arrowdown') ? 1 : 0); const st = (has('d') ? 1 : 0) - (has('a') ? 1 : 0);
      const turn = (has('q', 'arrowleft') ? 1 : 0) - (has('e', 'arrowright') ? 1 : 0);
      this.director.setMove(s.mode === 'free_walk' ? f : 0, s.mode === 'free_walk' ? st : 0, turn, has('shift')); this.needsRender = true;
    };
    const kd = (e: KeyboardEvent) => key(e, true), ku = (e: KeyboardEvent) => key(e, false);
    const blur = () => { this.keys.clear(); this.director.setMove(0, 0, 0, false); };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', leave); c.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    this.unsub.push(() => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); c.removeEventListener('pointerleave', leave); c.removeEventListener('wheel', wheel); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur); });
  }

  private collide(x: number, z: number): [number, number] {
    const s = useStore.getState(); if (!s.floorId) return [x, z];
    const nav = buildNavGraph(s.floorId); const [px, py] = resolveCollision(nav, x + 9, 12 - z);
    const room = roomAt(nav.plan, px, py);
    if (!room) return [this.director.look.pos.x, this.director.look.pos.z];      // never leave modelled space
    if (room.key !== s.roomKey && (room.owner === 'zone' || room.owner === 'core' || (s.unitId && room.owner === sideOf(s.unitId)))) { this.walkRoomUpdate = true; s.focusRoom(room.key); this.walkRoomUpdate = false; this.updateFillLights(useStore.getState()); }
    return [px - 9, 12 - py];
  }

  // ------------------------------------------------------------------ cinematic (opt-in, skippable)
  private onCineToggle(s: AppState, prev: AppState) {
    if (s.cine.active) {
      this.cine.snapshot = { floorId: prev.floorId, unitId: prev.unitId, roomKey: prev.roomKey, view: prev.view, env: prev.env, section: prev.section, mode: prev.mode === 'cinematic' ? 'guided' : prev.mode };
      this.cine.chapter = -1; this.cine.t = 0; this.playChapter(s.cine.chapter);
    } else if (this.cine.snapshot) {
      const snap = this.cine.snapshot; this.cine.snapshot = null; this.cine.chapter = -1;
      useStore.setState({ ...snap }); // restoration policy: return the visitor to where they were
    }
  }
  private playChapter(i: number) {
    if (!CHAPTERS[i] && useStore.getState().showcase) i = 0;                      // Showroom film: loop until the visitor leaves
    const ch = CHAPTERS[i]; if (!ch) { useStore.getState().setCine({ active: false, paused: false, chapter: 0 }); useStore.setState({ mode: 'guided', focus: false }); return; }
    this.cine.chapter = i; this.cine.t = 0;
    const st = useStore.getState();
    useStore.setState({ floorId: ch.floorId, unitId: ch.unitId, roomKey: ch.roomKey, view: ch.view, env: { ...st.env, timeMinutes: ch.time }, cine: { ...st.cine, chapter: i } });
  }
  private updateCine(dt: number) {
    const s = useStore.getState(); if (!s.cine.active) return;
    if (s.cine.chapter !== this.cine.chapter) { this.playChapter(s.cine.chapter); return; }
    if (s.cine.paused || this.director.busy) return;
    const ch = CHAPTERS[this.cine.chapter]; if (!ch) return;
    this.cine.t += dt;
    if (!this.director.reduced) this.director.drift(ch.view === 'tower' ? 0.05 : 0.035, dt);
    this.needsRender = true;
    if (this.cine.t >= ch.seconds) this.playChapter(this.cine.chapter + 1);
  }

  // ------------------------------------------------------------------ loop
  start() { if (this.running || this.disposed) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  invalidate() { this.needsRender = true; }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dtMs = now - this.last; this.last = now; const dtRaw = dtMs / 1000; const dt = Math.min(dtRaw, 0.05);
    this.time += dt;
    const d = this.director;
    this.updateCine(dt);
    let render = d.update(dtRaw) || this.needsRender; this.needsRender = false;

    // director-owned scalars drive scene state (single owner for each property)
    const s = useStore.getState();
    const f = s.floorId ? FLOOR_BY_ID[s.floorId] : null;
    // balconies, the terrace and the majlis are OUTDOORS: full sky light and reflections, no interior light treatment
    const outdoorRoom = !!(s.floorId && s.roomKey && getFloorPlan(s.floorId).rooms.find((r) => r.key === s.roomKey)?.outdoor);
    const wantInside = s.view === 'room' && f !== null && !outdoorRoom && this.camera.position.y < f.ffl + f.clear + 0.5 ? 1 : 0;
    if (wantInside !== this.insideTarget) { this.insideTarget = wantInside; void d.animate('inside', wantInside, 0.32); }
    const inside = d.value('inside');
    // V12 (visitor feedback: walls and door frames clipped in free walk): indoors the near plane comes in to 5 cm and the
    // far plane back to 1.8 km (the city beyond the windows is fogged past that), keeping depth precision
    { const nearT = inside > 0.5 ? 0.05 : 0.12, farT = inside > 0.5 ? 1800 : 5200;
      if (this.camera.near !== nearT || this.camera.far !== farT) { this.camera.near = nearT; this.camera.far = farT; this.camera.updateProjectionMatrix(); render = true; } }
    if (this.activeInterior?.byGrp.ceiling) {
      const vis = wantInside === 1 && f !== null && this.camera.position.y < f.ffl + f.clear - 0.02;
      if (this.activeInterior.byGrp.ceiling.visible !== vis) { this.activeInterior.byGrp.ceiling.visible = vis; this.shadowDirty = true; render = true; }
    }
    if (render) {
      this.applyExplode();
      const night = this.env.night; const baked = this.lmActive !== '';
      const lights = s.lights; const lampK = lights === 'off' ? 0.03 : 1; this.lib.setLamp(lampK);
      const fi = inside * (baked ? 0.7 + night * 1.5 : 2.6 + night * 9) * (lights === 'off' ? 0.12 + 0.5 * (1 - night) : 1);
      if (baked) { // baked indirect light: sky share follows the simulated sky, lamp share follows dusk/night
        const meta = LIGHTMAPS[this.lmActive]; const p = this.env.params;
        this.lib.lmUniforms.uLmSky.value.copy(p.skyC).lerp(WARM_BOUNCE, 0.7).multiplyScalar((0.8 + 0.45 * (1 - inside)) * meta.skyGain * p.hemiI * (1 - night * (lights === 'off' ? 0.86 : 0.97)));   // lights off at night: moonlight still spills in, never solid black
        this.lib.lmUniforms.uLmSun.value.copy(p.sunColor).multiply(WARM_BOUNCE).multiplyScalar((0.8 + 0.45 * (1 - inside)) * meta.sunGain * p.sunI * (1 - night)); // sunlight picks up the warm finishes it bounces off
        this.lib.lmUniforms.uLmLamp.value.set('#ffd2a0').multiplyScalar(meta.lampGain * (lights === 'on' ? 2.4 - 1.0 * night : 2.4 - 1.4 * night) * lampK); // fittings are switched on by day too (windowless rooms depend on them), as in the Cycles stills
      }
      // V11.5: the open-air terrace and majlis on level 11 get warm light from the festoon strings after sunset (the three
      // fill lights always exist, so switching them on here never changes the shader light count)
      const deck = s.view === 'room' && outdoorRoom && s.floorId === 'F11' ? Math.min(1, night * 1.3) : 0;
      for (const l of this.fillLights) { l.intensity = Math.max(fi, deck * 14); l.color.set(deck > 0 ? '#ffc98a' : night > 0.5 ? '#ffd9a6' : '#fff1de'); }
      if (d.busy || d.value('explode') > 0 && d.value('explode') < 1) this.shadowDirty = true;
    }

    // highlight easing (frame-rate independent)
    const h = this.hl; const a = 1 - Math.exp(-14 * dt);
    if (Math.abs(h.floorTarget - h.floorOpacity) > 0.003) { h.floorOpacity += (h.floorTarget - h.floorOpacity) * a; (h.floor.material as THREE.MeshBasicMaterial).opacity = h.floorOpacity; h.floor.visible = h.floorOpacity > 0.004; render = true; }
    if (Math.abs(h.areaTarget - h.areaOpacity) > 0.003) { h.areaOpacity += (h.areaTarget - h.areaOpacity) * a; for (const m of h.area) (m.material as THREE.MeshBasicMaterial).opacity = h.areaOpacity; if (h.areaOpacity < 0.004 && h.areaTarget === 0) for (const m of h.area) m.visible = false; render = true; }
    if (this.fadeOverlays.length) {
      for (const fo of this.fadeOverlays) { fo.t += dt / 0.24; fo.mat.opacity = Math.max(0, 1 - fo.t); }
      const done = this.fadeOverlays.filter((x) => x.t >= 1); const mats = new Set(done.map((x) => x.mat));
      for (const x of done) x.mesh.removeFromParent(); for (const m of mats) if (!this.fadeOverlays.some((x) => x.t < 1 && x.mat === m)) this.releaseFadeMat(m);
      this.fadeOverlays = this.fadeOverlays.filter((x) => x.t < 1); render = true;
    }

    if (this.updateSliders(dt, s)) render = true;
    // a planar mirror re-renders the whole scene whenever it is in the view frustum (walls do not stop that), so only the
    // mirrors of the room the visitor is standing in are live; elsewhere the pale glass panel behind them shows
    const mg = this.activeInterior?.root.getObjectByName('mirror');
    if (mg) for (const r of mg.children) { const on = s.view === 'room' && r.userData.mirror === s.roomKey; if (r.visible !== on) { r.visible = on; render = true; } }
    // environment (time / season / weather blend) + tight shadow frustum
    const focus = d.rig === 'orbit' ? d.orbit.target : d.look.pos;
    // V11.5: the shadow area follows the camera distance (10 m steps), so zooming out never shows the edge where shadows
    // stop; walk / room views keep a tight frustum for crisp contact shadows
    const half = s.view === 'room' && d.rig !== 'orbit' ? 13 : Math.min(180, Math.max(s.view === 'tower' ? 90 : 24, Math.ceil((d.orbit.dist * 0.95) / 10) * 10));
    if (this.env.update(dt, s.view === 'tower' ? new THREE.Vector3(0, 22, 0) : new THREE.Vector3(focus.x, f ? f.ffl : focus.y, focus.z), half)) render = true;
    if (this.env.shadowDirty) { this.shadowDirty = true; this.env.shadowDirty = false; this.lib.setNight(this.env.night); this.site.setFoliage(this.env.params.foliage); }
    // these two lights make the tower base read from the aerial orbit; at street level (a few metres away) they would wash
    // the entrance out, so they fade with camera distance (V11 r2: the canopy downlights carry the entrance up close)
    for (const l of this.site.nightLights) { const dist = this.camera.position.distanceTo(l.position); l.intensity = this.env.night * 260 * (1 - inside) * Math.min(1, Math.max(0.1, (dist - 8) / 60)); }
    // indoors the sky dome cannot be occluded by a hemisphere light, so its share is reduced and
    // local fill lights + sun patches carry the room (keeps finishes from washing out)
    const insideBoost = 1 + inside * (this.lmActive ? 0.1 - this.env.night * 0.38 : 0.5 + this.env.night * 0.5);
    // V11.5: PBR Neutral clips bright interiors that AgX used to roll off, so rooms sit ~20 % lower; the sky seen through
    // the glass is lifted instead, so windows read bright as in an interior photograph
    this.renderer.toneMappingExposure = this.env.params.exposure * insideBoost * (1 - 0.34 * inside * (1 - this.env.night));
    this.env.skyDome.mat.uniforms.uExposureComp.value = 1 + inside * 1.9 * (1 - this.env.night);
    this.env.hemi.intensity = this.env.params.hemiI * (1 - (this.lmActive ? 0.42 : 0.3) * inside);
    if (this.lmActive && inside > 0) this.env.hemi.color.lerp(WARM_BOUNCE, 0.38 * inside * (1 - this.env.night));   // V11.5: less peach under PBR Neutral
    // indoors the sky must not mirror itself on timber and table tops: reflections are cut back hard
    this.scene.environmentIntensity = this.env.params.envI * (1 - (this.lmActive ? 0.97 : 0.6) * inside);
    // ...but metals (no diffuse colour) keep about half their outdoor reflection, or brass and bronze read as black
    this.lib.metalRefl.value = (1 - 0.5 * inside) / Math.max(0.03, 1 - (this.lmActive ? 0.97 : 0.6) * inside);
    // V11.3 slow traffic: animates only where it can be seen (tower / street views), on tiers with ambient animation, never
    // under reduced motion; automated captures keep the t = 0 arrangement that Cycles renders
    if (s.view === 'tower' && this.tierCfg.particles && !d.reduced && !FROZEN_WORLD && !document.hidden) { this.trafficT += dt; this.site.setTraffic(this.trafficT); render = true; }
    const windy = this.env.params.wind > 0.5 && this.tierCfg.particles && s.view !== 'room';
    const waterLive = this.exploded === 'F10' && this.tierCfg.particles && d.value('explode') > 0.5;
    if (windy || waterLive || this.env.animated) {
      this.site.setWind(this.env.params.wind, this.time);
      if (waterLive) { const nm = (this.lib.get('water') as THREE.MeshStandardMaterial).normalMap; if (nm) nm.offset.set(this.time * 0.018, this.time * 0.011); }
      render = true;
    }

    if (this.anyFrameWaiters.length) { for (const w of this.anyFrameWaiters.splice(0)) w(); }
    if (this.frameWaiters.length && !d.busy && this.pointers.size === 0) { const w = this.frameWaiters.shift()!; w(); }
    const veil = d.value('veil');
    if (veil !== this.lastVeil) { this.lastVeil = veil; this.hooks.onVeil?.(veil); }

    if (render) {
      if (this.shadowDirty && this.tierCfg.shadows) { this.renderer.shadowMap.needsUpdate = true; this.shadowDirty = false; }
      if (this.postTier && inside > 0.02) {
        const po = this.ensurePost(); po.gtao.blendIntensity = inside * 0.8;
        po.composer.render();
      } else this.renderer.render(this.scene, this.camera);
      this.counters.renders++; if (this.counters.renders <= 3) boot(`frame ${this.counters.renders} done`);
      this.projectLabels();
      this.frameLog.push(dtMs); if (this.frameLog.length > 900) this.frameLog.shift();
      this.adaptive(now, dtMs);
    } else if (this.labelsDirty) this.projectLabels();
  };

  private ensurePost() {
    if (this.post) return this.post;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(this.renderer, rt); composer.setPixelRatio(1); composer.setSize(size.x, size.y);
    composer.addPass(new RenderPass(this.scene, this.camera));
    const gtao = new GTAOPass(this.scene, this.camera, size.x, size.y);
    gtao.updateGtaoMaterial({ radius: 0.4, distanceExponent: 1.4, thickness: 1.2, scale: 1.15, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: 12 });
    composer.addPass(gtao); composer.addPass(new OutputPass());
    this.post = { composer, gtao }; return this.post;
  }

  private projectLabels() {
    this.labelsDirty = false; if (!this.hooks.onLabels) return;
    const w = this.canvas.clientWidth, hh = this.canvas.clientHeight; const v = new THREE.Vector3(); const out: LabelPos[] = [];
    const busy = this.director.busy;
    for (const a of this.anchors) {
      v.set(toWorldX(a.plan[0]), FLOOR_BY_ID[a.floorId].ffl + a.z, toWorldZ(a.plan[1])).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * hh;
      out.push({ id: a.id, x, y, hidden: busy || v.z > 1 || v.z < -1 || x < 24 || x > w - 24 || y < (w < 700 ? 225 : 70) || y > hh - (w < 700 ? 300 : 90) });   // V12: phones keep labels clear of the top bar, navigator and sheet
    }
    this.hooks.onLabels(out);
  }

  /** Auto quality: degrade after sustained slow windows, never in the middle of a transition. */
  private adaptive(now: number, dtMs: number) {
    const s = useStore.getState(); if (s.quality !== 'auto') return;
    if (!this.windowStart) this.windowStart = now;
    if (dtMs < 250) this.windowFrames.push(dtMs);
    if (now - this.windowStart < 5000 || this.windowFrames.length < 60) return;
    const st = frameStats(this.windowFrames); this.windowStart = now; this.windowFrames = [];
    if (st.p95 > 36) { this.windowSlow++; this.windowFast = 0; } else if (st.p95 < 15) { this.windowFast++; this.windowSlow = 0; } else { this.windowSlow = 0; this.windowFast = 0; }
    if (this.director.busy) return;
    const order: Tier[] = ['low', 'balanced', 'high', 'ultra']; const i = order.indexOf(s.tier);
    if (this.windowSlow >= 2 && i > 0) { this.windowSlow = 0; s.setTier(order[i - 1]); s.notify('toast.qualityLowered'); }
  }

  private resize() {
    const p = this.canvas.parentElement ?? this.canvas; const w = Math.max(2, p.clientWidth), h = Math.max(2, p.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tierCfg.dpr));
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    if (this.post) { const sz = this.renderer.getDrawingBufferSize(new THREE.Vector2()); this.post.composer.setSize(sz.x, sz.y); }
    this.updateViewOffset();
    this.needsRender = true; this.labelsDirty = true;
  }

  /** Shift the projection centre into the area not covered by the context panel (no re-layout, no camera move). */
  updateViewOffset() {
    const p = this.canvas.parentElement ?? this.canvas; const w = Math.max(2, p.clientWidth), h = Math.max(2, p.clientHeight);
    const s = useStore.getState(); let ox = 0, oy = 0;
    if (!s.landing && s.view !== 'room') {
      if (w > 860) ox = ((document.documentElement.dir === 'rtl' ? 1 : -1) * Math.min(364, w * 0.3) - (document.documentElement.dir === 'rtl' ? 1 : -1) * 60) / 2;
      else oy = h * 0.15;
    }
    if (ox === 0 && oy === 0) this.camera.clearViewOffset(); else this.camera.setViewOffset(w, h, ox, oy, w, h);
    this.camera.updateProjectionMatrix(); this.needsRender = true; this.labelsDirty = true;
  }

  // ------------------------------------------------------------------ recovery (V7 G5)
  private onLost = (e: Event) => { e.preventDefault(); this.counters.contextLost++; this.stop(); useStore.getState().setWebgl('lost'); };
  private onRestored = () => {
    this.counters.contextRestored++; this.env.markEnvDirty(); this.shadowDirty = true; this.needsRender = true;
    useStore.getState().setWebgl('ok'); this.start();
  };
  private onVisibility = () => { if (document.hidden) this.stop(); else if (useStore.getState().webgl === 'ok') { this.needsRender = true; this.start(); } };
  /** Test hook: lose and restore the GL context (uses WEBGL_lose_context). */
  simulateContextLoss(restoreAfterMs = 700) {
    const ext = this.renderer.getContext().getExtension('WEBGL_lose_context'); if (!ext) return false;
    ext.loseContext(); setTimeout(() => ext.restoreContext(), restoreAfterMs); return true;
  }

  // ------------------------------------------------------------------ public helpers
  /** Level whose interior is currently opened in 3D (null = closed tower). */
  get openFloor(): FloorId | null { return this.exploded; }
  resetCamera() { this.clearStreetView(); const s = useStore.getState(); const dest = this.destFor(s); if (dest.rig === 'orbit') dest.state.az = s.view === 'tower' ? -0.66 : dest.state.az; this.director.go(dest, { id: 'reset_camera', band: [0.5, 0.9] }); }
  zoomBy(factor: number) { this.director.zoom(factor); this.needsRender = true; }
  /** V11: fly to one of the street-level bookmarks shared with the Cycles renders (eye height 1.65 m, lens shift). */
  goStreetView(id: string) {
    const v = VIEW_BY_ID[id]; if (!v?.street) return;
    const st = v.street; const pos = new THREE.Vector3(toWorldX(st.x), 1.65, toWorldZ(st.y)), target = new THREE.Vector3(toWorldX(st.lx), 1.65, toWorldZ(st.ly));
    const d = pos.clone().sub(target); const dist = d.length();
    const limits: OrbitLimits = { minDist: Math.max(8, dist * 0.5), maxDist: dist * 1.6, minPol: 1.2, maxPol: Math.PI / 2 };
    this.streetView = id; this.lensShift = st.shiftY;
    this.director.go({ rig: 'orbit', limits, state: { target, az: Math.atan2(d.x, d.z), pol: Math.PI / 2, dist, fov: st.fov } }, { id: 'street_view', band: [1.2, 2.2] });
    this.camera.updateProjectionMatrix(); this.needsRender = true;
  }
  clearStreetView() { if (!this.streetView) return; this.streetView = null; this.lensShift = 0; this.camera.updateProjectionMatrix(); this.needsRender = true; }
  capture(type = 'image/jpeg', q = 0.9): string { this.renderer.render(this.scene, this.camera); return this.canvas.toDataURL(type, q); }
  perf() {
    const info = this.renderer.info;
    return {
      frames: frameStats(this.frameLog), calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures,
      programs: info.programs?.length ?? 0, textureSets: textureCacheSize(), dpr: this.renderer.getPixelRatio(), phase: this.director.phase, stats: { ...this.director.stats }, counters: { ...this.counters },
      transitions: this.director.records.map((r) => ({ id: r.id, kind: r.kind, durationMs: Math.round(r.durationMs), interrupted: r.interrupted, reduced: r.reduced, ...frameStats(r.frames) })),
    };
  }
  clearPerf() { this.frameLog = []; this.director.records.length = 0; }

  dispose() {
    this.disposed = true; this.stop(); this.ro.disconnect(); for (const u of this.unsub) u();
    this.canvas.removeEventListener('webglcontextlost', this.onLost); this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    document.removeEventListener('visibilitychange', this.onVisibility);
    for (const b of this.interiors.values()) disposeBuilt(b.root); this.interiors.clear();
    this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh || (o as THREE.Points).isPoints || (o as THREE.LineSegments).isLineSegments) m.geometry?.dispose(); });
    for (const pool of this.fadePool.values()) for (const m of pool) m.dispose(); this.fadePool.clear();
    setPhotoLoadedHook(null); this.post?.composer.dispose(); this.post = null; primWorker?.terminate(); primWorker = null; primJobs.clear(); bucketCache.clear();
    this.site.dispose(); this.env.dispose(); this.lib.dispose(); disposeTextureCache(); this.renderer.dispose();
    try { this.renderer.forceContextLoss(); } catch { /* already gone */ }   // V11.2: mode switches must not pile up WebGL contexts
  }
}

export { FLOOR_IDS };
