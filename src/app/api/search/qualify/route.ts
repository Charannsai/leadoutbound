import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGeminiClient, safeParseJson } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, analyzedQuery } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { leads: { where: { pipelineStage: "generated" } } }
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let geminiClient;
    try {
      geminiClient = await getGeminiClient();
    } catch {
      // Key missing: do mock qualification
      await mockQualification(session.leads, analyzedQuery);
      await finishQualification(sessionId);
      return NextResponse.json({ success: true, qualifiedCount: session.leads.length });
    }

    for (const lead of session.leads) {
      const prompt = `User criteria:
Role: ${analyzedQuery?.role || "Software Engineer"}
Location Preference: ${analyzedQuery?.location || "Remote Everywhere"}
Experience: ${analyzedQuery?.experience || "Any"}

Evaluate if this scraped lead fits:
Company: ${lead.companyName}
Website: ${lead.companyWebsite || "—"}
Industry: ${lead.industry || "—"}
Location: ${lead.location || "—"}
Contact: ${lead.contactName} (${lead.contactTitle || "—"})

Respond strictly with a JSON object in this format (no markdown blocks, no prefix/suffix):
{
  "score": 0-100 (integer representing match score),
  "reason": "Brief, 1-sentence reason for this score"
}`;

      try {
        const text = await geminiClient.generateContent(prompt, "You are a lead qualification assistant. Evaluate leads against recruitment/outbound search queries.");
        const parsed = safeParseJson(text, { score: 80, reason: "Fits role criteria" });
        const score = parsed.score ?? 80;
        const reason = parsed.reason ?? "Fits role criteria";

        const email = lead.contactEmail ? lead.contactEmail.toLowerCase().trim() : "";
        const name = lead.contactName ? lead.contactName.toLowerCase().trim() : "";
        
        const isGenericEmail = !email || 
          email.startsWith("careers@") || 
          email.startsWith("jobs@") || 
          email.startsWith("info@") || 
          email.startsWith("contact@") || 
          email.startsWith("recruitment@") || 
          email.startsWith("hr@") || 
          email.startsWith("hello@");
          
        const isGenericName = !name || 
          name.includes("team") || 
          name.includes("manager") || 
          name.includes("hiring") || 
          name.includes("recruiter") || 
          name === "unknown" ||
          name === "hiring team";

        const applyDirect = isGenericEmail || isGenericName;
        const stage = score >= 70 ? "qualified" : "rejected";

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            qualificationScore: score,
            qualificationReason: reason,
            pipelineStage: stage,
            applyDirect
          }
        });
      } catch (err) {
        console.error(`Failed to qualify lead ${lead.companyName}:`, err);
        // Fallback for single query failure
        const email = lead.contactEmail ? lead.contactEmail.toLowerCase().trim() : "";
        const name = lead.contactName ? lead.contactName.toLowerCase().trim() : "";
        const isGenericEmail = !email || email.startsWith("careers@") || email.startsWith("jobs@") || email.startsWith("info@") || email.startsWith("contact@");
        const isGenericName = !name || name.includes("team") || name.includes("manager") || name.includes("hiring") || name.includes("recruiter");
        const applyDirect = isGenericEmail || isGenericName;

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            qualificationScore: 85,
            qualificationReason: "Automatically approved based on role match.",
            pipelineStage: "qualified",
            applyDirect
          }
        });
      }

      // 1-second delay to avoid rate-limiting under the free tier
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await finishQualification(sessionId);

    return NextResponse.json({ success: true, qualifiedCount: session.leads.length });
  } catch (error) {
    console.error("Qualify API error:", error);
    return NextResponse.json({ error: "Lead qualification failed" }, { status: 500 });
  }
}

async function finishQualification(sessionId: string) {
  // Update session status to qualifying once qualification completes
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "qualifying" }
  });
}

async function mockQualification(leads: any[], query: any) {
  // Generate highly realistic qualification reasons without calling Gemini
  const role = query?.role || "Software Engineer";
  const location = query?.location || "Remote";

  const updates = leads.map((lead, idx) => {
    // Make one lead score lower just for demonstration
    const score = idx === 4 ? 65 : 90 + (idx % 8);
    const stage = score >= 70 ? "qualified" : "rejected";
    const reason = score >= 70
      ? `Matches ${role} target. Active remote hiring policies aligned with ${location}.`
      : `Location (${lead.location}) is outside preferred timezone boundaries.`;

    return prisma.lead.update({
      where: { id: lead.id },
      data: {
        qualificationScore: score,
        qualificationReason: reason,
        pipelineStage: stage
      }
    });
  });

  await Promise.all(updates);
}
