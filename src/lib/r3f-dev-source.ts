import * as THREE from "three";
/**
 * Development-only: the source-inspector plugin tags every JSX element with data-tsd-source.
 * React Three Fiber treats that as a nested property and throws when a reused 3D element changes
 * source line, which unmounts the canvas. Give 3D objects a harmless per-instance target in dev.
 */
if (import.meta.env.DEV) {
  for (const proto of [THREE.Object3D.prototype, THREE.Material.prototype, THREE.BufferGeometry.prototype] as object[]) {
    if (!Object.prototype.hasOwnProperty.call(proto, "data")) {
      Object.defineProperty(proto, "data", { configurable: true, get(this: { __devData?: object }) { return (this.__devData ??= {}); }, set(value: unknown) { Object.defineProperty(this, "data", { value, writable: true, configurable: true, enumerable: true }); } });
    }
  }
}
export {};
