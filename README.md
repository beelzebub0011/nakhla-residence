# NAKHLA RESIDENCE · نخلة ريزيدنس

**An original, fictional, interactive 3D residential tower concept — not a real property listing.**
**مشروع تصوّري أصلي للعرض التقني، وليس عقاراً حقيقياً معروضاً للبيع.**

Created by **Rashid Omar Mohammed** — +9647700864990 — rashid.iq12@gmail.com

---

## العربية — التشغيل بسرعة

1. شغّل الملف `START_NAKHLA.cmd` (نقرتين). يبني الموقع إذا لزم ويفتحه على `http://127.0.0.1:4173`.
2. أو من الطرفية:
   ```
   npm install
   npm run build
   npm run preview
   ```
3. الصوت مغلق دائماً عند فتح الصفحة. اللغة الافتراضية العربية، ويمكن التبديل إلى الإنكليزية والكردية السورانية والصينية المبسّطة.

**ما الذي يعمل فعلاً:** برج ثلاثي الأبعاد تفاعلي (١٢ طابقاً)، اختيار طابق بالنقر على الواجهة، ١٨ شقة، دخول الغرف بحركة كاميرا هادئة وآمنة عبر الأبواب، تبديل التشطيبات الحقيقي على أسطح ثلاثية الأبعاد (٦ فئات × ٣ عيّنات)، ٤ أنماط كاميرا داخل «تجوّل»، النادي الصحي (الطابق ١٠) والمطاعم العلوية (الطابق ١١)، الوقت والفصل والطقس (محاكاة)، المساعد العقاري «اسأل نخلة» (يجيب من بيانات المشروع فقط ولا يخترع أرقاماً)، نسخة 2D خفيفة كاملة، ملخص «شقتي» مع رابط مشاركة وطباعة PDF، واستفسار تجريبي لا يرسل شيئاً.

**ما لم يُنجز أو لم يُختبر:** الاختبار على هواتف وأجهزة لوحية حقيقية، Safari و Firefox، قارئ الشاشة، جلسات راحة الحركة مع مستخدمين حقيقيين، ومراجعة الترجمات من متحدثين أصليين. التفاصيل في `project_artifacts/FINAL_DELIVERY_REPORT.md`.

---

## English — quick start

| Step | Command |
|---|---|
| One-click (Windows) | double-click `START_NAKHLA.cmd` |
| Install (pinned, from `package-lock.json`) | `npm install` |
| Production build | `npm run build` |
| Serve the build locally | `npm run preview` → http://127.0.0.1:4173 |
| Developer server | `npm run dev` → http://127.0.0.1:5173 |
| Unit tests (50) | `npm test` |
| Browser tests (53, needs Google Chrome) | `npm run e2e` |
| Motion HUD (developer only) | open `/?hud=1` |
| 2D Lite directly | open `/?lite=1` |

Requirements: Node.js 22 (this machine uses proto: `~/.proto/tools/node/22.23.3`), Google Chrome for the browser tests, Blender 5.2 only to rebuild the `.blend`/renders. No API keys, accounts, paid services or network assets are used at runtime.

### What the visitor gets

- **Four sections only:** Explore · Tour · Design · Amenities (no fifth tab). Utilities: Back + breadcrumb, Ask Nakhla, sound (off), language, More.
- **Explore** — orbit the tower (drag / pinch / wheel), hover or click a level on the façade or in the Levels rail, the upper floors lift away to reveal the real floor plate, then pick an apartment (or use Find / Compare).
- **Tour** — enter rooms with a collision-safe camera; camera modes: Dollhouse, Guided, Free walk (WASD / tap-to-move with collision), Cinematic (5 opt-in scenes, pause / skip / exit).
- **Design** — tap a floor, wall or joinery surface (or pick from the list); 18 original procedural PBR finishes in 6 categories, 3 packages, undo / redo / reset, hold-to-compare, material passport, My Apartment summary.
- **Amenities** — level 10 wellness (pool, gym, spa, changing, lounge) and level 11 sky dining (restaurant, café, terrace, conditional shisha terrace) with honest caveats.
- **Ask Nakhla** — a deterministic, local, source-grounded fact finder in 4 languages (incl. Iraqi dialect); every answer shows a status (project data / concept estimate / unknown / proposal) and source; it never invents prices, brands, availability, pool depth or views; changing a finish always asks for confirmation.
- **Sun & weather** — simulated hour / season / weather (clear, partly cloudy, overcast, light rain, dust, wind).
- **2D Lite** — every floor, room, finish and the assistant without WebGL; plans drawn from the same geometry.

### How it is built

```
src/domain/   canonical metric model: tower, floor plans, wall generator, furniture, nav graph,
              finish catalogue, geometry audit  ← ONE source for 3D, 2D, AI facts and Blender
src/engine/   Three.js renderer (render on demand), MotionDirector (sole camera owner),
              procedural PBR textures (Web Worker), environment, site
src/state/    zustand store, URL/share state, hotspot anchors, tour chapters, benchmark
src/ui/       React UI (top bar, sections, panels, sheets, assistant, HUD)
src/i18n/     ar (default, RTL) · en · ckb (Sorani, RTL) · zh-Hans — all keys complete
src/ai/       Nakhla resolver + localized answer templates
src/lite/     2D Lite view
blender/      build_nakhla.py → nakhla_tower.blend + nakhla_tower.glb + Cycles stills
tests/        unit (Vitest) + e2e / motion / visual baselines (Playwright + Chrome)
spec/         the original V1–V8 specification package (unchanged)
project_artifacts/  logs, decisions, QA status, geometry audit, evidence
```

### Editing the project

- **Floor plans / rooms / openings:** `src/domain/plans.ts` (metres). Walls are generated from the gaps between rooms, so plans, 3D, areas and collision cannot disagree. Run `npm test` — the geometry audit rejects overlaps, unreachable rooms, wrong unit areas and orphan openings.
- **Floor heights / floor count:** `src/domain/tower.ts`.
- **Finishes and packages:** `src/domain/materials.ts` (recipes are procedural; no image files to license).
- **Text in any language:** `src/i18n/*.ts` and `src/ai/strings.ts` (tests fail on a missing key or mismatched placeholder).
- **Gallery renders:** `npx vitest run tests/unit/export-artifacts.test.ts` then
  `blender -b --python blender/build_nakhla.py -- blender/scene_prims.json blender public/renders`.
- **Selections:** stored only in the visitor's browser (localStorage: language, package, finishes, quality, motion). Sound and contact data are never stored or put in links.

### Honesty notes

Concept only: no structural, MEP, fire, legal or planning review. Areas are measured from the concept model (Type A 124.86 m², Type B 145.02 m² net internal) — not surveyed. The pool on level 10 and the shisha terrace on level 11 are flagged as needing professional / legal review. Translations are drafts awaiting native-speaker review. The reference reel and frames in `spec/references` were used only as interaction inspiration and are not published or copied.

© 2026 Rashid Omar Mohammed. All rights reserved (original project materials only). Third-party packages keep their own licences — see `project_artifacts/ASSET_LICENSE_LEDGER.csv`.
