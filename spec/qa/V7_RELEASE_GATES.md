# V7 RELEASE GATES — evidence, not assertions

Gate G1 CAD/BIM single truth: numeric dimensions have provenance, all 12 floor and 18 unit IDs match mesh and plans; no unapproved exact room measurement, no false photorealistic claims. PASS only after generated 3D, geometry audit and read-only review.
Gate G2 PBR/render parity: measured texel scale, correct units and plausible reflectance/lighting; Blender and browser paired screenshots and exception register; no AI image masquerading as actual geometry.
Gate G3 Progressive loading: fresh/cached loads at real mobile 4G/slow path, network waterfall, scene weights, frame-time p95, memory during 5+min navigation, correct transition disposal and Lite failover. No blanket promise of 60FPS.
Gate G4 Comfort: all four navigation modes, back/reset, collisions, mobile touch/tap, keyboard, motion accessibility and no clipping/tween fighting. Real user sanity check.
Gate G5 Resilience: tested WebGL context lost/recovered or usable Lite, offline/timeout/404 retry, orientation changes, tab suspension and state preservation.
Gate G6 Visual regression: baseline images across 4 locales on at least phone/tablet/desktop, explicit screenshots, result diff/evidence, no faux results; translated UI proofread status disclosed.
Gate G7 Privacy/monitoring: post-launch telemetry plan with owner approval, redacted example logging, error capture/rollback, no chat text/GPS default.
Gate H0 Higgsfield: can be PASS = verified licensed zero-cost supported flow with owner approval; SKIPPED = safely completed with Blender; NEVER BLOCKS WEBSITE SHIPMENT solely by its absence. Commercial rights must be checked for any media retained.

### Performance SLO proposal (NOT proven)
Core Web Vitals good thresholds p75: LCP<=2.5s, INP<=200ms, CLS<=0.1 for actual devices/users; measure real and label emulation. Target 3D balanced capable desktop >=45 FPS (aspire 60) and mid-tier phone >=30, after thermal test; adaptive fallback if missed. No automated test can prove guarantee for every device. Define shipping-grade performance from measurement and realistic support matrix, not aspirational feature list.

### Source truth, finance, licensing
Pool roof loads, indoor moisture, shisha fire/ventilation, local approvals are concepts only. No pricing/availability/brand/warranty/room dimension invented. Higgsfield trial defaults disabled; not subscribed without explicit owner action; no vendor-dependent visitor runtime; audit asset licenses.

### Evidence bundle required before completion
project_artifacts/qa/V7_RELEASE_REPORT.md with per-gate state PASS/BLOCKED/NOT_RUN, tests run and environment, actual metrics, errors and source logs; project_artifacts/qa/SCREENSHOT_INDEX.csv; project_artifacts/research/PROVENANCE.md; project_artifacts/geometry/MEASUREMENT_AUDIT.csv; project_artifacts/perf/DEVICE_RUNS.csv; project_artifacts/RESUME_HERE.md. If any P0 is BLOCKED or NOT_RUN, do not label finished/production-ready.
