import { NextRequest, NextResponse } from "next/server";
import { getGmailThreadDetails, sendMimeEmail } from "@/lib/gmail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const details = await getGmailThreadDetails(id);
    return NextResponse.json(details);
  } catch (error: any) {
    console.error("Failed to fetch thread details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch thread details" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params;
    const formData = await request.formData();

    const to = formData.get("to") as string;
    const subject = formData.get("subject") as string;
    const body = formData.get("body") as string;
    const messageId = (formData.get("messageId") as string) || undefined;
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

    const result = await sendMimeEmail({
      to,
      subject,
      body,
      attachments,
      threadId,
      messageId,
      fromName
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Failed to send reply:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send thread reply" },
      { status: 500 }
    );
  }
}
