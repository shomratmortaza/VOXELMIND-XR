import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { entryScale } from "./xr-session";

describe("VR entry", () => {
  it("opens VR at real-world size", () => { expect(entryScale("immersive-vr")).toBe("life"); });
  it("keeps AR on the tabletop", () => { expect(entryScale("immersive-ar")).toBe("table"); });
  it("bundles every controller and hand model the headset loader asks for", () => {
    const root = join(process.cwd(), "public/hands");
    const list = JSON.parse(readFileSync(join(root, "profilesList.json"), "utf8")) as Record<string, { path: string }>;
    for (const id of ["meta-quest-touch-plus", "oculus-touch-v3", "generic-trigger", "generic-hand"]) expect(list[id]).toBeDefined();
    for (const { path } of Object.values(list)) {
      const profile = JSON.parse(readFileSync(join(root, path), "utf8")) as { layouts: Record<string, { assetPath?: string }> };
      for (const layout of Object.values(profile.layouts)) if (layout.assetPath) expect(existsSync(join(root, path, "..", layout.assetPath))).toBe(true);
    }
  });
});
