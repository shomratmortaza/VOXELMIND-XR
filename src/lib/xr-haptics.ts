/** Controller vibration for physical feedback. Silently absent on hands or browsers without actuators. */
type Actuator = { pulse?: (value: number, duration: number) => Promise<boolean>; playEffect?: (type: string, params: Record<string, number>) => Promise<unknown> };
export type HapticKind = "hover" | "press" | "grab" | "release" | "bump" | "teleport";
export const HAPTICS: Record<HapticKind, [number, number]> = { hover: [0.12, 12], press: [0.45, 28], grab: [0.7, 45], release: [0.35, 30], bump: [0.55, 60], teleport: [0.3, 35] };
export function pulse(source: XRInputSource | null | undefined, kind: HapticKind) {
  const pad = source?.gamepad as (Gamepad & { hapticActuators?: Actuator[]; vibrationActuator?: Actuator }) | undefined;
  if (!pad) return;
  const [intensity, ms] = HAPTICS[kind];
  try {
    const actuator = pad.hapticActuators?.[0];
    if (actuator?.pulse) { void actuator.pulse(intensity, ms).catch(() => undefined); return; }
    void pad.vibrationActuator?.playEffect?.("dual-rumble", { duration: ms, strongMagnitude: intensity, weakMagnitude: intensity })?.catch(() => undefined);
  } catch { /* Haptics are optional feedback only. */ }
}
/** XR pointer events carry the input source that produced them. */
export function sourceOf(event: unknown): XRInputSource | undefined {
  const state = (event as { pointerState?: { inputSource?: XRInputSource } } | null)?.pointerState;
  return state && typeof state === "object" ? state.inputSource : undefined;
}
