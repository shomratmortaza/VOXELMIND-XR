import {it,expect} from "vitest";
import {blankScene} from "./planner";
import {encodeSharedScene,decodeSharedScene} from "./share";
it("share excludes prompt, photo paths and physical alignment",()=>{const scene=blankScene();scene.prompt="private request";scene.alignment=[];const shared=decodeSharedScene(encodeSharedScene(scene));expect(shared?.prompt).toBe("");expect(shared?.reference).toBeUndefined();expect(shared?.alignment).toBeUndefined();expect(shared?.objects).toEqual(scene.objects);});
it("rejects invalid shared payloads",()=>{expect(decodeSharedScene("junk")).toBeNull();});
