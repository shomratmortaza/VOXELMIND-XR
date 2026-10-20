import { describe, expect, it } from "vitest";
import { BOOT_RECOVERY_SCRIPT } from "./boot-recovery";

describe("boot recovery script", () => {
  it("is fixed text so server and browser render the same script", () => {
    expect(BOOT_RECOVERY_SCRIPT).toContain("(function(cooldownMs, flag)");
    expect(BOOT_RECOVERY_SCRIPT).toContain('(30000, "__voxelmindBooted")');
  });

  it("is valid JavaScript", () => {
    expect(() => new Function(BOOT_RECOVERY_SCRIPT)).not.toThrow();
  });

  it("keeps retry and reload allowances separate", () => {
    expect(BOOT_RECOVERY_SCRIPT).toContain('allow("voxelmind.module-retry")');
    expect(BOOT_RECOVERY_SCRIPT).toContain('allow("voxelmind.boot-reload")');
  });
});
