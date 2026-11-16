# V8 GATE 8 — MOTION SMOOTHNESS, CINEMATIC COMFORT AND INTERRUPTIBILITY

This is a mandatory eighth release gate IN ADDITION TO V7 G1–G7. Do not rewrite/remove the original seven gates. A screenshot, prerecorded video, or marketing reel does NOT certify the interactive site. The intended feeling is exceptionally calm, luxurious and almost film-like without sluggish UI.

## Evidence required
1. Actual interactive vertical slice: building -> floor -> unit -> room -> material -> back; screen recording with clickable functionality plus frame-time profiling.
2. One camera/motion authority and lifecycle evidence: no competing tweens, no duplicate RAF/controls, no memory leaks after 20 cycles, stale input cancellation and retarget transitions from current pose.
3. Trace of 12 named motion flows and real mode-switching tests, with camera collision checks and visibly correct floor/unit spatial relationship.
4. Desktop and actual iOS/Android runs where accessible; report device/browser/version/resolution/GPU/quality tier/thermal condition/time/measurement tooling and med/p95/p99 frame times, hitches over 50ms. Emulator is NOT a physical device.
5. Reduced-motion desktop/mobile and OS preference changes during animation; keyboard, screen reader semantics, touchscreen gesture cancellation, contrast and four-locale layout stability.
6. Asset pipeline: predecode/warm needed materials or safe static preview, no blocking input, reduced-motion and Lite alternatives retained; developer-only motion HUD and replayable transition trace.
7. Human comfort evaluation, ideally >=3 first-time participants if available; if none, truthfully mark NOT_RUN and do not falsely claim user acceptance.

## Proposed thresholds — to be calibrated, not unconditional promises
- UI interaction acknowledgment perceptibly immediate: target <100ms for button response on supported hardware; expensive navigation can complete later with visible progress.
- Capable desktop on balanced quality: p95 active animation frame-time <=20ms, no repeated >50ms hitches across the defined vertical slice.
- Midrange phone balanced/low: p95 active frame-time <=35ms with adaptive reductions/fallback if exceeded.
- All critical transitions interrupt/cancel; no forced 2+ seconds waiting and no camera clipping.
- Every P0 test must show PASS evidence and a reproducible run. If benchmarks unavailable, label BLOCKED or NOT_RUN, not PASS.
- When unable to hit a proposed target on a device, prioritize a stable lower tier or Lite mode and document its limits. Avoid arbitrary frame-rate claims.

## Where to implement first
First implement V8 `MotionDirector` and the tower->floor->unit->room->material vertical slice; do not spend the first milestone building multiple cinematic intro videos. The visual direction comes from actual geometry and controlled motion, not external AI generation.

## QA files
- qa/V8_MOTION_QA_CASES.csv: 80 newly defined NOT_RUN cases; integrated into qa/QA_MASTER_MATRIX.csv.
- data/V8_MOTION_STORYBOARD.csv: 12 mandatory paths.
- data/v8_motion_contract.seed.json: motion vocabulary, accessibility policy, budget proposal.
- templates/V8_MOTION_BENCHMARK_TEMPLATE.csv: record real runs.
