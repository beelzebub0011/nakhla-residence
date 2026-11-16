# NAKHLA rebuild priority map (from the Form Architects study)

The study is in `FORM_ARCHITECTS_SHOT_BREAKDOWN.md`. Priorities follow the owner's order: exterior and urban context first, then light, materials, real-time vs Cycles fidelity, life, interiors and UI.

Phase B (implementation) starts only after the V11.4 render batch is finished, tested and committed.

| P | Gap (confirmed in NAKHLA) | Reference | Fix | Renderer | Status |
|---|---|---|---|---|---|
| 1 | **Canopy density.** District streets and blocks within ~250 m have few trees; the city reads as bare roofs from above | FA01 0 s and 7 s, FA03 10.7 s, FA08 10.8 s | Street trees along district avenues (both sides) within 250 m; one in eight district lots becomes a small planted square; Basrah species (palms and evergreen broadleaf, **not** autumn colours) | both | Phase B |
| 2 | **No parked cars in the district.** The aerial streets are empty | FA08 4 s, FA11 3.1 s | Low-poly parked cars along district kerbs within 250 m (shared prims: body + cabin + glass, three colours) | both | Phase B |
| 3 | **No unit-by-type or price highlight on the tower** | FA09 11.8 s, FA10 15.5 s | The pricing section tints the selected unit on the live tower and moves the camera to it | live | Phase B (pricing) |
| 4 | **Night city is uniform.** No uplit trees, no lit paths | FA03 7.7 s, FA11 15.1 s | Uplights at street trees near the tower after sunset (live: emissive ring + glow pool; Cycles: small spot lights) | both | Phase B, if budget allows |
| 5 | **Tower crown.** The roof ends flat (issue #3) | FA01 10.7 s | An original crown: the façade frame continues 2–3 m above the roof as an open frame round the plant screen. **Needs owner aesthetic review** (it changes the silhouette) | both | **done, owner-adopted (D18)** |
| 6 | **Interior hero.** NAKHLA's glass wall is narrow, with no cove light (issue #4) | FA06 3.9 s, FA07 5.9 s | Cove-lit ceiling detail in the Type A living room; the restaurant timber ceiling gets light strips | both | later |
| 7 | **No people** | FA02 15.1 s, FA03 4.7 s | CC0 people (owner said "not yet", D12) | both | blocked (owner) |
| 8 | **No time readout while scrubbing the hour** | FA02 | A large clock label in the environment panel while dragging | live | small, Phase B |
| 9 | **No street-level "drop here" pin** | FA04 15.3 s | Later; NAKHLA's street bookmarks already cover arrival | live | later |

**Do not copy:**
- the Tomis or Pontus tower forms;
- their autumn palette (NAKHLA is in Basrah: palms, evergreen trees, dusty sky);
- their UI chrome, title-card typography or logo.
