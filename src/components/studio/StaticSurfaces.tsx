import {useEffect,useMemo} from "react";
import {useTexture} from "@react-three/drei";
import * as THREE from "three";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {SURFACE_SETS} from "./Surface";
import {objectMaterial} from "@/lib/scene/materials";
import type {SceneObject} from "@/lib/scene/types";
function Batch({objects,finish}:{objects:SceneObject[];finish:keyof typeof SURFACE_SETS}){
  const source=useTexture(SURFACE_SETS[finish]);
  const maps=useMemo(()=>{
    const copy={map:source.map.clone(),normalMap:source.normalMap.clone(),roughnessMap:source.roughnessMap.clone()};
    Object.values(copy).forEach(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);t.anisotropy=4;t.needsUpdate=true;});copy.map.colorSpace=THREE.SRGBColorSpace;return copy;
  },[source]);
  const geometry=useMemo(()=>{
    const parts=objects.map(o=>{
      const [w,h,d]=o.scale,g=new THREE.BoxGeometry(w,h,d),uv=g.getAttribute("uv");
      const tile=finish==="brick"?1.5:2;
      for(let face=0;face<6;face++){
        const extent=face<2?[d,h]:face<4?[w,d]:[w,h];
        for(let i=face*4;i<face*4+4;i++)uv.setXY(i,uv.getX(i)*(extent[0]??w)/tile,uv.getY(i)*(extent[1]??h)/tile);
      }
      g.clearGroups();g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...o.position),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),o.rotationY),new THREE.Vector3(1,1,1)));return g;
    });
    const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());merged?.computeBoundingSphere();return merged;
  },[objects,finish]);
  useEffect(()=>()=>geometry?.dispose(),[geometry]);useEffect(()=>()=>Object.values(maps).forEach(t=>t.dispose()),[maps]);
  const color=useMemo(()=>new THREE.Color("white").lerp(new THREE.Color(objects[0]?.color??"white"),finish==="plaster"?0.5:0.12),[objects,finish]);
  if(!geometry)return null;
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial {...maps} color={color} roughness={0.85} normalScale={[0.6,0.6]}/></mesh>;
}
export function StaticSurfaces({objects}:{objects:SceneObject[]}){
  const groups=useMemo(()=>{
    const map=new Map<string,{finish:keyof typeof SURFACE_SETS;objects:SceneObject[]}>();
    for(const o of objects){const material=objectMaterial(o),finish=material in SURFACE_SETS?material as keyof typeof SURFACE_SETS:material==="stone"?"paving":"plaster",key=finish+":"+o.color;const group=map.get(key)??{finish,objects:[]};group.objects.push(o);map.set(key,group);}return Array.from(map.entries());
  },[objects]);
  return <>{groups.map(([key,group])=><Batch key={key} {...group}/>)}</>;
}