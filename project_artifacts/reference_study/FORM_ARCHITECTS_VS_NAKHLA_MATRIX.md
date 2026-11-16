# Form Architects vs NAKHLA — four-way matrix (V11.4, after Phase B)

**Boards** are private and git-ignored, in `project_artifacts/reference_study/comparisons/FA_FOURWAY_*.jpg`. Each has four labelled columns:
- **A:** Form Architects reel frame (third-party, private).
- **B:** NAKHLA Blender Cycles.
- **C:** NAKHLA live WebGL website.
- **D:** NAKHLA photo website (a real browser screenshot).

**How they were made:**
- Columns B–D were captured after the Phase B changes. The tools are `tools/parity_shots.mjs`, `tools/fa_capture.mjs` and `tools/fa_boards.py`.
- The designs differ (their slab towers and hotel vs NAKHLA's 12-storey tower), so the comparison is about **craft**: light, density, atmosphere and presentation, not pixel alignment.

## Rubric

Each category is scored 0–5. The weights put exterior and environment highest:
- composition 10 %
- background to the horizon 15 %
- realism 15 %
- light, shadow and contact 15 %
- materials and reflections 10 %
- life and motion 15 %
- atmosphere 10 %
- presentation and UI 5 %
- smoothness 5 %

The scores are qualitative design reviews by the same reviewer (Claude), not measurements, and are **not owner-approved**.

## Scores (weighted total out of 5)

| Board | A reference | B Cycles | C live WebGL | D photo site | Biggest remaining gap |
|---|---|---|---|---|---|
| `aerial_day` (FA01 7 s vs `exterior_day`) | 4.3 | 3.7 | 3.3 | 3.7 | Reference: a park and a continuous canopy round the towers. NAKHLA: inner blocks are tightly packed, so canopy shows mostly at the edges; context façades are still one texture per tone |
| `night` (FA03 8 s vs `exterior_night`) | 4.2 | 3.8 | 3.4 | 3.8 | Reference is at eye level, with wet reflective paving and uplit trees. NAKHLA's night aerial now has warm windows, lit avenues and uplit street trees; live is cooler and flatter (no bloom, simpler window glow) |
| `street_golden` (FA02 15 s vs `street_arrival`) | 4.4 | 3.6 | 3.2 | 3.6 | Reference: backlit sun, glare and haze, people on benches, hex pavers. NAKHLA now uses 18:35 (warm light on the façades, was 18:00), but there is no sun in frame, no people, and the dust haze is weak |
| `aerial_dusk` (FA11 3 s vs `exterior_dusk`) | 4.2 | 3.9 | 3.3 | 3.9 | Reference: many parked cars in the forecourt and lit planted squares. NAKHLA dusk now has tree-lined, lit avenues; the forecourt has few cars |

**Change since V11.3:**
- Cycles and the photo site: +0.2–0.3 on the aerials, from street trees, district cars, uplights and the earlier façade kit.
- Live: +0.1.
- Street at golden hour: +0.1–0.2 (time of day).

## Gap log (actionable)

| # | Gap | Avoidable or a real-time limit? | Remedy | Mode |
|---|---|---|---|---|
| G1 | Canopy between the inner blocks | avoidable (layout) | Widen two inner-ring gaps into planted lanes; the yard tree budget is already in place | both |
| G2 | One window texture per façade tone | avoidable | **DONE (D19):** 4 window kinds per façade, AC units, curtains, warm/cool lit windows in `texgen.ts` | both |
| G3 | No people | avoidable, owner-gated (D12) | CC0 people when approved | both |
| G4 | Live night lacks glow and bloom; window glow is uniform | partly a real-time limit (no bloom by choice, for frame stability) | **DONE (D19):** glow pools in front of lit shopfronts; warm/cool lit windows; crown lantern | live |
| G5 | Golden-hour street: no sun glare or haze | Cycles: avoidable (camera heading and sun in frame); live: lens flare is cheap | **DONE (D19):** `street_golden_sun` low aerial into the sun, with glare and dust haze | Cycles first |
| G6 | Forecourt and street car density near the tower | avoidable | **DONE (D19):** 24 more parked cars near the tower | both |
| G7 | Unit-by-type colour view on the tower (FA09) | — | The pricing sheet already moves the camera to the unit; a colour-by-type overlay is a later option | live |

## Mapping: reference shot → NAKHLA scene

| Reference | NAKHLA scene | Status |
|---|---|---|
| FA01 7 s masterplan aerial | `exterior_day` | compared |
| FA03 7.7 s night eye level | `street_entrance_night` (eye level), compared against `exterior_night` here | partial; an eye-level night board is next |
| FA02 15.1 s golden street | `street_arrival` | compared |
| FA11 3.1 s forecourt / gardens | `exterior_dusk` | compared |
| FA06 restaurant ceiling | `restaurant_evening` | not compared yet (interior Phase) |
| FA07 suite glass wall | `living` | not compared yet (issue #4) |
