# Software architecture and implementation contract

## Decision process, not rigid shopping list
Default candidate: Next.js or Vite React + TypeScript, Three.js + React Three Fiber + Drei, GSAP, CSS architecture with Tailwind/CSS variables, Zustand or reducer for domain state, Zod for structured validation, i18n with Arabic RTL and English, Playwright for E2E, Vitest for pure logic, Blender Python + glTF. Claude researches *current compatible versions* and decides. Do not mindlessly combine Next.js server features with client-only rendering or ship engine libraries not necessary. Prefer stable supported versions, lockfile, deterministic installs.

## Proposed modular package topology
/src/app or pages (routes, localized shell)
/src/components/navigation (menu, breadcrumbs, controls, drawers)
/src/components/three (canvas, lights, camera rigs, meshes, rays, selection)
/src/components/exterior (building scene, hover, floor picker, xray)
/src/components/floors (floorplate, apt selectors)
/src/components/interior (rooms, hotspots, camera presets, movement)
/src/components/configurator (material inspector, swatches, packages, history)
/src/components/gallery (consistent gallery, captions)
/src/components/amenities (wellness, sky dining)
/src/components/summary (finish board, PDF/print, contact demo)
/src/domain (project, floor, room, unit, surface, material, selection, validation)
/src/state (navigation finite-state, persisted selection)
/src/i18n, /src/lib, /src/styles, /src/fixtures, /tests
/public/assets (models, textures, renders, thumbnails, posters)
/tools/blender (source model and generation scripts)
/project_artifacts (research, QA evidence, checkpoint logs)

## Typed data contracts
Project: id, name, locationTextConcept, levelIds, brand, conceptOnly, architectureVersion, heroAssets.
Floor: id/level/label, category{ground,residential,wellness,dining}, elevationMeters, geometry IDs, units[] or zones[], availabilityDemo, amenities[], hotspots[].
Unit: id/floorId/typeId, bedrooms, bathrooms, nominalAreaSqm, areaBasis{gross,net,unknown}, roomIds[], planAssetId, cameraBookmarkIds, displayStatusDemo.
Room: roomId/unitId, labelAr/en, polygonMeters[], height, openingIds, surfaceIds[], cameraPose, galleryAssetIds.
Surface: surfaceId, sceneMeshNode, roomId, materialCategory, allowedMaterialIds[], baseMaterialId, uvScalePhysical, usageZone, specificationMetadata.
Material: materialId, catalogCategory, nameAr/en, appearance, pbrAssets, thermal/slip/microbial/fire fields verifiedOrUnknown, provenance, license, physicalFit.
Asset: id, src, type, byteEstimate, provenance, rights, version, semanticMapping, fallbackAssetId.
Selection: activeProject, floor, unit, room, surface, materialOverrides{}, selectedPackage, lighting, viewMode, language, schemaVersion; never persist credentials.

## State transitions and validation
App phases: landing, building, selectedFloor, floorPlan, unitDollhouse, roomInterior, materialInspector, gallery, amenity, summary. Each has allowed events and guard conditions. No unitSelected if floor is amenity; no bath-only tile on kitchen counter; invalid floor IDs fall back to safe landing. Serialize selection/version with migrations, validate payload with schema on restore and sharing. User can use Back, breadcrumb and reset without stale camera state. Model load states idle/loading/success/error with retries; disable actions dependent on unloaded model but keep data view available.

## WebGL lifecycle
DPR dynamic/quality tiers, contextual loading and GPU memory budgets, scoped material changes and texture cache, shared geometries, proper disposal/unmount, data-driven raycast target maps, no rendering after unmount, error boundary, context lost/recovered handling, import checks and 2D fallback. Never couple persisted selections solely to transient Three mesh references.

## Responsive localization
Arabic RTL root and localized components with LTR handling for Latin identifiers and measurements, no reversed numeric IDs. Content keys for every interface and alt text; suitable fonts properly licensed and bundled. On phones, 3D takes top with bottom sheet (not tiny sidebar), explicit selectable floor list, pinch zoom without scrolling conflict, safe areas, no hover-only info. Desktop 1440/1080, laptops 1366, tablets 768, phones 390/360 widths; test actual captured screenshots.

## Storage/backend and demo truthfulness
Start client-only curated demo or minimal demo server. No database required to fake sales operations. Local storage opt-in or explicit Save, print-to-PDF and link share. For future commercial product, propose separate backend and CMS/CRM as Phase 2 with auth, data lifecycle, audit logs. Never invent messages "Inquiry sent" if no endpoint; show "Demo recorded locally / not delivered". Do not store personal contact fields without consent; avoid transmitting to third-party services.

## Technical discipline
Define coding standards/ESLint/Prettier/tsc, package versions, documented commands, typed errors, component tests, Playwright flows, accessible tests, no production debug overlays. Treat compiler+browser results as evidence. Fail closed on invalid asset IDs; no eval, no HTML injection, no hardcoded third-party secrets. CI scripts if Git available. Branches/commits only inside project; ask before remote push or deployment.
