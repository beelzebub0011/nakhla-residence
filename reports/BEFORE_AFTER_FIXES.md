# Before / after — V11 fixes with capture proof

Status: **INTERNAL-QA only. Not owner-approved.** Every "after" image is a real capture from the build named in the row. Live frames come from `tools/parity_shots.mjs` (Chrome, RTX 3050, 1600 × 900). Cycles frames come from `blender/build_nakhla.py`. Sheet: `reports/BEFORE_AFTER_exterior.jpg`.

## Exterior round 1 (commit `a203f17` + follow-ups)

| # | Defect (owner screenshots, S20 / scorecard round 0) | Root cause | Fix | Evidence |
|---|---|---|---|---|
| E1 | No eye-level street view; aerial orbit only | No street camera existed | 5 street cameras at 1.65 m (arrival ×3 hours, entrance ×2) with **lens shift**, so verticals stay straight as in architectural photography. Same camera definitions drive Cycles and the live capture (`src/domain/views.ts`) | sheet rows 3–10 |
| E2 | Toy box cars | Cars were 4 boxes + 4 tubes | Lofted bodies (superellipse sections, wheel arches), tinted glass cabin, painted roof, tyres with rims, head and tail lights, mirrors; sedans and SUVs in restrained colours | rows 3–6 |
| E3 | Night sky pure black in the live site | three.js analytic sky goes black after sunset | Twilight/night sky dome (navy zenith, warm city-glow horizon, last light toward the sun), also feeding reflections; stars only in full night | rows 2 vs 7 |
| E4 | Blue hour shown as night (both renderers) | Live: `night` curve treated civil twilight as night. Blender: anything below −4° rendered as night | Live: separate twilight factor driven by sun elevation. Blender: a real twilight state (dim physical sky); night only below −8° | rows 5–6 |
| E5 | Orange 13 m squares on every street in Cycles | Web-only lamp-pool decals exported to Blender as opaque slabs | Skipped in Cycles, which now has real spot lights in all 33 street lamps (on from blue hour) | rows 3–4 |
| E6 | Palms only in the website; grey "concrete" trunks | Palms were instanced only in the web engine | Shared palm data (positions + frond geometry) exported to Blender; dead-frond skirt (typical of date palms); CC0 palm-bark scan | rows 3–10 |
| E7 | Flat neighbour faces at eye level | Textured boxes only | Street-facing faces within 75 m get shop glazing, piers, fascia band, awnings, balcony slabs with glass rails, wall AC units and rooftop water tanks | rows 3–8 |
| E8 | Procedural road and paving | — | CC0 scans: asphalt, rectangular paving, concrete kerbs and hardstanding, palm bark, sandstone (ledger: `SOURCE_LICENSE_LEDGER.csv`) | rows 3–10 |
| E9 | Few lit windows at night | 40 % of rooms lit | About 60 % of rooms lit warm after dark; unlit rooms keep a faint city-light tone instead of black glass | row 7 |

## Still open after round 1 (honest)

- Live and Cycles blue hour differ in sky brightness: live is deeper blue, Cycles paler twilight.
- The live site has no lens shift in the interactive camera, so street views exist only as capture bookmarks. Visitors cannot yet choose a street view in 3D.
- Neighbour buildings are still massing with relief: no doors, signage, people or traffic motion.
- No broadleaf street trees (palms only), no tree pits or mulch.
- Shadow/contact audit S23 has not been run as a scored checklist (`reports/SHADOW_LIGHTING_SPATIAL_AUDIT.md` not yet written).

---

# Exterior round 2 (2026-11-13)

Sheet: `reports/BEFORE_AFTER_exterior_r2.jpg`. Rows are the five street views; columns are Cycles round 1 (commit 26d79e5), Cycles round 2 and live 3D round 2.

| # | Defect (scorecard round 1 levers) | Fix | Evidence |
|---|---|---|---|
| E10 | Weak arrival: a thin bronze slab on two rods | Entrance portal: two dark stone fins with a lit reveal carry a deep bronze canopy (teak slat soffit, 10 recessed downlights, a light line along the front edge, the NAKHLA RESIDENCE lettering), over a polished granite forecourt. The downlights are real spot lights in Cycles | rows 4–5 |
| E11 | Palms only; no broadleaf trees, tree pits or planting | Shared broadleaf trees (leaf-cluster cards, branching wood): 29 shade trees in steel grates along the pavements and in the plot lawns, 40 older trees in neighbours' gardens, 4 olives and 9 shrubs in the planters. Same geometry and texture in both renderers; SHD-01 checks every one | rows 1–5 |
| E12 | Lobby glass at night was a blown-out white panel (Cycles) | Street views now show the real furnished lobby (G floor interior with its lamps) through the glass, instead of a lit infill | row 5 |
| E13 | Live night entrance overexposed | Two night lights meant for the aerial view (~100 m away) now fade with camera distance; the canopy downlights carry the entrance up close | row 5 (live) |
| E14 | Dead black shopfronts at blue hour and night | About half the neighbours' shop bays open: dark glass by day, warm amber after sunset | rows 2–3 |
| E15 | No reflective ground at night | Polished forecourt stone; a modest evening sheen on road and paving (roughness lowered by 40 % / 25 % after sunset). A stylistic choice taken from the reels, not a claim of rain | rows 3, 5 |
| E16 | South side of the main street had no shop band | The relief rule missed faces set back more than 26 m from the street axis; the margin now covers them | rows 1–3 (right side) |

## Still open after round 2 (honest)

- No people or moving traffic.
- Up close, the live trees read as cards; Cycles trees are denser.
- The live lobby glass is still a flat panel (the live site does not load the G interior in street view).
- In the live site the forecourt stone is more matte than in Cycles: the live renderer cannot block sky reflections under the canopy.
- Cycles daytime arrival: the sunlit tower face is close to clipping.
- The live blue hour is still deeper blue than the Cycles one.
