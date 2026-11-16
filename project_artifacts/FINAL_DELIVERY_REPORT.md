# NAKHLA RESIDENCE — delivery report (V8)

> **SUPERSEDED on 2026-11-12 — the current report is `FINAL_DELIVERY_REPORT.md` in the project root.** The owner did not approve this delivery. The project is in quality recovery: see `QUALITY_GAP_AUDIT.md`, `PROJECT_PROGRESS.md` and `project_artifacts/golden/GOLDEN_APARTMENT_REVIEW.md`. The text below describes the earlier baseline and is kept for the record only.

Date: 2026-11-11 · Status: **working local demo; NOT READY for public release** (P0 checks still NOT_RUN — see §5).
Creator: Rashid Omar Mohammed — +9647700864990 — rashid.iq12@gmail.com · Concept only, not a real listing.

## 1. What was built (and verified in a real browser)

| Area | Delivered | How it was verified |
|---|---|---|
| Building model | 12 occupied levels (G, F01–F09, F10 wellness, F11 sky dining) + unoccupied roof plant; 18 apartments; Type A 124.86 m² / Type B 145.02 m² net internal from plan polygons; real openings, fins, balconies, core with 2 stairs and 3 lifts | Geometry audit in `npm test` (no overlaps, every opening cuts a wall, every room reachable, areas within 1 %); ledger `geometry_audit.json/.csv` |
| 3D experience | Tower orbit with inertia, façade floor picking + Levels rail, lift-away cutaway, dollhouse, room interiors (Type A hero, Type B medium, G / F10 / F11 amenity interiors) | Real mouse clicks on the WebGL canvas in Chrome (slice test) |
| V8 motion | MotionDirector = only camera writer; frame-rate-independent damping, quaternion/shortest-path turns, 50 ms delta clamp, retarget from current pose, door-portal paths, semantic veil for long jumps, Gentle / Reduced | Unit tests at 120/60/30 Hz + browser motion tests; frame-time records exported |
| Design | 18 original procedural PBR finishes in 6 categories, 3 packages, 20 editable surfaces, undo/redo/reset, hold-to-compare, passport, My Apartment schedule, print/PDF, share link | GPU pixel colour measured before/after a swap; URL round-trip; summary test |
| Amenities | F10 pool / gym / spa / changing / lounge; F11 restaurant / café / terrace / conditional shisha terrace, with caveats | Browser test |
| Tour modes | Dollhouse, Guided, Free walk (WASD, tap-to-move, collision), Cinematic (5 opt-in scenes, pause/skip/exit, restores your state) | Browser test (pose kept on mode switch; collision); cinematic UI exercised manually |
| Environment | Simulated hour, 4 seasons, 6 weathers; blends without resetting anything | Browser test (colour change + state unchanged) |
| Nakhla assistant | Local deterministic resolver, 43 intents, 4 languages incl. Iraqi dialect, status + source on every answer, typed actions only, confirmation before finish changes, never invents price / brand / availability / pool depth / view | 10 unit tests + browser test |
| Languages | ar-IQ (default, RTL), en, ckb-IQ (RTL), zh-Hans; every key present, placeholders consistent; IDs and 3D never mirrored | Unit tests + 12 locale × viewport browser tests |
| Sound | Muted on every load; no AudioContext before the sound button; navigation never unmutes; opt-in never persisted | Browser test incl. reload |
| Recovery / fallback | WebGL context loss → notice, state kept, 3D restored; 2D Lite with WebGL disabled keeps floors, rooms, finishes, assistant | Browser tests |
| Privacy | Zero third-party requests; no analytics; demo enquiry sends nothing; contact data never in URL or storage | Browser test (network capture) |
| Blender | `blender/nakhla_tower.blend` (editable), `nakhla_tower.glb` (5.0 MB), 12 Cycles stills (gallery, labelled as renders) from the same geometry | Built with Blender 5.2.3 LTS, OptiX on RTX 3050 |

## 2. Measured performance (automated, one desktop)

Device: Windows 11, NVIDIA GeForce RTX 3050 8 GB, Google Chrome 157 headless with GPU (ANGLE / D3D11), 1366×768, DPR 1, auto tier = high. **Not** a phone, tablet, Safari or Firefox.

| Measure | Result | Proposed target |
|---|---|---|
| Active-transition frame time, 20 full cycles (87 transitions) | p50 7.0 ms · p95 7.1 ms · p99 7.1 ms · worst 9.8 ms · 0 frames > 50 ms | p95 ≤ 20 ms, no repeated > 50 ms |
| Cold first visit slice (first floor open + first material swap) | worst frame 20.7 ms, 0 > 50 ms (was 674 ms before ADR-06) | same |
| Transition durations | floor 1.1 s · unit 0.8–1.0 s · room 1.4 s · return 0.95 s · reduced-motion < 0.45 s | bands in the V8 contract |
| Memory after 20 cycles | GPU geometries 189 → 189, textures 137 → 137, programs 21 → 21, JS heap flat | no growth |
| Material swap acknowledgement (click → state) | ≈ 340 ms measured end-to-end through Playwright (includes automation overhead); visual reveal 240 ms | < 100 ms perceived — **not proven by this tool**, needs a real-device trace |
| Bundles (gzip) | shell JS ≈ 157 kB + CSS 11 kB; lazy 3D chunk (three + engine) ≈ 162 kB; worker 4.7 kB; Arabic font 166 kB | — |

Files: `evidence/motion-vertical-slice.json`, `evidence/motion-20-cycles.json`, `evidence/motion-benchmark.csv`, `evidence/e2e-results.json`.

## 3. Tests

- `npm test`: **50 passing** — geometry audit, locales, state/URL hardening, assistant, MotionDirector, navigation/collision, derived artefacts.
- `npm run e2e`: **53 passing, 0 flaky** (5.6 min) — slice, motion, locales × viewports, sound, assistant, enquiry/privacy, share + Back/Forward, keyboard, 2D Lite without WebGL, gallery, 22 visual baselines (`tests/e2e/__screenshots__`).
- Spec package validators (`spec/scripts/*`): all 7 PASS — they check files only.

## 4. Honest limitations

- Realism is clean concept visualisation, not photoreal: furniture is simple box/cylinder geometry; Type B interiors are medium detail; Blender stills use flat PBR colours (no textures), the night exterior is very dark and the bathroom still is weakly framed.
- Areas/dimensions come from the concept model, not a survey or licensed design; no structural, MEP, fire, accessibility-code, pool-load or shisha legality review exists.
- Translations are drafts (DRAFT_UNVERIFIED) — no native-speaker sign-off.
- Chinese text uses the visitor's system font (not bundled).
- Real user monitoring (V7 G7) is intentionally not implemented: it requires your approval of a provider, consent text and hosting.
- Not deployed anywhere; nothing was published, sent or purchased. Higgsfield and all paid services unused.

## 5. QA matrix status

`project_artifacts/QA_STATUS.csv` (source matrix unchanged): **30 PASS · 3 SKIPPED (not applicable, ADR-03) · 699 NOT_RUN** of 732; 268 P0 still NOT_RUN. PASS is only given where a named automated test covers that exact scenario. **Gate G8 is not passed**: it needs physical-device data and human comfort sessions.

## 6. Recommended next steps

1. Real devices: iPhone Safari, Android Chrome, iPad, desktop Firefox — `/?hud=1` → "run slice ×3" → export CSV/JSON.
2. Three first-time testers on desktop and phone (comfort questions from the V8 spec).
3. Native review of Arabic, Sorani and Chinese.
4. Screen-reader pass (NVDA, VoiceOver).
5. Realism pass (furniture, Type B detail, textured Blender materials, better night/bathroom stills).
6. If you want a public link: choose a host and approve it — deployment was not done.
