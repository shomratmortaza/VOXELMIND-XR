import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { PublicPage } from "@/components/PublicPage";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/page-head";
import { emptyReport, formatReport, probeBrowser, recordFailure, type AnchorCommand, type CapabilityReport } from "@/lib/xr-capabilities";
import { ViewportBoundary } from "@/components/studio/ViewportBoundary";
const ProbeCanvas=lazy(()=>import("@/components/studio/DiagnosticCanvas"));
export const Route=createFileRoute("/diagnostics")({ssr:false,staticData:{sitemap:false},head:()=>pageHead("/diagnostics","Headset diagnostics","Live WebXR capability probes, failures and measured diagnostic-scene performance for VOXELMIND XR."),component:Diagnostics});
function Diagnostics() {
  const [report,setReport]=useState<CapabilityReport>(emptyReport); const latest=useRef(report); latest.current=report;
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false),[attempt,setAttempt]=useState(0),[active,setActive]=useState(false);
  const [anchorCommand,setAnchorCommand]=useState<AnchorCommand>({id:0,action:"create"});
  const [exportText,setExportText]=useState("");
  const store=useRef<ReturnType<typeof import("@/components/studio/DiagnosticCanvas").diagnosticStore>|null>(null);
  const requested=useRef<string[]>([]);
  const fail=(feature:string,error:unknown)=>setReport(value=>recordFailure(value,feature,error));
  useEffect(()=>{
    let mounted=true; let unsubscribe:(()=>void)|undefined;
    void import("@/components/studio/DiagnosticCanvas").then(module=>{if(!mounted)return;requested.current=module.PROBE_FEATURES;store.current=module.diagnosticStore();unsubscribe=store.current.subscribe(state=>{setActive(state.session!=null);});}).catch(error=>{if(mounted)fail("renderer",error);});
    void probeBrowser().then(value=>{if(mounted)setReport(value);}).catch(error=>{if(mounted)fail("browser-probe",error);});
    return ()=>{mounted=false;unsubscribe?.();void store.current?.getState().session?.end().catch(()=>{});};
  },[]);
  const start=async(mode:"immersive-vr"|"immersive-ar")=>{
    if(busy||active)return;
    if(!store.current){fail(mode,new Error("Probe is still loading. Retry when ready."));return;}
    setBusy(true);setCopied(false);
    try {
      const baseline=emptyReport();
      setReport(value=>({...baseline,timestamp:new Date().toISOString(),userAgent:value.userAgent,features:{...value.features},sessionMode:mode,requestedFeatures:requested.current}));
      // Never start a session indirectly; only this user-activated action requests it.
      await store.current.enterXR(mode);
      setReport(value=>({...value,session:"started",features:{...value.features,[mode]:{status:"granted",detail:"Session started; no physical-device verification claimed"}}}));
    } catch(error){fail(mode,error);} finally{setBusy(false);}
  };
  const end=async()=>{try{await store.current?.getState().session?.end();setReport(value=>({...value,session:"ended"}));}catch(error){fail("session-end",error);}};
  const command=(action:AnchorCommand["action"])=>setAnchorCommand(value=>({id:Date.now(),action}));
  const copy=async()=>{let text=formatReport(latest.current);try{const production=localStorage.getItem("voxelmind.production-performance");if(production)text+="\n\nLAST PRODUCTION STUDIO SAMPLE (not device-verified)\n"+production;}catch(error){fail("production-report",error);}setExportText(text);try{await navigator.clipboard.writeText(text);setCopied(true);}catch(error){fail("clipboard",error);}};
  return <PublicPage title="Headset diagnostics"><p>Live observations do not establish physical Quest verification. Performance below measures this diagnostic scene, not the furnished studio or compositor.</p><div className="flex flex-wrap gap-2"><Button variant="signal" disabled={!ready||busy||active||report.features["immersive-vr"]?.status==="unsupported"} onClick={()=>void start("immersive-vr")}>Probe VR</Button><Button variant="tool" disabled={!ready||busy||active||report.features["immersive-ar"]?.status==="unsupported"} onClick={()=>void start("immersive-ar")}>Probe passthrough</Button><Button variant="tool" disabled={!active} onClick={()=>command("create")}>Create anchor</Button><Button variant="tool" disabled={!active} onClick={()=>command("restore")}>Restore anchor</Button><Button variant="tool" disabled={!active} onClick={()=>command("clear")}>Clear saved handle</Button><Button variant="tool" disabled={!active} onClick={()=>void end()}>End session</Button><Button variant="tool" onClick={()=>void copy()}>{copied?"Copied":"Copy report"}</Button><Button variant="tool" disabled={active||busy} onClick={()=>{void probeBrowser().then(setReport).catch(error=>fail("browser-probe",error));}}>Recheck browser</Button></div>
  {report.error&&<div role="alert" className="border border-destructive p-3 text-destructive [overflow-wrap:anywhere]"><p>{report.error}</p><Button variant="tool" disabled={active} onClick={()=>{setReady(false);setAttempt(v=>v+1);}}>Retry probe view</Button></div>}
  <div className="h-64 overflow-hidden rounded border border-border"><ViewportBoundary key={attempt} onFailure={()=>setReady(false)} onRetry={()=>{setReady(false);setAttempt(v=>v+1);}}><Suspense fallback={<p>Loading probe…</p>}><ProbeCanvas report={report} onReport={setReport} anchorCommand={anchorCommand} onReady={()=>setReady(true)}/></Suspense></ViewportBoundary></div><p className="label-mono">Session: {report.sessionMode??"none"} · {report.session}</p>
  <div className="divide-y divide-border">{Object.entries(report.features).map(([name,feature])=><div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]" key={name}><strong>{name}</strong><div className={`${["denied","unsupported","error"].includes(feature.status)?"text-destructive":feature.status==="working"?"text-accent":"text-muted-foreground"} [overflow-wrap:anywhere]`}>{feature.status} · {feature.detail}</div></div>)}</div>
  <pre className="max-w-full overflow-x-auto rounded border border-border p-3 text-xs">{JSON.stringify({metrics:report.metrics,hands:report.hands,hitFound:report.hitFound,planes:report.planes,meshTriangles:report.meshTriangles,depth:report.depth},null,2)}</pre>
  {report.errors.length>0&&<section aria-label="Probe failures" className="space-y-2 text-destructive [overflow-wrap:anywhere]">{report.errors.map((error,i)=><p key={i}>{error.feature}: {error.message}</p>)}</section>}
  {exportText&&<label className="block space-y-2"><span>Report text (select manually if copying is blocked)</span><textarea aria-label="Diagnostic report" readOnly value={exportText} rows={12} className="w-full min-w-0 border border-border bg-card p-3 font-mono text-xs"/></label>}
  <section className="space-y-2"><h2 className="font-display text-xl">Quest 3 test</h2><ol className="list-decimal space-y-2 pl-5"><li>Open this published HTTPS page in Quest Browser. Record headset and browser version.</li><li>Probe VR. Move both hands, pinch your right hand, point at surfaces. Use the in-headset buttons to create a visible anchor. End probe and copy report.</li><li>Reload, Probe VR again and Restore anchor. Confirm whether the marker returns to the same physical location. Copy this second report.</li><li>End and repeat separately with Probe passthrough. If unavailable or refused, keep that result; do not infer support.</li><li>Paste all reports plus room lighting, observed marker alignment, lost tracking/permission errors and whether the app was installed.</li></ol><p className="text-sm text-muted-foreground">Persistent-handle creation is not proof of restoration. Labels are browser-provided; unidentified planes stay unclassified. The studio now uses spatial fallbacks, reviewed re-alignment, hand assistance and adaptive quality; this page probes capabilities separately.</p></section></PublicPage>;
}
