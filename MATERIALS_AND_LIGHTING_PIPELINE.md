# Materials and lighting pipeline

Updated 2026-11-12. Covers how surfaces, textures, light and colour get from the canonical model to the live website and to Blender / Cycles, and why the pipeline is built this way.

## 1. Direction of the pipeline (a deliberate deviation from addendum T09)

T09 suggests Blender as the authoring source with Three.js consuming exported GLB files. This project inverts that: **the TypeScript model is the source**, and both the website and Blender consume it.

| Why | Effect |
|---|---|
| The model is parametric (walls derived from rooms, furniture placed by rule, 18 apartments from 2 plans) | one change propagates everywhere; no manual re-export |
| Finishes are swapped live by visitors | surfaces must stay separate and keep their own materials in the browser |
| Measurements and the assistant read the same data | no drift between "what is drawn" and "what is said" |

Blender receives `blender/scene_prims.json` + `scene_meshes.bin` (written by `npm test`) and builds the identical scene with the same meshes and the same texture files. The `.glb` (`blender/nakhla_tower.glb`) is a derived export for interchange; the website does not load it.

## 2. Materials

| Family | Source | Notes |
|---|---|---|
| Wood veneers, decking, oak furniture, leather, linen, velvet, boucle / tartan, marble paving, plaster planters | 12 CC0 photo-scanned PBR sets (Poly Haven, 1K: colour, OpenGL normal, roughness); 11 in use | `tools/process_textures.py` → `public/textures`; neutral sets are converted to luminance and tinted per material, so one scan serves many colours |
| Porcelain / tiles, paint, laminate, quartz-look, stone-look, concrete, mosaic | original procedural textures at real module sizes (600 × 1200 mm etc.), synthesised in a Web Worker | exact tile modules and grout; no supplier implied |
| Metals (brass, bronze, black metal, chrome), glass, ceramics, emissive fittings | plain PBR parameters | dielectrics stay non-metallic; only real metals use metalness 0.85–1. The terrace pergola is bronze-colour powder coat (`bronze_pc`, a paint), not bare metal |
| Façades of the fictional neighbours | original procedural window-grid textures + lit-window masks for night | `texgen.ts` (`facade`) |

UVs are in metres everywhere, so a texture's real-world size (`cover`) is honoured on every surface. The same files are box-projected in Cycles. Every catalogue finish keeps a stable `MAT_*` id; swapping a finish re-binds textures on one material (no shader rebuild), including its baked-light twins.

## 3. Light — real-time (website)

| Component | What it does |
|---|---|
| Sun | directional light from the simulated solar position (hour, season); shadow map fitted to what is on screen |
| Sky / reflections | procedural sky → prefiltered environment map; indoors its diffuse contribution is switched off (it was leaking in as grey light) and sky reflections are cut to 3 %. Because three.js applies one scene-wide reflection strength to every material, metals (which have no diffuse colour) get a shader term instead: inside a baked room they reflect the room's own light (radiance ≈ 0.19 × the baked irradiance where the piece stands), outside they keep about half of the sky reflection |
| **Baked indirect light** | Cycles bakes walls, floors and ceilings of each floor category into a 1024² atlas with three shares — sky (R), lamps (G), first-bounce sunlight (B) — as luminance only, so any finish can be swapped on top. The engine recolours each share live by hour, weather and the lighting switch |
| Furniture ambient | a top-down map of the same baked irradiance at floor level (`tools/floor_irradiance.py`) lights each piece of furniture from where it stands |
| Fill and practical lights | a few point lights and emissive fittings (downlights, pendants, LED strips, lamp shades) that follow the lighting switch |
| Ambient occlusion | GTAO pass inside rooms (high / ultra tiers) |
| Mirrors | true planar reflections for the vanity mirror of the room the visitor stands in (high / ultra); a pale glass panel otherwise |
| Night exterior | moonlight, lit windows (tower and neighbours), street-lamp pools, entrance and podium lights |

**Gains**: the residential gains were fitted by measuring five patches against the Cycles still of the same camera (`GOLDEN_APARTMENT_REVIEW.md` §3). Every other floor is scaled from them by the ratio of its bake reference (`public/lightmaps/<cat>.json`) to the residential one — one physical scale, not per-floor tuning. Re-bake after any geometry or lighting change:

```
node tools/blender.mjs blender/build_nakhla.py blender/scene_prims.json blender x --bake=F04:residential --samples=256
python tools/floor_irradiance.py F04 residential
python tools/update_lightmaps.py
```

## 4. Light — offline (Cycles)

Physical sky (multiple scattering) and a sun lamp from the same solar position; a CC0 night HDRI after sunset; real lamp objects at every modelled fitting; per-image metered exposure (protecting highlights); OptiX denoising.

## 5. Colour

Both renderers use the **AgX** view transform (Cycles: "AgX – Base Contrast"; three.js: `AgXToneMapping`), sRGB output, linear lighting, textures tagged sRGB (colour) or non-colour (normal, roughness, lightmaps).

## 6. Known gaps

- The lightmap is luminance only: colour bleeding between finishes (e.g. a timber wall warming the ceiling) is approximated by a single warm tint.
- Sun bounce is baked for one sun position (15:00, summer) and scaled at other hours.
- Cycles uses bump from the colour map instead of tangent-space normal maps (box projection has no tangents).
- No real-time reflections other than the active room's mirrors (no screen-space reflections on glass or stone).
- Texture compression (KTX2) is not used: textures ship as JPEG / PNG (8.7 MB scans + 0.9 MB lightmaps, loaded lazily).
