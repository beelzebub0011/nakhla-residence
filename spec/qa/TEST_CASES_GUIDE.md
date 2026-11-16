# Test trace and deliverable evidence guide
For each e2e: record step, input, expected behavior, actual result, screenshot or trace path, bug ID, retest. Do not mark a test passed simply because code exists. If automated interaction with WebGL meshes is flaky, expose semantic UI floor list that reaches same state and test that, then separately manually confirm actual raycasts via visual/browser evidence.

Visual acceptance: hero fills 16:9 and 9:16 without clipping; building silhouette 12 levels consistent; exposed slab not hollow; architecture/no floating floor; textured balcony and main facade; luxury room renders believable; 3D material updates obvious; label not occluded; compare uses same exposure; Arabic typography no disconnected letters; polished loading and empty/error states; photographic gallery captions honest; mobile controls not overlapping bottom browser chrome.

Performance acceptance: graph load time per scene, active renderer memory, material swap time at cached state, network bytes, LCP and CLS where measurable. No fabricated FPS claims. Gate only on confirmed metrics or recorded environment limitations.
