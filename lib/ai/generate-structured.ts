import { z } from "zod";
import { getProviderConfig } from "./provider";

export interface GenerateStructuredParams {
  schema: z.ZodType;
  system: string;
  prompt: string;
  timeoutMs?: number;
}

export interface GenerateStructuredResult<T> {
  data: T;
  provider: string;
  model: string;
  latencyMs: number;
}

export class LLMError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "LLMError";
  }
}

export async function generateStructured<T>(
  params: GenerateStructuredParams
): Promise<GenerateStructuredResult<T>> {
  const config = getProviderConfig();
  if (!config) {
    throw new LLMError("No AI provider configured");
  }

  const timeout = params.timeoutMs ?? 15000;
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.prompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      throw new LLMError(`LLM API returned ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new LLMError("LLM returned empty content");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new LLMError("LLM returned invalid JSON");
    }

    const validated = params.schema.safeParse(parsed);
    if (!validated.success) {
      throw new LLMError(`LLM output failed Zod validation: ${validated.error.message}`);
    }

    const latencyMs = Date.now() - startTime;

    return {
      data: validated.data as T,
      provider: config.providerName,
      model: config.model,
      latencyMs,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof LLMError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new LLMError(`LLM request timed out after ${timeout}ms`);
    }
    throw new LLMError(`LLM request failed: ${err instanceof Error ? err.message : String(err)}`, err);
  }
}
