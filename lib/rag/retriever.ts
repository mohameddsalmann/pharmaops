import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface KnowledgeDoc {
  filename: string;
  title: string;
  content: string;
}

export interface RetrievedSnippet {
  sourceTitle: string;
  sourceType: string;
  snippet: string;
  relevanceScore: number;
}

const KB_DIR = join(process.cwd(), "data", "knowledge-base");

const titleMap: Record<string, string> = {
  "prescription-intake-sop.md": "Pharmacy SOP: Prescription Intake Policy",
  "patient-identity-verification.md": "Pharmacy SOP: Patient Identity Verification",
  "insurance-prior-auth-rules.md": "Insurance Rule: Prior Authorization Criteria",
  "medication-safety-review-rules.md": "Safety Rule: High-Risk Medication Review",
  "patient-communication-policy.md": "Communication Policy: Patient Messaging Rules",
};

let cachedDocs: KnowledgeDoc[] | null = null;

export function loadKnowledgeBase(): KnowledgeDoc[] {
  if (cachedDocs) return cachedDocs;
  try {
    const files = readdirSync(KB_DIR).filter((f) => f.endsWith(".md"));
    cachedDocs = files.map((filename) => {
      const content = readFileSync(join(KB_DIR, filename), "utf-8");
      return {
        filename,
        title: titleMap[filename] ?? filename.replace(/-/g, " ").replace(/\.md$/, ""),
        content,
      };
    });
  } catch {
    cachedDocs = [];
  }
  return cachedDocs;
}

export function retrieveEvidence(
  keywords: string[],
  _agentName: string
): RetrievedSnippet[] {
  const docs = loadKnowledgeBase();
  const results: RetrievedSnippet[] = [];

  for (const doc of docs) {
    const lines = doc.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      let score = 0;
      for (const kw of keywords) {
        if (trimmed.toLowerCase().includes(kw.toLowerCase())) {
          score += 1;
        }
      }
      if (score > 0) {
        results.push({
          sourceTitle: doc.title,
          sourceType: doc.filename.replace(/\.md$/, ""),
          snippet: trimmed,
          relevanceScore: Math.min(score / keywords.length, 1.0),
        });
      }
    }
  }

  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}

export function listKnowledgeDocs(): { filename: string; title: string; content: string }[] {
  return loadKnowledgeBase().map((d) => ({
    filename: d.filename,
    title: d.title,
    content: d.content,
  }));
}
