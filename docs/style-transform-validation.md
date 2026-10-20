# Style Transform and hands-first validation

## Implemented
- Explicit Design Lounge entry uses a curated metric scene; blank and user descriptions remain unchanged.
- Cozy, Minimal, Luxury, Japanese, Modern Cafe and Industrial submit room-wide live AI instructions through the existing proposal endpoint, on screen or in the headset.
- Scene-level lighting is reviewed like object finishes and layout operations. Only accepted operations apply, in one undo snapshot. Saved scenes retain lighting and material values.
- Reviewed object move/rotate/resize/add presentation animates over 0.65 seconds, respecting reduced motion. Saving uses final exact coordinates, not animation intermediates. Material swaps and lighting currently update immediately.
- Right-hand distance pointing and direct touch/grab coexist in hand mode; explicit head-gaze mode disables competing right-hand near pointers and binds that hand's actual select/pinch events. This is head gaze, not eye tracking.
- Opt-in device speech reads short reviewed AI summaries, with mute and capability detection. Browser dispatch/mute were tested; audible headset output remains unverified.
- Control board height adapts to seated eye height, has recall, and retains tabletop/life-size modes, review, saving and exit.
- Renderer failure stays local; scene properties, export and save remain available. Mobile toolbar wrapping and touch input font sizing address reproduced overflow/focus zoom.

## Observed checks
- 48 automated tests passed, including lighting review/save/undo, locked architecture protection and exact transforms separate from animation.
- Chromium and WebKit phone/tablet/desktop/landscape screen-fit checks passed at 320, 375, 440, 768, 844 and 1280 pixels; chair add/rename/duplicate/undo/redo and account dialogs exercised.
- Failed viewport import retained chair editing and disabled VR instead of replacing the editor.
- Live Japanese-style response returned HTTP 200 with lighting, fabric, wood and colour proposals; scene stayed unchanged before review. Applied scene saved to Cloud and reopened afterward (unsaved replacement confirmation must be accepted).
- IWER seated hand-only inputs (no controller sources) exercised catalog placement, two-hand scale/yaw with one release snapshot, head-gaze/right-pinch board interaction, live Cozy proposal, review/apply, headset Cloud Save and Exit VR. Runtime errors were empty on the completed run.
- Existing IWER suite passed native session rejection/gesture entry, tracked walking, controller teleport/move, hand move, two-controller transform, catalog/save, exit and Cloud reload/Open. Its save assertion now waits for persisted state instead of an arbitrary delay.

## Not established
- Left-hand curved teleport did not produce a confirmed relocation in the furnished seated fixture; a valid landing hit was not established, so this does not isolate an application defect. Controller teleport passed. Existing hand teleport configuration was preserved instead of claiming a fix.
- No physical Quest was available. Tracking comfort, physical hand precision, in-headset microphone/audio, sustained FPS, 40–60-object hardware performance and competition readiness remain unverified.
- No new appliances, photorealistic architecture or hand haptics are claimed. Native hand tracking does not imply haptic hardware. Changes are not published.

## Reproduce
Use the test-only IWER bundle as described in `quest-validation.md`. Enter the Design Lounge, choose hand input mode at a 1.2 m seated eye height, and operate Objects, Style Transform, Apply selected, Save Cloud and Exit VR with the right-hand ray and pinch. Use both hands close to an unlocked object for scaling/rotation. To test head gaze, enable it on the board, look at the target and pinch. Turn it off to restore right-hand direct grabbing. The final explicit-mode regression passed catalog, two-hand transforms, gaze pinch, Save and Exit with no runtime errors; its post-exit screenshot timed out after all assertions passed.
Run the physical acceptance checklist in `quest-validation.md` before any hardware compatibility or frame-rate claim.