# Interactive materials + finish package specification

## Core data and semantics
Materials are a normalized domain: catalog item, supplier metadata (verified vs fictional), swatches, PBR map URLs, physical use restrictions, version/date, area/units, provenance/license, description bilingual, pricing (optional/unknown), and BIM/material Passport-style exported note. Each editable surface in a scene has a stable unique ID and allowed category. Available materials are filtered by approved application (e.g. moisture/slip exposure). The scene's base option must be explicit and restored on reset.

## Six v1 categories, 3 variants each (18 minimum)
1. Flooring: warm ivory porcelain tile matte, pearl marble-look porcelain (label imitation, not real marble), engineered oak (dry living areas only); wet/outdoor restrictions explicit.
2. Wall paint: warm cream, pearl soft grey, muted sage; distinct roughness and surface finish, trim coordination.
3. Wood panels/finishes: natural oak veneer-look, medium walnut veneer-look, dark walnut veneer-look. Avoid inventing FSC certification or real supplier.
4. Kitchen cabinet fronts: matte ivory, warm walnut veneer-look, charcoal matte; appliance/handle colors remain coherent.
5. Countertops: white quartz-like engineered stone, dark granite-look, ivory marble-look; distinguish look from real mineral composition; avoid false durability or certification claims.
6. Bathroom tiles: warm stone-look grip finish, satin grey porcelain, white marble-look porcelain; explicit floor/wall eligibility in sample database.

## Context interactions
- Hover/focus on eligible mesh displays small outlined highlight+name. Click/Enter selects surface and opens inspector with data and current sample. Avoid blanket highlighting noneditable objects. Selected material persists when switching view, unit, language or day/night.
- Alternative selector includes thumbnail, label, optional manufacturer/spec details if verified, application safety notes, and 3D live preview. Hover preview optional and reversible, click commits selection. Show real physical UV scale and proper normal/roughness updates, not just mesh tint.
- Live material swap must have undo, redo, reset one surface, reset room, reset unit, package preset, compare, save, export. With dozens of surfaces, use batching; avoid excessive React rerenders and expensive shader recompiles.
- Package selection updates multiple scoped slots atomically, preserving possibility to override individual selections. UI announces overridden material differences; no surprises.
- Material names and specs show demonstration labels unless actually sourced, never use arbitrary invented brand, country of origin, slip rating, fire class, warranty or price as facts.
- A/B compare uses stable same viewpoint, same time-of-day and exposure, draggable wipe or side-by-side; accessible non-drag toggle. Screenshot export must include visible statement "3D visual concept / materials are illustrative".

## Technical architecture
Store catalog separate from scene file; IDs unify Three mesh userData.surfaceId and backend record keys. Use reducer/store commands rather than ephemeral component local state; state shape (project, floor, unit, room, selected surface, package, surfaceOverrides, history, comparison, locale). Serialize a small versioned share payload; validate ID allowlist and bounds, never blindly deserialize client data. Material clones/scoped assignments avoid changing surfaces in every apartment because shared GLB material mutated by reference.
- Distinguish per-room material applied to wall vs floor via surface classes. Expose excluded choices disabled with explanatory reasons.
- Material quality: correct color spaces (color albedo sRGB, normal/roughness non-color), tiling coordinates and real tile widths where possible, visible grout scale, credible edge textures; texture normal map gamma not corrupted.
- Texture loading and caching: preload 3 starter swatches; lazily load other variants, show pending indicator, keep old material if load fails, allow retry. Reuse decoded textures carefully and release on scene disposal.

## Material passport/export
Unit A Floor 04, design timestamp and demo disclaimer, full scene selections by ID, supplier metadata status, included/excluded room surfaces, conceptual image preview, alternatives and optional budget placeholders. Layout Arabic RTL and English, clickable room/material index. PDF generated locally if library exists or print-to-PDF fallback. Do not claim it is a legal warranty, bill of materials or purchase agreement.

## Failure cases
Re-render a room and ensure material persists; undo after changing package; refresh and restore (opt-in); entering unavailable unit; corrupted shared URL; undefined catalog ID; mesh missing surface mapping; failed texture; switching day/night; language toggle; mobile gestures while material pane is open; user returning to gallery after custom mix. Each must have deterministic behavior and/or honest fallback.
