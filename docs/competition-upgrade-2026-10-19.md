# VOXELMIND XR — competition upgrade evidence

Date: 2026-10-19. This is an incremental implementation audit, **not a certification, device test, or final eligibility determination**. Nothing was published or deployed in this task.

## Official sources reviewed

- [Meta competition announcement](https://communityforums.atmeta.com/discussions/News_and_Announcements/meta-vr-start-developer-competition-2026/1384076)
- [Official rules](https://start-developer-competition-26.devpost.com/rules)
- [Judging](https://start-developer-competition-26.devpost.com/details/judging)
- [Resources](https://start-developer-competition-26.devpost.com/resources)
- [IWSDK overview](https://developers.meta.com/vr/documentation/iwsdk/guides/overview/)
- [IWSDK testing](https://developers.meta.com/vr/documentation/iwsdk/guides/02-testing-experience/)
- [Project manifest](https://developers.meta.com/vr/documentation/iwsdk/guides/01a-project-manifest/)
- [Migration guidance](https://developers.meta.com/vr/documentation/iwsdk/guides/09-native-scene-migration/)

The official judging page identifies equally weighted Innovation & Creativity, Experience Design, and Technical Implementation. Technical criteria include minimum 60 FPS on Quest, hand/gaze interactions, spatial anchoring, meaningful passthrough room use, and field-of-view-aware design. These are not grounds for inventing a fourth weighted criterion or a perfect score.

Meta emphasizes hands-first, controller-free end-to-end use and seated/short-session design. The resources page explicitly contemplates IWSDK/WebXR submissions and specifies GitHub Pages or Vercel deployment for them. The current Lovable URL alone should **not** be treated as satisfying that hosting requirement. Hosting migration is not implemented or tested here, and deployment is prohibited without approval.

Submission closes November 18, 2026 at noon PT. Membership, age, residency, developer-access eligibility, complete submission artifacts and live submission form still require entrant confirmation. The accessible official materials did not establish a complete artifact checklist; no mandatory video length, format, or distribution package is inferred.

## Compatibility decision

Installed: Three.js 0.186.1, React Three Fiber 9.8.2, drei 10.7.9, @react-three/xr 6.6.32, @pmndrs/handle 6.6.32 and @iwsdk/xr-input 1.0.1. The installed IWSDK input package declares Three >=0.160.0, which includes the installed version. Its Node development requirement is 20.19.x, 22.12.x or newer compatible 22.x, or >=24.

Keep R3F's one renderer and @react-three/xr's one session. Retain HandleStore as gesture owner and zustand as authoritative scene state. The existing optional `VITE_XR_INPUT=iwsdk` enables Meta's hand sampler, not a full ECS World migration. Creating another World/renderer would risk duplicate lifecycle, input and synchronization. No dependency replacement was necessary. Peer ranges and simulations do not prove device compatibility.

Native session-local anchors remain behind explicit confirmed table selection and the own-build IWSDK flag; they are not persistent cross-session room localization or a substitute for MRUK. Existing plane/mesh/hit-test discovery and manual metre-space surfaces remain optional.

## Before → after requirement matrix

| Requirement | Audit before | Increment / evidence now | Verification / unresolved |
|---|---|---|---|
| Reliable VR entry | Explicit gesture entry existed; unsupported icon silently disabled | Icon opens same-page explanation for unsupported/loading states. Supported click still directly requests VR. `enterImmersiveSession` rolls presentation back on denial. Auto-entry overlay has Continue editing | Unit denial/rollback test; browser unsupported feedback; IWER denied entry, gesture entry and re-entry passed. Actual owner's preview reported immersive-vr=false and immersive-ar=false |
| Exit and interruption | Production cancellation existed; read-only exit rejection unhandled | Read-only exit catches errors and offers system-menu fallback; existing tracking-loss cancellation retained | End/already-ended unit tests; emulator session.end cleanup passed. Read-only failure UI not driven in-headset this turn |
| Hands / controllers | Native inputs and optional IWSDK sampling existed | Failed/hidden/partial fresh joint sampling hides SDK visual and exposes zero pinch strength instead of stale matrices | IWSDK adapter regression passes; native and SDK hand pinch moves and controller squeeze moves pass IWER. Real hand precision, skeleton appearance and headset behavior unverified |
| Select / move / rotate / scale | HandleStore with lock protection and uniform two-pointer yaw/scale already exists | Preserved implementation; no speculative coordinate conversion added | Installed HandleStore `dist/computations/utils.js` explicitly inverts parent world matrix into target local space. Controller move committed one undo snapshot. Two-pointer scale/yaw and tabletop object grabs not freshly exercised in this run; older scripts exist, not new evidence |
| Desktop ↔ VR synchronization | Object state shared, but rim yaw/zoom were runtime-only until explicit save | Completed tabletop gesture commits scene.tabletop once; Undo/Redo restore runtime values; new/load worlds clear stale placement and anchor pose | New tabletop tests cover exact yaw/zoom, one commit, unchanged/invalid input, recovery, JSON round-trip and reload. Physical surface location deliberately not copied into portable metadata |
| AI creation / editing | Streaming reviewed proposals and signed-out access existed | Preserved; immersive Apply and dwell Apply explicitly disabled during drafting; Stop label and progress retained | Live signed-out desk proposal took 6.45s once, Apply/Undo/Redo/JSON export/reload passed; not a speed guarantee. Existing streaming/cancellation/locks tests pass. Voice microphone and giant-house requests not retested |
| Local save / reopen / export | Recovery, project library and JSON export existed | Tabletop metadata now enters autosave/export through authoritative scene; physical alignment remains stripped from read-only links | Local recovery tests and browser scene reload/export passed. Optional undefined/null object fields normalized for semantic comparison; dimensions/IDs/positions/materials retained |
| Account save / history | Authenticated revisions and owner isolation implemented | Preserved; no schema or auth changes | Unit revision/concurrent-edit tests pass. Fresh account end-to-end test blocked: requesting user's verified identity did not match an existing auth user; no other account impersonated. Needs owner sign-in |
| Spatial understanding / anchors | Optional discovery, explicit alignment and native session anchors exist | Preserved; clear stale anchorPose on world replacement | Anchor success/late callback/unsupported/denied tests pass. Emulator spatial discovery reports missing synthetic environment; confirmed room geometry and real anchor drift unverified |
| Performance | Adaptive shadows/LOD/batching, production frame reporting, local assets already implemented | Preserved; no invented FPS or new hardware estimates | Budget-policy/LOD tests pass. Minimum 60 FPS and 72 target **not established** on physical Quest; sustained thermal/compositor/GPU metrics unmeasured |
| Graceful fallback / usability | Screen editing works without XR; disabled icon looked broken | Clickable contextual explanation, save/export path and Quest entry link; no public diagnostic link added | User's 824×674 viewport checked with no horizontal overflow; explanation displayed correctly. No claim that ordinary browsers can become immersive via code |
| Competition submission | Existing docs/Devpost page | Official rubric/hosting limitations recorded here | Entrant eligibility, complete artifacts, GitHub Pages/Vercel build and physical device acceptance remain open |

## Changed files

- `src/routes/studio.tsx`: VR icon feedback, dismissible entry overlay, guarded session entry.
- `src/lib/scene/xr-session.ts` and `.test.ts`: synchronous entry invocation and rollback regression.
- `src/components/studio/IWSDKHand.tsx` and `iwsdk-hand.test.ts`: fresh finite hand sampling and tracking-loss checks.
- `src/lib/scene/store.ts`, `src/components/studio/Viewport.tsx`, `src/lib/scene/tabletop.test.ts`: one-gesture portable tabletop state, restoration and world isolation.
- `src/components/studio/XRPanel.tsx`: guarded read-only exit and streamed review control parity.
- `scripts/check-competition-upgrade.py`, `scripts/check-competition-ai.py`: reproducible browser/IWER and live AI checks; screenshots/results go to `/tmp/browser/competition`.
- `AGENTS.md`, `roadmap.md`, this report: architectural constraints and evidence/blockers.

## Test results — separate evidence classes

**Automated:** `bunx vitest run` — 40 files, **157 tests passed**, including 3 new tabletop tests, 1 new entry rollback test and extended SDK joint-loss assertions. Final full-suite run: 13:26 UTC. Harness build log: build OK after implementation. No manual production build or typecheck was run; harness owns compilation. Existing Three CommonJS and server validator deprecation warnings are not treated as failures or hidden.

**Ordinary browser:** Chromium live signed-out AI → review → Apply → Undo → Redo → export → reload; returned one executive desk with exact requested 1.4 × 0.75 × 0.7 m dimensions. Review observed at 6.45s. No page errors. Unsupported VR explanation and 824×674 fit passed. Desktop screenshot shows restored desk, not an empty shell.

**IWER emulator:** Fresh native and optional SDK runs exercised denied entry, real click userActivation, successful entry, controller squeeze 0.5m move, hand pinch movement, session exit cleanup, re-entry, scene preservation, Undo/Redo and reload. No page errors in the completed runs. SDK module loading verified from actual requests (not assumed from the mode label). Hosted config was overridden only in the browser test; production does not enable emulation or force SDK mode. Exit was invoked through native session.end because IWER's display covers desktop controls, not by falsely claiming a physical Exit button press.

A redundant emulator rerun after the final presentation-only streaming-control edit stalled and was stopped. The final unit suite and compilation passed; the preceding completed emulator runs are the claimed evidence, not that stalled rerun. Re-run the saved script for fresh evidence before submission.

**Physical Meta Quest / glasses:** **Not performed.** No real hand-tracking, controller support, room anchor drift, passthrough mapping, seated reach/comfort, sustained FPS, heat or battery claims. Headset model, browser version, session/input behavior and a sustained representative heavy-scene run must be recorded by the owner. No 10/10 or full-compliance rating is justified.

## Remaining gates

1. Owner performs hands-only/seated Quest run: enter, select, grab, rotate/scale, reviewed AI, save/reopen, pause, loss of tracking, exit and re-entry.
2. Confirm real passthrough surfaces/explicit alignment and anchors; verify missing features still allow editing.
3. Measure sustained Quest FPS, minimum/frame-time behavior, thermal comfort and heavy-world budgets; 60 FPS floor must be evidenced.
4. Sign in as the owner to retest account save/history and photo-reference storage in the UI.
5. Confirm live eligibility/submission artifacts and test compliant GitHub Pages or Vercel hosting with server AI/auth support before deployment approval.

Skill shaping implementation: **3d-game** (input handling, scene lifecycle, delta-time and verification requirements).