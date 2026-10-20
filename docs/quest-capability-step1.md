# Step 1 — capability probe

Judge Mode and its controls/tutorial/state were removed. No Steps 2–7 were implemented in this update. Existing unrelated functionality is retained.

## Delivered
`/diagnostics` and reusable `xr-capabilities` module show VR/AR support, optional feature grants, live joints/raw pinch and normalized pinch, current viewer hit, browser-labelled plane counts and polygon sizes, mesh triangle totals, CPU/GPU depth observations, layer grants, gaze-like sources (never eye certification), recognition API presence, tested browser storage, service-worker registrations/control and standalone display. Rolling 300-frame averages/minimum/intervals and draw/triangle/memory hints are diagnostic-scene measurements only. No physical FPS is supplied.

Create/Restore/Clear anchor commands are separate. Creation prefers a current hit, otherwise tests a viewer-pose anchor. Saving a handle is only granted, not restored; restore success remains a browser API observation requiring human alignment confirmation. Failures are retained per capability, in a red history and copied report. Copy exports readable summary plus complete JSON; blocked clipboard offers selectable text. Every requested spatial feature is optional. Session end/sleep visibility resets frame timing without modifying editor worlds.

## Verification
76 tests passed. Chromium at 440×395 fitted home/diagnostics, with no Judge button. Unsupported VR disabled entry. Test-only IWER confirmed gesture entry, explicit NotAllowedError denial, live hand/metrics capture, anchor create and restore after reload, end-state reporting, and missing synthetic hit-test failure visible. No page errors. These are emulator results, not physical Quest evidence.

## Quest 3 test
1. Publish this update using Lovable's Publish action when ready. This turn did not publish. Open https://voxelmind-xr.lovable.app/diagnostics in Quest Browser over HTTPS. No login required.
2. Note Quest model, OS and Browser version. Probe VR; accept permissions. Move both hands and pinch the right hand; look at surfaces. Run at least 30 seconds.
3. Create anchor with right-hand control. Note marker position; End probe; Copy report. If clipboard fails, select the report text.
4. Reload, Probe VR, Restore anchor. Confirm if it physically returns to the same location. End and copy second report.
5. Separately Probe passthrough and repeat hands/surfaces/anchor test. Keep unsupported/denied results. Test brief sleep/return and permission refusal without disguising errors.
6. Paste the full readable + JSON exports from each run, headset/browser versions, lighting/room description, marker alignment result, hand losses, and installed versus browser-tab state. Optional screenshot/video helps.

## Known limits
Speech recognition is API detection, not microphone/transcription validation. No automatic guessed plane semantics, native SDKs, room model or performance fallback are introduced. Layer grant alone is not layered rendering evidence. Probe FPS is not full-studio FPS or compositor/GPU measurement. Optional grants may yield zero observations; no data remains unverified/granted, not fabricated support. Physical Quest access/report required for next-step feasibility.

## Technical Implementation self-score
2/5 provisional: diagnostics and automated checks are in place, but physical feature availability, room behavior, hand precision and performance remain unverified. Stop here. Propose realistic Steps 2–7 only after the user's report.
