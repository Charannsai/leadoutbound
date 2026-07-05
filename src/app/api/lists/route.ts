// Next.js hot-reload trigger
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const lists = await prisma.customList.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });
    return NextResponse.json(lists);
  } catch (error) {
    console.error("Lists GET error:", error);
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "List name is required" }, { status: 400 });
    }

    const newList = await prisma.customList.create({
      data: {
        name,
        description
      }
    });

    return NextResponse.json(newList, { status: 201 });
  } catch (error) {
    console.error("Lists POST error:", error);
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 });
  }
}
