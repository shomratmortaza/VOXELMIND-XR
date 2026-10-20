import { describe, expect, it, vi } from "vitest";
import { isModuleLoadError, recoverModuleLoad } from "./module-recovery";

describe("failed module recovery", () => {
  it("recognizes Safari, Firefox and Chromium import failures, not scene errors", () => {
    for (const message of ["Importing a module script failed.", "Failed to fetch dynamically imported module: /assets/studio.js", "error loading dynamically imported module: /studio", "Loading chunk 12 failed."]) {
      expect(isModuleLoadError(new TypeError(message))).toBe(true);
    }
    expect(isModuleLoadError(new Error("WebGL context lost"))).toBe(false);
  });
  it("preserves work before reloading and retries only once for the same URL within 30 seconds", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const order: string[] = [];
    const preserve = vi.fn(() => { order.push("preserve"); return true; });
    const reload = vi.fn(() => { order.push("reload"); });
    expect(recoverModuleLoad(storage, "/studio", preserve, reload, 1_000)).toBe(true);
    expect(order).toEqual(["preserve", "reload"]);
    expect(recoverModuleLoad(storage, "/studio", preserve, reload, 30_999)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("recovers again from a later network drop in the same tab", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const reload = vi.fn();
    expect(recoverModuleLoad(storage, "/studio", () => true, reload, 1_000)).toBe(true);
    expect(recoverModuleLoad(storage, "/studio", () => true, reload, 31_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
  it("treats an old marker without a time as expired", () => {
    const storage = { getItem: () => "/studio", setItem: vi.fn() };
    const reload = vi.fn();
    expect(recoverModuleLoad(storage, "/studio", () => true, reload, 5_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("does not reload when work cannot be preserved or storage is blocked", () => {
    const reload = vi.fn();
    const storage = { getItem: () => null, setItem: vi.fn() };
    expect(recoverModuleLoad(storage, "/studio", () => false, reload)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(recoverModuleLoad({ ...storage, getItem: () => { throw new Error("blocked"); } }, "/studio", () => true, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});