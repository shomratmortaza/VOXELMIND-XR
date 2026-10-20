import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { SceneObject } from "@/lib/scene/types";
import { objectMaterial } from "@/lib/scene/materials";
import brickColor from "@/assets/surfaces/brick-Diffuse.asset.json";
import brickNormal from "@/assets/surfaces/brick-nor_gl.asset.json";
import brickRough from "@/assets/surfaces/brick-Rough.asset.json";
import floorColor from "@/assets/surfaces/plank_flooring_diff_1k.jpg.asset.json";
import floorNormal from "@/assets/surfaces/plank_flooring_nor_gl_1k.jpg.asset.json";
import floorRough from "@/assets/surfaces/plank_flooring_rough_1k.jpg.asset.json";
import plasterColor from "@/assets/surfaces/painted_plaster_wall_diff_1k.jpg.asset.json";
import plasterNormal from "@/assets/surfaces/painted_plaster_wall_nor_gl_1k.jpg.asset.json";
import plasterRough from "@/assets/surfaces/painted_plaster_wall_rough_1k.jpg.asset.json";
import woodColor from "@/assets/surfaces/oak_veneer_01_diff_1k.jpg.asset.json";
import woodNormal from "@/assets/surfaces/oak_veneer_01_nor_gl_1k.jpg.asset.json";
import woodRough from "@/assets/surfaces/oak_veneer_01_rough_1k.jpg.asset.json";
import grassColor from "@/assets/surfaces/aerial_grass_rock-Diffuse.asset.json";
import grassNormal from "@/assets/surfaces/aerial_grass_rock-nor_gl.asset.json";
import grassRough from "@/assets/surfaces/aerial_grass_rock-Rough.asset.json";
import asphaltColor from "@/assets/surfaces/asphalt_02-Diffuse.asset.json";
import asphaltNormal from "@/assets/surfaces/asphalt_02-nor_gl.asset.json";
import asphaltRough from "@/assets/surfaces/asphalt_02-Rough.asset.json";
import pavingColor from "@/assets/surfaces/concrete_pavement-Diffuse.asset.json";
import pavingNormal from "@/assets/surfaces/concrete_pavement-nor_gl.asset.json";
import pavingRough from "@/assets/surfaces/concrete_pavement-Rough.asset.json";

export const SURFACE_SETS = {
  brick: { map: brickColor.url, normalMap: brickNormal.url, roughnessMap: brickRough.url },
  floor: { map: floorColor.url, normalMap: floorNormal.url, roughnessMap: floorRough.url },
  plaster: { map: plasterColor.url, normalMap: plasterNormal.url, roughnessMap: plasterRough.url },
  wood: { map: woodColor.url, normalMap: woodNormal.url, roughnessMap: woodRough.url },
  grass: { map: grassColor.url, normalMap: grassNormal.url, roughnessMap: grassRough.url },
  asphalt: { map: asphaltColor.url, normalMap: asphaltNormal.url, roughnessMap: asphaltRough.url },
  paving: { map: pavingColor.url, normalMap: pavingNormal.url, roughnessMap: pavingRough.url },
};

/** Instance-owned repeats preserve metre-scale texture detail without mutating the shared cache. */
function Finish({ o, finish, face }: { o: SceneObject; finish: keyof typeof SURFACE_SETS; face?: number }) {
  const source = useTexture(SURFACE_SETS[finish]);
  const maps = useMemo(() => {
    const result = { map: source.map.clone(), normalMap: source.normalMap.clone(), roughnessMap: source.roughnessMap.clone() };
    for (const texture of Object.values(result)) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      const horizontal = o.kind === "floor" || o.kind === "road" || o.name === "Ceiling";
      const [w, h, d] = o.scale;
      const extent = face == null ? [w, horizontal ? d : h] : face < 2 ? [d, h] : face < 4 ? [w, d] : [w, h];
      const tileMetres = finish === "brick" ? 1.5 : 2;
      texture.repeat.set(Math.max(0.02, (extent[0] ?? w) / tileMetres), Math.max(0.02, (extent[1] ?? h) / tileMetres));
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
    result.map.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [source, o.scale, o.kind, o.name, face, finish]);
  useEffect(() => () => Object.values(maps).forEach((texture) => texture.dispose()), [maps]);
  const tint = useMemo(() => new THREE.Color("white").lerp(new THREE.Color(o.color), finish === "plaster" ? 0.85 : 0.55), [o.color, finish]);
  return <meshStandardMaterial attach={face == null ? "material" : `material-${face}`} {...maps} color={tint} normalScale={[0.6, 0.6]} roughness={0.85} />;
}

export function Surface({ o }: { o: SceneObject }) {
  const material = objectMaterial(o);
  const finish = material in SURFACE_SETS ? material as keyof typeof SURFACE_SETS : material === "stone" ? "paving" : "plaster";
  if (o.kind === "counter") {
    const [w, h, d] = o.scale;
    return <group>
      <mesh receiveShadow castShadow position={[0, -0.025, 0]}><boxGeometry args={[w - 0.06, h - 0.05, d - 0.04]} /><Finish o={o} finish={finish} /></mesh>
      <mesh receiveShadow castShadow position={[0, h / 2 - 0.025, 0]}><boxGeometry args={[w, 0.05, d]} /><Finish o={o} finish="plaster" /></mesh>
      <mesh position={[0, -h / 2 + 0.045, d / 2 - 0.015]}><boxGeometry args={[w - 0.1, 0.09, 0.02]} /><meshStandardMaterial color="dimgray" metalness={0.7} roughness={0.3} /></mesh>
    </group>;
  }
  return <mesh receiveShadow castShadow={o.kind !== "floor"}>
    <boxGeometry args={o.scale} />
    {material === "glass" ? <meshPhysicalMaterial color={o.color} transparent opacity={0.25} roughness={0.08} metalness={0.05} depthWrite={false} />
      : [0, 1, 2, 3, 4, 5].map((face) => <Finish key={face} o={o} finish={finish} face={face} />)}
  </mesh>;
}