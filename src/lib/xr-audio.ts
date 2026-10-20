import {useXRSettings} from "./xr-settings";
export type SpatialCue="select"|"grab"|"snap"|"apply";
let context:AudioContext|undefined;
export function playSpatialCue(cue:SpatialCue,position?:[number,number,number]){
  window.dispatchEvent(new CustomEvent("studio-cue",{detail:cue}));
  if(useXRSettings.getState().muted)return;
  try{
    context??=new AudioContext();void context.resume().catch(()=>{/* Optional audio must not create an unhandled rejection. */});
    const oscillator=context.createOscillator(),gain=context.createGain(),panner=context.createPanner();
    const now=context.currentTime;oscillator.type="sine";oscillator.frequency.setValueAtTime({select:440,grab:330,snap:660,apply:880}[cue],now);
    gain.gain.setValueAtTime(0.025,now);gain.gain.exponentialRampToValueAtTime(0.0001,now+0.12);panner.panningModel="HRTF";panner.distanceModel="inverse";
    const p=position??[0,0,-0.5];panner.positionX.value=p[0];panner.positionY.value=p[1];panner.positionZ.value=p[2];
    oscillator.connect(gain);gain.connect(panner);panner.connect(context.destination);oscillator.start();oscillator.stop(now+0.13);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();panner.disconnect();};
  }catch{/* Audio permission never blocks editing. */}
}/** Short, quiet tick for virtual keyboard keys; no caption event. */
export function playKeyClick(){
  if(useXRSettings.getState().muted)return;
  try{
    context??=new AudioContext();void context.resume().catch(()=>{/* optional */});
    const o=context.createOscillator(),g=context.createGain(),now=context.currentTime;
    o.type="square";o.frequency.setValueAtTime(1400,now);g.gain.setValueAtTime(0.012,now);g.gain.exponentialRampToValueAtTime(0.0001,now+0.03);
    o.connect(g);g.connect(context.destination);o.start();o.stop(now+0.035);o.onended=()=>{o.disconnect();g.disconnect();};
  }catch{/* Audio never blocks typing. */}
}
