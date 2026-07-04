import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGeminiClient, safeParseJson } from "@/lib/gemini";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { templateId } = body;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { session: true }
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const isLinkedin = lead.session.outboundChannel === "linkedin";

    // Determine template to use
    let template = null;
    if (templateId) {
      template = await prisma.template.findUnique({ where: { id: templateId } });
    } else if (lead.session.templateId) {
      template = await prisma.template.findUnique({ where: { id: lead.session.templateId } });
    } else {
      // Find default template
      template = await prisma.template.findFirst({
        where: { category: "job_application", isDefault: true }
      });
    }

    if (!template) {
      return NextResponse.json({ error: "No suitable template found" }, { status: 400 });
    }

    // Load Knowledge Base
    const knowledgeEntries = await prisma.knowledgeEntry.findMany();
    const kbContext = knowledgeEntries.map(e => `${e.label} (${e.category}): ${e.value}`).join("\n");

    // Check Gemini API connection
    let geminiClient;
    try {
      geminiClient = await getGeminiClient();
    } catch {
      // Mock personalization fallback
      const mockResult = generateMockEmail(lead, template, kbContext, isLinkedin);
      
      const email = await prisma.leadEmail.create({
        data: {
          leadId,
          subject: mockResult.subject,
          body: mockResult.body,
          aiReasoning: mockResult.aiReasoning,
          status: "draft",
          emailType: isLinkedin ? "linkedin_note" : "initial"
        }
      });

      // Update lead pipeline stage to personalized
      await prisma.lead.update({
        where: { id: leadId },
        data: { pipelineStage: "personalized" }
      });

      return NextResponse.json({ email, text: mockResult.body });
    }

    // Construct AI Prompt
    const systemPrompt = isLinkedin
      ? `You are a cold outbound LinkedIn personalization expert.
Your goal is to write a highly tailored, conversational, and conversion-focused LinkedIn Connection Request Note to a recipient based on their profile, their company details, a template guidelines, and the sender's knowledge base.

Sender Details (Knowledge Base):
${kbContext}

Template Instructions:
Message Rules: ${template.bodyInstructions || "Write a very short, engaging connection invite note."}
Tone: ${template.tone}

Important Rules:
- STRICTLY under 300 characters in total length (LinkedIn connection notes character limit constraint).
- DO NOT use any subject lines.
- Write an original, customized connection note referencing their company/role.
- Do not use generic placeholders like [Company Name] or [Recipient Name]. Replace them with the actual names.
- Make it conversational and close with a direct, short call to action.

Return your response strictly in the following JSON format:
{
  "subject": "LinkedIn Connection Request",
  "body": "Your short invite message (must be strictly under 300 characters including spacing)",
  "aiReasoning": "1-sentence explanation of why you wrote this specific pitch"
}`
      : `You are a cold outbound email personalization expert.
Your goal is to write a highly tailored, conversion-focused cold email to a recipient based on their profile, their company details, a template guidelines, and the sender's knowledge base.

Sender Details (Knowledge Base):
${kbContext}

Template Instructions:
Subject Line Rules: ${template.subjectRules || "Create a catchy, direct subject line."}
Body Rules: ${template.bodyInstructions || "Write a short, engaging outreach email."}
Tone: ${template.tone}

Instructions:
- Write an original, customized introduction referencing their role/company.
- Naturally incorporate relevant parts of the sender's details (e.g. experience level, portfolio).
- DO NOT use generic placeholders like [Company Name] or [Recipient Name]. Replace them with the recipient/company info provided.
- Keep the subject and body separate.
- Close the email with a call to action.

Return your response strictly in the following JSON format:
{
  "subject": "Personalized subject line",
  "body": "Email body content with proper spacing (use \\n for newlines)",
  "aiReasoning": "1-sentence explanation of why you wrote this specific pitch"
}`;

    const prompt = `Recipient Details:
Name: ${lead.contactName || "Team"}
Title: ${lead.contactTitle || "Hiring Manager"}
Company: ${lead.companyName}
Website: ${lead.companyWebsite || "—"}
Industry: ${lead.industry || "—"}
Location: ${lead.location || "—"}
Qualifications: ${lead.qualificationReason || "—"}`;

    try {
      const resultText = await geminiClient.generateContent(prompt, systemPrompt);
      const parsed = safeParseJson(resultText, {
        subject: isLinkedin ? "LinkedIn Connection Request" : `Outreach to ${lead.companyName}`,
        body: isLinkedin ? `Hi ${lead.contactName || "there"}, noticed your work at ${lead.companyName}. Let's connect!` : "Hello...",
        aiReasoning: "Custom pitch generated based on company profile"
      });

      const email = await prisma.leadEmail.create({
        data: {
          leadId,
          subject: parsed.subject || (isLinkedin ? "LinkedIn Connection Request" : `Outreach to ${lead.companyName}`),
          body: parsed.body || "Hello...",
          aiReasoning: parsed.aiReasoning || "Custom pitch generated based on company profile",
          status: "draft",
          emailType: isLinkedin ? "linkedin_note" : "initial"
        }
      });

      // Update lead stage
      await prisma.lead.update({
        where: { id: leadId },
        data: { pipelineStage: "personalized" }
      });

      return NextResponse.json({ email, text: parsed.body });
    } catch (err) {
      console.error("Personalization LLM call failed:", err);
      // Fallback email
      const mockResult = generateMockEmail(lead, template, kbContext, isLinkedin);
      const email = await prisma.leadEmail.create({
        data: {
          leadId,
          subject: mockResult.subject,
          body: mockResult.body,
          aiReasoning: "Fallback generated due to API issue.",
          status: "draft",
          emailType: isLinkedin ? "linkedin_note" : "initial"
        }
      });
      await prisma.lead.update({ where: { id: leadId }, data: { pipelineStage: "personalized" } });
      return NextResponse.json({ email, text: mockResult.body });
    }
  } catch (error) {
    console.error("Lead personalization API error:", error);
    return NextResponse.json({ error: "Failed to personalize lead email" }, { status: 500 });
  }
}

function generateMockEmail(lead: any, template: any, kbContext: string, isLinkedin = false) {
  const contactName = lead.contactName || "there";
  const companyName = lead.companyName;

  if (isLinkedin) {
    return {
      subject: "LinkedIn Connection Request",
      body: `Hi ${contactName}, noticed your work at ${companyName}. I have 2 years React/Next.js experience and would love to connect to see if there's any engineering capacity alignment. Cheers!`,
      aiReasoning: "Fallback connection note generated due to API issue."
    };
  }

  return {
    subject: `Question regarding ${template.category === "freelance" ? "engineering capacity" : "openings"} at ${companyName}`,
    body: `Hi ${contactName},\n\nI was looking at ${companyName}'s work and wanted to reach out. I have 2 years of experience as a Software Engineer and am looking for remote roles.\n\nI noticed you build outstanding products and would love to see if there is any engineering alignment where I can add value.\n\nAre you open to a brief call this week?\n\nBest regards,\nSoftware Engineer`,
    aiReasoning: `Generated based on template: "${template.name}" emphasizing 2 years software engineering experience targeting ${companyName}.`
  };
}
