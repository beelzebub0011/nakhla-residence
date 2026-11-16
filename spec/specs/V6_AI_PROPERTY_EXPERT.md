# V6 — NAKHLA AI: PRODUCT REQUIREMENTS / COMPLETE QUESTION-ANSWER COVERAGE

## 0. Nonnegotiable definition of done
Ship a demonstrably WORKING, contextual, multilingual question assistant that gets its answers from canonical, versioned property records. It MUST work in the zero-budget demo without any external API, cloud key, signup, account, microphone, heavy ML model or separate server. All answers must be testable. It must never invent missing dimensions, price, warranty, construction certification, supplier, availability, pool depth or operating hours. Be useful on the first visit and invisible when not wanted. Generative LLM sophistication is optional, not a release dependency. If a local intent engine is used, label it responsibly, rather than falsely suggesting paid generative intelligence.

## 1. Its job is to understand the exact current context
Read from the application's single source of truth: projectId, activeSection, activeFloorId, activeUnitId, activeRoomId, hovered/selectedSurfaceId, material overrides, finish package, environment and current locale. On a user utterance, snapshot context at query time, assign a queryId; if context changes before finishing, cancel or mark stale and never use old selection to navigate. Use explicit entity names in user's message ahead of default context. "This floor", "هاي الشقة", "هنا", "هاي الأرضية" should resolve to current selection only if unambiguous; otherwise ask ONE friendly follow-up: "تقصد أرضية الصالة لو جدار المطبخ؟". After a material change, current material answer must reflect the new material ID. After changing from Type A to B, clear invalid room IDs and do not keep Type A answers.

## 2. Detailed knowledge domains: every area needs structured, accurate answers
A. Building/tower: fictional demo location, 12 total occupied floors = Ground + F01–F09 residential + F10 gym/pool/spa + F11 restaurant/café/separate conditional shisha/terrace; 18 fictional units total. Explain concept status and safety caveats where relevant.
B. Floor: index, purpose, units on residential levels, number of bedrooms per unit type, floor level and amenities, how to jump there. Never claim sale availability.
C. Unit: ID, selected floor, type A/B, bedrooms/bathrooms, DEMO approximate 125/145 m², area basis unknown, rooms available, balcony, finish plan; compare two actual selected IDs with equivalent area definitions. Never claim 125 is net usable measured area.
D. Rooms: room labels, IDs, shape/geometry only once authored, dimensions length/width/height (with units + method + last validated version), area from floor polygon excluding holes (m²), ceiling height, doors/windows/openings, room adjacency, accessible route and camera waypoint. Null dimensions MUST produce the honest unknown answer. If polygon is irregular, do not claim one L×W pair; show bounded dimensions and measured area separately.
E. Measurement objects: selected wall length, window width/height, door clearance, balcony dimensions, furniture dimensions/fit, floor-to-ceiling, distances, area and optional volume. Coordinates from THREE world transforms must be converted to meters with a declared model scale/axis. Use geometric measurements only if scene geometry and CAD model reconcile and are inspected. Report precision consistent with data; label visual estimates as approximate and not construction measurements.
F. Materials: identify the exact selected surface and material currently assigned, category (floor/wall/wood/cabinet/counter/bathroom), descriptive appearance, supplier/manufacturer/origin only when confirmed, size, finish matte/gloss, slip resistance/wet-area suitability ONLY if sourced, maintenance guidance only if source-approved, material codes, comparison of active alternatives, per-room default and changed options. Demonstration color swatches are not technical specifications; do not confuse marble-look porcelain with natural marble. A material passport should report missing fields as 'not supplied', not omit them to imply certification.
G. Weather/sun/view: how to change hour, season, clouds/weather, daytime shadows, orientation if geometry metadata verified, balcony view as conceptual if not surveyed. Do not make precise hours of sunlight exposure based on a marketing render; if simulation isn't georeferenced, say illustrative.
H. Amenities: where gym, pool, spa and restaurant/café/terrace are; routes from selected unit and contextually jump; operating hours, access restrictions, prices, availability, pool capacity/depth and food menu = UNKNOWN without approved data. Shisha must always have age/legal/smoke safety caveat without presenting it as a confirmed operating service.
I. Packages and compare: explain Standard/Premium/Luxury equivalent conceptual presets as defined in `finish_packages.seed.json`, show which exact catalog IDs are applied, differences, and what is customizable; show before/after with user confirmation. NEVER fabricate upgrade pricing or guarantees.
J. Unit and floor discovery: "Which is largest?", "أريد شقة بثلاث غرف", "أي طابق بيه كوفي؟", "شلون أطلع للطابق 7؟", "قارن 04A و07B"; calculate from canonical catalog, with honest explanation. No hallucinated commercial inventory.
K. Sales and ownership: demo's creator is Rashid Omar Mohammed, +9647700864990, rashid.iq12@gmail.com. These contacts refer to creator / demo service not an actual Nakhla development sales office. Provide public click-to-contact links only on explicit user interaction. Do not auto-send, autofill personal details or expose visitor data.
L. Navigation/how-to: how to use Orbit, Property Explorer, Guided, Cinematic, Free Walk, Lite, mobile controls, sound control, time/season settings, back, reset view, screenshot and save; answers depend on features truly implemented and available.
M. Architectural engineering: explain conceptual wall/insulation/shading/sustainability claims only where evidence supports; do not assert structural feasibility, fire compliance, HVAC design, pool loading approval, exact performance, or building permit.
N. Financing/property: mortgage, investment yields, legal status, availability, rental income and sold status require actual verified source and relevant disclaimers. In a fictional demo respond 'not available as this is a concept', never invent calculations.
O. Accessibility: navigable route/step-free access/elevator dimensions only when verified; do not promise full accessibility of unbuilt project.
P. Documents: show material spec sheet, PDF, unit plan, project brochure if actual file exists. No fake download buttons or generated false certification.

## 3. Concrete question/answer acceptance examples (Iraqi Arabic)
- User at F04 Unit U04A: "شكد مساحة الشقة؟" -> "الشقة 04A نوع A، مساحتها التصورية حوالي 125 م². هذه مساحة افتراضية لنموذج العرض وليست قياساً معتمداً." + action "عرض المخطط".
- User in living room: "شكد طول الصالة؟" -> if `rooms[living].dimensions_m` null: "طول الصالة مو مثبت بعد ضمن المخطط التجريبي؛ ما أريد أعطيك رقم غير دقيق. أكدر أعرضلك المخطط لما تتوثق الأبعاد." Not invent "6 × 4".
- User clicked kitchen cabinetry: "شنو نوع هذا الخشب؟" -> access CURRENT material ID and exact record; if concept walnut-finish cabinet reply clearly finish sample + no verified manufacturer, NOT species proof. Show Material Passport.
- User: "أي طابق بيه المسبح؟" -> F10 / tenth floor. Action "ودّيني للمسبح" is typed `navigateToAmenity` not string-executed code.
- User: "أريد أكبر شقة" -> Type B 145m² approx vs Type A 125m² approx, with demo caveat; may show Type B entries.
- User: "هذا البلاط يتحمل الماي؟" -> if no certified slip/wet rating: "ما عدنا تصنيف مقاومة الانزلاق أو ملاءمة المناطق الرطبة مؤكد لهذه العينة. لازم نرجع لورقة المورد." Never guess based on product appearance.
- User: "انطيني السعر" -> "المشروع نموذج عرض، وماكو سعر بيع معتمد متوفر." Never imply listed for sale.
- User: "شنو الفرق بين 03A و05B؟" -> Type A vs Type B, current floor IDs, bedrooms, demo approximate areas; compare type templates and disclose same demo repetition.
- User: "بدل الأرضية رخام" -> show eligible materials, preview, request explicit confirmation before commit, and avoid wrongly describing marble-look porcelain as natural marble.
- User: "أخذني لغرفة النوم الرئيسية" -> only when selected unit has verified navigation waypoint; otherwise show room list / 2D Lite fallback.
- User: "كم سعر الإيجار وشنو العمولة؟" -> unavailable for fictional project, may refer to demo creator only for product-service questions, not home sales.
- User: "هل الموقع يدعم الكردية؟" -> yes if tested UI locale available; if native linguistic review incomplete, don't claim fully proofread.
- User: "منو مسوي هذا الموقع؟" -> creator name and accurate provided public contact; avoid saying owner of building.
- User: "عدد طوابق العمارة 10 لو 12؟" -> exactly 12 including ground, 9 residential + 2 amenity, explain counts and avoid the old 10-level draft.
- User: "شنو ارتفاع السقف؟" -> if only floor-to-floor exists, say floor-to-floor is NOT finished clear ceiling height; do not confuse.

## 4. Visual interaction, not chat wall
A small "اسأل نخلة" help button (not fifth top-level tab). Initial quick chips vary by location: outside tower -> "كم طابق؟", "وين المسبح؟", "دلني على شقة"; within selected unit -> "شكد المساحة؟", "قارن شقق", "اختيار المواد"; in a room -> "شنو القياسات؟", "نوع الأرضية؟", "وشنو أگدر أغير؟"; selected surface -> "شنو هذي المادة؟", "عرض المواصفات", "بدائل"; selected amenity -> "وين يقع؟", "شنو بيه؟". Chips are suggestions; free-text question works as well and has a graceful unknown path. No intrusive auto-open/toast. The assistant should offer at most 2 optional next actions.

## 5. Trust labels
- VERIFIED_SOURCE: verified sourced dimension/supplier/certification, exact fact, record URI/version/date, only after authentic approval.
- CONCEPT_ESTIMATE: architecture design model, approximated area, illustrative sun/view/measurements; must say "تصوري/افتراضي" in user-visible answer even if user did not ask.
- FACT_FROM_DEMO_SCHEMA: topology and room type in fiction; factual about this specific invented demo but NOT actual permitted property.
- UNKNOWN_OR_NOT_PROVIDED: null fields; answer honestly with likely next step.
- PROPOSAL_OR_SUGGESTION: preference recommendations, not facts or promises.
Never use an unqualified "100%" confidence or invented external citation. On action answer, always keep label/data provenance accessible to the user. After a data update and material switch answers must update without stale cache.

## 6. Upgrade roadmap
P0 = deterministic multi-domain source-grounded property answer + source/caveats + context + selected entity + helpful links/actions + four-language UI and mobile. P1 = ask-about-selected 3D object, explain-compare, richer fuzzy Arabic/English/CKB/Chinese variations, source trace, design suggestions as rules, optional push-to-talk WITHOUT speech unless independent explicit consent and safe design. P2 = verified backend LLM/RAG or on-prem small model, only if measurable uplift, feasible inference, cost/privacy approval and infrastructure. Don't add AI complexity that harms main 3D experience.
