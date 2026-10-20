import {it,expect} from "vitest";
import {tabletopScale,roomContext} from "./spatial-design";
import {blankScene} from "./scene/planner";
it("defaults miniature to 1.2 metres and fits a confirmed smaller table",()=>{
  const scene=blankScene();scene.size={width:12,depth:12};expect(tabletopScale(scene)).toBeCloseTo(0.1);
  expect(tabletopScale(scene,{id:"desk",kind:"table",position:[0,0.7,0],yaw:0,width:0.8,depth:0.7,confidence:0})).toBeCloseTo(0.58/12);
});
it("never sends unconfirmed or virtual room geometry to AI",()=>{
  const room={mode:"virtual" as const,tracking:false,floorHeight:0,bounds:null,confidence:0,surfaces:[],guidance:""};
  expect(roomContext(room,true)).toBeNull();expect(roomContext({...room,mode:"manual"},false)).toBeNull();
});