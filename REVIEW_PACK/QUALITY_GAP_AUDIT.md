# V11.3 fresh audit — gates, scenes and the reels

2026-11-13. Internal audit by Claude; it is **not owner approval**.

The audit walked the product from the entry screen in a clean browser, using the review-pack captures (`REAL_WEB_SCREENSHOTS/`, `PHOTO_MODE_SCREENSHOTS/`, `MOTION_CLIPS/`), the Cycles stills (`BLENDER_CYCLES_REFERENCES/`) and two private four-way sheets (`INSTAGRAM_COMPARISONS/`, git-ignored, never to be published).

Scores are indicative 0–5 internal ratings with evidence. They are not measurements.

## 1. The ten gates

| Gate | Status | Evidence | What is still missing |
|---|---|---|---|
| 1 Navigation hitch | **PASS (internal, desktop)** | Warm, 20 cycles × 3 runs: 0 frames > 40 ms (was 158–285 ms). Cold worst 86 ms (was 316). Test-suite record: per-step worst 22.9 ms, 0 > 50 ms | Two cold first-visit frames (69–98 ms). Phones: UNVERIFIED |
| 2 Exterior architecture | **PARTIAL** | New entrance portal (fins, deep canopy, downlights, lettering, polished forecourt); street and aerial views in both renderers | The tower façade itself was not rebuilt in V11.3: no panel joints, mullion profiles or crown gesture beyond V8. Still reads as clean massing up close |
| 3 Surrounding world | **PARTIAL, much improved** | District to ≈700 m on a street grid, skyline to 2.6 km, ground to the horizon, haze in both renderers, lit city windows after sunset (Cycles now too), 293 trees, slow traffic, lit shops | No people. District blocks are repeated boxes with one window texture each. Trees read as cards up close in the live view |
| 4 Golden Apartment | **PARTIAL (unchanged in V11.3)** | V8 work: furnished Type A, baked light, 10 Type A stills | No new modelling this round (switches, sockets and diffusers exist from V8; coves, curtains and textiles not revisited) |
| 5 Amenities + Type B | **PARTIAL** | All rooms of both plans now have a photo view except laundries and halls; lobby night, wellness lounge, terrace evening and shisha lounge added | Amenities are furnished but plain (lobby lacks a double-height drama). B_dressing framing is too tight |
| 6 Photoreal website | **PARTIAL, strong** | 44 Cycles views in 5 chapters, hour variants, filmstrip, facts from the model, honest fallbacks, plain-language render label | 6 rooms fall back to a related view. Photo quality still below the reels (§2) |
| 7 Entry, switching, UI, type | **PARTIAL** | Gateway in 4 languages; **bug fixed**: bare language links (`#/en`) ignored the language. Jargon removed from 4 visible strings in 4 languages | No UI redesign in V11.3. Phone/tablet layouts captured in emulation only; no real devices |
| 8 Sound, AI, localisation | **PARTIAL** | Music rebuilt and measured (−30.5 LUFS, D major, cross-fading pad + plucked melody + hall). The assistant's welcome and example chips are shown on first open; unknowns are answered honestly (unit tests) | Music is still synthesised. No human listening test. Sorani/Chinese/Arabic need native review |
| 9 Integration, performance, regressions | **PASS (internal, desktop)** | 65/65 unit, 60/60 browser. Live world with traffic: p95 8.4 ms. Resources flat over 20 cycles. Contact audit: 547 objects, 0 warnings | Draw calls ≈560–610 and ≈1.2 M triangles: heavy for phones (UNVERIFIED) |
| 10 Fresh audit + reels review | **PARTIAL** | This audit and two four-way sheets (exterior dusk vs REF06, interior blue hour vs REF03) | REF01 capture failed (the reel tab froze); only 2 of the planned 4 scenes compared |

## 2. Against the reels, by scene (A reference · B Cycles · C live 3D · D photo site)

| Scene | Ref | B | C | D | Why the gap remains |
|---|---|---|---|---|---|
| Exterior at dusk (REF06 @0:03) | 4.5 | 3.6 | 3.2 | 3.6 | The reference is an elevated 3/4 view over a dense, warmly lit historic city with a saturated sunset band. NAKHLA now has lit windows, haze and a new elevated dusk view (`exterior_dusk`), but its neighbours are simple boxes and its sky is paler |
| Interior blue hour (REF03 @0:12) | 4.5 | 3.4 | 3.0 | 3.4 | The reference has a full glass wall onto water, a cove-lit ceiling and wide, calm framing. NAKHLA's living room has smaller openings and a tighter frame; the outdoor view is city, not water (no waterfront is invented: fictional inland site) |
| Aerial context midday (REF01) | 4.5 | 3.5 | 3.3 | 3.5 | Not compared side by side (capture failed). From the shot notes: the reference shows real photogrammetric city texture; NAKHLA's is generated |
| Street level | 4 | 3.6 | 3.2 | 3.6 | Street trees, palms, traffic and lit shops now exist. Missing: people, signage, street wear |

**Weighted exterior (internal): Cycles ≈ 3.6 · live ≈ 3.3 · photo site ≈ 3.6 / 5 against ≈ 4.4** (round 2: 3.5 / 3.2). The gap remains, and the largest levers are listed in `REMAINING_ISSUES.md`.

## 3. Differences between the three renderings

- **Cycles vs live:**
  - Cycles has path-traced light, soft shadows, real lamp and downlight light, translucent leaves, true reflections (the polished forecourt) and denser-looking trees.
  - The live view uses shadow maps, lamp-pool decals, a matte forecourt, card trees, flat lobby glass in street view and a deeper blue hour.
- **Photo site:** shows the Cycles stills full-bleed with honest labels, so it is as good as the stills.
- **The live 3D's own strength:** what neither still form can do: walking, finishes, hours, weather and traffic.

## 4. Found and fixed during this audit

1. **Bare language links:** `#/en`, `#/ckb` and `#/zh` opened in Arabic. Fixed, with a unit test.
2. **Palms in Cycles:** every palm trunk was half underground, so crowns floated. Fixed, and all views re-rendered.
3. **Horizon in Cycles:** a sky band showed below the horizon, beyond the ground plane. Fixed.
4. **City windows in Cycles:** neighbour windows were dark at dusk and night, unlike the live site. Fixed with the shared lit-window map.
5. **Visitor-facing jargon:** "Cycles render", "path-traced" and "offline render" replaced in 4 languages.
6. **Terrace view title:** the "terrace at night" view read as late evening; retitled.
