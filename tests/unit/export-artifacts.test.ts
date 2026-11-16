import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { runAudit } from '../../src/domain/audit';
import { FLOORS, FLOOR_BY_ID, ROOF_LEVEL } from '../../src/domain/tower';
import { buildFloorInterior, buildFloorShell, buildRoof, pergolaPosts } from '../../src/domain/prims';
import { getFloorPlan } from '../../src/domain/plans';
import { EYE_HEIGHT, safeEye } from '../../src/domain/nav';
import { CATALOG, MATERIAL_BY_ID, PACKAGES, SURFACES } from '../../src/domain/materials';
import { FIXED } from '../../src/engine/matlib';
import { CANOPY, MONOLITH, PALM_BASE, TREE_KINDS, broadleafTree, canopyDownlights, palmCrown, palmSpots, sitePrims, streetLampHeads, trafficAt, trafficCarPrims, treeSpots } from '../../src/engine/site';
import { VIEWS } from '../../src/domain/views';
import type { FloorId } from '../../src/domain/types';
import { sunDirection } from '../../src/engine/environment';
import { synthesize, type TexRecipe } from '../../src/engine/texgen';
import { PHOTO_SETS } from '../../src/engine/photosets';
import type { Prim } from '../../src/domain/types';

// Generates the derived artefacts from the canonical model (same source as the WebGL scene):
//  • project_artifacts/geometry_audit.json + .csv   (V7 G1 ledger)
//  • blender/scene_prims.json + scene_meshes.bin + tex/*.png   (input of blender/build_nakhla.py)
// Modelled meshes go to a binary file; the procedural finishes are written as the SAME pixels the
// browser generates, so Cycles and WebGL share geometry AND textures.

function png(rgba: Uint8ClampedArray, n: number): Buffer {
  const row = n * 4 + 1; const raw = Buffer.alloc(row * n);
  for (let y = 0; y < n; y++) { raw[y * row] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * n * 4, n * 4).copy(raw, y * row + 1); }
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
const lin = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); };

interface BMat { lit?: string; kind: string; color: string; rough: number; metal: number; opacity?: number; glow?: number; side2?: boolean; tex?: { d: string; n: string; r: string; cover: [number, number]; tint: number[]; roughMul: number } }

describe('derived artefacts', () => {
  it('writes the geometry audit ledger', () => {
    const audit = runAudit(); expect(audit.ok).toBe(true);
    mkdirSync('project_artifacts', { recursive: true });
    writeFileSync('project_artifacts/geometry_audit.json', JSON.stringify({ generatedBy: 'tests/unit/export-artifacts.test.ts', note: 'CONCEPT • NOT BUILT. Areas are measured from the authored plan polygons of the concept model; not surveyed, not as-built, not professionally verified.', summary: audit.summary, errors: audit.errors, ledger: audit.ledger }, null, 2));
    const head = 'semantic_id,kind,area_sqm,width_m,depth_m,source,status,professionally_verified';
    writeFileSync('project_artifacts/geometry_audit.csv', [head, ...audit.ledger.map((r) => [r.semanticId, r.kind, r.areaSqm, r.widthM ?? '', r.depthM ?? '', r.source, r.status, r.professionallyVerified].join(','))].join('\n'));
    expect(audit.ledger.length).toBeGreaterThan(60);
  });

  it('writes the scene for Blender (prims + mesh binary + shared textures)', () => {
    mkdirSync('blender/tex', { recursive: true });
    const texOf = (key: string, recipe: TexRecipe): BMat['tex'] => {
      if (recipe.type === 'photo') {
        const meta = PHOTO_SETS[recipe.set]; const sc = recipe.scale ?? 1; const k = (meta.tint ? 1 / 0.6 : 1) * (recipe.gain ?? 1);
        return { d: `public/textures/${recipe.set}_d.jpg`, n: `public/textures/${recipe.set}_n.jpg`, r: `public/textures/${recipe.set}_r.jpg`, cover: [meta.cover[0] * sc, meta.cover[1] * sc], tint: lin(recipe.tint ?? '#ffffff').map((v) => +(v * k).toFixed(4)), roughMul: +(recipe.rough / Math.max(0.05, meta.rough)).toFixed(3) };
      }
      const m = synthesize(key, recipe, 512); const safe = key.replace(/[^a-zA-Z0-9_]/g, '_');
      writeFileSync(`blender/tex/${safe}_d.png`, png(m.albedo, m.size)); writeFileSync(`blender/tex/${safe}_n.png`, png(m.normal, m.size)); writeFileSync(`blender/tex/${safe}_r.png`, png(m.rough, m.size));
      return { d: `blender/tex/${safe}_d.png`, n: `blender/tex/${safe}_n.png`, r: `blender/tex/${safe}_r.png`, cover: m.cover, tint: [1, 1, 1], roughMul: 1 };
    };
    const materials: Record<string, BMat> = {};
    for (const [slot, d] of Object.entries(FIXED)) {
      if (d.t === 'tex') materials[slot] = { kind: 'img', color: (d.recipe as { base: string }).base, rough: (d.recipe as { rough: number }).rough, metal: d.metal ?? 0, side2: d.side2, tex: texOf(`fixed:${slot}`, d.recipe), ...(d.lit ? { lit: texOf(`fixed:${slot}_lit`, d.lit)!.d } : {}) };   // V11.3: lit-window map for the city after sunset
      else if (d.t === 'plain') materials[slot] = { color: d.color, rough: d.rough, metal: d.metal ?? 0, kind: slot === 'shop_lit' ? 'shop_lit' : slot === 'lantern' ? 'lantern' : d.emissive ? 'emissive' : 'pbr', glow: d.glow, side2: d.side2 };
      else if (d.t === 'basic') materials[slot] = { color: d.color, rough: 1, metal: 0, kind: slot === 'fill_lit' ? 'window_lit' : slot === 'contact' || slot === 'glow_pool' ? 'skip' : 'flat' };   // glow pools are a web-only stand-in for lamp light (Cycles has real lamp lights)
      else materials[slot] = { color: d.color, rough: d.rough, metal: 0, kind: slot === 'water' ? 'water' : 'glass', opacity: d.opacity };
    }
    for (const s of SURFACES) { const m = MATERIAL_BY_ID[PACKAGES.standard.ids[s.category]]; materials[`surf:${s.id}`] = { kind: 'img', color: m.swatch, rough: m.recipe.rough, metal: 0, tex: texOf(m.id, m.recipe) }; }

    // prims: plain ones as rounded JSON, modelled meshes appended to one little-endian float32 file
    const chunks: Float32Array[] = []; let off = 0; let tris = 0;
    const lights: { floor: string; kind: string; pos: number[] }[] = [];
    const ser = (prims: Prim[], floor?: string) => {
      const out: unknown[] = [];
      for (const p of prims) {
        if (p.grp === 'nav') continue;
        if (p.k === 'mesh') {
          const n = p.pos.length / 3; out.push({ k: 'mesh', sem: p.sem, mat: p.mat, grp: p.grp, room: p.room, ns: p.noShadow ? 1 : 0, off, n });
          chunks.push(p.pos, p.nrm, p.uv); off += n * 8; tris += n / 3;
          if (floor && (p.mat === 'led' || p.mat === 'lamp_shade')) {
            let x = 0, y = 0, z = 0; for (let i = 0; i < p.pos.length; i += 3) { x += p.pos[i]; y += p.pos[i + 1]; z += p.pos[i + 2]; }
            const kind = p.sem.endsWith('downlight') ? 'down' : p.sem.endsWith('cove_led') ? 'cove' : p.sem.endsWith('festoon_bulb') ? 'bulb' : p.sem.endsWith('pendant') ? 'pendant' : p.mat === 'lamp_shade' ? 'lamp' : 'strip';
            lights.push({ floor, kind, pos: [+(x / n).toFixed(3), +(y / n).toFixed(3), +(z / n).toFixed(3)] });
          }
        } else out.push(JSON.parse(JSON.stringify(p, (_k, v) => (typeof v === 'number' ? Math.round(v * 10000) / 10000 : v))));
      }
      return out as { mat: string }[];
    };
    const interiors: Record<string, { mat: string }[]> = {};
    for (const f of ['G', 'F04', 'F10', 'F11'] as const) interiors[f] = ser(buildFloorInterior(f), f);
    const shells: Record<string, { mat: string }[]> = { residential: ser(buildFloorShell('F01')), G: ser(buildFloorShell('G')), F10: ser(buildFloorShell('F10')), F11: ser([...buildFloorShell('F11'), ...pergolaPosts()], 'F11') };   // V11.5: terrace festoon bulbs + lanterns are real lights in Cycles

    // camera bookmarks in Blender coordinates (X east, Y north, Z up), metres
    const toB = (x: number, y: number, z: number) => [+(x - 9).toFixed(3), +(y - 12).toFixed(3), +z.toFixed(3)];
    const cams: { id: string; pos: number[]; look: number[]; fovDeg: number; time: number; floor: string | null; title: Record<string, string>; golden?: boolean; shiftY?: number; kind?: string; interior?: string }[] = [];
    const orbit = (id: string, az: number, pol: number, dist: number, ty: number, time: number, title: Record<string, string>) => {
      const x = dist * Math.sin(pol) * Math.sin(az), y3 = ty + dist * Math.cos(pol), z3 = dist * Math.sin(pol) * Math.cos(az);
      cams.push({ id, pos: [+x.toFixed(3), +(-z3).toFixed(3), +y3.toFixed(3)], look: [0, 0, ty], fovDeg: 32, time, floor: null, title });
    };
    const street = (id: string, x: number, y: number, lx: number, ly: number, fov: number, shiftY: number, time: number, title: Record<string, string>, fx: { glare?: boolean; dust?: boolean } = {}, z = 1.65) =>
      cams.push({ id, pos: toB(x, y, z), look: toB(lx, ly, z), fovDeg: fov, time, floor: null, title, shiftY, kind: 'street', interior: 'G', ...fx });   // V11 r2: the real lobby is seen through the glass
    const room = (id: string, floor: FloorId, key: string, time: number, title: Record<string, string>, golden = false) => {
      const r = getFloorPlan(floor).rooms.find((x) => x.key === key)!; const eye = safeEye(floor, r); const ffl = FLOOR_BY_ID[floor].ffl;
      const ph = r.view!.photo;   // V11.4 D20: a level photographer's camera with lens shift, where the plan asks for one
      cams.push({ id, pos: toB(eye[0], eye[1], ffl + (ph?.z ?? EYE_HEIGHT)), look: toB(r.view!.look[0], r.view!.look[1], ffl + (ph?.z ?? 1.2)), fovDeg: ph?.fov ?? 64, time, floor, title, golden, ...(ph ? { shiftY: ph.shiftY } : {}) });
    };
    // camera bookmarks come from the shared list (src/domain/views.ts) — also read by the photoreal website
    for (const v of VIEWS) {
      if (v.kind === 'orbit') orbit(v.id, v.orbit!.az, v.orbit!.pol, v.orbit!.dist, v.orbit!.ty, v.time, v.title);
      else if (v.kind === 'street') { const st = v.street!; street(v.id, st.x, st.y, st.lx, st.ly, st.fov, st.shiftY, v.time, v.title, v.fx, st.z); }
      else room(v.id, v.floor!, v.roomKey!, v.time, v.title, v.golden);
    }
    const sun: Record<string, number[]> = {};
    for (const t of new Set(cams.map((c) => c.time))) { const d = sunDirection(t, 'summer'); sun[t] = [+d.dir.x.toFixed(4), +(-d.dir.z).toFixed(4), +d.dir.y.toFixed(4), +d.elevationDeg.toFixed(2), +d.azimuthDeg.toFixed(2)]; }

    // V11.4 crown (D18): close review views of the tower top, rendered only on request (blender --crown-cams), never in the published set
    const crownTitle = { en: 'Roof crown preview', ar: 'معاينة تاج السطح', ckb: 'پێشبینینی تاجی سەربان', zh: '屋顶冠饰预览' };
    const crownPreviewCameras = ([['crown_close_golden', 1080], ['crown_close_dusk', 1165], ['crown_close_night', 1260]] as [string, number][])
      .map(([id, time]) => ({ id, pos: [30, -40, 40.5], look: [0, 0, 44], fovDeg: 30, time, floor: null, title: crownTitle }));
    for (const c of crownPreviewCameras) if (!sun[c.time]) { const d = sunDirection(c.time, 'summer'); sun[c.time] = [+d.dir.x.toFixed(4), +(-d.dir.z).toFixed(4), +d.dir.y.toFixed(4), +d.elevationDeg.toFixed(2), +d.azimuthDeg.toFixed(2)]; }
    const roof = ser(buildRoof()), site = ser([...sitePrims(), ...trafficAt(0).flatMap(([x, y, d, p]) => trafficCarPrims(x, y, d, p))]);   // V11.3: traffic as it stands at t = 0 (same as the live captures)
    const scene = {
      meta: { project: 'NAKHLA RESIDENCE', status: 'CONCEPT • NOT BUILT', units: 'metres', axes: 'plan x east, y north, z up from each floor FFL; footprint 18 x 24 centred by the Blender builder', generatedBy: 'tests/unit/export-artifacts.test.ts', creator: 'Rashid Omar Mohammed' },
      floors: FLOORS.map((f) => ({ id: f.id, ffl: f.ffl, floorToFloor: f.floorToFloor, clear: f.clear, category: f.category, shell: f.category === 'residential' ? 'residential' : f.id })),
      roofLevel: ROOF_LEVEL, shells, interiors, interiorFloor: { G: 'G', F04: 'F04', F10: 'F10', F11: 'F11' },
      roof, crownPreviewCameras, site, materials, cameras: cams, sun, lights, meshBin: 'scene_meshes.bin',
      palms: { spots: palmSpots(), crown: palmCrown(false), skirt: palmCrown(true), plazaZ: PALM_BASE }, streetLights: streetLampHeads(),
      trees: { kinds: TREE_KINDS, geo: TREE_KINDS.map((k) => broadleafTree(k)), spots: treeSpots(), leafTex: 'public/textures/leaf_cluster.png' },
      canopyLights: canopyDownlights().map(([x, y]) => [x, y, CANOPY.z0 - 0.02]), canopySign: { x: 9, y: CANOPY.y0, z: (CANOPY.z0 + 0.06 + CANOPY.z1) / 2, text: 'NAKHLA RESIDENCE' }, monolithSign: MONOLITH.sign,
      catalog: CATALOG.map((m) => ({ id: m.id, category: m.category, swatch: m.swatch, name: m.name.en })),
    };
    const bin = new Float32Array(off); let o = 0; for (const c of chunks) { bin.set(c, o); o += c.length; }
    writeFileSync('blender/scene_meshes.bin', Buffer.from(bin.buffer));
    writeFileSync('blender/scene_prims.json', JSON.stringify(scene));
    const n = Object.values(shells).reduce((a, b) => a + b.length, 0) + Object.values(interiors).reduce((a, b) => a + b.length, 0) + roof.length + site.length;
    expect(n).toBeGreaterThan(3000); expect(cams.length).toBeGreaterThanOrEqual(12); expect(tris).toBeGreaterThan(50000); expect(lights.length).toBeGreaterThan(20);
    for (const p of [...Object.values(shells).flat(), ...Object.values(interiors).flat()]) expect(materials[p.mat], `material ${p.mat}`).toBeDefined();
    console.log(`[export] prims ${n}, modelled triangles ${Math.round(tris)}, lights ${lights.length}, mesh bin ${(off * 4 / 1e6).toFixed(1)} MB`);
  }, 120000);
});
