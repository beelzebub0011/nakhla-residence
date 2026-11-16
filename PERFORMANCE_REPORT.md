# Performance report — NAKHLA RESIDENCE V8

Updated 2026-11-12 (second pass after the exterior, amenities and sound work). **One device only:** Windows 11, Ryzen 5 3600, RTX 3050 8 GB, Chrome 157 headless with GPU (ANGLE D3D11), 1366×768, DPR 1, tier "high" (ambient occlusion on). Phones, tablets, Safari and Firefox: **NOT_RUN** (no hardware in this environment; emulation is not equivalent).

Tools (all in `tools/`): `prewarm_probe.mjs` (boot + interior stage timers, worker timers, main-thread long tasks), `rapid_probe.mjs` (per-frame camera steps and frame times right after load), `light_probe.mjs`, and the Playwright suites `tests/e2e/slice.spec.ts`, `tests/e2e/motion.spec.ts`.

## 1. Cold start (new browser context, no cache)

### What was wrong — measured, not guessed

| Suspect | Finding |
|---|---|
| Furniture geometry worker | **Not the cause.** It builds in ≈ 0.30 s and merges in ≈ 0.07 s and is finished 0.55 s after navigation start. Its reply sat unread because the main thread was frozen. |
| First rendered frame | **Main cause.** Frame 1 froze the page for **1.22 s** compiling every exterior shader synchronously. |
| Interior shader compile | A single compile call froze the page ≈ 0.5 s right after load; later, half-compiled meshes attached to the visible scene forced a blocking compile (one **0.88–0.91 s** frame). |
| Ambient-occlusion chain | Compiled its shaders inside the first interior frame (≈ 0.9 s). |
| Textures | Decoded only after geometry arrived, on one worker (≈ 0.8 s, serial). |

### What was changed

1. Exterior shaders compile asynchronously **before** the first frame (`Engine.warmStart`); the landing screen stays responsive.
2. Ambient-occlusion / output shaders compile asynchronously at boot (`precompilePost`).
3. Interior shaders compile in small groups on quiet frames, never attached to the visible scene.
4. The interior geometry worker starts at engine creation; mesh merging happens in the worker; buffers are transferred.
5. Texture synthesis uses a pool of up to 3 workers; scanned sets start decoding at boot; the floor's exact finishes follow as soon as its geometry is known.
6. No detail was removed and no quality tier was lowered to obtain these numbers.

### Before / after (milliseconds since navigation start unless noted)

| Measure | Before | After |
|---|---|---|
| First frame duration | 1216 | 144–173 |
| Tower interactive ("ready") | 2077–2112 | 1553–1652 |
| Longest main-thread task after ready | 876–911 (first interior frame) | 195 |
| Longest main-thread task during boot (loading screen) | 1219 | 651–725 |
| First apartment floor fully warm | 4112–4179 | 2873 |
| Worst camera step in rapid floor changes at load | 11.4–11.6 m (test failed, limit 9 m) | 2.4–3.2 m |
| Frames ≥ 100 ms during rapid floor changes at load | 6 (100–160 ms) + one 876 ms | one 195 ms |
| Reduced-motion first entry, floor opened the instant the tower appears | 912–1081 | 518–1725 (varies with how much preparation has finished; budget 2000) |
| Reduced-motion entry, warm | — | < 450 (V8 band, asserted strictly) |

Still open: a floor opened in the very first ~1.3 s after the tower appears waits behind the interior shader compile (0.5–1.7 s, behind the veil, without freezing). A persisted program/geometry cache is not possible for WebGL shaders; the remaining lever is fewer distinct interior shader variants.

## 2. Warm navigation (20 full tower → room → tower cycles)

| Measure | Result |
|---|---|
| Frame time during transitions | p50 7.0 · p95 7.1 · p99 7.1 · worst 20.9 ms · 0 frames > 50 ms |
| GPU geometries / textures | 232 → 232 / 159 → 159 |
| Shader programs | 57 → 60 (one-time variants) |
| JS heap (forced GC) | 56.5 → 44.8 MB — no growth |
| Finish swap acknowledgement | 58–79 ms (target < 100 ms) |

## 3. Cold vertical slice (first floor open + first finish swap, real clicks)

p50 7.0 · p95 7.0 · p99 7.1 · worst 62–125 ms · 1–2 frames > 50 ms. **Not yet at the "no frame > 50 ms" target on a cold first visit.**

## 4. Payload

Shell JS ≈ 160 kB gzip · 3D chunk ≈ 165 kB gzip · interior worker 199 kB · scanned textures 8.4 MB (lazy) · lightmaps 0.9 MB.

## 5. Not measured

Real phones/tablets, Safari, Firefox, low-end GPUs, thermal throttling, slow networks, long (hour-scale) soak.

## 6. Second pass — shader variants (after exterior + amenities grew the scene)

The full regression after the amenities remodel exposed two new freezes. `tools/entry_probe.mjs` (programs compiled + long tasks per step) found the cause:

| Step | Before | Cause | After |
|---|---|---|---|
| First floor open | 3 new programs, 492 ms task | "ghost" (fading) variants of the new balcony-furniture materials compiled when the upper floors lift away | 0 new programs, longest task 66–70 ms |
| First room entry | 22 new programs, **1988 ms** task | inside rooms the scene renders into the ambient-occlusion target, which needs a linear-output variant of every shader (interior + exterior seen through windows) | 0 new programs, no task over 50 ms |
| Same, AO chain internals | 5 programs, 224 ms | normal/depth/output shaders of the AO pass | compiled by one silent pass on a quiet frame while the tower is idle (render-on-demand: nothing is moving; worst case one click answered ~0.2 s late) |

Fix: after the tower is on screen, `Engine.startVariants()` compiles ghost and render-target variants in groups of 6–8 on quiet frames; the first floor opening waits for it behind its veil.

| Measure (cold, new browser context) | Value |
|---|---|
| Tower interactive | 2.07–2.17 s (was 1.55–1.65 s before the exterior context and amenities; 2.9 s if everything were compiled up front) |
| Main-thread tasks before the tower appears | 726–835 ms + 305–318 ms (loading screen) |
| First apartment interior fully warm | 4.4 s |
| Cold slice (real clicks): M03 floor open / M05 room entry | 1115 ms (worst frame 62.5 ms) / 1396 ms (worst frame 14 ms; was 3406 ms with a 1995 ms freeze) |
| 20-cycle leak test (baseline after cycle 4) | programs 72 → 72, geometries 291 → 291, textures 175 → 175; heap 73.9 → 74.6 MB; transitions p95 7.0 ms, worst 21 ms, 0 > 50 ms |
| Browser suite | 53 / 53 pass |

Still open: one 62.5 ms frame on the very first floor opening (mesh hand-over of the interior), and a tower that appears ~0.5 s later than before the scene grew.

---

## 5. V11.3 Gate 1: the return-to-tower stall (2026-11-13)

**Symptom:** the per-transition log of the 20-cycle test showed one-off 160–313 ms frames labelled `M12_return_to_tower`. The pooled 900-frame sample hid them (worst 27.9 ms), and the V11.2 round-1 report missed them.

**Probe:** `node tools/hitch_probe.mjs [out] [--cold] [--cycles=N]`. It replays the test's navigation and, for every frame over 40 ms, lists the time spent per WebGL call class and per Engine method, and the shader programs created in that frame.

**Root causes (see `DECISION_LOG.md` D2–D5):**

| Stall | Cause | Fix |
|---|---|---|
| 158–285 ms after a finish-package change (warm) | Crossfade overlay materials were disposed after each fade, so their shader programs were freed and linked again synchronously next time | Pooled overlay materials per shader path; variants compiled with `compileAsync` while the first interior is prepared |
| 167–306 ms on an early package change (cold) | Finish textures synthesised on the main thread | Prepared in the worker first, then the change is applied at once (latest wins) |
| ≈220 ms on the first floor open (cold) | Ambient-occlusion shaders linked synchronously: the old pre-compile produced different program keys (target colour space, scene fog/lights, quad geometry, instanced normal pass, output-pass defines) | Each pass compiled exactly as drawn; the keys were verified to match |

**Measured on this PC** (RTX 3050, Chrome headless with GPU, 1366×768, production build). Evidence is in `project_artifacts/evidence/hitch-probe-*.json`.

| Scenario | Before | After |
|---|---|---|
| Warm, 20 cycles (after the warm-up slice), 3 runs | 4 frames > 40 ms per run: 158, 165, 279, 285 ms | **0 frames > 40 ms** in all 3 runs |
| Cold, 20 cycles starting the instant the tower is ready, 3 runs | 6 frames > 40 ms, up to 316 ms | 2–3 frames, **worst 86 ms**, all in the first cycle |
| Test suite's own record (`motion-20-cycles.json`) | per-transition worst 312.8 ms, 3 frames > 50 ms | **per-transition worst 23.5 ms, 0 frames > 50 ms**; return to tower worst 16.5 ms |
| Shader programs / geometries / textures across 20 cycles | 83 / 357 / 187, stable | 81 / 357 / 187, stable |

**Still open (cold first visit only):**
- **First floor open:** building the floor's meshes synchronously takes 31–45 ms, giving a 69–86 ms frame.
- **First unit view:** a wait on a shader that is still compiling in parallel, plus a texture upload, gives a 78–98 ms frame.

Neither recurs after the first visit.

**Not run:** phones, tablets, Safari and Firefox.
