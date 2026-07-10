import { describe, it, expect } from "vitest";
import { retrieveEvidence, loadKnowledgeBase } from "@/lib/rag/retriever";

describe("loadKnowledgeBase", () => {
  it("loads knowledge base documents", () => {
    const docs = loadKnowledgeBase();
    expect(docs.length).toBeGreaterThan(0);
    for (const doc of docs) {
      expect(doc.filename).toBeTruthy();
      expect(doc.title).toBeTruthy();
      expect(doc.content).toBeTruthy();
    }
  });
});

describe("retrieveEvidence", () => {
  it("returns relevant snippets for matching keywords", () => {
    const results = retrieveEvidence(["prior", "authorization"], "test-agent");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sourceTitle).toBeTruthy();
    expect(results[0].snippet).toBeTruthy();
    expect(results[0].relevanceScore).toBeGreaterThan(0);
  });

  it("returns empty array for non-matching keywords", () => {
    const results = retrieveEvidence(["zzznonexistentkeywordzzz"], "test-agent");
    expect(results).toHaveLength(0);
  });

  it("limits results to 5", () => {
    const results = retrieveEvidence(["the", "and", "for", "to", "patient"], "test-agent");
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("sorts by relevance score descending", () => {
    const results = retrieveEvidence(["medication", "safety", "review"], "test-agent");
    for (let i = 1; i < results.length; i++) {
      expect(results[i].relevanceScore).toBeLessThanOrEqual(results[i - 1].relevanceScore);
    }
  });
});
