# V6 HIGHEST PRIORITY — NAKHLA AI: CONTEXTUAL REAL ESTATE FACTS AND GUIDED ACTIONS

The user now REQUIRES a much more capable, always-accessible but nonintrusive AI PROPERTY EXPERT. V6 > V5 > V4 > V3 > V2 > V1 where a genuine conflict exists. Preserve all former requirements: EXACTLY FOUR global public sections (Explore, Tour, Design, Amenities), Arabic default + English + Sorani Kurdish + Simplified Chinese, sound ALWAYS muted on every hard page load, no paid services or public deployment without approval, speed and accessibility, 12 levels/18 demo units, 4 camera modes inside Tour, exact creator identity. Do NOT make the AI a fifth global section or force unsolicited pop-ups.

V6 P0: Build a WORKING FREE-DEFAULT, LIGHTWEIGHT, SOURCE-GROUNDED contextual property question assistant, not a fake nonfunctional AI button. It answers factual questions about selected tower, floor, unit, room, surface/material, area, dimension WHEN MEASURED, finish variants, amenity locations, topology and comparisons using canonical validated app metadata, with source/provenance and clear illustrative/unknown labels. Demo Type A ~125 m² and Type B ~145 m² are CONCEPT APPROXIMATIONS, not certified or exact net floor areas. Existing room dimensions are NULL: NEVER invent any actual room size/measurement, price, brand, warranty, supplier, availability, view or certification. Measurements become answerable only after coherent original geometry, exact transforms, BIM/CAD/mesh audit and design-review records; until then say "not yet measured" and offer the plan. 'Which material am I looking at?' uses actual selected mesh/surface->catalog ID->current override, not a guess from the pixels. Avoid claiming a generative LLM is present when using a deterministic local search engine.

USER EXPERIENCE: contextual floating "اسأل نخلة" / "Ask Nakhla" icon or Help-sheet on desktop/tablet/mobile, concise chips such as "شكد المساحة؟", "شنو هذي المادة؟", "ودّيني للمسبح", minimalist bottom sheet on phone. Never obscures controls or 3D center; one overlay maximum, keyboard/screen-reader access, close/minimize, cancel asynchronous answers; no forced login/voice/microphone. User can ask in the site's FOUR locales; Arabic Iraqi-style questions supported without crude literal-only matching; source truth stays language-independent. On answer action, highlight/zoom/show room/floor ONLY via typed, validated application actions, preserving user state; no raw instructions/eval. Never auto-buy/quote/book/submit or alter finish choices without confirmation. Sound remains OFF and AI chat is TEXT FIRST.

ARCHITECTURE: cached local structured fact resolver + localized templates + optional free local fuzzy synonyms (no secrets/network). Real generative LLM, if desired, is a strictly OPTIONAL SERVER-SIDE enhancement OFF by default, requiring owner approval of cost, privacy, provider and deployment; never put tokens/API keys in browser. A deterministic factual assistant may be branded "المساعد العقاري الذكي"; disclose when it is a guided search rather than claiming human-like generative capabilities. No high-memory AI model is loaded on phones. Knowledge is sourced from state stores already used by React/Three/Blender, not a second contradictory database. One truth for layout areas, GLB geometry, material IDs, localization, prices and availability; every response includes fact status: VERIFIED / CONCEPT / UNKNOWN. Do not silently turn a concept into a verified property. No private user contact in prompts/analytics. Strict query safety, rate limits if remote, no injection into state/tool execution.

MANDATORY V6 READS: `specs/V6_AI_PROPERTY_EXPERT.md`, `specs/V6_AI_GROUNDING_ENGINE_AND_ACTIONS.md`, `specs/V6_AI_CONTEXTUAL_UI_I18N_PRIVACY.md`, `qa/V6_AI_RELEASE_GATES.md`, `data/v6_ai_contract.seed.json`, `data/v6_ai_intents.seed.json`, `data/v6_ai_facts.seed.json`, and `research/V6_AI_SKILLS_AND_COST_PROTOCOL.md`. Run `python scripts/VALIDATE_V6_PACKAGE.py` and previous V1–V5 package validators. Source validators prove FILE CONSISTENCY only. All new QA cases start NOT_RUN until measured app tests. The factual property assistant is now P0; external LLM concierge remains disabled optional P2 and must not slow initial page load.


تحديث V5: المشروع يصير للمستخدم بأربع سكشنات بسيطة فقط: (١) استكشف، (٢) تجوّل، (٣) صمّم، (٤) المرافق. كل الميزات الإضافية مخفية خلف أزرار سياقية مناسبة، حتى الشخص الجديد ما يضيع. الشقق والمخططات والأسعار والقياسات والإطلالات خيالية وتجريبية إلى أن تتحقق الشركة من بياناتها. باقي الشروط السابقة ثابتة، خصوصاً الصوت مطفأ، أربع لغات، وأداء مناسب للجوال. اقرأ START_HERE.txt ثم specs/V5_*.md. لا ترسل النسخ القديمة مع هذه الحزمة.

# V4 HIGHEST PRIORITY: QUIET BY DEFAULT + FOUR FULLY LOCALIZED LANGUAGES

This V4 specification OVERRIDES any earlier bilingual, locale or sound defaults anywhere in V1–V3. Required locales: **Arabic ar-IQ DEFAULT RTL**, **English en LTR**, **Central Kurdish Sorani ckb-IQ RTL**, **Simplified Chinese zh-Hans LTR**. Do not silently replace Sorani with Kurmanji or Chinese Simplified with Traditional. No language should be a partial demo of an otherwise fully functional website; navigation, 3D hotspot labels, tooltips, amenities, material specifications, status notices, confirmation/error/loading states, footer, creator contact, gallery metadata, PDF exports, tour captions, and accessibility text must all be localized. Preserve IDs, camera and finish selection when switching.

EVERY PAGE LOAD or document reload MUST START WITH **ALL SOUND DISABLED/MUTED**. No autoplay, no jingles, no footsteps, no sky/ambient noises, no narration, no video audio and no Web Audio playing or fetching heavy audio assets. Unmute only from an explicit user-initiated audio control, never inferred from 'Start Tour' alone. Users can mute/disable audio instantly and at any point, including cinematic, free-walk and the welcome screen. Changing page, floor, room, weather, language, scene or tour mode MUST NOT unmute; a new page load MUST revert to muted even if audio was opted into during the previous visit. Sound is optional decoration and must not gate or slow navigation.

Localization quality is a SHIP BLOCKER: no missing keys, machine translation presented as verified, mistranslated safety notices, incorrect direction, broken Arabic/Sorani glyphs, untested PDF/JSON interpolation or misrepresented demo-status translations. Claude must research official language/typographic standards, develop canonical terminology, perform automated checks and arrange/record competent native-speaker review for all four locales before declaring production-grade translation accuracy. If native validation is unavailable, mark those locales **UNVERIFIED / REVIEW NEEDED**, provide working draft UI for demos, and DO NOT claim zero translation errors or final linguistic sign-off. Do not delay technical work waiting for approvals; continue implementation and report gate truthfully.

Required reads before implementation: `specs/V4_AUDIO_QUIET_BY_DEFAULT.md`, `specs/V4_FOUR_LANGUAGE_LOCALIZATION_AND_TRANSLATION_QA.md`, `qa/V4_AUDIO_I18N_RELEASE_GATES.md`, and new `data/locales_manifest.seed.json`, `data/audio_preferences.seed.json`, `data/translation_review_status.seed.json`. Run `python scripts/VALIDATE_V4_PACKAGE.py` in addition to earlier offline checks. These validate PACKAGE FIXTURES ONLY, not the built website. In case of conflict, V4 > V3 > V2 > V1. Do not send or publish the attached Instagram reel or screenshots. Do not auto-deploy a public website.

V3 FINAL PRIORITY UPDATE — MUST READ BEFORE DEVELOPMENT
Read `specs/V3_PRIORITY_OVERRIDES_AND_FIXES.md`, `specs/VISUAL_DIRECTION_AND_DESIGN_SYSTEM_V3.md`, `specs/EXPLORATION_CAMERA_MODES_V3.md`, `specs/PRODUCT_UI_BEHAVIOR_AND_MICROINTERACTIONS_V3.md`, `specs/CREATOR_OWNERSHIP_CONTACT_BRANDING_V3.md`, and `qa/V3_VISUAL_UX_NAVIGATION_RELEASE_GATES.md` at the relevant stages. New exact public creator contact: Rashid Omar Mohammed / +9647700864990 / rashid.iq12@gmail.com. Four distinct actual modes (Cinematic, Guided, Free Walk, Property Explorer) plus functioning 2D Lite. Visual craft is a first-class release gate but NEVER above usability, reliability, accessibility and performance. V3 overrides conflicts with old ten-floor/double-height lobby/unclear gallery statements. Do not present project as real listing or assume all previously listed features already exist. This package is the specification for Claude to implement and test.

## تحديث V2:
انضافت: سلاسة الموقع ومعالجة الكلجات عبر تحميل متدرج ونسخة Lite؛ دعم iPhone/Android/iPad/Laptop/Desktop؛ تجوّل حقيقي مع منع اختراق الجدران وطرق حركة للموبايل؛ محاكاة الساعة/الأجواء والفصول الأربعة؛ اختبارات أداء وثبات؛ أفكار إضافية احترافية. التفاصيل في AUDIT_AND_REVISIONS_V2_AR.txt. أرسل ZIP النهائي وحده وافتح START_HERE.txt بـClaude Code.


ناخلة ريزيدنس | حزمة Claude Code المستقلة
======================================

هذه الحزمة مواصفات وأوامر وبيانات أولية ومراجع بصرية، وليست موقعاً منجزاً بعد. الهدف أن ينفذ Claude Code المشروع الكامل بنفسه ضمن جهازك وحسب الأدوات المتاحة له.

أقل طريقة للاستخدام:
1) حط ملف ZIP بمجلد مشروع جديد على ويندوز 11. إذا Claude ما يگدر يفتح ZIP مباشرة، فك الضغط فقط.
2) افتح Claude Code على نفس المجلد وگله: Read START_HERE.txt and execute the project autonomously.
3) لا ترسل ملف MASTER_PROMPT_COMPLETE.txt ويا الحزمة بنفس الجلسة؛ لأن الملف الكامل يكرر مواصفات الحزمة ويستهلك Tokens زيادة.

إذا ما تكدر ترسل ZIP لكن تكدر ترسل TXT وحده: دز MASTER_PROMPT_COMPLETE.txt.

المحتويات: 12 طابق G+9 سكنية+Wellness+Sky Dining؛ 18 شقة؛ 6 فئات مواد/18 عينة توضيحية؛ تصميم Modern Iraqi Luxury؛ 3D حقيقي، اختيار الطوابق والشقق والغرف، تغيير المواد، صور رندر، معرض، PDF، جولة سينمائية؛ مهارات مجانية موثوقة حسب الحاجة؛ تعليمات الجودة والحماية واختبارات كثيرة.

مهم: الاستمرار عند انطفاء الكمبيوتر غير ممكن، لكن الحزمة تطلب منه يحفظ حالة المشروع بملف RESUME_HERE.md حتى يكمل بعد التشغيل. لا توكيد على سلامة مسبح فوقي أو قانونية النراكيل؛ تحتاج بحث ومراجعة هندسية/قانونية قبل التنفيذ الحقيقي. ممنوع نسخ لقطات الريل في الموقع النهائي بلا إذن.


تحديث V3 — الحقوق والجماليات والتجوال:
الاسم: Rashid Omar Mohammed | الهاتف: +9647700864990 | الإيميل: rashid.iq12@gmail.com.
أضفنا نظام تصميم أنيق للأزرار والقوائم والمؤثرات والحركة واللغتين، وأربعة أوضاع عرض واقعية (سينمائي، موجّه، حر، مستكشف عقاري) والوضع الخفيف 2D. وجود ملفات الاختبار يعني المتطلبات جاهزة لا أنها اجتازت الاختبارات فعلاً. لا تنشر المشروع لزبائن قبل اجتياز الاختبار والتأكد من عمل الرابط.

بعد المراجعة V3: تم منع التداخل بين متغيري التجوال القديم والجديد، وتثبيت explorationMode كمصدر وحيد لحالة التحكم بالكاميرا. أضفنا فحص scripts/VALIDATE_V3_PACKAGE.py.
