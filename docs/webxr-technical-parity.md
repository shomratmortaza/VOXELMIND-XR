# WebXR technical parity — 18 October 2026

The owner approved implementing Steps 2–7 before a physical Quest report. No physical-device verification has been supplied. This update is unpublished. Judge Mode remains removed. Native SDK parity is not claimed.

## Step 2 — provider abstraction (self-score 3/5)
`SpatialProvider` exposes getRoomModel, getSurfaces, anchor, restoreAnchors, onTrackingLost and onSurfaceUpdated. WebXR interpretation is contained in WebSpatialProvider: detected labelled planes and unknown mesh bounds → current hit → manual alignment → virtual floor. All features are optional except existing local-floor tracking needed for life-size VR.

Test: enter VR, open Spatial / performance, review active mode, choose Next surface, or Manual floor. Retry discovery after a denied feature. Virtual fallback cancels discovery and stays virtual until explicit retry. Unit tests cover precedence, tiny bounds, unsupported features and late-resource cancellation.

Risk: plane semantics and mesh availability vary; unknown objects are never classified as furniture/floor. Mesh extents do not establish complete room bounds or walkable clearance.

## Step 3 — partial scene understanding (self-score 3/5)
Room reports include floor height, labelled tables/walls/ceilings, floor bounds and heuristic observation confidence (not a probability or accuracy score). Live plane positions have small-motion deadband and smoothing; large changes are not silently interpreted as the same room. Missing observations use a brief grace window then fallback. Scene objects never move automatically with plane updates. Re-align saved requires an explicitly selected replacement if the original surface is gone, applies one undo snapshot and protects locked parts. Snap selected verifies the rotated furniture footprint within horizontal surface bounds and checks scene-object collisions. Real-world people/clutter clearance is not known.

Relative offsets/yaw are optional validated scene metadata and sync through existing Cloud Save/Open/revisions; local recovery retains them. A diagnostic persistent handle is not production anchoring. Persistent XR anchoring stays withheld until the owner's physical report proves create/reload/restore alignment. Confirm table is a user's manual classification, not a scan. Physical snapping/re-alignment is disabled in scaled tabletop mode to avoid unit mixing.

Test: select a part, Manual floor or select a browser-labelled floor/table, Snap selected, Save alignment, Save. Move/re-align the surface, Re-align saved, then Undo. Reload/Open on another signed-in session: alignment metadata remains; confirm the new surface before applying.

Risk: glass, low light, cramped and unseen rooms cannot be reliably solved with browser data. Guidance requests better lighting/manual alignment. Auto-reanchoring, complete mesh room semantics and physical occlusion are not completed.

## Step 4 — hands and head-directed assist (self-score 3/5)
HandleStore continues owning near-object two-pointer transforms. Interrupted visibility/tracking/session events cancel without a spurious scene/history update. Head-pinch mode uses thumb/index pose validity, time-based separation smoothing, 18 mm press / 32 mm release hysteresis and immediate cancellation when joints disappear. Near hand rays retain the installed library's interaction logic. Head-directed targeting uses the actual XR camera, not the stale desktop camera. Optional 1.2 second dwell allows safe navigation controls only; never consent, recording, deletion, Apply or scene edits. It is not eye tracking.

Board is recalled centrally when its direction drops outside the forward-field threshold, and uses tracked head height. It is not palm-attached. Left hand has no command ray/teleport; it assists near transforms. Comfort and Meta system-zone conflict must be checked on the headset.

Test: right-hand pinch a part, move/release; two-hand transform; cover/remove hand mid-grab and verify no commit. Head gaze on, Spatial / performance, Head dwell on: gaze at Close without pinch. Turn away from board and confirm forward recall. Near hand pose smoothing has not been rewritten to avoid disturbing the proven HandleStore path.

## Step 5 — implemented performance layer (self-score 3/5)
Production scene—not the diagnostic cube—publishes rolling 300 app-frame average/min FPS and average interval, last renderer draw calls/triangles and an approximate RGBA+mips texture-size hint. HUD budgets: target 72 FPS, minimum 60 FPS, 180 calls, 450,000 triangles, 256 MiB estimated textures. These are policy targets, never actual headset results.

After warm-up, quality lowers when rolling FPS is below 66 or counters exceed budgets: shadows disabled, requested fixed foveation raised if renderer accepts it, distant furniture switches to decoded-validated simplified meshes with texture detail. There is no automatic quality oscillation upward, refresh-rate change or unsafe mid-session framebuffer resize. Existing teleport floor instancing and shared GLTF geometry remain. All 16 active furniture assets now have full-detail Meshopt-compressed GLBs with resized WebP textures plus simplified mesh LODs. Full downloads fell from 32,952,424 to 8,943,296 bytes (72.9% reduction); all LODs total 4,187,928 bytes. Outputs were decoded, checked for nonzero triangle geometry/finite bounds and limited per-axis bounds drift before uploading. Locked opaque floor/wall/road geometry merges by finish/tint with metre UVs; selected, editable, glass and collision-highlighted parts stay independent. Local Draco/Meshopt/KTX2 decoding remains available. These models deliberately use WebP textures, not unverified KTX2 encoding; neither Draco nor KTX2 is claimed encoded. Original asset pointers remain for earlier deployments.

Test: toggle HUD, load a large world and check tier changes, close/re-enter to reset. Record at least 10 minutes on Quest 3. Use physical counters to tune budgets. Mesh LOD quality sacrifices distant triangle/texture detail without replacing furniture silhouettes with boxes. A one-metre threshold hysteresis avoids LOD thrash. Texture hint deduplicates shared sources and is estimated outside the render callback; it is not actual GPU allocation. Empty frame measurements never substitute a fabricated 72 FPS sample. Last production sample is included by Copy report on diagnostics, explicitly not device-verified.

## Step 6 — honest report (self-score 3/5)
`/tech` contains the Native feature / WebXR equivalent / Quest Browser status / Handling table. All rows are Partial, Fallback only or Not available. Nothing is Verified on device. Real measurements are TO FILL.

| Native feature | WebXR equivalent | Quest Browser status | Handling |
| --- | --- | --- | --- |
| MRUK room model | Plane labels / mesh extents, hit-test, manual, virtual | Partial | No complete scan or real obstacle clearance |
| Surface alignment | Bounded metre snap and relative save/re-align | Partial | Explicit confirmation, one undo, locked parts protected |
| Spatial anchors | Relative metadata in Cloud worlds | Fallback only | Persistent XR handles stay diagnostic-only |
| ISDK hands | WebXR joints, HandleStore, right head-pinch assist | Partial | Cancellation on interruption; physical precision unmeasured |
| Eye tracking | Head-directed pinch / navigation dwell | Fallback only | Never eye-tracking claim |
| FoV-aware controls | Central board with turn recall | Partial | Comfort/system-zone test required |
| Performance | Production HUD, shadow/foveation/mesh LOD tiers | Partial | Targets only, not 72/60 guarantee |
| Compression | Encoded Meshopt/WebP full-detail + mesh LOD; merged locked architecture | Partial | 32 decoded-validated assets; hardware effect unmeasured |
| Passthrough/depth/layers | Optional diagnostics | Partial | No production MR/occlusion claim |
| Native SDK binaries | No equivalent binaries in web app | Not available | Closest safe web fallback only |

### Why web
One-click URL/QR launch with no native installation; optional PWA home-screen support; same editable world across desktop, phone and supported Quest browsers. Meta VR Glasses browser availability/API support is unverified, not advertised as tested.

### Physical measurements
Quest OS/browser: **TO FILL**. Average/minimum FPS: **TO FILL**. Frame time: **TO FILL**. Calls/triangles: **TO FILL**. Texture hint: **TO FILL**. Hand precision/tracking loss: **TO FILL**. Anchor restore alignment: **TO FILL**. Comfort: **TO FILL**.

## Step 7 — robustness (self-score 3/5)
Session-bound hit requests use epoch cancellation; all spatial requests/reads fail safely. Visibility/end resets timing, cancels microphone and interrupted gestures; local world recovery and auth-gated Cloud autosave remain. Optional discovery errors display in the headset board with retry/virtual fallback controls, never remove the world. Renderer/model boundaries remain isolated and asset download retry stays available. No automatic immersive re-entry.

Test: deny VR, enter/retry, lose tracking mid-grab, switch hands/controllers, brief headset sleep, end/re-enter, disconnect network and edit, Save locally and reload. Persistent-location and sleep-resume fidelity still require physical hardware. Browser offline shell requires publishing and a connected installation visit; preview deliberately does not register a worker.

## Automated evidence
- 97 unit/regression tests passed; harness build OK.
- All 16 full and 16 mesh LOD assets fetched/rendered without page errors; near/distant models retain inspected furniture appearance. Full reduction 72.9%, recorded in docs/model-optimization.json.
- Fresh Chromium + test-only IWER: native gesture entry/denial, life-size tracked walking, controller teleport, controller and hand movement, two-controller uniform scaling/yaw, rendered catalog buttons, spatial panel/manual surface/alignment/HUD/local Save, exit and local recovery passed without page errors.
- Head-directed actual emulated right-hand joint pinch opened spatial panel; safe head dwell closed it. Tracking-interrupted grab produced no undo snapshot or object change. Forward-field board direction after turn exceeded 0.98 dot in simulation.
- Signed-in real UI Cloud Save/Open retained alignment and object values; History opened. Offline edit retained local recovery. Optional undefined fields are stripped by schema; coordinates/alignment match.
- Phone 440×727 studio and technical page fit; technical table scrolls internally.
- Emulator frame rates are deliberately not recorded as Quest measurements.

## Outstanding
Physical Quest capability, comfort, sustained frame rate and persistent location require the user's report. The software uses validated compression/LOD and locked static batching; no physical performance claim follows from asset reductions. Browser/native-only limits (complete semantic scan, eye tracking and persistent device location) remain honest fallbacks, not postponed ordinary implementation. Installed offline launch requires publication; no publication requested this turn. Existing unrelated broader realism/legal roadmap tasks remain separate.
