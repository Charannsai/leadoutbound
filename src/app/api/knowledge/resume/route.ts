import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGeminiClient, safeParseJson } from "@/lib/gemini";
import path from "node:path";
import fs from "node:fs";

import { PDFParse } from "pdf-parse";

async function parsePdfText(buffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8);
  const data = await parser.getText();
  return data.text || "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string | null;

    let resumeText = "";
    let uploadedFile = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (file.name.endsWith(".pdf")) {
        try {
          resumeText = await parsePdfText(buffer);
        } catch (pdfErr) {
          console.error("PDF text extraction failed:", pdfErr);
          return NextResponse.json({ error: "Failed to parse PDF file text" }, { status: 400 });
        }
      } else {
        // Assume text file
        resumeText = buffer.toString("utf-8");
      }

      // Save the file to the local uploads directory to serve as the template resume attachment!
      const uploadDir = path.join(process.cwd(), "data", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, file.name);
      fs.writeFileSync(filePath, buffer);

      // Create or update KnowledgeFile in DB
      uploadedFile = await prisma.knowledgeFile.create({
        data: {
          name: file.name,
          filename: file.name,
          filepath: filePath,
          fileType: "resume",
          mimeType: file.type,
          sizeBytes: file.size
        }
      });

    } else if (rawText) {
      resumeText = rawText;
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ error: "No resume text found" }, { status: 400 });
    }

    // Connect to Gemini
    let geminiClient;
    try {
      geminiClient = await getGeminiClient();
    } catch {
      return NextResponse.json({ error: "Gemini API key is required in settings to analyze resumes." }, { status: 400 });
    }

    const systemPrompt = `You are a professional resume parser.
Your task is to analyze the provided resume text and extract key profile details to populate a local knowledge base.
You must categorize and structure the extracted data into a JSON array matching our schema format.

Valid categories are exactly:
- personal
- skills
- experience
- links
- pricing
- availability
- notes

For pricing and availability, if not explicitly found in the resume, write reasonable default placeholders (e.g. "Available for Remote Everywhere" or "Open to market rates").

Respond strictly with a JSON array in the following format (no markdown blocks, no prefix/suffix):
[
  { "category": "personal", "label": "Full Name", "value": "Name extracted", "sortOrder": 0 },
  { "category": "personal", "label": "Current Title", "value": "Title extracted", "sortOrder": 1 },
  { "category": "skills", "label": "Core Technologies", "value": "Comma-separated list of skills", "sortOrder": 0 },
  { "category": "experience", "label": "Summary of Experience", "value": "Details of years of experience and background", "sortOrder": 0 },
  { "category": "links", "label": "LinkedIn Profile", "value": "URL or null", "sortOrder": 0 },
  { "category": "links", "label": "GitHub Profile", "value": "URL or null", "sortOrder": 1 },
  { "category": "availability", "label": "Remote Status", "value": "Remote everywhere preferred", "sortOrder": 0 }
]

Keep values concise but descriptive.`;

    const responseText = await geminiClient.generateContent(
      `Resume Text:\n${resumeText}\n\nParse this resume and return JSON array.`,
      systemPrompt
    );

    const entries = safeParseJson(responseText, [] as any[]);

    if (Array.isArray(entries)) {
      // Overwrite/clear old entries to replace with new resume details
      await prisma.knowledgeEntry.deleteMany();

      // Batch insert new entries
      const creations = entries.map((entry, idx) => 
        prisma.knowledgeEntry.create({
          data: {
            category: entry.category,
            label: entry.label,
            value: String(entry.value),
            sortOrder: entry.sortOrder ?? idx
          }
        })
      );
      await Promise.all(creations);
    }

    return NextResponse.json({ success: true, file: uploadedFile, count: entries.length });
  } catch (error) {
    console.error("Resume parsing API error:", error);
    return NextResponse.json({ error: "Failed to parse and import resume details" }, { status: 500 });
  }
}
