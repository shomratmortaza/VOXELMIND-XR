import {it,expect} from "vitest";
import {safeSettings} from "./xr-settings";
it("keeps adjustable seated controls within reachable bounds",()=>{
  const s=safeSettings({height:99,distance:-2,textScale:8,handedness:"left"});
  expect(s.height).toBe(0.2);expect(s.distance).toBe(0.55);expect(s.textScale).toBe(1.5);expect(s.handedness).toBe("left");
});