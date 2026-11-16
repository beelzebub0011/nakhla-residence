# NAKHLA RESIDENCE — progress (V8 recovery → V11.2 dual experience)

Status: **V11.2 IN PROGRESS — not approved as final delivery.** Branch `v11-dual-experience`; V8 baseline tag `checkpoint-pre-v11-2026-11-13` + ZIP `C:\PC\Claudeackups
akhla_v8_final_2026-11-13.zip`.
Earlier status line: **IN RECOVERY —** Owner decision 2026-11-12: **do NOT approve Type B yet**; run the 20-section remediation and the technical addendum autonomously. Milestones below are INTERNAL-QA results, never owner approval.
Baseline before recovery: tag `checkpoint-pre-recovery-2026-11-12` (commit `83e2d96`). Restore with `git checkout checkpoint-pre-recovery-2026-11-12`.

## Milestones

| # | Date | Milestone | Result | Evidence |
|---|---|---|---|---|
| R0 | 2026-11-12 | Checkpoint + inspection of the real implementation | Tag created; 22 real screenshots of the baseline | `project_artifacts/evidence/audit_before/` |
| R1 | 2026-11-12 | Gap audit | `QUALITY_GAP_AUDIT.md` (P0 = realism, lighting, materials, detail, viewpoints, night, Blender) | file |
| R2 | 2026-11-12 | Tools audit (read-only) | Blender 5.2.3 + OptiX, FFmpeg, Chrome, earshot work; Blender was not on PATH → `tools/blender.mjs` | `project_artifacts/TOOLS_AUDIT.md` |
| R3 | 2026-11-12 | Original modelling kit | Rounded/crowned boxes, lathes, tubes, cloth sheets, pillows; pieces are cached and instanced | `src/domain/modelkit.ts`, `tests/unit/modelkit.test.ts` |
| R4 | 2026-11-12 | Modelled furniture + fitments | Sofa, armchair, ottoman, tables, dining set, bed, nightstands, dresser, bench, lamps, pendants, curtains, plants, art, rugs; kitchen run + island with appliances/sink/tap; vanity, WC, shower, bath, wardrobes, media wall, door levers | `src/domain/pieces.ts`, `src/domain/fitments.ts` |
| R5 | 2026-11-12 | Golden Apartment layout (Type A) + viewpoints | Living, kitchen, master, bathroom, balcony (+ second bedroom, ensuite, dressing, hall) re-composed; collision test still passes | `src/domain/furniture.ts`, `src/domain/plans.ts` |
| R6 | 2026-11-12 | Licensed PBR materials | 12 CC0 Poly Haven sets downloaded with owner approval; 11 used; ledger updated | `tools/process_textures.py`, `project_artifacts/POLYHAVEN_ASSETS.csv` |
| R7 | 2026-11-12 | Real-time lighting | Ambient occlusion pass (high/ultra tiers), AgX tone mapping, light balance, modelled downlights | `src/engine/Engine.ts` |
| R8 | 2026-11-12 | Blender pipeline v2 | Same meshes + same textures; physical sky and sun from the simulated solar position; lamp positions; auto-exposure; AgX | `blender/build_nakhla.py`, `tests/unit/export-artifacts.test.ts` |
| R9 | 2026-11-12 | Baked indirect light for the browser | Shared lightmap atlas (web + Blender), Cycles bake, live sky/lamp uniforms, finishes stay swappable | `src/domain/prims.ts` (`packLightmap`), `src/engine/matlib.ts`, `public/lightmaps/` |
| R10 | 2026-11-12 | Golden Apartment evidence pack | see `project_artifacts/golden/GOLDEN_APARTMENT_REVIEW.md` | folder |
| R11 | 2026-11-12 | Defect round (owner: "fix defects first") | Furniture lit from the bake; sun-bounce share added; sky-map leak removed; gains fitted by measurement; swap discrepancy explained; heap growth disproved; worker merge + texture pool + page-load head start. Cold start still open. | `GOLDEN_APARTMENT_REVIEW.md` §3, §5, §6; `tools/light_probe.mjs`, `tools/prewarm_probe.mjs`, `tools/floor_irradiance.py` |
| R12 | 2026-11-12 | Cold start (remediation §2 / addendum T12) | Root cause measured (first frame compiled all shaders synchronously, 1.2 s); async compile before first frame, grouped off-scene interior compile, background post-chain compile | `PERFORMANCE_REPORT.md`, `tools/prewarm_probe.mjs`, `tools/rapid_probe.mjs` |
| R13 | 2026-11-12 | Exterior context + rooftop visibility + night (T04, T05, T10, T11) | Fictional street grid and ~75 plotted neighbours with windows, lamps, cars, planting, haze; outdoor furniture in the always-visible shell; readable night | `ENVIRONMENT_DESIGN_SPEC.md`, `LOD_VISIBILITY_REGRESSION.md`, `project_artifacts/evidence/exterior_after/` |
| R14 | 2026-11-12 | In-app features (§6, §11, §12, §13) | Focus view (hide interface), looping Showroom film (15 shots), apartment lighting control (auto / on / off), assistant welcome in four languages | `project_artifacts/evidence/features/`, `tools/feature_evidence.mjs` |
| R15 | 2026-11-12 | Amenities remodel (§5, T14) + lift-lobby lighting + re-bake | gym zones, sauna, pool loungers, restaurant bar and tables, café counter, lobby reception, terrace, majlis | `project_artifacts/evidence/amenities_after/` |
| R16 | 2026-11-12 | Sound (§8, T17) | procedural three-bus engine, 9 scenes, weather layers, cross-fades, offline measurement with earshot | `SOUND_DESIGN.md`, `project_artifacts/evidence/audio/` |
| R17 | 2026-11-12 | Shader-variant freezes removed | 0 programs compiled on floor open or room entry; stricter leak test | `PERFORMANCE_REPORT.md` §6 |
| R18 | 2026-11-12 | Apartment detail (§4, §6, T06, T13, T15) | Type B to the Golden standard, generated switches / sockets / cooling diffusers / smoke detectors, bi-parting and pocket sliders that open, real mirror reflections | `project_artifacts/evidence/detail_after/` |
| R19 | 2026-11-12 | Premium interface (§9, §10, §14) | sliding section indicator, glossy states, hierarchy; backdrop blur rejected by measurement; phone tab bar fixed | `project_artifacts/evidence/ui_after/` |
| R20 | 2026-11-12 | Validation + documents (T01, T07, T08, T15, T18, §17, §18) | 20 placement defects found and fixed; owner details verified in exported PDFs with PdfCraft; manifest, licence ledger, Craft audit | `MODEL_VALIDATION_REPORT.md`, `ARCHITECTURAL_SOURCE_OF_TRUTH.md`, `MATERIALS_AND_LIGHTING_PIPELINE.md`, `ASSET_MANIFEST.json`, `SOURCE_LICENSE_LEDGER.csv`, `project_artifacts/TOOLS_AUDIT.md` §6 |
| R21 | 2026-11-12 | Render parity (T09, T19, §3) | 19 camera-matched Cycles vs live pairs, measured; pergola moved into the level-11 shell; outdoor rooms excluded from the indoor treatment; metals now reflect the room instead of turning black (three.js scene-wide reflection override found); pergola as powder coat; 19 Cycles stills in the gallery | `RENDER_PARITY_REPORT.md`, `project_artifacts/parity/`, `tools/parity_shots.mjs`, `tools/parity_metrics.py` |
| V1 | 2026-11-13 | V11.2 intake | Package read (START_HERE, 00–03, 19–25_31); **Arabic creator name corrected to «راشد عمر محمد»** (V8 rule reversed by the owner; guard test updated); backup branch/tag/ZIP | `tests/unit/identity.test.ts` |
| V2 | 2026-11-13 | Reference study — 7 owner reels | REF01–02 via the built-in browser, REF03–07 via Claude in Chrome on the owner's Brave session (read-only; no likes, follows, comments, no credentials). Shot analysis, art direction bible, baseline scorecard | `references/`, `docs/ART_DIRECTION_BIBLE.md`, `reports/REELS_VS_NAKHLA_SCORECARD.md` |
| V3 | 2026-11-13 | Exterior round 1 (S03, S20, S23 partial) | Street eye-level cameras with lens shift, lofted cars, neighbour relief, CC0 street scans, shared palms in Cycles, street-lamp lights, twilight/night sky in both renderers | `reports/BEFORE_AFTER_FIXES.md`, `reports/BEFORE_AFTER_exterior.jpg` |
| V4 | 2026-11-13 | Dual experience (25–31) | Gateway with two equal choices; photoreal website (overview page + scene viewer, 33 scenes, hour variants, model-derived facts, honest notices); global 3D / Photoreal switch preserving floor / unit / room / time / language / sound; shared camera list `src/domain/views.ts` | `src/ui/Gateway.tsx`, `src/visual/`, `reports/SCENE_MAPPING.md`, `tests/e2e/dual.spec.ts` |

## Still open (see QUALITY_GAP_AUDIT.md §H for the full list)

Real-device and Safari / Firefox runs (no hardware here) · human listening and comfort sessions · native translation review · screen-reader pass · photoreal people, traffic and shopfronts in the context · neighbour façades are flat textures · no real-time reflections on glass / stone · exterior atmosphere and night balance differ from Cycles · spa sauna glass veil · first-floor-open still has one ~60 ms frame · QA matrix re-scoring.

## How to reproduce

```
npm run build && npm run preview          # site on http://127.0.0.1:4173
npm test                                  # unit tests (also writes the Blender scene export)
npm run blender -- --golden               # Cycles stills of the Golden Apartment (needs the export)
node tools/blender.mjs blender/build_nakhla.py blender/scene_prims.json blender x --bake=F04:residential   # light bake
npm run e2e                               # browser tests (Chrome + GPU)
```
