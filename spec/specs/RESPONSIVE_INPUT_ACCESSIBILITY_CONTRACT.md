# UNIVERSAL RESPONSIVE INTERACTION CONTRACT — PHONE • TABLET • LAPTOP • DESKTOP

## Product promise
One shared site link must be understandable and operable across a broad, explicitly tested device matrix: iPhone Safari, Android Chrome, iPadOS Safari with touch/stylus/trackpad, desktop Chrome/Edge, desktop Safari and Firefox. Older/unsupported 3D browsers get graceful Lite UI. Do NOT claim universal compatibility without real testing; include a compatibility page in final delivery listing verified setups and fallbacks.

## One information architecture, several interaction modes
The complete journey must be possible with: mouse, trackpad, touch, keyboard, accessibility focus and a pure HTML 2D floor list when 3D cannot operate. Hover is visual enhancement, never sole way to learn floor or material information. Semantic DOM elements (buttons/links, aria-labels, visible focus ring, screen-reader text) shadow 3D hotspots and floor meshes. Focus order follows current modal/dialog; when dialog closes focus returns to activating element. No input trap, no absent Escape/Back button. Every nondecorative image has meaningful alt or transcript. Color + shape/label indicates selection; distinguish sold/reserved/demo statuses with text and high contrast.

## Viewport regimes (design with container queries, not fixed brittle breakpoints)
- Extra compact: >=320 CSS px with safe-area left/right and no sideways scroll. This is baseline information usability; low-end may use Lite mode.
- Phones 360/375/390/412/430, portrait and landscape; iOS Safari address-bar collapse/expand, on-screen keyboard, overscroll, notch/dynamic island and home indicator; Android Chrome gesture bar and varied font scales. Test 200% browser text zoom where possible.
- Small tablet 600-820 portrait; iPad 768/834/1024 in landscape; pointer+touch mixed; split view/multitasking resized viewport (not just screen resolution).
- Laptops 1024/1280/1366/1440 with browser zoom 100 and 125%; desktop 1600/1920/2560; high-density/ultrawide without stretched text or tiny buttons.
- Retina devices must NEVER force framebuffer DPR equal physical DPR if that causes lag; CSS pixel UI remains crisp while rendered 3D resolution is adaptive.

## Screen layouts
Mobile: sticky small logo, language and menu; floating 3D controls in safe corners; scene occupies available viewport with unobstructed subject; bottom sheet for floor/unit/room/material options, swipeable sheet but also explicit Open/Close controls; horizontal material swatch scroller; floor list accessible via bottom drawer; light text, large targets, tap-only alternate. Use `100dvh` with tested fallback when appropriate and safe-area insets. When keyboard opens on inquiry form, avoid jumping camera, hiding submit, viewport recenter. Exit and Home always visible.
Tablet: split scene with collapsible left/right drawer based on orientation; touch/pencil target sizing even if desktop-like layout; careful Apple Pencil hover availability not assumed. Compact controls for notch and landscape.
Laptop/Desktop: ample 3D area and persistent side rail for contextual metadata, breadcrumbs and comparators, optional expanded property cards, mouse wheel scoped to canvas only when intentional; page scroll remains usable outside canvas. Hover preview floor and click to select; virtual tour controls documented unobtrusively.
All devices: no tiny 3D-only hit targets. Minimum usable tap targets 44 x 44 CSS px as a target (prefer 48) with spacing so adjacent actions are distinct. Actual geometry hit regions should grow invisibly without mis-picking neighbor floors. Visible button labels matter: avoid icon-only mystery controls; tooltips not required to operate mobile.

## Gesture specification and conflicts
- Single finger on active 3D viewer: orbit/look only after entering dedicated viewer, otherwise page scrolling. Use explicit mode hint and avoid hijacking vertical scroll while reading floor info. Explicit close and gesture tips. Disable pinch page zoom only inside a specific 3D gesture surface if necessary, not globally; accessible browser zoom remains possible.
- Two finger: pinch to zoom within constrained viewer. Two fingers on 2D plan can pan/zoom the plan; do not cause browser window to move unexpectedly.
- Single tap: select object/floor/room; two quick taps are never interpreted as two navigation commands. Deliberate drag vs click threshold avoids accidental room entry.
- Keyboard: arrows, Tab, Enter, Space, Esc/Back, WASD for opt-in walk mode, +/- for zoom where expected; show shortcut help. Prevent WASD from capturing keystrokes while input/textarea or screen reader focus is active.
- Stylus, trackpad, touch+keyboard mixed: detect actual pointer event behavior, not by viewport width alone. Pointer lock is optional Desktop only and requires a clear click; never default or trap.
- If gyro/DeviceOrientation is proposed, make it *optional* with explicit permission and a no-gyro alternative; not required for core experience.

## Spatial UX and accessibility
Every 3D scene also has clear DOM navigation: Building floors -> Units -> Rooms -> Surfaces -> Material choices. All names and prices marked Demo; valid link and explicit AR/EN. Camera motion should be subtle, skippable, and honor `prefers-reduced-motion`. Provide a Persistent 'Reduce Effects / Lite Mode' action accessible by keyboard and touch.
Do not make people dizzy: avoid camera roll, sudden acceleration, rapid orbit, endless spin, surprise zoom/pointer lock. Limit walk speed and motion blur. Add field-of-view defaults 60-75 degrees as starting hypothesis and allow comfort option; adjust to actual interiors. For reduced motion use instant cuts/dissolves and static backdrop in place of scripted flythrough.
Audio disabled by default; accessible mute button if opt-in. Use text and optional caption for audio cues. No flashing light/strobe effects, especially lightning. Sky lightning can be absent; weather uses low-motion lighting, no flicker.
When comparing finishes, the before-after slider must have a keyboard-operable alternative, explicit labels and textual descriptions. Do not show only color swatches; name material and include accessible specification values.

## Localization and typography
Arabic is first-class RTL; English equivalent LTR, with direction controlled per subtree not globally flattening CSS. Numerals/measurements/room IDs/phone format remain legible; avoid bidirectional control abuse. Proper line wrapping for Arabic; variable Latin unit names isolated by bdi-like semantic elements where appropriate. Fonts must be legally usable and loading must not block content. Avoid 10+ font weights. Responsive font sizes with CSS clamp, comfortable line height, contrast and meaningful hierarchy. Long Arabic strings, no truncation of critical settings and prices. Audit: safe area and top-bottom HUD in both languages; all form validation and errors localized.

## User error prevention and recovery
Keep browser Back semantics and custom Back controls coherent; deep link after reload returns the same selected scene if available. Rapid gesture, browser tab hidden, screen rotation and network reconnect never corrupt floor/unit/material selections. Preserve choices during locale switch, weather switch, quality-tier switch and 3D->2D switch. Reset is explicit and offers Undo when destructive. Display quick guided option for first visit, dismissible forever in local demo mode; avoid blocking 12-step onboarding.
Share links should encode stable project/floor/unit/room/finish/weather metadata within reasonable URL size, validate and sanitize query. UI must never silently claim persistent server-side saves if only local storage works. Provide privacy-safe locally stored presets and explicit Clear saved preferences.

## Real test grid and release evidence
Use data/DEVICE_AND_NETWORK_TEST_MATRIX.csv; test at least one real iPhone and Android, iPad or tablet, and a non-gaming laptop if available. Desktop browser emulation alone DOES NOT validate mobile GPU/WebGL, Safari touch or real thermal performance. If devices unavailable mark NOT VERIFIED; still deliver Lite fallback and documented limitations.
Each target viewport: landing title not clipped; tower selectable; floor list usable; room entered; both finish metadata and changing live swatch work; gallery and comparisons function; time/weather/season controls open without overlay obstruction; walk mode is operable or clear teleport alternative shown; back/reset/share/pdf path usable. Screenshot and screen-record samples for portrait/landscape, RTL/LTR and low quality. Use Lighthouse accessibility + axe when feasible; manual keyboard and touch audit obligatory.

## Compatibility acceptance
Release blocking defects: inability to access floor/unit/room on tested phone, overflow hiding essential controls, blank WebGL with no Lite fallback, touch scroll trap, text under status bar, modal behind keyboard, missing keyboard exit, unreadable RTL, and fatal crash after rotation/back navigation. Nonblocking minor animation artifacts must be recorded and prioritized.

Sources: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion ; https://web.dev/articles/vitals .
