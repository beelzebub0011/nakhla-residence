# Remaining issues (V11.5, 2026-11-15, after the environment, light and photo-site overhaul, D21)

Ordered by visual impact against the reels. None of these is owner-approved. "Needs owner" means a paid, download or licence decision.

| # | Issue | Where | Next step | Needs owner? |
|---|---|---|---|---|
| 1 | **Improved in V11.4 (D13).** The district within 250 m now has shop podiums and four upper-floor treatments. **D19:** four window kinds, AC units and curtains per façade. Still no signage text | aerial and street views | Signage | no |
| 2 | No people | street, lobby, terrace | Licensed CC0 character assets (e.g. Quaternius), few and well scaled. Owner answered "not yet" on 2026-11-14 (D12) | **yes** (download) |
| 3 | **Improved (D19).** Tower windows now have mullion pressure caps, head caps and stone sills with drips; stone joints are finer. Panel joints in the façade frame are still plain | street and entrance views | Optional: recessed joints in the stone frame | no |
| 4 | **Done (D20).** Interior hero: cove-lit ceiling (both renderers, light map re-baked) and a level corner camera in the Type A living room; plan dimensions unchanged | Type A living | Optional: the same cove in Type B living and the master bedroom | no |
| 5 | Live trees read as flat cards up close. **V11.4 added** 487 light avenue/yard trees and parked cars in the district (D17); the close-up look is unchanged | live street views | More, smaller cards and a near level of detail | no |
| 6 | Live lobby glass is a flat panel in street view | live entrance | Load the G interior for street views | no |
| 7 | Music is synthesised | sound | Licensed recorded stems (CC0 / CC-BY piano or oud) with licence ledger | **yes** (download and licence) |
| 8 | **Mostly done in V11.4 (D15).** Hall and laundry views added and B_dressing reframed. A_laundry has no view (the room is 1.2 m wide) | photo site | — | no |
| 9 | Cold first visit: two 69–98 ms frames when a floor is opened in the first second | live 3D | Build the first floor's meshes in the worker | no |
| 10 | Phones, tablets, Safari, Firefox not tested; draw calls ≈600 | all | Test on real devices; a phone tier with district LOD | **yes** (devices) |
| 11 | Arabic, Sorani and Chinese copy not native-reviewed | all text | Native reviewers | **yes** |
| 12 | Only 2 of 4 planned reel comparisons; the REF01 frame capture failed | review | Re-capture REF01/04/05 frames in the owner's browser session | no (read-only) |
| 13 | **Fixed in V11.4 (D14).** Horizon hairline in Cycles aerials | `exterior_*` | — | no |
| 14 | **Tower crown** (Form Architects study P5): an open frame above the roof would give the silhouette a finish | tower | **DONE 2026-11-14:** previewed, then adopted by the owner. `buildCrown()` in `prims.ts`; D18 | no |
| 15 | **Demo prices** rest on weak comparables: asking prices only, read through search summaries, and a crowd-sourced index | pricing | Replace `base.ratePerSqm` in `src/data/pricing-demo.json` if the owner prefers another anchor | owner's call |
| 16 | Form Architects reels: 6 of 18 known from their captions only; no audio assessed | study | View the remaining reels in a later read-only session | no |
| 17 | **Fixed in V11.5 (D21).** Neighbour lots stood in the main street, the side street and the rear lane; far skyline boxes on district roads | live 3D + Cycles | Guarded by `tests/unit/streets.test.ts` | no |
| 18 | **Done (D21).** White, flat city and a weak sky in every hour and weather | both | New sky dome, PBR Neutral colour, realistic façade colours, gardens | no |
| 19 | Amenity floors (dining, wellness) use compressed light-map gains under PBR Neutral (`lightmaps.ts`); a re-bake per floor would give exact values | live 3D | Re-bake F10/F11 light maps and recalibrate | no |
| 20 | The photo site follows the design-taste-frontend rules, but its scripted gate was not run (route inside the React app) | photo site | Run the gate against the built page if a static export is made | no |

