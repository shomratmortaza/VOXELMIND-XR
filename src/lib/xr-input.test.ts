import { describe, expect, it } from "vitest";
import { advancePinch, nextQuality, XR_BUDGET } from "./xr-input";
describe("right-hand pinch assist", () => {
  it("uses different start/release thresholds and releases missing joints", () => {
    expect(advancePinch({ active: false, separation: null }, 0.017, 0.02).active).toBe(true);
    expect(advancePinch({ active: true, separation: null }, 0.025, 0.02).active).toBe(true);
    expect(advancePinch({ active: false, separation: null }, 0.025, 0.02).active).toBe(false);
    expect(advancePinch({ active: true, separation: null }, 0.033, 0.02).active).toBe(false);
    expect(advancePinch({ active: true, separation: 0.01 }, null, 0.02).active).toBe(false);
  });
});
describe("Quest performance policy (targets, never hardware evidence)", () => {
  it("defines the requested 72 target and 60 minimum", () => { expect(XR_BUDGET.targetFPS).toBe(72); expect(XR_BUDGET.minimumFPS).toBe(60); });
  it("reduces quality before a 60 FPS breach", () => { expect(nextQuality("full", {fps:65,drawCalls:1,triangles:1,textureBytes:1})).toBe("balanced"); });
  it("falls back for excessive geometry and never oscillates upward automatically", () => {
    expect(nextQuality("balanced",{fps:72,drawCalls:181,triangles:1,textureBytes:1})).toBe("safe");
    expect(nextQuality("safe",{fps:90,drawCalls:1,triangles:1,textureBytes:1})).toBe("safe");
  });
});import { stickStep, turnStep, rotateAround, SNAP_TURN, WALK_SPEED } from "./xr-input";
import { safeSettings } from "./xr-settings";
describe("thumbstick movement", () => {
  it("walks forward where the head faces, at walking speed, flat on the floor", () => {
    const [dx, dz] = stickStep(0, -1, 0, 0.05);
    expect(dx).toBeCloseTo(0); expect(dz).toBeCloseTo(-WALK_SPEED * 0.05);
  });
  it("strafes right relative to the view, even after turning 90° left", () => {
    const [dx, dz] = stickStep(1, 0, Math.PI / 2, 0.05);
    expect(dx).toBeCloseTo(0); expect(dz).toBeCloseTo(-WALK_SPEED * 0.05);
  });
  it("ignores tiny stick drift", () => { expect(stickStep(0.1, -0.1, 0, 0.05)).toEqual([0, 0]); });
  it("pushing right turns right in both smooth and step modes", () => {
    expect(turnStep("smooth", 1, 0.05, true).angle).toBeLessThan(0);
    expect(turnStep("snap", 1, 0.05, true).angle).toBe(-SNAP_TURN);
  });
  it("step turning fires once per push, not every frame", () => {
    const first = turnStep("snap", 1, 0.016, true);
    expect(turnStep("snap", 1, 0.016, first.armed).angle).toBe(0);
    expect(turnStep("snap", 0, 0.016, first.armed).armed).toBe(true);
  });
  it("turns around the head so the user stays in place", () => {
    const [x, z] = rotateAround(2, 0, 2, 0, 1);
    expect(x).toBeCloseTo(2); expect(z).toBeCloseTo(0);
  });
  it("defaults to smooth turning and keeps step turning when chosen", () => {
    expect(safeSettings({}).turn).toBe("smooth");
    expect(safeSettings({ turn: "snap" }).turn).toBe("snap");
  });
});
import { stickPitch, startJump, jumpStep, JUMP_HEIGHT } from "./xr-input";
describe("looking up/down and jumping in VR", () => {
  it("right stick up looks up, down looks down, drift does nothing", () => {
    expect(stickPitch(-1, 0.05)).toBeGreaterThan(0);
    expect(stickPitch(1, 0.05)).toBeLessThan(0);
    expect(stickPitch(0.1, 0.05)).toBe(0);
  });
  it("a jump rises about 45 cm and lands back on the floor", () => {
    let s = startJump({ height: 0, velocity: 0 }), peak = 0;
    for (let i = 0; i < 200; i++) { s = jumpStep(s, 1 / 72); peak = Math.max(peak, s.height); }
    expect(peak).toBeGreaterThan(JUMP_HEIGHT - 0.03);
    expect(peak).toBeLessThan(JUMP_HEIGHT + 0.03);
    expect(s).toEqual({ height: 0, velocity: 0 });
  });
  it("cannot jump again while in the air", () => {
    const air = jumpStep(startJump({ height: 0, velocity: 0 }), 0.05);
    expect(startJump(air)).toEqual(air);
  });
});
