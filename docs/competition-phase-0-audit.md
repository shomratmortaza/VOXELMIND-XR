# Phase 0 — audit, 18 October 2026

Code inspection plus previous automated evidence, not physical Quest testing.

## Working evidence
97 regression tests and a clean build; prior browser evidence for live reviewed AI, private Cloud Save/Open/history, local recovery, optimized furniture, desktop/phone fit and IWER entry, grabbing, resizing, teleport and interruption cancellation. Re-run after changes. No real hardware performance evidence.

## Broken or absent experience paths
Production passthrough is absent (only diagnostics requests AR); normal entry forces life-size and requires walkable clearance. Table is static at 0.42 m and not bound to a detected real table. AI receives no room geometry. Eye input is not distinguished from generic gaze. Dwell depends on tracked hand presence. No accessibility settings, public share workflow or contextual hands tutorial. Public guide repeats controller-first and untested notes. Existing frame budgets are targets, never guarantees.

## Controller dependencies (file/function)
- `xr-store.ts/getXRStore`: optional left-controller teleport, right-controller grab/ray through library defaults.
- `Viewport.tsx/SceneItem`: HandleStore is input-neutral, accepts hands/controllers and excludes teleport.
- `TeleportFloor.tsx/TeleportFloor`: library teleport target; currently mounted in life-size flow.
- `XRPanel.tsx/PanelButton`: pointer-neutral, not controller-required; presence status checks controllers.
- `guide.tsx/SECTIONS`: controller-first teleport instructions, not a runtime requirement.
No app gamepad polling or controller-only save/AI operation. Existing headset Save supports local zero-login recovery.

## Quest performance risks
Frame-loop collision/gesture work; unique clone materials prevent furniture instancing; per-part LOD callbacks and asynchronous downloads; scene-size draw counts; transparent highlights; runtime shadows; frame-time measurements are app intervals, not GPU/compositor. Encoded Meshopt/WebP and simplified mesh LODs already exist; KTX2/Draco decoder availability does not prove encoded KTX2/Draco assets. Target 72/minimum 60 remains unmeasured.

## First 60 seconds and accessibility
Entry depends on walkthrough clearance, board lacks explicit seated setup, no guided pinch/resize sequence or tangible room context. No handedness/height/distance/text/contrast settings. Head dwell only works with a tracked right hand and only navigation. Voice currently uses WAV transcription despite browsers sometimes exposing recognition. Save account dialog lives on screen; headset local save is available. Keyboard desktop properties remain a fallback.

## WebXR feasibility
| Feature | Quest Browser support established here? | Implementation/fallback |
|---|---|---|
| Immersive VR / AR | No device report; query runtime | Explicit session gesture; virtual browser editing on denial |
| Hands | Live joints in emulator only | Optional hands; controllers/browser fallback |
| Eye tracking | Not established; gaze source is not eye proof | Label observed gaze input separately; head-gaze assist |
| Plane/mesh | Optional and browser-dependent | Labelled surfaces / bounds; hit-test, manual, virtual |
| Hit-test | API/runtime result required | Manual table placement when absent/no hit |
| Anchors | Diagnostic creation only | Relative-to-surface pose with explicit re-align |
| Persistent anchors | Reload physical alignment unverified | Do not enable production persistent-location claims |
| Depth | Diagnostic optional data only | No physical occlusion claim; translucent preview |
| Passthrough | AR session runtime required | Transparent stage; table/wall/floor-bound placement when observed |
| Speech | API detection, permission and transcript required | Browser recognition, audio transcription, quick commands |
| Performance | TO FILL | Production HUD, adaptive effects/LOD; no 60/72 guarantee |

## Provisional scores
Innovation 3/5 — reviewed spatial AI and portable editor, no purposeful MR yet.
Experience 2/5 — life-size/controller-first entry and inaccessible dwell.
Technical 3/5 — tests/recovery/compressed assets; hardware remains unverified.
Polish 3/5 — coherent brand, but stock-like imagery and no real footage.
