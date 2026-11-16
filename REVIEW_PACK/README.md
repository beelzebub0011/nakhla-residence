# NAKHLA RESIDENCE — V11.3 review pack

Captured 2026-11-13 from the production build (`npm run build && npm run preview`, http://127.0.0.1:4173) with the installed Chrome, headless with GPU, on one Windows desktop (RTX 3050). **Pending owner review; nothing here is approved.**

| Folder / file | Contents |
|---|---|
| `REAL_WEB_SCREENSHOTS/` | 22 real browser screenshots of the entry screen (4 languages + phone) and the live 3D (tower day/golden/night, street view, floor, unit, rooms, lobby, pool, terrace, assistant, Sorani/Chinese, phone, tablet) |
| `PHOTO_MODE_SCREENSHOTS/` | 13 real screenshots of the photoreal website (overview AR/EN, 10 scenes, phone) |
| `BLENDER_CYCLES_REFERENCES/` | the Cycles stills the photo site uses |
| `MOTION_CLIPS/` | 3 interaction recordings (webm): tower → apartment → room → tower; street view with traffic at dusk; 3D ↔ photo switch in the same room |
| `INSTAGRAM_COMPARISONS/` | **private, git-ignored**: four-way sheets (reel frame / Cycles / live / photo site). For the owner's eyes only; never publish |
| `QUALITY_GAP_AUDIT.md` | the 10 gates, per-scene comparison with the reels, renderer differences, what the audit fixed |
| `REMAINING_ISSUES.md` | ordered backlog, with what needs the owner |
| `PERFORMANCE_MEASUREMENTS.md` | the numbers and how to reproduce them |
| `CREDITS_AND_LICENSES.md` | every third-party asset and its licence |
| `capture_log.json` | what was captured, at which viewport, and any page errors (none) |

To regenerate: `node tools/review_pack.mjs` (screenshots and clips) and `python tools/fourway.py` (private sheets).
