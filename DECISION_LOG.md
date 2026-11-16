# Decision log (V11.3 onward)

Routine technical and design decisions taken without asking the owner, as the V11.3 directive authorises. Each entry says what was chosen, why, and the evidence behind it. **None of this is owner approval.**

## 2026-11-13

### D1 — Gate 1 first: the return-to-tower stall
- **Chosen:** fix the 160–313 ms stall before any visual work (directive §03; the owner's last button choice was pending).
- **Checkpoint:** tag `checkpoint-pre-v11-3-2026-11-13`.

### D2 — Root cause found by measurement, not guesswork
- **Tool:** `tools/hitch_probe.mjs`. It replays the 20-cycle navigation of `tests/e2e/motion.spec.ts` and attributes every frame over 40 ms to WebGL call classes and Engine methods. It also lists the shader programs created in that frame.
- **Finding:**
  - The stalls were not on the return itself. They were the frame after a **finish-package change**.
  - About 95 % of each long frame was a synchronous shader link (`getProgramParameter`), for 2 programs per stall. The total program count stayed constant, so programs were being freed and rebuilt.
- **Cause:** each surface crossfade creates transparent clones of the surface material. Disposing them at the end of the 240 ms fade released their shader programs, so the next package change linked them again.

### D3 — Fix: pool the crossfade materials and pre-compile them in the background
- **Rejected alternatives:**
  - Remove the crossfade: loses a V8 polish feature.
  - Hide the stall behind a longer animation: the directive forbids that.
- **Chosen:**
  - A material pool per shader path (plain, lightmapped, baked-ambient). Pooled materials keep their programs alive.
  - The variants are compiled with `compileAsync` from real interior meshes while the first interior is prepared.

### D4 — Cold path: finish textures are prepared in the worker before a change is applied
- **Finding:** on a cold page, an early package change synthesised finish textures on the main thread, giving 167–306 ms frames inside `onState`.
- **Chosen:** if a needed finish is not prepared yet, prepare it in the worker, then apply the whole change at once (latest wins).
- **Trade-off:** on a cold page, the change appears a few hundred milliseconds later instead of freezing the frame.

### D5 — Cold path: the ambient-occlusion shaders are pre-compiled with matching program keys
- **Finding:** the first AO frame linked 7 programs synchronously (≈220 ms).
- **Why the old pre-compile missed:** it used the wrong output target, the wrong scene (fog and lights are part of the keys), a different quad geometry and no instanced normal pass. The output pass also sets its defines only inside `render()`.
- **Chosen:** compile each pass exactly as it is drawn. Key diffs were checked program by program.
- **Result:** no AO compile stall; 2 fewer shader programs overall (81, was 83).

### D6 — Arabic creator name
- **Directive §18:** says the رشيد / راشد spelling is ambiguous and must not be guessed.
- **Status:** the V11/V11.2 package (owner-supplied) states «راشد عمر محمد» explicitly and calls the earlier رشيد rule wrong. The owner confirmed the English "Rashid Omar Mohammed" in chat on 2026-11-13.
- **Decision:** keep «راشد», which is the owner's last explicit project instruction, and do not rewrite it again.
- **Ambiguity noted:** recorded here once. If the owner says otherwise, the guard test `tests/unit/identity.test.ts` is the single place to change.

### D7 — Environment to the horizon
- **Chosen:** a generated district on a street grid, aligned with the two real streets, out to ≈700 m (2×2 lots per block, five facade tones, roof silhouettes, district trees).
- **Beyond that:** a far skyline band to 2.6 km and ground to the horizon.
- **Haze:** distance haze in Cycles (compositor; the colour is probed from the sky per camera; same curve as the live fog).
- **Rejected:** a photographic backdrop or HDRI city. It would depict a real place, and the brief says the site is fictional.

### D8 — Traffic yes, people no (for now)
- **Traffic:** slow two-lane traffic on the main street. It animates in the live 3D only in tower/street views, never under reduced motion, and is frozen in tests. Cycles renders the same t = 0 arrangement.
- **People:** left out on purpose. No free human assets are installed, and downloading Quaternius or similar CC0 characters needs the owner's approval. Procedural figures would fail the directive's "no bad humanoids" bar.

### D9 — Cycles palm trunks were half underground
- **Found while reviewing V11.3 stills:** the trunk mesh was centred on its origin, so every palm crown floated above a half-height trunk. The SHD-01 data check could not see this, because the bug was in the Blender build only.
- **Fixed:** all 43 views were re-rendered.
- **Also:** highlight protection was added to the auto-exposure (99.3rd percentile), so sunlit stone no longer clips.

### D10 — Music rebuilt, still synthesised
- **Chosen:** an original generative piece in D major (see `SOUND_DESIGN.md`), measured with earshot.
- **Not done:** recorded or licensed instruments, which need downloads and licence review (owner's call).

### D11 — Lit city in Cycles, and an aerial blue-hour hero
- **Trigger:** the four-way sheet against REF06 showed the biggest dusk gap. The reference is a warmly lit city seen from above; NAKHLA's Cycles city stayed dark after sunset.
- **Chosen:**
  - Export the same lit-window maps the website uses, with emission after sunset.
  - Add an elevated `exterior_dusk` view (first in "The building" chapter).
  - Haze cap 0.97 and a 400 km ground plane, so far geometry merges into the horizon.
- **Residual:** a hairline at the horizon and a few pale far blocks where the sky model darkens at 0°. Minor; recorded in `REVIEW_PACK/REMAINING_ISSUES.md`.

### D12 — People: the owner said "not yet" (2026-11-14)
- **Asked:** whether to download free CC0 people models (Quaternius) for the street and lobby.
- **Owner's answer:** "Not yet". Nothing was downloaded. People stay out; D8 stands.
- **Next:** continue with the items on `REVIEW_PACK/REMAINING_ISSUES.md` that need no owner decision.

### D13 — Façade kit for the district within 250 m (V11.4)
- **Trigger:** remaining issue #1. Aerial and long street views showed the same textured box repeated hundreds of times.
- **Chosen:** shared prims, so the live 3D and Cycles change together (`districtFacade` in `src/engine/site.ts`). Each lot 75–250 m out gets:
  - a shop podium on the faces that front a road: piers, open (lit after sunset) or closed shopfronts, sign panels, a fascia and a light line;
  - one of four upper-floor treatments: floor bands, continuous balconies with glass rails, vertical fins, or a set-back penthouse with a cornice and a pergola.
- **Cost:** no new materials, so the live draw-call count barely moves (buckets merge per material).
- **Not done:** a different window texture per lot, and real-looking signage text. Lots within 75 m keep their existing hand-placed relief.

### D14 — Horizon hairline removed
- **Cause:** Blender's physical sky turns dark just below 0°. An elevated camera saw a sliver of it between the far edge of the ground plane and the horizon.
- **Fix:** the world looks up the sky with the direction's elevation clamped to 0.004 rad, so anything at or below the horizon gets the horizon colour. It was verified on a preview of `exterior_dusk` before the full render.

### D15 — Photo-site gaps
- **Added:** `A_hall` and `B_hall` (evening) and `B_laundry`. `B_dressing` is reframed diagonally across the room (it was a tight close-up); the live 3D room focus uses the same viewpoint.
- **Dropped:** `A_laundry`. The room is 1.2 m wide, and every preview framed a wall. `B_laundry` covers the room type.

### D16 — Demo pricing (owner's addendum, 2026-11-14)
- **Data:** one editable file, `src/data/pricing-demo.json`. Every figure is computed in `src/domain/pricing.ts` from the model-measured areas: net + half the balcony × an assumed 1,850,000 IQD/m², with stated factors (Type B −3 %, north side −1 %, +1 % per level).
  - Finish packages are separate extras.
  - Results are rounded to 1 M IQD.
  - The anchoring and its weaknesses are in `project_artifacts/pricing/MARKET_ANCHORING.md`.
- **Currency:** IQD by default. The USD equivalent uses a hypothetical 1,500 IQD/USD, labelled as such, because reports of the official rate conflict.
- **Where prices appear, both experiences:**
  - a pricing sheet: ranges, filters, breakdown, show on tower, see photos, compare;
  - a badge in the unit panel;
  - a chip and a home section in the photo site;
  - the comparison table and the printed summary;
  - the assistant (price, method, compare, finish);
  - deep links (`?pr=`).
- **Guardrails:**
  - The disclaimer is on every surface, in 4 languages, with the exact Arabic wording from the brief.
  - Availability stays "not available".
  - There are no booking, deposit, urgency or "sold" words, and a test checks this.
- **RTL:** Arabic and Sorani ranges are worded «من … إلى» / «لە … تا» so the numbers cannot flip in right-to-left text.

### D17 — Streetscape from the Form Architects study (Phase B)
- **Trigger:** the study found that canopy density and parked cars carry the realism of their aerials. NAKHLA's district had bare streets.
- **Chosen:** shared prims, so the change applies to both renderers.
  - District roads become two lanes with parking lanes and paved sidewalks.
  - A light "avenue" tree (70 cards) lines both sidewalks within 230 m.
  - 170 more avenue trees fill open yards of the inner ring.
  - Low-poly parked cars line the district kerbs.
  - The street trees near the tower get night uplights.
- **Cost (live, 1366×768):** about +0.27 M triangles and +14 draw calls; p95 stays at 7.6–8.5 ms.
- **Contact audit:** 984 objects, 0 warnings, after moving trees that had landed on the side-street pavement.
- **Not done:** people (owner said not yet), and the tower crown (needs the owner's aesthetic review).

### D18 — Open roof crown: previewed ("Yes, preview it"), then adopted by the owner (2026-11-14)
- **What:** Option 1's crown from `project_artifacts/reference_study/ART_DIRECTION_OPTIONS.md`.
  - The façade frame continues 3.4 m above the roof: stone piers placed over the façade's solid stone, a stone ring beam, and bronze fins in the façade's fin plane at about 0.6 m.
  - A pale screen round the existing plant enclosure, seen through the fins, glows warm after sunset ("lantern"). By day it is cream.
  - It follows the roofed pavilion's outline; the two north terraces stay open to the sky.
- **Status: ADOPTED by the owner** ("Adopt the crown", 2026-11-14, after reviewing `project_artifacts/crown_preview/BOARD_*.jpg`).
  - `buildCrown()` is now part of `buildRoof()`, so the live 3D site and Cycles both show it; the `?crown=1` / `--crown` switches are gone.
  - The exterior and level-11 Cycles views were re-rendered, and the photo site's images refreshed.
  - The close review views stay available with `--crown-cams` (never in the published set).
- **Cost:** 168 boxes in the roof group and one new material (`lantern`), about +1 draw call.
- **To remove later:** delete `buildCrown` and its call in `buildRoof`, and the `lantern` material.

### D19 — Non-owner backlog from the reference study: G2, G4, G5, G6 and close façade detail (2026-11-14, not owner-approved)
- **Asked for:** "do it" (the backlog items that do not need the owner).
- **G2, window rhythms** (`src/engine/texgen.ts`):
  - Each neighbour façade has four window kinds by column: standard with a roller-shutter box, wide, pair, and tall French with guard bars.
  - Each cell may carry a split-AC unit, a curtain, and a cool LED or warm lit colour.
  - The lit night map now uses the day map's seed, which fixes lit windows that did not line up with the day windows.
- **G4, live night glow:**
  - A warm glow pool on the pavement in front of each lit shopfront (`site.ts`).
  - Lit windows vary between warm and cool.
  - The crown lantern glows after sunset.
- **G5, golden hour into the sun:**
  - New Cycles view `street_golden_sun`: a low aerial at 18:10 looking towards the low sun beside the tower.
  - Two per-camera options in `blender/build_nakhla.py`: a Fog Glow glare node, and dust haze at 1.9× density.
  - It is in the photo site's arrival chapter, so there are now 48 views.
- **G6, parked cars:** 24 more cars on the north and south kerbs and both side streets near the tower. The contact audit checks 1008 objects with 0 warnings.
- **Close façade detail** (`openingInfill` in `src/domain/prims.ts`):
  - Exterior windows gain pressure caps on the mullions and a head cap.
  - They also gain a projecting stone sill with a drip.
- **Stone:**
  - Wider grout joints.
  - More tone variation between stones.
- **Re-rendered:** all 48 Cycles views; web images and manifest refreshed.
- **To undo:** revert this commit. No data or pricing changed.

### D20 — Interior hero: cove-lit ceiling and a level corner camera in the Type A living room (2026-11-15, not owner-approved)
- **Asked for:** "Yes, interior first" (REMAINING_ISSUES #4).
- **Cove** (`ceilingCove()` in `src/domain/furniture.ts`, shared by both renderers):
  - A band 45 cm wide drops 16 cm along all four walls.
  - The centre keeps the full 2.80 m clear height. The band underside, at 2.64 m, is above every slider (2.50 m) and arch (2.40 m) head.
  - From the wall, the band's profile is a solid band, a trough with the LED tape, and an upstand lip. Light leaves through the 7 cm slot above the lip and washes the central ceiling.
  - The curtains now hang from the band, like a curtain pocket.
  - In the Cycles export, each tape run of about 1 m becomes a `cove` light (5 W at night, the same day boost as the other fittings).
  - In the live 3D site, the residential light map was re-baked, so the wash shows when the lights are on.
- **AC:** the linear slot diffuser moved into the band underside (`COVE.rooms` in `addMep`). Before, it ran into the cove edge.
- **Camera:** the Type A living viewpoint moved back to the corner (10.72, 5.88) and turns more towards the window.
  - The photo camera is level at 1.38 m with lens shift, so verticals stay straight. Field of view is 62°.
  - Plan rooms can now carry this as `view.photo`; other rooms keep the old camera.
  - The live walk keeps eye height 1.62 m.
- **Plan dimensions are unchanged** (7.00 × 4.10 m).
- **Re-rendered:** `living`, `living_golden`, `living_evening`, `living_night`. Residential light map re-baked (`lampRef` 1.74 → 2.57, the cove wash now sets the reference).
- **To undo:** remove the `ceilingCove(...)` call and the `photo` field; re-bake with `--bake=F04:residential`.

### D21 — V11.5 environment, light and photo-site overhaul (2026-11-15, not owner-approved)
- **Asked for:** "everything is white", "the sky is so bad", "buildings in the middle of the street", "the restaurant tables have no lights", the photo-section quality and UI; reference: one Instagram reel, studied read-only (text notes only, no frames kept).
- **Street bug:** the second-ring neighbour blocks were generated across the core streets, so lots stood in the main street (x < −64 and x > 92), on the side street north of y 68, and on the rear lane. The far skyline band also overlapped the district's outer roads.
  - `CORE_ROADS` and `onCoreRoad()` in `site.ts` now drop those lots; the side street runs through to the district grid (y 122).
  - The far skyline boxes stay outside the district.
  - New `tests/unit/streets.test.ts` guards both rules.
- **Sky** (new `src/engine/sky.ts`): one art-directed dome replaces three's analytic Sky and the separate night dome.
  - Graded zenith, horizon and glow colours keyed on the sun's elevation, from −14° to 65°.
  - Season grading: hazy summer, crisp winter.
  - Weather: partly cloudy, windy, overcast, rain, dust.
  - Two cloud layers (cumulus and cirrus) lit from the sun with silver edges; sun disc, moon, stars.
  - The horizon haze is also the fog colour. three.js mixes fog after tone mapping, so the fog is passed the tone-mapped haze (`neutralTone()`). This removed the pale band along the horizon.
- **Colour pipeline:** both renderers now use Khronos PBR Neutral tone mapping (AgX bleached sky and plaster toward white).
  - The sky fill takes the real sky colour (it was near-white).
  - The sun stays a strong key down to golden hour.
  - Aerial shadows now reach the neighbouring blocks (shadow half-size 46 → 120 m).
- **Materials:** neighbour façades drop from about 80% to 35–55% reflectance, in eight Basra tones (limestone, yellow brick, ochre, sand, grey concrete, sage).
  - The façade textures gain weathering: rain streaks under sills, slab-edge stains, mottling.
  - Traditional yellow brick on two tones.
  - Roofs: weathered screed.
  - Tower stone: #d8ccb6 → #c9b897.
- **Greenery:** empty plots are now gardens: a lawn with a paved edge and three to five trees each (`GARDENS`).
- **Level 11 lights:** a pendant over each of the five banquette tables for two and over every café table; warm festoon strings under both pergolas. Each globe is a light in Cycles, and the F11 shell now exports its lights.
- **Cycles:** a cloud layer coloured by the sky itself (white at noon, pink-gold at sunset).
  - Masters at 2560 × 1440; all 48 views re-rendered.
  - Web cuts at 960, 1600 and 2560. The old 1920 cut was an upscale of a 1600 image.
- **Photo site:** redesigned as a developer microsite, following the design-taste-frontend house rules. Its gate was not run (the photo site is a route inside the React app, not a static page).
  - Overview: an editorial hero that enters once; a statement section; a numbered chapter index with a live preview; residence spec sheets; a drag-to-compare day/night slider; amenities by level.
  - Viewer: chapter tabs; a position counter and progress line; time-stamped hour variants; click-to-zoom; an all-views drawer.
  - Equal content edges, hover lift and photo zoom, reduced-motion safe, RTL mirrored.
- **To undo:** revert the commit (renders: re-render with the previous commit).

### D22 — V11.5 owner notes, round 2: level-11 light, core, entrance, shadows, assistant, glass UI, film (2026-11-16, not owner-approved)
- **Asked for:** the owner's notes on screenshots: no light on the restaurant, café and especially the shisha terrace; no café door; empty spaces between the apartments; an empty entrance; shadow glitches when zooming out; unclear assistant answers; a more Apple-like UI; and a reel-style photo part.
- **Level 11 at night:**
  - Live 3D: on the terrace and the majlis, the three existing fill lights move under the pergolas and turn on warm after sunset. The light count is unchanged, so there is no shader stall.
  - Warm glow pools sit under each festoon string.
  - Cycles: each globe is a light (D21).
  - The lift-lobby entrance to the restaurant is now a glazed sliding door (it was an open arch).
- **Core:** lift shafts and service rooms are closed by a solid core cap at ceiling height. In the cut-away floor views they had read as dark empty boxes.
  - The lift lobby and corridors are furnished: a velvet bench and art on the solid west wall (clear of the apartment doors), corridor runners, plants and prints at the corridor ends, wall sconces, and a backlit level plate.
- **Cut-away views:** ceiling-mounted fittings (downlights, AC slots, smoke detectors, the living-room cove) now belong to the ceiling group and hide with it. No more floating dots.
- **Entrance identity:** a dark stone monolith west of the forecourt carries a bronze palm emblem (real geometry, both renderers), NAKHLA lettering, a lit reveal and a night uplight. The same emblem is on the wall behind reception.
  - A bollard moved to make room.
- **Shadows:**
  - The shadow area follows the camera distance in 10 m steps (24–180 m), so zooming out never shows the edge where shadows stop.
  - It is snapped to the shadow-map texel grid (no shimmer).
  - Normal bias scales with texel size (no acne on far façades).
  - The roof-crown lantern is toned down (it read as flat glowing boxes from above).
- **Assistant:**
  - Short keywords now match whole words only, with Arabic/Sorani prefixes and suffixes allowed. "الخدمات" no longer triggers a finish answer.
  - New answers in all four languages: greeting, project overview, amenity list, parking, location, cheapest unit (demo price with disclaimer), best unit, lifts, completion, security, night view.
  - "Gym and pool" questions now answer both.
  - The fallback gives example questions.
  - 28 typical questions checked.
- **Glass UI** (apple-design skill): frosted panel, sheets, toolbar and tabs on the high/ultra tiers only (GPU headroom over WebGL); solid elsewhere and under prefers-reduced-transparency.
  - Bright top edge, deeper shadow on larger surfaces, press feedback, tighter display tracking.
  - The photo site's bar and controls are frosted too.
- **Film mode** in the photo site: a story-style player (progress bars, tap or arrow navigation, pause, Escape) over 14 curated renders.
  - Slow camera moves and crossfades; kinetic word-by-word captions in the visitor's language; ends on the brand with "Explore the views".
  - The overview hero's secondary action is now "Watch the film" (3D stays in the bar switch).
- **Re-rendered:** restaurant (2 views), café, terrace (3), shisha lounge, street entrance (2), lobby (2), street arrival (2).

### D23 — V12: 2D plans section, phone/tablet pass, tooltips, core detail, Model One/Two, 4K photos, GitHub Pages (2026-11-16, not owner-approved)
- **Asked for:** a friend's test notes plus the owner's list (see `project_artifacts/V12_PLAN.md` for the full inventory and order of work).
- **2D plans, the third experience** (`src/plans/`): a vector viewer built from scratch (SVG, so it is sharp at any zoom), drawn from the same plan data as the 3D model.
  - Plans: walls; door leaves with swing arcs; windows and sliders; furniture outlines from the furniture footprints; room names, areas and W × D; overall dimension lines; north arrow; 5 m scale.
  - Level picker: a rail on desktop, a strip on tablets and phones.
  - Zoom: drag, pinch and wheel, plus buttons.
  - Layers: furniture, dimensions, names.
  - Details card (a bottom sheet on phones): previous / next room, size, area, clear height, floor finish, Open in 3D, See the photo.
  - Deep links `#/{lang}/plans?f=&u=&r=`. It replaces the old Lite view, including the no-WebGL fallback.
  - The switch is now 3D | Photoreal | Plans.
- **Entry screen:** a device choice ("Full quality" / "Smooth (phones, older computers)" / Plans), so weak devices start light.
- **Settings:** Motion and Graphics quality each get a one-line explanation (the friend could not tell what they did).
- **Tooltips everywhere** (`src/ui/Tooltips.tsx`): any icon-only button or element with `data-tip` shows a glass label after hover, or after a long press on touch screens.
- **Phones and tablets** (`tools/device_shots.mjs`: iPhone 15, Pixel 7, iPad Air portrait + landscape; every main screen with an overflow and tap-target audit):
  - The 3D top bar no longer overflows: language and sound move into the menu on phones, and the brand text hides.
  - The three-way switch is readable on the dark bar.
  - Minor room labels hide on phones (they piled up).
  - The floor rail has 32 px targets.
  - The photo viewer swipes on touch screens; the side arrows that covered the caption are hidden on phones.
  - The plans toolbar moved out of the plan (it covered rooms).
- **Dollhouse navigator** (`DollNav`): in floor and apartment views, previous / next buttons (and the arrow keys) step between apartments or rooms, highlighting each; the centre button enters it.
- **Naming:**
  - Apartments are "Model One / Model Two" (النموذج الأول / النموذج الثاني, مۆدێلی یەکەم / مۆدێلی دووەم, 一号户型 / 二号户型) everywhere, including the photo titles and assistant answers.
  - A unit reads "Model One · Floor 04" instead of "Apartment 04A". `translate()` derives it from the unit id, so every caller keeps working.
- **Core interiors:**
  - Stairs: stone treads with anti-slip nosings on concrete bodies, a landing, a steel balustrade with an oak handrail, a wall handrail on brackets, and a landing light.
  - Lift lobby: a dark stone inlay with a brass border, call panels and floor indicators at every lift, an oak slat wall, a cove ceiling, and a bench, art, runners, plants and sconces (D22).
  - Level 11 kitchen: a proper commercial kitchen (toe-kicks, worktops with upstands against the walls, shelves, a cooking line under a hood with its duct, and a low prep table under the window, replacing a 2 m block that stood in front of it).
  - Kitchen camera moved off the wall.
- **Photos:** 3840 × 2160 masters (all 48 views) and a 3840 web cut. The viewer asks for it only when zoomed (`sizes` switches to 210vw), so zooming stays sharp.
- **Hosting:** GitHub Pages from a separate public repository holding only the built site (`tools/publish_pages.sh`, portable GitHub CLI), replacing Netlify and its badge.
- **Bolder styles** (owner picked samples 2, 3 and 4 from `project_artifacts/device_qa/STYLE_SAMPLES.png`):
  - Photo home "Apple keynote": a centred 700-weight display headline and one tagline over the photo, two pills, and four 28 px tiles (Apartments, Amenities, Live 3D, Floor plans).
  - Photo viewer "floating glass": big-number fact tiles (area, level, time) and a white primary pill. On phones the Photos / 3D / Plans switch becomes an iOS-style floating tab bar.
  - 3D apartment panel "spec sheet": four big-number tiles, a dark demo-price card and a bronze primary pill.
