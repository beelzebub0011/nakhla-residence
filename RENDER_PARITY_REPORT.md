# Render parity report — Blender Cycles vs the live website

Updated 2026-11-12. Addendum T09 / T19, remediation §3. Status: **PARTIAL** (internal QA only, not owner-reviewed).

## 1. Method

- **Same scene.** Both renderers draw the canonical TypeScript model: the website builds it live, and Blender reads `blender/scene_prims.json` + `scene_meshes.bin` written by `npm test`. Both use the same meshes, texture files, solar position and AgX view transform.
- **Same cameras.** 19 cameras are defined once in the scene export: 3 exterior, 9 apartment views (5 Golden Apartment rooms, 3 more hours in the living room, 1 Type B living room) and 7 amenity views. `tools/parity_shots.mjs` puts the live camera at exactly the Cycles position:
  - exterior: same orbit target, azimuth, polar angle, distance and 32° lens, with the side-panel view offset removed;
  - rooms: the same guided viewpoint.

  Every frame is 1600 × 900, with the interface hidden and the same hour.
- **Numbers.** `python tools/parity_metrics.py` prints the table below and rebuilds the two comparison sheets. Images are reduced to 320 × 180 first, so the numbers describe overall light and colour, not fine detail.
- **Reading the numbers.** Each Cycles still is exposed by a meter that protects highlights, which puts most interiors near the same mean (~118). The live site uses one exposure per hour and place, as a visitor would see it. So "raw" differences mix up exposure and lighting. The **exposure-matched** column scales both images to the same mean first, which isolates distribution, colour and contrast. Differences are mean absolute sRGB levels (0–255).

## 2. Evidence

| File | What |
|---|---|
| `project_artifacts/parity/COMPARISON_apartments.jpg` | 9 apartment cameras, Cycles left, live right |
| `project_artifacts/parity/COMPARISON_exterior_amenities.jpg` | 3 exterior + 7 amenity cameras |
| `project_artifacts/parity/web/*.png` | live frames (camera-matched) |
| `project_artifacts/cycles_v3/*.jpg` | Cycles stills (also published in the site gallery: `public/renders`, 19 items) |
| `project_artifacts/parity/metrics.json` | the numbers below |
| `project_artifacts/golden/GOLDEN_APARTMENT_REVIEW.md` §3 | five measured colour patches in the Golden living room |

## 3. Results

| Camera | Hour | Mean luminance Cycles / live | Abs. difference raw | Abs. difference exposure-matched | Warmth (R−B) Cycles / live | Contrast (σ) Cycles / live |
|---|---|---|---|---|---|---|
| exterior_day | 16:00 | 110 / 163 | 63.1 | 56.0 | 13 / −5 | 65 / 48 |
| exterior_golden | 18:00 | 108 / 127 | 46.5 | 47.8 | 14 / 21 | 60 / 44 |
| exterior_night | 21:00 | 72 / 65 | 45.0 | 77.5 | 23 / 6 | 36 / 47 |
| living | 15:00 | 118 / 117 | 27.7 | 28.2 | 50 / 43 | 47 / 51 |
| kitchen | 15:00 | 120 / 149 | 40.8 | 22.0 | 45 / 40 | 36 / 47 |
| master | 16:00 | 116 / 129 | 38.9 | 33.2 | 58 / 49 | 40 / 49 |
| bathroom | 15:00 | 118 / 103 | 22.1 | 19.8 | 53 / 31 | 34 / 27 |
| balcony | 16:40 | 118 / 150 | 55.8 | 47.8 | 16 / −7 | 64 / 55 |
| living_golden | 18:30 | 119 / 101 | 31.4 | 30.9 | 53 / 50 | 46 / 41 |
| living_evening | 19:30 | 86 / 86 | 26.8 | 36.8 | 54 / 48 | 43 / 38 |
| living_night | 22:00 | 86 / 85 | 26.3 | 36.5 | 54 / 47 | 43 / 39 |
| B_living | 15:00 | 117 / 124 | 30.0 | 28.4 | 45 / 38 | 49 / 49 |
| lobby | 15:00 | 120 / 152 | 38.6 | 17.3 | 62 / 53 | 35 / 47 |
| cafe | 18:00 | 120 / 148 | 54.0 | 40.2 | 36 / 44 | 47 / 51 |
| spa | 15:00 | 117 / 96 | 33.8 | 25.4 | 88 / 72 | 38 / 25 |
| pool | 15:00 | 119 / 184 | 77.3 | 26.3 | 14 / 12 | 40 / 59 |
| gym | 15:00 | 119 / 131 | 55.5 | 46.6 | 12 / 14 | 72 / 94 |
| restaurant | 17:00 | 118 / 161 | 62.7 | 37.3 | 39 / 40 | 49 / 61 |
| terrace | 17:30 | 116 / 115 | 42.9 | 43.6 | 16 / 9 | 63 / 55 |

### What the numbers and the sheets say

**Close (exposure-matched difference ≤ ~30):** lobby, bathroom, kitchen, spa, pool, living, B_living and living_golden. Composition, furniture, finishes and the warm/cool balance agree. Remaining differences in these views are mostly soft contact shadows and sunlight patches, which Cycles resolves and the live bake smooths.

**Live is brighter than Cycles** (pool, restaurant, café, lobby, kitchen). This is mostly exposure: the meter darkens the Cycles stills, and the live site keeps the brighter "showroom" exposure. After exposure matching most of these drop to 17–40.

**Real differences that remain:**

| # | View | Difference | Cause | Status |
|---|---|---|---|---|
| 1 | exterior_day / golden | Live sky and context are hazier, cooler and lower in contrast; the Cycles ground has deep, crisp shadows | Live haze and fog for depth; one shadow map covers the tower and not the whole city | Known limit (performance) |
| 2 | exterior (all) | Live shows palms, street lamps, cars and kerbs that Cycles does not | That context is built only in the website (`src/engine/site.ts`), not in the canonical export | Open: export the context to Blender |
| 3 | exterior_night | Cycles floodlights the tower and leaves the neighbours dark; live is the reverse (lit neighbour windows, softer tower) | Cycles uses real lamp objects plus a night HDRI; live uses emissive window masks and pool lights | Open: mid-way balance needs an owner look decision |
| 4 | balcony | Live slider stands open with a cooler sky; Cycles has it closed | Sliders open automatically near the visitor in the live site | Intended behaviour |
| 5 | bathroom | Cycles mirror has a warm back-lit halo; live mirror shows a true reflection but no halo | The halo is a light-emitting strip only Cycles carries | Minor |
| 6 | spa | Sauna interior is lit and clearly visible through clear glass in Cycles; live glass adds a grey veil and the sauna lamp does not glow | Single glass material (tinted, 30 % opacity) for every pane | Open: a separate clear interior-glass material |
| 7 | gym | Live contrast is higher (dark rubber floor against a bright window wall) | Baked sky share fills the dark floor less than path tracing does | Minor |
| 8 | living_evening / night | Live ceiling is lit more evenly; Cycles shows pools of light under the downlights | Downlight cones are only partly represented by point lights in the live site | Minor |

**Fixed during this comparison** (re-captured afterwards; the sheets show the fixed state):

- *Terrace pergola missing in the live terrace view.* It belonged to the roof crown, which lifts away; it is now part of the level-11 shell.
- *Brass and bronze black in outdoor rooms.* The indoor light treatment was also applied on the terrace; outdoor rooms are now excluded.
- *Brass pendants, floor lamp and taps black indoors.* three.js replaces each material's own reflection strength with the scene-wide value, which is cut to 3 % indoors, so the earlier "boost for metals" never took effect. Metals in baked rooms now reflect the room's own light. In the comparison they read as warm brass, as in Cycles.
- *Pergola undersides black.* A polished metal under open sky mirrors the dark lower half of the environment. The pergola is now bronze-colour powder coat (`bronze_pc`), a paint, as real aluminium pergolas are. The Cycles terrace still was re-rendered with the same finish.

## 4. Verdict

Interiors (apartments and amenities) track the path-traced reference closely in layout, finishes and colour, apart from the spa glass. The exterior matches in geometry and sun direction but not in atmosphere or night treatment. **INTERNAL-QA: PARTIAL.** Not reviewed by the owner.

## 5. Re-run

```
npm test                                                              # scene export
node tools/blender.mjs blender/build_nakhla.py blender/scene_prims.json blender project_artifacts/cycles_v3 --no-save
npm run build && npm run preview                                      # http://127.0.0.1:4173
MSYS_NO_PATHCONV=1 node tools/parity_shots.mjs project_artifacts/parity/web
python tools/parity_metrics.py
```
