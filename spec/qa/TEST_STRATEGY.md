# Comprehensive test strategy

## Test types
1. Schema validation: floor count, unique IDs, room data, area program, source alignment; units only floors 1–9, amenities only 10/11, consistent camera anchors, valid PBR paths and material-category restrictions.
2. Unit tests: package reducer, overrides, reset, undo/redo, share encoding, missing IDs, nulls, bilingual dictionary coverage.
3. Component tests: inspector, carousel, breadcrumbs, responsive modal, select menus, contrast and keyboard behavior.
4. End-to-end on desktop and mobile: tower -> floor -> apartment -> room -> change porcelain to oak allowed -> undo -> compare -> gallery -> summary -> export; amenities both; language switch; intro skip; accessibility list; 2D fallback; return and refresh.
5. Real GPU/browser tests: Three assets actually loaded, no context crash, scene raycast floor selection, texture color, day/night, xray visibility; stop-start animation and reverse transition; phone throttling.
6. Visual regression: hero/frame at all responsive viewports, floor cutaway, living material variants, modal states, RTL, overflow, mobile menus. Capture screenshots from stable same OS/browser and deterministic camera seed.
7. Performance: first load, lazy loading, 10 consecutive floor switches, 20 material switches, repeated room changes, GPU memory and heap growth, FPS/long tasks, asset transfer budget, min/average device classes.
8. Data/copy integrity: fictional disclaimers everywhere applicable, localized safety notes, no fake pricing/address/official supplier/certifications.
9. Security: validate deep-link query, sanitize inputs, no token uploads; no unauthorized external calls; dependency audit and license manifest.
10. Resilience: network offline during loads, missing GLB, failed texture, invalid share link, unsupported WebGL, context loss, device rotate, reload, reduced motion and battery quality tier.

## Required artifacts
/tests/unit, /tests/e2e, browser screenshots and trace recordings (if tools available), typecheck/lint logs, Lighthouse/axe report when possible, tester's issue list and remediation evidence. If browser automation unavailable, manually inspect and record clearly what was and wasn't tested. All P0 fail gates block release unless honest accessible fallback is working.
