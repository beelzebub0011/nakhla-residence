# LOD and visibility — whole tower versus selected floor

Updated 2026-11-12. Status: root cause fixed and verified by screenshots; automated orbit/zoom screenshot-diff test **NOT_RUN** (not written yet).

## Reported defect

In the whole-tower view the rooftop terrace, shisha terrace and balconies looked empty: seating and planters appeared only after a floor was selected.

## Root cause (confirmed in code, not a culling bug)

All furniture — including outdoor furniture — was part of the floor **interior**, which is streamed only when a floor is opened (`Engine.ensureInterior`). The always-visible floor **shell** contained slabs, walls, glazing, fins and balustrades only. Frustum culling, layers, bounding boxes and LOD distance were not involved: the meshes simply did not exist until the floor was selected.

## Fix

- `furnishFloor(floor, 'outdoor')` now returns only the furniture of outdoor rooms (balconies, panoramic terrace, shisha terrace); `buildFloorShell` adds it to the shell, so it is present at every zoom level and in every state. `furnishFloor(floor, 'indoor')` feeds the streamed interior, so nothing is drawn twice.
- Furniture pieces became lazy (`modelkit.piece`): a piece that is filtered out is never generated, so the shell pays only for outdoor pieces.
- The nine residential shells share one geometry (cloned template), so balcony furniture costs memory once.
- Selecting or hiding floors only changes the *lifted* state and ghost materials of shells; it cannot remove shell furniture, and deselecting restores it (materials are looked up by slot, not replaced permanently).

## Evidence (live website)

`project_artifacts/evidence/exterior_after/`: `05_rooftop_F11_open` and `06_rooftop_F11_night` (terrace sets, shisha terrace seating, balcony sets on the floors below are visible), `01_tower_day` / `03_tower_night` (balcony furniture on every residential floor in the wide view), `09_terrace_F11` (near view of the same objects).

## Still to do

- Automated test: orbit at three distances × toggled floor selection with screenshot diff (T11 acceptance).
- A reduced-detail proxy for phones ("low" tier currently draws the same outdoor pieces).
- Roof plant enclosure and pergola still read as plain boxes from above.
