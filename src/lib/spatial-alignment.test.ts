import {it,expect} from "vitest";
import {readAlignment,saveAlignment} from "./spatial-alignment";
import {spatialProvider} from "./spatial-provider";
import {createObject} from "./scene/planner";
it("saves owner-world-relative positions without browser anchor handles and rejects corrupt values",()=>{
  spatialProvider.setManual({id:"manual",kind:"floor",position:[0,1,0],yaw:0,width:4,depth:4,confidence:0});
  expect(saveAlignment(localStorage,"world-a",[createObject("chair",[1,1.4,0])],"manual").ok).toBe(true);
  expect(readAlignment(localStorage,"world-a")?.[0]?.offset[1]).toBeCloseTo(0.4);
  expect(readAlignment(localStorage,"world-b")).toBeNull();
  localStorage.setItem("voxelmind.surface-alignment.world-a",JSON.stringify([{objectId:"a",surfaceId:"manual",surfaceKind:"floor",offset:[0,null,0],yaw:0}]));
  expect(readAlignment(localStorage,"world-a")).toBeNull();
  spatialProvider.setManual(null);
});