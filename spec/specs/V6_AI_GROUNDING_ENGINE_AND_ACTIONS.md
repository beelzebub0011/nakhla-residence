# V6 — ENGINEERING CONTRACT FOR GROUNDED CONTEXTUAL QUESTIONS, ACTIONS AND ZERO-HALLUCINATION DATA

## The only correct source of answers
Build one typed `PropertyKnowledgeGraph` as a SELECTOR/ADAPTER of existing tower_concept, navigation_manifest, room_program, material_catalog, finish_packages, geometry metadata and actual live state; do not manually replicate data in code or prompt. The demo source files are not construction-approved. Treat every field's provenance and verification status as data. Deployers can later switch to approved client datasets through white-label schema without changing behavior.

Mandatory entity IDs: projectId, floorId, unitId, unitTypeId, roomId, selectedSurfaceId, materialId, finishPackageId, amenityId. Canonical ownership of selection remains core app state. `sourceRecordRef`, `sourceHash`, `geometryRevision`, `verificationStatus`, `verifiedBy`, `verifiedAt`, `areaBasis`, `unit`, `precision`, `lastUpdated` are supported fields, never fake-filled. If display label changed language, ID must not change. `room dimensions = null` is a meaningful fact; never fill with derived guessed rectangles. If CAD DXF dimensions are inconsistent with Blender mesh scale, mark invalid/UNKNOWN and block answering dimension values until resolved.

## Answer data flow
User text -> locale-normalized (NFKC where suitable, preserve Kurdish/Chinese semantics) -> PII-safe minimal query -> IntentClassifier/fuzzy lexical index -> EntityResolver (explicit IDs first, then selected unit/mesh/room, never hidden guess) -> DomainSelector -> FactCalculator/GeometryVerifier -> AnswerComposer(locale) -> ResponseEnvelope + suggested validated UI action -> accessible in-context display. A low-cost client-only engine suffices for P0. Do not send input to any third party by default. If no confident intent -> 3 relevant query chips and concise explanation, not fabricated answer.

TypeScript type expectations, implement production code not this text as-is:
```ts
type FactStatus = 'verified_source' | 'concept_estimate' | 'demo_schema' | 'unknown' | 'proposal';
type AnswerEnvelope = {
  questionId: string;
  text: string;
  locale: 'ar'|'en'|'ckb'|'zh';
  status: FactStatus;
  citations: Array<{sourceId: string; fieldPath: string; revision?: string; label?: string}>;
  entityContext: {floorId?: string; unitId?: string; roomId?: string; surfaceId?: string; materialId?: string};
  suggestions: Array<{labelKey: string; toolActionId: string; args: Record<string,string>}>;
  uncertainty?: string;
  answeredAt: string;
};
```
Citations are INTERNAL property-source pointers, not fake website citations. The UI can show source-label or disclaimer. If a fact has `status: unknown`, ensure no numeric value is generated.

## Geometry measurement rules (P0 source validation, P1 interactive measurement)
1. Define a project-wide meters scale/axis, glTF coordinate orientation and transform version. NEVER assume raw scene unit = meter without verifying.
2. Differentiate nominal room bounding box, true usable room polygon, openable volume, floor-to-floor and finished ceiling height; report exact basis and units.
3. Calculate room footprint polygon area with holes excluded; geometry can be nonrectangular, don't output fabricated L×W. A room-specific numeric answer requires audited polygon or dimension record, not merely approximate building footprint.
4. Wall length from actual selected wall mesh, endpoints/transforms; no magical raycast pixel estimate. Door/window clear openings from opening schedule. Pool dimensions, depth, width, floor slab loads require verified architecture and structural records.
5. Precision follows input. Prefer 1 decimal meter where physically warranted, no "1.234567m" from imperfect mesh. For concept data clearly identify as illustrative.
6. On suspicious mismatch (computed area > containing unit area; window > wall; invalid polygons; mismatched vertical heights; floor wrong; room intersects corridor), fail safe to unavailable and open internal validation issue.
7. If future real approved CAD/BIM import, record author/approval, immutable revision, measurement method, units, floor mapping, privacy/usage permissions before verified labels.

## Material state
selectedSurfaceId -> exactly one semantic material slot -> current active finishPackage/base materialId -> applied user override if present -> catalog record. Never answer on base package if current override changed. Distinguish appearance / grade / brand / origin / dimensions / price / wet-rating / slip class, and leave absent fields UNKNOWN. If category invalid for selected surface, do not apply replacement; show applicable alternatives. Re-render material first after explicit user confirmation; assistant replies using committed active ID; if user cancels restore previous choice. Material passport and assistant must agree with 3D shader and PDF.

## Typed actions, never free text execution
Implement a fixed registry; each action validates arguments against canonical entity ID allowlists, active capability, route, state transition and permission before firing. Supported examples: `selectFloor`, `selectUnit`, `focusRoom`, `focusSurface`, `openMaterialPassport`, `openFloorPlan`, `openComparison`, `openAmenities`, `navigateToAmenity`, `openMeasurements`, `openFinishEditor`, `previewMaterial`, `confirmMaterialChange`, `resetCamera`, `show2DAlternative`, `openCreatorContact`, `openPrintSummary`. NEVER allow AI-generated JavaScript, arbitrary routes, external URLs, `eval`, OS commands, API tokens, background email/calls, purchasing, booking or changing pricing/availability.
- Text-only factual answers need no UI state change.
- "خذني للمسبح" -> show action button and upon click move to F10/indoor_pool; if user's navigation framework permits immediate intent navigation, user message itself is the explicit action, but still validate IDs, preserve prior selection and offer Back.
- "بدل المادة" -> show allowed preview options; confirmation for committing customization (undo available).
- "أرسل مواصفاتي" -> show copy/share preview and explicit separate submit, no automatic messaging.
- If 3D mesh not loaded / low device performance -> same information + 2D navigable UI.

## Generative extensions OPTIONAL and gated
Do not invent a local unrestricted ChatGPT if no model present. An optional LLM (API or locally run) MAY be used only if enabled by owner following cost/privacy/security evaluation; never embed provider keys in shipped JS or static metadata. Must use retrieval and structured tools; deny hallucinated direct free-form facts. Strict schema-validate tools. System-level LLM instructions independent from user inputs; retrieve text as untrusted data. Minimize and redact visitor PII, no stored raw chats by default, privacy notice, limited retention with opt-in. Rate limit, timeout, safe fallbacks to local deterministic engine. Third-party model access not allowed before explicit approval. No hidden billing or required user-provided credentials. All facts from canonical app metadata and citations are revalidated by server before response.

## Code architecture and ownership
Suggested logical modules: `assistant/useContextSnapshot.ts`, `assistant/intentIndex.ts`, `assistant/factResolver.ts`, `assistant/geometryAdapter.ts`, `assistant/materialResolver.ts`, `assistant/answerTemplates.ts`, `assistant/actionRegistry.ts`, `assistant/assistantStore.ts`, `assistant/i18n.ts`, `assistant/AssistantPanel.tsx`, `assistant/assistant.spec.ts`; actual framework design decision to be researched. Prefer code splitting / dynamic import. No second WebGL renderer, no AI polling, no hidden GPU work while assistant closed. Memory bounded to current session; locale/context changes invalidate stale reply. Use React Suspense/progressive enhancement as appropriate, no UI thread stalls.
