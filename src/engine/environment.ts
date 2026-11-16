import * as THREE from 'three';
import { SkyDome, skyLook, type SkyLook } from './sky';

// ---------------------------------------------------------------------------------------------
// SIMULATED environment: hour, season and weather drive sun, sky, ambient light, fog and
// exposure. This is scene appearance for a fictional Basra-inspired site — NOT live weather,
// NOT a solar/daylight analysis. Changing it never touches floor/unit/room/finish state.
// ---------------------------------------------------------------------------------------------

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherId = 'clear' | 'partly_cloudy' | 'overcast' | 'light_rain' | 'dust' | 'windy';
export const SEASONS: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];
export const WEATHERS: WeatherId[] = ['clear', 'partly_cloudy', 'overcast', 'light_rain', 'dust', 'windy'];
export interface EnvInput { timeMinutes: number; seasonId: SeasonId; weatherId: WeatherId }

interface Params {
  dir: THREE.Vector3; sunColor: THREE.Color; sunI: number;
  skyC: THREE.Color; groundC: THREE.Color; hemiI: number;
  fogC: THREE.Color; fogD: number; exposure: number; envI: number;
  turbidity: number; rayleigh: number; night: number; rain: number; wind: number; foliage: THREE.Color; cloud: number;
  /** civil twilight / blue hour (sun 0 … −9°): drives the sky dome only, lighting keeps following `night` */
  twi: number; sunAz: THREE.Vector3;
  /** V11.5: graded sky (also drives fog colour, hemisphere fill and sun tint) */
  look: SkyLook; sunEl: number;
}

const LAT = (30.5 * Math.PI) / 180;
const DECL: Record<SeasonId, number> = { spring: 0, summer: 23.4, autumn: -2, winter: -23.4 };
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Simulated solar direction (world space: +X east, +Y up, +Z south). */
export function sunDirection(timeMinutes: number, season: SeasonId): { dir: THREE.Vector3; elevationDeg: number; azimuthDeg: number } {
  const dec = (DECL[season] * Math.PI) / 180; const H = ((timeMinutes / 60 - 12) * 15 * Math.PI) / 180;
  const sinEl = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(H);
  const el = Math.asin(Math.max(-1, Math.min(1, sinEl))); const cosEl = Math.max(1e-4, Math.cos(el));
  let az = Math.acos(Math.max(-1, Math.min(1, (Math.sin(dec) - sinEl * Math.sin(LAT)) / (cosEl * Math.cos(LAT)))));
  if (H > 0) az = 2 * Math.PI - az;
  return { dir: new THREE.Vector3(Math.sin(az) * cosEl, sinEl, -Math.cos(az) * cosEl).normalize(), elevationDeg: (el * 180) / Math.PI, azimuthDeg: (az * 180) / Math.PI };
}

function compute(e: EnvInput): Params {
  const s = sunDirection(e.timeMinutes, e.seasonId); const el = s.elevationDeg;
  const night = 1 - ss(-7, 5, el); const day = ss(-2, 16, el); const warm = 1 - ss(3, 32, el);
  const w = e.weatherId;
  const sunK = w === 'clear' || w === 'windy' ? 1 : w === 'partly_cloudy' ? 0.72 : w === 'dust' ? 0.5 : w === 'overcast' ? 0.16 : 0.1;
  const hemiK = w === 'overcast' ? 1.3 : w === 'light_rain' ? 1.12 : w === 'dust' ? 1.05 : 1;
  const grey = w === 'overcast' ? 0.85 : w === 'light_rain' ? 0.9 : w === 'partly_cloudy' ? 0.3 : 0;
  const look = skyLook(el, w, e.seasonId);
  const sunColor = new THREE.Color('#fff4e2').lerp(new THREE.Color('#ff9d5c'), warm * 0.85);
  if (w === 'dust') sunColor.lerp(new THREE.Color('#f0b070'), 0.5);
  const skyDay = new THREE.Color('#cfdcf0').lerp(new THREE.Color('#f3c9a2'), warm * (1 - night) * 0.75).lerp(new THREE.Color('#c9cdd2'), grey);
  if (w === 'dust') skyDay.lerp(new THREE.Color('#d9c39c'), 0.7);
  // ambient light is kept close to neutral so ivory finishes read ivory, not blue
  // V11.5: the sky fill takes the colour of the real sky (cool in shade, warm at golden hour) so lit and shaded faces
  // separate the way they do in a photograph; it used to be near-white, which flattened every façade to white
  const skyC = look.zenith.clone().lerp(look.horizon, 0.55).lerp(new THREE.Color('#fff1dc'), 0.35 * (1 - night)).lerp(new THREE.Color('#33466e'), night * 0.7);
  const groundC = new THREE.Color('#c9b592').lerp(new THREE.Color('#1c1a1c'), night);
  const fogC = look.haze.clone();   // V11.5: the fog IS the sky's horizon colour, so the city melts into the sky
  void skyDay;
  const moon = new THREE.Vector3(-0.45, 0.72, 0.52).normalize();
  // below the horizon the single directional light becomes a faint moon; its intensity passes
  // through ~0 at the horizon so the direction change is never visible.
  const useMoon = el < -3;
  const seasonFoliage: Record<SeasonId, string> = { spring: '#5d8443', summer: '#5a7340', autumn: '#6f7244', winter: '#4f6a45' };
  return {
    dir: useMoon ? moon : s.dir.clone().setY(Math.max(0.04, s.dir.y)).normalize(),
    sunColor: useMoon ? new THREE.Color('#a9bfe8') : sunColor,
    sunI: useMoon ? 0.85 * ss(-3, -9, el) * (grey > 0.5 ? 0.45 : 1) : 5.2 * ss(-1.5, 9, el) * sunK,   // V11.5: the low sun stays a strong key at golden hour   // moonlight: enough to read façades and ground, never black
    skyC, groundC, hemiI: (0.46 + 0.5 * (1 - night)) * hemiK,   // V11.5: shade ≈ 1/4 of sun, as in a photograph
    fogC, fogD: w === 'dust' ? 0.0062 : w === 'light_rain' ? 0.0036 : w === 'overcast' ? 0.0022 : e.seasonId === 'summer' ? 0.00105 : 0.0008,   // visibility ≈ 3.9 / density: 3–4 km on a clear day, ~600 m in dust
    exposure: 0.62 + night * 0.18 + (w === 'overcast' || w === 'light_rain' ? 0.14 : 0),
    envI: (0.24 + 0.3 * (1 - night)) * (w === 'overcast' || w === 'light_rain' ? 0.85 : 1),
    turbidity: w === 'dust' ? 18 : w === 'overcast' || w === 'light_rain' ? 14 : w === 'partly_cloudy' ? 6 : e.seasonId === 'summer' ? 2.6 : 2,
    rayleigh: w === 'overcast' || w === 'light_rain' ? 0.5 : w === 'dust' ? 0.9 : e.seasonId === 'winter' ? 2.2 : 1.9,
    night, twi: ss(-9.5, -4, el) * (1 - ss(1, 6, el)), sunAz: s.dir.clone().setY(0).normalize(), rain: w === 'light_rain' ? 1 : 0, wind: w === 'windy' ? 1 : w === 'light_rain' ? 0.35 : 0.12,
    foliage: new THREE.Color(seasonFoliage[e.seasonId]), look, sunEl: el,
    cloud: w === 'overcast' || w === 'light_rain' ? 0.94 : w === 'partly_cloudy' ? 0.52 : w === 'dust' ? 0.3 : e.seasonId === 'winter' ? 0.22 : 0.1,
  };
}

/** Khronos PBR Neutral tone mapping (same curve as three's NeutralToneMapping) applied to colour × exposure. */
function neutralTone(c: THREE.Color, exposure: number): THREE.Color {
  let r = c.r * exposure, g = c.g * exposure, b = c.b * exposure;
  const x = Math.min(r, g, b); const off = x < 0.08 ? x - 6.25 * x * x : 0.04; r -= off; g -= off; b -= off;
  const peak = Math.max(r, g, b); const sc = 0.76; if (peak < sc) return new THREE.Color(r, g, b);
  const d = 1 - sc, np = 1 - (d * d) / (peak + d - sc); const k = np / peak; r *= k; g *= k; b *= k;
  const gg = 1 - 1 / (0.15 * (peak - np) + 1); return new THREE.Color(r + (np - r) * gg, g + (np - g) * gg, b + (np - b) * gg);
}
/** sun direction for the dome: the real azimuth with the elevation of the blended parameters */
function sunDirection0(p: Params): THREE.Vector3 { const el = (p.sunEl * Math.PI) / 180; return p.sunAz.clone().multiplyScalar(Math.cos(el)).setY(Math.sin(el)).normalize(); }

export class Environment {
  readonly sun = new THREE.DirectionalLight('#ffffff', 3);
  readonly hemi = new THREE.HemisphereLight('#b9d4fb', '#b9a887', 0.9);
  readonly skyDome = new SkyDome();
  readonly sky = this.skyDome.mesh;
  readonly rain: THREE.LineSegments;
  private cur: Params; private target: Params;
  private pmrem: THREE.PMREMGenerator; private envScene = new THREE.Scene(); private envRT: THREE.WebGLRenderTarget | null = null;
  private envDirty = true; private blendT = 1; private midDone = true;
  private rainTime = { value: 0 };
  shadowDirty = true;
  particlesEnabled = true;
  /** blend duration (s); 0 => immediate (reduced motion) */
  blendSeconds = 0.9;

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, input: EnvInput) {
    this.cur = compute(input); this.target = this.cur;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.sky.matrixAutoUpdate = false; this.sky.updateMatrix(); this.envScene.add(this.skyDome.envMesh);
    const groundDisc = new THREE.Mesh(new THREE.CircleGeometry(3800, 24), new THREE.MeshBasicMaterial({ color: '#7d725f' }));
    groundDisc.rotation.x = -Math.PI / 2; groundDisc.position.y = -2; this.envScene.add(groundDisc);
    this.sun.castShadow = true; this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04;
    scene.add(this.sky, this.sun, this.sun.target, this.hemi);
    scene.fog = new THREE.FogExp2('#ffffff', 0.001);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    // rain streaks: vertex shader animates fall, so the CPU does nothing per frame
    const rg = new THREE.BufferGeometry(); const rp: number[] = []; const ro: number[] = [];
    for (let i = 0; i < 1400; i++) { const x = (rnd() - 0.5) * 90, y = rnd() * 60, z = (rnd() - 0.5) * 90; rp.push(x, y, z, x, y, z); ro.push(0, 1); }
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('tip', new THREE.Float32BufferAttribute(ro, 1));
    const rm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uTime: this.rainTime, uOpacity: { value: 0 } },
      vertexShader: 'attribute float tip; uniform float uTime; void main(){ vec3 p = position; p.y = mod(p.y - uTime * 26.0, 60.0); p.y += tip * 0.9; p.x += tip * 0.12; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform float uOpacity; void main(){ gl_FragColor = vec4(0.82, 0.86, 0.9, uOpacity); }',
    });
    this.rain = new THREE.LineSegments(rg, rm); this.rain.frustumCulled = false; this.rain.visible = false; scene.add(this.rain);
    this.apply();
  }

  get params() { return this.cur; }
  get night() { return this.cur.night; }
  get animated() { return this.cur.rain > 0.02 && this.particlesEnabled; }
  get blending() { return this.blendT < 1; }
  private from: Params | null = null;

  setTarget(input: EnvInput, immediate = false) {
    this.target = compute(input);
    if (immediate || this.blendSeconds <= 0) { this.cur = this.target; this.blendT = 1; this.envDirty = true; this.shadowDirty = true; this.apply(); return; }
    this.from = this.cur; this.blendT = 0; this.midDone = false;
  }

  /** Advance the blend. Returns true while the scene needs re-rendering. */
  update(dt: number, focus: THREE.Vector3, shadowHalf: number): boolean {
    let changed = false;
    if (this.blendT < 1 && this.from) {
      this.blendT = Math.min(1, this.blendT + dt / this.blendSeconds);
      const k = this.blendT * this.blendT * (3 - 2 * this.blendT); const a = this.from, b = this.target;
      const L = (x: number, y: number) => x + (y - x) * k;
      this.cur = {
        dir: a.dir.clone().lerp(b.dir, k).normalize(), sunColor: a.sunColor.clone().lerp(b.sunColor, k), sunI: L(a.sunI, b.sunI),
        skyC: a.skyC.clone().lerp(b.skyC, k), groundC: a.groundC.clone().lerp(b.groundC, k), hemiI: L(a.hemiI, b.hemiI),
        fogC: a.fogC.clone().lerp(b.fogC, k), fogD: L(a.fogD, b.fogD), exposure: L(a.exposure, b.exposure), envI: L(a.envI, b.envI),
        turbidity: L(a.turbidity, b.turbidity), rayleigh: L(a.rayleigh, b.rayleigh), night: L(a.night, b.night), twi: L(a.twi, b.twi), sunAz: b.sunAz.clone(), rain: L(a.rain, b.rain), wind: L(a.wind, b.wind),
        foliage: a.foliage.clone().lerp(b.foliage, k), cloud: L(a.cloud, b.cloud), sunEl: L(a.sunEl, b.sunEl),
        look: { zenith: a.look.zenith.clone().lerp(b.look.zenith, k), horizon: a.look.horizon.clone().lerp(b.look.horizon, k), glow: a.look.glow.clone().lerp(b.look.glow, k), haze: a.look.haze.clone().lerp(b.look.haze, k),
          sunCol: a.look.sunCol.clone().lerp(b.look.sunCol, k), cloudLit: a.look.cloudLit.clone().lerp(b.look.cloudLit, k), cloudShade: a.look.cloudShade.clone().lerp(b.look.cloudShade, k),
          cumulus: L(a.look.cumulus, b.look.cumulus), cirrus: L(a.look.cirrus, b.look.cirrus), storm: L(a.look.storm, b.look.storm), dust: L(a.look.dust, b.look.dust), night: L(a.look.night, b.look.night), sunVis: L(a.look.sunVis, b.look.sunVis), stars: L(a.look.stars, b.look.stars) },
      };
      if (!this.midDone && this.blendT > 0.5) { this.midDone = true; this.envDirty = true; }
      if (this.blendT >= 1) { this.cur = this.target; this.envDirty = true; }
      this.shadowDirty = true; this.apply(); changed = true;
    }
    // keep the shadow frustum tight around what the visitor is looking at
    const s = this.sun; const cam = s.shadow.camera as THREE.OrthographicCamera;
    // V11.5: snap the focus to the shadow-map texel grid (no shimmer when the camera moves) and scale the normal bias with
    // the texel size (no acne on far façades when the frustum is large)
    const texel = (2 * shadowHalf) / Math.max(512, s.shadow.mapSize.x); const snapped = focus.clone(); snapped.x = Math.round(snapped.x / texel) * texel; snapped.z = Math.round(snapped.z / texel) * texel;
    if (cam.right !== shadowHalf || !s.target.position.equals(snapped)) {
      cam.left = -shadowHalf; cam.right = shadowHalf; cam.top = shadowHalf; cam.bottom = -shadowHalf; cam.near = 1; cam.far = 260 + shadowHalf * 2; cam.updateProjectionMatrix();
      s.target.position.copy(snapped); s.target.updateMatrixWorld(); this.shadowDirty = true;
      s.shadow.normalBias = Math.max(0.035, texel * 0.9); s.shadow.bias = -0.0003 - texel * 0.0004;
    }
    focus = snapped;
    s.position.copy(focus).addScaledVector(this.cur.dir, 130 + shadowHalf);
    if (this.envDirty) { this.refreshEnvMap(); changed = true; }
    if (this.animated) { this.rainTime.value += dt; this.rain.position.set(focus.x, Math.max(0, focus.y - 25), focus.z); changed = true; }
    return changed;
  }

  private apply() {
    const p = this.cur;
    this.sun.color.copy(p.sunColor); this.sun.intensity = p.sunI;
    this.hemi.color.copy(p.skyC); this.hemi.groundColor.copy(p.groundC); this.hemi.intensity = p.hemiI;
    const fog = this.scene.fog as THREE.FogExp2; fog.color.copy(neutralTone(p.fogC, p.exposure)); fog.density = p.fogD;   // three mixes fog AFTER tone mapping: pass the displayed haze, so fog = sky at the horizon
    this.renderer.toneMappingExposure = p.exposure;
    this.scene.environmentIntensity = p.envI;
    // V11.5: the dome shows the true sun direction (the light itself is clamped a little above the horizon)
    const sd = sunDirection0(p); this.skyDome.apply(p.look, sd, p.wind);
    const rainOn = p.rain > 0.02 && this.particlesEnabled;
    this.rain.visible = rainOn; ((this.rain.material as THREE.ShaderMaterial).uniforms.uOpacity.value as number) = 0;
    (this.rain.material as THREE.ShaderMaterial).uniforms.uOpacity.value = p.rain * 0.34;
  }

  private refreshEnvMap() {
    this.envDirty = false;
    const prev = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envScene, 0, 1, 5000);
    this.scene.environment = this.envRT.texture;
    prev?.dispose();
  }
  markEnvDirty() { this.envDirty = true; }
  configureShadows(size: number, enabled: boolean) {
    this.sun.castShadow = enabled;
    if (this.sun.shadow.mapSize.x !== size) { this.sun.shadow.mapSize.set(size, size); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null as never; }
    this.shadowDirty = true;
  }
  dispose() { this.envRT?.dispose(); this.pmrem.dispose(); this.rain.geometry.dispose(); this.skyDome.dispose(); }
}
