# NAKHLA RESIDENCE V8 — delivery report, remediation round 2

Date: 2026-11-12 · Creator: **Rashid Omar Mohammed / رشيد عمر محمد** · +9647700864990 · rashid.iq12@gmail.com · Concept only, not a real listing.

**Status: INTERNAL-QA COMPLETE FOR THIS ROUND — PENDING OWNER REVIEW.**

- Nothing in this report is owner-approved. Type B remains **not approved**, as the owner instructed.
- The site runs locally only. Nothing was published, deployed or sent.
- No paid service, credit or subscription was used.

This report answers remediation §20 and addendum T19. It replaces the 2026-11-11 report (kept as `project_artifacts/FINAL_DELIVERY_REPORT.md`, marked superseded).

## 1. What was fixed

| Area | Before (owner's complaint / audit) | Now, in the live website | Evidence |
|---|---|---|---|
| **Realism of rooms** | Box furniture, grey flat light, plastic finishes | Original modelled furniture and fitments: rounded and upholstered pieces, lamps, curtains, kitchens, bathrooms. 11 CC0 photo-scanned materials. Cycles-baked indirect light (sky, lamps, bounced sun) for walls and furniture. Ambient occlusion. AgX colour | `project_artifacts/golden/`, `RENDER_PARITY_REPORT.md` |
| **Golden Apartment (Type A)** | Weak reference unit | Living, kitchen, master, bathroom and balcony composed and lit; five colour patches within ~10–25 sRGB levels of Cycles | `project_artifacts/golden/GOLDEN_APARTMENT_REVIEW.md` |
| **Type B** | Lower standard than A | Brought to the Golden standard (**not approved**, per your instruction) | `project_artifacts/evidence/detail_after/` |
| **Amenities** | Blocked out | Gym zones, sauna, massage, lockers, pool with loungers, ladder and underwater lights, restaurant bar and set tables, café counter, lobby reception, terrace with pergola, majlis | `project_artifacts/evidence/amenities_after/` |
| **Architectural detail** | Missing | Switches, sockets, cooling diffusers, smoke detectors, door levers, skirting, frames; sliding balcony doors that open (bi-parting / pocket); real mirror reflections in the active bathroom | `evidence/detail_after/` |
| **Exterior** | Giant grey boxes | Fictional street grid, ~75 neighbour blocks with window grids, kerbs, crossing, lamps with light pools, cars, palms, haze; rooftop and balcony furniture visible in the whole-tower view | `ENVIRONMENT_DESIGN_SPEC.md`, `LOD_VISIBILITY_REGRESSION.md`, `evidence/exterior_after/` |
| **Day / sunset / night** | Black or flat nights | Moonlight spill, lit windows, street-lamp pools, entrance lights; lights auto / on / off in apartments (never pitch black) | `evidence/features/` |
| **Cold start** | 1.2 s freeze on the first frame, ~2 s freeze on room entry | First frame 0.14–0.17 s; tower interactive in ~1.6 s; no shader compile on first floor open or room entry | `PERFORMANCE_REPORT.md` |
| **Sound** | Thin, unconvincing | Procedural engine with three buses, nine scenes, weather layers and room reverb. Off by default. Measured with earshot | `SOUND_DESIGN.md`, `evidence/audio/` |
| **Interface** | Plain | Sliding section indicator, refined states and hierarchy, Focus view (hide all interface), looping 15-shot Showroom film, assistant welcome in four languages | `evidence/ui_after/`, `evidence/features/` |
| **Model accuracy** | Unchecked | Automated validation found and fixed 20 placement defects (e.g. a wardrobe into the next room, tables facing the wall) | `MODEL_VALIDATION_REPORT.md` |
| **Render parity** | Blender stills only | 19 camera-matched Cycles vs live pairs, measured. Fixed on the way: missing pergola, black brass and bronze (three.js overrode per-material reflection strength), pergola finish | `RENDER_PARITY_REPORT.md` |
| **Owner identity** | Risk of "راشد" | "Rashid" / "رشيد" correct in all 8 source places (guard test) and in exported PDFs (checked with PdfCraft) | `evidence/pdf/` |

## 2. Measured results (one desktop only)

Windows 11, Ryzen 5 3600, RTX 3050 8 GB, Chrome headless with GPU (ANGLE D3D11), 1366 × 768, tier "high".

| Measure | Result | V8 target |
|---|---|---|
| Unit tests | 60 / 60 pass | all |
| Browser tests | 53 / 53 pass (6.2 min) | all |
| Frame time, 20 full motion cycles | p50 7.7 ms · p95 8.3 ms · p99 8.9 ms · worst 23.2 ms · 0 frames > 50 ms (900 frames, 87 transitions) | p95 ≤ 20 ms, no repeated > 50 ms |
| GPU programs / heap across 20 cycles | programs 76 → 76 → 76, geometries 330 → 330, textures 177 → 177, heap 82.2 → 83.0 MB | no growth |
| First frame / tower interactive | 0.14–0.17 s / ~1.6 s (cold, no cache) | — |
| Interior parity vs Cycles | exposure-matched difference 17–47 sRGB levels across 14 indoor cameras (12 of them ≤ 37; café 40, gym 47) (`RENDER_PARITY_REPORT.md` §3) | — |
| Exterior parity vs Cycles | 48–78; atmosphere and night balance differ | — |

## 3. What remains limited (honest list)

- **Exterior look vs Cycles:** the live view is hazier and lower in contrast. The night balance is reversed (Cycles floodlights the tower; live lights the neighbours). Street props exist only in the website, not in the Blender scene.
- **Neighbour buildings** are flat textured blocks. There are no people or moving traffic.
- **Reflections:** only the active bathroom mirror is real. Glass and polished stone have no screen-space reflections, and the sauna glass shows a grey veil.
- **Lightmaps** carry brightness only: colour bleeding between finishes is approximated. Sun bounce is baked for one sun position and scaled for other hours.
- **Sound** is synthetic and was measured, not listened to by a person. Café chatter reads weakly.
- **First floor opening** still has one ~60 ms frame.
- **QA matrix:** 30 PASS / 3 SKIPPED / 699 NOT_RUN (268 P0 NOT_RUN), unchanged. Those cases need devices, other browsers, screen readers or people.

## 4. Tools used (all local and free; nothing paid)

| Tool | Used for |
|---|---|
| Blender 5.2.3 LTS + Cycles (OptiX, RTX 3050) | 19 reference stills, lightmap bakes (4 floor types × 3 light shares), `.blend` / `.glb` |
| three.js r187, React 19, Vite 8, zustand | the website |
| Playwright + installed Chrome | 53 browser tests, benchmarks, all screenshots and parity frames |
| Vitest | 60 unit tests incl. geometry audit, model validation, identity guard, scene export |
| Python (numpy, Pillow) | texture processing, floor-irradiance maps, contact sheets, parity metrics, manifest |
| earshot MCP (local models) | loudness, peaks, loop seams and "real vs synthetic" checks of the sound |
| FFmpeg | audio encoding for evidence |
| Poly Haven (CC0) | 12 texture sets + 3 HDRIs, downloaded with your approval, listed in `SOURCE_LICENSE_LEDGER.csv` |

**Not used, on purpose:** ElevenLabs and every other paid generator (cost rule). No third-party skill was installed.

## 5. Craft apps used

| App | Use |
|---|---|
| **PdfCraft** (`pdfcraft-cli`) | Verified the visitor's exported "My apartment" PDFs in English and Arabic: owner name, phone and email correct, no "راشد". It also exposed raw finish codes in the PDF, which were fixed |
| EffectCraft, FilmCraft, MaterialCraft, TextureCraft, SolidCraft, SoundCraft, Craft Anything, ArtCraft, VectorCraft | Audited and not needed for the website. Reasons per app are in `project_artifacts/TOOLS_AUDIT.md` §6. DesignCraft, PhotoCraft, AniCraft and FigCraft are not installed on this PC |

## 6. What still needs real-world validation

1. Physical phones and tablets (iPhone Safari, Android Chrome, iPad) and Firefox: frame time, memory, touch, layout.
2. Human listening on headphones and speakers; motion-comfort sessions.
3. Native-speaker review of Arabic (Iraqi), Kurdish (Sorani) and Chinese.
4. Screen-reader pass (NVDA / VoiceOver).
5. Owner design review of the Golden Apartment, Type B, amenities, exterior night look and interface.
6. Any real site, structure or engineering facts. None are claimed: location, structure and approvals stay fictional or "to be confirmed".

## 7. Where the strongest improvements happened

1. **Light:** the Cycles-baked indirect light in the browser, calibrated by measurement against path-traced stills, turned grey flat rooms into lit spaces. It was the single biggest visual change.
2. **Furniture and fitments:** the original modelling kit (rounded, upholstered and lathed pieces) replaced boxes in every apartment and amenity.
3. **Cold start:** from a 1.2 s first-frame freeze and ~2 s room-entry freeze to no visible compile stalls.
4. **Exterior context:** from giant boxes to a readable fictional city block with day and night behaviour.
5. **Verification:** model validation, render parity, PDF checks and benchmarks now run as repeatable tools rather than judgements by eye.

## 8. Deliverables index

`QUALITY_GAP_AUDIT.md` (§H status per section) · `ARCHITECTURAL_SOURCE_OF_TRUTH.md` · `ASSET_MANIFEST.json` · `SOURCE_LICENSE_LEDGER.csv` · `ENVIRONMENT_DESIGN_SPEC.md` · `MODEL_VALIDATION_REPORT.md` · `MATERIALS_AND_LIGHTING_PIPELINE.md` · `RENDER_PARITY_REPORT.md` · `LOD_VISIBILITY_REGRESSION.md` · `PERFORMANCE_REPORT.md` · `SOUND_DESIGN.md` · `PROJECT_PROGRESS.md` · `RESUME_HERE.md` · `project_artifacts/TOOLS_AUDIT.md` · `project_artifacts/golden/` · `project_artifacts/parity/` · `project_artifacts/evidence/`

Run locally: `START_NAKHLA.cmd` → http://127.0.0.1:4173
