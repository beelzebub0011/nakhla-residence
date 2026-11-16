# Golden Apartment — review pack (Type A, floor 04)

Date: 2026-11-12 · Status: **RE-SUBMITTED FOR OWNER REVIEW after the defect round — not self-approved.**
Scope of the gate: living room, kitchen, master bedroom, bathroom, balcony. Nothing else (Type B, lobby, amenities, exterior, audio) has been taken to this standard yet.

## 1. Genuine Blender Cycles renders

Folder `project_artifacts/golden/cycles/` (1600×900, path traced on the RTX 3050 with OptiX, up to 320 samples, OpenImageDenoise, AgX):
`living.jpg` · `kitchen.jpg` · `master.jpg` · `bathroom.jpg` · `balcony.jpg` · `living_golden.jpg` (18:30) · `living_evening.jpg` (19:30) · `living_night.jpg` (22:00).
Contact sheet: `CYCLES_contact_sheet.jpg`. Editable source: `blender/nakhla_tower.blend`. Log with per-image exposure: `cycles/render.log`.

How they are made: the scene is exported from the same TypeScript model the website uses (`npm run export:scene`): same walls, same modelled furniture meshes (binary), same CC0 scans and the same procedural finish pixels. Light is a physical sky plus a sun placed at the simulated solar position for that hour, real lamp positions, and a CC0 night HDRI after sunset. Exposure is metered per image like a camera.

## 2. Screenshots of the actual interactive website, same scenes

Folder `project_artifacts/golden/web/` — clean plates of the live WebGL canvas (UI hidden by `tools/shots.mjs name!`), same camera positions, same hours. Contact sheet: `WEB_contact_sheet.jpg`. With the interface visible: `web_ui/`.
These are real-time frames from the production build in Chrome on this PC, not renders.

## 3. Visual comparison

`COMPARISON_cycles_vs_web.jpg` — left Cycles, right website, eight rows (re-captured after the defect round).

Colour check, living room at 15:00, mean of the same screen patch in both images (sRGB 0–255):

| Patch | Cycles | Website before the defect round | Website now |
|---|---|---|---|
| Sofa seat | 138, 109, 75 | 91, 92, 92 (grey) | 124, 103, 82 |
| Timber media wall | 96, 67, 40 | 65, 50, 38 | 80, 54, 33 |
| Rug | 125, 98, 66 | 96, 93, 90 | 103, 86, 70 |
| Plaster wall | 158, 124, 87 | 200, 175, 149 | 183, 155, 128 |
| Ceiling | 185, 165, 141 | 209, 190, 170 | 193, 173, 151 |

| Aspect | Blender Cycles | Live website | Why they differ |
|---|---|---|---|
| Geometry, furniture, composition | identical | identical | one shared model |
| Bounced light on walls, floors, ceilings | path traced | **baked from Cycles**: three shares — sky, bounced sun, lamps — each recoloured live by hour and weather | luminance only, so finishes stay swappable; colour bleeding between finishes is not reproduced; the sun-bounce share is baked for one sun position (15:00, summer) and only scaled at other hours |
| Bounced light on furniture | path traced | **baked floor-level irradiance map** sampled where each piece stands (new) + ambient occlusion | one value per plan position: no vertical variation, no light from a nearby wall |
| Direct sun | soft physical sun | shadow-mapped sun, follows the hour live | lower shadow resolution, no penumbra widening |
| Day warmth and contrast | warm, deep | close; walls still a little brighter and less saturated | gains were fitted by measurement at five patches in one room, not in every room |
| Evening / night | lamp pools, dark corners | close; ceiling pools slightly stronger | lamp share uses one gain |
| Reflections | true reflections | sky map is cut to 3 % indoors (it was leaking in as grey light); metals keep a boosted highlight; the mirror reads as a pale glass panel | no real-time planar / screen-space reflections yet |
| Glass | reflects the room | uniformly transparent | simple transparency in WebGL |
| Texture relief | bump from the albedo, box projected | normal + roughness maps, metre UVs | Cycles box projection has no tangent normal maps yet |
| View outside | bright, over-exposed context blocks | grey context blocks | exterior context not modelled yet (after the gate) |
| Tone mapping | AgX (Base Contrast) | AgX | same family |

## 4. Real material swapping in the browser

`project_artifacts/golden/swap/` (made by `tools/swap_evidence.mjs` against the live build):
`floor_ivory_porcelain.png` vs `floor_engineered_oak.png` (engine reports `MAT_IVORY_PORCELAIN` → `MAT_ENGINEERED_OAK`), and `room_default_finishes.png` vs `room_luxury_package.png` (walls to soft grey, joinery to dark walnut, floor to marble-look).
Measured mean colour of the bare-floor patch: (154, 130, 106) → (143, 115, 89), distance 24.5, warmer. The baked light stays on the swapped surface and on swapped furniture timber.
Automated: `tests/e2e/slice.spec.ts` clicks the swatch in the real UI and measures canvas pixels; acknowledgement measured at 70–79 ms (target < 100 ms).
The earlier "live 11.8 vs static 21" discrepancy is explained: the first reading was taken before the surface was selected and the second after, so the bronze selection highlight was in only one of them. Both readings now include it.

## 5. Measured frame time and memory

One device only: Windows 11, Ryzen 5 3600, RTX 3050 8 GB, Chrome 157 headless with GPU (ANGLE D3D11), 1366×768, DPR 1, tier "high" (ambient occlusion on). **Not** a phone, tablet, Safari or Firefox.

| Measure | Before recovery (primitive scene) | Golden Apartment, first submission | Golden Apartment, after the defect round |
|---|---|---|---|
| Modelled triangles in the residential interior | ≈ 20 k | ≈ 300 k | ≈ 300 k (budget test: < 450 k) |
| 20 navigation cycles — frame time in transitions | p95 7.1 · worst 9.8 ms | p95 7.1 · worst 14 ms | p50 7.0 · p95 7.0 · p99 7.1 · worst 20.9 ms · 0 frames > 50 ms |
| GPU memory over 20 cycles | flat | flat | geometries 232→232, textures 161→161, programs 51→53 (one-time variants) |
| JS heap over 20 cycles | flat | +9.6 MB (no forced GC) | 50.2 → 44.8 MB **with forced GC — no growth** |
| Finish swap acknowledgement | ≈ 340 ms (tool overhead) | 294 ms | **70–79 ms** |
| Cold first visit (first floor open + first swap) | worst 20.7 ms | worst 62.5 ms, 1 frame > 50 ms | **worst 62.6 ms, 1 frame > 50 ms — unchanged** |
| Reduced-motion first entry, cold | < 450 ms | 582 ms | **0.9–1.1 s in 4 isolated runs (target 450 ms) — test fails** |
| Cold interior preparation (page load → fully warm) | — | — | ready at 2.1 s, interior warm at 4.1 s: geometry worker 1.2 s after ready, textures +0.4 s, shaders +0.5 s, uploads +0.2 s |

Evidence: `project_artifacts/evidence/motion-20-cycles.json`, `motion-vertical-slice.json`, `motion-benchmark.csv`, `e2e-run.txt`; diagnostics `tools/prewarm_probe.mjs`, `tools/light_probe.mjs`.

## 6. Defect round (owner chose "fix defects first", 2026-11-12)

| # | Defect | Result |
|---|---|---|
| 1 | Furniture not in the baked light | **FIXED-VERIFIED** — furniture, doors and partitions sample a baked floor-level irradiance map; colours measured against Cycles (table in §3) |
| 2 | Day too cool and flat, night too bright | **FIXED-VERIFIED in the living room, by measurement.** Root cause found with `tools/light_probe.mjs`: the outdoor sky map was acting as grey diffuse light indoors and hid a bake that was three times too weak and had no bounced sunlight. Sun-bounce share added to the bake; sky map removed as indoor diffuse light; gains re-fitted. Other rooms were checked by eye only. |
| 5 | Cold-start frames | **OPEN — improved pipeline, target not met.** Mesh merging moved into the worker, texture workers pooled, geometry and textures start at page load. Warm navigation is unaffected, but a floor opened within the first ~2 s after load still waits about 1 s (reduced-motion test fails) and one 62.6 ms frame remains. Cause measured: the worker needs ≈ 1.2–1.5 s to generate the modelled furniture. Next step: typed-array geometry generation and a persisted cache of the merged batches. |
| 6 | Swap test discrepancy | **FIXED-VERIFIED** — explained (selection highlight in one reading only), test corrected |
| 7 | JS heap growth | **FIXED-VERIFIED** — no growth when garbage collection is forced before each reading |
| — | New bug found by the regression | Worker handed over a buffer that cached furniture still used ("ArrayBuffer is detached") on amenity floors — fixed, amenities test passes |

### Still open (unchanged unless noted)

3. No real reflections in the browser (mirror, glass, polished stone). Indoors the sky map is now almost off, so metals rely on a boosted highlight.
4. Outside the windows is still untextured context massing; over-exposed white in Cycles.
5. Cold start (see table above).
8. Kitchen: no cabinet interior, no plinth lighting, hob rings simplified; island stools look large; no ceiling-rose detail.
9. Bathroom: mirror shows no reflection; shower glass has no hinges or seals; tile joints stronger in the browser; no floor fall.
10. Bedroom: duvet is a crowned form, not simulated cloth; wall-panel grain weak in the browser.
11. Living: side curtains only; TV is a blank panel; rug has no pile edge; leather chairs read slightly too bright and orange by day.
12. Balcony: interior seen through the glass is brighter than in Cycles; plain balustrade glass; no outdoor lighting.
13. Doors: plain leaf and frame with lever handles; no architrave, hinges or stops.
14. Ceilings: flat with modelled downlights; no coves, access panels or grilles.
15. Type A second bedroom, ensuite, dressing, hall use the new pieces and the baked light but were not reviewed image by image.
16. Two HDRIs and one fabric scan were downloaded and are not used (`POLYHAVEN_ASSETS.csv`).
17. Blender: procedural finishes are 512 px box-projected; no displacement; the `.glb` carries no textures.
18. Not tested on any phone, tablet, Safari or Firefox; ambient occlusion is off on "low" and "balanced" tiers.
19. The sun-bounce bake is for one sun position; morning light in east-facing rooms is approximated by scaling it.
20. The Cycles stills were not re-rendered in this round (no geometry change except thinner media-wall slats).

## 7. What approval would unlock

Applying this standard to Type B, then the lobby, wellness and dining levels, the exterior and night site lighting, then audio, device compatibility and the full regression.
