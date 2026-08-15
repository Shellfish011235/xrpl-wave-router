import type {
  JobRequest,
  ProviderExecution,
  ProviderOffer,
} from "../types/domain.js";

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: { message?: string };
}

function extractOutputText(response: OpenAIResponse): string {
  if (response.output_text?.trim()) return response.output_text.trim();

  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("The AI provider returned no text output.");
  return text;
}

export async function executeProvider(
  provider: ProviderOffer,
  request: JobRequest,
): Promise<ProviderExecution> {
  const startedAt = Date.now();
  const prompt = request.prompt?.trim();

  if (!prompt) throw new Error("A task prompt is required.");

  if (provider.provider === "openai" && process.env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        input: prompt,
        max_output_tokens: 700,
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Provider request failed (${response.status}).`);
    }

    return {
      output: extractOutputText(payload),
      executionMode: "live",
      model: provider.model,
      durationMs: Date.now() - startedAt,
      inputTokens: payload.usage?.input_tokens,
      outputTokens: payload.usage?.output_tokens,
    };
  }

  await new Promise((resolve) =>
    setTimeout(resolve, Math.min(provider.latencyMs, 500)),
  );

  return {
    output: `[DEMO MODE — add OPENAI_API_KEY to .env for live execution]\n\nWave Router selected ${provider.id} (${provider.model}) for this request:\n\n${prompt}`,
    executionMode: "demo",
    model: provider.model,
    durationMs: Date.now() - startedAt,
  };
}
