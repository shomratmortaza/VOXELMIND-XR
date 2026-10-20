# Studio upgrade validation — 18 October 2026

## Verified
- 55 automated scene, persistence and routing tests pass.
- Chromium actual lounge render; no runtime errors on initial scene loading.
- Failed GLB downloads leave fallback geometry and controls; retry successfully loads models while preserving a renamed project.
- Public pages and studio fit at 320, 390, 768 and 1280 CSS pixels without sideways overflow.
- Quest emulator: explicit immersive entry, permission rejection, tracked walking, controller teleport, hand pinch movement, two-controller uniform scale/yaw, catalog placement, Cloud Save and reload/Open pass with no page errors.
- Hand-only seated emulator: Speak/Finish via actual hand pinches, AudioWorklet captures synthesized looping MediaStream audio, live recognition returns cozy commands, live AI returns 15 edits; scene remains unchanged until Apply selected; hand-pinch Apply and Exit pass with no page errors. This checks actual services, not mocked transcripts.
- Four Poly Haven CC0 1K self-contained models: vintage_day_bed, modern_wooden_cabinet, wooden_bookshelf_worn and vintage_microwave. Source download hashes, finite accessor bounds and GLTF validation passed. Standard sizes are design defaults, not manufacturer measurements.
- Showcase contains three curated designs and actual rendered previews. It does not expose privately saved user projects. Walkthrough links open the corresponding editable world; immersive entry still needs an explicit user gesture on a supported headset.

## Not established
No physical Meta Quest is available in this sandbox. Physical microphone recognition accuracy/latency, comfortable seated reach, hand-only teleport, sustained headset FPS, two-hand physical precision and competition certification remain unverified. A successful emulator is not a hardware performance guarantee. Universal browser loading cannot be guaranteed; browsers without working WebGL keep editing controls and an honest fallback.
Kitchen expansion currently includes a microwave, not a refrigerator, oven or dishwasher. Models are static furnishings, not functional appliance simulations.

## Reproduce
Run scene tests with Vitest. Run scripts/check-quest-runtime.py with a test-only IWER runtime and a minted browser session. In Quest Browser open /studio, enter VR, pinch Speak a command, say Make it cozy, pinch Finish, review and Apply selected; try grab, two-hand transform, Save and reopen. Check microphone-denied and headset-exit cancellation. Record actual device frame times and voice latency before competition claims.
