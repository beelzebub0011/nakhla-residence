# Performance measurements (V11.3)

One device: Windows 11, Ryzen 5 3600, RTX 3050 8 GB, Chrome headless with GPU (ANGLE D3D11), production build. Phones, tablets, Safari and Firefox: **NOT RUN**.

| Measure | Result | How to reproduce |
|---|---|---|
| Return-to-tower stall, warm (20 cycles, 3 runs) | **0 frames > 40 ms** (before: 158–285 ms) | `node tools/hitch_probe.mjs` |
| Same, cold (starting the instant the tower is ready, 3 runs) | 2–3 frames > 40 ms, worst **86 ms**, first cycle only (before: up to 316 ms) | `node tools/hitch_probe.mjs out.json --cold` |
| Test suite's 20-cycle record | 900 sampled frames p50 7.6 · p95 8.2 · p99 8.8 · worst 16.3 ms; per-step worst 22.9 ms; 0 > 50 ms | `npm run e2e` → `project_artifacts/evidence/motion-20-cycles.json` |
| GPU resources over 20 cycles | programs 81 → 81, geometries 403 → 403, textures 195 → 195 | same |
| Live world (traffic moving), tower 1366×768 | p50 7.6 · p95 8.4 · p99 9.4 · worst 10.9 ms; 563 draw calls, 1.15 M triangles | `node tools/idle_fps.mjs` |
| Live world, street view at dusk | p95 8.3 ms; 608 draw calls, 1.20 M triangles | same |
| Live world, tower 1920×1080 | p95 8.3 ms | same |
| Entry screen → both choices visible | 113 ms (V11.2 measurement, unchanged path) | `tests/e2e/dual.spec.ts` |

Root causes and fixes are in `../DECISION_LOG.md` (D2–D5) and `../PERFORMANCE_REPORT.md` §5.
