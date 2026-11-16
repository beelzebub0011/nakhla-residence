# Architectural source of truth — NAKHLA RESIDENCE

Updated 2026-11-12. **Concept only.** All dimensions are design-derived values of an original, fictional concept model. They are not surveyed, not as-built, not checked by a licensed architect or engineer, and not a building-code certification.

## 1. One canonical model

The single source is TypeScript code in `src/domain/` (not a hand-built 3D file):

| File | Holds |
|---|---|
| `tower.ts` | levels, heights, slab, walls, plinth, units, world mapping |
| `plans.ts` | every room as clear-floor rectangles, every opening (door, arch, window, slider, screen, entry), viewpoints |
| `wallgen.ts` | walls are DERIVED as the gaps between rooms (0.12 / 0.24 / 0.30 m) — plans, walls and areas cannot disagree |
| `prims.ts` | shell, interior linings, floors, ceilings, openings, sliders, electrical details, lightmap atlas |
| `furniture.ts`, `pieces.ts`, `fitments.ts`, `amenityPieces.ts`, `modelkit.ts` | every modelled piece and its placement |
| `materials.ts` | finish catalogue, packages, editable surfaces |
| `nav.ts`, `audit.ts` | navigation / collision graph, area ledger |

Everything else is generated from it: the WebGL scene, the 2D Lite plans, collision, the assistant's facts, `project_artifacts/geometry_audit.json/.csv`, `blender/scene_prims.json` + `scene_meshes.bin` (→ `.blend`, `.glb`, Cycles stills) and the baked lightmaps. A change in `plans.ts` propagates to all of them on the next build / `npm test` / bake. Stale derived files are detectable through `ASSET_MANIFEST.json` (content hashes).

## 2. Coordinates

- Plan metres: **x east, y north, origin at the south-west corner of the 18 × 24 m footprint**; z up from each level's finished floor level (FFL).
- Three.js (Y-up): `X = x − 9`, `Y = FFL + z`, `Z = 12 − y` (`toWorldX`, `toWorldZ` in `tower.ts`).
- Blender (Z-up): `X = x − 9`, `Y = y − 12`, `Z = FFL + z` (`blender/build_nakhla.py`).
- Datum: road surface = 0; plot / pavements +0.15 m; ground-floor FFL +0.45 m (plinth). Conceptual north = +y. No real coordinates or orientation are claimed.

## 3. Levels (12 occupied; the roof plant enclosure is NOT a level)

| Level | Use | FFL (m) | Floor-to-floor | Clear height |
|---|---|---|---|---|
| G | lobby, reception, security, management, mail, services | 0.45 | 4.6 | 4.0 |
| 01–09 | residential, 2 apartments each (A south, B north) | 5.05 → 32.25 | 3.4 | 2.8 |
| 10 | wellness: gym, pool, spa + sauna, changing, lounge | 35.65 | 4.8 | 4.1 |
| 11 | dining: restaurant, café, kitchen, panoramic terrace, conditional shisha terrace | 40.45 | 4.2 | 3.5 |
| roof | unoccupied plant enclosure, lift overrun, pergola | 44.65 | — | — |

Slab zone 0.30 m below each FFL. Walls: external 0.30, party 0.24, internal 0.12.

## 4. Areas and how each number is defined

| Number | Definition | Value |
|---|---|---|
| Net internal area | sum of the clear-floor rectangles of the apartment's indoor rooms (inner faces of walls) | Type A 124.86 m², Type B 145.02 m² |
| Balcony area | sum of the outdoor room rectangles | Type A 16.64 m², Type B 20.48 m² |
| "≈ 125 / 145 m²" in the interface | the same numbers, labelled concept estimates | — |
| Room dimensions | width × depth of the room's main rectangle, from `audit.ts` | per room |
| Floor plate | 18 × 24 m footprint | 432 m² |

Gross / saleable areas are **not** computed (no wall-share or common-area rules are assumed). The assistant reports these values with their status (measured from the concept model) and never rounds them into something more precise.

## 5. Identifiers (BIM-lite, stable)

`FLOOR_G` … `F11` · `UNIT` `U04A` (floor 04, side A) · `ROOM` `A.living`, `zone.pool` · `OPENING` `A.g.living.S` (unit, kind, room, facade) · `SURFACE` `living.flooring` · `MATERIAL` `MAT_ENGINEERED_OAK` · placed pieces carry a semantic id `F04.A.living.furn.sofa` · lightmap rectangles are attached to the lining / floor / ceiling primitive they belong to.

## 6. Tolerance policy (checked by tests)

| Check | Tolerance | Test |
|---|---|---|
| Room rectangles overlap | 0 (any overlap fails) | `tests/unit/geometry.test.ts` |
| Every opening cuts a wall; every room reachable | exact | `geometry.test.ts`, `nav.test.ts` |
| Unit areas vs. the stated values | ±1 % | `geometry.test.ts` |
| Furniture below the finished floor | 1.5 cm | `tests/unit/model-validation.test.ts` |
| Furniture outside its room | 5 cm indoors, 12 cm outdoors | `model-validation.test.ts` |
| Interpenetration of pieces | 0.005 m³ (intended assemblies whitelisted by rule and listed) | `model-validation.test.ts` |
| Walking body vs walls / furniture | never penetrates | `nav.test.ts` |
| Lightmap rectangles | inside the atlas, no overlaps | `modelkit.test.ts` |

## 7. Assumptions that need professionals

Structure (transfer under the level-10 pool), MEP (the electrical / cooling items shown are concept positions, not a design), fire and means of escape, accessibility, pool loads and waterproofing, the shisha terrace's legality and ventilation, façade engineering, site planning rules. None of these has been reviewed.
