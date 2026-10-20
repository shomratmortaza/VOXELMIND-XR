import { describe, expect, it } from "vitest";
import { forgetRequest, isConnectionError, readInterruptedRequest, rememberRequest } from "./interrupted-request";

function memory() {
  const values = new Map<string, string>();
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
}

describe("interrupted AI request", () => {
  it("keeps the full description for 30 minutes, then drops it", () => {
    const storage = memory();
    const long = "Build a duplex. ".repeat(500);
    rememberRequest(long, storage, 1_000);
    expect(readInterruptedRequest(storage, 1_000 + 30 * 60 * 1000)?.text).toBe(long);
    expect(readInterruptedRequest(storage, 1_001 + 30 * 60 * 1000)).toBeNull();
  });
  it("is cleared once the request finishes", () => {
    const storage = memory();
    rememberRequest("desk", storage, 1);
    forgetRequest(storage);
    expect(readInterruptedRequest(storage, 2)).toBeNull();
  });
  it("treats dropped connections as resumable but not Stop or AI errors", () => {
    expect(isConnectionError(new TypeError("Load failed"))).toBe(true);
    expect(isConnectionError(new TypeError("Failed to fetch"))).toBe(true);
    const stop = new Error("aborted"); stop.name = "AbortError";
    expect(isConnectionError(stop)).toBe(false);
    expect(isConnectionError(new Error("Couldn't work out the changes."))).toBe(false);
  });
});
