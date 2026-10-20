import {it,expect} from "vitest";
import {performanceReport} from "./xr-performance";
it("keeps unmeasured production timing null and never labels device evidence",()=>{
  const report=performanceReport({quality:"full",fps:null,minimum:null,frameTime:null,calls:0,triangles:0,textureBytes:0});
  expect(report.fps).toBeNull();expect(report.deviceVerified).toBe(false);
});