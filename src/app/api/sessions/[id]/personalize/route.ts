import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { leads: { where: { pipelineStage: "qualified" } } }
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.leads.length === 0) {
      // If no qualified leads, just set to reviewing and return
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "reviewing" }
      });
      return NextResponse.json({ success: true, count: 0 });
    }

    // Update status to personalizing
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "personalizing" }
    });

    // Run bulk personalization in background (or resolve synchronously here for simplicity in SQLite dev context)
    // We'll execute it synchronously to make sure it finishes before return. Since it's local sqlite, it's fast.
    const apiOrigin = request.nextUrl.origin;
    
    const personalizationPromises = session.leads.map(lead =>
      fetch(`${apiOrigin}/api/leads/${lead.id}/personalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: session.templateId })
      }).catch(err => console.error(`Background personalization failed for lead ${lead.id}:`, err))
    );

    await Promise.all(personalizationPromises);

    // Update status to reviewing
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "reviewing" }
    });

    return NextResponse.json({ success: true, count: session.leads.length });
  } catch (error) {
    console.error("Bulk personalize API error:", error);
    return NextResponse.json({ error: "Bulk personalization failed" }, { status: 500 });
  }
}
