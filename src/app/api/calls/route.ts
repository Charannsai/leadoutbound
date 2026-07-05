import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const logs = await prisma.callLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        lead: true
      }
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Calls GET error:", error);
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, outcome, notes, duration } = body;

    if (!leadId || !outcome) {
      return NextResponse.json({ error: "Lead ID and Outcome are required" }, { status: 400 });
    }

    const log = await prisma.callLog.create({
      data: {
        leadId,
        outcome,
        notes: notes || "",
        duration: duration ? parseInt(duration, 10) : 0
      },
      include: {
        lead: true
      }
    });

    // Check if there's a pending call task for this lead and automatically complete it!
    const pendingCallTask = await prisma.task.findFirst({
      where: {
        leadId,
        type: "call",
        status: "pending"
      }
    });

    if (pendingCallTask) {
      // Complete task via internal update logic
      await prisma.task.update({
        where: { id: pendingCallTask.id },
        data: {
          status: "completed",
          updatedAt: new Date()
        }
      });

      // Update lead's sequence state
      const seqState = await prisma.leadSequenceState.findFirst({
        where: {
          leadId,
          sessionId: log.lead.sessionId,
          status: "active"
        }
      });

      if (seqState) {
        const nextStepNum = seqState.currentStepNumber + 1;
        const nextStep = await prisma.sequenceStep.findFirst({
          where: {
            sessionId: log.lead.sessionId,
            stepNumber: nextStepNum
          }
        });

        if (nextStep) {
          await prisma.leadSequenceState.update({
            where: { id: seqState.id },
            data: {
              currentStepNumber: nextStepNum,
              nextRunAt: new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000)
            }
          });

          if (nextStep.type === "email_auto") {
            const subject = (nextStep.subject || "Follow up")
              .replace("{{contactName}}", log.lead.contactName || "there")
              .replace("{{companyName}}", log.lead.companyName || "your company")
              .replace("{{location}}", log.lead.location || "remote");

            const emailBody = (nextStep.body || "Checking in")
              .replace("{{contactName}}", log.lead.contactName || "there")
              .replace("{{companyName}}", log.lead.companyName || "your company")
              .replace("{{location}}", log.lead.location || "remote");

            await prisma.leadEmail.create({
              data: {
                leadId,
                subject,
                body: emailBody,
                status: "draft",
                emailType: "followup_" + nextStepNum
              }
            });
          } else {
            await prisma.task.create({
              data: {
                leadId,
                type: nextStep.type === "linkedin_connect" ? "linkedin" : (nextStep.type === "call" ? "call" : "task"),
                title: nextStep.type === "linkedin_connect" ? `Connect with ${log.lead.contactName}` : (nextStep.type === "call" ? `Call ${log.lead.contactName}` : `Task for ${log.lead.contactName}`),
                description: nextStep.instructions || "Manual campaign action step.",
                dueDate: new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000),
                status: "pending"
              }
            });
          }
        } else {
          await prisma.leadSequenceState.update({
            where: { id: seqState.id },
            data: { status: "completed" }
          });
        }
      }
    }

    // Trigger meeting creation if the call resulted in "meeting_scheduled"
    if (outcome === "meeting_scheduled") {
      const today = new Date();
      const startTime = new Date(today);
      startTime.setDate(today.getDate() + 3); // 3 days in the future
      startTime.setHours(11, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(30);

      await prisma.meeting.create({
        data: {
          title: `Intro Call: Outreach Demo / ${log.lead.companyName}`,
          startTime,
          endTime,
          leadId,
          status: "scheduled"
        }
      });
    }

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Calls POST error:", error);
    return NextResponse.json({ error: "Failed to log call" }, { status: 500 });
  }
}
