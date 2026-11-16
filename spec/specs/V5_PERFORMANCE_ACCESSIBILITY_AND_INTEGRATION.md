# V5 — INTEGRATION, RELIABILITY, INTERACTION AND PERFORMANCE HARD GATES

## Architecture: one scene, one truth, one navigation owner
- V3 `explorationMode` remains single source of camera controller ownership, NOT top-level Section. New `activeSection` UI state is 'explore','tour','design','amenities' only. `viewMode` is a visual composition descriptor, not another controller. `activeTool` is contextual overlay enum, not navigation mode. Never introduce a second global animation RAF or camera ownership state.
- Store core domain selection in one typed canonical state: selectedFloorId/unitId/roomId, apartmentCompareIds max length 2, gallery/preset, finishOverrides and history, camera bookmarks, environment, locale, sound, and new section/tool; preserve verified scene state across transitions.
- Device quality auto mode uses measured stable FPS, thermal/battery heuristics where supported, not guessed GPU capabilities. Lite fallback retains sections, plans, compare, material metadata, localized contact and exports. Optional weather/time/sun effects degrade before interaction, not after.
- Long-running renderer scenes and asset downloads must be cancellable. Lazy load section-specific assets. Keep one WebGL renderer; free memory after leaving amenity scenes where safe. No eager download of all apartments, 3D furniture and cinematic videos. Texture atlases/LOD/instancing/compressed glTF as appropriate after evidence, not blindly.
- Share/QR and PDF generation should not add heavy startup JS. Use dynamic imports and a 2D safe fallback. AI API is DISABLED BY DEFAULT.
- No P0 navigation dead ends, GPU crash blank page, stuck camera on mobile, unbounded audio, shader compilation freeze, focus trap or state-loss on mode/locale changes.

## User path and mental load
- First visit: optional hero; click 'Explore' within one screen; four section labels visible. Context menu not more than 3 meaningful quick choices at once; additional options in named collapsible sheets. Hide advanced tooling from first-time user until selected floor/room. Avoid multi-modal pop-ups on mobile.
- Maintain same position when section changes, except intentional room transition; show breadcrumb and one-tap Return/Reset Camera. Overlays have dedicated X, keyboard Esc, swipe close mobile, preserved orientation when closing. Avoid overwriting user-chosen camera when someone starts guided tour after exploring; explicit prompts only.
- Avoid spinner storms with image skeleton/loading steps and meaningful fallback; do not make user wait for full scene to read specs or change languages.
- Do not autoplay audio or camera tour; audio always OFF on hard page load, even if previously enabled. Restore audio from opt-in only within same page session, never from persisted state. Demo environment simulated by default and labelled accordingly.

## Visual integrity
- Four locales complete, context-aware copy and proofreading sign-offs; aria names and generated exports included. Arabic and Sorani RTL, English and Simplified Chinese LTR; do not flip real-world compass and scene normals with RTL. Mixed email/phone remain readable and callable.
- Keep warm limestone/bronze understated design, clear hierarchy, consistent spacing grid, text tokens responsive, tactile hover/focus/pressed, high contrast and minimum 44px target. Finite micro-animations: typically 180–350ms with easy ease-out and reduced motion alternative. No scrolljacking, heavy backdrop filter layers, particle storms or aggressive camera accelerations.
- Personal data never in share token by default; creator contact on footer, About and project PDF only (explicitly provided), not as an invented real-estate agency. No silent transmission from visitors.

## Measurable technical gate
Reapply original performance matrix V2 + E2E tests after V5. Profile mid-range Android, recent iOS, iPadOS/tablet, modest Windows PC, and no-WebGL Lite as available with browser/device evidence. Check mobile 320/360/390/768px, desktop 1024/1440px, landscape, touch keyboard, 200% zoom, low-end GPU, data saver, simulated slow 4G, repeated mode/locale/weather changes and WebGL context loss. Track JS payload, exterior/interior GLB size, LCP, INP, CLS, median + p95 FPS when rotating/walking, memory trend for repeated tours, browser console errors, degraded state, screenshot and video snapshots. Use baseline and measure before/after the V5 features. If an enhancement pushes measured P0 limits or lacks correct fallback, turn OFF by default and log reason rather than shipping lag.

## Implementation dependency order
P0: four sections + original V4 baseline, navigation state & accessibility. P1: finder + compare + share, illustrative sun/view, day-in-life, sales presentation. P2: furniture measurements, X-Ray Pro, AI style suggestions, FAQ/concierge, configurable white label architecture. These are not additional visible primary sections. Each component has a real test and release gate before enabling. User is authorized to choose aesthetic/implementation details and free vetted skills, but not paid tools, public deployments or contacting companies.
