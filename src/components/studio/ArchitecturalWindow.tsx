import type { SceneObject } from "@/lib/scene/types";

/** Sized architectural assembly: glazing, mullions and projecting sill share the editable bounds. */
export function ArchitecturalWindow({ o }: { o: SceneObject }) {
  const [w, h, d] = o.scale;
  const frame = Math.min(0.055, w / 10, h / 10);
  return <group>
    <mesh><boxGeometry args={[w - frame * 2, h - frame * 2, d * 0.25]} /><meshPhysicalMaterial color={o.color} metalness={0.1} roughness={0.08} transparent opacity={0.32} envMapIntensity={1.2} /></mesh>
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * (w / 2 - frame / 2), 0, 0]} castShadow><boxGeometry args={[frame, h, d]} /><meshStandardMaterial color="gainsboro" metalness={0.65} roughness={0.28} /></mesh>
      <mesh position={[0, side * (h / 2 - frame / 2), 0]} castShadow><boxGeometry args={[w, frame, d]} /><meshStandardMaterial color="gainsboro" metalness={0.65} roughness={0.28} /></mesh>
    </group>)}
    <mesh castShadow><boxGeometry args={[frame * 0.65, h - frame, d]} /><meshStandardMaterial color="gainsboro" metalness={0.65} roughness={0.28} /></mesh>
    <mesh position={[0, -h / 2 + frame / 2, d / 3]} receiveShadow castShadow><boxGeometry args={[w, frame, d * 1.5]} /><meshStandardMaterial color="whitesmoke" roughness={0.6} /></mesh>
  </group>;
}