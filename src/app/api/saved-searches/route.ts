import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const savedSearches = await prisma.savedSearch.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(savedSearches);
  } catch (error) {
    console.error("Saved searches GET error:", error);
    return NextResponse.json({ error: "Failed to fetch saved searches" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, filters } = body;

    if (!name || !filters) {
      return NextResponse.json({ error: "Name and filters are required" }, { status: 400 });
    }

    const newSavedSearch = await prisma.savedSearch.create({
      data: {
        name,
        filters: typeof filters === "string" ? filters : JSON.stringify(filters)
      }
    });

    return NextResponse.json(newSavedSearch, { status: 201 });
  } catch (error) {
    console.error("Saved searches POST error:", error);
    return NextResponse.json({ error: "Failed to save search" }, { status: 500 });
  }
}
