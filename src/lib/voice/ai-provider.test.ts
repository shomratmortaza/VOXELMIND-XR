import { describe, expect, it } from "vitest";
import { resolveAiProvider } from "./ai-provider.server";
describe("resolveAiProvider", () => {
  it("prefers the free Groq key", () => expect(resolveAiProvider({ GROQ_API_KEY: "g", LOVABLE_API_KEY: "l" })?.name).toBe("groq"));
  it("falls back to Lovable", () => expect(resolveAiProvider({ LOVABLE_API_KEY: "l" })?.name).toBe("lovable"));
  it("returns null without keys", () => expect(resolveAiProvider({})).toBeNull());
});
