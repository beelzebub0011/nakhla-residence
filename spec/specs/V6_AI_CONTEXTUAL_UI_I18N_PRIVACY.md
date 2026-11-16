# V6 — CONTEXTUAL AI PRODUCT DESIGN: CONVERSATIONAL SIMPLICITY, FOUR LOCALES, PRIVACY AND PERFORMANCE

## UX principle
The main nav stays Explore/Tour/Design/Amenities ONLY, in four languages. Place a small accessible "اسأل نخلة" button in existing Help utility / contextual bubble. Not a fifth navigation item. On desktop open compact bottom-right side sheet (avoid 3D center); on mobile and iPad use a dismissible bottom sheet with safe-area insets, avoid obscuring essential bottom navigation, a draggable/collapsible header and max height that keeps the model visible; keyboard remains usable, Escape/back closes, focus managed, no modal trapping unnecessarily. When minimized, assistant consumes almost no screen. No conversation popups automatically on page load or camera transitions. No "AI assistant is typing" animation unless real; no faked human typing, forced tours, banners, confetti or marketing spam.

## Question entry and suggestions
Localized small placeholder, submit icon, accessible keyboard shortcuts, explicit send, loading/cancel, retry, helpful unknown, visible source status. Suggested quick questions vary by building/floor/unit/room/material/amenity context but never more than 3–4 chips simultaneously. Chips should not exceed a line in mobile or use accessible horizontally scrolling container with logical focus order. E.g. 'شكد مساحة الشقة؟', 'شنو المواد؟', 'وين المسبح؟' outside; 'كم طول هذا الجدار؟', 'نوع الخشب؟' when selected. Tapping a 3D object can offer a small unobtrusive 'اسأل عن هذا' card with exact semantic object ID attached, not arbitrary image guess. All controls work in Lite mode with semantic list selection.

## Conversation behavior
Concise direct answer first; supporting detail only on expansion. Cite precise fact origin and demo-status badge, e.g. 'المصدر: مخطط النموذج التجريبي — غير معتمد'. Show up to two meaningful actions: 'عرض المخطط', 'الانتقال للطابق', 'شوف البدائل'. User chooses to navigate; do not teleport without intent. Previous question memory for anaphora ('زين شكد عرضها؟') scoped to currently selected object; invalidate when scene context changes and offer a clarification where ambiguous. Provide clear way to restart chat/clear conversation; default no cloud history.

## Four languages
Arabic ar-IQ DEFAULT; English en; Kurdish Sorani ckb-IQ RTL; Chinese Simplified zh-Hans. The assistant must support each in request entry, intent variations, response templates, source status labels, quick questions, errors, validations, names, units, number formatting, chips, share previews, generated reports, and accessibility labels. Actual source facts remain stable IDs, translated display only. English, Sorani and Chinese translation dictionaries cannot be declared native-proofread by code. Require competent human review before production publication; label draft content accordingly. Ensure Arabic "طول" vs "عرض" vs "مساحة" don't collapse, Chinese long/width/area terminology and Sorani script direction are correct in final QA. Expose optional robust unit conversion and localized numerals without confusing mm, m and m². Use BCP47/i18n ICU formatting and correct bidirectional handling for `F04`, `U04A`, IDs, decimals, phone and email in RTL text. No auto-language switch based on guessed ethnicity or geolocation; obey chosen UI language. In mixed-language questions, support known material English terms as synonyms.

## Audio / voice
Sound always disabled on EACH full page load. AI answers are text only by default. No voice synthesis, no microphone, no ambient audio or speech recognition auto-start; 'Start Tour' does not unmute. If future user opts into audio, provide separate disclosure for microphone/STT and TTS, stop, mute, language-specific consent, no automatic network streaming. Accessibility should not require audio.

## Privacy and security
Zero-login default, no analytics of chat text/selected unit/phone without explicit policy and permission. Keep chat transient in tab memory or local ephemeral state; clear on reload by default; 'Save My Design' share schema must never include messages, names, email, phone or untrusted prompt content. Never treat user chat as instructions to modify site source, buy items, email the creator, or unlock hidden tools. Limit message size, escape render (no arbitrary HTML), sanitize Markdown, disallow markdown image/JS URI injection, validate ID-based actions. On failure provide local answer fallback and offline FAQ, no silent personal data uploads. Public contact details of demo creator can be shown; never append them automatically to sensitive third-party AI prompts.

## Performance and usability acceptance
- No model weights (100 MB+) bundled into browser; no large NLP runtime at startup. Assistant JS loaded only on first open or when safe; pre-index cheap metadata without blocking first interactive view.
- Minimal CPU memory/GC; virtualized/bounded message history; constant-time known-entity fact lookup where possible. No secondary WebGL canvas. React rendering does not re-create geometries on every keystroke; maintain 3D FPS budget and deferred text matching.
- Text input remains responsive during camera changes; keyboard open/close doesn't resize canvas into a broken viewport. Use stable layout with visual viewport changes on iOS Safari/Android Chrome; test actual devices where possible.
- Results under 500 ms for simple local known questions on ordinary mid-tier desktop; define device-specific realistic budget via profiling rather than universal guaranteed latency. Never block the main UI if request takes longer; cancel/retry and fallback. Degrade suggestions gracefully on low-end.
- Works without WebGL and without network once app metadata cached; service worker offline mode only if properly designed, optional.
- Keyboard screen-reader semantics: role/aria for answer, transcript, source labels and actions, proper focus, visible outline, large touch hit zones (~44 CSS px), respects prefers-reduced-motion and viewport/safe areas. WCAG contrast targets consistent with V3 UX contract.

## Creative features that are genuinely helpful
- 'Point and Ask': tap wall/window/floor/cabinet and ask facts from source mesh/material, not vision guess.
- 'Explain the Difference': side-by-side factual answer for two floorplans or two finish packages; user can jump to compare view.
- 'Show Me': assistant answer can turn into validated camera highlight or contextual help indicator; no surprise teleport while user is touring.
- 'Where Am I?': short breadcrumb+unit/room, option to go home, never geo-location tracking.
- 'Design Reasoning': transparent rules why finish sample fits palette; clearly recommendation not architectural proof.
- 'Find My Room': uses navigable semantic graph / Lite route; stairs/elevator paths not fabricated if unbuilt.
- 'Quick Fact Lens': single tap shows an instant spec card without opening chat; assistant expands on request.

All features must be implemented based on actual capabilities with working controls; unimplemented advanced behavior is documented as roadmap, not misleading clickable placeholders.
