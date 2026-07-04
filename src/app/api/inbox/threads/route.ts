import { NextRequest, NextResponse } from "next/server";
import { listGmailThreads } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "inbox";
    const search = searchParams.get("search") || undefined;

    const threads = await listGmailThreads(folder, search);
    return NextResponse.json(threads);
  } catch (error: any) {
    console.error("Failed to list threads:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch threads" }, { status: 500 });
  }
}
