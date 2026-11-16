# Resume here

State (2026-11-14): **V11.4 on branch `v11-dual-experience` — internal QA, PENDING OWNER REVIEW.** Not deployed.

V11.4 adds:
- demo pricing in both experiences;
- the open roof crown (previewed, then adopted by the owner; D18);
- the Form Architects reference study;
- the streetscape work.

Details are in `FINAL_DELIVERY_REPORT.md` §0.

Governing directives:
- `C:\PC\Claude\NAKHLA_STUDY_NOW_IMPLEMENT_LATER_PRICING.txt` (study, then implement; demo pricing), which builds on
- `C:\PC\Claude\NAKHLA_V11_3_AUTONOMOUS_FIX_FIRST_COMPLETE_EXECUTION.txt`, which builds on
- the V11.2 package `C:\PC\Claude\NAKHLA_V11_pkg\NAKHLA_V11_2_DUAL_EXPERIENCE_DELIVERY\`.

Checkpoints:
- `checkpoint-v11-4-render-2026-11-14` (V11.4 render, before pricing);
- `git checkout checkpoint-pre-v11-3-2026-11-13` (before V11.3);
- `checkpoint-pre-v11-2026-11-13` (V8);
- ZIP `C:\PC\Claude\backups\nakhla_v8_final_2026-11-13.zip`.

Read first:
1. `REVIEW_PACK/README.md`
2. `REVIEW_PACK/QUALITY_GAP_AUDIT.md`
3. `REVIEW_PACK/REMAINING_ISSUES.md`
4. `FINAL_DELIVERY_REPORT.md`
5. `DECISION_LOG.md` (every routine decision taken without the owner)

**Creator name:** Arabic «راشد عمر محمد» (the V11 package's instruction; DECISION_LOG D6). English "Rashid Omar Mohammed" was confirmed by the owner on 2026-11-13. Sorani «ڕاشید عومەر محەمەد» needs native review. The guard test is `tests/unit/identity.test.ts`.

## Run

1. `npm run build && npm run preview` → http://127.0.0.1:4173.
2. `npm test` (65 unit). This also writes the Blender export, `reports/SCENE_MAPPING.md` and `reports/SHD01_CONTACT_CHECK.md`.
3. `npm run e2e` (60 browser tests).
4. Cycles, all 44 views, about 1.7 h on the RTX 3050:

   ```
   node tools/blender.mjs blender/build_nakhla.py blender/scene_prims.json blender public/renders --samples=256
   ```

   Then run `python tools/web_images.py` and `python tools/manifest.py`.
5. Evidence:
   - `node tools/review_pack.mjs` (real screenshots + clips)
   - `python tools/fourway.py` (private reel comparisons)
   - `node tools/hitch_probe.mjs [out] [--cold]` (long-frame attribution)
   - `node tools/idle_fps.mjs` (live frame times)
   - `MSYS_NO_PATHCONV=1 node tools/parity_shots.mjs <dir> <ids>` (live frames from the Cycles cameras)

## Where things are

- **Demo pricing:**
  - edit `src/data/pricing-demo.json`;
  - logic: `src/domain/pricing.ts`;
  - UI: `src/ui/Pricing.tsx`;
  - method: `project_artifacts/pricing/MARKET_ANCHORING.md`.
- **Reference study:** `project_artifacts/reference_study/`. The boards and frames are private and git-ignored; rebuild them with `python tools/fa_boards.py <spec.json>`.

- **Camera bookmarks** (Cycles and photo site): `src/domain/views.ts`.
- **Photo site:** `src/visual/` (the chapters and the scene ↔ 3D mapping are in `catalog.ts`).
- **Entry screen and switch:**
  - gateway: `src/ui/Gateway.tsx`;
  - switch: `src/ui/ExperienceSwitch.tsx`;
  - routes: `src/state/store.ts` (`hashToPatch`).
- **Site:** `src/engine/site.ts`. It holds the district grid (`DISTRICT`, `districtBlocks`), neighbours, trees (`broadleafTree`, `treeSpots`), palms, traffic (`trafficAt`), the entrance portal (`CANOPY`) and lamps.
- **Cycles:** `blender/build_nakhla.py`. It holds the distance haze (compositor `NK_haze`, `haze_for`), trees, palms, canopy lights and lit city windows.
- **Stall fix:** `Engine.fadeMat` / `releaseFadeMat` / `warmFadeVariants`, `precompilePost`, and `applyFinishes` (worker-first).
- **Music:** `src/audio/ambience.ts` (`scheduleMusic`).

## Next, in order (full list: `REVIEW_PACK/REMAINING_ISSUES.md`)

0. V11.5 (D21) is in: sky `src/engine/sky.ts`, PBR Neutral in both renderers, façade palette in `matlib.ts`, gardens and the street fix in `site.ts`, level-11 lights in `furniture.ts`, photo site in `src/visual/`. QA tools: `tools/env_shots.mjs` (sky across hours/weathers), `tools/visual_shots.mjs` (photo site).

1. Facade variety for the district within 250 m: arcades, balconies, roofs and signage. Window rhythms, AC units and curtains are done (D19).
2. Done:
   - tower mullion and head caps, and stone sills (D19);
   - the open roof crown, owner-adopted (D18), built by `buildCrown()` in `src/domain/prims.ts`.
   There are now 48 Cycles views, including `street_golden_sun`.
3. Interior hero: done (D20). The cove is `ceilingCove()` in `src/domain/furniture.ts`, the photo camera is `view.photo` in `plans.ts`.
4. Live trees: more and smaller cards near the camera; show the live lobby through the glass in street view.
5. Photo-site gaps: laundries and halls; reframe B_dressing.
6. Re-capture reel frames REF01/04/05 for the remaining four-way sheets (read-only, owner's browser).
7. Needs the owner: people (CC0 download), recorded music stems, real devices, native language review.
