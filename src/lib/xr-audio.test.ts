import { expect, it, vi } from "vitest";
import { playSpatialCue } from "./xr-audio";
it("handles audio-device refusal without rejecting editing", async () => {
  const rejected = Promise.reject(new Error("Audio device unavailable"));
  const handled = vi.spyOn(rejected, "catch");
  vi.stubGlobal("AudioContext", class {
    currentTime = 0;
    resume() { return rejected; }
    createOscillator() { throw new Error("Audio unavailable"); }
  });
  expect(() => playSpatialCue("apply")).not.toThrow();
  expect(handled).toHaveBeenCalledOnce();
  await Promise.resolve();
  vi.unstubAllGlobals();
});