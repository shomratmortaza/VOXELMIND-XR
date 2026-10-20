import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useStudio } from "@/lib/scene/store";
import type { SceneObject } from "@/lib/scene/types";

/** Animate only the presentation; saved dimensions and undo snapshots stay exact. */
export function ReviewedMotion({ object, children }: { object: SceneObject; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const transition = useStudio((s) => s.transition);
  const elapsed = useRef(1);
  const reduced = useRef(false);
  const colors = useRef(new Map<THREE.MeshStandardMaterial, THREE.Color>());
  const previous = transition?.from.objects.find((o) => o.id === object.id);
  const startColor = useMemo(() => new THREE.Color(previous?.color ?? object.color), [previous?.color, object.color]);
  const active = transition?.to.objects.find((o) => o.id === object.id) === object;
  useEffect(() => { reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  useEffect(() => { elapsed.current = 0; colors.current.clear(); }, [transition, object.color, object.material]);
  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!g) return;
    elapsed.current = Math.min(1, elapsed.current + Math.min(rawDelta, 0.05) / 0.65);
    const t = active && !reduced.current ? elapsed.current : 1;
    const remaining = 1 - t * t * (3 - 2 * t);
    if (active && previous && previous.color !== object.color && (t < 1 || colors.current.size > 0)) {
      g.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
          if (!(material instanceof THREE.MeshStandardMaterial)) continue;
          let target = colors.current.get(material);
          if (!target) { target = object.material && object.material !== "original" ? new THREE.Color(object.color) : material.color.clone(); colors.current.set(material, target); }
          material.color.copy(target).lerp(startColor, remaining);
        }
      });
      if (t === 1) colors.current.clear();
    }
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1);
    if (!active || t === 1) return;
    if (!previous) { g.scale.setScalar(Math.max(0.01, 1 - remaining)); return; }
    // Convert world displacement to the object's final local yaw.
    const dx = (previous.position[0] - object.position[0]) * remaining;
    const dz = (previous.position[2] - object.position[2]) * remaining;
    const c = Math.cos(object.rotationY), s = Math.sin(object.rotationY);
    g.position.set(c * dx - s * dz, (previous.position[1] - object.position[1]) * remaining, s * dx + c * dz);
    g.rotation.y = Math.atan2(Math.sin(previous.rotationY - object.rotationY), Math.cos(previous.rotationY - object.rotationY)) * remaining;
    g.scale.set(...object.scale.map((value, i) => 1 + ((previous.scale[i] ?? value) / value - 1) * remaining) as [number, number, number]);
  });
  return <group ref={group}>{children}</group>;
}