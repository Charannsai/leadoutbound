import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const stage = searchParams.get("stage");

    const where: any = {};
    if (stage) {
      where.stage = stage;
    }

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        lead: true
      }
    });

    return NextResponse.json(deals);
  } catch (error) {
    console.error("Deals GET error:", error);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, amount, stage, leadId } = body;

    if (!name || !leadId) {
      return NextResponse.json({ error: "Name and Lead ID are required" }, { status: 400 });
    }

    const deal = await prisma.deal.create({
      data: {
        name,
        amount: parseFloat(amount) || 0.0,
        stage: stage || "prospecting",
        leadId
      },
      include: {
        lead: true
      }
    });

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Deals POST error:", error);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealId, stage, amount } = body;

    if (!dealId) {
      return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (stage) updateData.stage = stage;
    if (amount !== undefined) updateData.amount = parseFloat(amount);

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: {
        lead: true
      }
    });

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Deals PATCH error:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.deal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deals DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}
