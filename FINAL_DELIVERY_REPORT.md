# NAKHLA RESIDENCE — V11.3 delivery report

Date: 2026-11-13 · Creator: **Rashid Omar Mohammed / راشد عمر محمد** · +9647700864990 · rashid.iq12@gmail.com · Concept only, not a real listing.

**Status: V11.3 — INTERNAL QA. PENDING OWNER REVIEW. Not complete.**

- **Approval:** the owner has not approved any of this.
- **External actions:** nothing was published, deployed, purchased or sent.
- **Branch:** `v11-dual-experience`.
- **Checkpoints:** `checkpoint-pre-v11-3-2026-11-13` (before V11.3), `checkpoint-pre-v11-2026-11-13` (V8).
- **Previous reports:** in `project_artifacts/` (V11.2: `FINAL_DELIVERY_REPORT_V11_2.md`).
- **Start here:** `REVIEW_PACK/README.md`, then `REVIEW_PACK/QUALITY_GAP_AUDIT.md`.

## 0. V11.4 update (2026-11-14), not owner-approved

| Area | What changed | Evidence |
|---|---|---|
| **Demo pricing (both experiences)** | Illustrative prices for all 18 apartments from one editable file (`src/data/pricing-demo.json`): model area × an assumed 1.85 M IQD/m² with stated factors. Appears in a pricing sheet, unit badge, photo-site chip, home section, comparison, printed summary, assistant and deep links. The disclaimer «أسعار افتراضية للعرض فقط — المشروع تصوّري وغير مطروح للبيع» appears in all 4 languages. No availability, booking or payment | `DECISION_LOG.md` D16, `project_artifacts/pricing/MARKET_ANCHORING.md`, `REVIEW_PACK/REAL_WEB_SCREENSHOTS/pricing_*.png`, `tests/unit/pricing.test.ts`, `tests/e2e/pricing.spec.ts` |
| **Form Architects study** (read-only, 12 reels viewed) | Index, shot breakdown, priority map, art-direction options, four-way matrix; private boards git-ignored | `project_artifacts/reference_study/` |
| **District** | Façade kit within 250 m (D13); tree-lined avenues, yard canopy, parked cars, uplights at night (D17) | `REVIEW_PACK/BLENDER_CYCLES_REFERENCES/`, `DECISION_LOG.md` |
| **Open roof crown** (owner-adopted 2026-11-14) | The façade frame continues 3.4 m above the roof: stone piers, a ring beam and bronze fins round a lantern screen that glows after sunset. Previewed first, then adopted. Both renderers; exterior and level-11 Cycles views re-rendered | `DECISION_LOG.md` D18, `project_artifacts/crown_preview/BOARD_*.jpg` |
| **Reference-study backlog** (D19) | Neighbour façades get 4 window kinds, AC units, curtains, and warm or cool lit windows (G2). Live night: shopfront glow pools, and the lit map now lines up with the day map (G4). New "into the sunset" low aerial with glare and dust haze (G5). 24 more parked cars near the tower (G6). Tower windows gain mullion caps, head caps and stone sills; stone joints are finer | `DECISION_LOG.md` D19, `public/renders/street_golden_sun.jpg` |
| **Owner notes, round 2** (D22) | Level 11 lit at night (terrace and majlis festoons, glazed restaurant door), lift lobby and corridors furnished, solid core caps, entrance monolith with the bronze palm emblem, shadow area follows zoom, assistant answers 11 more question types clearly, glass UI, reel-style film in the photo site. Test link (public, Netlify free plan): https://nakhla-residence-concept.netlify.app | `DECISION_LOG.md` D22 |
| **V11.5 overhaul** (D21) | Live 3D and photos: new art-directed sky (every hour, season and weather; clouds, sun, moon, stars), PBR Neutral colour in both renderers, realistic façade colours with weathering, gardens, wider shadows. Fixed neighbour lots that stood in the streets. Level 11: lights over every table and festoon strings on the terrace. Photo site redesigned; all 48 views re-rendered at 2560 × 1440 | `DECISION_LOG.md` D21, `project_artifacts/reference_study/REEL_FLIK_ENVIRONMENT_NOTES.md` |
| **Interior hero** (D20) | Type A living room: a cove-lit ceiling (a dropped band with a hidden LED trough washing the centre of the ceiling) in both renderers, with the AC slot moved into the band. The photo camera moved back to the corner, level at 1.38 m with straight verticals. Plan dimensions unchanged | `DECISION_LOG.md` D20, `public/renders/living*.jpg` |
| **Cycles** | Horizon hairline fixed (D14); 48 views, all re-rendered 2026-11-15 at 2560 × 1440 (D21); the golden-hour street moved to 18:35 | `public/renders/` |
| **Photo site** | Hall and laundry views, B_dressing reframed (D15) | — |
| **Tests** | 79 / 79 unit (new: street clearance); browser suite 63 / 63 after the reviewed V11.5 baselines were re-recorded (20 screenshots: new sky, colour and photo site) | `tests/unit/streets.test.ts`, `tests/e2e/__screenshots__/` |
| **Live performance** (1366×768) | p95 7.6–8.5 ms; ≈577 draw calls; ≈1.43 M triangles | `node tools/idle_fps.mjs` |

**Still needs the owner:**
- people (said "not yet");
- the demo-price anchor, if another is preferred;
- recorded music;
- real devices;
- native-language review.

## 1. What V11.3 changed

| Area | Fixed / rebuilt | Evidence |
|---|---|---|
| **Gate 1: return-to-tower stall** | **Root cause found by profiling** (`tools/hitch_probe.mjs`): finish-crossfade materials were disposed after every fade, which freed their shader programs; the next package change linked them again synchronously. Fixed by pooling and background compilation. Two cold-path stalls also fixed: finish textures now prepared in the worker, AO shader keys matched | `PERFORMANCE_REPORT.md` §5, `DECISION_LOG.md` D2–D5, `project_artifacts/evidence/hitch-probe-*.json` |
| Environment to the horizon | **Rebuilt.** Street-grid district to ≈700 m (five facade tones, roof silhouettes, ≈210 garden trees), skyline band to 2.6 km, ground to the horizon. Distance haze in Cycles (compositor) to match the live fog. City windows lit after sunset in Cycles too | `REVIEW_PACK/BLENDER_CYCLES_REFERENCES/exterior_*.jpg`, `REAL_WEB_SCREENSHOTS/3d_tower_*` |
| Street life | Slow two-lane traffic. Live animation stops under reduced motion and in tests; Cycles renders the same arrangement. People deliberately left out (D8) | `MOTION_CLIPS/street_traffic_dusk.webm` |
| Cycles fidelity | **Bug fixed:** every palm trunk was half underground, so crowns floated. Highlight protection added to auto-exposure; sky band below the horizon removed | `DECISION_LOG.md` D9 |
| Photoreal website | 44 views (was 33): ensuites, dressing rooms, entry, Type B third bedroom, lobby at night, wellness lounge, terrace late evening, shisha lounge (labelled conditional), and a new aerial blue-hour hero. Plain-language labels | `REVIEW_PACK/PHOTO_MODE_SCREENSHOTS/` |
| Music | **Rebuilt:** original D-major piece with a cross-fading pad, plucked melody and hall reverb. Music alone measures −30.5 LUFS (was ≈ −44, inaudible). Still synthesised | `SOUND_DESIGN.md` (V11.3 section) |
| Copy | Visitor-facing jargon ("Cycles render", "path-traced", "offline render") replaced in 4 languages | `src/i18n/*.ts` |
| Bug found by the audit | Bare language links (`#/en`, `#/zh`) opened in Arabic. Fixed, with a unit test | `tests/unit/store.test.ts` |

## 2. Gates (detail in `REVIEW_PACK/QUALITY_GAP_AUDIT.md` §1)

| Gate | Status | Gate | Status |
|---|---|---|---|
| 1 Navigation hitch | **PASS (internal, desktop)** | 6 Photoreal website | PARTIAL (strong) |
| 2 Exterior architecture | PARTIAL | 7 Entry / switching / UI | PARTIAL |
| 3 Surrounding world | PARTIAL (much improved) | 8 Sound / AI / languages | PARTIAL |
| 4 Golden Apartment | PARTIAL (unchanged in V11.3) | 9 Integration / performance | **PASS (internal, desktop)** |
| 5 Amenities + Type B | PARTIAL | 10 Fresh audit + reels | PARTIAL (2 of 4 comparisons) |

## 3. Against the reels

- **Internal, indicative ratings:** Cycles ≈ 3.6, live 3D ≈ 3.3, photo site ≈ 3.6 out of 5, against ≈ 4.4 for the references (round 2: 3.5 / 3.2). **The gap remains.**
- **Biggest levers:** varied facades for the nearby district, people (needs a download decision), tower facade detail up close, and a cove-lit interior hero.
- **Private four-way sheets:** `REVIEW_PACK/INSTAGRAM_COMPARISONS/` (git-ignored, never publish).

## 4. Measured on this PC (one desktop; phones, tablets, Safari, Firefox NOT RUN)

| Measure | Result |
|---|---|
| Unit tests | **65 / 65 pass** |
| Browser tests | **60 / 60 pass** (7 visual baselines re-recorded after reviewing each diff: city, horizon and window views changed) |
| Return-to-tower, warm, 20 cycles × 3 | **0 frames > 40 ms** (was 158–285 ms) |
| Same, cold (acting the instant the tower is ready) | worst **86 ms**, first cycle only (was 316 ms) |
| 20-cycle test record | p95 8.2 ms, per-step worst 22.9 ms, 0 > 50 ms; programs / geometries / textures flat |
| Live world with traffic | p95 8.4 ms; ≈560–610 draw calls, ≈1.2 M triangles (heavy for phones: not tested) |
| Contact audit (SHD-01) | 547 objects, 0 warnings |
| Cycles stills | 44 views at 256 samples, RTX 3050 OptiX |

## 5. Needs the owner

- **Downloads:** people (CC0 characters) and recorded music stems, with licence review.
- **People and devices:** real phones and tablets, and native reviewers for Arabic, Sorani and Chinese.
- **Approval:** reviewing the pack.

Everything else on `REVIEW_PACK/REMAINING_ISSUES.md` can continue without the owner.
