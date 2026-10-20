import type {Quality} from "./xr-input";
export type PerformanceSnapshot={quality:Quality;fps:number|null;minimum:number|null;frameTime:number|null;calls:number;triangles:number;textureBytes:number};
export function performanceReport(sample:PerformanceSnapshot){
  const {quality,fps,minimum,frameTime,calls,triangles,textureBytes}=sample;
  return {timestamp:new Date().toISOString(),deviceVerified:false,scope:"Production studio app frames; not compositor, GPU or thermal measurements",quality,fps,minimum,frameTime,calls,triangles,textureBytes};
}
export function performanceReportText(sample:PerformanceSnapshot){return JSON.stringify(performanceReport(sample),null,2);}