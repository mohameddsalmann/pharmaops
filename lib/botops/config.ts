export interface BotOpsConfig {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceRoleKey: string | null;
  upstashVectorUrl: string | null;
  upstashVectorToken: string | null;
  upstashRedisUrl: string | null;
  upstashRedisToken: string | null;
  embeddingApiKey: string | null;
  embeddingBaseUrl: string | null;
  embeddingModel: string | null;
  aiProvider: string | null;
  aiApiKey: string | null;
  aiModel: string | null;
  aiBaseUrl: string | null;
}

export function getBotOpsConfig(): BotOpsConfig {
  return {
    supabaseUrl:
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      null,
    supabaseAnonKey:
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      null,
    supabaseServiceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    upstashVectorUrl:
      process.env.UPSTASH_VECTOR_REST_URL || null,
    upstashVectorToken:
      process.env.UPSTASH_VECTOR_REST_TOKEN || null,
    upstashRedisUrl:
      process.env.UPSTASH_REDIS_REST_URL || null,
    upstashRedisToken:
      process.env.UPSTASH_REDIS_REST_TOKEN || null,
    embeddingApiKey: process.env.EMBEDDING_API_KEY || null,
    embeddingBaseUrl:
      process.env.EMBEDDING_BASE_URL || null,
    embeddingModel: process.env.EMBEDDING_MODEL || null,
    aiProvider: process.env.AI_PROVIDER || null,
    aiApiKey:
      process.env.AGENTROUTER_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      null,
    aiModel: process.env.AI_MODEL || null,
    aiBaseUrl: process.env.AI_BASE_URL || null,
  };
}

export function isSupabaseConfigured(cfg: BotOpsConfig): boolean {
  return !!(cfg.supabaseUrl && (cfg.supabaseServiceRoleKey || cfg.supabaseAnonKey));
}

export function isVectorConfigured(cfg: BotOpsConfig): boolean {
  return !!(cfg.upstashVectorUrl && cfg.upstashVectorToken);
}

export function isEmbeddingConfigured(cfg: BotOpsConfig): boolean {
  return !!(cfg.embeddingApiKey && cfg.embeddingBaseUrl && cfg.embeddingModel);
}

export function isLlmConfigured(cfg: BotOpsConfig): boolean {
  return !!(cfg.aiApiKey && cfg.aiBaseUrl);
}
