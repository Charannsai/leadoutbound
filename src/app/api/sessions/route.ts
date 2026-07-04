import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { searchQuery: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { leads: true } },
        template: { select: { name: true, category: true } },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Sessions GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, searchQuery, description, templateId, outboundChannel } = body;

    if (!name || !searchQuery) {
      return NextResponse.json(
        { error: "Name and search query are required" },
        { status: 400 }
      );
    }

    // Trigger Next.js compilation cache reload following Prisma generation
    const session = await prisma.session.create({
      data: {
        name,
        searchQuery,
        description: description || null,
        templateId: templateId || null,
        outboundChannel: outboundChannel || "email",
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Sessions POST error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
