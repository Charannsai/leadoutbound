import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMimeEmail } from "@/lib/gmail";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const to = formData.get("to") as string;
    const subject = formData.get("subject") as string;
    const body = formData.get("body") as string;
    const fromName = (formData.get("fromName") as string) || undefined;

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields (to, subject, body)" },
        { status: 400 }
      );
    }

    const attachments: Array<{ name: string; content: string; mimeType: string }> = [];
    const files = formData.getAll("files");

    for (const f of files) {
      if (f instanceof File) {
        const arrayBuf = await f.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString("base64");
        attachments.push({
          name: f.name,
          content: base64,
          mimeType: f.type || "application/octet-stream"
        });
      }
    }

    // Find or create a Lead for this recipient contactEmail
    let lead = await prisma.lead.findFirst({
      where: { contactEmail: to }
    });

    if (!lead) {
      let session = await prisma.session.findFirst({
        orderBy: { createdAt: "desc" }
      });
      
      if (!session) {
        session = await prisma.session.create({
          data: {
            name: "Manual Outreach Session",
            searchQuery: "Manual",
            status: "completed"
          }
        });
      }

      lead = await prisma.lead.create({
        data: {
          sessionId: session.id,
          companyName: to.split("@")[0] || "Unknown",
          contactEmail: to,
          contactName: to.split("@")[0] || "Contact",
          pipelineStage: "sent",
          source: "manual"
        }
      });
    }

    const result = await sendMimeEmail({
      to,
      subject,
      body,
      attachments,
      fromName
    });

    // Save outbound email to database to link it to the platform
    await prisma.leadEmail.create({
      data: {
        leadId: lead.id,
        subject,
        body,
        status: "sent",
        emailType: "initial",
        gmailThreadId: result.threadId,
        gmailMessageId: result.id,
        sentAt: new Date()
      }
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Compose mail failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to compose email" },
      { status: 500 }
    );
  }
}
