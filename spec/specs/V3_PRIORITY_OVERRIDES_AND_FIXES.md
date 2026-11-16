# V3 HIGHEST-PRIORITY REQUIREMENTS / CONFLICT RESOLUTION

Order of precedence: safety, user-stated 12-level building + contact details, functional correctness, link-share reliability, graceful performance, accessibility & calm UX, architectural coherence, premium visual quality, cinematic extras, other roadmap ideas. Quality never excuses broken navigation. V3 docs supersede conflicting V1/V2 claims; requirements from prior versions still apply where compatible.

## Audit-identified consistency corrections
1. Old descriptions sometimes say '10 floors' from the initial idea. AUTHORITATIVE floor stack is **G + F01–F09 residential + F10 wellness/pool + F11 sky dining = 12 occupied levels**. 18 apartments (2 per F01–F09); F10/F11 have NO apartments. Seed model is concept not site-ready construction.
2. 'Double-height lobby' must not silently remove a slice of F01 residential floor. Either make grand lobby a single-volume tall ground floor, or explicitly redesign the adjacent portion of F01 and reconcile 18-unit program. Default to a tall G lobby with convincing height rather than an inconsistent spatial void.
3. F11 sky dining and an outdoor terrace is treated as the 12th occupied level; roof maintenance/service above is not an extra occupancy floor. If shisha legality, zoning or smoke control cannot be confirmed, keep an *optional concept* off-by-default outdoor zone with no claim of legal operation.
4. Pool on F10 is merely architectural concept: heavy water loads, waterproofing, dampness, mechanical plant, evacuation, structural/MEP/fire design need specialist sign-off and potentially a lower location in a real commission. Do not invent an approved roof swimming pool.
5. Screenshot from old reference reel is inspiration only, not authorized product artwork. Reference media stays only inside local design research. Original authored site renders, textures, screenshots and code only in public output.
6. No 'no glitches for all devices' or 'zero bugs' guarantee. Every tested claim names hardware, browser, network and build version; untested marked explicitly. For unsupported GPU/browser, show informative full-function Lite experience. Adopt budgets that are measurable, prioritized and tuned to real hardware.
7. Scope of 'all rooms' means all semantically selectable and truthfully represented; fully navigable 3D for modeled hero spaces and amenities; reduced-detail/2D for unmodeled scenes. Do not imply 18 distinct bespoke interiors if only Type A/B reuse.
8. Landscape render/photo consistency: preset renders match their labeled finish packages; modified custom settings use a current-scene snapshot (with caveat fidelity) or explicit illustrative caption. Never label stale image as exact changed finish.
9. Contact creator info is deliberately public because provided by user, distinct from non-existent developer's sales. Do not solicit visitor data or claim submission to company without working integration.
10. Independent mode state, motion control, time/weather/season, and keyboard/touch 2D path all remain accessible during failure. No splash overlay permanently blocks access.

## V3 deliverable handoff gates
The app must show authored aesthetic quality with actual screenshots, functioning mode switcher/camera paths, localized creator contact and links, measured production build FPS and load metrics on specified device classes, responsive snapshots, real fallbacks, consistent material visual changes, and formal test evidence. No statement 'feature done' without live evidence; failed tests are fixed or transparently marked not shipped. Optional wow features cannot block baseline.

11. V2 state key `navigationMode` is deprecated; V3 `explorationMode` is the SOLE source of truth for controller mode. Migrate legacy persisted values safely. `viewMode` may describe scene composition, NOT controller ownership. Avoid two simultaneous camera controllers.
