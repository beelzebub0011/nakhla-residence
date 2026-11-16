# V5 — DESIGN STUDIO: PHYSICAL FEEDBACK + HONEST PERSONALIZATION

## Material config remains canonical (P0)
Keep six material categories and 18 options from V4, semantic surface IDs + real PBR updates in visible modeled rooms, inspect/edit/undo/reset, finish package consistency, and representative gallery warning. New V5 must not fork this state or create a second material store. Image gallery is a different fidelity tier; only label 'exact' when a generated frame genuinely matches the chosen variant.

## Style Suggestions / AI Interior Designer (P2 stageable)
Default zero-cost local recommendation engine uses tested constraints and designer-authored presets (Warm Iraqi Luxury, Modern Pearl, Calm Minimal, etc). User enters or chooses a preference; parser supports 4 languages without free-text unsafe exec. Suggestions map only to AVAILABLE catalog materialIds/furnitureIds. The user PREVIEWS and confirms changes; track diffs and undo. Never pretend prompts can generate arbitrary photoreal 3D changes instantly. A true external AI assistant is behind a disabled-by-default feature flag and must not be enabled before approved cost/privacy/security review. Explain the difference visibly in product copy if marketed.

## Furniture Fit + Measurements (P2)
Use measured and verified Blender-authored room meshes with consistent meter scale, door arcs, accessible paths and safe bounding boxes. 2D dimension tape and measurement anchors exported from source geometry; camera-based visual approximation must be marked approximate. Furniture placement: catalogue of 3-5 original/licensed models e.g. sofa, king bed, dining set, rug, table; snap-to-valid floor, rotation, collision, no clipping through wall, keep egress route unobstructed in demo (do not imply code certification). Undo and remove; collision not merely drawing label. Mobile simple variants or furniture swatch placement with no drag needed. Preserve selections across scene unload and export under namespaced state. Do not display fictional store SKU/brand/stock.

## Material/Apartment Compare (P1)
Simple compare starts contextual from unit card or from Finish Studio. For finishes show before/after slider or A/B swatches with synchronized camera, lighting and geometry. No simultaneous full WebGL renderers on low-tier mobile; reuse single scene + snapshot or split stills. Comparing 2 apartments requires two different unit IDs while retaining active unit state (see Smart Property spec). Accessible text table equivalent is mandatory.

## Save/Share/My Apartment (P1)
One accessible 'My Apartment' bottom sheet shows current floor, chosen unit, finish package overrides, gallery consistency notice and conceptual property warning. Local-only default no account. Share state link by compact validated versioned schema: allowlisted catalog IDs, no names, phone, email, raw scripts, tracking or private visitor data; impose strict size limit and degrade when not enough URL budget. QR code optional generated locally from sanitized current URL (nothing uploaded). Do not claim 'saved on server' without backend. Export image or print-to-PDF with working RTL/CKB/CJK glyphs, creator attribution and concept notice. Broken/share unsupported fallback is one-click copy of textual summary and visible explanation.

## Extras
Bookmark camera/view/environment as a single scene view state, not multiple confusing 'save' buttons. Optional 'share design postcard' is generated locally where browser canvas permissions allow; if tainted canvas or GPU unavailable, generate HTML-to-image/2D summary. No visitor input sent to API silently. Never reuse private raw Instagram frames in public postcards.
