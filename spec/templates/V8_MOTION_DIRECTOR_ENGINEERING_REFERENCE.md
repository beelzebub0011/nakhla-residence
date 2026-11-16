# Motion orchestrator reference (implementation guidance, not a finished TS component)

Use this as a design reference; choose the project's TS/JS framework after inspecting actual codebase. Do NOT attach OrbitControls and a GSAP tween as simultaneous camera owners.

```ts
type MotionPhase = 'idle'|'preparing'|'playing'|'paused'|'cancelling'|'recovering'|'reduced-motion';
type MotionIntent =
  | {type:'FOCUS_FLOOR'; floorId:string}
  | {type:'ENTER_UNIT'; unitId:string}
  | {type:'ENTER_ROOM'; roomId:string}
  | {type:'RETURN_TO_TOWER'}
  | {type:'OPEN_AMENITY'; amenityId:string}
  | {type:'CHANGE_MATERIAL'; surfaceId:string; materialId:string}
  | {type:'STOP'};

type MotionRequest = {
  token: number; intent:MotionIntent; startPose:Readonly<CameraPose>;
  destination: CameraAnchor | null; startedAtMs:number;
  abortController:AbortController;
};

// Each frame: dtSeconds = clamp((nowMs-prevMs)/1000, 0, 0.05).
// Smooth scalar/vector chase: alpha = 1 - exp(-lambda * dtSeconds).
// Orientation: Quaternion.slerp toward shortest-path target; do not lerp Euler degrees.
// Smoothly retarget from CURRENT rendered pose and velocity when a new intent arrives.
// Commit selected floor/unit/material canonical state separately and atomically.
// Preserve focus/accessibility state and navigation history even if animation cancelled.
// Reduced motion: go to final semantic state promptly without flying the camera.
// Asset prepare: await only required lightweight metadata; never block whole UI on network.
// Exiting transition: dispose animation callbacks, owner token, old asset references.
```

## Suggested frame profiling record
`transitionId, deviceTier, browser, fpsMedian, frameMsP50, frameMsP95, frameMsP99, hitchesOver50ms, gpuMemoryDeltaMb, navigationInterruptions, reducedMotion, evidencePath, verdict, notes`.

## Key test design
Use a reproducible 4-locales, 3-device-tier script of 20 tower->room->tower cycles; sample frame times during movement rather than idle FPS. Include keyboard focus and reduced motion. A baseline screenshot does not detect an animation's hitch: record a frame time trace and timed image sequence at 0%,25%,50%,75%,100%.
