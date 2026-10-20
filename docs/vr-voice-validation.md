# In-headset voice commands

The headset control board has **Speak a command** and **Finish voice command**. Recording stays active between pinches, including after the pointer leaves the button. Microphone permission has a distinct opening state. Exiting VR cancels active capture. Recognized words use the existing live transcription endpoint and current scene proposal endpoint; changes remain unapplied until review.

Capture uses AudioWorklet PCM batches encoded as complete mono WAV. The prior ScriptProcessor capture distorted audio timing while the software-rendered VR scene occupied the main thread. AudioContext resumes before awaiting microphone permission.

## Verified
- 50 automated tests, including recorded “Make it cozy” flowing to proposals without scene modification before review and cancellation during permission startup.
- A hand-only IWER session pinched Speak, recorded spoken audio, pinched Finish, received live recognized cozy commands and eight context-aware fabric/colour/wood proposals, applied them through the headset board, and exited with no runtime errors.
- The test fed synthesized spoken words through a browser MediaStream, not mocked transcripts or proposals. The live endpoints responded successfully. Its audio source repeated to avoid software-rendered timing gaps.
- A standalone complete spoken WAV also returned “Make it cozy. Make this room cozy.” through the real transcription service.

## Still needs hardware
The sandbox's fake physical microphone produced unreliable audio; the successful test used an injected audio MediaStream. This establishes the app capture/transcription/proposal path, not actual Quest microphone quality, permission presentation, recognition latency or physical hand precision. Test those on a real Quest before claiming hardware support. No always-listening wake word or automatic scene application is implemented.

## Physical check
Open a scene in Quest Browser, enter VR, pinch Speak a command, allow microphone access, wait for Listening, say “Make it cozy”, then pinch Finish voice command. Review the changes, apply selected, and confirm the room updates. Repeat with denied permission and exiting during recording; the microphone must stop. Save and reopen to check persistence. These changes require publishing before they reach the published site.