/** Metre-based pinch assist; no palm orientation or eye-tracking inference. */
export type PinchState = { active: boolean; separation: number | null };
export function advancePinch(previous: PinchState, distance: number | null, delta: number): PinchState {
  if (distance === null || !Number.isFinite(distance) || distance < 0) return { active: false, separation: null };
  const separation = previous.separation === null ? distance : previous.separation + (distance - previous.separation) * (1 - Math.exp(-30 * Math.min(delta, 0.05)));
  return { active: previous.active ? separation < 0.032 : separation < 0.018, separation };
}

export type Quality = "full" | "balanced" | "safe";
export type BudgetSample = { fps: number; drawCalls: number; triangles: number; textureBytes: number };
export const XR_BUDGET = { targetFPS: 72, minimumFPS: 60, drawCalls: 180, triangles: 450_000, textureBytes: 256 * 1024 * 1024 };
export function nextQuality(current: Quality, sample: BudgetSample): Quality {
  const pressure = sample.fps < 66 || sample.drawCalls > XR_BUDGET.drawCalls || sample.triangles > XR_BUDGET.triangles || sample.textureBytes > XR_BUDGET.textureBytes;
  if (!pressure) return current;
  return current === "full" ? "balanced" : "safe";
}
/** Thumbstick locomotion (metres, radians). Pure so movement rules stay testable. */
export const STICK_DEAD_ZONE = 0.15;
export const WALK_SPEED = 1.6;
export const SMOOTH_TURN_SPEED = Math.PI / 2;
export const SNAP_TURN = Math.PI / 6;
const shaped = (v: number) => {
  const a = Math.abs(v);
  if (a < STICK_DEAD_ZONE) return 0;
  const t = (a - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE);
  return Math.sign(v) * t * t * (3 - 2 * t);
};
/** World-space step on the floor plane: stick forward follows where the head faces, never pitched into the floor. */
export function stickStep(x: number, y: number, headYaw: number, delta: number, speed = WALK_SPEED): [number, number] {
  const sx = shaped(x), sy = shaped(y);
  if (!sx && !sy) return [0, 0];
  const len = Math.min(1, Math.hypot(sx, sy)) / (Math.hypot(sx, sy) || 1);
  const dt = Math.min(Math.max(delta, 0), 0.05) * speed * len;
  const sin = Math.sin(headYaw), cos = Math.cos(headYaw);
  // Forward is -Z rotated by yaw; right is +X rotated by yaw.
  return [(sx * cos + sy * sin) * dt, (-sx * sin + sy * cos) * dt];
}
export type TurnMode = "smooth" | "snap";
/** Pushing right always turns right (negative yaw), in either mode. */
export function turnStep(mode: TurnMode, x: number, delta: number, armed: boolean): { angle: number; armed: boolean } {
  if (Math.abs(x) < 0.5) return { angle: mode === "smooth" && Math.abs(x) >= STICK_DEAD_ZONE ? -shaped(x) * SMOOTH_TURN_SPEED * Math.min(delta, 0.05) : 0, armed: true };
  if (mode === "smooth") return { angle: -shaped(x) * SMOOTH_TURN_SPEED * Math.min(delta, 0.05), armed: true };
  return armed ? { angle: x > 0 ? -SNAP_TURN : SNAP_TURN, armed: false } : { angle: 0, armed: false };
}
/** Rotate a floor point around the head so turning never swings the user sideways. */
export function rotateAround(px: number, pz: number, cx: number, cz: number, angle: number): [number, number] {
  const s = Math.sin(angle), c = Math.cos(angle), dx = px - cx, dz = pz - cz;
  return [cx + dx * c + dz * s, cz - dx * s + dz * c];
}
/** Right stick up/down looks up/down (radians per second at full push); pushing up looks up. */
export const STICK_LOOK_SPEED = Math.PI / 2;
export function stickPitch(y: number, delta: number): number {
  const s = shaped(y);
  return s ? -s * STICK_LOOK_SPEED * Math.min(Math.max(delta, 0), 0.05) : 0;
}
/** Jump: about 45 cm high, landing back on the same floor. */
export const GRAVITY = 9.8;
export const JUMP_HEIGHT = 0.45;
export const JUMP_SPEED = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
export type JumpState = { height: number; velocity: number };
/** Start a jump only when standing on the floor (no double jumps in mid-air). */
export function startJump(state: JumpState): JumpState {
  return state.height === 0 && state.velocity === 0 ? { height: 0, velocity: JUMP_SPEED } : state;
}
export function jumpStep(state: JumpState, delta: number): JumpState {
  if (state.height === 0 && state.velocity === 0) return state;
  const dt = Math.min(Math.max(delta, 0), 0.05);
  const velocity = state.velocity - GRAVITY * dt;
  const height = state.height + (state.velocity + velocity) / 2 * dt;
  return height <= 0 ? { height: 0, velocity: 0 } : { height, velocity };
}
