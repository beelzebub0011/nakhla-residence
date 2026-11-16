# V12 plan: owner + friend feedback (2026-11-16)

Working plan for the assistant. Order is chosen so the long 4K render can run overnight while UI work continues.

## Feedback inventory (owner + friend, translated)
| # | Source | Note | Action |
|---|---|---|---|
| F1 | friend | On desktop the 2D floor stack cannot be scrolled sideways; a huge "i" icon covers the text | New 2D section (V12-2D) replaces the old 2D view; icons sized by CSS, never by SVG default |
| F2 | friend | Free walk in the restaurant and lift lobby: the camera passes into walls and door frames; "gaps in the wall" | Bigger walk body radius, near-plane 0.05, door frames as obstacles, no camera inside joinery |
| F3 | friend | F11 kitchen: furniture should read as separate from the building (gap lines at wall junctions) | Real commercial-kitchen kit (counters with splashbacks, hood, shelving) set off the walls; skirting |
| F4 | friend | Guided view from above: add buttons to move, far rooms are unclear from some angles | Dollhouse navigator: room / apartment stepper (previous / next), keyboard arrows, click-to-fly |
| F5 | friend | Settings "Motion: calm / reduced" not understood; split strong/weak devices at the start | Each setting gets a one-line explanation; the entry screen offers "Full quality / Smooth (phones, older computers)" |
| F6 | friend | Photos blur when zoomed | 3840 × 2160 masters + a 3840 web cut used only when zoomed; zoom capped at native resolution |
| O1 | owner | 2D must be its own section (3D / Photos / 2D) and rebuilt from scratch | V12-2D: vector plans (SVG), tower stack, floor plans, apartment plans with furniture and dimensions, room cards, compare, measure; crisp at any zoom |
| O2 | owner | Mobile and iPad UX is cramped and hard to use | Simulate iPhone 15, Pixel 7, iPad Air and iPad Pro (portrait + landscape) with Playwright; fix every overlap, tap target and cramped layout; bottom-sheet panels |
| O3 | owner | Apple-style glossy UI, less clutter | Fewer, clearer controls; glass materials on all tiers that can afford it; tooltips; consistent icon buttons |
| O4 | owner | Tooltips on hover explaining each control | Shared tooltip component (hover + long-press), every icon button labelled |
| O5 | owner | Core / lift lobby / stairs need the same detail as the apartments | Proper stairs (treads, risers, nosings, stringers, handrails, balustrade, landings), fire doors with vision panels, lift doors with call buttons and indicators, stone floor inlays, wall panelling, cove lighting, signage |
| O6 | owner | Names: "Model One / Model Two", not "Apartment 04A" or "Type A/B" | i18n: النموذج الأول / النموذج الثاني, Model One / Model Two, مۆدێلی یەکەم / مۆدێلی دووەم, 一号户型 / 二号户型 |
| O7 | owner | Free movement from above between rooms and apartments | Same as F4 + double-click a room in the dollhouse to enter it |
| O8 | owner | Hosting: GitHub, nothing annoying beside the project; test before sending | GitHub Pages from a public repo that holds only the built site; tested on phone and desktop |

## Order of work
1. Model detail first (O5, F2, F3), then export and start the 4K render (F6) in the background.
2. V12-2D section (O1, F1).
3. Mobile / iPad simulation and fixes (O2), with the tooltip system and clearer settings (O4, F5, O3).
4. Dollhouse navigator and naming (F4, O7, O6).
5. Tests, docs, commit, publish on GitHub Pages, test the public link on emulated phone, tablet and desktop.
