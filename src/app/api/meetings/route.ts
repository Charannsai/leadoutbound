import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { startTime: "asc" },
      include: {
        lead: true
      }
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error("Meetings GET error:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, startTime, endTime, leadId, status } = body;

    if (!title || !startTime || !endTime || !leadId) {
      return NextResponse.json({ error: "Title, start/end times, and Lead ID are required" }, { status: 400 });
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        leadId,
        status: status || "scheduled"
      },
      include: {
        lead: true
      }
    });

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Meetings POST error:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, status, startTime, endTime } = body;

    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData,
      include: {
        lead: true
      }
    });

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Meetings PATCH error:", error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.meeting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meetings DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
