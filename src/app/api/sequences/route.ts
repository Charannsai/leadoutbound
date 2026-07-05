import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sessionId = searchParams.get("sessionId");
    const action = searchParams.get("action");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    if (!sessionId) {
      // List all sequences
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
    }

    if (action === "states") {
      // Fetch lead states in this sequence
      const states = await prisma.leadSequenceState.findMany({
        where: { sessionId },
        include: {
          lead: true
        },
        orderBy: { updatedAt: "desc" }
      });
      return NextResponse.json(states);
    }

    // Default: fetch steps
    const steps = await prisma.sequenceStep.findMany({
      where: { sessionId },
      orderBy: { stepNumber: "asc" }
    });
    return NextResponse.json(steps);
  } catch (error) {
    console.error("Sequences GET error:", error);
    return NextResponse.json({ error: "Failed to fetch sequence data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, steps, leadId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Action 1: Save/Update steps in sequence
    if (action === "save_steps" && steps && Array.isArray(steps)) {
      // Transaction to safely update steps
      await prisma.$transaction(async (tx) => {
        // Delete existing steps
        await tx.sequenceStep.deleteMany({
          where: { sessionId }
        });

        // Insert new steps
        const creations = steps.map((s: any, idx: number) => {
          return tx.sequenceStep.create({
            data: {
              sessionId,
              stepNumber: idx + 1,
              type: s.type, // email_auto, email_manual, linkedin_connect, call, task
              delayDays: parseInt(s.delayDays, 10) || 0,
              instructions: s.instructions || "",
              subject: s.subject || "",
              body: s.body || "",
              templateId: s.templateId || null
            }
          });
        });
        await Promise.all(creations);
      });

      const updatedSteps = await prisma.sequenceStep.findMany({
        where: { sessionId },
        orderBy: { stepNumber: "asc" }
      });

      return NextResponse.json({ success: true, steps: updatedSteps });
    }

    // Action 2: Process/Run sequence simulation
    if (action === "process") {
      // Find all active lead states in this sequence
      const activeStates = await prisma.leadSequenceState.findMany({
        where: {
          sessionId,
          status: "active",
          nextRunAt: { lte: new Date() } // due for run
        },
        include: {
          lead: true
        }
      });

      let emailsDrafted = 0;
      let tasksCreated = 0;
      let completedLeads = 0;

      for (const state of activeStates) {
        // Fetch current step configuration
        const step = await prisma.sequenceStep.findFirst({
          where: {
            sessionId,
            stepNumber: state.currentStepNumber
          }
        });

        if (!step) {
          // Current step is missing, complete sequence for lead
          await prisma.leadSequenceState.update({
            where: { id: state.id },
            data: { status: "completed" }
          });
          completedLeads++;
          continue;
        }

        // Execute current step logic
        if (step.type === "email_auto") {
          // Generate automated email draft
          const subject = (step.subject || "Outreach inquiry")
            .replace("{{contactName}}", state.lead.contactName || "there")
            .replace("{{companyName}}", state.lead.companyName || "your company")
            .replace("{{location}}", state.lead.location || "remote");

          const emailBody = (step.body || "Following up...")
            .replace("{{contactName}}", state.lead.contactName || "there")
            .replace("{{companyName}}", state.lead.companyName || "your company")
            .replace("{{location}}", state.lead.location || "remote");

          await prisma.leadEmail.create({
            data: {
              leadId: state.leadId,
              subject,
              body: emailBody,
              status: "draft",
              emailType: "followup_" + state.currentStepNumber
            }
          });
          emailsDrafted++;

          // Immediately advance to next step
          const nextStepNum = state.currentStepNumber + 1;
          const nextStep = await prisma.sequenceStep.findFirst({
            where: { sessionId, stepNumber: nextStepNum }
          });

          if (nextStep) {
            await prisma.leadSequenceState.update({
              where: { id: state.id },
              data: {
                currentStepNumber: nextStepNum,
                nextRunAt: new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000)
              }
            });
          } else {
            await prisma.leadSequenceState.update({
              where: { id: state.id },
              data: { status: "completed" }
            });
            completedLeads++;
          }
        } else {
          // Step is manual (email_manual, call, linkedin_connect, task)
          // We create a Task in the checklist and set state to active, waiting for completion
          const taskType = step.type === "linkedin_connect" ? "linkedin" : 
                           (step.type === "call" ? "call" : "task");
          
          const taskTitle = step.type === "linkedin_connect" ? `Connect with ${state.lead.contactName}` :
                            (step.type === "call" ? `Call ${state.lead.contactName}` : `Task: outreach to ${state.lead.contactName}`);

          // Prevent duplicate tasks
          const existingTask = await prisma.task.findFirst({
            where: {
              leadId: state.leadId,
              type: taskType,
              status: "pending"
            }
          });

          if (!existingTask) {
            await prisma.task.create({
              data: {
                leadId: state.leadId,
                type: taskType,
                title: taskTitle,
                description: step.instructions || "Manual sequencer step.",
                dueDate: new Date(Date.now() + step.delayDays * 24 * 60 * 60 * 1000),
                status: "pending"
              }
            });
            tasksCreated++;
          }
        }
      }

      // Update session metrics
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          emailsSent: { increment: emailsDrafted }
        }
      });

      return NextResponse.json({
        success: true,
        emailsDrafted,
        tasksCreated,
        completedLeads
      });
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (error) {
    console.error("Sequences POST error:", error);
    return NextResponse.json({ error: "Failed to execute sequence request" }, { status: 500 });
  }
}
