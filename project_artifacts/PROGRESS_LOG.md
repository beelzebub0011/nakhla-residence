# Progress log (2026-11-11)

| Milestone | Result | Evidence |
|---|---|---|
| M0 | Package extracted to `spec/`; all 7 package validators PASS (static file checks only). Canonical model, wall generator, geometry audit. | commit 791f6c5 |
| M1 | Engine, MotionDirector, store, 4 locales, UI shell; first real render of tower → floor → unit → room → material. | commit 71d575b |
| M2 | Sheets (language, menu, environment, help, contact, summary, finder, compare, gallery), Nakhla assistant, 2D Lite, developer HUD, benchmark runner, lighting pass. | commit 69ff421 |
| M3 | 50 unit tests (geometry, i18n, state / URL, assistant, motion, navigation, derived artefacts). | `npm test` |
| M4 | Measured a 674 ms hitch on the first floor open → worker texture synthesis + staged GPU prewarm; worst cold frame now 20.7 ms. | `evidence/motion-vertical-slice.json` |
| M5 | 53 browser tests in Chrome on the real GPU: slice, motion, locales × 3 viewports, sound, assistant, privacy, share / Back, keyboard, 2D Lite without WebGL, 22 visual baselines. | `evidence/e2e-results.json`, `tests/e2e/__screenshots__` |
| M6 | Blender 5.2: `nakhla_tower.blend`, `nakhla_tower.glb`, 12 Cycles stills + gallery manifest. | `blender/`, `public/renders/` |
| M7 | QA status (30 PASS / 3 SKIPPED / 699 NOT_RUN of 732), README, launcher, final report. | `QA_STATUS.csv`, `FINAL_DELIVERY_REPORT.md` |
