import { expect, it } from "vitest";
import { InstructionSchema, ProposalRequestSchema } from "./instruction";

it("accepts complete multi-paragraph descriptions beyond the old limit", () => {
  const instruction = "A house with measured rooms.\n".repeat(150) + "Finally add a walnut dining table.";
  expect(ProposalRequestSchema.parse({ instruction, scene: { parts: [] } }).instruction).toBe(instruction);
});
it("rejects oversized input explicitly without truncation", () => {
  expect(InstructionSchema.safeParse("a".repeat(20_000)).success).toBe(true);
  expect(InstructionSchema.safeParse("a".repeat(20_001)).success).toBe(false);
});