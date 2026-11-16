# V3 VISUAL / UX / CAMERA / RIGHTS QA RELEASE GATES

## Run real tests, not fake reports
QA matrix contains *test definitions only*. Once Claude builds the app, record actual browser/device versions, screen recordings/screenshots, network shaping, GPU tier, test code and results, retest after fixes. `NOT_RUN` != PASS. The package validator tests only fixture consistency, not built 3D nor real app performance. Genuine iOS Safari/iPad Safari verification requires access to those devices, not just responsive Chromium emulation. Do not publish an external company showcase with known P0/P1 failures.

## Baseline acceptance
- A. Branding: logo SVG crisp, original, copyright/credit exact, email and call work, fictional development notice visible; no borrowed design.
- B. Accessibility: Arabic RTL and English LTR cover all views including panels, contacts, forms, warnings and PDF. Keyboard-only navigation reaches everything; screenreader alternative for 3D; visible focus and 44px touch targets; reduced-motion mode avoids forced camera motion.
- C. Performance: first meaningful content and floor picker before 3D; auto quality degradation; stable mid-range phone; no repetitive WebGL context losses; Lite fallback tested; video/gallery never blocks navigation. Use V2 numeric budgets as targets, measure real results.
- D. Four modes: cinematic, guided, freewalk and property explorer all have distinct functional controls, help, start/stop/back, correct transitions and share selection state. Lite full semantic alternative stays accessible.
- E. Visual: inspect actual 3D scene and UI in portrait + tablet + desktop; contrast over variable sky, elegant scene occlusion, no cheap gradient overload, no overlapping controls, material surfaces visibly change, environmental effects are credible, camera feels comfortable.
- F. Trust: 12 floors, 18 demo units, no F10/F11 apartments, no unlicensed media in public site, demo-only info not represented as real estate inventory. No photo falsely claiming selected dynamic material.
- G. Recoverability: missing font/texture/model, offline, browser history, tab suspend, orientation flip, zoom, touch gesture conflict, pointer lock rejection; always regain a useful navigable interface.

## Visual signoff board
Evaluate each screen 1–5 for composition, typographic finesse, originality, interaction clarity, material believability, animation comfort, responsive polish, performance, consistency. A weighted target ≥4 for major categories can inform iteration but does not replace P0/P1 defect gates. Collect before/after annotated screenshots and list outstanding issues in `project_artifacts/VISUAL_QA_REPORT.md`.

## Comfort trial
Ask human volunteer (if available, no mandatory blocking wait) to complete F04→A→Living→change floor→weather→amenity→creator contact on mobile within a few minutes, without tutorial. Observe mis-taps, confusion and nausea; revise. In purely automated environment, run scripted journeys and explicitly disclose human usability was not tested.

## Scope release guidance
Major visual elements and UX are core, but high-fidelity seasons, cinematic music and particles are additive. Ship a fully functioning simplified fallback rather than a stalled hyperrealistic build. Do not silently weaken requested functionalities; list any scope differences and why.
