# V5 — RELEASE GATES: PROVE THE SIMPLE FOUR-SECTION EXPERIENCE WORKS

Fixture validation is not product testing; start all new cases NOT_RUN, only PASS with actual evidence path, tested device/browser/build. P0 failure blocks claiming product ready.

## P0 blocking UX / data / safety
1. Exactly four clear top-level visitor sections in all 4 locales; optional landing is a hero not fifth permanent tab; activeTool and camera mode do not become navigation tabs.
2. Arabic is first-visit default; all UI copy including contextual tools, share, FAQ, presentations and exports fully localized and reviewed status recorded, RTL/CKB and CJK glyphs correct.
3. Audio OFF on new page load no autoplay; no tour/floor/section/language/weather change unmutes. Sound control always works with keyboard/touch.
4. No blank 3D screen as only way to access information; Lite can browse floors/unit list/materials/gallery/summary/amenities/contact and compare.
5. 12 levels G+01..11 with exactly 18 units on F01–F09 only; no units on F10/F11. Creator phone and email exact, no fictional sales ownership.
6. All four exploration camera modes share one controller owner; no camera clipping, stuck pointer-lock, rollercoaster animation, surprise teleports or overlap of inconsistent scene positions.
7. Multi-section flow preserves selected unit, material changes, bookmarked camera, weather and language; navigating to amenities does not reassign the unit onto F10/F11.
8. Link share is bounded/allowlisted/no personally identifying visitor data; failure falls back to copyable summary; shared state tamper/invalid IDs safely handled.
9. All conceptual views, daylight, size and furnishings marked illustrative unless based on approved survey/drawings; no fake prices or availability.
10. No unreviewed external skills, paid services, auto-contact or public deployment.

## P1 value/experience QA
- Smart Apartment Finder: deterministic result/why/explain/reset/empty state, respects floor/type catalog; no sensitive prompts; scores not fabricated.
- Compare two apartments only, not accidental 3; correct actual differences and return to previous selected unit.
- Daylight and View Lens camera/time changes cause observable result without scene flicker; unverifiable views clearly conceptual; north position consistent across languages.
- Day-in-life chapter skip/pause, environment restore, reduced-motion+Lite chapter cards, no giant start download or audio startup.
- Presentation action is nonintrusive; salesperson can jump to selected floor/room and return without data loss; 3–5min chapter script (not forced playback).
- Save choices survives section switches; print/export/share works in all locales with caveats and correct materials; no network calls required.

## P2 conditional QA
- Furniture models stay inside room, measured dimensions anchored to actual GLB geometry; incorrect source data forces 'illustrative' mode; touch alternative.
- X-Ray uses real meshes; no fabricated pipes and no material corruption when exiting, graceful mobile fallback.
- Style suggestions only use catalog IDs and are reversible; optional AI API disabled, never demands an API key to open site.
- FAQ concierge cites available project metadata, returns 'unknown' when not sourced; no hallucinatory pricing or private-data collection.
- White-label project schema can switch to second clearly fictional seeded project with no Nakhla-specific old data or creator leakage; no developer-only keys in public runtime.

## Human usability challenge
Observe one uninstructed new visitor on phone: reaches Floor 04 Unit A, finds Living, changes floor material, switches to Amenities, returns and sends a copied selection within a few minutes. Record time, mistakes, missed controls and confusion; refine until no critical stalls. Testing without real users may be simulated but must NOT be misreported as a real usability study.

## Tradeoff rule
Track performance and regressions BEFORE enabling each P1/P2 feature. A genuinely polished P0/P1 with P2 documented as roadmap is better than a bloated unresponsive interface. Mark every item SHIPPED/FEATURE_FLAGGED/ROADMAP/BLOCKED with evidence, never all PASS by default.
