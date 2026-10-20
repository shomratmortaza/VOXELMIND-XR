# VOXELMIND XR — Quest validation

Audit date: 17 October 2026. Changes are in the current preview; this audit did not publish them.

## Implemented incrementally

- Wait for the 3D renderer before enabling Enter VR. Request `immersive-vr` directly from the click without an awaited support probe breaking user activation. Disable duplicate entry requests and handle permission/feature rejection.
- Disable automatic granted-session entry and built-in emulation. Require `local-floor`, request hand tracking and layers optionally, and stop requesting unused mapping, anchors, hit-testing, depth or DOM-overlay features. No passthrough or room mapping is promised.
- Enable left-controller grabbing as well as teleportation: the previous left-controller configuration prevented two-controller manipulation.
- Release captured manipulation pointers on teardown; end sessions when leaving the studio and cancel open microphones. Cancel microphone acquisition if the user releases before permission finishes.
- Use the latest scene geometry when entering life-size mode without recentering the player on every furniture edit. Keep tracked poses intact and validate teleport hits against clear floor.
- Make every AI proposal accessible through paginated headset review rather than showing only the first four while applying unseen accepted edits. Constrain button text to its physical key width and report connected input sources honestly.
- Mark saved snapshots only for the current project, preserve unsaved edits during requests, guard overlapping headset saves, and show actual save errors.
- Preserve existing textured models and materials. Reduce the directional shadow map from 2048 to 1024, remove the additional desktop contact-shadow rendering pass, bake environment lighting once and apply moderate foveation. Do not request the maximum supported refresh rate automatically.

## Verification results

### Automated

39 tests passed across scene/session/store/persistence-validation suites. Coverage includes unsupported/rejected support probes, immersive-vr mode, permission errors, session ending, locked architecture, released transform snapshots, undo/redo, dimensions/materials, saved-snapshot race protection and late microphone cleanup. The current automatic build reports `build OK`.

### Emulated WebXR runtime

The reproducible Python check uses IWER's Quest 3 device, Chromium software WebGL and the application's actual XR input paths. It does not call furniture R3F event handlers or fabricate DOM drag events to claim immersive manipulation success.

Passed:

1. Unsupported-browser message and disabled VR entry.
2. Deliberately rejected session request; editor remains usable.
3. User-activated immersive-vr request with local-floor and optional hands.
4. Tracked headset movement: +0.5 m produced +0.5 m camera displacement.
5. Left-controller trigger teleport relocated the XR origin.
6. Right-controller squeeze moved the rendered chair +0.5 m, with one undo snapshot on release.
7. Right-hand pinch moved the chair +0.5 m, with one undo snapshot on release.
8. Two-controller squeeze interaction approximately doubled all dimensions and rotated yaw by approximately 90 degrees, with one undo snapshot on final release.
9. Session end cleared session/input state and preserved edited scene data.
10. Signed-in Cloud Save, full page reload and Open restored the exact edited scene, including dimensions/materials.
11. No page errors during the completed run; screenshots confirmed the scene and restored chair rendered.
12. Objects catalog, chair placement and Save Cloud worked through emulated controller rays/triggers, without directly invoking board event handlers.

This is IWER runtime testing, not a claim that the Chrome IWE extension UI or a physical Quest was tested. Hand-pinch movement also changed yaw; that behavior needs physical comfort testing. Headset screenshots are a single emulated eye, not a headset recording.

### Live AI

Both the current preview and `https://voxelmind-xr.lovable.app/api/voice/propose` returned HTTP 200 and a valid live dining-chair proposal with requested 0.5 × 0.9 × 0.5 m dimensions. This verifies the published AI service was configured and served this request, without exposing its key.

Update: initial description-to-layout creation now calls the live proposal service on a blank floor, with review before applying and no template fallback. The landing-page gallery flow returned live proposals, created exactly three tables at the requested 1.4 × 0.75 × 0.8 m dimensions, and saved to Cloud. Saved provenance supports live AI and legacy templates. 43 automated tests and the emulated VR regression workflow passed after this change. These new creation changes are preview-only until published. A production endpoint response is not an end-to-end headset voice test.

### Physical Quest

No physical headset was available. No physical tracking, comfort, microphone, frame-rate, thermal stability or full end-to-end headset certification is claimed.

## Repeat automated and emulated checks

```bash
bunx vitest run src/lib/scene src/lib/projects.test.ts
```

For the development-runtime integration script:

1. Keep the normal dev server running at `http://localhost:8080`.
2. Obtain a permitted test session with `lovable auth-session --json`. The script reads the private minted session file and never logs its contents. It saves one uniquely named test project to that account.
3. Bundle IWER only into a temporary directory; never add an emulator to app code:

```bash
mkdir -p /tmp/quest-validation
printf 'export * from "iwer";\n' > .quest-runtime-entry.ts
bun build .quest-runtime-entry.ts --target browser --format iife --global-name IWER --outfile /tmp/quest-validation/runtime.js
rm .quest-runtime-entry.ts
python3 scripts/check-quest-runtime.py --runtime /tmp/quest-validation/runtime.js --output /tmp/quest-validation
```

The script requires Python Playwright with Chromium and the installed IWER package in the test environment. They are test-only tooling, not new application dependencies. It discovers Vite module URLs from actual requests; it is a development integration check, not a published-bundle test.

## Meta Immersive Web Emulator manual checklist

1. Install Meta's [Immersive Web Emulator](https://chromewebstore.google.com/detail/immersive-web-emulator/cgffilbpcibhmcfbgggfhfolhkfbhmik) in Chromium. Enable it for this site's origin and reload.
2. Select Quest 3, load a blank or detailed restaurant world, and click Enter VR.
3. Move the headset pose; verify life-size scale and that movement does not move furniture. Aim the left-controller teleport pointer at clear floor, hold trigger, then release. Furniture/wall targets must not teleport.
4. Squeeze an object with the right controller, move it, and release. Use both controller squeezes to rotate/scale; undo/redo must restore the completed gesture.
5. Switch to hand inputs. Pinch a real furniture object, move and release; repeat using both hands. Test loss of tracking and exit while holding.
6. Use XR inputs—not direct calls to UI handlers—to activate Objects, placement, rotate/resize, Save Cloud, and proposal review including later pages. Deselecting all proposals must disable Apply.
7. Exit/reenter, then save, reload, Open and inspect History. Deny permissions and repeat entry. Disconnect/reconnect inputs and check the panel reports them accurately.
8. Record browser/emulator versions, URL, input mode, failures and screenshots. Emulator results cannot establish headset performance.

## Physical Quest acceptance checklist

1. Publish the tested changes when ready; open that HTTPS deployment in Quest Browser. Record headset model, OS/browser versions and build URL. Set a safe boundary; never bypass it.
2. Sign in before entering VR. Create a blank project, add furniture, save, and open the same project again.
3. Test controller entry, real-world walking, teleport landing clearance, selection feedback, grab/release, two-controller yaw/scale, undo/redo, and loss of input tracking.
4. Enable hand tracking on the Quest. Repeat with actual hand pinch, both hands, input-mode switching and occlusion. Verify the board is readable/reachable at approximately 0.7 m and does not obstruct the working area; adjust only after a wearer reports the problem.
5. Speak a change, review every proposal, apply, and verify the scene changed. Deny microphone permission and confirm graceful recovery. Release during permission prompts, exit mid-recording and confirm the microphone stops.
6. Save from the headset, exit, reload/Open on another signed-in device and compare transforms/materials. Check immutable History restoration.
7. Repeat 10 entry/exit cycles, including browser navigation and system-ended sessions. No duplicate session, stuck capture, lingering microphone or lost scene edits is acceptable.
8. Run a 5–10 minute detailed-restaurant walkthrough, plus a representative larger city scene. Use [Meta's profiling workflow](https://developers.meta.com/vr/documentation/web/webxr-perf-workflow/) and [performance tools](https://developers.meta.com/vr/documentation/web/webxr-perf-tools/) with Quest remote debugging. Record actual refresh rate, CPU/GPU frame times, missed frames, draw calls, triangles, texture memory and temperature/thermal behavior. Software Chromium FPS is not a Quest measurement.
9. At 72 Hz the frame budget is about 13.9 ms; at 90 Hz about 11.1 ms. A 60 FPS target is not automatically sufficient for a 72/90 Hz immersive session. Report measured sustained delivery and spikes; do not advertise an FPS guarantee.

## Stack and competition assessment

Official sources consulted for this audit:

- [Meta WebXR workflow](https://developers.meta.com/vr/documentation/web/webxr-workflow/)
- [Meta WebXR overview](https://developers.meta.com/vr/documentation/web/webxr-overview/)
- [Meta performance workflow](https://developers.meta.com/vr/documentation/web/webxr-perf-workflow/)
- [Meta Immersive Web Emulator](https://github.com/meta-quest/immersive-web-emulator/)
- [Meta IWSDK](https://github.com/facebook/immersive-web-sdk/)

Retain Three.js/R3F/@react-three/xr. It exposes native WebXR sessions and supports the input model already implemented; runtime checks now provide evidence for core flows. Meta recommends IWSDK as a starting path, but it is not a drop-in replacement for this React scene/state architecture. No specific missing IWSDK-only requirement justified a migration. Reassess only against an identified capability gap, with a scoped scene/input/persistence migration plan.

No competition name or official rules were supplied, so hackathon eligibility, SDK mandates, submission requirements and judging criteria remain unverified.

## Remaining checks

- Physical Quest hand tracking, two-hand manipulation, input loss/release, board comfort, headset creation/save, voice and sustained frame rate.
- Actual Chrome IWE extension manual checklist, in-headset proposal pagination through XR gestures, and session exit while actively grabbing.
- Large-scene draw-call/triangle/texture measurements; current optimized assets are not proof that arbitrary cities meet a hardware budget.
- Exact reference-room reconstruction is not implemented. Live initial creation uses supported editable object kinds on a blank 12 × 12 m floor; unspecified geometry/dimensions are estimates, not measured facts.
- No passthrough, room mapping, or compatibility certification.