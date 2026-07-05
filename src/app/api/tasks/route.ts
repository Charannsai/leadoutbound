import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || "pending";

    const tasks = await prisma.task.findMany({
      where: { status },
      include: {
        lead: true
      },
      orderBy: { dueDate: "asc" }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, action } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { lead: true }
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: action === "skip" ? "skipped" : "completed",
        updatedAt: new Date()
      }
    });

    // Advance sequence progress if this task was spawned by a sequence step
    const seqState = await prisma.leadSequenceState.findFirst({
      where: {
        leadId: task.leadId,
        sessionId: task.lead.sessionId,
        status: "active"
      }
    });

    if (seqState) {
      // Find the next step in the sequence
      const nextStepNum = seqState.currentStepNumber + 1;
      const nextStep = await prisma.sequenceStep.findFirst({
        where: {
          sessionId: task.lead.sessionId,
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

        // Trigger automatic step execution right away if it's an automatic email
        if (nextStep.type === "email_auto") {
          // Create simulated draft email
          const subject = (nextStep.subject || "Follow up")
            .replace("{{contactName}}", task.lead.contactName || "there")
            .replace("{{companyName}}", task.lead.companyName || "your company")
            .replace("{{location}}", task.lead.location || "remote");

          const emailBody = (nextStep.body || "Checking in")
            .replace("{{contactName}}", task.lead.contactName || "there")
            .replace("{{companyName}}", task.lead.companyName || "your company")
            .replace("{{location}}", task.lead.location || "remote");

          await prisma.leadEmail.create({
            data: {
              leadId: task.leadId,
              subject,
              body: emailBody,
              status: "draft",
              emailType: "followup_" + nextStepNum
            }
          });
        } else {
          // Create next manual task
          await prisma.task.create({
            data: {
              leadId: task.leadId,
              type: nextStep.type === "linkedin_connect" ? "linkedin" : (nextStep.type === "call" ? "call" : "task"),
              title: nextStep.type === "linkedin_connect" ? `Connect with ${task.lead.contactName}` : (nextStep.type === "call" ? `Call ${task.lead.contactName}` : `Task for ${task.lead.contactName}`),
              description: nextStep.instructions || "Manual campaign action step.",
              dueDate: new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000),
              status: "pending"
            }
          });
        }
      } else {
        // No more steps, complete sequence
        await prisma.leadSequenceState.update({
          where: { id: seqState.id },
          data: {
            status: "completed"
          }
        });
      }
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Task POST error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
