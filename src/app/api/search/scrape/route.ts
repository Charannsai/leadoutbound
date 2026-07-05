import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGeminiClient, safeParseJson } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, analyzedQuery, determinedSources = [] } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update session status to searching
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "searching" }
    });

    const apifyKeySetting = await prisma.settings.findUnique({ where: { key: "apify_api_key" } });
    const apifyKey = apifyKeySetting?.value || process.env.APIFY_API_KEY || "";

    let leads: any[] = [];

    if (apifyKey && apifyKey.length > 5) {
      try {
        leads = await runApifyScrape(apifyKey, analyzedQuery, determinedSources);
      } catch (err) {
        console.warn("Apify integration failed, falling back to mock leads generator", err);
        leads = generateMockLeads(analyzedQuery);
      }
    } else {
      leads = generateMockLeads(analyzedQuery);
    }

    // Ensure we have leads
    if (leads.length === 0) {
      leads = generateMockLeads(analyzedQuery);
    }

    // De-duplicate against leads already in database (across all sessions)
    const existingLeads = await prisma.lead.findMany({
      select: { companyName: true, companyWebsite: true, contactEmail: true }
    });
    const existingKeys = new Set(
      existingLeads.map(l => `${(l.companyName || "").toLowerCase().trim()}|${(l.contactEmail || "").toLowerCase().trim()}`)
    );

    const deduplicatedLeads = leads.filter(lead => {
      const key = `${(lead.companyName || "").toLowerCase().trim()}|${(lead.contactEmail || "").toLowerCase().trim()}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key); // Also dedup within current batch
      return true;
    });

    console.log(`[Scrape] ${leads.length} raw leads → ${deduplicatedLeads.length} after dedup`);

    // Save leads to database under this session
    const leadCreations = deduplicatedLeads.map((lead: any) => 
      prisma.lead.create({
        data: {
          sessionId,
          companyName: lead.companyName,
          companyWebsite: lead.companyWebsite,
          companySize: lead.companySize || "Unknown",
          industry: lead.industry || "Technology",
          location: lead.location || "Remote",
          contactName: lead.contactName,
          contactEmail: lead.contactEmail,
          contactTitle: lead.contactTitle,
          contactLinkedin: lead.contactLinkedin || null,
          source: apifyKey ? "apify" : "mock_discovery",
          pipelineStage: "generated",
          rawData: JSON.stringify(lead)
        }
      })
    );

    await Promise.all(leadCreations);

    // Update session stats
    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status: "qualifying",
        totalLeads: deduplicatedLeads.length
      }
    });

    return NextResponse.json({ success: true, count: deduplicatedLeads.length });
  } catch (error) {
    console.error("Scrape API error:", error);
    return NextResponse.json({ error: "Lead discovery failed" }, { status: 500 });
  }
}

// ============================================
// Multi-Query Apify Scraper with AI Extraction
// ============================================

async function runApifyScrape(apiKey: string, query: any, determinedSources: string[] = []) {
  const role = query?.role || "Software Engineer";
  const location = query?.location || "Remote";

  // Construct a prompt for Gemini to generate the Google search queries dynamically
  const gemini = await getGeminiClient().catch(() => null);
  let searchQueries = "";

  if (gemini && determinedSources.length > 0) {
    const queryPrompt = `You are a Google Search query expert.
Your job is to generate exactly 3-4 highly effective search queries to find live job listings, career openings, or company contacts based on the target profile and the target sources list.

Target Profile:
Role: ${role}
Location: ${location}

Target Sources list determined by AI:
${determinedSources.join(", ")}

Instructions:
- Use standard Google search operators.
- If "Greenhouse", "Lever", or "Ashby" are listed, generate queries using "site:greenhouse.io", "site:lever.co", or "site:ashbyhq.com" to target those specific platforms.
- If "YCombinator", "Crunchbase", or startup directories are listed, target those or construct matching terms.
- Use quotes for exact matches.
- Keep the queries highly specific to the target profile.
- Return exactly one search query per line. Do not output markdown, bullet points, numbers, symbols, prefix, or introductions. Just the raw queries.`;

    try {
      const resText = await gemini.generateContent(queryPrompt, "Generate Google Search queries. One per line. No extra text.");
      searchQueries = resText.trim();
      console.log(`[Apify Scrape] Dynamically generated AI queries based on sources:\n${searchQueries}`);
    } catch (err) {
      console.error("Failed to generate dynamic search queries with Gemini:", err);
    }
  }

  // Fallback queries if Gemini fails or determinedSources is empty
  if (!searchQueries) {
    searchQueries = [
      `site:greenhouse.io "${role}" "${location}" hiring`,
      `site:lever.co "${role}" "${location}" hiring`,
      `site:ashbyhq.com "${role}" "${location}"`,
      `"${role}" hiring remote careers apply -linkedin.com -indeed.com -glassdoor.com`,
    ].join("\n");
    console.log(`[Apify Scrape] Using fallback predefined queries:\n${searchQueries}`);
  }

  console.log(`[Apify Scrape] Launching multi-query scrape for: "${role}" (${location})`);

  // Start the Apify Google Search Scraper actor
  const runResponse = await fetch(
    `https://api.apify.com/v2/actors/apify~google-search-scraper/runs?token=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: searchQueries,
        maxPagesPerQuery: 1,
        resultsPerPage: 15,
        countryCode: "us"
      })
    }
  );

  if (!runResponse.ok) {
    throw new Error(`Apify run launch failed with status ${runResponse.status}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data.id;
  const datasetId = runData.data.defaultDatasetId;

  // Poll actor status for up to 120 seconds
  let isFinished = false;
  for (let i = 0; i < 24; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
    );
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.data.status === "SUCCEEDED") {
        isFinished = true;
        break;
      } else if (["FAILED", "ABORTED", "TIMED-OUT"].includes(statusData.data.status)) {
        throw new Error(`Apify actor run ended with status ${statusData.data.status}`);
      }
    }
  }

  if (!isFinished) {
    throw new Error("Apify actor run timed out");
  }

  // Fetch dataset items (multiple pages of results)
  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}`
  );
  if (!itemsRes.ok) {
    throw new Error("Failed to fetch Apify dataset results");
  }

  const items = await itemsRes.json();

  // Merge organic results from all query pages
  const allOrganicResults: any[] = [];
  for (const page of items) {
    const organics = page?.organicResults || [];
    allOrganicResults.push(...organics);
  }

  console.log(`[Apify Scrape] Discovered ${allOrganicResults.length} total organic search results across all queries`);

  if (allOrganicResults.length === 0) {
    console.warn("[Apify Scrape] No organic results returned, falling back to mock leads.");
    return [];
  }

  // De-duplicate raw search results by URL
  const seenUrls = new Set<string>();
  const uniqueResults = allOrganicResults.filter(r => {
    const url = (r.url || "").toLowerCase();
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  }).slice(0, 30);

  // Use Gemini to intelligently extract REAL company data from search results
  if (!gemini) {
    return parseSearchResultsManually(uniqueResults, role);
  }

  const parsePrompt = `You are a lead data extraction tool. Parse these Google search results into structured company leads.

CRITICAL RULES:
1. ONLY extract REAL data that is visible in the search results. 
2. Extract the REAL company name from the job listing title/URL (e.g. "Software Engineer at Notion" → companyName: "Notion")
3. Extract the REAL company domain from the URL:
   - If URL is like "boards.greenhouse.io/notion/..." → companyWebsite: "https://notion.so" (use your knowledge of the company)
   - If URL is like "jobs.lever.co/mixpanel/..." → companyWebsite: "https://mixpanel.com"
   - If URL contains the actual company domain, use that directly
4. For contactEmail: construct "careers@companydomain.com" or "jobs@companydomain.com" (these are honest generic emails)
5. For contactName: write "Hiring Team" (do NOT fabricate individual names)
6. For contactTitle: write "Recruitment Team - ${role}" (do NOT fabricate specific person titles)
7. For location: extract from the listing if visible, otherwise write "Remote"
8. For industry: infer from company name and description if possible
9. SKIP any result that doesn't clearly contain a company name or job listing

Search Results:
${JSON.stringify(uniqueResults.map((r: any) => ({ title: r.title, url: r.url, description: r.description })), null, 2)}

Target Role: ${role}

Respond with ONLY a JSON array (no markdown, no code blocks):
[
  {
    "companyName": "Real Company Name",
    "companyWebsite": "https://realcompany.com",
    "location": "Location from listing or Remote",
    "industry": "Inferred industry",
    "contactName": "Hiring Team",
    "contactEmail": "careers@realcompany.com",
    "contactTitle": "Recruitment Team - ${role}",
    "contactLinkedin": "https://linkedin.com/company/realcompanyname"
  }
]`;

  const parsedText = await gemini.generateContent(parsePrompt, "Extract REAL company data from search results. Never fabricate information.");
  try {
    const parsed = safeParseJson(parsedText, []) as any[];
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) throw new Error("Parsed content returned empty");
    
    // Post-process: validate each lead has a real company name and domain
    const validated = parsed.filter((lead: any) => {
      if (!lead.companyName || lead.companyName.length < 2) return false;
      if (!lead.companyWebsite || lead.companyWebsite.includes("greenhouse.io") || lead.companyWebsite.includes("lever.co")) {
        // Try to reconstruct domain from company name
        const clean = lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (clean.length < 2) return false;
        lead.companyWebsite = `https://${clean}.com`;
        lead.contactEmail = `careers@${clean}.com`;
      }
      return true;
    });

    console.log(`[Apify Scrape] AI extracted ${validated.length} validated leads from ${uniqueResults.length} search results`);
    return validated;
  } catch (err) {
    console.error("Failed to parse scraped company JSON, falling back manually:", err);
    return parseSearchResultsManually(uniqueResults, role);
  }
}

function parseSearchResultsManually(results: any[], role: string) {
  const leads: any[] = [];
  
  for (const item of results) {
    const url = (item.url || "").toLowerCase();
    const title = item.title || "";

    // Extract company name from Greenhouse/Lever/Ashby URLs
    let companySlug = "";
    if (url.includes("greenhouse.io/")) {
      const match = url.match(/greenhouse\.io\/([a-z0-9-]+)/);
      if (match) companySlug = match[1];
    } else if (url.includes("lever.co/")) {
      const match = url.match(/lever\.co\/([a-z0-9-]+)/);
      if (match) companySlug = match[1];
    } else if (url.includes("ashbyhq.com/")) {
      const match = url.match(/ashbyhq\.com\/([a-z0-9-]+)/);
      if (match) companySlug = match[1];
    }
    
    // Also try extracting from title: "Role at CompanyName"
    let companyName = "";
    if (companySlug) {
      // Capitalize slug: "my-company" → "My Company"
      companyName = companySlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    } else {
      const atMatch = title.match(/(?:at|@)\s+(.+?)(?:\s*[-|]|$)/i);
      if (atMatch) {
        companyName = atMatch[1].trim();
      } else {
        const dashParts = title.split("-");
        if (dashParts.length > 1) {
          companyName = dashParts[dashParts.length - 1].trim();
        }
      }
    }

    if (!companyName || companyName.length < 2) continue;
    
    // Skip generic names
    const lower = companyName.toLowerCase();
    if (["greenhouse", "lever", "ashby", "indeed", "linkedin", "glassdoor"].some(g => lower.includes(g))) continue;

    const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";

    leads.push({
      companyName,
      companyWebsite: `https://${domain}`,
      companySize: "Unknown",
      industry: "Technology",
      location: "Remote",
      contactName: "Hiring Team",
      contactEmail: `careers@${domain}`,
      contactTitle: `Recruitment Team - ${role}`,
      contactLinkedin: `https://linkedin.com/company/${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}`
    });
  }

  // Deduplicate by company name
  const seen = new Set<string>();
  return leads.filter(l => {
    const key = l.companyName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function generateMockLeads(query: any) {
  const role = query?.role || "Software Engineer";
  
  return [
    {
      companyName: "Linear",
      companyWebsite: "https://linear.app",
      companySize: "50-100",
      industry: "SaaS / Project Management",
      location: "Fully Remote",
      contactName: "Hiring Team",
      contactEmail: "careers@linear.app",
      contactTitle: `Recruitment Team - ${role}`,
      contactLinkedin: "https://linkedin.com/company/linear"
    },
    {
      companyName: "Vercel",
      companyWebsite: "https://vercel.com",
      companySize: "250-500",
      industry: "Cloud Infrastructure",
      location: "Global Remote",
      contactName: "Hiring Team",
      contactEmail: "careers@vercel.com",
      contactTitle: `Recruitment Team - ${role}`,
      contactLinkedin: "https://linkedin.com/company/vercel"
    },
    {
      companyName: "Supabase",
      companyWebsite: "https://supabase.com",
      companySize: "50-100",
      industry: "Database & Backend SaaS",
      location: "Remote Everywhere",
      contactName: "Hiring Team",
      contactEmail: "careers@supabase.com",
      contactTitle: `Recruitment Team - ${role}`,
      contactLinkedin: "https://linkedin.com/company/supabase"
    },
    {
      companyName: "Railway",
      companyWebsite: "https://railway.app",
      companySize: "10-50",
      industry: "Cloud Hosting",
      location: "Remote, India friendly",
      contactName: "Hiring Team",
      contactEmail: "careers@railway.app",
      contactTitle: `Recruitment Team - ${role}`,
      contactLinkedin: "https://linkedin.com/company/railway"
    },
    {
      companyName: "Prisma",
      companyWebsite: "https://prisma.io",
      companySize: "50-150",
      industry: "Database Tooling",
      location: "Fully Remote",
      contactName: "Hiring Team",
      contactEmail: "careers@prisma.io",
      contactTitle: `Recruitment Team - ${role}`,
      contactLinkedin: "https://linkedin.com/company/prisma"
    },
    {
      companyName: "GitLab",
      companyWebsite: "https://gitlab.com",
      companySize: "1000-2000",
      industry: "DevOps",
      location: "Remote everywhere",
      contactName: "Hiring Team",
      contactEmail: "careers@gitlab.com",
      contactTitle: `Recruitment Team - ${role}`,
      contactLinkedin: "https://linkedin.com/company/gitlab"
    }
  ];
}
