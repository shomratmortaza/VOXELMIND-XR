type Recognition={continuous:boolean;interimResults:boolean;lang:string;onresult:((event:{results:ArrayLike<{0:{transcript:string}}>;resultIndex:number})=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type Constructor=new()=>Recognition;
export function browserRecognition():Constructor|undefined{const w=window as unknown as {SpeechRecognition?:Constructor;webkitSpeechRecognition?:Constructor};return w.SpeechRecognition??w.webkitSpeechRecognition;}
export async function recordBrowserSpeech():Promise<{stop:()=>Promise<string>;cancel:()=>void}>{
 const C=browserRecognition();if(!C)throw new Error("Browser speech recognition unavailable");const r=new C();r.continuous=true;r.interimResults=true;r.lang=navigator.language||"en-US";let text="",failure:string|null=null,done=false,finish:(()=>void)|undefined;const ended=new Promise<void>(resolve=>{finish=resolve;});
 r.onresult=e=>{text="";for(let i=0;i<e.results.length;i++)text+=e.results[i]?.[0]?.transcript??"";};r.onerror=e=>{failure=e.error;};r.onend=()=>{done=true;finish?.();};r.start();
 return {async stop(){if(!done)r.stop();await ended;if(failure)throw new Error(`Speech recognition failed: ${failure}. Choose recorded audio instead.`);if(!text.trim())throw new Error("No speech heard. Choose recorded audio or quick commands.");return text.trim();},cancel(){r.onresult=null;r.onerror=null;r.abort();finish?.();}};
}
