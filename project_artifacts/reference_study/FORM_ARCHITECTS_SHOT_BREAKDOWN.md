# Form Architects — shot breakdown

**Source and method.** Frames were inspected on screen from the reels in `FORM_ARCHITECTS_REFERENCE_INDEX.md`. The timecodes are the paused video times. The reels are 360 × 640, so judgements are about composition, light and density, not micro-detail.

**Rights caveat (applies to every row).** These are observations of third-party work. NAKHLA may borrow general techniques, such as tree density, light pools and a unit-finder colour code. It must not copy their buildings, footage, branding, music or UI artwork.

**Column key.**
- **Obs** — the objective observation.
- **Use** — the potential application in NAKHLA.
- **Blender** and **Web** — feasibility in Cycles and in the live WebGL site: H (high), M (medium) or L (low).
- **Conf** — confidence.

## FA01 Pontus "from sky to sofa" (25 s)

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 0–1 s | **Hero card.** A row of slab towers (≈15 storeys) stands behind a continuous autumn tree canopy that fills the whole foreground. Warm hazy sky; big white sans title over the picture. | **Lesson:** the canopy, not the building, carries the realism. NAKHLA's plot and nearby streets have far fewer trees. | H | M | high |
| 3.2 s | **Top-down masterplan.** Grey, desaturated city blocks. A POI chip reads "School · 379 m · 5 min", with light-blue route lines on the roads. | **Idea:** distance chips to (fictional) amenities. **Risk:** inventing real-sounding POIs for a fictional site, so leave it out. | — | H | high |
| 7 s | **3/4 aerial.** Six white towers in a landscaped park (paths, a lawn ring, dense trees) and a road with cars. The city fades into haze behind. Italic serif caption. | **Confirms the NAKHLA approach:** detailed core, plain massing beyond, haze. **Gap:** NAKHLA has no park, and sparse trees between blocks. | H | H | high |
| 10.7 s | **Façade close-up.** A white frame grid with deep-set dark glazing. Every bay has a balcony slab and a thin rail. The frame **continues above the roof line as an open crown**. | **Crown gesture** (NAKHLA issue #3). The deep reveal gives the shadow lines. | H | H | high |
| 14 s | **Furnished dollhouse cut-away**, top-down: section-cut walls in white, warm floors. | NAKHLA already opens floors; its cut is similar. | — | H | high |
| 17.7 s | **View from a window:** street, cars, autumn trees. Sells "the real view from each apartment". | NAKHLA's room views show the city; the trees should be in front of them. | H | M | high |
| 21 s | **Cut tower** with a furnished floor among yellow tree crowns. | — | — | H | medium |
| 24 s | **End card.** Desaturated street (hex pavers, lamp post), logo and contact line. | NAKHLA's credits / contact card could use a muted still. | H | H | high |

## FA02 "24 hours" (25 s)

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 2.6 s | **07:00 sunrise aerial.** Floating icon pins (school, park, mosque, café …), a bus on the road, low warm sun, long shadows. Large clock "07:00" with the period name. | **Clock readout** while scrubbing time (NAKHLA shows a slider only). | — | H | high |
| 6.8 s | **10:00**, a flat-on façade: dense window grid, crisp shadow reveals. | — | — | — | medium |
| 11.1 s | **17:30 over autumn trees.** Strong rim light through the canopy; trees cast long soft shadows. | Late sun through foliage. NAKHLA's leaf cards do transmit light in Cycles; live is weaker. | H | M | high |
| 15.1 s | **18:45 golden hour, eye level:** hex pavers, a lamp post, flowering trees, **a person seated on a bench**, glare. | **People are part of their realism.** Blocked for NAKHLA by the owner's "not yet" (D12). | H (with assets) | M | high |
| 19.1 s | **23:30 from inside a flat:** dark room, glass, the night city below with scattered warm windows. | NAKHLA has `living_night`; check that the city outside reads at night. | H | H | high |

## FA03 "This is not a render" (19 s)

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 1.6 s | **Low street, backlit low sun:** hex cobbles with fallen leaves, lamp posts receding, bright haze. | Low camera angles on paving: texture scale matters at eye level. | H | M | high |
| 4.7 s | **"Spring":** a woman in an abaya on a bench, a blossom tree, dappled leaf shadow on hex paving, a steel fence. | Culturally local people and dappled shade. People are blocked (D12); dappled shade is possible. | H | M | high |
| 7.7 s | **"Night": wet, reflective paving**; towers with irregular warm windows; uplit trees; ground light pools. | NAKHLA night: wet sheen exists; **uplit trees** and **irregular windows** are worth adding. | H | H | high |
| 10.7 s | **Aerial "all in one app":** yellow canopy fills every gap between towers. | Same canopy lesson. | H | M | high |
| 13.7 s | **Open any floor:** a cut-away with green round hotspots on the rooms. | NAKHLA has hotspots; similar. | — | H | high |

## FA04 Tomis drone → ground (19 s)

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 2.3 s | **Split screen:** screen recording above, the same app on a tablet in a hand below. Aerial of the garden with pergolas; a skyline in haze at the horizon. | Presentation device for a reel (NAKHLA has no reel yet). | — | — | high |
| 6.7 s | **Hotel tower:** gold/beige grid façade, blue glass, strong vertical rhythm. | — | — | — | medium |
| 10.8 s | **Garden of pergolas,** paths and trees; side panels of UI. | Landscape structures near the base. | H | H | medium |
| 15.3 s | **A "JUMP HERE" green pin** drops the camera to walk level. | NAKHLA could add a street-level drop point. | — | M | high |

## FA05 Tomis weather and time (20 s)

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 3.1 s | **Sunset:** orange sky, city lights coming on, tower silhouetted. | Matches `exterior_dusk`. | H | H | high |
| 7.7 s | **Fog:** the context city is **plain white massing** (no windows) in a whiteout. | Plain massing far out is normal practice. | H | H | high |
| 12.1 s | **Rain at street level:** wet road reflections, a grey sky. | NAKHLA has rain in live; check the wet reflections. | M | H | medium |
| 16.1 s | **Day:** yellow trees around the podium; low context blocks. | — | — | — | medium |

## FA06 restaurant at night (19 s)

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 3.9 s | **Timber slat ceiling** with integrated linear light strips; round columns; warm oak; orange upholstered chairs. | Cove and strip light in the timber ceiling of the F11 restaurant (NAKHLA issue #4, same idea). | H | M | high |
| 9.6 s | **Low walk height through the tables.** | — | — | — | medium |
| 14.9 s | **A yellow info chip floats** over the table. | NAKHLA hotspots are similar. | — | H | medium |

## FA07 suite and balcony (20 s)

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 5.9 s | **Full-height glass wall to a city horizon.** Fireplace TV wall, curved sofa, grey carpet; a bright exterior against a softer interior. | Like the reference interior in NAKHLA issue #4; NAKHLA's living room glazing is narrower. | H | M | medium |
| 13.7 s | **Balcony door** framing a city to the horizon. | — | — | — | medium |

## FA08 hospital aerial (20 s)

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 4.0 s | **Dense green trees** surround the building; the **car park is full of cars**; a streetscape around it. | **Parked cars in numbers** fill the city at aerial height. NAKHLA's district has no cars. | H | H (low-poly) | high |
| 10.8 s | **Avenue with tree rows** on both sides; lane markings. | Tree-lined district avenues. | H | M | high |

## FA09 / FA10 room finder and "one touch"

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| FA09 11.8 s | **Every room on the tower lights up in a colour by type** (blue / yellow / red); a details card sits at the side. | **Directly useful for the pricing section:** tint units on the tower by type or price band and highlight the selected unit. | — | H | high |
| FA10 6.5 s | **Physical tablet in hand;** the masterplan with yellow trees. | — | — | — | medium |
| FA10 15.5 s | **Towers coloured by unit type** over a city. | Same as FA09. | — | H | medium |

## FA11 hotel aerial (20 s)

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 3.1 s | **Three-panel reel:** a forecourt full of parked cars; a plaza with yellow tree squares; the tower at dusk. | Cars and planted squares. | H | M | high |
| 9.1 s | **Plaza with geometric beds,** a fountain, the city skyline to the horizon. | — | — | — | medium |
| 15.1 s | **Night aerial:** a warm-lit garden with tree-uplights and lit paths; the city a grid of warm lights. | **Uplit trees + lit paths at night.** | H | M | high |

## FA12 "in your client's pocket"

| t | Obs | Use | Blender | Web | Conf |
|---|---|---|---|---|---|
| 5.7 s | **Phone-frame mock-up of the app;** "No download. Just a link." | Same promise as NAKHLA (web). | — | — | high |

## Cross-cutting observations

1. **Look and engine.** Their real-time image is above WebGL quality. It is consistent with a desktop game engine streamed or packaged; the captions only say "real-time". It is **not** Cycles-level. Their stills (sun, foliage translucency, wet reflections) are what NAKHLA should match in Cycles and approach in the live site.
2. **Colour script.** Warm ivory and white buildings against saturated seasonal foliage (yellow/orange or deep green), with hazy warm skies by day. At night, warm windows against a deep blue sky. Grading is soft, with no heavy bloom.
3. **Cinematography.**
   - **Shot types:** aerial establishing, slow orbit, quick cuts (≈1.5–3 s per shot), and eye-level dolly shots on paving.
   - **Title cards:** bilingual (English uppercase plus Arabic).
   - **Ending:** a desaturated end card.
4. **Audio.** Not assessed: video was kept muted to avoid audio load. No claim is made.
