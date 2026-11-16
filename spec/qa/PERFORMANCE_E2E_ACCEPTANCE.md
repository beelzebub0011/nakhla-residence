# REPRODUCIBLE DEVICE & PERFORMANCE RELEASE GATES — V2

## What counts as tested
Every result needs date, local browser/version, OS, device model or hardware class, viewport/CSS size, actual DPR, selected quality tier, network shaping, cold/warm cache, scene ID, FPS summary, network transfer, logs, pass/fail, screenshot/trace file paths. Tests in mocked/emulated browser must be explicitly labelled; mobile emulation does not replace a real iPhone/Android. CI results are not automatically user-experience proof. `NOT_RUN` is not a pass. A link being reachable on the author's PC is not proof it works for a remote recipient.

## Release process
1. Validate source fixture and asset manifest, check safe versions/license, run typecheck/lint/unit tests; failures block review.
2. Smoke load served production build locally, not dev hot module app; critical brand content visible with 3D disabled; no console errors or broken network requests; baseline JS/CSS/poster initial transfer recorded.
3. Run representative automated E2E on Chromium, Firefox and WebKit engine if available, keyboard and mobile viewport, Arabic and English. Use at least one actual iPhone Safari and Android Chrome if accessible, iPad if possible; document unverified combinations explicitly.
4. Measure Core Web Vitals and 3D scene metrics **separately** with 3G/4G network simulation and device CPU throttle. Lighthouse can be used but do not invent a composite target as a substitute for specific metrics. Aim >=90 performance score as stretch, not an unsupported pass/fail guarantee. Confirm LCP <=2.5s / INP <=200ms / CLS <=0.1 on field p75 where field data exists; for no field data only report lab proxies and measured values.
5. Stress-test: 10 floor jumps F01/F09/F04/F10/F11/G sequences; 20 legal material swaps; 12 weather/time/season changes; 10 enter/exit walk cycles; 3 complete presentation loops; rapid navigation back/forward, deep link reload, lost network during GLB fetch; repeated tab hiding/resuming.
6. Enter low-tier forced QA; intentionally disable WebGL, kill network, simulate missing GLB/decoder, call WebGL loseContext in a controlled test, break one texture; app stays usable with Lite and reports recoverable state, no blank canvas.
7. Inspect responsive screenshots at matrix widths and portrait/landscape, device zoom 125% and phone font scale, Arabic/English. Actual touch gestures verified. Test orientation change during material change and in walk mode; no crash or state reset.
8. Visual acceptance pass: facade proportions match floor cutaway; floor pick maps correctly, actual material changes vs spec, sky position plausible, exterior rain does not intrude indoor, dawn/day/sunset/night renders comparable; scenes sufficiently attractive after optimization.
9. Prioritize fixes: P0 blockers => no showcase release; P1 major => fix or documented scope reduction before external company link; P2 cosmetic => backlog acceptable with evidence.
10. Final preview, build artifacts, source Blender/GLB, manifest with rights, screenshots, performance evidence, browser compatibility table, Git status/commit, RESUME_HERE and honest delivered-vs-not-delivered summary.

## Example P0 scripted user journey (must be real, not generated assertions)
- Cold open `/ar/explore` on shaped mid-range mobile; title and button display independently of GLB; tap explore; select F04 via list/3D; select 04A; open living; enter free walk or low-tier guided scene; select floor material; change sample; confirm rendered GPU/material changed; change to sunset/rain/winter; confirm floor material and camera preserved; open photo gallery with honest labels; save/share print report; switch English; reload direct link; exit. Validate every step and capture evidence.
- Cold open `/en/explore` on desktop, mouse select F10 and actual gym/pool movement; choose F11 and actual restaurant/terrace movement; environment mode day->night, open finish board; then hit browser back, restore correct floor; no WebGL exceptions.
- Force no-WebGL on iPad-sized viewport: floor/unit selection, room photos, material info, compare and export still work.

## Robustness edge-case grid
Smallest phones, orientation change, high zoom, dynamic safe area, slow response, connection 404/500, WebGL context lost and restored, page backgrounding, invalid user shared URL, unknown surface ID, missing texture, locale missing key, alternate materials racing, old cached code vs new model, tab reload during asset fetch, accidental double taps, language switch while moving, rapid top-level scene choice, ARIA keyboard-only access, reduced motion, sound off and denied motion permission.

## Strict release decision template
`Feature / target` | `Observed result` | `Test context` | `Evidence` | `Risk/severity` | `Action` | `Owner` | `Final status`.
No fabricated 'all green'. If some device wasn't tested explicitly say 'unverified'. If one experimental WOW feature misses a budget, disable on low/mid or ship behind opt-in flag; do not sacrifice baseline features. A polished, well-measured hybrid demo with a truthful limitation is preferable to a supposedly flawless website that crashes on a user's phone.
