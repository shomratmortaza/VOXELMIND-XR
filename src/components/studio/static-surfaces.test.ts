import {describe,it,expect} from "vitest";
import {canBatchSurface} from "./static-surfaces";
import {createObject} from "@/lib/scene/planner";
describe("locked architectural batching",()=>{
  it("never batches editable, selected, glass or colliding parts",()=>{
    const wall=createObject("wall",[0,1,0],{locked:true,material:"plaster"});
    expect(canBatchSurface(wall,null,false,true)).toBe(true);
    expect(canBatchSurface({...wall,locked:false},null,false,true)).toBe(false);
    expect(canBatchSurface(wall,wall.id,false,true)).toBe(false);
    expect(canBatchSurface({...wall,material:"glass"},null,false,true)).toBe(false);
    expect(canBatchSurface(wall,null,true,true)).toBe(false);
  });
});