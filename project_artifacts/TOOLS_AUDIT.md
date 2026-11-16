# Tools audit for the NAKHLA RESIDENCE session — 2026-11-12

Read-only audit. Nothing was installed, reinstalled, modified or downloaded for it. Every "works" below was checked by running the tool, not by reading a list.

## 1. Local tools

| Tool | Where | Checked how | Result | Used by the project |
|---|---|---|---|---|
| Blender 5.2.3 LTS | `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` | `--version`, background Python | **Works.** Cycles sees the RTX 3050 through OptiX and CUDA, plus the Ryzen 5 3600. | Cycles renders, light bake, `.blend`/`.glb` |
| — Blender on PATH | — | `command -v blender` | **Not on PATH.** `npm run blender` called a bare `blender` and would fail from a normal terminal. | Fixed in the project by `tools/blender.mjs`, which finds the existing install (no reinstall) |
| NVIDIA RTX 3050 8 GB | driver 610.88 | `nvidia-smi` | **Works.** About 2.8 GB of VRAM was already in use while idle → one heavy GPU job at a time (bake *or* browser tests). | WebGL tests, Cycles |
| FFmpeg / ffprobe 9.0.2 | winget links | `-version` | **Works.** | audio encoding, video evidence |
| Node 22.23.3 + npm 10.9.9 | `~/.proto/tools/node/22.23.3` | `node -v` | **Works**, but only when that folder is added to PATH (proto-managed). `START_NAKHLA.cmd` already does this. | build, tests |
| Python 3.12.10 | user install | import test | **Works** with numpy 2.5.4 and Pillow 13. scipy, soundfile, librosa, OpenCV, torch are **not** in this interpreter. | texture processing, contact sheets (numpy + Pillow are enough) |
| Google Chrome | `C:\Program Files\Google\Chrome\Application` | used by Playwright (`channel: 'chrome'`) | **Works** with the real GPU (ANGLE D3D11). | all browser tests and screenshots |
| Playwright 1.65 | project `node_modules` | ran | **Works.** It drives the installed Chrome; no second browser was downloaded for the project. | e2e, visual baselines |
| Git 2.55 | Git for Windows | `--version` | **Works.** | checkpoints |
| GitHub CLI, ImageMagick, SoX, VS Code CLI | — | `command -v` | **Not installed / not on PATH.** Not needed: Pillow and FFmpeg cover the same jobs. | — |

## 2. MCP servers connected to this session

| Server | Checked how | Result | Relevance to NAKHLA |
|---|---|---|---|
| earshot | `doctor` | **Healthy.** Both listening models are cached locally; sound bank of 252 sounds; meters (LUFS, true peak) work. `llm_critique` is **unavailable** (no Gemini key, and it would upload audio — not used). | Audio stage: measure loudness, clipping, loop seams, "real vs synthetic" |
| EffectCraft 0.23.1 | `get_state` | **Responds** (headless; 761 commands, 308 effects). Headless mode reports `gpu: false`. | Not needed for the website. Could title a promo video later. |
| FilmCraft | `project_inspect` | **Responds** (empty project). | Not needed for the website. Could cut a walkthrough video later. |
| ElevenLabs | listed, OAuth configured | **Reachable but not used:** every generation spends paid credits → needs your approval first. | Blocked by your cost rule, not by a fault |
| Built-in browser (Claude Browser) | used this session | **Works.** | Live preview of the site |
| Claude in Chrome | listed | Available; not needed (the built-in browser and Playwright cover it). | — |
| claude-artifacts, visualize, terminal, scheduled-tasks, mcp-registry | listed | Available; not relevant to building the site. | — |
| Blender MCP | — | **There is none.** Blender is driven by background Python scripts (`blender -b --python …`), which is reliable and needs no extra install. | — |

## 3. Skills and plugins

- **User-level skills (33, in `~/.claude/skills`)**: audio-edit, cap, captions, claude-motion-sound, claude-motion-taste, cold-open-creator, cutting-rhythm, earshot, editor, find-skills, hook-and-headline-writing, howseen-motion-design, iraqi-voice-director, lemo-opuscar, motion-video-director, opus-sound-layer, real-sound, remotion-graphics, remotion-turbo, review-loop, short-form-script, short-form-video, transcript-polisher, video-caption-creation, video-overlay, video-transitions, web-sims, youtube, youtube-script-writer, yt-edit, yt-plan, yt-retention, yt-script.
- **Project-level skills**: none (`.claude/skills` does not exist in `C:\PC\Claude` or the project).
- **Plugins installed**: `elevenlabs` (paid service) and `replica-skill` (website cloning — not relevant and not used).
- **Relevant to this project**: `earshot`, `real-sound`, `opus-sound-layer`, `claude-motion-sound` (audio stage) and `review-loop` (render → contact sheet → critique → fix, the method used for the visual work).
- **Gap**: there is **no installed skill for Blender, archviz, Three.js architecture or PBR materials**. That work is done directly with Blender Python, Three.js and the project's own modelling kit. I did not search for or install new skills (your rule: review and approval first).

## 4. Not accessible, and why

| Item | Why |
|---|---|
| VoiceStudio backend (`localhost:3900`) | Installed, but its backend setup never completed (see `~/AI-Tools/AI_TOOLS_INSTALLATION_REPORT.md`). Not needed for the site. |
| Open Generative AI | Not installed (your earlier choice). |
| OpenProject / OpenSEO / Chatwoot / Cal.diy | Deferred — need Docker, which is not installed. Not needed. |
| Higgsfield and any paid generation | Blocked by your instruction; never started. |
| Physical phones / tablets / Safari / Firefox | Not present in this environment → real-device tests stay NOT_RUN. |
| Screen readers (NVDA / VoiceOver) | Not driven from here → accessibility-by-ear stays NOT_RUN. |

## 5. No duplicated installations

- Blender, Chrome, FFmpeg, Node and Python are the copies already on this PC; the project only points at them.
- `node_modules` holds the project's own libraries (three, react, vite, vitest, playwright) — normal per-project dependencies, not a second copy of a tool.
- The only files added from outside are the 39 CC0 texture/HDRI files you approved (`assets_src/polyhaven`, 41.6 MB), listed in `ASSET_LICENSE_LEDGER.csv`.

## 6. Craft applications (remediation §18) — audited 2026-11-12, read-only

Found on this PC: ArtCraft (+ launcher), Craft Anything, EffectCraft, FilmCraft, MaterialCraft, PdfCraft, SolidCraft, SoundCraft, TextureCraft, VectorCraft. **Not installed:** DesignCraft, PhotoCraft, AniCraft, FigCraft (nothing installed in their place).

| App | Integration path found | Used here? | Why / what it did |
|---|---|---|---|
| **PdfCraft** | `pdfcraft-cli` (info, text, render, check) | **Yes** | Verified the visitor's exported "My apartment" PDFs (English + Arabic, generated by `tools/pdf_export_check.mjs`): owner name "Rashid Omar Mohammed" / "رشيد عمر محمد", phone and email present, no "راشد"; it also exposed raw finish codes (`MAT_…`) printed in the Arabic PDF (logged as P2). Evidence: `project_artifacts/evidence/pdf/` |
| EffectCraft | MCP (connected) | No | Motion-graphics compositor; the site's motion is real-time 3D. Useful later for a promotional film. |
| FilmCraft | MCP (connected) + `filmcraft-cli` | No | Video editor; useful later to cut a walkthrough film from Showroom-mode captures. |
| MaterialCraft | `materialcraft-cli` (Substance-style `.sbs` graphs, headless) | No | Could author tileable PBR materials; the current scans + procedural textures already meet the need. Candidate for custom stone / terrazzo finishes later. |
| TextureCraft | `texturecraft-cli` (mesh-map bake: AO, curvature) | No | Could bake per-furniture AO maps; the floor-irradiance map + GTAO cover it now. Candidate if low-tier devices need baked AO. |
| SolidCraft | `solidcraft-cli` (parametric CAD, STEP/STL) | No | CAD kernel; the parametric TypeScript modelling kit is the source of truth. |
| SoundCraft | `soundcraft-cli` (+ MCP server) | No | The sound is procedural in the browser; earshot was used to measure it. Could normalise future recorded assets. |
| Craft Anything | `craft-anything-cli` (MCP, doctor, report) | No | General investigation tool; not needed. |
| ArtCraft, VectorCraft | desktop apps | No | No headless path used; the UI icons are original SVG paths already. |

Nothing was installed, reconfigured or registered during this audit.
