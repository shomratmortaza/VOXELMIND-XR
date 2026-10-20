import * as THREE from "three";
import { xrLook } from "@/lib/xr-desktop-preview";

const before = new THREE.Vector3(), after = new THREE.Vector3(), right = new THREE.Vector3(), q = new THREE.Quaternion();

/**
 * Turn the world around the head: yaw about vertical, pitch about the head's own sideways axis.
 * The head stays where it is, so looking never slides the user. Pitch is absolute (xrLook.pitch tracks it).
 */
export function applyLook(o: THREE.Object3D, view: THREE.Object3D, yaw: number, wantPitch: number) {
  const dPitch = wantPitch - xrLook.pitch;
  if (!yaw && !dPitch) return;
  view.updateMatrixWorld(true);
  view.getWorldPosition(before);
  if (yaw) o.quaternion.premultiply(q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw));
  if (dPitch) {
    right.set(1, 0, 0).applyQuaternion(view.getWorldQuaternion(q)).setY(0);
    if (right.lengthSq() > 1e-6) {
      right.normalize();
      o.quaternion.premultiply(q.setFromAxisAngle(right, dPitch));
    }
    xrLook.pitch = wantPitch;
  }
  o.updateMatrixWorld(true);
  view.updateMatrixWorld(true);
  view.getWorldPosition(after);
  o.position.add(before.sub(after));
  o.updateMatrixWorld(true);
}

/** Level the view again (used on VR entry / storey change). */
export function resetLook(o: THREE.Object3D | null) {
  xrLook.pitch = 0;
  if (o) o.rotation.set(0, 0, 0);
}
