# Environment design spec — fictional site

Status: INTERNAL-QA-PASS for the first pass (2026-11-12) · PENDING-OWNER-REVIEW.
**Everything here is illustrative.** The site is an invented, Basrah-inspired urban setting. It is not a real address, plot, skyline or view, and no setback, parking or planning rule is implied.

Source: `src/engine/site.ts` (`sitePrims`, `NEIGHBOURS`) — the same primitives feed the website and the Blender export. Evidence: `project_artifacts/evidence/exterior_after/` (9 live frames: day, golden hour, night, dust, rooftop open day/night, balcony views floor 04 and 09, terrace).

## Coordinates

Plan metres, x east, y north, origin at the tower footprint's south-west corner; the tower occupies x 0–18, y 0–24. Conceptual north = +y. Ground datum z = 0 is the road surface; pavements and the plot are +0.15 m; the tower plinth is +0.45 m.

## Site plan

| Element | Location (plan m) | Notes |
|---|---|---|
| Tower plot | x −3…21, y −5…27 (24 × 32 m) | paved forecourt, planters with hedges, boundary wall + hedge on the west, low wall on the north, lawn margins |
| Main street | y −19.2…−7.8, east–west | 11.4 m carriageway, dashed centre line, zebra crossing on the entrance axis, 2.6 m pavements with kerbs both sides |
| Side street | x 25.6…34.4, north–south | 8.8 m carriageway, pavements both sides |
| Rear lane | y 31.2…36.8 | service side of the plot |
| Entrance | south face, x 4.4…13.6 | steps, bronze canopy on two columns with a linear light, bollard lights, two benches |

## Three distance zones

| Zone | Distance | Content | Cost control |
|---|---|---|---|
| Near | plot and the two streets | kerbs, crossing, lane markings, 30 street lamps with light pools, 6 parked cars, bollards, benches, hedges, lawn, about 60 palms of varied height in avenue rows and garden groups | one merged mesh per material; palms instanced (2 draw calls) |
| Mid | street blocks out to about 150 m | about 75 neighbouring buildings generated per block as separate plots with side yards: 2–4 storeys beside the tower, 3–6 in the second ring; real window grid (3.2 m bays, 3.3 m storeys), balconies on two of three façade types, parapet, roof slab, stair bulkhead, water tanks, condenser units | 3 façade textures (512 px, procedural, original) + a lit-window mask for night; boxes only |
| Far | 210–540 m | 150 small hazy silhouettes; heat haze (exponential fog) dissolves them into the horizon | untextured, no shadows |

The tower stays by far the tallest object, so the neighbourhood supports it instead of competing.

## Light

- Day and golden hour: the same simulated sun as the tower; haze slightly stronger than before (density 0.0009 → 0.0017).
- Night: moonlight raised (0.32 → 0.85) and sky ambient raised so façades and ground stay readable; about a third of neighbour windows are lit (emissive mask, warm, with blinds at different heights); street-lamp heads glow and cast soft pools; two warm lights lift the entrance and podium; the tower's own lit windows remain.
- Weather: dust and rain use the existing fog and sky changes; the context inherits them.

## Views from the building

Balconies, terraces and windows look onto this same model from their true position and height — there is no separate backdrop image. A higher floor sees further over the low-rise blocks (compare `07_balcony_view_F04` and `08_balcony_view_F09_night`).

## Known limits

- Neighbour façades are flat textured boxes: no relief, no shopfronts, no signage, no doors at street level.
- No pedestrians, no moving traffic, no bus stops or street trees other than palms.
- Daytime neighbour façades read cooler/whiter than the tower stone.
- Roads have no wear, patches or drainage detail; the lawn is a flat tint.
- Street lamps do not cast real light (pools are additive decals).
- Not yet re-rendered in Blender Cycles (the export includes the new site; the stills are from before).
