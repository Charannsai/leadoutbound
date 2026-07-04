import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

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
Your job is to analyze the user's search query for finding job opportunities or outbound leads, evaluate if there are key parameters missing, and generate intelligent follow-up questions.

Key parameters we need to construct a target profile:
1. Target Role/Designation (e.g. Software Engineer, Founder, Recruiter)
2. Experience Level required (e.g. 2 years, Senior, Lead)
3. Location / Remote preferences (e.g. Remote everywhere, US only, hybrid Bangalore)
4. Company type / industry focus (e.g. Early-stage AI startups, healthcare SaaS)
5. Ideal contact person (e.g. Founder, Head of Engineering, HR)

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
      "question": "Intelligent, direct question to ask the user"
    }
  ],
  "isComplete": true/false (true if we have enough info to trigger a scraping search, false if we need answers to critical questions)
}

Critical questions to resolve:
- If remote preference or geographic restrictions are vague, ask.
- Limit followUpQuestions to max 3 items. If all key parameters are reasonably understood, mark "isComplete" as true and leave "followUpQuestions" as empty.`;

    const prompt = `User Query: "${query}"\n\nPrevious Q&A History:\n${answersContext || "None"}\n\nAnalyze and return JSON structure.`;

    try {
      const responseText = await geminiClient.generateContent(prompt, systemPrompt);
      // Clean JSON formatting if Gemini adds markdown tags
      const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
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

  const hasRole = q.includes("engineer") || q.includes("developer") || q.includes("sales") || q.includes("founder");
  const hasExperience = q.includes("year") || q.includes("yoe") || q.includes("senior") || q.includes("junior");
  const hasLocation = q.includes("remote") || q.includes("india") || q.includes("europe") || q.includes("us");

  const followUpQuestions = [];
  
  if (!hasLocation && !answersText.includes("remote") && !answersText.includes("location")) {
    followUpQuestions.push({
      key: "location",
      question: "Are you looking for fully remote opportunities worldwide, or are there specific country limitations (e.g. India only)?"
    });
  }

  if (followUpQuestions.length === 0 && !answersText.includes("startup") && !answersText.includes("enterprise")) {
    followUpQuestions.push({
      key: "companySize",
      question: "Do you prefer early-stage startups (under 50 people), mid-sized SaaS companies, or large-scale enterprises?"
    });
  }

  return {
    analyzedQuery: {
      role: hasRole ? "Software Engineer" : null,
      experience: hasExperience ? "2 Years" : null,
      location: hasLocation ? "Remote" : null,
      industry: "Technology",
      companyType: null,
      contactPerson: "Founder / Hiring Manager"
    },
    followUpQuestions,
    isComplete: followUpQuestions.length === 0 || answers.length >= 2
  };
}
