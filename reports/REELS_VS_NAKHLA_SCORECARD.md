# Reels vs NAKHLA — scorecard (S22), round 0 (baseline before V11 work)

2026-11-13. An editorial review on the S22 rubric (0 absent … 5 exemplary). It is not a similarity metric.

- **Reference column (A):** the best comparable shot across the owner's reels. Private study only.
- **NAKHLA columns:**
  - B = Cycles stills `project_artifacts/cycles_v3/`
  - C = live WebGL frames `project_artifacts/parity/web/`, commit `24fc1b6`
  - D = photo website: **NOT_AVAILABLE** (does not exist yet)
- **Audio:** the reels were studied muted, so audio is **NOT_ASSESSED**.

## Exterior hero (S22 G1–G4)

| # | Dimension | Ref (A) | Cycles (B) | Live (C) | Evidence / note |
|---|---|---|---|---|---|
| 01 | Form, massing, silhouette | 4–5 | 3 | 3 | NAKHLA massing is coherent (podium, fins, crown) but plain at street level; no strong top or entrance gesture |
| 02 | Façade detail near/far | 4 | 3 | 2 | fins and frames exist; live loses mullion detail at distance |
| 03 | Neighbourhood / street / site edges | 4–5 (REF01/04/07) | 2 | 2 | generated blocks have window textures but flat faces, no shopfronts, no roof clutter at eye level |
| 04 | Vehicles, trees, kerbs, human scale | 4 (REF06) | 1 | 2 | box cars (toy-like); palms only live; no street trees of other species |
| 05 | Sky, haze, palette, weather | 5 (REF03/06 dusk) | 3 | 2 | no blue-hour hero; live sky hazy and cool |
| 06 | Light quality | 5 | 3 | 2 | live exterior low contrast; night reversed vs Cycles (`RENDER_PARITY_REPORT.md`) |
| 07 | Shadows and contact | 4 | 3 | 3 | shadow map covers the tower, not the street; cars have no contact darkening |
| 08 | Glass / metal / water reflections | 5 | 3 | 1 | live glass is plain transparency; no reflective paving |
| 09 | Material detail / texture scale | 4 | 2 | 2 | road and paving are procedural (no aggregate, no joints at eye level) |
| 10 | Geometry integration | 4 | 3 | 3 | no known floating hero objects; cars unchecked at contact |
| 11 | Detail density / art direction | 5 | 2 | 2 | — |
| 12 | Camera framing | 4–5 | 2 | 2 | only 3/4 aerial orbits; **no eye-level street hero** |
| 13 | Motion and life | 4 | — | 3 | smooth director (p95 8.3 ms); no traffic; palms sway |
| 14 | Audio | NOT_ASSESSED | — | — | — |
| 15 | Polish / artifacts | 4 | 3 | 3 | — |
| 16 | Emotional impression | 4–5 | 2 | 2 | subjective |

**Weighted exterior (S22 weights, audio excluded): B ≈ 2.6 · C ≈ 2.3 / 5.** References ≈ 4.4.

## Interiors and amenities (S22 G6–G8)

| Scene | Ref | B | C | Note |
|---|---|---|---|---|
| Golden living day | 4–5 (REF02/04) | 3.5 | 3 | close to Cycles (`RENDER_PARITY_REPORT.md`); lacks floor-to-ceiling drama and a view |
| Living evening / night | 5 (REF03/05) | 3 | 3 | no cove glow; window view at night thin |
| Balcony | 4 | 3 | 2.5 | slider open; context behind is the weakest part |
| Gym / pool | 4 | 3 | 3 | — |
| Rooftop terrace dusk | 5 (REF06) | 3 | 2.5 | no dusk terrace scene |

## Product features vs references

| Feature | References | NAKHLA now |
|---|---|---|
| Floor picker with hover band + numeral | all | hover band yes; big numeral no |
| Fly-to-floor | REF02/03 | yes (3D) |
| Dollhouse cutaway | REF01/05/06 | yes (live, furnished) |
| Full-bleed photo pages | REF02–06 | gallery overlay only → **photo website to build (V11.2)** |
| Amenities by level | REF04 | no |
| View from floor | REF04 | possible (real modelled context) — not built |

## Top P0 visual defects (to fix first)

1. **No eye-level street hero.** Exterior proof is aerial only.
2. **Toy box cars**, no contact shading.
3. **Flat neighbour faces** at eye level: no shop bands, balconies or roof clutter.
4. **No blue-hour state** with warm windows; live night reversed vs Cycles.
5. **Procedural road and paving** with no photographic aggregate or joints, and no street trees besides palms.

Next round: same cameras after the exterior work (reports/BEFORE_AFTER_FIXES.md).

---

# Round 1 — after exterior round 1 (2026-11-13)

**Columns:**
- B = Cycles: `project_artifacts/v11_exterior/cycles/`
- C = live WebGL: `project_artifacts/v11_exterior/web/` (same cameras, lens shift)
- D = photo website: these same Cycles stills, shown full-bleed in Experience B (`#/<lang>/visual/street_arrival_dusk`)

The S22 G1–G4 exterior shots now exist at **street eye level**, which round 0 did not have.

| # | Dimension | Ref | B r0 → r1 | C r0 → r1 | What changed / what still lacks |
|---|---|---|---|---|---|
| 01 | Form / silhouette | 4–5 | 3 → 3 | 3 → 3 | tower unchanged; reads well from the street, but no crown gesture or arrival canopy drama yet |
| 02 | Façade detail | 4 | 3 → 3 | 2 → 3 | live fins and frames read at street distance |
| 03 | Neighbourhood / site | 4–5 | 2 → 3 | 2 → 3 | shopfronts, balconies, AC units, water tanks, scanned road and paving; still no doors, signage or people |
| 04 | Vehicles / trees / kerbs | 4 | 1 → 3 | 2 → 3 | lofted cars, date palms with dead-frond skirt in both renderers; no broadleaf trees |
| 05 | Sky / atmosphere | 5 | 3 → 3.5 | 2 → 3.5 | twilight state and night gradient; live blue hour deeper than Cycles |
| 06 | Light quality | 5 | 3 → 3.5 | 2 → 3 | lamp lights in Cycles, lamp pools live, warm occupied windows |
| 07 | Shadows / contact | 4 | 3 → 3 | 3 → 3 | not yet audited as a checklist (S23 open) |
| 08 | Reflections | 5 | 3 → 3 | 1 → 1.5 | car glass and metals reflect; no wet or reflective paving |
| 09 | Materials | 4 | 2 → 3 | 2 → 3 | CC0 scans at real scale |
| 12 | Camera framing | 4–5 | 2 → 3.5 | 2 → 3.5 | eye-level, straight verticals; the live 3D has a street-view button |
| 16 | Emotional impression | 4–5 | 2 → 3 | 2 → 3 | subjective; the blue-hour arrival is the first frame that resembles the references' mood |

**Weighted exterior (audio excluded): B ≈ 3.2 · C ≈ 3.0 / 5** (round 0: 2.6 / 2.3). References ≈ 4.4. **Gap remains.** Next levers, in order:
1. A stronger hero composition and arrival canopy.
2. Broadleaf street trees and planting beds.
3. Reflective / wet paving at night.
4. People and slow traffic.
5. The S23 shadow audit.

---

# Round 2 — after exterior round 2 (2026-11-13)

**Columns:**
- B = Cycles `public/renders/street_*.jpg` (256 samples)
- C = live WebGL `project_artifacts/parity/r2_web/` (same cameras)
- Side by side with round 1: `reports/BEFORE_AFTER_exterior_r2.jpg`

Same editorial rubric as before. These are my judgements, not measurements, and none is the owner's.

| # | Dimension | Ref | B r1 → r2 | C r1 → r2 | What changed / what still lacks |
|---|---|---|---|---|---|
| 01 | Form / silhouette | 4–5 | 3 → 3.5 | 3 → 3.5 | entrance portal (stone fins, deep canopy, lettering) gives the base a gesture; crown unchanged |
| 03 | Neighbourhood / site | 4–5 | 3 → 3.5 | 3 → 3.5 | lit shop bays, garden trees behind the houses; still no people, doors or signage |
| 04 | Vehicles / trees / kerbs | 4 | 3 → 3.5 | 3 → 3.5 | broadleaf shade trees in grates, olives and shrubs; live trees read as cards up close |
| 06 | Light quality | 5 | 3.5 → 4 | 3 → 3.5 | canopy downlights, real lobby through the glass (Cycles), warm shops; live night entrance no longer blown out |
| 08 | Reflections | 5 | 3 → 3.5 | 1.5 → 2 | polished forecourt and evening sheen; live cannot occlude sky reflections, so its stone stays more matte |
| 11 | Detail density / art direction | 5 | 2.5 → 3 | 2.5 → 3 | planting layers (tree, olive, shrub, hedge) and the portal add near-field detail |
| 16 | Emotional impression | 4–5 | 3 → 3.5 | 3 → 3 | the night entrance (Cycles) is the closest frame yet to the reels' mood |

Unchanged from round 1: 02, 05, 07, 09, 10, 12, 13, 15.

**Weighted exterior (audio excluded): B ≈ 3.5 · C ≈ 3.2 / 5** (round 1: 3.2 / 3.0). References ≈ 4.4. **The gap remains.** Next levers:
1. People and slow traffic.
2. Denser, less card-like live trees.
3. The live lobby seen through the glass in street view.
4. Cycles day exposure on the sunlit tower face.
5. The S23 checklist SHD-02…16.
