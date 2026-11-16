# NAKHLA RESIDENCE V8 — quality gap audit

Started 2026-11-12. Baseline: commit `83e2d96` (tag `checkpoint-pre-recovery-2026-11-12`).
Status of the whole project: **NOT APPROVED as final delivery.** Passing tests did not prove visual quality.
Evidence "before": `project_artifacts/evidence/audit_before/` (22 real screenshots of the running site + 3 contact sheets).

Severity: **P0** blocks approval · **P1** must fix before release · **P2** polish.
Status values: OPEN · IN PROGRESS · FIXED-VERIFIED (with evidence) · BLOCKED (reason).

## A. Rendering and realism (P0 group)

| # | Feature / location | Required | Actual (baseline) | Root cause | Sev | Evidence | Remediation | Verification | Status |
|---|---|---|---|---|---|---|---|---|---|
| A1 | All furniture (every floor) | Properly modelled, correctly scaled assets; upholstery, edges, stitching | Axis-aligned boxes and cylinders; plants are two cones; no decor | `src/domain/furniture.ts` only emits `box`/`cyl` prims | P0 | `audit_before/05–22` | New mesh modelling kit (`modelkit.ts`) + remodelled piece library; same source feeds WebGL and Blender | Before/after screenshots per room; triangle counts; unit tests | **FIXED-VERIFIED for Type A** (golden pack §1–3, `modelkit.test.ts`); shared pieces also appear on other floors but those floors are not reviewed — OPEN there |
| A2 | Interior lighting | Daylight through windows, soft indirect light, contact shading, fixtures | Flat, washed out; emissive white ceiling; 3 point lights; no AO; no fixtures | No indirect light solution; exposure boost hides shading | P0 | `05_A_living`, `07_A_master` | Baked indirect light (Cycles → luminance lightmap, albedo-independent so finishes stay swappable) + real-time sun + ambient occlusion + modelled downlights | Screenshots day/golden/evening/night; frame-time benchmark | **FIXED-VERIFIED for the Type A living room by measurement** (golden pack §3 table); furniture now lit from the bake; other rooms checked by eye only |
| A3 | Materials | Licensed PBR sets: stone, porcelain, wood, metal, glass, paint, textile, leather | 100 % procedural 512 px textures; fabric = sine weave; wood = noise bands | `texgen.ts` only | P0 | `05_A_living` (sofa, panel) | Poly Haven CC0 sets (12) for wood/fabric/leather/marble/plaster; procedural kept for module-exact porcelain; licence ledger updated | Close-up screenshots; ledger rows | **FIXED-VERIFIED for Type A** — 11 CC0 sets in use, ledger `POLYHAVEN_ASSETS.csv`; porcelain/paint/stone stay procedural |
| A4 | Architectural detail | Skirting, door frames, window recesses/reveals, cabinet joints, handles, appliances, ceiling system, light fixtures | Skirting + plain frames exist; no handles, no appliances, no sink, no cove/downlights, no curtain track, doors are slabs | Never modelled | P0 | `06_A_kitchen`, `08_A_bath` | Model them in the kit (kitchen, bathroom, doors, ceilings) | Screenshots | **IN PROGRESS** — joints, grip rails, handles, appliances, sink, taps, basins, downlights, lever handles done; architraves, coves, hinges open (golden pack §6.8–14) |
| A5 | Room viewpoints | Composed views of each room | Master view cuts the bed; bathroom faces a blank wall; spa faces a panel | Authored `view` points in `plans.ts` not checked by eye | P0 | `07_A_master`, `08_A_bath`, `18_spa` | Re-author viewpoints, verify each by screenshot | Screenshot per room | **FIXED-VERIFIED for the five golden rooms**; other rooms OPEN |
| A6 | Night scene (web + Blender) | Readable evening/night with lit windows, site lighting | Almost black tower; Blender night still very dark | No night ambient/moon, no site lights, emissive too low | P0 | `02_tower_night`, `public/renders/exterior_night.jpg` | Night lighting setup (moon/sky ambient, lit interiors, site lights) in both pipelines | Night screenshots + render | **FIXED-VERIFIED in the website** — interior night and exterior night (moonlight, lit neighbour windows, lamp pools, entrance lights: `exterior_after/03`, `06`, `08`); Cycles exterior night not re-rendered — OPEN |
| A7 | Exterior surroundings | Natural landscaping and believable context | Was: untextured grey boxes. Now: fictional street grid, ~75 plotted low/mid-rise neighbours with window grids, kerbs, crossing, lamps, cars, hedges, lawn, ~60 varied palms, far skyline in haze | `site.ts` proxy | P1 | `evidence/exterior_after/` | Done first pass; façade relief, shopfronts, people, Cycles re-render open (`ENVIRONMENT_DESIGN_SPEC.md`) | Screenshots | **IN PROGRESS — first pass INTERNAL-QA-PASS, PENDING-OWNER-REVIEW** |
| A8 | Type B apartment | Same standard as Type A | Sparser furnishing; inherits A1–A5 | Marked "medium detail" on purpose | P1 | `12_unitB`–`14_B_kitchen` | Apply Golden Apartment standard after approval | Screenshots per room | OPEN (after gate) |
| A9 | Ground floor lobby | Detailed reception and circulation | Desk box, 4 sofas, cone plants | A1 | P1 | `15_G_lobby` | Remodel after gate | Screenshots | OPEN (after gate) |
| A10 | F10 gym / pool / spa / changing | Complete, convincing | Gym = dark blocks; spa view blocked; pool acceptable but flat water | A1, A2 | P1 | `16_pool`, `17_gym`, `18_spa` | Remodel equipment, sauna, water shading after gate | Screenshots | OPEN (after gate) |
| A11 | F11 restaurant / café / terrace / shisha | Complete, convincing | Repeated box chairs and tables; empty walls | A1 | P1 | `19`–`22` | Remodel after gate | Screenshots | OPEN (after gate) |
| A12 | Blender Cycles stills | Archviz-quality renders of every key space | Flat colours, no textures, dark night, weak bathroom framing | `blender/build_nakhla.py` uses box prims + plain BSDFs | P0 | `evidence/renders_contact_sheet.jpg` | New Blender pipeline: mesh import, PBR textures, HDRI lighting, matched cameras | New renders | **FIXED-VERIFIED for Type A** (8 stills); exterior / amenity stills not redone — OPEN |
| A13 | Colour management | Coherent between Blender and browser | Browser ACES + ad-hoc exposure; Blender Filmic default | Never aligned | P1 | — | Both to AgX, sRGB output, documented exposure | Side-by-side | **IN PROGRESS** — both AgX; calibration differences listed in golden pack §3 |

| A14 | Rooftop / balcony furniture missing in the whole-tower view | Visible at every zoom | Missing until a floor was selected | Outdoor furniture lived in the streamed interior, not in the shell | P0 | `LOD_VISIBILITY_REGRESSION.md`, `exterior_after/05`, `06` | Outdoor furniture moved into the always-visible shell | Screenshots; automated orbit diff NOT_RUN | **FIXED-VERIFIED (screenshots)** |
| A15 | Owner name spelling | "Rashid Omar Mohammed" / "رشيد عمر محمد" everywhere | Already correct in all 8 places; no "راشد" found | — | P0 | `tests/unit/identity.test.ts` | Guard test added | Unit test | **FIXED-VERIFIED** |

## B. Audio (P1 group — scheduled after the Golden Apartment gate)

| # | Feature | Required | Actual | Root cause | Sev | Evidence | Remediation | Verification | Status |
|---|---|---|---|---|---|---|---|---|---|
| B1 | Sound off by default, explicit opt-in | Yes | Works (no AudioContext before the button; never persisted) | — | — | `tests/e2e/access.spec.ts` | Keep | Existing test | FIXED-VERIFIED (kept) |
| B2 | Sound content | Music, ambience and effects appropriate to each space | One brown-noise bed + three sine tones for the whole site | `src/audio/ambience.ts` is 48 lines | P1 | source file | New engine: 3 buses, per-space ambience, UI/transition effects, original rendered loops | earshot measurements (LUFS, peak, loop seam), browser test | OPEN |
| B3 | Separate music / ambience / effects controls | Where specified | Single on/off | B2 | P1 | UI | Three sliders + master mute | Browser test | OPEN |
| B4 | Crossfades, no clipping | Yes | Single fade | B2 | P1 | — | Equal-power crossfades, limiter, −16 LUFS target | earshot | OPEN |

## C. Motion (re-check after geometry grows)

| # | Feature | Required | Actual | Sev | Evidence | Remediation | Verification | Status |
|---|---|---|---|---|---|---|---|---|
| C1 | Frame time during transitions | p95 ≤ 20 ms, no repeated > 50 ms | 7.1 ms p95 on one desktop **with the primitive scene** — must be re-measured with the heavier scene | P0 | `evidence/motion-20-cycles.json` | Re-run benchmark after every geometry/lighting milestone | 20-cycle benchmark | **FIXED-VERIFIED on one desktop** — p95 7.1 ms, worst 14 ms, 0 > 50 ms with the heavy scene |
| C2 | First-entry freeze | None | Fixed earlier (20.7 ms) — must be re-verified with real textures and larger geometry | P0 | `evidence/motion-vertical-slice.json` | Async image decode, staged upload, cached piece geometry | Slice test | **IMPROVED, partly open** — first-frame freeze 1.2 s → 0.17 s, tower interactive 2.1 → 1.6 s, first interior warm 4.2 → 2.9 s, no frame over 200 ms after ready (`PERFORMANCE_REPORT.md`). A floor opened in the first ~1.3 s still waits 0.5–1.7 s behind the veil; cold slice still has 1–2 frames over 50 ms |
| C4 | Finish swap pixel proof | Clear, measured change | Explained: selection highlight was in one reading only. Test corrected; static evidence distance 24.5; acknowledgement 70–79 ms | P1 | `tests/e2e/slice.spec.ts`, `golden/swap/` | — | Slice test | FIXED-VERIFIED |
| C5 | JS heap over 20 cycles | No growth | 50.2 → 44.8 MB with forced GC | P1 | `evidence/motion-20-cycles.json` | — | 20-cycle test with `--expose-gc` | FIXED-VERIFIED |
| C3 | Real devices | Phone / tablet / Safari / Firefox | Never run | P0 | QA matrix | Needs physical devices (owner) | — | BLOCKED (no devices in this environment) |

## D. Functionality (verified earlier; re-run in regression)

Floors (12), apartments (18), four sections, tour modes, finish swapping, geometry-derived areas, assistant, environment, 4 locales with RTL, share/print, 2D Lite, honesty labels: implemented and covered by 50 unit + 53 browser tests at the baseline. They are **not** re-certified until the regression in §G is re-run on the changed build.

## E. QA matrix honesty

732 cases: 30 PASS, 3 SKIPPED, 699 NOT_RUN (268 P0 NOT_RUN) at baseline. No case is promoted without a named executed test or recorded manual evidence.

## F. Golden Apartment (Type A — living, kitchen, master bedroom, bathroom, balcony)

**Submitted for owner review on 2026-11-12 — not self-approved.** Full pack: `project_artifacts/golden/GOLDEN_APARTMENT_REVIEW.md`
(Cycles stills, matching website screenshots, comparison sheet, swap evidence, frame-time and memory numbers, 18 listed defects).

## G. Regression on the recovery build (2026-11-12, after the defect round)

| Suite | Result | Notes |
|---|---|---|
| Unit (`npm test`) | **54 / 54 pass** | incl. mesh validity, furniture sizes, triangle budget, lightmap atlas packing |
| Browser (`npm run e2e`, Chrome + GPU) | **53 / 53 in one full run; 52 / 53 in every later run** | The reduced-motion cold-entry test passed once and failed in 4 isolated runs (0.9–1.1 s vs 450 ms). Treat it as FAILING (C2). |
| Visual baselines | 22 re-recorded | The look changed on purpose; old baselines are in git history |
| Tests changed to fit the new scene | 3 | swap proof uses the canonical viewpoint, both readings after selection, threshold 18 → 8; shader-program allowance +1 → +3 (one-time variants); export test rewritten for meshes |
| QA matrix (732 cases) | not re-scored | Still 30 PASS / 3 SKIPPED / 699 NOT_RUN from the baseline; no case was promoted |
| Real devices, screen readers, human comfort sessions | NOT RUN | not available in this environment |

## H. Remediation round 2 — the 20-section file and the technical addendum (2026-11-12)

Status words: **INTERNAL-QA-PASS** (verified here with evidence) · **PARTIAL** · **OPEN** · **BLOCKED** (needs hardware, people or an owner decision). Nothing here is owner-approved.

| § / T | Requirement | Status | Evidence / what is still missing |
|---|---|---|---|
| §2, T12 | Cold start | **PARTIAL** | First-frame freeze 1.2 s → 0.17 s; no shader compile on first floor open or room entry; tower interactive in 2.1 s. One ~60 ms frame on the very first floor opening remains. `PERFORMANCE_REPORT.md` |
| §3, T09 | Live site tracks the Cycles reference | **PARTIAL** | Golden Apartment measured within ~10–25 sRGB levels on five patches; exterior and amenity parity: see `RENDER_PARITY_REPORT.md`. No real-time reflections on glass / stone |
| §4, T02, T03 | Architectural detail inside and out | **PARTIAL** | Switches, sockets, cooling diffusers, smoke detectors, door levers, sliders, skirting, frames. Façade assemblies unchanged (fins, frames, balustrades from the original model); no coping / soffit / downpipe detail |
| §4, T04, T11 | Rooftop and balcony furniture visible in the whole-tower view | **INTERNAL-QA-PASS** | Root cause found (outdoor furniture lived only in the streamed interior); fixed. `LOD_VISIBILITY_REGRESSION.md`. Automated orbit diff test NOT_RUN |
| §4, T05 | Urban context instead of giant boxes | **PARTIAL** | Fictional street grid, ~75 plotted neighbours with window grids, kerbs, crossing, lamps, cars, planting, haze. Neighbour façades are flat textures; no people or traffic. `ENVIRONMENT_DESIGN_SPEC.md` |
| §5, T14 | Amenities designed, not blocked out | **INTERNAL-QA-PASS (first pass)** | Gym zones, sauna, massage, lockers, pool loungers + ladder + underwater lights, restaurant bar + banquette + set tables, café counter + espresso + pastry case, lobby reception, terrace, majlis with smoke-free shisha props. `evidence/amenities_after/` |
| §6, T06 | Apartment detail; Type A and B equal | **INTERNAL-QA-PASS (first pass)** | Type B brought to the Golden standard; detail generated in every habitable room. `evidence/detail_after/` |
| §6, T13 | Sliding balcony door | **INTERNAL-QA-PASS** | Bi-parting (long) and pocket (short) leaves open near the doorway and on the balcony; the camera path stays clear. No sound on sliding yet |
| §6, T10 | Apartment lighting control | **INTERNAL-QA-PASS** | Auto / on / off (button + Sun & weather sheet); lights off at night leaves moonlight spill, never black. `evidence/features/03–05` |
| §7, T10 | Day / sunset / night everywhere | **PARTIAL** | Interior night and exterior night fixed (moonlight, lit windows, lamp pools, entrance lights). Exterior night in Cycles: see parity report. No wet-surface shading in rain |
| §8, T17 | Sound design | **PARTIAL** | Procedural engine, three buses, nine scenes, weather layers, measured. Synthetic conversation reads only weakly as a café; not listened to by a person. `SOUND_DESIGN.md` |
| §9, §10, §14 | Premium interface, typography, transitions | **PARTIAL** | Sliding section indicator, glossy restrained states, hierarchy, gentle panel entrance. Frosted-glass blur rejected after measurement (cost 7 ms p95). No owner design review |
| §11 | Assistant welcome | **INTERNAL-QA-PASS** | Four languages; capabilities listed; never invents facts (existing resolver) |
| §12, T16 | Showroom film | **INTERNAL-QA-PASS** | 15-shot loop in the real 3D scene; Esc / Exit returns with state restored; verified to wrap after the last shot |
| §13 | Focus view | **INTERNAL-QA-PASS** | Hides all interface including 3D labels; Esc / H / pill restores; works on phones |
| §15 | Mirrors, glass, outside views | **PARTIAL** | Real mirror reflections in the active bathroom; views from windows show the real modelled context. Glass is plain transparency |
| §16 | Responsive | **PARTIAL** | Phone (390 × 844), tablet (820 × 1180) and desktop layouts captured in four languages; a phone-layout regression introduced and fixed in this round. Real devices NOT_RUN |
| §17, T18.17 | Owner identity | **INTERNAL-QA-PASS** | Correct in all 8 source locations (guard test) and in exported PDFs (PdfCraft) |
| §18 | Craft tools | **INTERNAL-QA-PASS** | 10 Craft apps found; PdfCraft used; others recorded with reasons. `project_artifacts/TOOLS_AUDIT.md` §6 |
| T01 | Canonical source of truth | **INTERNAL-QA-PASS** | `ARCHITECTURAL_SOURCE_OF_TRUTH.md`, `ASSET_MANIFEST.json` (hashes) |
| T07, T18 | Validation | **INTERNAL-QA-PASS** | 20 placement defects found and fixed; `MODEL_VALIDATION_REPORT.md` |
| T08, T15 | Materials and licences | **INTERNAL-QA-PASS** | `MATERIALS_AND_LIGHTING_PIPELINE.md`, `SOURCE_LICENSE_LEDGER.csv` |
| T22 | Scene-by-scene evidence matrix | **PARTIAL** | Screenshots exist for scenes A–I; J (mobile) emulated only; per-row manifest hashes not compiled into one matrix |
| QA matrix | 732 cases | **OPEN** | 30 PASS · 3 SKIPPED · 699 NOT_RUN (268 P0 NOT_RUN) — unchanged: the remaining cases need devices, browsers, screen readers or people |
| Devices | Phones, tablets, Safari, Firefox | **BLOCKED** | No hardware in this environment |

### New defects found and fixed in this round (selection)

| Defect | How it was found | Fix |
|---|---|---|
| Room entry froze ~2 s; first floor open ~0.5 s | `tools/entry_probe.mjs` (programs compiled per step) | background compilation of render-target and ghost shader variants |
| Mirrors re-rendered the scene from every room (p95 7 → 21 ms) | 20-cycle benchmark | mirrors live only in the visitor's room |
| Frosted-glass panels cost ~7 ms p95 | benchmark | blur removed (V8 rule) |
| Phone tab bar broken by the new interface layer | phone screenshot | scoped to desktop |
| Worker buffer shared with cached furniture was detached on amenity floors | browser regression (page error) | copy single-prim buckets before transfer |
| 20 furniture placement defects | `model-validation.test.ts` | each corrected |
| Raw `MAT_…` codes in the visitor's PDF | PdfCraft text extraction | readable references |
| Terrace pergola missing in the live terrace view (it belonged to the roof crown, which lifts away) | camera-matched Cycles vs live frame | pergola moved into the level-11 shell |
| Bronze / brass read as black in outdoor rooms and the indoor light treatment was applied on the terrace | parity frame | outdoor rooms excluded from the indoor treatment |
| Brass pendants, floor lamp and taps rendered black indoors: three.js replaces every material's own reflection strength with the scene-wide value, which is cut to 3 % indoors, so the "×14 for metals" boost never took effect | parity frames + reading three.js `WebGLRenderer` | metals in baked rooms now reflect the room (radiance from the baked irradiance where they stand) instead of the sky |
| Pergola undersides black (a polished metal under an open sky mirrors the dark lower half of the environment) | parity frame | pergola finished in bronze-colour powder coat (a paint, as real aluminium pergolas are), same in Cycles |
