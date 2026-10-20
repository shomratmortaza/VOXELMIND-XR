import { createXRStore } from "@react-three/xr";
import { supportsImmersiveVR } from "@/lib/scene/xr-session";
import { RightHand,LeftHand } from "./GazeHand";

type Store = ReturnType<typeof createXRStore>;
let store: Store | null = null;

/** Lazily created so nothing touches navigator.xr during server rendering. */
export function getXRStore(): Store {
  if (!store) {
    store = createXRStore({
      offerSession: false,
      emulate: false,
      enterGrantedSession: false,
      handTracking: true,
      anchors: false,
      meshDetection: true,
      planeDetection: true,
      hitTest: true,
      depthSensing: false,
      domOverlay: false,
      frameRate: false,
      foveation: 0.5,
      // Shared by hand AND controller loaders: public/hands must hold profilesList.json plus every listed profile.
      baseAssetPath: `${window.location.origin}/hands/`,
      // Spatial discovery is optional. Keep life-size floor tracking and explicit gesture entry.
      customSessionInit: { requiredFeatures: [], optionalFeatures: ["local-floor","hand-tracking", "plane-detection", "mesh-detection", "hit-test","anchors"] },
      // Left hand assists near-object two-hand transforms only; no palm-up command ray or teleport.
      hand: { left: LeftHand, right: RightHand },
      controller: { left: { rayPointer: false, grabPointer: true, teleportPointer: { makeDefault: true } }, right: { grabPointer: true, teleportPointer: false } },
    });
  }
  return store;
}

export async function isVRSupported(): Promise<boolean> {
  return supportsImmersiveVR(typeof navigator === "undefined" ? undefined : navigator.xr);
}

/** Re-checks when a headset is plugged in / Link is started (fires `devicechange`). */
export function onHeadsetChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  let xr = navigator.xr;
  xr?.addEventListener("devicechange", cb);
  const poll = window.setInterval(() => {
    if (xr !== navigator.xr) {
      xr?.removeEventListener("devicechange", cb);
      xr = navigator.xr;
      xr?.addEventListener("devicechange", cb);
      cb();
    }
  }, 3000);
  window.addEventListener("focus", cb);
  return () => {
    window.clearInterval(poll);
    window.removeEventListener("focus", cb);
    xr?.removeEventListener("devicechange", cb);
  };
}
