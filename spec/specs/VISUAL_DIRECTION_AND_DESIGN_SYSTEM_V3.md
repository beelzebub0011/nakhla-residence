# V3 — PREMIUM DIGITAL ART DIRECTION / DESIGN SYSTEM — MANDATORY

## Product-quality design brief
Create a genuinely exceptional, original, responsive luxury architectural website, not an overdecorated landing template, static Photoshop mockup, PowerPoint, or camera demo with a generic UI slapped over it. Aim for an authored editorial and spatial design that feels appropriate for an international architecture studio yet recognizably Basra-inspired. The website itself must be as art-directed as the tower. The user's satisfaction depends on *micro-level craft*: composition, rhythm, hierarchy, typography, interaction, transitions, trust, comfort, responsiveness, and reliable functionality.

## Hierarchy and storytelling
- A first-visit buyer should understand in 3 seconds: project name, what's being explored, concept status, and the obvious action. The architectural object and user's current context are always dominant; no persistent 35%-wide sidebar obscuring the building.
- Visual hierarchy: (1) building/scene (2) currently selected spatial object (3) primary action (4) brief, factual context (5) optional controls (6) advanced settings under discoverable disclosure.
- Treat page design as immersive editorial architecture: beautiful asymmetrical grid on large screens where appropriate, generous negative space, strict alignment, strong type scale, quiet color. No excessive decorative icons, faux luxury gradients, giant glass panels, parallax overload, or moving text while people read.
- A restrained, original brand lockup based on an abstract palm frond / vertical architectural rhythm; usable at 24px and in monochrome. Ensure vector source is included. Do not claim a trademark registration.
- Scene continuity: consistent camera horizon, tone mapping, white balance, finish choices and labels from exterior to floor to room to gallery.

## Mandatory creative design exploration (Claude autonomously chooses)
Research at least 3 relevant, genuinely different design directions beyond one mood board; document dated sources and asset licenses; prototype one screen and one 3D+UI composition for each; evaluate appearance, readability, brand fit, performance, Arabic typography, one-handed mobile operation, and development time. Pick the best rather than an unexamined first template. Record comparisons and a short rationale in `project_artifacts/DESIGN_DECISIONS.md`. Keep final as *Modern Iraqi Luxury* regardless of chosen interface layout.

## Foundation design tokens
- Color roles, not magic numbers: canvas, elevated surface, panel, primary ink, muted text, subtle separator, bronze accent, focus, success, warning, error, selected, hover, night scheme. Suggested palette is illustrative; audit in context and ensure accessible contrast (WCAG AA for typical text where feasible).
- Typography: licensed Arabic family that renders Arabic marks and numerals beautifully, compatible licensed Latin family, offline/fallback system fonts; defined size, line height, optical spacing, Arabic punctuation, tabular figures, unit area `م² / m²`. Font subsetting/WOFF2 and preload only critical subset. Never load 7 weights.
- Spacing: consistent 4/8px-inspired semantic scale, container max width, dialog/drawer sizes, touch-safe edges, landscape and notch safe areas, 44x44 CSS px minimum interactive targets unless stronger applicable platform rules.
- Shapes: quiet radii; buttons tactile and precise not inflated; crisp 1px dividers; shadows subtle; surface blur sparingly and disable on low-end profiles.
- Elevation, layering, z-index registry: scene, HUD, navigation, drawer, tooltip, modal, safety layer, toast. Modals must not hide primary exit controls; avoid viewport overlap.
- Responsive type: `clamp()` where sensible; Arabic heading line breaks verified; dynamic 200% zoom, device font scaling and browser text reflow. Never use pixel text embedded in renders.

## Component craftsmanship — implement all real states
Header/nav: original wordmark with clear project state, language toggle, quality menu, sound toggle, mode switch, contact creator. Desktop compact top rail, tablet adaptable, phone simplified. Keep explanation labels in onboarding and discoverable tooltips; icons alone should not leave novices guessing.
Buttons: primary, secondary, ghost, icon, destructive/reset with explicit labels; hover, pressed, focus-visible, disabled, in-progress, success, error; animated states 120–220ms and reduced-motion fallback. No button that appears functional but does nothing.
Cards: floor/unit, room, material sample, finish package, image gallery, amenity cards; consistent visual grammar and accessible hit targets; selected state never communicated by color alone.
Controls: precise time slider with keyboard value, season/weather preset picker, camera control and quality selector. Drawer with touch handle, swipe-to-close opt-in, safe area padding, focus trap only for modal dialogs, no body-scroll lock trapping the user. Subtle tactile feedback (visual, not forced vibration).
Material thumbnails: actual texture/finish distinction, not arbitrary stock squares; selected surface outlined; before/after views use **same camera & exposure**. State change is visible and reversible. Never auto-scroll away from the object selected.
Loading: show responsive name/hero/poster before 3D; progressive asset fetch with truthful states (preparing/building/interactive/full quality), optional skip, retry, lite entry. Do not fake percentages or force loading spin after fallback exists.
Toasts: informative but not spammy, one consistent position, accessible nonintrusive announcements. Error messages give concrete recovery actions. Avoid celebratory confetti, fake scarcity counters, intrusive sales prompts.
Details: careful ellipsis, no widows/orphans where practical, variable labels in Arabic/English, elegant empty/loading/error, precise icon alignment, keyboard focus rings, disabled explanations, consistent metric formatting, verified tab order.

## Microinteractions and scene-linked UX
- Hover floor: brief (100–180ms) warm matte accent + floor label, never frantic neon glow; pressed/selected persistence via floor rail and 3D outline. Pointer magnetism should NEVER move controls unexpectedly.
- Scene transitions are camera moves tied to meaningful spatial change, not transitions for decoration. Use easing curves with velocity/jerk review; no abrupt cut when approaching floor/interior; no forced multi-second waits. Provide interrupt / skip / rewind / back.
- Unit cutaway: architectural separation with correct section mask; selected unit gets clean border fill and readable name. Floors not selected should not remain rendered at full interior detail.
- Room entrance: at first enter, frame a compelling hero composition; the user must immediately know where they are, how to return, and how to move. Camera must not enter geometry, clip furniture, swing violently or teleport without a clear choice.
- Materials: pointer hover outlines only approved surfaces, selection results in calm edit panel, swatches visibly update true mesh surface. In-progress texture update shows tiny progress only if needed, never blank scene; preserve earlier choice on asset error.
- Seasons/time/weather: subtle transition to sky/lighting/shadow/foliage and indoor reflections with no disorienting camera reset. Use realistic limits for Basra-inspired concept; fake snow never implied as typical Basra weather. Accessibility option to reduce particle effects.
- Prefer scene-specific tasteful ambient soundtrack OFF by default and always user-controlled, licensed or original. Preserve silence in business settings and respect prefers-reduced-motion.

## Signature screens to actually design (not just describe)
01 Brand Hero / Title Reveal. 02 Tower Overview / property explorer. 03 Selected Floor / Cutaway. 04 Unit Floorplan & Dollhouse. 05 Interior Tour. 06 Material Atelier / Configurator. 07 Gallery & Compare. 08 Wellness / Pool & Gym. 09 Sky Restaurant / Café / Shisha conditional. 10 My Design & Contact. 11 About Experience / Creator Contact. 12 Lite/2D recovery. Also share preview image and printable finish board.

## Artifacts required before final UI implementation
`project_artifacts/design/` should contain: visual-research citations; 3 compared art directions; chosen style guide, logo SVG, token manifest, primary/secondary button states, typography specimens Arabic/English, mobile/desktop/tablet layout comps, interaction/storyboard shots, motion principles with reduced-motion equivalents, dark/light color contrast audit, and actual browser screenshots after implementation. If image generation is unavailable, use original Blender renders and vector design; no fake placeholder image as proof.

## Editorial quality review
Every screen undergoes visual inspection at mobile portrait, mobile landscape, tablet, desktop and ultra-wide: alignment, realistic hierarchy, legibility over moving 3D, touchability, information density, loading/failure state, animation comfort, copy precision and linked experience. Final scorecard is independent of code tests: excellent code with bad visuals is NOT accepted; excellent visuals with non-working buttons is NOT accepted.
