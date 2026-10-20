# Superseded scope: Step 1 only

The later user correction rejects Judge Mode. Its controls and tutorial were removed. The current deliverable and Quest instructions are in quest-capability-step1.md. Plans below are historical audit suggestions, not approved implementation.

# Competition readiness — 18 October 2026

## Changes
Added guarded generated offline PWA, SVG-derived install icons, /vr and home QR, privacy/terms, shared-store voice consent (DOM and XR), local current-world recovery and authenticated debounced Cloud autosave, zero-login furnished Judge Mode with self-paced five-stage hands tutorial. Left-hand command teleport removed; near-object two-hand assistance retained. Board centered and recenterable. Diagnostics is separate from production editor and requests only optional capabilities; /tech describes evidence honestly.

## Audit: existing versus unfinished
Live text/voice proposals, review/apply, undo/redo, private Cloud save/open/revisions, realistic CC0 furnishings, meter-based transforms and hand/controller editing exist. Previous IWER checks established simulated interaction, not hardware quality. Physical Quest tracking, microphone, comfort, performance and full hands-only behavior remain unverified. Purposeful real-table/room design, a SpatialProvider, room-bound edits and anchored saved-world returns are NOT production features. Diagnostics does not imply these are implemented.

### Controller dependencies
- src/components/studio/xr-store.ts getXRStore: left controller teleport and both-controller grab fallback. Left hand has near grab only; right hand owns command ray/pinch.
- src/components/studio/Viewport.tsx SceneItem: HandleStore receives both hand/controller pointers; commit at gesture finish. TeleportFloor supports life-size movement; seated Judge Mode needs no locomotion.
- src/components/studio/XRPanel.tsx PanelButton: common pointer events for UI, no controller-specific button requirement.
- src/components/studio/GazeHand.tsx HeadPinchPointer: right-hand select events drive head direction; not eye tracking.

### Capability feasibility
| Feature | Current implementation | Evidence / fallback |
|---|---|---|
| immersive-vr | Native support + gesture entry | Emulator evidence; physical unverified |
| immersive-ar | Optional diagnostic session | Device report required; virtual production room |
| hands | Joint/raw pinch probe + existing XR pointers | Physical occlusion/precision needs test |
| hit-test, planes, mesh | Optional probes + live values | No spatial room-provider rollout until report |
| anchors/persistent | Diagnostic create, marker, handle restore | Device create/reload/restore needed; saved-world anchoring absent |
| depth/layers | Optional requests and grant/data observations | No native MRUK/ISDK claimed |
| eye/gaze | Gaze-like input probe; head-pinch assist | Gaze-like source does not establish eyes |
| speech | API-presence check; audio transcription | Mic needs physical test; consent gate added |
| offline/PWA | Local recovery + guarded generateSW | Installed offline navigation needs publishing/first online visit |

### First-minute / accessibility
Judge starts nine-part virtual lounge with right-pinch select, shape, describe, review and save stages; under-one-minute initial tutorial is skippable, no timed actions. Targets >=5.5cm high. Physical system-zone/FoV fit not certified. Adjustable height/distance/text, high contrast, dwell and full voice-only navigation remain gaps. No production table scan or automatic tutorial gesture detection claimed.

### Performance risk
DPR cap 1.5, 1024 shadows and once-baked environment do not prove target FPS. Model texture memory, shadows, draw calls, per-object handles and large-scene triangles need device profiling. Diagnostic cube FPS/counters describe only that probe, not full editor or compositor/GPU/thermal performance. Target remains 72 FPS, minimum 60, not measured.

## Provisional reviewer scores (not official)
| Criterion | Score/5 | Three biggest losses |
|---|---:|---|
| Innovation | 3 | No purposeful real room, no production anchors, no verified eye input |
| Experience | 3 | Unverified physical comfort, manual tutorial progression, cold-start target unmeasured |
| Technical | 2 | No physical run, no sustained FPS, spatial parity still probes only |
| Polish | 3 | Limited catalog, operator legal/contact missing, real footage absent |
Entry, trust and recovery improved; technical score cannot rise on fabricated hardware evidence.

## Priority / rough effort
P0: Quest diagnostics and hands-only 10-minute run (1–2h device); capability-backed SpatialProvider and real-table alignment after results (2–4 days); physical tracking loss and mic-denial tests (half day); editor GPU/frame profiling (1 day). P1: UI/accessibility options (1–2 days), optimized catalog/audio (1–3 days), read-only sharing/before-after (2 days). P2: collaboration and further model coverage (separate scope).

## Quest manual checklist and report
Publish update first. Open /diagnostics on HTTPS Quest Browser, Probe VR then separately Probe passthrough. Move hands, right pinch, inspect joint/plane/hit/mesh/depth data after ending. Create anchor with floating right-hand button, end, reload, reenter and restore; confirm marker alignment physically. Copy report and paste with headset/browser version, lighting and placement observations. Record failures verbatim, not guessed support.
Open /vr > Judge Mode > Enter VR. Seated: right pinch/select/move, two-hand near-object resize/yaw (no left palm-up menu gesture), consent, Speak/Finish, review/Apply/Discard, Undo/Redo, Save device, Exit, Continue. Repeat occluded hands, system menu, sleep/resume, mic denial, offline, three different rooms, low light/small/cluttered rooms. Virtual-room success is NOT purposeful passthrough evidence.
Install on supported phone/browser after connected visit; load models, disconnect, edit, local save, close/reopen cached studio, export, reconnect/sign in for Cloud. Confirm preview never registers a worker. A first-ever offline visit cannot fetch missing models.

## Submission: 90-second real-footage shot list
0–10s QR/short URL/furnished scene; 10–25s right pinch and two-hand shaping; 25–40s voice consent/command/progress; 40–55s review Apply/Undo; 55–70s device save/leave/reopen; 70–90s honest capabilities and limitations. Show actual real table/anchor footage ONLY once device-confirmed; no generated gameplay video.

## Verification and blockers
Browser/test results are recorded in roadmap. Physical Quest report blocks spatial-provider choices, sustained performance and device verification. Operator contact/legal review blocks final privacy/terms completeness. No automatic publication. No code freeze yet: owner approves final tested submission before Nov 18, 2026; no modifications after final freeze/submission.
