# V5 — FIND THE RIGHT APARTMENT, NOT JUST A NICE PICTURE

## Smart Apartment Finder (P1, rule-based, offline demo)
Open from Explore as contextual drawer. Show optional minimal controls: bedrooms (2/3), level preference (low/mid/high/any), target area band (concept approx), sun aspect/view preference (only known/illustrative orientation), and quiet-vs-amenity proximity (only geometry-grounded). Max 2 questions at a time; optional skip; no signup. Avoid asking incomes, protected traits, real names, health or other sensitive attributes. For current concept: 9 residential floors with Type A approx 125m² and Type B approx 145m². Deterministic, explainable ranking; label 'Match suggestion, not verified availability'. Weights are configurable and visible to developer; do not fabricate availability, direction, actual pricing or exact views. Output up to 3 cards, each with 'Why this match', a Select in 3D button and Compare checkbox. Empty state offers useful reset.

## Two-Apartment Compare (P1)
Only two units at a time. Stable comparison fields: floor, unit type, approximate area, bedroom/bath count, concept balcony, finish package, selected environmental preview, illustrative daylight and view. Highlight actual differences, not decorative checkmarks. Never compare fictional prices to imply real sale. Works fully in 2D Lite. Horizontal split cards on desktop; stacked scroll + sticky labels on mobile; RTL and Chinese overflow tested. Persist unit A as active until user explicitly selects another unit. Accessible toggle to close comparison.

## Sun & View Lens (P1 illustrative; accurate research-grade calculations P2)
- Daylight slider + season selector attach to current apartment view and shadow-casting scene. Compute sun direction from date/time and **verified** place coordinates/north orientation only when actually known; otherwise mark 'illustrative sunlight simulation'. No claim exact hours of sunlight, thermal comfort, cooling loads or UV rating.
- Floor-to-View reveal: choose balcony/window, display elevation-dependent camera framing, Basra-inspired sky and urban context. Unless verified survey/panorama and license available, prominently label 'Conceptual view — not a real view from a property'. Never imply guaranteed river view.
- Weather: existing seasonal controls should adapt sky, ambient light and glass appropriately, not heavy rain effects in indoor pool or on all low-power devices. Sun shading compare may toggle between morning/evening and summer/winter in a compact sheet.
- Provide reset, pause, skip and 2D static comparison even without WebGL.
- Sun path coordinates must be in ONE canonical right-handed world system aligned to known north and floor geometry; tests catch mirrored RTL changes (RTL must NEVER mirror 3D north).

## Architectural X-Ray Pro (P2 optional)
Must show real modeled layer/cutaway/section, no phantom plumbing or MEP; preserve camera/selection when toggling. On phone show elegant selective opacity/static cutaway if translucent 3D costs too much. Show low/high detail details through progressive load. An Architect Tools contextual action, not global navigation. If engineering input absent, label illustrative building anatomy not BIM.

## Zero-trust factual copy
All factual metrics from approved source-backed unit catalog only. If no exact site, view or solar study, use concept labels in all locales, share/export and screenshots. Materials and measurements should never be interpreted as purchasing specs until verified.
