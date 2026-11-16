# Decision log (ADRs) — NAKHLA RESIDENCE

| # | Decision | Why | Alternatives considered |
|---|---|---|---|
| ADR-01 | **One canonical metric model in TypeScript** (`src/domain`) generates the WebGL scene, the 2D plans, the assistant's facts, the geometry audit and the Blender scene. Walls are the complement of the room rectangles. | V7 G1: plans, 3D, areas and collision cannot disagree; the audit runs on every `npm test`. | Hand-modelled Blender → GLB first (no CAD supplied; would duplicate the truth). |
| ADR-02 | **Vite + React 19 + plain Three.js + zustand**; no R3F, no GSAP, no OrbitControls. | V8 single-owner rule: one RAF loop and one MotionDirector own every animated property; smaller bundle. | R3F + drei + GSAP (three schedulers to arbitrate), Babylon.js. |
| ADR-03 | **Geometry and textures are generated on the device** (procedural PBR in a Web Worker); the 3D path loads no network assets. | No licensing risk, no CDN or stale caches; ~160 kB gzip lazy 3D chunk. | GLB + KTX2 streaming (kept as a derived Blender export, not used at runtime). Consequence: QA cases about remote asset loading / decoders are SKIPPED as not applicable. |
| ADR-04 | **Render on demand** — frames only while something moves; shadows refresh only when needed. | V7 G3 / heat and battery: no idle 60 fps. | Continuous loop. |
| ADR-05 | Orbit trips interpolate orbit parameters with a velocity-aware quintic; room entry descends through the open top of the cutaway; room-to-room follows door portals from the nav graph; long jumps between levels use a short semantic veil. | Storyboard M03–M12; never through walls; interruptible from the current pose. | Free splines with collision raycasts. |
| ADR-06 | Interiors are prepared off the interaction path (worker textures, `compileAsync`, staged geometry/texture upload); a level only opens when its interior is ready. | Removed a measured 674 ms first-use stall. | Synchronous build at click time. |
| ADR-07 | Nakhla assistant = deterministic local resolver + localized templates; no external LLM (P2, would need owner approval). | V6: no invented facts, no keys in the browser, zero cost. | On-device model (heavy on phones), cloud LLM (cost, privacy). |
| ADR-08 | Pool kept on level 10 with a structural / waterproofing caveat and no stated depth. Shisha terrace kept open-air, separated and **conditional**. | Spec permits it with honest caveats. | Moving the pool to a podium (conflicts with the fixed 12-level programme). |
| ADR-09 | Type A modelled at 124.86 m² net internal, Type B at 145.02 m² (concept 125 / 145). Room areas exclude walls. | Audit tolerance 1 %; basis stated in UI and assistant. | — |
| ADR-10 | Higgsfield and any paid provider not used. | Credit-metered, needs owner approval; the project needs none. | — |
