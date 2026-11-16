# PERFORMANCE NO-LAG CONTRACT — v2.0 — MANDATORY P0 RELEASE GATE

## Mission and definition of smooth
The user's hard requirement is that a prospect opening an ordinary link on a mobile phone, iPad, laptop, or desktop experiences a smooth, intuitive, visually stunning website, **not a huge 3D download, stalled loading bar, overheating phone, crashed tab, input lag, freezing transition, or opaque black canvas**. Performance is not a finishing detail; it determines art direction, scene architecture, animation, data shape, UX and release. Optimize for a mid-range phone with ordinary mobile data *before* desktop visual polish. Professional execution MUST measure in actual browsers, not promise 60 FPS from intuition.

ABSOLUTE TRUTH RULE: No honest developer can guarantee zero bugs, no jitter, or compatibility with every device/network. Instead implement a measurable service target, extensive real-device/browser QA, graceful fallback, and transparent release report. Never falsely claim measurements or testing.

## Priority order, if visual polish conflicts
1. Consistently usable and responsive input/clear copy;
2. Fast first useful paint and access to building/floor/unit information;
3. Correct navigation and state preservation;
4. Smooth 3D camera and surface changes on target hardware;
5. Premium believable material/light rendering;
6. Optional weather particles, film effects, shadows, animation, reflections, audio.
NO postprocessing/effect is indispensable. A buttery-smooth low/medium tier is better than intermittent photoreal freezes.

## Explicit numerical goals: targets to test, not false guarantees
Google Core Web Vitals, 75th percentile of field visits (when enough genuine visits exist): LCP <=2.5s, INP <=200ms, CLS <=0.1, segmented mobile/desktop. These are CWV indicators, not equivalent to 3D fully loaded time. During local throttled tests, record measured results and equipment rather than claim a universal passing score. The initial semantic hero (logo, title, compelling *optimized* poster, Explore control) must appear before a heavy 3D runtime is needed.
- Usability: controls respond with visible pressed/selected feedback without waiting for a 3D fetch; never delay a click silently.
- Under realistic mid-tier hardware, working 3D interactivity target >=30 FPS during representative rotation/walkthrough, >=45 FPS on a reasonably capable tested desktop/tablet when feasible. Target smooth 60 on strong hardware; do not force 60 for all devices. Capture median, p5, p1 frame rates, frame-time p95/p99, stutter count and worst-case spikes, and indicate scene/quality tier.
- Aim interaction visual confirmation <100ms before async work begins; no blocking main thread longer than 100ms on common interactions; preferably <50ms where feasible. For on-demand GL assets always show progress, retry and escape.
- Test 10 rapid floor selections, 20 material swaps, 15 room changes, 12 environment changes and 3 complete demo loops for memory leaks and freeze regression. After returning to start, memory/GPU object counts should stabilize within normal caches and documented tolerances; monotonic unbounded growth fails.
- Set *initial aspirational* transfer budgets before prototype: critical first paint HTML/CSS/JS/poster <= ~1.5MB transferred on modern compression; initial viewer scene assets <= ~3-6MB for low/mid tier in first interaction; individual interior/amenity scene bundles preferably <= ~3-8MB low/mid and <= ~8-15MB high. These are starting budgets, not immutable promises; measure high-res art and revise with evidence. Zero blocking video and zero interior/pool/restaurant bundles on landing load. Size the optimized LCP hero image by viewport. NO 100MB upfront download.
- For slow networks ensure text/site overview is usable in seconds even if 3D takes longer; set a reasonable viewer timeout and use poster/2D controls on failure. Include a quick-first-interaction metric (e.g. "time to select a floor" under the test network conditions) and cold vs warm cache metrics.
- Avoid unnecessary ongoing GPU activity while idle. Pause rendering when tab hidden, battery/low-power constraints, reduced motion and when scene is not visible. Never bind all controls to continuous requestAnimationFrame without necessity.

## Three-stage launch: never load entire world immediately
STAGE A — Critical HTML shell: brand, heading, condensed 2D tower overview, poster, accessible floor controls, AR/EN selector, and immediate 'Explore' button; server-render/static HTML where sensible. This stage MUST render without WebGL/Blender.
STAGE B — Exterior interactive progressive: on observed user intent, fetch one optimized facade/glb, 1-2 essential environment assets, minimal shaders. Show poster until first valid frame, never a black rectangle. Load optional closeups and higher LOD after viewer is useful; preserve floor selection across upgrades.
STAGE C — On-demand zones: one selected floor/unit/room and nearby adjacent scenes, then amenity scenes ONLY when navigated to. Prefetch conservatively on idle/good network; abort irrelevant downloads when user switches quickly. Never hold all 18 furnished apartments, 5 interiors, gym, pool, restaurant and four weather variants in GPU memory simultaneously.

## GPU/asset preparation pipeline (Blender -> Web)
- One canonical structural source mesh and transforms. Split by *semantic selection boundaries* (floor, room, selectable surface) and render/culling boundaries, but intelligently merge permanently static pieces within each region.
- Export glTF/GLB with correct real-world scale (meters), normals, tangents, meaningful pivots, UVs, consistent color management, named object IDs and floor/unit metadata. Run glTF validator. Remove unused meshes, cameras, hidden duplicates, non-visible interior behind opaque walls, orphan materials and baked Cycles-only nodes unsupported in realtime glTF.
- Geometric LOD and material LOD: low/mid/high. Reduce polygon count, bake details to PBR textures/normal maps, reuse meshes via instancing where semantic picking can still resolve original floor/unit ID. Occlusion/visibility culling and frustum culling; don't draw hidden interior from external tour. Avoid per-frame expensive raycasts; raycast only on pointer events or throttled on move with coarse targets.
- Texture compression via KTX2/Basis Universal where supported; test decoding on Safari/iOS, Android and desktop; fallback compressed WebP/AVIF/JPEG/PNG as appropriate, never ship original 8K PNGs by default. Provide properly sized mips, correct sRGB/linear channels, reasonable anisotropy, normal map scale and PBR map packing. Typical default textures 512px-1K low, 1K-2K high for critical objects; 4K only when measured and justified. Use atlases and shared samplers where effective; avoid texture duplication from every variant.
- Mesh/geometry compression: compare meshopt and Draco on actual output, browser decoding time, implementation and toolchain; choose measured winner, document required decoders. Ensure worker dependencies/WASM files are shipped at known versions, cached, and served with correct MIME. Do not stack compression schemes blindly.
- Consider baked GI/lightmaps/reflection probes, inexpensive analytic dynamic sun for weather/time, limited shadow maps with cascades only where needed. In low tier disable/refine expensive SSR, SSAO, volumetrics, bloom, realtime reflection, numerous lights, alpha particles, high-resolution shadows and high sample anisotropy. Never make dynamic day/night depend on recalculating realtime global illumination on every slider move.
- Material swap: cache common textures, update targeted mesh/material uniforms without replacing whole GLB, debounce rapid changes, upload on idle/preload nearest swatches, dispose only unreferenced resources. Separate source material catalog ID from GPU texture instance; avoid clone leaks.
- Deterministic original assets and provenance/rights. Rendering software can be slow; ship static render plus functional 3D tour when realtime visual fidelity has limits. Don't falsify gallery image matches current custom selections.

## Runtime and adaptive quality controller
Quality tiers: 2D Lite -> Low -> Balanced -> High -> Ultra (opt-in); detect device capabilities via features/performance measurements, not UA only, screen size or guessed GPU name. Start conservatively then increase only after stable measurements. "Auto" should be default with user override and saved preference. Debounce/hysteresis prevent tier oscillation. Quality adjustments must NOT move furniture, remove doors, break hit targets, reset material choices, change room geometry, remove accessibility semantics or hide key content.
- Sample moving window of frame times, memory clues where available, CPU long tasks, canvas dimensions, devicePixelRatio, network hint where available, battery saver when available and thermal symptoms (infer only from sustained slowdown, not invented API).
- Initial viewport DPR cap by tier: Lite=no canvas, Low~0.75-1.0, Balanced~1.0-1.4, High~1.5-2.0 subject to measured hardware. Decouple CSS layout pixels from backing render resolution. Resize carefully without expensive repeated render-target recreation on keyboard opening.
- Example degrade order: turn off particles/audio visualizers -> postprocess off -> reduce reflection/shadow quality -> reduce DPR -> select lower model/texture LOD -> reduce vegetation/props -> pause nonessential simulations -> show Lite mode if GPU fails. Upgrade only after sustained headroom and never during a camera animation or active user swipe.
- Quality control is a distinct domain service with telemetry callbacks, not a hand-wavy `if mobile then low`. Implement per-zone budgets because exterior, cutaway, furnished interior, pool and restaurant differ.
- Render-on-demand when idle; invalidate only on user interactions, animated camera transitions, environment interpolation or material change. If an intro/guide animation occurs, run scoped loop and stop on completion; maintain maximum dt to avoid jumping after tab resumes.

## Loading, cancellation, recovery
- Download real progress if measurable; avoid '98%' fake spinner; display stage text and estimated size where known. Persistent Back/Exit to 2D, Cancel tour and Retry.
- AbortController / task sequence tokens protect against stale asset response overwriting newer floor choice; race: F03 click then F09 click => F09 always wins. Unmount/cancel disposable workers, animation timelines, renderers. Guard rapid transitions from double-click, multitouch, back-navigation and browser history.
- Handle `webglcontextlost`, `webglcontextrestored`, GPU OOM, loader error, corrupted GLB, decoder missing, HTTP 404/500, poor connection, offline, low storage, JS error boundary, invalid scene ID, invalid saved state, unsupported texture format and zero viewport. Restore state when possible, then fallback to semantic 2D image+DOM floor/unit/room controls. No infinite reload crash loop.
- If 3D cannot render, the visitor can still browse building info, choose a floor and unit, inspect static room images/finish specs, compare selection, and contact via demo-safe workflow. Include a visible small '3D unavailable / Switch to Lite' action, not a blocked blank canvas.
- Media must provide alt text, lazy gallery loading, responsive `srcset/sizes` and dimensions, smart prefetch of next image, and safe animated image codecs. No automatic sound, autoplay video or delayed full-screen giant animation.

## Network, CDN, caching and deployment-readiness
- Immutable versioned fingerprinted asset URLs + long-lived immutable cache for GLB/KTX2/render assets; short cache for mutable app/data. HTTP compression (Brotli/gzip), modern transport, range support if useful and verified, CDN edge assets optional if allowed. Don't require API paid services. Ensure deterministic cache invalidation when model version updates; do not cache nonexistent/invalid files as good versions.
- Use consent-aware service worker only if truly beneficial and correct; avoid stale HTML/asset pair. Test Safari back-forward, reload under offline, slow cache, change of locale, new release, expired references, and reconnect. Progressive app shell available with accessible content even when asset CDN unreachable.
- No third-party analytics or service calls without explicit informed choice; if local diagnostics used, clearly identify no sensitive data. Never report performance metrics that weren't measured.

## Practical profiling requirements
Use browser Performance recorder, GPU/resource inspector when available, React profiler, network waterfall, bundle analyzer, Core Web Vitals tooling, Lighthouse mobile+desktop, Playwright traces and original device test. Record browser build, device, OS, battery state if known, network conditions, viewport, resolution, quality tier, cold/warm load, LCP/INP/CLS if observable, FPS median/p5, peak GPU/JS heap approximation when available, transferred MB, time until first interactive floor, and screenshot. If a metric isn't available, mark unmeasured and explain.
Prototype first with one exterior floor selection and one hero interior swappable floor; performance gate before adding amenity/particles/fancy transitions. Profile each completed vertical slice, not once at the end. 90% fidelity with 100% usable interactions beats a showcase image on an unusable website.

## Performance acceptance decision
P0 FAIL if any target test environment gives a completely blocked site/no fallback, runaway memory, unusable floor selection, regular multi-second input stalls or crash; P1 FAIL if user cannot independently turn effects down, page shifts repeatedly, or third-party fonts/assets block usability. If a performance target is missed, triage and simplify; do not fake a green report. See QA/PERFORMANCE_E2E_ACCEPTANCE.md for reproducible tests.

## Verified reference sources (check latest documentation during execution)
- Google Web Vitals: https://web.dev/articles/vitals
- Google LCP optimization: https://web.dev/articles/optimize-lcp
- Three.js optimize lots of objects: https://threejs.org/manual/pages/optimize-lots-of-objects.html
- Three.js KTX2Loader: https://threejs.org/docs/pages/KTX2Loader.html
- MDN context loss: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event


## V3 aesthetic performance priority
Expensive blur, shadows, particles and cinematic postprocessing must be quality-tiered and disabled automatically under load; no endless render loop while stationary if avoidable. First content must display without 3D and mode switches preserve state. Decorative features are behind real benchmarks, not permission to lag. See V3 design and release gate.
