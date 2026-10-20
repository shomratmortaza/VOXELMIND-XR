import { useLayoutEffect, useMemo, useRef } from "react";
import { TeleportTarget } from "@react-three/xr";
import * as THREE from "three";
import type { SceneSpec } from "@/lib/scene/types";
import { canStandAt, TELEPORT_CELL, walkableStrips } from "@/lib/scene/walkthrough";

export function TeleportFloor({ scene, onTeleport }: { scene: SceneSpec; onTeleport: (point: THREE.Vector3) => void }) {
  const strips = useMemo(() => walkableStrips(scene), [scene]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    strips.forEach((s, i) => {
      transform.position.set(s.x, 0.002, s.z);
      transform.rotation.x = -Math.PI / 2;
      transform.scale.set(s.width, TELEPORT_CELL, 1);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [strips]);
  if (!strips.length) return null;
  return <TeleportTarget onTeleport={(p, event) => {
    // The library's p ignores a turned origin; use and validate the actual world hit.
    void p;
    if (canStandAt(scene, event.point.x, event.point.z)) onTeleport(event.point);
  }}>
    <instancedMesh ref={ref} args={[undefined, undefined, strips.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  </TeleportTarget>;
}