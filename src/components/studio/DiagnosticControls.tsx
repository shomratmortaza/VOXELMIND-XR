import { Text } from "@react-three/drei";
import { Suspense, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import type { AnchorCommand } from "@/lib/xr-capabilities";
export function DiagnosticControls({ action, end, message }: { action: (action: AnchorCommand["action"]) => void; end: () => void; message: string }) {
  const inXR=useXR(s => s.session!=null); const camera=useThree(s => s.camera); const board=useRef<THREE.Group>(null);
  const position=useRef(new THREE.Vector3()), rotation=useRef(new THREE.Quaternion()), offset=useRef(new THREE.Vector3());
  useFrame(() => { if (board.current && inXR) { camera.getWorldPosition(position.current); camera.getWorldQuaternion(rotation.current); offset.current.set(0,-0.12,-0.9).applyQuaternion(rotation.current); board.current.position.copy(position.current).add(offset.current); board.current.quaternion.copy(rotation.current); } });
  if (!inXR) return null;
  return <group ref={board}><mesh><boxGeometry args={[0.70,0.38,0.02]}/><meshBasicMaterial color="#121315"/></mesh><Suspense fallback={null}><Text font="/fonts/ChakraPetch-SemiBold.ttf" position={[0,0.10,0.02]} fontSize={0.018} maxWidth={0.62} raycast={() => null}>{message.slice(0,180)}</Text></Suspense>{[{label:"Create anchor",x:-0.17,y:-0.025,run:()=>action("create")},{label:"Restore anchor",x:0.17,y:-0.025,run:()=>action("restore")},{label:"Clear handle",x:-0.17,y:-0.12,run:()=>action("clear")},{label:"End probe",x:0.17,y:-0.12,run:end}].map(item=><group key={item.label} position={[item.x,item.y,0.02]}><mesh onClick={event=>{event.stopPropagation();item.run();}}><boxGeometry args={[0.30,0.075,0.02]}/><meshBasicMaterial color="lime"/></mesh><Suspense fallback={null}><Text font="/fonts/ChakraPetch-SemiBold.ttf" position={[0,0,0.015]} fontSize={0.018} maxWidth={0.27} color="#121315" raycast={()=>null}>{item.label}</Text></Suspense></group>)}</group>;
}
