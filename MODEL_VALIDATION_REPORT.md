# Model validation report

Updated 2026-11-12. Source: `tests/unit/model-validation.test.ts` → `project_artifacts/model_validation.json`, `tests/unit/geometry.test.ts`, `tests/unit/nav.test.ts`, `tests/unit/modelkit.test.ts`. These are footprint-level checks of a concept model — not clash detection of a construction model.

## Results (levels G, 04 — representative of 01–09 —, 10, 11)

| Level | Pieces checked | Below floor | Outside own room | Unintended overlaps > 0.005 m³ | Intended assemblies (listed) |
|---|---|---|---|---|---|
| G | 20 | 0 | 0 | 0 | 0 |
| 04 | 97 | 0 | 0 | 0 | 12 — dining chairs tucked under tables; objects standing on furniture |
| 10 | 53 | 0 | 0 | 0 (two lanterns touch: 0.001 m³) | 0 |
| 11 | 68 | 0 | 0 | 0 (a table edge brushes a plant: 0.004 m³) | 5 — espresso machine and grinders on the back bar, pastry case on the counter, lanterns on tables |

## Defects the check found and fixed in this round

| Defect | Cause | Fix |
|---|---|---|
| Type B third-bedroom wardrobe ran 1 m into the neighbouring room | placement predates this session | moved to the north wall, clear of the hall door |
| Management-office shelf poked through the wall | wrong origin | moved inside |
| Wellness-lounge armchair stood outside the glazing | wrong rotation | re-placed facing north, coffee table moved |
| Five restaurant tables-for-two were built back to front (table on the far side of the chair) and collided with the middle row | rotation 180° instead of 0° | chair now faces the banquette |
| Pool side tables overlapped the loungers | spacing | moved into the gaps |
| Café tables crossed the café boundary; café armchair overlapped a table | footprint too coarse, layout | real chair-based footprints; armchair moved to the lounge corner |
| Living-room armchair overlapped the media wall; side table overlapped the armchair | layout | moved |
| Smaller contacts: plants vs sofas / consoles / planters, nightstands vs beds, ottoman vs wardrobe, terrace loungers vs planter, lantern vs sofa | layout | each moved by a few centimetres |

## Also verified

- Every room is reachable through real openings; the walking body never penetrates walls or furniture (`nav.test.ts`).
- Unit areas match the stated values within 1 % (`geometry.test.ts`).
- All modelled meshes are finite with unit normals; furniture sizes fall in real ranges (chair seat 0.42–0.6 m wide, 0.78–0.95 m high; WC depth 0.5–0.62 m; kitchen run 0.6–0.68 m deep) (`modelkit.test.ts`).
- Lightmap rectangles cover every wall, floor and ceiling without overlaps (`modelkit.test.ts`).

## Not checked

Floating objects that hang from ceilings or walls are excluded by design (pendants, downlights, art, mirrors, switches). Door-swing and slider-travel clearances are only partly checked (slider leaves avoid the camera path; door leaves are drawn open). Accessibility clearances (wheelchair turning circles) are not checked. Levels 01–03 and 05–09 share level 04's model (identical by design).
