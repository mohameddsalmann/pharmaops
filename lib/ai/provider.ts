export interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  providerName: string;
}

export function getProviderConfig(): ProviderConfig | null {
  const provider = process.env.AI_PROVIDER || "agentrouter";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const demoMode = process.env.DEMO_MODE === "true";

  let baseURL = "";
  let apiKey = "";
  let providerName = "";

  switch (provider) {
    case "agentrouter":
      baseURL = process.env.AI_BASE_URL || "https://agentrouter.org/v1";
      apiKey = process.env.AGENTROUTER_API_KEY || "";
      providerName = "agentrouter";
      break;
    case "openai":
      baseURL = "https://api.openai.com/v1";
      apiKey = process.env.OPENAI_API_KEY || "";
      providerName = "openai";
      break;
    case "groq":
      baseURL = "https://api.groq.com/openai/v1";
      apiKey = process.env.GROQ_API_KEY || "";
      providerName = "groq";
      break;
    case "openrouter":
      baseURL = "https://openrouter.ai/api/v1";
      apiKey = process.env.OPENROUTER_API_KEY || "";
      providerName = "openrouter";
      break;
    default:
      baseURL = process.env.AI_BASE_URL || "https://agentrouter.org/v1";
      apiKey = process.env.AGENTROUTER_API_KEY || "";
      providerName = "agentrouter";
  }

  if (!apiKey) return null;
  if (demoMode && !apiKey) return null;

  return { baseURL, apiKey, model, providerName };
}

export function isAIAvailable(): boolean {
  return getProviderConfig() !== null;
}
