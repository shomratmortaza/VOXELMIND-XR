import {createFileRoute,Link} from "@tanstack/react-router";
import {lazy,Suspense,useEffect,useState} from "react";
import {PublicPage} from "@/components/PublicPage";
import {Button} from "@/components/ui/button";
import {pageHead} from "@/lib/page-head";
import {decodeSharedScene} from "@/lib/scene/share";
import {useStudio} from "@/lib/scene/store";
import {getXRStore,isVRSupported} from "@/components/studio/xr-store";
import {useXRRuntime} from "@/lib/xr-runtime";
import {ViewportBoundary} from "@/components/studio/ViewportBoundary";
const Viewport=lazy(()=>import("@/components/studio/Viewport").then(m=>({default:m.Viewport})));
export const Route=createFileRoute("/shared")({ssr:false,staticData:{sitemap:false},head:()=>pageHead("/shared","Shared world","An independent read-only VOXELMIND XR layout on screen or in a supported headset."),component:Shared});
function Shared(){const [valid,setValid]=useState(false),[ready,setReady]=useState(false),[vr,setVR]=useState(false),[error,setError]=useState("");useEffect(()=>{const scene=decodeSharedScene(location.hash.slice(1));if(scene){useStudio.getState().load(scene);useXRRuntime.setState({readOnly:true});setValid(true);}void isVRSupported().then(setVR);return()=>{useXRRuntime.setState({readOnly:false});void getXRStore().getState().session?.end().catch(()=>{});};},[]);return <PublicPage title={valid?useStudio.getState().scene?.title??"Shared world":"Shared world unavailable"}>{valid?<><p>Read-only copy · no account or private photo included.</p><div className="h-[60dvh] min-h-80"><ViewportBoundary onFailure={()=>setReady(false)} onRetry={()=>location.reload()}><Suspense fallback={<p>Loading world…</p>}><Viewport onReady={setReady}/></Suspense></ViewportBoundary></div><Button variant="signal" disabled={!vr||!ready} onClick={()=>{useStudio.getState().setXRScale("life");useXRRuntime.setState({sessionMode:"immersive-vr",tablePosition:null});void getXRStore().enterVR().catch(e=>setError(String(e)));}}>View in VR</Button>{error&&<p role="alert" className="text-destructive">{error}</p>}</>:<p>The link is incomplete or invalid.</p>}<Button asChild variant="tool"><Link to="/">Home</Link></Button></PublicPage>;}
