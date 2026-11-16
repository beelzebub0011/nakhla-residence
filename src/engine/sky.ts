import * as THREE from 'three';

// ---------------------------------------------------------------------------------------------
// V11.5 art-directed sky dome (replaces three's analytic Sky + the separate night dome).
// One shader covers every hour, season and weather: graded zenith / horizon / sun-glow colours keyed on the sun
// elevation (values follow measured clear-sky gradients, then graded for a warm Gulf light), two procedural cloud
// layers (cumulus + high cirrus) lit from the sun with silver edges, a sun disc, the moon and stars. The horizon
// colour is also the fog colour, so the city dissolves into the sky without a seam. Static: nothing animates, so an
// idle scene costs no frames.
// ---------------------------------------------------------------------------------------------

export interface SkyLook {
  zenith: THREE.Color; horizon: THREE.Color; glow: THREE.Color; haze: THREE.Color;
  sunCol: THREE.Color; cloudLit: THREE.Color; cloudShade: THREE.Color;
  cumulus: number; cirrus: number; storm: number; dust: number; night: number; sunVis: number; stars: number;
}

type Key = [number, string, string, string, string];   // elevation°, zenith, horizon, glow toward the sun, cloud-lit
// clear-sky grade (sRGB). Below the horizon: twilight belt, blue hour, night.
const KEYS: Key[] = [
  [-14, '#03070f', '#0b1426', '#120f18', '#1b2233'],
  [-9, '#061024', '#1a2848', '#3b2b3c', '#2c3550'],
  [-5, '#0f2350', '#3f4f7f', '#a2585a', '#7d6a86'],
  [-1.5, '#203f78', '#8e7a92', '#f0804a', '#f2a07a'],
  [1.5, '#2f5590', '#e3a174', '#ff8a45', '#ffc08a'],
  [6, '#3765a3', '#ecc49b', '#ffb36d', '#ffe0b8'],
  [14, '#3a6db3', '#c9d6e2', '#ffe2b4', '#fff3e2'],
  [30, '#2f66b7', '#b6cde4', '#fff1d6', '#ffffff'],
  [65, '#265db5', '#a9c4e3', '#fff6e6', '#ffffff'],
];
const C = (h: string) => new THREE.Color(h);
const ssf = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function skyLook(elevationDeg: number, weather: string, season: string): SkyLook {
  let i = 0; while (i < KEYS.length - 2 && elevationDeg > KEYS[i + 1][0]) i++;
  const [e0, z0, h0, g0, c0] = KEYS[i], [e1, z1, h1, g1, c1] = KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (elevationDeg - e0) / (e1 - e0)));
  const zenith = C(z0).lerp(C(z1), t), horizon = C(h0).lerp(C(h1), t), glow = C(g0).lerp(C(g1), t), cloudLit = C(c0).lerp(C(c1), t);
  const night = 1 - ssf(-8, 2, elevationDeg), day = ssf(-2, 10, elevationDeg);
  // seasons: summer air is hazy and pale (Gulf heat haze), winter is crisp and deep blue
  if (season === 'summer') { horizon.lerp(C('#d9d6cc'), 0.22 * day); zenith.lerp(C('#4a78b8'), 0.25 * day); }
  if (season === 'winter') { zenith.lerp(C('#1d55b0'), 0.25 * day); horizon.lerp(C('#a8c3e0'), 0.15 * day); }
  let cumulus = season === 'summer' ? 0.04 : season === 'winter' ? 0.3 : 0.18, cirrus = season === 'summer' ? 0.25 : 0.5, storm = 0, dust = 0;
  if (weather === 'partly_cloudy') { cumulus = 0.5; cirrus = 0.4; }
  if (weather === 'windy') { cumulus = Math.max(cumulus, 0.24); cirrus = 0.75; }
  if (weather === 'overcast') { cumulus = 0.96; cirrus = 0; storm = 0.45; }
  if (weather === 'light_rain') { cumulus = 1; cirrus = 0; storm = 0.75; }
  if (weather === 'dust') { cumulus = 0.08; cirrus = 0.15; dust = 1; }
  const grey = storm > 0 ? 0.55 + storm * 0.35 : 0;
  const greyZ = C('#7d8794').multiplyScalar(0.25 + 0.75 * (1 - night)), greyH = C('#b4b9bd').multiplyScalar(0.18 + 0.82 * (1 - night));
  zenith.lerp(greyZ, grey); horizon.lerp(greyH, grey); glow.lerp(horizon, grey * 0.7);
  if (dust) { zenith.lerp(C('#a49276').multiplyScalar(0.2 + 0.8 * (1 - night)), 0.65); horizon.lerp(C('#d6b788').multiplyScalar(0.2 + 0.8 * (1 - night)), 0.75); glow.lerp(C('#ff9a4a'), 0.4); }
  const haze = horizon.clone().lerp(C('#d8d2c6').multiplyScalar(1 - night * 0.9), 0.18 * day * (1 - grey));
  const sunCol = C('#fff3e0').lerp(glow, 0.55 * (1 - ssf(4, 25, elevationDeg)));
  const cloudShade = zenith.clone().lerp(horizon, 0.55).multiplyScalar(0.62).lerp(C('#3a3f48'), storm * 0.6);
  cloudLit.lerp(C('#c6cad0').multiplyScalar(1 - night * 0.85), grey * 0.8);
  return { zenith, horizon, glow, haze, sunCol, cloudLit, cloudShade, cumulus, cirrus, storm, dust, night, sunVis: day * (1 - grey) * (1 - dust * 0.55), stars: ssf(-6, -12, elevationDeg) * (1 - grey) * (1 - dust * 0.8) };
}

const vert = /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const frag = /* glsl */`
uniform vec3 uZen, uHor, uGlow, uHaze, uSunCol, uCLit, uCShade, uSun, uMoon;
uniform float uCum, uCir, uStorm, uDust, uNight, uSunVis, uStars, uWind, uSeed, uExposureComp;
varying vec3 vDir;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; mat2 r = mat2(0.8, -0.6, 0.6, 0.8); for (int i = 0; i < 6; i++){ s += a * vnoise(p); p = r * p * 2.03 + 11.7; a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  float hp = max(h, 0.0);
  // gradient: horizon → zenith with a soft optical-depth curve; below the horizon the haze (= fog colour)
  vec3 col = mix(uHor, uZen, pow(smoothstep(0.0, 0.75, hp), 0.5));
  col = mix(col, uHaze, exp(-hp * 9.0));   // reaches the fog colour exactly at the horizon: no seam with the fogged city
  // sun glow: wide warm band on the sun side of the horizon + Mie forward lobe
  vec3 sd = normalize(uSun); float mu = dot(d, sd);
  float az = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-5), normalize(vec3(sd.x, 0.0, sd.z) + 1e-5)), 0.0);
  float low = 1.0 - smoothstep(0.05, 0.45, sd.y);
  col += uGlow * (pow(az, 2.5) * exp(-hp * 5.5) * 0.55 * low + pow(max(mu, 0.0), 10.0) * 0.32 + pow(max(mu, 0.0), 220.0) * 0.9) * (1.0 - uStorm * 0.6) * mix(0.35, 1.0, smoothstep(0.0, 0.07, hp));   // fades to the fog colour at the horizon: no seam behind the skyline
  // dust: the whole dome thickens toward ochre near the horizon
  col = mix(col, uHaze, uDust * (0.35 + 0.65 * exp(-hp * 2.2)));
  // stars (static cells) and the moon
  if (uStars > 0.001 && h > 0.0) {
    vec3 sp = d * 420.0; vec2 cell = floor(sp.xz / (0.35 + hp)); float r = h21(cell + floor(sp.y));
    float st = step(0.9965, r) * (0.4 + 0.6 * h21(cell * 1.7)) * smoothstep(0.02, 0.25, h);
    col += vec3(0.85, 0.9, 1.0) * st * uStars * 1.6;
  }
  vec3 md = normalize(uMoon); float mm = dot(d, md);
  col += vec3(0.75, 0.82, 0.95) * (smoothstep(0.99985, 0.99992, mm) * 2.2 + pow(max(mm, 0.0), 300.0) * 0.18) * uNight * (1.0 - uStorm);
  // sun disc (hidden by cloud below)
  float disc = smoothstep(0.99985, 0.99993, mu) * uSunVis;
  // clouds: two layers projected on a dome plane
  float cl = 0.0; vec3 ccol = vec3(0.0);
  if (h > 0.0) {
    vec2 uv = d.xz / (h + 0.07);
    // cumulus / stratus
    vec2 cu = uv * 0.9 + vec2(uSeed, uSeed * 0.37) + vec2(uWind * 0.6, 0.0);
    float n = fbm(cu); float cov = uCum;
    float dens = smoothstep(1.0 - cov - 0.08, 1.0 - cov + 0.32, n + cov * 0.35);
    // light toward the sun: sample the density a little sunward, thinner = brighter (silver lining)
    vec2 toS = normalize(sd.xz + 1e-4) * 0.12; float n2 = fbm(cu + toS);
    float lit = clamp(0.55 + (n - n2) * 3.2, 0.0, 1.0); lit = mix(lit, 0.35, uStorm);
    vec3 cc = mix(uCShade, uCLit, lit) ;
    cc += uGlow * pow(max(mu, 0.0), 6.0) * (1.0 - dens) * 0.8 * (1.0 - uStorm);   // thin edges glow toward the sun
    cc = mix(cc, cc * vec3(1.15, 0.85, 0.7) + vec3(0.05, 0.02, 0.0), uNight * 0.5);  // night: city glow from below
    float fade = smoothstep(0.0, 0.12, h);
    dens *= fade * (0.82 + 0.18 * uStorm);
    // cirrus: long streaks, high and thin
    vec2 ci = vec2(uv.x * 0.35, uv.y * 1.6) + vec2(uSeed * 2.1, 3.0) + vec2(uWind * 1.5, 0.0);
    float cn = fbm(ci); float cd = smoothstep(1.0 - uCir * 0.55, 1.15 - uCir * 0.3, cn) * smoothstep(0.03, 0.3, h) * 0.55;
    vec3 cic = mix(uCLit, uGlow, 0.35);
    col = mix(col, cic, cd * (1.0 - dens));
    col = mix(col, cc, dens);
    disc *= 1.0 - smoothstep(0.1, 0.5, dens);
  }
  col += uSunCol * disc * 18.0;
  // below the horizon: haze ground so the dome never shows a hard edge
  col = mix(col, uHaze * 0.92, smoothstep(0.0, -0.06, h));
  gl_FragColor = vec4(col * uExposureComp, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class SkyDome {
  readonly mesh: THREE.Mesh; readonly envMesh: THREE.Mesh; readonly mat: THREE.ShaderMaterial;
  constructor(radius = 3800) {
    const u = {
      uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() },
      uSunCol: { value: new THREE.Color() }, uCLit: { value: new THREE.Color() }, uCShade: { value: new THREE.Color() },
      uSun: { value: new THREE.Vector3(0, 1, 0) }, uMoon: { value: new THREE.Vector3(-0.45, 0.62, 0.52).normalize() },
      uCum: { value: 0 }, uCir: { value: 0 }, uStorm: { value: 0 }, uDust: { value: 0 }, uNight: { value: 0 }, uSunVis: { value: 1 }, uStars: { value: 0 },
      uWind: { value: 0 }, uSeed: { value: 3.7 }, uExposureComp: { value: 1 },
    };
    this.mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: true });
    const geo = new THREE.SphereGeometry(radius, 64, 32);
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.name = 'sky'; this.mesh.frustumCulled = false; this.mesh.renderOrder = -1;
    this.envMesh = new THREE.Mesh(geo, this.mat);
  }
  apply(look: SkyLook, sunDir: THREE.Vector3, wind: number) {
    const u = this.mat.uniforms;
    u.uZen.value.copy(look.zenith); u.uHor.value.copy(look.horizon); u.uGlow.value.copy(look.glow); u.uHaze.value.copy(look.haze);
    u.uSunCol.value.copy(look.sunCol); u.uCLit.value.copy(look.cloudLit); u.uCShade.value.copy(look.cloudShade);
    u.uSun.value.copy(sunDir); u.uCum.value = look.cumulus; u.uCir.value = look.cirrus; u.uStorm.value = look.storm; u.uDust.value = look.dust;
    u.uNight.value = look.night; u.uSunVis.value = look.sunVis; u.uStars.value = look.stars; u.uWind.value = wind;
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); }
}
