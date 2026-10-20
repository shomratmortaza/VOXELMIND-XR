/** Browser-independent session helpers; capability checks happen before the enter gesture. */
export type ImmersiveMode = "immersive-vr" | "immersive-ar";
type EntryState = { sessionMode: ImmersiveMode; tablePosition: [number, number, number] | null };
/** Preserve the entry gesture and roll presentation back on denial. */
export async function enterImmersiveSession(mode: ImmersiveMode, enter: (mode: ImmersiveMode) => Promise<unknown>, runtime: { getState: () => EntryState; setState: (state: Partial<EntryState>) => void }): Promise<void> {
  const { sessionMode, tablePosition } = runtime.getState();
  runtime.setState({ sessionMode: mode, tablePosition: null });
  try { await enter(mode); }
  catch (error) { runtime.setState({ sessionMode, tablePosition }); throw error; }
}

export async function supportsImmersiveVR(xr?: Pick<XRSystem, "isSessionSupported">): Promise<boolean> {
  if (!xr) return false;
  try { return await xr.isSessionSupported("immersive-vr"); }
  catch { return false; }
}

export function vrSessionError(error: unknown): string {
  const name = errorName(error);
  if (name === "NotAllowedError" || name === "SecurityError") return "VR permission was declined. Allow immersive VR in your headset browser and try again.";
  if (name === "NotSupportedError") return "This browser cannot provide the required life-size VR session. Use a supported headset browser.";
  if (name === "InvalidStateError") return "Another immersive session is active. Exit it before entering this world.";
  return "VR could not start. Check your headset connection and try again.";
}

export async function endVRSession(session?: Pick<XRSession, "end">): Promise<void> {
  if (!session) return;
  try { await session.end(); }
  catch (error) {
    // Already-ended sessions are safe during route and renderer teardown.
    if (errorName(error) !== "InvalidStateError") throw error;
  }
}

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && "name" in error && typeof error.name === "string" ? error.name : "";
}
/** VR walkthroughs open at real-world size; AR fits the model onto a table. */
export function entryScale(mode: ImmersiveMode): "life" | "table" { return mode === "immersive-ar" ? "table" : "life"; }
