import { NextRequest, NextResponse } from "next/server";
import { verifyIngestAuth } from "@/lib/botops/middleware";
import { addArtifact } from "@/lib/botops/ingestion-services";
import { z } from "zod";

const artifactUploadSchema = z.object({
  artifactType: z.enum([
    "screenshot",
    "json_snapshot",
    "error_trace",
    "ocr_output",
    "structured_log",
  ]),
  filename: z.string(),
  mimeType: z.string(),
  base64Payload: z.string(),
  sha256: z.string(),
  redacted: z.literal(true), // Strictly enforce redacted: true (Correction #8)
  eventId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    // 1. Enforce HMAC Auth with raw request body (Correction #3)
    const auth = await verifyIngestAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 2. Parse from verified rawBody buffer
    const json = JSON.parse(auth.rawBody.toString("utf8"));
    const parsed = artifactUploadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;

    // 3. Call shared service
    const artifact = await addArtifact(runId, body);

    return NextResponse.json({ artifact });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
