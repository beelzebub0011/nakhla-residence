# Architectural concept and parametric brief

## One geometry, many outputs
One canonical metric-unit data model drives Blender geometry, floor plates, viewer interaction, plan labels, marketing areas, hotspot anchors, camera poses and renders. Establish coordinate system, origin and floor elevation grid. Never freehand a photograph independently from unit plan. Produce elevations/plans/sections as *concept visualization* with clear disclaimer, not for permitting or construction.

## Site and massing
Earlier planning assumption: hypothetical 24m x 32m parcel (~768m²), tentative tower footprint 18m x 24m (~432m²). These are DESIGN HYPOTHESES ONLY. A 3m side margin and other setbacks, coverage, parking, access, code, sunlight, area, lobby/plant rooms, stair sizing and evacuation route feasibility must be tested. The earlier numerical assumptions may be mutually incompatible with actual site/regulations; do not silently treat as lawful. Allow Claude to revise footprint/plot size and provide calculations. Do not invent a real street address or waterfront view. If using a notional streetscape, label it conceptual Basra atmosphere, not real drone imagery.

## Floors and numbering
G: lobby, secure entry, mail/parcel, reception, management/security, service rooms, shared circulation, separate amenity access, service/loading, possible parking approach (parking demand is not solved by one pad). Lobby may be double height but do not pretend an extra occupied floor exists; model double-height volumetric opening accurately.
01-09: two apartments per floor, opposite orientations where feasible, shared lobby, elevator(s) after capacity study, protected exit stairs as validated, vertical MEP/service shafts. Bounded sound/privacy adjacency. Accessible paths, balconies, daylight and ventilation with actual window placement.
10: wellness club with safe proposed gym, pool, wet areas, changing rooms, reception, equipment/service rooms and MEP; pool in an elevated location requires structural loading, waterproofing, leak detection, humidity/condensation treatment, slab deflection, vibration, emergency egress and acoustics feasibility. Provide an architectural alternative — move pool to low-level podium or roof terrace while preserving virtual highlight — if feasibility fails. Never present the level as signed off.
11: restaurant + specialty café + panoramic terrace + shisha zone only if allowed by local codes/policies and with separate/safe air paths; isolate smoke from apartments, fresh-air intakes and nonsmoking patrons. Kitchen grease extraction, service elevator/path, fire suppression, deliveries, drainage, food safety, grease traps, waste, acoustics, and elevator traffic must be addressed conceptually. Prefer exterior shisha area and clear separation; if feasibility impossible, alternative non-smoking terrace lounge.
Roof: controlled maintenance/service equipment; not an occupied Floor 12.

## Concept dimensions and consistency
Starting concept residential gross: 432m² plate; unit A 125m², B 145m² => 270m² combined; ~162m² plate available for commons, vertical shafts, structure and wall thickness depending on definition. This is not an exact fit-out calculation; confirm net vs gross, circulation, setbacks and balcony treatment. Express area uncertainty honestly, and avoid fabricated construction feasibility. Floor-to-floor elevations derived from one source; no floating levels or intersecting stairs.

## Exterior visual language
- Base/mid/crown hierarchy; dark tactile base cladding, warm-ivory stone midsection, subtle bronzed aluminum vertical fins and window frames, generous recesses and shaded usable balconies, elegant crown/roof screen.
- Keep facade elevations aligned to actual room apertures: living room/front balcony, bedrooms/quieter openings, kitchens/ventilation, stair/service strips. Window/grid variation must derive from plan, not random facade detailing.
- Environment: palms and restrained native-inspired landscaping, shaded pedestrian approach, compliant/drop-off/vehicle separation, no impossible vehicle circulation. Drainage/maintenance/weathering considered for Basra heat, UV, dust, salt/humidity variability.
- Materials with true PBR roughness/normal/displacement where suitable; real edges/chamfers, glass thickness/IOR where physically useful, measured tone mapping and controlled exposure. Avoid glossy plastic-looking stone, opaque black glass, repeated clone vegetation.
- Day/night controls: realistic changes to sky, sun, façade luminance and interior lights; avoid overexposed neon night scenes.

## Unit plans and room adjacency
Type A: foyer -> living/dining -> shaded balcony; semi-open kitchen and real ventilation; master + ensuite; secondary bedroom; shared bath; laundry/storage; access/circulation. Type B: 3-bedroom alternative with living/dining, separated kitchen optional, master+ensuite, shared bath, optional guest WC if feasible; no phantom rooms.
For every unit supply room polygons (metric), area, door swings, window openings, wall thickness, path graph, accessibility criteria as feasible, room IDs, material slot IDs, camera anchor, level ID, east/north assumptions. Furnish realistically with correct sizes/clearances; evaluate actual room usability, not just visual richness.

## Building services and codes
Before claiming compliance, research and cite current local municipal building rules and competent licensed professionals. Verify feasibility of two exit stairs and elevator capacity, fire egress, occupant load, wind and seismic considerations, pool load and isolation, restaurant MEP, shisha rules, electrical backup, refuse, water pressure, parking, accessible entry. Include a "requires licensed review" badge in technical deliverables. Optimize conceptual presentation, not permit approvals.

## Deliverable outputs
Original .blend authored assets, parametric Python scripts, facade elevations, floor stack, site diagram, floor plans, room polygons, glb exports with semantic clickable mesh IDs, still-render hero scenes (day/night) and scene-to-UI coordinate map. Keep measured dimensional consistency, scene naming conventions and visual QA comparisons across views.
