# UX and interactive journey specification

## Universal rules
Treat the experience as a stateful spatial product rather than 7 unrelated marketing pages. Route/state graph is explicit, URL-shareable where safe, keyboard and touch accessible, deep-linkable to project/floor/unit/room/material package. Transitions never erase selections. All interaction affordances must communicate actionable status. Provide skip animation, reduced motion, reset navigation, back, breadcrumbs, loading and recoverable errors.

## Screen 01: Cinematic entrance
- Intro logo/project name "NAKHLA RESIDENCE | نخلة ريزيدنس", Basra-inspired fiction disclosure. Reveal structure/massing progressively with 3D camera, sky and material lighting; restrained filmic typography, optional mute-controlled original ambient score.
- CTAs: Explore Tower, Take Guided Tour, Skip Intro, language toggle, Sound On/Off. Every button must perform expected state change. Desktop CTA and mobile CTA accessible without waiting for video.
- No fixed blocking 10s intro. Can enter instantly on click; respect reduced motion; first meaningful paint remains fast; poster fallback until GLB ready.

## Screen 02: Exterior Building Explorer
- Animated orbit and drag orbit, constrained pan/zoom, 10? NO: 12 occupied levels, G + 01–11; floor selectors all appear including F10 and F11 special-use.
- Hover floor: semi-transparent warm highlight via semantic mesh floor segment or accurate raycast; descriptive label; no z-fighting. Click floor: persistent selection, floor metadata summary, button Explore Floor. Selection via dropdown/keyboard and accessible list. Highlight changes on touch selection and keyboard focus.
- Camera bookmarks: front/side/back/aerial, Reset View, Day/Night, Building X-Ray, cinematic guide start, orientation compass/scale where useful. X-Ray must truthfully reveal modelled interiors; unmodelled rooms clearly represented with simplified accurate volumes, not fake furnished detailed rooms.
- Loading on demand; mobile fallback floor selector works even without WebGL.

## Screen 03: Floor/Unit Explorer
- Click selected residential floor -> gentle extraction or cutaway of actual floor slab. No visual interpenetration or exploding through the occupied floor; stable lighting/exposure. Display core (lift, stairs, corridor), A and B as selectable boundary meshes.
- Unit data: identifier 04A etc, concept floor area 125/145m², 2/3 beds, baths (from data), balcony, conceptual availability status and no fictional purchase prices without demo label. Show north arrow, room labels, floorplate clipping and accessible 2D fallback.
- Hover unit outlines selected apartment polygon; click transitions to isometric dollhouse with same walls, openings and doors. Restore camera if navigating back; breadcrumb Tower > Floor 04 > Unit 04A > Living Room.
- For F10 show amenity zone map with pool/gym/sauna/changing/wellness lounge. For F11 restaurant/cafe/shisha terrace (if conditionally supported); never show two apartments on amenity levels.

## Screen 04: Apartment Dollhouse and Interior
- Isometric cutaway roof removed; room contours semantic; click each room to interpolate to interior camera anchor with collision constraints and no teleport nausea. Real geometry (walls, windows, furniture and light), not image mistaken for full 3D.
- Rooms in initial hero Type A: living/dining, kitchen, master bedroom, bathroom and balcony; secondary bedroom and other rooms represented spatially and selectable with honest reduced-detail render if not polished.
- Modes: guided room hotspot navigation, orbit/inspect, 360 look, camera presets, optional free-walk only if performant and bounded; interactive furniture toggle if realistic; 2D plan mini-map. Avoid interiors facing blank walls or clipping through ceilings.
- Selection markers only on supported material slots; outline at object level with visible text description.

## Screen 05: Material Studio
- A selected surface brings contextual side panel, accessible labels and material information: brand/type/origin/size/finish/performance/spec sheet ONLY if verified; fictional placeholder otherwise "Concept / sample / manufacturer TBD".
- 6 categories in version one: flooring, wall paint, wood finish, kitchen cabinet, countertop, bathroom tile. Three options per category, at minimum 18 sample SKUs in seed. Not all categories applied to every room.
- Direct 3D changes affect corresponding object material/UV/roughness in all accessible views; avoid modifying the entire building by shared material reference accidentally. Persist design choices per unit+room/surface; package presets Standard/Premium/Luxury may be suggested, with clear fictional pricing/no authoritative material costs. Allow Undo/Redo, Reset to Base, compare A/B and Before/After consistent viewpoint, accessible save and share.
- Material selectors show true samples plus warnings on unsuitable material uses (e.g. wet-area slip resistance, outdoor weather), no speculative certified properties. Prevent prohibited combinations and explain why.

## Screen 06: Photorealistic Gallery
- Responsive slider, keyboard left/right (respect RTL semantics), thumbnails, fullscreen, touch swipe, alt text, zoom/pan carefully, no layout jump. All images legitimate self-made renders/licensed. Include exterior (day/night), double-height lobby, main living, kitchen, bedroom, bathroom, balcony, gym, pool and restaurant.
- Images correspond to pre-rendered finish packages; if user customized beyond preset, label "Representative rendering – selected live 3D materials may differ", or render genuine snapshot from current WebGL scene with accurate settings. Never silently show wrong materials as selected final image.

## Screen 07: Saved Apartment and Inquiry
- View selected floor/unit/rooms, materials by category+surface, IDs, display available verified spec metadata, chosen aesthetic package, daytime image, safe amount placeholders as labeled.
- Save locally with a clear notification; privacy-first with opt-in storage, no secrets, robust reset and share URL size controls. Generate client-side PDF or printable HTML using user-selected details with fiction/disclaimer and original imagery. Contact/quote form must validate name/contact/country code and consent before submission; without backend, present "Demo only: request saved locally, not sent". Never display success saying company was contacted when no integration exists.
- Conversion calls: Request Quote, Schedule Viewing (demo), Download Finish Board, Share Unit, Contact Sales (demo channel disclaimer). No payment flow.

## Guided presentation mode
- 90–150 second optional narrative without an assumed literal duration: brand -> wide tower -> floor highlight -> cutaway -> hero unit -> living room -> live material swap -> wellness -> restaurant -> saved selection. User can pause, skip, jump, mute. All animations deterministic and capture-friendly for sales demos.
- Provide autoplay only after explicit Start Tour, never hijack scrolling. Each shot has reason, camera path, composition, text and fallback.

## Cross-cutting interaction matrix
- Mouse, touch, keyboard, screenreader-supported alternative list. Visible focus styles, contrast, aria-live only where necessary.
- Localization: Iraqi-friendly Modern Standard Arabic copy; locale-aware number formatting, correct RTL layout and arrows, English full translation. Do not embed Arabic text into textures; HTML text overlays remain accessible and responsive.
- Responsive: desktop side-panel, tablet sheets, mobile bottom drawer; touch target ≥44px as target, no hover-only access. Support portrait/landscape orientation.
- Loading: skeleton with poster / progress meter for external GLB/texture load; progressive reveal; retry; timeout; 2D fallback if WebGL unavailable. No fake progress percentages.
- Errors: missing asset/failed GPU shader/connection loss/back navigation/broken deep link/reduced motion. Every mode can escape to a functioning page.


## V3 four-mode UX override
Modes are 1 Cinematic (optional, skip, pause), 2 Guided hotspot, 3 Free Walk actual collidable geometry, 4 Property Explorer real estate reel workflow. Lite/2D fallback. Camera comfort, input focus, deep link, accessibility and shared state in `specs/EXPLORATION_CAMERA_MODES_V3.md`. No unsupported claims of walking through unmodeled interiors. Implement refined design system before release.
