# Autonomous execution, reboot and checkpoint protocol

## Authority and boundaries
Owner wants Claude to do all *ordinary project work* autonomously, including research, local coding, Blender tasks, installation of inspected free project-scoped dependencies, tests, repairs, documentation. Avoid repetitive questions about harmless aesthetic defaults. However explicit confirmation is still required for spending money/using paid APIs, publishing/deploying to a real external website, modifying OS/global policies, entering personal accounts, touching other projects, changing security settings, granting permission escalation, or contacting third parties. Never override safeguards with an auto-approve bypass.

## Checkpoint every substantial unit of work
Maintain /project_artifacts/PROGRESS_LOG.md with: timestamp, phase, achieved proof, next 3 tasks, blockers, commands that work, working source commit, critical model/render paths, active dependency versions, artifacts output, test state. Create /project_artifacts/RESUME_HERE.md with compact human-readable restart instructions updated after each milestone and before long renders. Use Git staged commits inside the new project (no remote push), and keep local backup of durable originals. Do not write checkpoints during half-written JSON or compile steps; atomic write-then-rename for derived state when possible.

## Power loss and stopped session
Computer power loss or user shutting down PC **stops actual execution**; Claude cannot continue on a powered-off computer unless separately configured reliable infrastructure exists. This protocol preserves reproducibility, not magic background work. On restart Claude reads RESUME_HERE.md and build/test logs, checks partial renders for corruption, resumes at last verified checkpoint. Blender can use checkpointed source .blend and chunked render outputs; do not promise completed work while machine is off.

## Render resilience
Auto-save .blend source and output manifests; use unique file naming and content hashes, avoid overwriting last good hero render until new version verified. If GPU render OOM, lower samples/resolution/denoiser memory or switch engine and record visual tradeoff, never claim unchanged quality. Reproducible scripts with seeded random choices. After interrupt, detect incomplete files and rerun only needed assets.

## Task scheduling
Operate in finite phases rather than a single fragile monolithic run. Keep every milestone buildable. Prefer focused 30–90 minute chunks if environment supports, but do not make time guarantees. When session/token limits approach, checkpoint RESUME_HERE.md with precise next actions so next session can pick up; no false background continuation. The user should only need to say "continue from RESUME_HERE.md" on a restarted session.

## Troubleshooting loop
One failing task: inspect error -> reproduce -> isolate -> smallest fix -> rerun automated tests -> capture evidence -> checkpoint. If failure repeats twice without new evidence, research alternative and adjust ADR. If a critical external paid dependency appears, replace it with free/open alternative or mark blocked; never sneakily buy it. If a weak scene looks toy-like, do not mark visual gate done; invest in source renders and shading or use honest hybrid.

## Completion proof
A runnable local URL/process status checked in runtime, commands, successful build result, representative E2E evidence, known limitations, where source and renders are located. Never assert a URL is live unless actual tested process is running. Notion of "all done" requires release gate evidence, not subjective optimism.
