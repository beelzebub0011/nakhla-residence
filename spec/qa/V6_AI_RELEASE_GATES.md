# V6 — AI PROPERTY EXPERT: UNCOMPROMISING RELEASE CHECKLIST
P0 BLOCKERS (must pass verified app tests):
1. Assistant is functional with free local question resolution, not inert or mocked; opens/closes and works on desktop, tablet, mobile, Lite and four locales.
2. Exactly four top-level sections remain; assistant sits in contextual Help or unobtrusive float, no fifth navigation tab or forced chatbot.
3. Fresh load sound OFF with assistant; no speech/recording/autoplay/network audio.
4. Area answers: Type A ~125 m² / Type B ~145 m² clearly CONCEPT and area-basis unknown; no claim of legal or precise net area. Room dims null -> explicit 'not available yet', no fabricated length/width.
5. No invented price, supplier, manufacturer, guarantee, country, certification, pool depth, opening hours, sale inventory, source or permit status.
6. Floor facts accurate: G lobby; F01–F09 each A/B; F10 wellness pool/gym; F11 café/restaurant/conditional separated shisha/terrace. 12 total occupied, 18 units.
7. Selected material changed via configurator -> assistant immediately returns CURRENT material ID/metadata, including demo caveat; invalid selection never silently guessed.
8. Ambiguous this/that + no selected entity -> clarification; not an arbitrary different room.
9. Typed action registry prevents untrusted execute/app mutations; controlled navigation preserves unit selection and honors Back; assistant never sends communication without confirmation.
10. No external LLM network call, third-party chat sharing, payment, user tracking, consent bypass or public deployment on default demo.
11. Keyboard/touch/screen-reader operable. Input, chips and sheet do not obstruct 3D, 4-tab navigation or gestures on small phones.
12. Arabic default; all four locales have complete key sets, RTL/CKB and Chinese fonts work, native review recorded honestly (unreviewed marked draft, not certified).
13. Assistant optional; core 3D startup/performance not worse than V5 performance contract; Lite can answer all factual questions.
14. All QA results start NOT_RUN, only mark PASS with actual browser evidence, tested build and device; static package checks not software run proof.

P1 TESTS:
- Context resolution when changing floor/room during pending answer and when material edits are committed/undone.
- Calculate polygon area only from audited geometry; unit conversions; floor-to-floor vs clear ceiling height; irregular room no fake length×width.
- Compare any Type A/B pair and list of 18 units with true floor labels; missing fact handled.
- Answer from selected 3D hotspot and 2D fallback semantic selection; no orphan mesh ID or wrong material.
- Support common Iraqi colloquial Arabic, English, Sorani Kurdish and Simplified Chinese with variant tokens and code mixed material names; handover native language QA.
- Timed queries/local memory leak/rapid repeated clicks/network offline/escape/Android keyboard/iOS safe areas/reduced motion.
- Multiple visitor questions under stress without assistant polluting share link, persisted state or analytics.
- Text/no voice by default and separate future audio consent.
- Disabled P2 LLM flag cannot be enabled accidentally on build/deployment; no keys in client bundles.

RUN EACH specific case in `qa/V6_AI_QA_CASES.csv` and full `qa/QA_MASTER_MATRIX.csv`. Human review of answers must be performed in addition to automated lexical matching. Measure contradictions and hallucination rate on a fixed mixed-language eval set; zero unsupported numeric claims in curated cases is a hard release requirement, not a universal zero-error promise.

Required final evidence: `project_artifacts/AI_FACT_PROVENANCE_AUDIT.md`, actual screenshot of mobile sheet, desktop and Lite answers, query tests after finish changes, 4-locale sample Q&A, actual source IDs/fields, network log showing no external AI requests, performance delta vs V5 baseline, and `project_artifacts/V6_AI_RELEASE_REPORT.md` from template. If not tested, mark NOT_RUN/BLOCKED and preserve honest feature flags.
