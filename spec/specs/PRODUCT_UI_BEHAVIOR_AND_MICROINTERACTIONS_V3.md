# V3 — INTERACTION POLISH, NAVIGATION, USER ERROR RECOVERY

## Universal UX quality principles
Every meaningful visual element should have a role; every icon should be comprehensible; every hover state needs equivalent tap/focus state. Have clearly visible interactive hotspots without visual clutter. Enforce minimum reliable clickable area, debounced click/drag differentiation, undoable decisions, no repeated onboarding after preference saved, no forced signups, no meaningless animations. Every view and state (idle, selected, loading, success, partial error, offline, 2D fallback, empty, disabled) must have designed copy and visual treatment in BOTH languages.

## Recommended information architecture
Primary rail: Explore, Units, Amenities, My Design, About Creator; secondary in a compact scene toolbar: mode, camera, time/weather/seasons, quality, sound, help. On phone use 4 obvious action categories in bottom nav or compact sheet; never expose 14 tiny floating icons. Area selection data controls next to scene, not sprayed on canvas. Offer contextual action prompts once only (first interaction) and concise instructions on tap.

## One-handed phone detail
Support 320px through wide phones, dynamic browser address bars, iOS safe area, Android gestures, tablet split view, full-screen keyboard and landscape; do not make essential functions depend on hover, double-click, right-click, shift or mouse wheel. Panel/drawer can collapse to restore space. Zoom/drag do not interfere with browser back/swipe from screen edges. Tap-to-teleport hotspots sized for fingers and visible on low contrast scenes. Directly verify scroll restoration and device rotation.

## Motion design contract
Define animation families: intro reveal, floor focus, cutaway, room enter, materials, drawer, gallery, environmental transition. Set duration ranges and easing curve presets, automatically reduce duration/distance on mobile low tier and when reduced-motion. Never run decorative continuous loops when idle. Prefer one meaningful animation per major interaction; layered animations must share a timeline and cancel gracefully. Maintain sub-100ms-to-feedback for click/tap where possible and avoid stalled click results. Visible progress states should reflect real asset loading.

## Original decorative effects, with performance lock
Soft shadow/highlight on floor selection, selective depth of field only on pre-rendered cinematic shots or capable GPUs, bronze rim lighting in hero, subtle responsive blurred panel background, atmospheric haze outdoor only (not indoor fog), gentle mask reveal between cutaway and room. Optional camera dust motes ONLY with a tested effect budget and never in material closeups; never sacrifice FPS for shiny effects. Provide clean switch-off.

## Material configurator UX
On selection show material preview, verified or demo-only specification, origin/manufacturer status, applicability, cost difference only if supplied. Display swatches with names not just colors, same-camera before/after comparison, undo history, reset confirmation for destructive bulk changes. Include quick sample export and saved design feedback. If a texture cannot load, keep earlier material, explain failure, permit retry. All weather/time/mode changes preserve materials. If a product image does not match exact selected finish label as representative.

## Environment UX
Time slider 00:00–23:59 (or intentional stepped intervals), dawn/day/golden hour/night presets, season pills Spring/Summer/Autumn/Winter, weather selector Clear/Partly Cloudy/Overcast/Rain/Dust/Wind with plausible environmental implementation and safe indoor effects. Weather changes have independent optional effect intensity control or auto quality scaling, no camera reset; sun-angle precision never claimed without correct geolocation/site orientation. Screenshots and reports mark 'simulated atmosphere'. Use smooth subtle color temperature/exposure interpolation rather than flashing.

## Menus and trust
Make contact options available on landing and final summary; distinguish REAL CREATOR inquiry from FICTIONAL PROPERTY inquiry. Display true creator phone/email with click-to-call/mailto (WhatsApp optional click only, no unsolicited send). Footer legal and source rights clear. Provide accessible About page with creative credits and fictional project notice. No auto-collecting buyer personal data, no misleading 'booked' success without backend. Any actual inquiry backend requires clear consent and basic abuse controls. Configure SEO/OG without using someone else's logo/brand.

## Required visual QA routines
Inspect and screenshot all screen types at 320, 360, 390, 768, 1024, 1366, 1920, and 2560 widths where possible plus landscape variants; Arabic 200% zoom; keyboard focus; buttons truncation; overdraw; safe areas; tooltip positioning; screenreader; reduced motion; tab-switch pause; material loading error. Don't just run page-level tests, click the real controls and examine actual output. Patch until no known P0/P1 failure. Document untested combinations.
