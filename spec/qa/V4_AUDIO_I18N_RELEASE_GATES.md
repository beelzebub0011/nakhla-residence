# V4 RELEASE GATES — SOUND + 4 LOCALES

Do not equate fixture validator PASS with running website PASS. Update actual QA rows only after testing with evidence. Blocking P0:
1. All new page loads are SILENT. No website sound without direct deliberate unmute click; browser autoplay restrictions handled correctly. Return visit/reload always silent.
2. Sound toggle accessible on hero, all four exploration modes, fullscreen, Material Studio and Lite; hard mute stops ALL channels and doesn't re-enable on floor, room, weather, language, performance tier, reconnect or camera transition.
3. Arabic ar-IQ is default, layout RTL. en LTR, ckb-IQ RTL, zh-Hans LTR. Root lang/dir and metadata update on locale choice. No broken glyphs or untranslated placeholders on key routes.
4. Locale switch during a tour preserves room, floor, unit, material selection, environment, camera mode/bookmark and sound state (especially mute); avoid WebGL scene recreation. Navigation remains functional.
5. 4-locale completeness: dynamic texts, material information, amenity text, photo captions, creator contact, legal/demo notices, SEO and exported PDF. No fake translations; signed linguistic review or explicit unverified flag.
6. Mixed-script telephone/email technical IDs in RTL are read and clickable correctly. Sorani script shaping, Chinese font load, large fonts, 320px width, browser zoom 200%, tablets, safe areas and iOS landscape pass.
7. Auditable native/editor translation acceptance before final production-grade linguistic claim; if missing: show gap in delivery report instead of claiming zero errors. Include no new paid translation/voice services without permission.

Recording: screenshots for four locales × hero/floor/interior/settings/contact; browser audio console instrumentation; manual test on real iOS and Android where accessible; PDF comparison; exact status NOT_RUN/PASS/FAIL/BLOCKED/REVIEW_NEEDED and evidence path. Avoid untestable universal device claims.
