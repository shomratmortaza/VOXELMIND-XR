import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 12 * 1024 * 1024;
import { NO_AI_KEY_MESSAGE, resolveAiProvider } from "@/lib/voice/ai-provider.server";

export const Route = createFileRoute("/api/voice/transcribe")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ai = resolveAiProvider(process.env);
        if (!ai) return Response.json({ error: NO_AI_KEY_MESSAGE }, { status: 500 });

        const len = Number(request.headers.get("content-length") ?? "0");
        if (len > MAX_BYTES) return Response.json({ error: "Recording is too long. Keep it under a minute." }, { status: 413 });

        let file: File | null = null;
        try {
          const form = await request.formData();
          const f = form.get("file");
          file = f instanceof File ? f : null;
        } catch {
          return Response.json({ error: "Could not read the recording." }, { status: 400 });
        }
        if (!file || !file.size || file.size > MAX_BYTES || !file.type.startsWith("audio/"))
          return Response.json({ error: "Please record again — no usable audio was received." }, { status: 400 });

        const form = new FormData();
        form.append("model", ai.transcribeModel);
        form.append("file", file, file.name || "recording.wav");
        form.append("response_format", "json");
        if (ai.streamTranscription) form.append("stream", "true");
        form.append(
          "prompt",
          "A space designer giving furniture layout instructions: move, rotate, resize, metres, degrees, table, chair, desk, counter, sofa, wall.",
        );

        const upstream = await fetch(`${ai.baseURL}/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${ai.apiKey}`, ...(ai.name === "lovable" ? { "X-Lovable-AIG-SDK": "fetch" } : {}) },
          body: form,
          signal: request.signal,
        });

        if (!upstream.ok) {
          const body = await upstream.text();
          let message = "Transcription failed.";
          try { message = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? message; } catch { /* keep default */ }
          if (upstream.status === 402) message = "AI credits are used up. Add credits in Settings → Plans & credits.";
          if (upstream.status === 429) message = "Too many requests right now. Wait a moment and try again.";
          return Response.json({ error: message }, { status: upstream.status });
        }

        if (!ai.streamTranscription) {
          const data = (await upstream.json()) as { text?: string };
          const event = `data: ${JSON.stringify({ type: "transcript.text.done", text: data.text ?? "" })}\n\n`;
          return new Response(event, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
        }

        const headers = new Headers({
          "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
        });
        upstream.headers.forEach((v, k) => { if (k.toLowerCase().startsWith("x-lovable-aig-")) headers.set(k, v); });
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
