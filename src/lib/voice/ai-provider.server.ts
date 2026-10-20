/**
 * Picks the AI provider from server environment variables, in this order:
 *  1. GROQ_API_KEY   — free tier at console.groq.com (chat + Whisper voice)
 *  2. OPENAI_API_KEY — direct OpenAI
 *  3. LOVABLE_API_KEY — Lovable AI Gateway (used by the hosted app)
 * Read only inside request handlers.
 */
export type AiProvider = {
  name: "groq" | "openai" | "lovable";
  baseURL: string;
  apiKey: string;
  chatModel: string;
  transcribeModel: string;
  /** Lovable/OpenAI support the Responses API and streamed transcription; Groq uses chat completions. */
  responses: boolean;
  streamTranscription: boolean;
  headers: Record<string, string>;
};

export function resolveAiProvider(env: Record<string, string | undefined> = process.env): AiProvider | null {
  const groq = env["GROQ_API_KEY"];
  if (groq) return {
    name: "groq", baseURL: "https://api.groq.com/openai/v1", apiKey: groq,
    chatModel: env["GROQ_MODEL"] || "openai/gpt-oss-120b",
    transcribeModel: "whisper-large-v3-turbo",
    responses: false, streamTranscription: false, headers: {},
  };
  const openai = env["OPENAI_API_KEY"];
  if (openai) return {
    name: "openai", baseURL: "https://api.openai.com/v1", apiKey: openai,
    chatModel: env["OPENAI_MODEL"] || "gpt-4.1-mini",
    transcribeModel: "gpt-4o-mini-transcribe",
    responses: false, streamTranscription: true, headers: {},
  };
  const lovable = env["LOVABLE_API_KEY"];
  if (lovable) return {
    name: "lovable", baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: lovable,
    chatModel: "openai/gpt-6-astra", transcribeModel: "openai/gpt-transcribe",
    responses: true, streamTranscription: true,
    headers: { "Lovable-API-Key": lovable, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  };
  return null;
}

export const NO_AI_KEY_MESSAGE = "AI is not set up. Add a free GROQ_API_KEY (console.groq.com) to your .env file and restart.";
