import { NextRequest, NextResponse } from "next/server";
import { getGmailAttachment } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    const attachmentId = searchParams.get("attachmentId");
    const filename = searchParams.get("filename") || "attachment";

    if (!messageId || !attachmentId) {
      return NextResponse.json(
        { error: "Missing messageId or attachmentId" },
        { status: 400 }
      );
    }

    const { data, mimeType } = await getGmailAttachment(messageId, attachmentId);

    // Decode base64url format safely to a Node binary Buffer
    const cleanBase64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const buffer = Buffer.from(cleanBase64, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`
      }
    });
  } catch (error: any) {
    console.error("Failed to proxy attachment download:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download attachment" },
      { status: 500 }
    );
  }
}
