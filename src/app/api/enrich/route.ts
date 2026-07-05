import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processQueue } from "../../../../scripts/enrichment-worker";

export async function GET(request: NextRequest) {
  try {
    const total = await prisma.lead.count({
      where: { source: "seed" }
    });
    const enriched = await prisma.lead.count({
      where: { source: "seed", pipelineStage: "qualified" }
    });
    const pending = await prisma.lead.count({
      where: { source: "seed", pipelineStage: "generated" }
    });
    const failed = await prisma.lead.count({
      where: { source: "seed", pipelineStage: "failed" }
    });

    return NextResponse.json({
      total,
      enriched,
      pending,
      failed
    });
  } catch (error: any) {
    console.error("Enrichment stats error:", error);
    return NextResponse.json({ error: "Failed to fetch enrichment stats" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const concurrency = parseInt(body.concurrency || "20", 10);

    // Trigger processQueue in the background (non-blocking)
    processQueue(concurrency)
      .then(() => console.log("Background crawler queue finished execution."))
      .catch((e) => console.error("Background crawler error:", e));

    return NextResponse.json({
      message: "Enrichment worker queue processing started in background.",
      concurrency
    });
  } catch (error: any) {
    console.error("Enrichment trigger error:", error);
    return NextResponse.json({ error: "Failed to start enrichment queue" }, { status: 500 });
  }
}
