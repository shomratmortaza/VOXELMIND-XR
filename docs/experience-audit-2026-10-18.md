# Experience audit — 18 October 2026

## Fixed and checked
- A failed viewport module download is cached by the browser. Retry now reloads with a one-use sessionStorage scene snapshot, preserving unsaved changes and the saved marker. Asset retries still clear loaders and remount only the view.
- VR entry no longer waits indefinitely for isolated optional model downloads; the lit fallback scene remains interactive.
- Desktop voice now uses explicit Speak / Finish actions, including keyboard activation. Moving off the microphone no longer stops recording. Opening microphones block style commands.
- Old voice transcripts and old AI proposals cannot affect a different world; edits invalidate pending review. Three new race-condition regression tests cover this.
- Cloned glTF materials with metallic texture multipliers now accept fabric/wood replacement correctly. Completed transitions stop repeated material traversal and retain the requested finish colour even when finishes load asynchronously. Emerald fabric was inspected in the rendered scene and material data.
- Duplicate desktop save operations are guarded before state updates. Exact saved snapshot semantics are preserved.
- First-change invitation no longer overlaps the reference-photo button. Help opens only on request, without a forced long first-visit tutorial.

## Fresh evidence
- Full automated suite: 59 tests across scene, voice WAV encoding, persistence validation and routing.
- Public welcome, templates, guide, showcase and room-planner navigation checked; unique metadata inspected on all content routes.
- Live Luxury, Japanese and Industrial proposals returned coordinated material, colour, layout and lighting edits. Scene stayed unchanged before review; Apply, exact Undo/Redo, Cloud Save and version-1 history restore passed.
- Browser failure injection: blocked viewport module → preserved renamed world → successful retry and visible 3D floor.
- Chromium fit: 320×740, 440×727, 768×1024 and 1280×1800.
- Chromium and WebKit rendered the 3D floor. Firefox in this sandbox could not initialize WebGL, but recovery messaging and editing controls remained visible; Firefox 3D compatibility remains unverified.
- Private upload/preview, reference removal and valid scene JSON export passed using a compact copy of the supplied photo. Existing revision references deliberately retain their private storage objects.
- IWER Quest 3: user-activated entry, permission rejection recovery, tracked walking, controller teleport, controller move, hand pinch move, two-controller scale/yaw, catalog placement, Cloud Save, exit cleanup and exact reload/Open all passed without page errors.
- Hand-only IWER: Speak → real WAV AudioWorklet capture → live transcription of “Make it cozy” → live reviewed proposals → Apply → Exit passed without page errors. Synthesized words were fed through a browser MediaStream, not a physical microphone; repeated source audio avoids software-rendering scheduling gaps.

## Not established
No physical Quest was available. Actual headset microphone accuracy/latency, seated reach/comfort, physical hand precision, hand-only teleport, two-hand scaling and sustained frame delivery need hardware testing. Emulator software-rendering timings are not headset performance measurements. This is not a competition-readiness certification or universal-browser reliability claim.

Changes in this audit are preview-only; no new publication was requested. See `quest-validation.md` and `vr-voice-validation.md` for physical-device acceptance checks.