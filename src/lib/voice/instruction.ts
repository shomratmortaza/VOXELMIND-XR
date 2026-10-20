import { z } from "zod";

export const MAX_INSTRUCTION_LENGTH = 20_000;
export const InstructionSchema = z.string().trim()
  .min(1, "Enter a description or an edit instruction.")
  .max(MAX_INSTRUCTION_LENGTH, "Your description is longer than 20,000 characters. Split it into separate reviewed requests; nothing has been shortened.");

export const ProposalRequestSchema = z.object({
  instruction: InstructionSchema,
  image: z.string().max(5_000_000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/).optional(),
  scene: z.object({ parts: z.array(z.any()).max(600, "This scene has more than 600 parts. Use a smaller scene for AI editing.") }).passthrough(),
});