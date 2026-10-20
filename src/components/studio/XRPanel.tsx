import { Text } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { XRKeyboard } from "./XRKeyboard";
import { useStudio } from "@/lib/scene/store";
import { describeProposal } from "@/lib/scene/proposals";
import { getXRStore } from "./xr-store";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useServerFn } from "@tanstack/react-start";
import { saveCloudProject } from "@/lib/projects.functions";
import { SPATIAL_CATALOG } from "@/lib/scene/spatial-catalog";
import { spatialPlacement } from "@/lib/scene/spatial-placement";
import { useXR } from "@react-three/xr";
import { endVRSession } from "@/lib/scene/xr-session";
import { ROOM_STYLES, styleInstruction } from "@/lib/scene/styles";
import { supabase } from "@/integrations/supabase/client";
import { writeRecovery } from "@/lib/scene/recovery";
import {useXRRuntime,boardVisible} from "@/lib/xr-runtime";
import {spatialProvider} from "@/lib/spatial-provider";
import {saveAlignment,readAlignment} from "@/lib/spatial-alignment";
import {XR_BUDGET} from "@/lib/xr-input";
import {collidingIds} from "@/lib/scene/geometry";
import {useXRSettings} from "@/lib/xr-settings";
import {surfaceDesignInstruction} from "@/lib/spatial-design";
import {playSpatialCue} from "@/lib/xr-audio";
import {saveScene} from "@/lib/scene/store";
import {dwellActions} from "@/lib/xr-actions";
import { usesIWSDKRoomAnchors as usesIWSDK } from "@/lib/iwsdk-config";
import { roomAnchor } from "@/lib/room-anchor";
import { pulse, sourceOf } from "@/lib/xr-haptics";

const FONT = "/fonts/ChakraPetch-SemiBold.ttf";

function PanelText(props: ComponentProps<typeof Text>) {
  return <Suspense fallback={null}><Text {...props} /></Suspense>;
}

function PanelButton({
  label,
  position,
  onPress,
  disabled,
  active,
  width = 0.17,
  onHoldStart,
  onHoldEnd,
  danger,
}: {
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  danger?: boolean;
  label: string;
  position: [number, number, number];
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  width?: number;
}) {
  const [hover, setHover] = useState(false);
  const settings=useXRSettings();
  const dangerous=danger||["Delete","Apply selected","Discard","I agree","Speak a command","Finish voice command"].includes(label);
  const [down, setDown] = useState(false);
  const keyMesh=useRef<THREE.Mesh>(null);
  useEffect(()=>{const object=keyMesh.current;if(!object||dangerous||disabled||onHoldStart)return;dwellActions.set(object,onPress);return()=>{dwellActions.delete(object);};},[dangerous,disabled,onHoldStart,onPress]);
  const pressed = useRef(false);
  const release = useRef(onHoldEnd);
  release.current = onHoldEnd;
  useEffect(() => () => { if (pressed.current) release.current?.(); }, []);
  const bg = disabled ? "#2a2c30" : danger ? "#ff4d3d" : active ? "#b6f23a" : hover ? "#3c4046" : "#24272b";
  return (
    <group position={position}>
      {/* physical key: depresses when pressed */}
      <mesh
        ref={keyMesh}
        userData={{dwellSelect:!dangerous&&!onHoldStart&&!disabled,dwellAction:!dangerous&&!onHoldStart&&!disabled?onPress:undefined}}
        position={[0, 0, down ? 0.002 : 0.008]}
        onPointerEnter={(e) => { setHover(true); if (!disabled) pulse(sourceOf(e),"hover"); }}
        onPointerLeave={() => { setHover(false); if (pressed.current) onHoldEnd?.(); pressed.current = false; setDown(false); }}
        onPointerCancel={() => { if (pressed.current) onHoldEnd?.(); pressed.current = false; setDown(false); }}
        onPointerDown={(e) => { e.stopPropagation(); if (!disabled) { pressed.current = true; setDown(true); pulse(sourceOf(e),"press"); onHoldStart?.(); } }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (pressed.current && !disabled) { onHoldEnd?.(); onPress(); }
          pressed.current = false;
          setDown(false);
        }}
      >
        <boxGeometry args={[width, 0.055, 0.014]} />
        <meshStandardMaterial color={bg} roughness={0.5} metalness={0.2} />
      </mesh>
      <PanelText
        raycast={() => null}
        font={FONT}
        position={[0, 0, down ? 0.0105 : 0.0165]}
        fontSize={0.019*settings.textScale}
        maxWidth={width - 0.012}
        color={active ? "#14200a" : disabled ? "#6b6f75" : "#f2f2f2"}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0}
      >
        {label.toUpperCase()}
      </PanelText>
    </group>
  );
}

/** Physical control board shown inside the headset; travels with the user. */
export function XRPanel() {
  const s = useStudio();
  const floors: number[] = [...new Set((s.scene?.objects ?? []).map((o) => o.floor).filter((f): f is number => f !== undefined))].sort((a, b) => a - b);
  const runtime=useXRRuntime();
  const settings=useXRSettings();
  const [dwellConfirmation,setDwellConfirmation]=useState(false);
  const [commandsOpen,setCommandsOpen]=useState(false);
  const [toolsOpen,setToolsOpen]=useState(false);
  const [recentOpen,setRecentOpen]=useState(false);
  const [typing,setTyping]=useState(false);
  const closeTyping=useCallback(()=>setTyping(false),[]);
  const sendTyped=useCallback((text:string)=>{setTyping(false);const st=useStudio.getState();if(!st.scene)st.newBlank();void useStudio.getState().submitInstruction(text);},[]);
  const [recent,setRecent]=useState<import("@/lib/scene/types").SceneSpec[]>([]);
  const [cue,setCue]=useState("");
  useEffect(()=>{const listener=(event:Event)=>setCue(String((event as CustomEvent).detail));window.addEventListener("studio-cue",listener);return()=>window.removeEventListener("studio-cue",listener);},[]);
  const camera = useThree((state) => state.camera);
  const renderer=useThree(state=>state.gl);
  const saveProject = useServerFn(saveCloudProject);
  const [saveStatus, setSaveStatus] = useState("");
  const saving = useRef(false);
  const [proposalPage, setProposalPage] = useState(0);
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [surfaceIndex,setSurfaceIndex]=useState(0);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [assetIssue,setAssetIssue] = useState(false);
  const [offline,setOffline] = useState(false);
  useEffect(() => {
    const asset = () => setAssetIssue(true); const connection = () => setOffline(!navigator.onLine);
    connection(); window.addEventListener("studio-asset-error",asset); window.addEventListener("offline",connection); window.addEventListener("online",connection);
    return () => { window.removeEventListener("studio-asset-error",asset); window.removeEventListener("offline",connection); window.removeEventListener("online",connection); };
  }, []);
  useEffect(() => { setSpeechAvailable("speechSynthesis" in window); }, []);
  const board = useRef<THREE.Group>(null);
  const recall = useRef(true);
  const eye = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const dwellTarget=useRef<THREE.Object3D|null>(null),dwellStarted=useRef(0),dwellFired=useRef(false);
  useFrame((_,delta) => {
    const group = board.current;
    if (!group?.parent) return;
    const origin=getXRStore().getState().origin;
    const trackedCamera=origin?.children.find((child):child is THREE.Camera=>child instanceof THREE.Camera);
    const head=renderer.xr.isPresenting?(trackedCamera??renderer.xr.getCamera()):camera;
    head.getWorldPosition(eye.current); group.getWorldPosition(direction.current);
    direction.current.sub(eye.current).normalize();
    const facing=head.getWorldDirection(new THREE.Vector3());
    if(settings.dwell){
      let target:THREE.Object3D|null=null,best=0.998;
      for(const object of dwellActions.keys()){const vector=object.getWorldPosition(new THREE.Vector3()).sub(eye.current),distance=vector.length(),score=vector.normalize().dot(facing);if(distance>0.25&&distance<2&&score>best){target=object;best=score;}}
      if(target!==dwellTarget.current){dwellTarget.current=target;dwellStarted.current=performance.now();dwellFired.current=false;}
      if(target&&!dwellFired.current&&performance.now()-dwellStarted.current>=1200){dwellFired.current=true;dwellActions.get(target)?.();}
    }
    if(!recall.current && direction.current.dot(facing)>0.65)return;
    head.getWorldPosition(eye.current);
    group.parent.worldToLocal(eye.current);
    head.getWorldDirection(direction.current);
    // Thumbstick turning rotates the origin; express the view direction in the board's parent space.
    direction.current.applyQuaternion(group.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    direction.current.y = 0;
    direction.current.normalize();
    // Off the model's centre, still within the seated forward reach zone; never palm-attached.
    const destination=new THREE.Vector3(eye.current.x + direction.current.x * settings.distance, eye.current.y + settings.height, eye.current.z + direction.current.z * settings.distance);
    group.position.lerp(destination,recall.current?1:1-Math.exp(-4*Math.min(delta,0.05)));
    group.rotation.y = Math.atan2(-direction.current.x, -direction.current.z);
    recall.current = false;
  });
  // Y (left) or B (right) toggles the board; hands use the small Menu button.
  const menuPressed=useRef(false);
  useFrame(()=>{
    let pressed=false;
    for(const state of getXRStore().getState().inputSourceStates){
      if(state.type!=="controller")continue;
      const pad=(state as unknown as {gamepad?:Record<string,{state?:string}|undefined>}).gamepad;
      if(pad?.["y-button"]?.state==="pressed"||pad?.["b-button"]?.state==="pressed"||pad?.["menu"]?.state==="pressed")pressed=true;
    }
    if(pressed&&!menuPressed.current){useXRRuntime.setState(state=>({boardOpen:!state.boardOpen}));recall.current=true;for(const input of getXRStore().getState().inputSourceStates)if(input.type==="controller")pulse(input.inputSource,"press");}
    menuPressed.current=pressed;
  });
  const [placementStatus, setPlacementStatus] = useState("");
  useEffect(() => {
    if (!usesIWSDK() || !runtime.spatialOpen) return;
    let previous = roomAnchor.status;
    const timer = window.setInterval(() => { if (previous !== roomAnchor.status) { previous = roomAnchor.status; setPlacementStatus(previous); } }, 250);
    return () => window.clearInterval(timer);
  }, [runtime.spatialOpen]);
  const hands = useXR((state) => state.inputSourceStates.some((input) => input.type === "hand"));
  const controllers = useXR((state) => state.inputSourceStates.some((input) => input.type === "controller"));
  useEffect(() => () => useStudio.getState().cancelVoice(), []);
  useEffect(() => { setProposalPage(0); }, [s.pending?.items]);
  const save = async () => {
    if (!s.scene || saving.current) return;
    const r=useXRRuntime.getState(),surface=r.room.surfaces.find(p=>p.id===r.confirmedSurface);
    const snapshot = surface?{...s.scene,tabletop:{surfaceKind:surface.kind==="floor"?"floor" as const:"table" as const,width:surface.width,depth:surface.depth,relativeYaw:r.tableYaw,zoom:r.tableZoom}}:s.scene;
    if(surface)useStudio.setState({scene:snapshot});
    saving.current = true;
    setSaveStatus("Saving…");
    try {
      if (!navigator.onLine || !(await supabase.auth.getSession()).data.session) {
        saveScene(snapshot);
        writeRecovery(localStorage, { scene: snapshot, selectedId: s.selectedId, xrScale: s.xrScale, savedAt: s.savedAt, updatedAt: new Date().toISOString() });
        setSaveStatus("Saved on this device; no account needed"); return;
      }
      await saveProject({ data: snapshot });
      useStudio.getState().markPersisted(snapshot);
      setSaveStatus("Saved to your account");
    } catch (error) { setSaveStatus(error instanceof Error ? error.message : "Save failed; your scene stays open. Try again."); }
    finally { saving.current = false; }
  };
  const add = (item: (typeof SPATIAL_CATALOG)[number]) => {
    if (!s.scene) return;
    const head=renderer.xr.isPresenting?renderer.xr.getCamera():camera;
    const eye = head.getWorldPosition(new THREE.Vector3());
    const forward = head.getWorldDirection(new THREE.Vector3());
    const position = spatialPlacement(s.scene, item.kind, s.xrScale==="table"?[0,1.2,s.scene.size.depth/2]:eye.toArray(), s.xrScale==="table"?[0,0,-1]:forward.toArray(), s.snapStep, item.scale);
    if (!position) { setPlacementStatus("No clear floor nearby"); return; }
    const options = { ...(item.name ? { name: item.name } : {}), ...(item.scale ? { scale: item.scale } : {}) };
    s.addPart(item.kind, position, options);
    setPlacementStatus("");
    setCatalogOpen(false);
  };
  const sel = s.scene?.objects.find((o) => o.id === s.selectedId);
  const surface=runtime.room.surfaces[surfaceIndex%Math.max(1,runtime.room.surfaces.length)];
  const turn = (dy: number) => { if (sel && !sel.locked) { s.updateObject(sel.id, { rotationY: sel.rotationY + dy }); playSpatialCue("snap"); } };
  const nudge = (dy: number) => sel && s.updateObject(sel.id, { rotationY: sel.rotationY + dy });
  const grow = (k: number) =>
    sel && s.updateObject(sel.id, { scale: sel.scale.map((v) => Math.max(0.05, v * k)) as [number, number, number] });

  const v = s.voice;
  const status =
    v.status === "opening" ? "Allow microphone access in your headset"
    : v.status === "recording" ? "● Listening…"
    : v.status === "transcribing" ? `Transcribing… ${v.transcript}`
    : v.status === "thinking" ? v.progress ?? "AI is planning your layout…"
    : v.status === "error" ? v.error ?? "Something went wrong"
    : runtime.error ? `Spatial probe: ${runtime.error}. Virtual editing remains available.`
    : assetIssue ? "Some assets failed; bounds stay editable. Retry downloads."
    : offline ? "Offline: edit and save on device. AI needs connection."
    : placementStatus || saveStatus || (sel ? `${sel.name}  ·  ${sel.scale.map((x) => x.toFixed(2)).join(" × ")} m`
    : hands ? "Hands: walk physically · poke keys with a fingertip · pinch a part to grab and move · pinch with both hands to resize/turn · pinch buttons to press" : controllers ? "Left stick walk (climbs stairs) · right stick turn / look up-down · A jump · left trigger teleport · aim + trigger to drag along the floor · while holding, right stick turns it 90° · B/Y menu" : settings.dwell?"Head-gaze dwell active":"Waiting for hands or controllers · pick them up or raise your hands");
  const pend = s.pending;
  const pageCount = Math.max(1, Math.ceil((pend?.items.length ?? 0) / 3));

  if(runtime.readOnly)return <group key="read-only" ref={board}><PanelButton label="Exit VR" width={0.4} position={[0,0,0]} onPress={()=>{void endVRSession(getXRStore().getState().session).catch(()=>setSaveStatus("Could not exit VR. Use your headset's system menu."));}}/>{saveStatus&&<PanelText font={FONT} position={[0,-0.07,0]} fontSize={0.018} maxWidth={0.5}>{saveStatus}</PanelText>}</group>;
  const tall=toolsOpen||runtime.spatialOpen||runtime.settingsOpen;
  const mainMenu=runtime.tutorial<0&&!runtime.settingsOpen&&!commandsOpen&&!recentOpen&&!runtime.spatialOpen&&!s.voiceConsentOpen&&!pend&&!stylesOpen&&!catalogOpen&&!toolsOpen&&!typing;
  const showBoard=boardVisible({open:runtime.boardOpen,reviewing:!!pend,status:v.status,tutorial:runtime.tutorial,settingsOpen:runtime.settingsOpen,spatialOpen:runtime.spatialOpen});
  if(!showBoard)return <group key="menu-only" ref={board} position={[-0.15, 1.2, -0.55]}><PanelButton label="Menu" width={0.2} position={[-0.12,-0.12,0]} onPress={()=>{useXRRuntime.setState({boardOpen:true});recall.current=true;}}/></group>;
  return (
    <group key="board" ref={board} position={[-0.15, 1.2, -0.55]} rotation={[-0.12, 0.18, 0]}>
      <PanelButton label="Hide" width={0.12} position={[0.22,0.21,0]} onPress={()=>useXRRuntime.setState({boardOpen:false,settingsOpen:false,spatialOpen:false})}/>
      <mesh raycast={()=>null} position={[0, tall?-0.02:mainMenu||typing?-0.1:-0.02, -0.005]}>
        <boxGeometry args={[0.62,tall?0.86:mainMenu||typing?0.76:0.56,0.01]} />
        <meshStandardMaterial color={settings.highContrast?"#080808":"#121315"} roughness={0.8} />
      </mesh>
      <PanelText raycast={() => null} font={FONT} position={[-0.28, 0.205, 0.002]} fontSize={0.018} color="#b6f23a" anchorX="left" letterSpacing={0}>
        VOXELMIND XR · CONTROL
      </PanelText>
      {runtime.hud&&<PanelText raycast={()=>null} font={FONT} position={[-0.28,0.43,0.01]} fontSize={0.012} maxWidth={0.56} anchorX="left" color={(runtime.fps??72)<60?"#ff8a7d":"#cfd2d6"}>{`${runtime.fps?.toFixed(1)??"—"} FPS · min ${runtime.minimum?.toFixed(1)??"—"} · ${runtime.frameTime?.toFixed(1)??"—"} ms\n${runtime.calls}/${XR_BUDGET.drawCalls} calls · ${runtime.triangles}/${XR_BUDGET.triangles} tris\n${(runtime.textureBytes/1024/1024).toFixed(0)}/256 MiB estimated · ${runtime.quality}\nApp frames only; not compositor/GPU timing`}</PanelText>}
      <PanelText raycast={() => null} font={FONT} position={[-0.28, 0.17, 0.002]} fontSize={0.015} color={v.status === "error" ? "#ff8a7d" : "#cfd2d6"} anchorX="left" maxWidth={0.56}>
        {status}
      </PanelText>

      {settings.captions&&cue&&<PanelText raycast={()=>null} font={FONT} position={[0,-0.5,0]} fontSize={0.018}>{cue.toUpperCase()}</PanelText>}
      {runtime.tutorial>=0 ? <group key="tutorial">
        <PanelText raycast={()=>null} font={FONT} position={[-0.28,0.08,0.01]} fontSize={0.023} maxWidth={0.56} anchorX="left">{["1 / 4 · Pinch a chair to select and grab. Release to place.","2 / 4 · Pinch with both hands to resize and turn. Grab the table rim to turn the miniature.","3 / 4 · Speak a command, or choose Quick commands. Review before Apply.","4 / 4 · Confirm your table, shape the design, save locally. Return with Open saved."][runtime.tutorial]}</PanelText>
        <PanelButton label="Next" width={0.265} position={[-0.145,-0.2,0]} onPress={()=>useXRRuntime.setState({tutorial:runtime.tutorial===3?-1:runtime.tutorial+1})}/>
        <PanelButton label="Skip tutorial" width={0.265} position={[0.145,-0.2,0]} onPress={()=>useXRRuntime.setState({tutorial:-1})}/>
      </group> : runtime.settingsOpen ? <group key="settings">
        <PanelButton label={`Primary: ${settings.handedness}`} width={0.265} position={[-0.145,0.08,0]} onPress={()=>settings.update({handedness:settings.handedness==="right"?"left":"right"})}/>
        <PanelButton label="High contrast" width={0.265} position={[0.145,0.08,0]} active={settings.highContrast} onPress={()=>settings.update({highContrast:!settings.highContrast})}/>
        <PanelButton label="Lower board" width={0.265} position={[-0.145,0.01,0]} onPress={()=>{settings.update({height:settings.height-0.05});recall.current=true;}}/>
        <PanelButton label="Raise board" width={0.265} position={[0.145,0.01,0]} onPress={()=>{settings.update({height:settings.height+0.05});recall.current=true;}}/>
        <PanelButton label="Closer" width={0.265} position={[-0.145,-0.06,0]} onPress={()=>{settings.update({distance:settings.distance-0.1});recall.current=true;}}/>
        <PanelButton label="Farther" width={0.265} position={[0.145,-0.06,0]} onPress={()=>{settings.update({distance:settings.distance+0.1});recall.current=true;}}/>
        <PanelButton label="Text size" width={0.265} position={[-0.145,-0.13,0]} onPress={()=>settings.update({textScale:settings.textScale>=1.5?1:settings.textScale+0.25})}/>
        <PanelButton label={settings.muted?"Sound muted":"Sound on"} width={0.265} position={[0.145,-0.13,0]} onPress={()=>settings.update({muted:!settings.muted})}/>
        <PanelButton label={settings.dwell?"Head dwell on":"Head dwell off"} width={0.265} position={[-0.145,-0.2,0]} onPress={()=>settings.update({dwell:!settings.dwell})}/>
        <PanelButton label="Cue captions" width={0.265} position={[0.145,-0.2,0]} active={settings.captions} onPress={()=>settings.update({captions:!settings.captions})}/>
        <PanelButton label="Close" width={0.56} position={[0,-0.28,0]} onPress={()=>useXRRuntime.setState({settingsOpen:false})}/>
        <PanelButton label={settings.turn==="smooth"?"Turning: smooth":"Turning: steps"} width={0.56} position={[0,-0.42,0]} onPress={()=>settings.update({turn:settings.turn==="smooth"?"snap":"smooth"})}/>
        <PanelButton label={s.voiceMethod==="browser"?"Browser speech first":"Recorded audio"} width={0.56} position={[0,-0.35,0]} onPress={()=>s.setVoiceMethod(s.voiceMethod==="browser"?"audio":"browser")}/>
      </group> : commandsOpen ? <group key="commands">
        {["Make this glass","Add 4 chairs around this table","Move this left 1 metre","Fit this sofa to this wall","Make it cozy"].map((command,i)=><PanelButton key={command} label={command} width={0.56} position={[0,0.09-i*0.07,0]} disabled={v.status==="thinking"} onPress={()=>{setCommandsOpen(false);void s.submitInstruction(command);}}/>)}
        <PanelButton label="Close" width={0.56} position={[0,-0.3,0]} onPress={()=>setCommandsOpen(false)}/>
      </group> : recentOpen ? <group key="recent">
        {recent.slice(0,4).map((scene,i)=><PanelButton key={scene.id} label={scene.title.slice(0,36)} width={0.56} position={[0,0.08-i*0.075,0]} onPress={()=>{s.load(scene);setRecentOpen(false);}}/>)}
        {!recent.length&&<PanelText font={FONT} position={[0,0.02,0]} fontSize={0.019}>No device saves yet</PanelText>}
        <PanelButton label="Close" width={0.56} position={[0,-0.28,0]} onPress={()=>setRecentOpen(false)}/>
      </group> : runtime.spatialOpen ? <group key="spatial">
        <PanelText raycast={()=>null} font={FONT} position={[-0.28,0.12,0.01]} fontSize={0.014} maxWidth={0.56} anchorX="left">{`${runtime.room.mode} · ${surface?.kind??"none"} ${surface?.width.toFixed(1)??"0"} × ${surface?.depth.toFixed(1)??"0"} m\n${runtime.room.guidance}`}</PanelText>
        <PanelButton label={s.xrScale==="table"?"Manual table":"Manual floor"} width={0.265} position={[-0.145,-0.04,0]} onPress={()=>{
          const p=sel ? [sel.position[0],sel.position[1]-sel.scale[1]/2,sel.position[2]] as [number,number,number] : [0,0,0] as [number,number,number];
          spatialProvider.setManual({id:"manual",kind:s.xrScale==="table"?"table":"floor",position:s.xrScale==="table"?runtime.tablePosition??[0,0.7,-0.65]:p,yaw:0,width:s.xrScale==="table"?1.4:s.scene?.size.width??12,depth:s.xrScale==="table"?1.4:s.scene?.size.depth??12,confidence:0});
          spatialProvider.end();
          useXRRuntime.setState({confirmedSurface:"manual",roomConfirmed:true});
        }}/>
        <PanelButton label="Snap selected" width={0.265} position={[0.145,-0.04,0]} disabled={!sel||!!sel.locked||s.xrScale==="table"} onPress={()=>{
          if(!sel)return;
          if(!surface){setPlacementStatus("No confirmed floor/table. Set manual floor first.");return;}
          if(surface.kind==="wall"&&!["window","shelf","box"].includes(sel.kind)){setPlacementStatus("Select a window, shelf or art panel for this wall");return;}
          const result=spatialProvider.snapToSurface(sel.position,sel.scale,surface.id,sel.rotationY);
          if(result.ok){
            const objects=s.scene?.objects.map(o=>o.id===sel.id?{...o,position:result.value}:o)??[];
            if(collidingIds(objects).has(sel.id)){setPlacementStatus("Surface snap would overlap another part; adjust position first.");return;}
            s.updateObject(sel.id,{position:result.value,...(surface.kind==="wall"?{rotationY:surface.yaw}: {})});playSpatialCue("snap");
          }else setPlacementStatus(result.error);
        }}/>
        <PanelButton label="Save alignment" width={0.265} position={[-0.145,-0.11,0]} disabled={s.xrScale==="table"} onPress={()=>{
          if(!s.scene||!surface)return;
          const result=saveAlignment(localStorage,s.scene.id,s.scene.objects.filter(o=>!o.locked),surface.id);if(result.ok)s.setAlignment(result.value);setPlacementStatus(result.ok?"Relative alignment added to world; Save syncs it. Not persistent XR anchors.":result.error);
        }}/>
        <PanelButton label="Re-align saved" width={0.265} position={[0.145,-0.11,0]} disabled={s.xrScale==="table"} onPress={()=>{
          if(!s.scene)return;const anchors=s.scene.alignment??readAlignment(localStorage,s.scene.id);if(!anchors){setPlacementStatus("No saved alignment in world or on this device");return;}
          const result=spatialProvider.restoreAnchors(anchors,surface?.id);if(result.ok){s.alignObjects(result.value);setPlacementStatus("Re-aligned to explicitly selected surface; check real location");}else setPlacementStatus(result.error);
        }}/>
        <PanelButton label="Furnish my room" width={0.265} position={[-0.145,-0.18,0]} disabled={!surface||surface.kind!=="floor"||v.status==="thinking"} onPress={()=>{if(surface){useXRRuntime.setState({roomConfirmed:true,confirmedSurface:surface.id,spatialOpen:false});void s.submitInstruction(surfaceDesignInstruction("room",surface));}}}/>
        <PanelButton label={runtime.hud?"HUD on":"HUD off"} width={0.265} position={[0.145,-0.18,0]} active={runtime.hud} onPress={()=>useXRRuntime.setState({hud:!runtime.hud})}/>
        <PanelButton label="Next surface" width={0.265} position={[-0.145,-0.39,0]} onPress={()=>setSurfaceIndex(i=>i+1)}/>
        <PanelButton label="Confirm table" width={0.265} position={[0.145,-0.39,0]} disabled={!surface||!["table","unknown"].includes(surface.kind)||runtime.room.mode==="virtual"} onPress={()=>{
          roomAnchor.clear(); if(surface){spatialProvider.setManual({...surface,kind:"table",confidence:0});spatialProvider.end();useXRRuntime.setState({anchorPose:null,confirmedSurface:"manual",roomConfirmed:true});}setPlacementStatus("Table confirmed · miniature fitted to its bounds");
        }}/>
        {usesIWSDK() && <>
          <PanelButton label="Anchor table" width={0.265} position={[-0.145,-0.46,0]} disabled={!runtime.roomConfirmed||runtime.sessionMode!=="immersive-ar"||s.xrScale!=="table"} onPress={()=>{
            const confirmed=runtime.room.surfaces.find(p=>p.id===runtime.confirmedSurface&&p.kind==="table");
            if(!s.scene||!confirmed)return;
            const origin=getXRStore().getState().origin?.position;
            const position=confirmed.position.map((v,i)=>v-(origin?.getComponent(i)??0)) as [number,number,number];
            setPlacementStatus(roomAnchor.request(s.scene.id,{position,yaw:confirmed.yaw})?"Room anchor requested; this session only":"Anchor unavailable; confirm your table first");
          }}/>
          <PanelButton label="Release anchor" width={0.265} position={[0.145,-0.46,0]} onPress={()=>{roomAnchor.clear();useXRRuntime.setState({anchorPose:null});setPlacementStatus("Room anchor released; confirmed table retained");}}/>
        </>}
        <PanelButton label="Retry discovery" width={0.265} position={[-0.145,-0.25,0]} onPress={()=>{const session=getXRStore().getState().session;if(session)void spatialProvider.begin(session);}}/>
        <PanelButton label="Redesign my desk" width={0.265} position={[0.145,-0.25,0]} disabled={!surface||surface.kind!=="table"||v.status==="thinking"} onPress={()=>{if(surface){useXRRuntime.setState({roomConfirmed:true,spatialOpen:false});void s.submitInstruction(surfaceDesignInstruction("desk",surface));}}}/>
        <PanelButton label="Close" width={0.56} position={[0,-0.32,0]} onPress={()=>useXRRuntime.setState({spatialOpen:false})}/>
      </group> : s.voiceConsentOpen ? <group key="consent">
        <PanelText font={FONT} position={[-0.28,0.10,0.018]} fontSize={0.018} maxWidth={0.56} anchorX="left">Voice audio goes to AI transcription. Your transcript and world go to AI for reviewed edits. Voice is optional. Read Privacy on screen.</PanelText>
        <PanelButton label="I agree" width={0.265} position={[-0.145,-0.15,0]} active onPress={s.acceptVoiceConsent} />
        <PanelButton label="Not now" width={0.265} position={[0.145,-0.15,0]} onPress={s.declineVoiceConsent} />
      </group> : pend ? (
        <group key="proposals">
          <PanelText font={FONT} position={[-0.28, 0.13, 0.002]} fontSize={0.014} color="#b6f23a" anchorX="left" maxWidth={0.56}>
            {pend.drafting ? `DRAFTING: ${pend.items.length} changes so far` : pend.items.length ? `PROPOSED: ${pend.summary}` : pend.summary || "No changes proposed."}
          </PanelText>
          {pend.items.slice(proposalPage * 3, proposalPage * 3 + 3).map((p, offset) => {
            const i = proposalPage * 3 + offset;
            return (
            <PanelButton key={i} width={0.56} position={[0, 0.025 - offset * 0.06, 0]} active={!!pend.accepted[i]}
              label={`${pend.accepted[i] ? "[x]" : "[ ]"} ${s.scene ? describeProposal(p, s.scene) : p.op}`.slice(0, 48)}
              onPress={() => s.toggleProposal(i)} />
          ); })}
          <PanelButton label="Previous" position={[-0.2, -0.16, 0]} disabled={proposalPage === 0} onPress={() => setProposalPage((p) => p - 1)} />
          <PanelText font={FONT} position={[0, -0.16, 0.018]} fontSize={0.016} raycast={() => null}>{`${proposalPage + 1} / ${pageCount}`}</PanelText>
          <PanelButton label="Next" position={[0.2, -0.16, 0]} disabled={proposalPage + 1 >= pageCount} onPress={() => setProposalPage((p) => p + 1)} />
          <PanelButton label="Apply selected" position={[-0.145, -0.225, 0]} width={0.265} active onPress={s.acceptPending} disabled={pend.drafting||!pend.accepted.some(Boolean)} />
          <PanelButton label={pend.drafting?"Stop AI":"Discard"} position={[0.145, -0.225, 0]} width={0.265} onPress={s.rejectPending} />
          {settings.dwell&&<PanelButton label={dwellConfirmation?"Confirm apply":"Arm apply"} disabled={pend.drafting||!pend.accepted.some(Boolean)} width={0.56} position={[0,-0.31,0]} onPress={()=>{if(dwellConfirmation){s.acceptPending();setDwellConfirmation(false);}else setDwellConfirmation(true);}}/>}
        </group>
      ) : stylesOpen ? (
        <group key="styles">
          {ROOM_STYLES.map((style, i) => <PanelButton key={style.name} width={0.265}
            position={[i % 2 ? 0.145 : -0.145, 0.1 - Math.floor(i / 2) * 0.075, 0]}
            label={style.name} disabled={["opening", "thinking", "transcribing", "recording"].includes(v.status)}
            onPress={() => { setStylesOpen(false); void s.submitInstruction(styleInstruction(style)); }} />)}
          <PanelButton label="Close" width={0.56} position={[0, -0.195, 0]} onPress={() => setStylesOpen(false)} />
          {speechAvailable && <PanelButton label={s.spokenFeedback ? "Spoken response: on" : "Spoken response: off"} width={0.56} position={[0, -0.275, 0]} active={s.spokenFeedback} onPress={() => s.setSpokenFeedback(!s.spokenFeedback)} />}
        </group>
      ) : catalogOpen ? (
        <group key="catalog">
          {SPATIAL_CATALOG.slice(catalogPage * 8, catalogPage * 8 + 8).map((item, i) => <PanelButton key={item.label}
            width={0.265} position={[i % 2 ? 0.145 : -0.145, 0.105 - Math.floor(i / 2) * 0.075, 0]}
            label={item.label} onPress={() => add(item)} />)}
          <PanelButton label="Previous" width={0.17} position={[-0.2, -0.225, 0]} disabled={catalogPage === 0} onPress={() => setCatalogPage((p) => p - 1)} />
          <PanelButton label="Close" width={0.17} position={[0, -0.225, 0]} onPress={() => setCatalogOpen(false)} />
          <PanelButton label="Next" width={0.17} position={[0.2, -0.225, 0]} disabled={(catalogPage + 1) * 8 >= SPATIAL_CATALOG.length} onPress={() => setCatalogPage((p) => p + 1)} />
        </group>
      ) : typing ? (
        <group key="keyboard" position={[0,-0.05,0]}>
          <XRKeyboard busy={["opening","recording","transcribing","thinking"].includes(v.status)} onClose={closeTyping} onSubmit={sendTyped} />
        </group>
      ) : !toolsOpen ? <group key="main-menu">
        <PanelButton label={v.status==="recording"?"Finish voice command":"Speak a command"} width={0.265} position={[-0.145,0.1,0]} danger={v.status==="recording"} disabled={["opening","transcribing","thinking"].includes(v.status)} onPress={()=>{if(v.status==="recording")void s.stopVoice();else void s.startVoice();}}/>
        <PanelButton label="Type a command" width={0.265} position={[0.145,0.1,0]} disabled={["opening","recording","transcribing","thinking"].includes(v.status)} onPress={()=>setTyping(true)}/>
        <PanelButton label="Undo" width={0.265} position={[-0.145,0.03,0]} disabled={!s.past.length} onPress={s.undo}/>
        <PanelButton label="Redo" width={0.265} position={[0.145,0.03,0]} disabled={!s.future.length} onPress={s.redo}/>
        <PanelButton label="Turn left 90°" position={[-0.2,-0.04,0]} disabled={!sel||!!sel.locked} onPress={()=>turn(Math.PI/2)}/>
        <PanelButton label="Turn right 90°" position={[0,-0.04,0]} disabled={!sel||!!sel.locked} onPress={()=>turn(-Math.PI/2)}/>
        <PanelButton label="Delete" position={[0.2,-0.04,0]} disabled={!sel||!!sel.locked} onPress={()=>sel&&s.remove(sel.id)}/>
        <PanelButton label="Quick commands" width={0.265} position={[-0.145,-0.11,0]} onPress={()=>setCommandsOpen(true)}/>
        <PanelButton label="Objects" width={0.265} position={[0.145,-0.11,0]} onPress={()=>setCatalogOpen(true)}/>
        <PanelButton label="Your room" width={0.265} position={[-0.145,-0.18,0]} onPress={()=>useXRRuntime.setState({spatialOpen:true})}/>
        <PanelButton label="Shape tools" width={0.265} position={[0.145,-0.18,0]} onPress={()=>setToolsOpen(true)}/>
        <PanelButton label="Save" width={0.265} position={[-0.145,-0.25,0]} onPress={()=>void save()}/>
        <PanelButton label="Open saved" width={0.265} position={[0.145,-0.25,0]} onPress={()=>{import("@/lib/scene/store").then(m=>{setRecent(m.listSavedScenes());setRecentOpen(true);});}}/>
        <PanelButton label="Accessibility" width={0.265} position={[-0.145,-0.32,0]} onPress={()=>useXRRuntime.setState({settingsOpen:true})}/>
        <PanelButton label="Exit VR" width={0.265} position={[0.145,-0.32,0]} onPress={()=>{void endVRSession(getXRStore().getState().session).catch(()=>setSaveStatus("Use headset menu to exit"));}}/>
        {v.status==="thinking"&&<PanelButton label="Stop AI" width={0.56} position={[0,-0.39,0]} onPress={s.cancelProposal}/>}
      </group> : (
        <group key="editing">
          {v.status === "thinking" && <PanelButton label="Stop AI" width={0.56} position={[0,0.115,0]} onPress={s.cancelProposal} />}
          <PanelButton
            label={v.status === "opening" ? "Opening microphone…" : v.status === "recording" ? "Finish voice command" : "Speak a command"}
            width={0.56}
            position={[0, v.status === "thinking" ? 0.4 : 0.115, 0]}
            danger={v.status === "recording"}
            disabled={["opening", "transcribing", "thinking"].includes(v.status)}
            onPress={() => { if (v.status === "recording") void s.stopVoice(); else void s.startVoice(); }}
          />
          <PanelButton label="Rotate −15°" position={[-0.2, 0.05, 0]} disabled={!sel} onPress={() => nudge(-Math.PI / 12)} />
          <PanelButton label="Rotate +15°" position={[0, 0.05, 0]} disabled={!sel} onPress={() => nudge(Math.PI / 12)} />
          <PanelButton label="Duplicate" position={[0.2, 0.05, 0]} disabled={!sel} onPress={() => sel && s.duplicate(sel.id)} />

          <PanelButton label="Smaller" position={[-0.2, -0.015, 0]} disabled={!sel} onPress={() => grow(0.9)} />
          <PanelButton label="Larger" position={[0, -0.015, 0]} disabled={!sel} onPress={() => grow(1.1)} />
          <PanelButton label="Delete" position={[0.2, -0.015, 0]} disabled={!sel} onPress={() => sel && s.remove(sel.id)} />

          <PanelButton label="Undo" position={[-0.2, -0.08, 0]} disabled={!s.past.length} onPress={s.undo} />
          <PanelButton label="Redo" position={[0, -0.08, 0]} disabled={!s.future.length} onPress={s.redo} />
          <PanelButton label={s.snapStep ? `Snap ${s.snapStep} m` : "Snap off"} position={[0.2, -0.08, 0]} active={!!s.snapStep}
            onPress={() => s.setSnapStep(s.snapStep === 0.25 ? 0.1 : s.snapStep === 0.1 ? 0 : 0.25)} />

          <PanelButton label="Tabletop" position={[-0.2, -0.145, 0]} active={s.xrScale === "table"} onPress={() => s.setXRScale("table")} />
          <PanelButton label="Step inside" position={[0, -0.145, 0]} active={s.xrScale === "life"} onPress={() => s.setXRScale("life")} />
          <PanelButton label="Guides" position={[0.2, -0.145, 0]} active={s.showGuides} onPress={() => s.setShowGuides(!s.showGuides)} />

          {floors.length > 1 && <PanelButton label="All floors" position={[-0.2, 0.115, 0]} active={s.floorFocus === null} onPress={() => s.setFloorFocus(null)} />}
          {floors.length > 1 && floors.map((f, i) => (
            <PanelButton key={f} label={["Ground", "First", "Roof"][f] ?? `Floor ${f + 1}`} position={[i === 0 ? 0 : 0.2, 0.115, 0]} active={s.floorFocus === f} onPress={() => s.setFloorFocus(f)} />
          ))}

          <PanelButton label="Deselect" position={[-0.2, -0.21, 0]} disabled={!sel} onPress={() => s.select(null)} />
          <PanelButton label="Save" position={[0, -0.21, 0]} disabled={saveStatus === "Saving…"} onPress={() => void save()} />
          <PanelButton label="Exit VR" position={[0.2, -0.21, 0]} onPress={() => { void endVRSession(getXRStore().getState().session).catch(() => setSaveStatus("Could not exit VR. Use your headset's system menu.")); }} />
          <PanelButton label="Objects" width={0.265} position={[-0.145, -0.275, 0]} active onPress={() => setCatalogOpen(true)} />
          <PanelButton label="Style Transform" width={0.265} position={[0.145, -0.275, 0]} active disabled={["opening", "recording", "transcribing", "thinking"].includes(v.status)} onPress={() => setStylesOpen(true)} />
          <PanelButton label={s.gazePinch ? "Head gaze: on" : "Hand ray: on"} width={0.265} position={[-0.145, -0.34, 0]} active={s.gazePinch} onPress={() => s.setGazePinch(!s.gazePinch)} />
          <PanelButton label="Recenter board" width={0.265} position={[0.145, -0.34, 0]} onPress={() => { recall.current = true; }} />
          <PanelButton label="Spatial / performance" width={0.56} position={[0,-0.405,0]} onPress={()=>useXRRuntime.setState({spatialOpen:true})}/>
          <PanelButton label="Close tools" width={0.265} position={[-0.145,0.32,0]} onPress={()=>setToolsOpen(false)}/>
          <PanelButton label="Accessibility" width={0.265} position={[0.145,0.32,0]} onPress={()=>useXRRuntime.setState({settingsOpen:true})}/>
          <PanelButton label="Open saved" width={0.265} position={[-0.145,0.4,0]} onPress={()=>{import("@/lib/scene/store").then(m=>{setRecent(m.listSavedScenes());setRecentOpen(true);});}}/>
          <PanelButton label={runtime.comparison?"Show after":"Show before"} width={0.56} position={[0,0.48,0]} disabled={!s.past.length} onPress={()=>useXRRuntime.setState({comparison:!runtime.comparison})}/>
          <PanelButton label="Recenter table" width={0.265} position={[0.145,0.4,0]} onPress={()=>useXRRuntime.setState({tablePosition:null,tableYaw:0,tableZoom:1})}/>
        </group>
      )}
      {v.status === "error" && !pend && <PanelButton label="Retry command" width={0.56} position={[0,0.32,0]} onPress={() => { if (v.transcript) void s.submitInstruction(v.transcript); else void s.startVoice(); }} />}
      {assetIssue && <PanelButton label="Retry downloads" width={0.56} position={[0,v.status==="error"?0.39:0.32,0]} onPress={() => { setAssetIssue(false); window.dispatchEvent(new Event("studio-retry-assets")); }} />}
    </group>
  );
}
