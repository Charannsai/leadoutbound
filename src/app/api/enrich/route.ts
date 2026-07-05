import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGeminiClient, safeParseJson } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, leadId, domain, email } = body;

    const gemini = await getGeminiClient().catch(() => null);

    // Helper: generate mockup data if Gemini fails
    const getMockEnrichment = (dom: string) => {
      const cleanDom = dom.toLowerCase().replace("https://", "").replace("www.", "").split("/")[0];
      const compName = cleanDom.split(".")[0].split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return {
        companyName: compName,
        companySize: "11-50",
        industry: "Information Technology & Services",
        location: "Remote / USA",
        techStack: "Next.js, React, Node.js, Postgres, AWS, Tailwind",
        fundingStage: "Seed",
        estimatedRevenue: "Under $1M",
        description: `${compName} is a high-growth startup focused on modern web platforms and developer workflow tools.`,
        phone: "+1 (555) " + Math.floor(Math.random() * 900 + 100) + "-" + Math.floor(Math.random() * 9000 + 1000)
      };
    };

    // Action 1: Enrich Single Lead
    if (action === "enrich_lead" && leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId }
      });

      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      const lookupVal = lead.companyWebsite || lead.contactEmail || "linear.app";
      const cleanLookup = lookupVal.replace("careers@", "").replace("recruitment@", "").replace("contact@", "");

      let enrichedData: any = null;

      if (gemini) {
        const prompt = `You are a B2B data enrichment researcher. Research this company domain or email and return enrichment details.
Target: ${cleanLookup}

Return a JSON object containing:
- companyName: String (clean capitalization)
- companySize: String (choose one: 1-10, 11-50, 51-200, 201-500, 500+)
- industry: String
- location: String (e.g. San Francisco, CA or Remote)
- techStack: String (comma separated list of technologies they use, e.g. React, Python, Postgres, AWS)
- fundingStage: String (choose one: Pre-seed, Seed, Series A, Series B, Series C, Series D, IPO, Bootstrap)
- estimatedRevenue: String (choose one: Under $1M, $1M-$10M, $10M-$50M, $50M+)
- description: String (brief 1 sentence business summary)
- phone: String (Office phone number)

Return ONLY valid JSON. Do not include markdown code block syntax or introductions.`;

        try {
          const res = await gemini.generateContent(prompt, "Return enrichment JSON. No extra text.");
          enrichedData = safeParseJson(res, null);
        } catch (e) {
          console.error("Gemini enrichment failed:", e);
        }
      }

      if (!enrichedData) {
        enrichedData = getMockEnrichment(cleanLookup);
      }

      // Update lead details in database
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          companySize: enrichedData.companySize || lead.companySize,
          industry: enrichedData.industry || lead.industry,
          location: enrichedData.location || lead.location,
          rawData: JSON.stringify({
            ...safeParseJson(lead.rawData || "{}", {}),
            techStack: enrichedData.techStack,
            fundingStage: enrichedData.fundingStage,
            estimatedRevenue: enrichedData.estimatedRevenue,
            description: enrichedData.description,
            phone: enrichedData.phone
          })
        }
      });

      return NextResponse.json({ success: true, lead: updatedLead });
    }

    // Action 2: Single Domain Search Enrichment Lookup (ad-hoc)
    if (action === "lookup" && (domain || email)) {
      const lookupVal = domain || email || "";
      const cleanLookup = lookupVal.replace("careers@", "").replace("recruitment@", "").replace("contact@", "");

      let enrichedData: any = null;

      if (gemini) {
        const prompt = `Research the company associated with this domain or email and return B2B enrichment information.
Target: ${cleanLookup}

Return a JSON object containing:
- companyName: String (clean capitalization)
- companySize: String (choose one: 1-10, 11-50, 51-200, 201-500, 500+)
- industry: String
- location: String (e.g. San Francisco, CA or Remote)
- techStack: String (comma separated list of technologies they use)
- fundingStage: String (choose one: Pre-seed, Seed, Series A, Series B, Series C, Series D, IPO, Bootstrap)
- estimatedRevenue: String (choose one: Under $1M, $1M-$10M, $10M-$50M, $50M+)
- description: String (brief 1 sentence business summary)
- phone: String (Office phone number)

Return ONLY valid JSON.`;

        try {
          const res = await gemini.generateContent(prompt, "Return JSON.");
          enrichedData = safeParseJson(res, null);
        } catch (e) {
          console.error("Gemini lookup failed:", e);
        }
      }

      if (!enrichedData) {
        enrichedData = getMockEnrichment(cleanLookup);
      }

      return NextResponse.json({ success: true, data: enrichedData });
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (error) {
    console.error("Enrich API error:", error);
    return NextResponse.json({ error: "Enrichment lookup failed" }, { status: 500 });
  }
}
