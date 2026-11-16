# Windows 11 Claude Code: zero-friction startup and local workflow

Suggested user action: put this ZIP in a new empty folder and let Claude Code open/read START_HERE.txt. Some interfaces cannot read ZIP contents directly; if so, extract it first. If only a chat attachment is supported, attach MASTER_PROMPT_COMPLETE.txt alone; it contains the instructions and embedded supporting docs. The user cannot expect a chat-only model to install Blender or run code without a connected computer/runtime.

Claude environment actions:
- Detect PowerShell, Git, Node, Python and Blender using standard version queries before installing anything; try binaries already in PATH. If not installed, choose a reputable official installer only with required authorization and no elevation bypass. Prefer Node dependencies in project and Python venv in project.
- Use `npm ci` where lockfile exists, or safe pinned installation when initializing; no `npm install -g` by default.
- Use Blender headless `blender -b source.blend --python script.py` only after `blender --version` confirms actual installation; do not assume binary name/path.
- Validate glTF assets and run browser tests; launch with `npm run dev` or exact package scripts actually configured, not random assumptions.
- Create optional `start-demo.ps1` with conservative commands, no disabling execution policy or mutating system settings. Explain Windows security warnings and do not ask for blanket PowerShell auto-execution bypass.
- Save work before large GPU renders and keep files within this project directory. Checkpoint after scene updates.
- If Blender is missing and installing it is blocked, work on licensed original scene alternatives or create generated proxy geometry in Three.js temporarily, clearly mark visual quality gate open until Blender-quality visuals available.
- Do not assume the user has a paid proprietary render service, cloud VM, licensed plugins or unlimited token budget. Prefer free local tools and reasonable rendering loads.
