# Competition delivery — 18 October 2026

## Evidence and phase review
Scores ordered Innovation / Experience / Technical / Polish; provisional, not competition guarantees.

| Phase | Changes | How to test | Known risks | Scores and evidence |
|---|---|---|---|---|
| 0 | Controller, feasibility, UX, performance audit | Read competition-phase-0-audit.md | No hardware data | 3/2/3/3: existing tested core, incomplete MR |
| 1 | Removed public headset-test copy; home real-capture slot | Home, guide, planner, tech | Owner capture missing | 3/3/3/3: clearer trust separation |
| 2 | Added optional eye/persistent requests, live gaze-source wording | /diagnostics separate VR/AR, create/reload/restore reports | Optional grant ≠ working, gaze ≠ eye tracking | 3/3/3/3: honest probe and error reporting |
| 3 | Provider wall-plane snap; bounded confirmed AI context | Select supported wall content then Snap selected | Semantic labels/tilted planes/mesh bounds incomplete | 4/3/3/3: shared safe spatial layer |
| 4 | Seated hand manipulation retained; large compact central menu, cue sounds | Pinch miniature chair, resize with two hands, tools | Emulated grab passed; new menu pinch and dwell Save did NOT pass validation | 4/3/2/3: hand move one undo verified; menu blocker |
| 5 | Tabletop default, optional AR, transparent stage, confirmed-table scaling | Your real room → confirm table; manual table fallback | Real AR table fit, wall alignment and tiny/cluttered rooms unverified | 4/3/3/3: purpose differs from virtual stand |
| 6 | Sends confirmed room bounds and selected ID to AI; browser recognition first with audio fallback | Selected sofa → move left → review → Apply → Undo | Quest microphone/recognition and spatial prompt interpretation unverified | 4/3/3/3: live request returned one valid edit, review/apply/undo passed |
| 7 | Judge entry, four-step skippable XR tutorial, local Open saved, before/after, safe share | Home Judge Mode, Share link, Before | 5s cold start not measured; anchored return not hardware-verified | 4/3/3/3: entry/share browser passed |
| 8 | Real-capture slot, cues; retained compressed furniture LOD/quality HUD | Turn sound on; spatial HUD; record actual scene | No new KTX2/baked lighting/ambient bed or real footage; 60/72 not proven | 3/3/3/3: asset pipeline retained, honest targets |
| 9 | Hand preference, height/distance/text, high contrast, cue captions, dwell option | Properties accessibility, headset Accessibility | New dwell menu flow remains unverified; no complete voice-only path | 3/3/2/3: settings bounded and tested |
| 10 | Local tabletop metadata, read-only share guards, existing recovery/Cloud retained | Save/Open/export/history, denial, sleep/resume | New table pose retention across room reset needs physical re-alignment; headset Save menu test failed | 3/3/3/3: schema and regression tests pass |
| 11 | /devpost real-footage script, /tech limits and TO FILL, checklist | Review submission page and record physical runs | Owner contact/legal review, hardware reports and footage missing | 3/3/3/3: submission structure prepared |

## Verified this run
- 105 regression checks passed, including confirmed-room request, tabletop bounds, sanitized share, wall bounds and portable metadata.
- Live AI with confirmed 8×8 m room and selected sofa produced one reviewed 0.5 m move; Apply/Undo passed in actual browser UI.
- Judge opens Design lounge/tabletop and four-step tutorial; read-only share page renders.
- No runtime errors in checked browser flows; fit at 320, 440, 768px and content routes.
- IWER tabletop chair pinch/move commits once. NOT physical Quest evidence.
- New XR central menu activation, independent dwell and headset Save validation did not succeed. Do not claim hands-only end-to-end complete.

## Quest 3 manual checklist
1. Record OS/browser version; open HTTPS /diagnostics. VR and AR separately, keep all errors.
2. Create anchor marker, end, reload, restore; record same-location result, not merely returned handle.
3. Home → Judge Mode without account; entry/tangible first edit timing; tutorial under 60 seconds only if measured.
4. Ten-minute seated session: pinch select/grab, two-hand resize/yaw, rim turn/zoom, add catalog item, voice, review Apply/Reject, undo/redo, local Save/Open.
5. Check left/right choice, height/distance/text, high contrast, captions, muted audio. Independently test no-hand dwell and deliberate Apply confirmation.
6. Passthrough in three different rooms: clear table, small/cluttered room, low-light/glass environment. Compare virtual stand; confirm table dimensions and wall snap. No observed plane must fall back safely.
7. Pause, permission decline, hand occlusion, sleep/wake, boundary change and session end. Interrupted transforms must cancel, world must remain.
8. Save/reload/re-detect/re-align. Verify private Cloud history on a second device. Check read-only share cannot change scene.
9. Record production HUD for ten minutes: average/minimum app FPS, calls, triangles, estimated textures; separately state app timing versus compositor/GPU.
10. Installed PWA online/offline: cached world opens, missing assets/AI/Cloud report limits; preview never registers worker.

Paste VR/AR create and reload reports, production sample, observations, timings, three-room results and actual footage. Never fill measurements from emulation.

## Freeze note
This is a reviewed software checkpoint, NOT a final competition-ready freeze. Do not freeze submission until new menu/dwell validation is resolved and actual Quest reports, footage, safety/comfort and sustained performance are supplied. No edits after the owner's final submission freeze / November 18 deadline. Current changes are unpublished.
