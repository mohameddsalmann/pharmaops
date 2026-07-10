import { NextRequest, NextResponse } from "next/server";
import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { getBotOpsConfig, isVectorConfigured, isEmbeddingConfigured } from "@/lib/botops/config";

export async function GET(req: NextRequest) {
  try {
    const store = await getSeededBotOpsStore();
    const params = req.nextUrl.searchParams;
    const query = params.get("q") ?? "";

    if (!query) {
      return NextResponse.json({ results: [], usedVector: false });
    }

    const cfg = getBotOpsConfig();
    if (isVectorConfigured(cfg) && isEmbeddingConfigured(cfg)) {
      try {
        const results = await vectorSearch(query, cfg);
        return NextResponse.json({ results, usedVector: true });
      } catch {
        // fall through to text search
      }
    }

    const allRuns = await store.listRuns();
    const lower = query.toLowerCase();
    const results = allRuns
      .filter(
        (r) =>
          r.runNumber.toLowerCase().includes(lower) ||
          r.pharmacyName.toLowerCase().includes(lower) ||
          r.finalOutcome.toLowerCase().includes(lower) ||
          r.workflowType.toLowerCase().includes(lower) ||
          r.pmsType.toLowerCase().includes(lower)
      )
      .slice(0, 20);

    return NextResponse.json({ results, usedVector: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function vectorSearch(
  query: string,
  cfg: ReturnType<typeof getBotOpsConfig>
): Promise<Array<{ id: string; score: number }>> {
  const embeddingResponse = await fetch(
    `${cfg.embeddingBaseUrl}/models/${cfg.embeddingModel}:embedContent?key=${cfg.embeddingApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: query }] },
      }),
    }
  );

  if (!embeddingResponse.ok) {
    throw new Error(`Embedding API error: ${embeddingResponse.status}`);
  }

  const embeddingData = await embeddingResponse.json();
  const embedding = embeddingData?.embedding?.values;

  if (!embedding) {
    throw new Error("No embedding returned");
  }

  const vectorResponse = await fetch(`${cfg.upstashVectorUrl}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.upstashVectorToken}`,
    },
    body: JSON.stringify({
      vector: embedding,
      topK: 20,
      includeVectors: false,
    }),
  });

  if (!vectorResponse.ok) {
    throw new Error(`Vector search API error: ${vectorResponse.status}`);
  }

  const vectorData = await vectorResponse.json();
  const results = (vectorData?.results ?? []).map(
    (r: { id: string; score: number }) => ({
      id: r.id,
      score: r.score,
    })
  );

  return results;
}
