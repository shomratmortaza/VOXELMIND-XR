import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneObject } from "@/lib/scene/types";
import { Surface } from "./Surface";

/** Dimension-driven architectural facade, not a scanned city or a navigable interior. */
export function Building({ o }: { o: SceneObject }) {
  const [w, h, d] = o.scale;
  const windows = useMemo(() => {
    const pieces: THREE.BufferGeometry[] = [];
    const floors = Math.max(1, Math.min(10, Math.floor(h / 3)));
    const addFace = (width: number, depth: number, yaw: number) => {
      const columns = Math.max(1, Math.min(8, Math.floor(width / 1.8)));
      for (let row = 0; row < floors; row++) for (let col = 0; col < columns; col++) {
        const pane = new THREE.BoxGeometry(Math.min(1.2, width / columns * 0.65), Math.min(1.5, h / floors * 0.55), 0.025);
        pane.translate(-width / 2 + (col + 0.5) * width / columns, -h / 2 + (row + 0.55) * h / floors, depth / 2 + 0.014);
        pane.rotateY(yaw); pieces.push(pane);
      }
    };
    addFace(w, d, 0); addFace(w, d, Math.PI); addFace(d, w, Math.PI / 2); addFace(d, w, -Math.PI / 2);
    const merged = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    return merged;
  }, [w, h, d]);
  useEffect(() => () => windows?.dispose(), [windows]);
  return <group>
    <Surface o={{ ...o, kind: "wall" }} />
    {windows && <mesh geometry={windows}><meshStandardMaterial color={o.color} metalness={0.85} roughness={0.18} /></mesh>}
    <mesh position={[0, h / 2 - 0.1, 0]} castShadow><boxGeometry args={[w + 0.04, 0.2, d + 0.04]} /><meshStandardMaterial color={o.color} roughness={0.95} /></mesh>
    <mesh position={[0, -h / 2 + 1.1, d / 2 + 0.025]}><boxGeometry args={[Math.min(1.5, w * 0.25), 2.2, 0.03]} /><meshStandardMaterial color={o.color} metalness={0.85} roughness={0.25} /></mesh>
  </group>;
}