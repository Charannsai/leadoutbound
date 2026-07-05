import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get("activeOnly");

    const where: any = {};
    if (activeOnly === "true") {
      where.isActive = true;
    }

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Workflows GET error:", error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, trigger, action, isActive } = body;

    if (!name || !trigger || !action) {
      return NextResponse.json({ error: "Name, Trigger, and Action are required" }, { status: 400 });
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        trigger,
        action,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Workflows POST error:", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, name, trigger, action, isActive } = body;

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (trigger) updateData.trigger = trigger;
    if (action) updateData.action = action;
    if (isActive !== undefined) updateData.isActive = isActive;

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: updateData
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Workflows PATCH error:", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.workflow.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Workflows DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
