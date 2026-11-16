# V5 — PRODUCT INFORMATION ARCHITECTURE: MAKE POWER FEEL SIMPLE

## Product principle
A first-time Iraqi buyer, older adult, investor, salesperson and foreign visitor must all understand what to do within seconds. Aim for "one primary next action at a time". Visual richness should sit in the scene, not the control density. Do not invent sections for every feature; instead use exactly four user-facing top-level sections, a gentle introductory hero, one persistent summary action, and contextual overlays. Arabic first, same level of product completeness in English, Sorani Kurdish and Simplified Chinese.

## Four user-facing sections (fixed)
### SECTION 1: استكشف | Explore
Role: location/building/floor/unit orientation and decision. Starts at immediate interactive hero; never mandatory intro or popup. Show 12-level tower, selectable floor bands, accessible floor list, selected floor label, simple two-unit cards for residential floors, and truthful amenity zone labels on F10/F11. "Find my apartment" opens a SHORT drawer/wizard; show up to 3 matches first. "Compare" appears only after a unit is selected or marked. "Sun & View" appears beside the selected floor/unit/balcony, not a global mode. Optional X-Ray in More tools. The same IDs and geometry across exterior, section view, plan and rendered room. Floor F10 wellness and F11 dining NEVER contain apartments. No invented availability or sales price.

### SECTION 2: تجوّل | Tour
Role: experience the selected apartment/room and move without discomfort. Starting default is a safe stable room camera; tapping hotspots or room chips transports user predictably. One simple control 'طريقة الجولة / Tour style' opens FOUR original supported camera modes (Cinematic, Guided, Free Walk, Property Explorer) with concise 1-line descriptions and supported device info. This is a subordinate selector, NOT four extra permanent tabs. Change modes without teleport surprise, invalid camera anchor, renderer reinit or losing selection. Cinematic is opt-in; cancel/skip/pause; no autoplay sound. Free Walk uses collision, capped acceleration, no roll, gentle turn, stop/restore, safe floor/room transitions, touch tap-to-move alternative and reset orientation. 'A Day in Nakhla' is ONE optional story tile/chapter carousel inside Tour; never forced. Room-specific 'Measure/Furnish' tool only if coordinate accuracy confirmed; otherwise clearly conceptual visual fit.

### SECTION 3: صمّم | Design
Role: understand and customize REAL material bindings on the current scene. Step 1 choose area (floor/wall/cabinet/etc) by object click or accessible list; step 2 view actual material details and 2–4 relevant choices; step 3 apply with reversible undo and instant visible 3D update; step 4 compare before/after and save. Put AI-style suggestions under 'اقتراح تنسيق / Style suggestions', deterministic on-device presets first and never imply generative AI ran without API. No uncontrolled 'design anything' button or impossible images. Share and PDF summary in one consistent 'شقتي / My Apartment' drawer, not another tab. All gallery images explicitly explain whether they correspond to current selections.

### SECTION 4: المرافق | Amenities
Role: discover F10 (pool, gym, spa/sauna) and F11 (café, restaurant, outdoor optional separate shisha and panoramic terrace). Have concise illustrated tiles and 'Visit in 3D' only for modeled scenes; 2D high-fidelity alternatives otherwise. A contextual quick route to the amenity floor. Safety/engineering caveats for elevated pool; no shisha regulatory claims. 'See day-in-life' link can invoke curated chapters on those amenity scenes.

## Persistent chrome (small, consistent)
- Elegant brand + main four-tab navigation desktop; on mobile bottom four-icon/label navigation with safe-area spacing and clear icon captions, not 8-item hamburger.
- Breadcrumb 'Building > F04 > Unit A > Living' with Back and Home; state invalidation guarded for F10/F11.
- A small 'My Apartment' summary/bookmark with count and CTA, plus ability to visit About Creator/Contact.
- Single compact utility menu for Language, Sound (OFF until explicit user click, reset on EACH hard page load), Help, Accessibility/Reduce Motion, Quality Lite, Credits and About.
- A compact environment/time control is shown only on selected viewpoints or scene contexts; advanced weather/season presets in its own collapsible panel; never float five panels on mobile.
- Only one active side panel; Escape/back key closes it before navigating away. Mobile bottom sheet and safe-area. Dismissible overlays never cover critical navigation or trap focus.

## Reveal rules and state
- Start without login wall, forced video, autoplay or modal; first meaningful render shows architectural preview and actionable Explore even before 3D loads.
- At first visit, one tiny nonblocking 2-step hint max; Help accessible thereafter, never repeated intrusive tours.
- Progressive disclosure: primary action (one); secondary affordances max 2; advanced actions via 'More'. Hide unsupported or inaccurate capabilities, show clear explanation instead of disabled dead buttons.
- Persistence across section switching: locale, selected floor/unit/room, camera bookmark where compatible, material overrides, environment and choices. Preserve sound mute. When switching to F10/F11, retain 'last residential unit' separately without assigning apartments to amenities. Do not erase selections on Section back.
- Navigation can be interrupted; tap of new floor cancels old camera tween and stale loading request. No unresponsive scroll, scroll-jacking or forced animation waiting.
- Touch targets >=44 CSS px ideally (minimum hitboxes), accessible focus, text zoom, RTL-aware order and icon direction, dynamic type, screen-reader equivalents, reduced motion and 2D alternative parity.
- Four tabs labeled in ALL FOUR locale dictionaries, not flag emoji. No silent untranslated copy on new panels.
- Preserve human choice: environment sim, cinematic, presentation, AI tools are opt-in and reversible.

## Example zero-confusion flow (buyer)
1. Open link; see name, clear visual and 'استكشف'.
2. Tap floor 04 -> Unit A. See approximate area, bedrooms and 'ادخل للشقة'.
3. Go to Tour and tap Living; stable camera, obvious room map/back.
4. Go Design; tap floor, compare two samples, save.
5. Open My Apartment, see specs/render mismatch caveat, Share / Export / Contact Creator.
6. Can visit Amenities and back; selections retained.

## Visual quality constraints
Premium Modern Iraqi Luxury = refined warm ivory, bronze, charcoal; generous whitespace, fewer heavier clear typography, bespoke original architectural assets, consistent microcopy, one tasteful 200–400 ms transition where measured comfortable, no 8-layer parallax. Avoid excessive heavy DOM blur, infinite scroll effects, flashing/glowing floor labels, unreadable tiny secondary text. High performance under modest Iraqi network beats theatrical intro.
