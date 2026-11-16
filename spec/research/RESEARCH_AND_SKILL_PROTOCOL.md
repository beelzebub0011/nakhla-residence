# Mandatory deep research, skills, GitHub and tool acquisition playbook

## Research with evidence
Begin with a 60–120 question checklist categorized by architecture, climate, site, structural, fire/MEP, accessible design, pool, restaurant, shisha local regulations, web 3D, Blender, rendering, scene selection, materials, licensing, localization, WCAG, mobile and benchmarking. Research from official primary sources first; timestamp links; store in project_artifacts/RESEARCH_LOG.md. For each claim record question, link, publisher, publication/update date (if visible), interpretation, uncertainty, effect on design. Cross-verify high-stakes rules before relying on them. When source unavailable, state assumption, never invent an authority. A beautiful rendering does not constitute validated design approval.

## Architecture benchmarking
Inspect at least 3–5 publicly accessible premium 3D property exploration sites/demos for *interaction patterns* (not copying), and 3–5 climate-conscious residential buildings or modern Iraqi architecture examples for typology. Record what is transferable: building navigator, floor heatmap, isometric cutaway, gallery, finishes inspector, material board, day/night, 2D accessibility fallback, guided tour. Note mismatches with Basra context. If video/reel reference provided, extract navigation/storyboard and useful frames; don't pull production assets or logos from it.

## Technical alternatives
Compare Vite+React vs Next.js (SEO/localization/static hosting), R3F vs native Three (integration/optimization), Blender/Eevee/Cycles vs hybrid (quality/hardware), true realtime interior vs prerendered panorama (user choice requirements), GLB+Draco/Meshopt/KTX2 optimization, 2D backup. Use decision matrix: fidelity 30%, reliability 25%, performance 15%, integration 10%, maintenance 10%, free cost/license 10% (modify weights with rationale). Verify actual current versions and installation instructions; dependency scanning and lockfiles.

## Inspect existing environment and user skill installation first
1. Detect Windows 11 shell/PowerShell vs WSL, Python/pip/uv, Node/npm/pnpm, Git, Blender, FFmpeg, Python GPU packages, browser/test runner. Record versions.
2. Check project files and existing Claude Code skill directories, plugin registries, MCP servers and already installed commands; do not read secrets or unrelated personal data. Never install something duplicate or incompatibly layered.
3. Identify skills relevant to: creative web design, 3D/Blender automation, Three.js/R3F, browser testing, code quality, SVG/icon/typography, asset optimization, GitHub exploration, accessibility, architecture, source licensing, video storyboard if genuinely used.
4. A user's earlier preference explicitly includes `Lemo-Opuscar` (lemomo-ai/lemo-opuscar) for motion/video workflows. Check whether installed and applicable to optional promotional motion capture; **do not falsely make it a dependency for an interactive website** or download if irrelevant. If useful, inspect security/licenses/compatibility and apply only to promotional guided trailer.
5. Consider official/maintained tools before community skill wrappers: Blender Python API, Three.js/R3F/Drei, GSAP, Playwright, glTF Transform, Google Lighthouse, axe-core, typography/font tools, standard code architecture skill; versions and license check mandatory.
6. For each candidate third-party skill/repository, produce audit card: URL, organization, stars (if trustworthy), recent activity, license, exact version/ref, transitive dependencies, file read/write/network/shell scope, trust, evidence screenshots, alternatives, estimated value. Stars are NOT safety proof. Inspect scripts and prompts for prompt injection/credential theft/data exfiltration. Pin commit/semver if possible. Do not pipe remote script into shell (`curl | bash`), use official package managers, no elevated permissions unless essential and explicitly permitted.
7. Install only vetted relevant FREE tools, preferably inside isolated project (local node_modules, Python venv, pinned packages), document `SKILLS_AND_TOOLS_MANIFEST.md`, commands and reversal/removal. No paid subscription/auth tokens/telemetry without user's explicit consent.
8. If Claude cannot install tools (chat-only or permission constrained), specify exact commands for later and continue designing/building what can be built; never claim installed when not.

## Parallel agent use
If available, delegate bounded, read-only research tasks to subagents: architecture/urban rules, 3D pipeline, UI/UX, skills/security, testing/accessibility. Synthesize in main agent only after cross-check; do not allow simultaneous agents to edit same files without ownership rules. No uncontrolled recursive agent spawning, token waste or accidental cross-project browsing. Agent roles are optional, not an excuse to defer execution.

## Stop rules for research
Do not let endless skill hunting block a working vertical slice. Start implementation once minimum viable decisions are validated; schedule focused research for unknowns that actually change implementation. If a feature requires a questionable license/regulation, omit that risky representation and build an honest alternate.

## Mandatory research outputs
PROJECT_ARC_RESEARCH.md; REFERENCES_AND_LICENSES.csv; DESIGN_ALTERNATIVES.md; STACK_ADR.md; SKILLS_AND_TOOLS_MANIFEST.md; RISK_REGISTER.md; COST_AND_PERFORMANCE_BUDGET.md; DESIGN_ASSUMPTIONS.md. Include actual URLs and access dates, not vague "research completed" claims.
