# Sound design — NAKHLA RESIDENCE

Updated 2026-11-12. Status: INTERNAL-QA (measured), PENDING-OWNER-REVIEW (listening). Source: `src/audio/ambience.ts`.

## Rules kept

- **Off on every page load.** No `AudioContext` exists until the visitor presses the sound button; opt-in is never stored; there are no `<audio>`/`<video>` elements; hiding the tab silences it (`tests/e2e/access.spec.ts`).
- **No downloads, no licences.** Every sound is synthesised in the browser from noise and oscillators — original material.
- **No surprises.** Nothing starts or stops abruptly: scene, weather and time changes re-target layer levels with a 1.2 s time constant (0.4 s in reduced motion); the master fades in over 1.6 s and out over 0.35 s; a limiter (−9 dB threshold, 12:1) sits before the speakers.

## Structure

Three buses (Music, Ambience, Effects) with their own sliders under More → Sound levels (four languages; perceptual square-law taper; levels are kept for the session only). The ambience is eleven layers mixed per scene:

| Scene | Where | Layers |
|---|---|---|
| exterior | tower, floor and apartment overviews | distant city, wind, birds (day), crickets (night), rain |
| terrace | balconies, panoramic terrace, majlis | wind (more), city (less), birds/crickets, a little conversation, rain |
| home | apartment rooms | room tone, ventilation, city through glass, rain heard through glass |
| lobby | ground floor | room tone, ventilation, faint conversation |
| pool / spa / gym | level 10 | water wash and drips with room reverb / soft room / ventilation |
| restaurant / café | level 11 | conversation (synthetic voices), cup and glass clinks, room reverb |

Weather: light rain adds rain (muffled indoors); dust and wind raise wind and gusts and reduce birds; night removes birds, adds crickets and lowers traffic. Music is a slow original four-voice pad through a low-pass and a soft delay. Effects: a soft air movement on view or section changes.

## Measurements (offline render of each scene with the site's own graph, 24 s, `tools/audio_render.mjs`; meters: earshot)

| Scene | Peak dBFS | RMS dBFS | Notes |
|---|---|---|---|
| exterior day | −4.1 | −25.3 | −24.0 LUFS, true peak −4.1 dBTP |
| exterior night | −15.6 | −30.2 | |
| exterior rain | −7.3 | −24.7 | earshot hears "heavy rain / rain on a roof" (strong) |
| exterior dust + wind | −7.9 | −22.9 | |
| terrace evening | −16.6 | −30.8 | |
| home day | −17.4 | −31.2 | |
| home with music | −15.2 | −29.0 | music audible but under the ambience |
| lobby | −16.8 | −30.9 | |
| pool | −15.3 | −30.6 | earshot: "ocean waves" (strong) |
| gym | −18.9 | −32.8 | |
| spa | −19.6 | −34.5 | quietest space |
| restaurant | −7.8 | −29.5 | −27.2 LUFS; earshot: "a busy café" (weak) |
| café | −4.7 | −31.0 | peaks are single cup clinks |

No scene clips; all stay well under 0 dBFS. Interior scenes sit around −29 to −35 dB RMS (calm, background level); exterior day and weather are about 5 dB louder.

## Honest limits

- Everything is synthesised. earshot classifies the conversation as only a weak "busy café" and also as "synth pad / robotic": it is a texture, not convincing speech. The clinks still read as chime-like.
- Real CC0 field recordings (crowd, pool, city) would sound more natural; the free sources that have them (e.g. Freesound) require an account to download — owner decision, not done.
- Not listened to on real headphones or speakers by a person; no long-term fatigue test.
- Door and slider sounds are not implemented (no sliding-door animation yet).

---

## V11.3 music rebuild (2026-11-13)

**Old music:** four oscillators gliding between chords every 12 s. The glides sounded like sirens, and there was no melody and no space.

**New music** (`src/audio/ambience.ts`, original, seeded and reproducible), a slow piece in **D major at 60 bpm** (Dmaj9 · Bm9 · Gmaj7♯11 · Asus2, 16 s per chord):
- **Pad:** warm string-like chords (two detuned saws per note, low-passed) that **cross-fade** with 3 s attacks and 4 s releases; there are no pitch glides.
- **Bass:** soft low piano-like notes on each chord, plus an occasional octave.
- **Melody:** sparse plucked notes (Karplus-Strong strings, pre-rendered per pitch) walking between chord tones. Phrases are two bars, then one bar of rest, with a little timing variation.
- **Space:** a generated 3.6 s hall (decaying, darkening noise impulse, 22 ms pre-delay).

**Still off on every page load**, as before.

**Measured** (earshot, 48 s offline render with the site's own graph, `node tools/audio_render.mjs <dir> 48 music_only`):

| | Old pad (V8) | New music |
|---|---|---|
| Music alone, default slider | about −44 LUFS (too quiet to notice) | **−30.5 LUFS**, true peak −17 dBTP, no clipping |
| Home scene with music | RMS −29.0 dBFS | RMS −28.8 dBFS: music sits under the room tone |
| earshot reading | — | "ambient synth pad music" (z +4.0), "dreamy and ethereal" (z +3.6); AudioSet Music 0.84, New-age 0.37 |

**Honest limits:**
- It is still **synthesised**: earshot hears a synthesizer (AudioSet 0.28), not acoustic instruments.
- A recorded, licensed score (for example CC0 or CC-BY piano or oud stems) would sound more premium. It needs downloads and licence review, which is the owner's call.
- No human listening test on speakers or headphones was possible here; this is measurement only.
