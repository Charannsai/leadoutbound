import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, safeParseJson } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { query, answers = [] } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    let geminiClient;
    try {
      geminiClient = await getGeminiClient();
    } catch {
      // API key missing fallback
      return NextResponse.json(getMockAnalysis(query, answers));
    }

    // Prepare history context from answers
    const answersContext = answers.map((ans: { question: string; answer: string }) => 
      `Question: ${ans.question}\nAnswer: ${ans.answer}`
    ).join("\n\n");

    const systemPrompt = `You are an AI research assistant for an outbound lead generation tool.
Your job is to analyze the user's search query for finding candidates or outbound leads, evaluate if there are key parameters missing, and generate exactly ONE intelligent follow-up question at a time to narrow down the target profile.

Key parameters we need to construct a target profile:
1. Target Role/Designation (e.g. Software Engineer, Founder, Recruiter)
2. Experience Level required (e.g. 2 years, Senior, Lead)
3. Location / Remote preferences (e.g. Remote everywhere, US only, hybrid Bangalore)
4. Company type / industry focus (e.g. Early-stage AI startups, healthcare SaaS)
5. Ideal contact person (e.g. Founder, Head of Engineering, HR)

If any critical information is missing to produce high-quality leads, formulate ONE specific follow-up question.
Do NOT ask more than one question. The conversational refinement continues until you are confident you understand the objective.
Also, determine the best data sources to search (e.g. "LinkedIn Profiles", "Google Search", "Startup Directories", "Hiring Platforms", "Company Careers Pages"). Combine them to maximize lead quality and coverage. Do not list source selection choices for the user; determine them automatically.

Analyze the query and any answers the user gave to previous questions. Respond strictly with a JSON object in this format (no markdown blocks, no prefix/suffix):
{
  "analyzedQuery": {
    "role": "extracted role or null",
    "experience": "extracted experience or null",
    "location": "extracted location/remote preference or null",
    "industry": "extracted industry or null",
    "companyType": "extracted company type or null",
    "contactPerson": "extracted contact person or null"
  },
  "followUpQuestions": [
    {
      "key": "name_of_parameter_missing",
      "question": "Intelligent, direct question to ask the user",
      "options": ["Suggested Option 1", "Suggested Option 2", "Suggested Option 3"] // Provide 2-3 smart suggested answers based on the question context
    }
  ], // MUST contain AT MOST ONE question. If complete, this array should be empty.
  "determinedSources": ["Source 1", "Source 2", ...], // List of 2-4 automatically determined best data sources to search
  "isComplete": true/false // true if we have enough info to trigger a search, false if we need answers to critical questions.
}`;

    const prompt = `User Query: "${query}"\n\nPrevious Q&A History:\n${answersContext || "None"}\n\nAnalyze and return JSON structure.`;

    try {
      const responseText = await geminiClient.generateContent(prompt, systemPrompt);
      const parsed = safeParseJson(responseText, getMockAnalysis(query, answers));
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("Gemini query analysis failed:", e);
      return NextResponse.json(getMockAnalysis(query, answers));
    }
  } catch (error) {
    console.error("Search analyze API error:", error);
    return NextResponse.json({ error: "Search analysis failed" }, { status: 500 });
  }
}

function getMockAnalysis(query: string, answers: any[] = []) {
  // Simple regex parser for mock testing
  const q = query.toLowerCase();
  const answersText = answers.map(a => a.answer.toLowerCase()).join(" ");

  const hasRole = q.includes("engineer") || q.includes("developer") || q.includes("sales") || q.includes("founder") || q.includes("founder") || q.includes("saas") || q.includes("startup") || q.includes("startup") || q.includes("healthcare") || q.includes("companies");
  const hasExperience = q.includes("year") || q.includes("yoe") || q.includes("senior") || q.includes("junior") || q.includes("early");
  const hasLocation = q.includes("remote") || q.includes("india") || q.includes("europe") || q.includes("us") || answersText.includes("remote") || answersText.includes("location");

  const followUpQuestions = [];
  const determinedSources = ["Google Search", "Greenhouse Board", "Lever Listings", "Ashby Careers"];
  
  if (!hasLocation && !answersText.includes("remote") && !answersText.includes("location")) {
    followUpQuestions.push({
      key: "location",
      question: "Are you looking for remote opportunities globally, or are there specific location limits (e.g. US/India only)?",
      options: ["Remote Globally", "United States Only", "India Only"]
    });
  } else if (!answersText.includes("startup") && !answersText.includes("established") && !q.includes("startup") && !q.includes("founder")) {
    followUpQuestions.push({
      key: "companySize",
      question: "Would you like to prioritize early-stage startups (under 50 people) or more established companies?",
      options: ["Early-stage Startups", "Established Tech Scale-ups", "Any Company Size"]
    });
  } else if (!answersText.includes("founder") && !answersText.includes("recruiter") && !answersText.includes("hiring") && !answersText.includes("leader")) {
    followUpQuestions.push({
      key: "contactPerson",
      question: "Would you prefer to reach out to founders directly, hiring managers, or recruitment leaders?",
      options: ["Founders & Co-founders", "Engineering Managers / Directors", "Recruiting / HR Teams"]
    });
  }

  // Determine dynamic sources based on query
  if (q.includes("founder") || q.includes("startup") || q.includes("saas")) {
    determinedSources.unshift("LinkedIn Profiles");
    determinedSources.push("YCombinator Directory");
  } else if (q.includes("healthcare") || q.includes("medical")) {
    determinedSources.unshift("Crunchbase");
    determinedSources.push("Specialized Healthcare Directories");
  }

  // Keep unique sources, slice to 4
  const uniqueSources = Array.from(new Set(determinedSources)).slice(0, 4);

  return {
    analyzedQuery: {
      role: hasRole ? (q.includes("founder") ? "Founder" : q.includes("sales") ? "Sales Executive" : "Software Engineer") : null,
      experience: hasExperience ? "Senior / Mid" : "Any",
      location: hasLocation ? "Remote" : null,
      industry: q.includes("healthcare") ? "Healthcare" : q.includes("saas") ? "SaaS" : "AI / Technology",
      companyType: q.includes("startup") ? "Startup" : null,
      contactPerson: q.includes("founder") ? "Founder" : "Hiring Manager"
    },
    followUpQuestions: followUpQuestions.slice(0, 1), // strictly 1 question at a time
    determinedSources: uniqueSources,
    isComplete: followUpQuestions.length === 0 || answers.length >= 3
  };
}
