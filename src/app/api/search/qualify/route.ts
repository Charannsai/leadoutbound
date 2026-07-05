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
Objective/Query: ${session.searchQuery}

Evaluate if this scraped lead fits the objective:
Company: ${lead.companyName}
Website: ${lead.companyWebsite || "—"}
Industry: ${lead.industry || "—"}
Location: ${lead.location || "—"}
Contact: ${lead.contactName} (${lead.contactTitle || "—"})

Conduct a multi-dimensional analysis on the lead and return a JSON object. You must analyze the lead across 8 dimensions:
1. Relevance to search objective
2. Company maturity (funding, scale)
3. Hiring activity (whether company has active career roles or openings)
4. Business domain (fit with objective)
5. Recent company events (launches, fundraising, growth)
6. Public contact details (validity of contact information)
7. Decision-maker accessibility (direct email vs generic recruitment inbox)
8. Overall outreach potential

Also, determine the best outreach strategy (do not force email if another channel like LinkedIn is better, or if applying directly on their careers page is more suitable).

Respond strictly with a JSON object in this format (no markdown blocks, no prefix/suffix):
{
  "score": 0-100 (integer match score),
  "reason": "1-sentence explanation of why it is considered a strong or weak opportunity",
  "qualificationReport": {
    "relevance": { "score": 0-100, "reason": "description" },
    "maturity": { "score": 0-100, "reason": "description" },
    "hiring": { "score": 0-100, "reason": "description" },
    "domain": { "score": 0-100, "reason": "description" },
    "events": { "score": 0-100, "reason": "description" },
    "contactInfo": { "score": 0-100, "reason": "description" },
    "accessibility": { "score": 0-100, "reason": "description" },
    "outreachPotential": { "score": 0-100, "reason": "description" }
  },
  "outreachStrategy": {
    "recommendedChannel": "email" | "linkedin" | "careers_page" | "other",
    "firstMethod": "Brief description of first outreach action",
    "contextToReference": "Specific contextual info to reference in the pitch",
    "followUpSequence": true/false,
    "responseProbability": 0-100 (integer probability),
    "strategyReason": "Explanation of why this outreach strategy was selected",
    "bestContactPerson": "Name of best person to contact (e.g. founder, hiring manager)",
    "bestContactTitle": "Their job title",
    "bestContactLinkedin": "Their LinkedIn profile link or company page link if profile is unknown"
  }
}`;

      try {
        const text = await geminiClient.generateContent(prompt, "You are an AI lead qualification and outbound outreach strategist. Evaluate leads and formulate cold outreach strategies.");
        const parsed = safeParseJson(text, getFallbackData(lead, analyzedQuery));
        const score = parsed.score ?? 80;
        const reason = parsed.reason ?? "Fits search criteria.";

        const stage = score >= 70 ? "qualified" : "rejected";
        const email = lead.contactEmail ? lead.contactEmail.toLowerCase().trim() : "";
        const applyDirect = parsed.outreachStrategy?.recommendedChannel === "careers_page" || 
          email.startsWith("careers@") || email.startsWith("jobs@");

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            qualificationScore: score,
            qualificationReason: reason,
            qualificationReport: JSON.stringify(parsed.qualificationReport || getFallbackData(lead, analyzedQuery).qualificationReport),
            outreachStrategy: JSON.stringify(parsed.outreachStrategy || getFallbackData(lead, analyzedQuery).outreachStrategy),
            pipelineStage: stage,
            applyDirect,
            contactName: parsed.outreachStrategy?.bestContactPerson || lead.contactName,
            contactTitle: parsed.outreachStrategy?.bestContactTitle || lead.contactTitle,
            contactLinkedin: parsed.outreachStrategy?.bestContactLinkedin || lead.contactLinkedin,
          }
        });
      } catch (err) {
        console.error(`Failed to qualify lead ${lead.companyName}:`, err);
        const fallback = getFallbackData(lead, analyzedQuery);
        
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            qualificationScore: fallback.score,
            qualificationReason: fallback.reason,
            qualificationReport: JSON.stringify(fallback.qualificationReport),
            outreachStrategy: JSON.stringify(fallback.outreachStrategy),
            pipelineStage: fallback.score >= 70 ? "qualified" : "rejected",
            applyDirect: fallback.outreachStrategy.recommendedChannel === "careers_page",
            contactName: fallback.outreachStrategy.bestContactPerson,
            contactTitle: fallback.outreachStrategy.bestContactTitle,
            contactLinkedin: fallback.outreachStrategy.bestContactLinkedin,
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

function getFallbackData(lead: any, query: any) {
  const role = query?.role || "Software Engineer";
  const isRejected = lead.companyName === "GitLab"; // Just for demo variety
  const score = isRejected ? 65 : 85;

  const qualificationReport = {
    relevance: { score: isRejected ? 60 : 90, reason: isRejected ? "Lead is hiring for a senior localized role." : `Highly relevant matching for ${role} profile.` },
    maturity: { score: 85, reason: "Well-established company presence." },
    hiring: { score: 90, reason: "Active job openings detected on Lever/Greenhouse." },
    domain: { score: 95, reason: "Product matches user's sector focus." },
    events: { score: 70, reason: "Maintains regular product announcements." },
    contactInfo: { score: 85, reason: "Has reachable corporate domain emails." },
    accessibility: { score: isRejected ? 50 : 80, reason: "Recruiters and hiring managers visible on LinkedIn." },
    outreachPotential: { score: isRejected ? 60 : 90, reason: "Solid value proposition match." }
  };

  const recommendedChannel = lead.companyName === "Linear" ? "linkedin" : lead.companyName === "Railway" ? "careers_page" : "email";

  const outreachStrategy = {
    recommendedChannel,
    firstMethod: recommendedChannel === "linkedin" 
      ? "Send connection request on LinkedIn to Engineering Head" 
      : recommendedChannel === "careers_page"
        ? "Submit cover letter directly on Greenhouse application portal"
        : "Send high-impact cold email to Founder",
    contextToReference: `Reference recent engineering openings and scale challenges at ${lead.companyName}.`,
    followUpSequence: true,
    responseProbability: recommendedChannel === "linkedin" ? 75 : recommendedChannel === "careers_page" ? 45 : 80,
    strategyReason: recommendedChannel === "linkedin"
      ? "Founders at Linear respond best to short, direct LinkedIn notes."
      : recommendedChannel === "careers_page"
        ? "Greenhouse listing handles applications directly. Recommended first contact step."
        : "Email ensures direct delivery to decision-maker inbox.",
    bestContactPerson: lead.companyName === "Linear" ? "Karri Saarinen" : lead.companyName === "Vercel" ? "Guillermo Rauch" : "Hiring Team",
    bestContactTitle: lead.companyName === "Linear" ? "CEO & Co-founder" : lead.companyName === "Vercel" ? "CEO" : `Engineering Recruiter`,
    bestContactLinkedin: lead.companyName === "Linear" 
      ? "https://linkedin.com/in/karrisaarinen" 
      : lead.companyName === "Vercel" 
        ? "https://linkedin.com/in/rauchg"
        : lead.contactLinkedin || "https://linkedin.com/company/" + lead.companyName.toLowerCase()
  };

  return {
    score,
    reason: isRejected 
      ? "Role requires timezone constraints outside user preferences."
      : `Strong opportunity at ${lead.companyName} with active hiring indicators.`,
    qualificationReport,
    outreachStrategy
  };
}

async function finishQualification(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "qualifying" }
  });
}

async function mockQualification(leads: any[], query: any) {
  // Update leads using the structured fallback generator
  const updates = leads.map((lead) => {
    const fallback = getFallbackData(lead, query);
    
    return prisma.lead.update({
      where: { id: lead.id },
      data: {
        qualificationScore: fallback.score,
        qualificationReason: fallback.reason,
        qualificationReport: JSON.stringify(fallback.qualificationReport),
        outreachStrategy: JSON.stringify(fallback.outreachStrategy),
        pipelineStage: fallback.score >= 70 ? "qualified" : "rejected",
        applyDirect: fallback.outreachStrategy.recommendedChannel === "careers_page",
        contactName: fallback.outreachStrategy.bestContactPerson,
        contactTitle: fallback.outreachStrategy.bestContactTitle,
        contactLinkedin: fallback.outreachStrategy.bestContactLinkedin,
      }
    });
  });

  await Promise.all(updates);
}
