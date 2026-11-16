# Motion language and cinematic interaction direction

## Creative direction
Mood: restrained architectural film, premium boutique property showroom, trustworthy contemporary Iraqi luxury. Slight camera weight, elegant easing, minimal UI. NOT cyberpunk, hyperactive TikTok transitions, glitch overlays, oversaturated neon, random bouncing elements or loud whooshes. Motion serves spatial context. Brand reveal establishes architecture and orientation.

## Camera choreography
Use actual camera pose structs {position,target,fov,roll,near,far,duration,ease,sceneId}. Avoid generic hardcoded fake orbit around invisible target. Author and validate poses for: Hero 3/4, front, facade close, selected level, exploded level, aerial unit, living eye-level, kitchen, master, bath, balcony, pool entry, gym, restaurant dusk, rooftop terrace, final wide. For each transition implement end-state reconciliation when interrupted, reversed or viewport changes.
- Hero reveal: subtle transition from warm mist/light into architectural 3/4 view, brand typography emerges only after useful image; user can skip.
- Floor hover: 100–250ms responsive material/outline, no camera hijack. Floor click: 0.8–1.8s smooth focus/extraction when motion allowed, fast if repeated taps.
- Floor to dollhouse: controlled cutaway and easing, maintain orientation and unit center. Avoid clipping through walls; if layout doesn't allow a collision-free continuous flight, use a masked match-cut, never fake impossible movement.
- Room to room: interpolation with collision map or deliberate architectural cut; ensure doorway/windows aligned; no rapid roll/pitch.
- Material swap: near-instant (<500ms perceived after cached texture) surface update with restrained crossfade if no PBR artifact; inspector transitions independent of camera.
- Gallery: 250–500ms image change, no heavy GPU effects; swipe/keyboard cues.
- Guided tour: distinct scenes, optional original ambient audio with user-triggered playback and mute controls. No copyrighted audio from reference reel; do not auto-play audio.

## Technical motion rules
Use one timeline owner for critical route transitions, event sequencing finite-state machine. Cancel current tween on new input, maintain target and camera consistency; clean up GSAP contexts/listeners. On-demand Three render loop when idle. Respect `prefers-reduced-motion`; preserve immediate navigation and comparable content for those users. Test scroll wheel, trackpad, touch swipe, native vertical scroll and tab focus. Avoid scroll-jacking on mobile and special keyboard gestures.

## Filmic composition QA
The tower must read against skyline at desktop 16:9 and phone 9:16 without cropping the crown/balconies. Text and model never collide; annotations avoid window frames/hotspots. Warm/cool color balance, stable horizon and shadow direction. Artifact inspection: screenshot at 0/25/50/75/100% each major transition; no flickering geometry, accidental hide, camera inside walls, clipped panels, disorienting reverse motion.

## Audio and accessibility
Optional ambient score only if original/licensed; no sound required for comprehension; captions for narrated guided tour if any. Interactive sound effects subtle, optional and entirely muteable. Screenreader announces selected floor/unit/material without spamming on hover; keyboard access maps all camera-independent choices.


## V3 camera ownership override
A mode-controller state machine owns camera animation. No two active tween controllers; cancel old on user action; safe intermediate paths with collision; reduced motion and Escape/Exit always available. Four modes in `specs/EXPLORATION_CAMERA_MODES_V3.md`. Scene camera and typography/motion effects must be coherent.
