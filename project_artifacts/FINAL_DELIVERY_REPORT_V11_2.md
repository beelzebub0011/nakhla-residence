# NAKHLA RESIDENCE — V11.2 delivery report (round 1 + exterior round 2)

Date: 2026-11-13 · Creator: **Rashid Omar Mohammed / راشد عمر محمد** (V11 correction; English spelling confirmed by the owner on 2026-11-13) · +9647700864990 · rashid.iq12@gmail.com · Concept only, not a real listing.

**Status: V11.2 ROUND 1 + EXTERIOR ROUND 2 — INTERNAL QA. PENDING OWNER REVIEW. Not complete.**

- Nothing here is owner-approved.
- Nothing was published, deployed, purchased or sent.
- The site runs locally on branch `v11-dual-experience`.
- V8 baseline: tag `checkpoint-pre-v11-2026-11-13`, plus ZIP at `C:\PC\Claude\backups\nakhla_v8_final_2026-11-13.zip`.
- Previous reports are kept in `project_artifacts/`.

## 1. What V11.2 asked for, and where it stands

| Requirement (package section) | Status | Evidence |
|---|---|---|
| Correct Arabic name «راشد عمر محمد» everywhere (S00, START_HERE 8) | **DONE (internal)** — UI, assistant, seed data, guard test; English "Rashid Omar Mohammed" confirmed by the owner (2026-11-13) | `tests/unit/identity.test.ts` |
| Study the owner's Instagram reels for real (S01, S22) | **DONE for 7/7** — REF01–02 in the built-in browser, REF03–07 in the owner's Brave session via Claude in Chrome (read-only; no account actions, no credentials). Frames kept private, not in the repository | `references/REFERENCE_MANIFEST.csv`, `references/SHOT_ANALYSIS.csv`, `docs/ART_DIRECTION_BIBLE.md` |
| Reels vs NAKHLA scorecard, compare → fix → re-capture (S22) | **Rounds 0, 1 and 2 done** — exterior ≈2.3–2.6 → ≈3.0–3.2 → **≈3.2 live / 3.5 Cycles** / 5; references ≈4.4 → **gap remains** | `reports/REELS_VS_NAKHLA_SCORECARD.md`, `reports/BEFORE_AFTER_FIXES.md` (E1–E16), `reports/BEFORE_AFTER_exterior.jpg`, `reports/BEFORE_AFTER_exterior_r2.jpg` |
| Exterior P0: street level, vehicles, palms, context, day / blue hour / night (S03, S20) | **PARTIAL** — eye-level street cameras with lens shift in both renderers, lofted cars, shared date palms, neighbour relief, scanned road and paving, twilight and night skies, real lamp lights in Cycles. **Round 2:** entrance portal (stone fins, deep canopy, downlights, lettering, polished forecourt), 82 broadleaf trees / olives / shrubs shared by both renderers, lit shopfronts after sunset, the real lobby seen through the glass in Cycles street views, evening sheen on road and paving. Not yet: people, traffic | as above |
| Shadows, contact, light QA (S23) | **PARTIAL** — SHD-01 automated contact check: 336 objects (incl. the 82 new trees), **0 warnings** after fixing 5 real defects. SHD-02…16 not yet run as a checklist | `reports/SHD01_CONTACT_CHECK.md` |
| First entry: two equal premium choices (25–26) | **DONE (internal)** — gateway over an original Cycles exterior, two equal cards (3D preview is a real live frame; photo preview is a Cycles render), "What's the difference?", four languages, sound off, disclaimer, no forced intro; 3D starts only after the gateway has painted | `src/ui/Gateway.tsx`, `project_artifacts/evidence/v11_ui/` |
| Full photoreal website, not a gallery (06, 28) | **DONE (round 1)** — overview page (hero, story, chapters, two plans with model-derived areas, amenities by level, one room at four hours, credits) and a scene viewer: 33 scenes in 5 chapters, hour variants, filmstrip, keyboard, slow opt-in tour, hide-interface, AI and contact, "Cycles render — not a photograph" on every view. No 360° claimed | `src/visual/` |
| Context-preserving switch (27, 29) | **DONE (internal)** — one switch in both experiences; floor / unit / room / time / language / sound kept; the visitor's own apartment kept when the plan type matches; honest notice when a place has no rendered view; WebGL context released when leaving 3D; deep links, Back, refresh | `src/state/store.ts`, `src/visual/catalog.ts`, `reports/SCENE_MAPPING.md`, `tests/e2e/dual.spec.ts` |
| Premium UI and typography (02, 09) | **PARTIAL** — Naskh display face for Arabic/Sorani titles (OFL), Cormorant display, glossy segmented switch; no blur (V8 cost rule). Not yet: brand book, full type audition at 320 px | `project_artifacts/evidence/v11_ui/naskh/` |
| Sound / music (11) | **NOT STARTED in V11** — V8 procedural engine unchanged; reference audio not assessed (reels studied muted) | `SOUND_DESIGN.md` |
| Cross-device tests (18, 24) | **BLOCKED** — no phones, tablets, Safari or Firefox here; desktop Chrome only | — |

## 2. Measured on this PC (Windows 11, RTX 3050, Chrome headless with GPU)

| Measure | Result |
|---|---|
| Unit tests | **65 / 65 pass** (incl. scene-catalogue round-trip, SHD-01 contact audit, identity guard) |
| Browser tests | **60 / 60 pass** (V8 suite + 7 new dual-experience tests; visual baselines re-recorded after reviewing the diffs) |
| Gateway first paint (local server, cold context) | 113 ms to the gateway with both choices visible; no WebGL context is created under the gateway |
| Switch to photo site | 413 ms first (cold chunk), 81–86 ms after |
| Switch to 3D, until the engine is ready | ≈ 3.0 s each time: the WebGL context is released while the photo site is open, so every return is a full engine start. A deliberate memory trade-off; measured, not hidden |
| 3D frame time, 20 motion cycles (re-measured after exterior round 2 with the 82 trees) | sampled frames (900): p50 7.0 ms · p95 7.1 ms · p99 7.1 ms · worst 27.9 ms · 0 > 50 ms. **But** the per-transition log also shows 3 one-off frames of 160–313 ms on "return to tower" from an apartment in the first cycles. They were already there in round 1 (same values in its log) and the round-1 report missed them. Cause not yet found |
| GPU resources across 20 cycles | programs 83 → 83, geometries 357 → 357, textures 187 → 187 (round 2 adds the tree meshes and leaf texture; stable across cycles) |
| Photo-site images | 33 scenes × WebP 960 + 1920 (3.7 MB total); only the current scene and its two neighbours are fetched |

One desktop only. Phones, tablets, Safari and Firefox: **NOT_RUN**.

## 3. Honest limits

- The exterior is better but **still below the references**: dense real-feeling cities, water edges and pro-grade path tracing are what they show. NAKHLA's site is deliberately an inland fictional block. No waterfront is invented.
- The live and Cycles blue hours differ: the live sky is deeper blue.
- Neighbours are relief-modelled massing; there are no people or traffic.
- The photo site has 33 views. Some rooms have no view, e.g. dressing rooms, laundries and Type B's third bedroom. These fall back honestly to the living room of the same plan.
- Sorani and Chinese wording is a draft, and Arabic needs native review.
- The QA matrix has not been re-scored; real devices were not tested.

## 4. Tools used (free, local; nothing paid)

Blender 5.2.3 Cycles (OptiX), three.js, React, Vite, Playwright with the installed Chrome, Vitest, Python (numpy, Pillow), the built-in browser and Claude in Chrome (read-only reel study), 6 new CC0 Poly Haven texture sets, and the `@fontsource/noto-naskh-arabic` font (SIL OFL). No Craft app was needed in this round; the audit is in `project_artifacts/TOOLS_AUDIT.md` §6. No paid generator or skill was used or installed.

## 5. What the owner should review first

1. `npm run build && npm run preview` → http://127.0.0.1:4173. Try the gateway, both experiences, and switching inside an apartment.
2. `reports/BEFORE_AFTER_exterior.jpg` (V8 → V11 street views, live vs Cycles).
3. `reports/REELS_VS_NAKHLA_SCORECARD.md` (the remaining gap, honestly scored).
4. The Sorani spelling «ڕاشید عومەر محەمەد» (a transliteration; the Arabic «راشد عمر محمد» and English "Rashid Omar Mohammed" are confirmed).
