import { useGLTF, useTexture } from "@react-three/drei";
import { Suspense,useEffect, useMemo, useRef,useState } from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {useXRRuntime} from "@/lib/xr-runtime";
import {configureModelLoader} from "./model-loader";
import {MODEL_LODS} from "./model-lods";
import * as THREE from "three";
import type { SceneObject } from "@/lib/scene/types";
import table from "@/assets/furniture/optimized/dining_table-full.asset.json";
import chair from "@/assets/furniture/optimized/dining-chair-lite-full.asset.json";
import desk from "@/assets/furniture/optimized/desk-correct-full.asset.json";
import sofa from "@/assets/furniture/optimized/sofa-real-full.asset.json";
import plant from "@/assets/furniture/optimized/plant-correct-vr-full.asset.json";
import shelf from "@/assets/furniture/optimized/shelf-correct-full.asset.json";
import bench from "@/assets/furniture/optimized/bench-full.asset.json";
import lamp from "@/assets/furniture/optimized/street-light-full.asset.json";
import tree from "@/assets/furniture/optimized/tree-vr-lite-full.asset.json";
import car from "@/assets/furniture/optimized/parked-car-full.asset.json";
import coffeeStation from "@/assets/furniture/optimized/coffee-station-full.asset.json";
import barStool from "@/assets/furniture/optimized/bar-stool-full.asset.json";
import bed from "@/assets/furniture/optimized/bed-full.asset.json";
import cabinet from "@/assets/furniture/optimized/cabinet-full.asset.json";
import bookshelf from "@/assets/furniture/optimized/bookshelf-full.asset.json";
import microwave from "@/assets/furniture/optimized/microwave-full.asset.json";
import fabricColor from "@/assets/surfaces/fabric-Color.asset.json";
import fabricNormal from "@/assets/surfaces/fabric-Normal.asset.json";
import fabricRough from "@/assets/surfaces/fabric-Rough.asset.json";
import woodColor from "@/assets/surfaces/oak_veneer_01_diff_1k.jpg.asset.json";
import woodNormal from "@/assets/surfaces/oak_veneer_01_nor_gl_1k.jpg.asset.json";
import woodRough from "@/assets/surfaces/oak_veneer_01_rough_1k.jpg.asset.json";
import { objectMaterial } from "@/lib/scene/materials";

const FINISH_MAPS = {
  fabric: { map: fabricColor.url, normalMap: fabricNormal.url, roughnessMap: fabricRough.url },
  wood: { map: woodColor.url, normalMap: woodNormal.url, roughnessMap: woodRough.url },
};
type FinishMaps = { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture };

export const FURNITURE: Partial<Record<SceneObject["kind"], string>> = {
  table: table.url, chair: chair.url, desk: desk.url, sofa: sofa.url,
  plant: plant.url, shelf: shelf.url, bench: bench.url, lamp: lamp.url, tree: tree.url, car: car.url,
};

export function furnitureUrl(o: SceneObject): string | undefined {
  if (o.kind === "box" && /^Bed(?:\b|$)/i.test(o.name)) return bed.url;
  if ((o.kind === "shelf" || o.kind === "counter") && /^(?:Kitchen )?Cabinet(?:\b|$)/i.test(o.name)) return cabinet.url;
  if (o.kind === "shelf" && /^Bookshelf(?:\b|$)/i.test(o.name)) return bookshelf.url;
  if (o.kind === "box" && /^Microwave(?:\b|$)/i.test(o.name)) return microwave.url;
  if ((o.kind === "box" || o.kind === "counter") && /^Coffee station(?:\b|$)/i.test(o.name)) return coffeeStation.url;
  if (o.kind === "chair" && /^Bar stool(?:\b|$)/i.test(o.name)) return barStool.url;
  return FURNITURE[o.kind];
}

export function Furniture({ o, url }: { o: SceneObject; url: string }) {
  const finish = objectMaterial(o);
  return finish === "wood" || finish === "fabric" ? <FinishedFurniture o={o} url={url} finish={finish} /> : <FurnitureModel o={o} url={url} />;
}

function FinishedFurniture({ o, url, finish }: { o: SceneObject; url: string; finish: keyof typeof FINISH_MAPS }) {
  const source = useTexture(FINISH_MAPS[finish]);
  const maps = useMemo(() => {
    const maps = { map: source.map.clone(), normalMap: source.normalMap.clone(), roughnessMap: source.roughnessMap.clone() };
    for (const texture of Object.values(maps)) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      const tile = finish === "fabric" ? 0.5 : 1;
      texture.repeat.set(o.scale[0] / tile, o.scale[2] / tile);
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
    maps.map.colorSpace = THREE.SRGBColorSpace;
    return maps;
  }, [source, finish, o.scale]);
  useEffect(() => () => Object.values(maps).forEach((texture) => texture.dispose()), [maps]);
  return <FurnitureModel o={o} url={url} maps={maps} />;
}

function FurnitureModel({ o, url, maps }: { o: SceneObject; url: string; maps?: FinishMaps|undefined }) {
  const root=useRef<THREE.Group>(null);
  const [distant,setDistant]=useState(false);
  useFrame(state=>{
    if(!root.current)return;
    const quality=useXRRuntime.getState().quality;
    const camera=state.gl.xr.isPresenting?state.gl.xr.getCamera():state.camera;
    root.current.getWorldPosition(positionScratch);
    const distance=positionScratch.distanceTo(camera.position);
    const threshold=quality==="safe"?5:quality==="balanced"?10:18;
    const next=distance>(distant?threshold-1:threshold+1);
    if(next!==distant)setDistant(next);
  });
  return <group ref={root}><Suspense fallback={<LoadedFurniture o={o} url={url} maps={maps}/>}><LoadedFurniture o={o} url={distant?(MODEL_LODS[url]??url):url} maps={maps}/></Suspense></group>;
}
const positionScratch=new THREE.Vector3();
function LoadedFurniture({o,url,maps}:{o:SceneObject;url:string;maps:FinishMaps|undefined}){
  const gl=useThree(s=>s.gl);
  const extendLoader=useMemo(()=>configureModelLoader(gl),[gl]);
  const { scene } = useGLTF(url,"/decoders/draco/",true,extendLoader);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    const box = new THREE.Box3().setFromObject(copy);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const [w, h, d] = o.scale;
    copy.scale.set(w / (size.x || 1), h / (size.y || 1), d / (size.z || 1));
    copy.position.copy(center).multiply(copy.scale).negate();
    copy.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true; child.receiveShadow = true;
      const tint = (original: THREE.Material) => {
        const material = original.clone();
        if (material instanceof THREE.MeshStandardMaterial) {
          // Texture detail stays visible while the chosen colour clearly shows.
          const tint = new THREE.Color(o.color);
          if (material.map) material.color.lerp(tint, 0.55);
          else material.color.lerp(tint, 0.8);
          const finish = objectMaterial(o);
          // glTF can use metalness=1 as a multiplier for a non-metal texture.
          // Do not mistake textured upholstery/wood for a solid metal fixture.
          if (maps && (material.metalness < 0.5 || material.metalnessMap != null)) {
            material.map = maps.map; material.normalMap = maps.normalMap; material.roughnessMap = maps.roughnessMap;
            material.metalnessMap = null;
            material.color.copy(tint); material.roughness = 0.9; material.metalness = 0;
          } else if (finish === "metal") {
            material.map = null; material.normalMap = null; material.roughnessMap = null;
            material.metalnessMap = null;
            material.color.copy(tint); material.metalness = 0.85; material.roughness = 0.35;
          } else if (finish === "leather") {
            material.color.copy(tint); material.roughness = 0.45;
          }
        }
        return material;
      };
      child.material = Array.isArray(child.material) ? child.material.map(tint) : tint(child.material);
    });
    return copy;
  }, [scene, o.scale, o.color, o.material, maps]);
  useEffect(() => () => {
    // Dispose only instance-owned materials; geometry and textures belong to the shared GLTF cache.
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
    });
  }, [model]);
  return <primitive object={model}/>;
}