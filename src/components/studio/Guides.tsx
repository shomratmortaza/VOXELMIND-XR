import { Line, Text } from "@react-three/drei";
import { useMemo } from "react";
import { footprint, nearestGap } from "@/lib/scene/geometry";
import { applyProposals } from "@/lib/scene/proposals";
import { useStudio } from "@/lib/scene/store";
import type { SceneObject } from "@/lib/scene/types";

const FONT = "/fonts/ChakraPetch-SemiBold.ttf";
const GUIDE = "#b6f23a";
const CLASH = "#ff4d3d";

function Label({ text, position, size, color = GUIDE }: { text: string; position: [number, number, number]; size: number; color?: string }) {
  return (
    <Text font={FONT} position={position} fontSize={size} color={color} anchorX="center" anchorY="middle"
      outlineWidth={size * 0.12} outlineColor="#0b0c0d" renderOrder={10} material-depthTest={false}>
      {text}
    </Text>
  );
}

/** Dimension lines (W × D × H) and clear gap to the nearest solid part. */
export function MeasureGuides({ o, objects }: { o: SceneObject; objects: SceneObject[] }) {
  const f = footprint(o);
  const gap = useMemo(() => nearestGap(o, objects), [o, objects]);
  const span = Math.max(f.maxX - f.minX, f.maxZ - f.minZ, o.scale[1]);
  const t = Math.min(0.35, Math.max(0.09, span * 0.09));
  const y0 = f.minY + 0.02;
  const off = t * 0.9;
  return (
    <group>
      {/* width along X, in front */}
      <Line points={[[f.minX, y0, f.maxZ + off], [f.maxX, y0, f.maxZ + off]]} color={GUIDE} lineWidth={1.5} depthTest={false} />
      <Line points={[[f.minX, y0, f.maxZ], [f.minX, y0, f.maxZ + off * 1.3]]} color={GUIDE} lineWidth={1} depthTest={false} />
      <Line points={[[f.maxX, y0, f.maxZ], [f.maxX, y0, f.maxZ + off * 1.3]]} color={GUIDE} lineWidth={1} depthTest={false} />
      <Label text={`${(f.maxX - f.minX).toFixed(2)} m`} position={[(f.minX + f.maxX) / 2, y0 + t * 0.6, f.maxZ + off]} size={t} />
      {/* depth along Z, on the right */}
      <Line points={[[f.maxX + off, y0, f.minZ], [f.maxX + off, y0, f.maxZ]]} color={GUIDE} lineWidth={1.5} depthTest={false} />
      <Label text={`${(f.maxZ - f.minZ).toFixed(2)} m`} position={[f.maxX + off, y0 + t * 0.6, (f.minZ + f.maxZ) / 2]} size={t} />
      {/* height */}
      <Line points={[[f.minX - off, f.minY, f.maxZ], [f.minX - off, f.maxY, f.maxZ]]} color={GUIDE} lineWidth={1.5} depthTest={false} />
      <Label text={`H ${o.scale[1].toFixed(2)}`} position={[f.minX - off, (f.minY + f.maxY) / 2, f.maxZ + t * 0.3]} size={t * 0.8} />
      {gap && gap.gap < 6 && (
        <>
          <Line points={[[gap.from[0], y0, gap.from[1]], [gap.to[0], y0, gap.to[1]]]} color={gap.gap < 0.6 ? CLASH : "#9fd8ff"} lineWidth={2} dashed dashSize={t * 0.4} gapSize={t * 0.25} depthTest={false} />
          <Label
            text={gap.gap < 0.005 ? `touching ${gap.name}` : `${gap.gap.toFixed(2)} m to ${gap.name}`}
            position={[(gap.from[0] + gap.to[0]) / 2, y0 + t * 1.1, (gap.from[1] + gap.to[1]) / 2]}
            size={t * 0.8}
            color={gap.gap < 0.6 ? CLASH : "#9fd8ff"}
          />
        </>
      )}
    </group>
  );
}

/** Translucent preview of what the pending voice changes would produce. */
export function ProposalGhosts() {
  const scene = useStudio((s) => s.scene);
  const pending = useStudio((s) => s.pending);
  const ghosts = useMemo(() => {
    if (!scene || !pending) return [];
    const chosen = pending.items.filter((_, i) => pending.accepted[i]);
    const after = applyProposals(scene, chosen).objects;
    const before = new Map(scene.objects.map((o) => [o.id, JSON.stringify(o)]));
    return after.filter((o) => before.get(o.id) !== JSON.stringify(o));
  }, [scene, pending]);
  const removed = useMemo(() => {
    if (!scene || !pending) return [];
    const ids = new Set(pending.items.filter((p, i) => pending.accepted[i] && p.op === "delete").map((p) => p.targetId));
    return scene.objects.filter((o) => ids.has(o.id));
  }, [scene, pending]);
  return (
    <group>
      {ghosts.map((o) => (
        <mesh key={`g-${o.id}`} position={o.position} rotation={[0, o.rotationY, 0]} raycast={() => null}>
          <boxGeometry args={o.scale} />
          <meshBasicMaterial color={GUIDE} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
      {removed.map((o) => (
        <mesh key={`r-${o.id}`} position={o.position} rotation={[0, o.rotationY, 0]} raycast={() => null}>
          <boxGeometry args={[o.scale[0] + 0.05, o.scale[1] + 0.05, o.scale[2] + 0.05]} />
          <meshBasicMaterial color={CLASH} wireframe />
        </mesh>
      ))}
    </group>
  );
}
