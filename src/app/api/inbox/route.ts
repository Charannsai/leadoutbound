import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const replies = await prisma.reply.findMany({
      orderBy: { receivedAt: "desc" },
      include: {
        lead: {
          select: {
            companyName: true,
            contactName: true,
            contactEmail: true,
            sessionId: true,
            session: { select: { name: true } }
          }
        }
      }
    });

    return NextResponse.json(replies);
  } catch (error) {
    console.error("Inbox GET error:", error);
    return NextResponse.json({ error: "Failed to fetch replies" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, isRead } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const reply = await prisma.reply.update({
      where: { id },
      data: { isRead }
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error("Inbox PATCH error:", error);
    return NextResponse.json({ error: "Failed to update reply" }, { status: 500 });
  }
}
