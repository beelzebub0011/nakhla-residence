# NAKHLA RESIDENCE — art direction bible (V11, from the reference study)

Written 2026-11-13 after studying the owner's seven Instagram reels frame by frame. Sources and timecodes are in `references/REFERENCE_MANIFEST.csv` and `references/SHOT_ANALYSIS.csv`; private study frames are not in the repository. These are **original principles** for NAKHLA. Nothing below copies a reference's building, composition, branding, prices or music.

## 1. What the references actually are

All seven reels are **phone recordings of real-estate websites shown on a laptop or monitor**, made to sell the website service. They are not architecture films. Their quality comes from three things:

1. **Path-traced stills and video** of the building (REF02–REF06), shown full-bleed.
2. **A thin, quiet interface** over them: one panel, one large numeral, a serif headline.
3. **Dense, believable context**: real or photoreal cities, water edges, street trees and lamps (REF01, REF04, REF06, REF07).

Several were filmed in a dark room, so the screen glows. That is presentation, not product. The products themselves are almost all *image-led sites* with a thin 3D layer: a floor picker, a dollhouse or 360° photos. **NAKHLA already does more in real time than any of them.** It trails them in photographic finish, context density and dusk lighting.

## 2. Principles adopted (each with its source)

| # | Principle | Seen in | NAKHLA action |
|---|---|---|---|
| P1 | **Dusk is the money shot.** Blue hour or late golden hour, with warm occupied windows against a cool sky, is the dominant hero light | REF02, REF03, REF05, REF06 | Make blue hour a first-class exterior state (lit windows, lamp pools, warm podium) in Cycles and live; use it for the gateway hero |
| P2 | **Street-level perspective with lamps lit** reads as photography; top-down aerials read as software | REF06 | New street-arrival camera at 1.6 m eye height, verticals kept straight (lens shift) |
| P3 | **Context is continuous and planted**: no empty plots, trees along every street, layered depth to the horizon | REF01, REF04, REF07 | Neighbour relief (balconies, shop bands, roof tanks), more street trees and date palms, layered far haze |
| P4 | **One hero, one panel, one numeral.** A frosted panel with a big floor number and a few words | REF02, REF03, REF04, REF06 | Large serif floor numeral in the floor picker; trim panel copy |
| P5 | **Serif display + small caps labels.** High-contrast light serif for titles and numerals, small spaced sans for labels | REF02–REF06 | Cormorant Garamond display (already bundled) for numerals/titles; an Arabic display face audition (§4) |
| P6 | **Choice → motion → place**: picking a floor moves the camera to it before cutting inside | REF02, REF03 | 3D already flies; the photo site uses a short directional dissolve with a floor cue |
| P7 | **Interiors: warm cove light + floor-to-ceiling glass + view** | REF03, REF05, REF06 | Cove/LED strips glowing in evening variants; photo site shows evening interiors |
| P8 | **Dollhouse on a dark neutral ground**, warm materials, furniture legible | REF01, REF05, REF06 | Keep the unit cutaway; darker, warmer cutaway backdrop in the photo site's plan views |
| P9 | **Amenities by level** beside a tower section | REF04 | Photo site "Amenities" chapter with a section diagram (G, F10, F11) |
| P10 | **Editorial residence page**: hero image, serif name, three key facts | REF04 | Photo-site apartment pages (Type A / B) with model-derived areas, no prices |

## 3. Rejected (with reasons)

- **Prices, "client paid" overlays, availability.** Out of scope; NAKHLA states no prices or availability.
- **Real-city photogrammetry (REF07).** The NAKHLA site is fictional; real 3D tiles would claim a real location.
- **Waterfront skyline as the hero backdrop** (REF02–REF05). Basrah sits on the Shatt al-Arab, but the NAKHLA plot is an inland fictional street block. Inventing a river view would mislead. Date-palm groves on the horizon are the honest local equivalent.
- **Heavy dark-navy UI throughout (REF04).** NAKHLA keeps the warm ivory / bronze identity, with dark glass only over photography.
- **Festoon string lights (REF06).** Off-brand for quiet luxury. Warm linear lighting on the pergola instead.

## 4. Palette and type (tested tokens live in `src/styles`)

- Exterior day: limestone ivory `#E9E1D2`, warm sand context `#D8C9AE`, bronze `#8A6A4A`, date-palm green `#4C6A38`, asphalt `#3F3F40`.
- Dusk: sky gradient navy `#1E2A44` → amber `#E8A25A` at the horizon; window glow `#FFC98F`.
- Interface: ivory glass over dark images, graphite text on light, one bronze accent.
- Type: Cormorant Garamond (display Latin, numerals), Manrope (UI Latin), Noto Sans Arabic (UI Arabic), plus an Arabic display face. Candidates under SIL OFL: Noto Naskh Arabic, Amiri, Reem Kufi. The choice is made from real screenshots in four languages.

## 5. Sound (not assessed from the references)

The reels were studied muted; their soundtracks are the creators' and were not analysed or reused. NAKHLA's sound stays original, procedural and off by default (`SOUND_DESIGN.md`).
