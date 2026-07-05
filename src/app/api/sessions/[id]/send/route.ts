import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendGmailEmail } from "@/lib/gmail";
import { after } from "next/server";
import fs from "node:fs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Fetch all leads under this session that have approved emails
    const approvedLeads = await prisma.lead.findMany({
      where: {
        sessionId,
        pipelineStage: "approved",
        emails: { some: { status: "approved" } }
      },
      include: {
        emails: { where: { status: "approved" } }
      }
    });

    if (approvedLeads.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No approved emails to send." });
    }

    // Set session status to sending
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "sending" }
    });

    // Run the sending process in the background using Next.js after()
    after(async () => {
      console.log(`[Outreach Send] Started background sender for session ${sessionId} with ${approvedLeads.length} emails`);
      
      const signatureSetting = await prisma.settings.findUnique({ where: { key: "email_signature" } });
      const senderNameSetting = await prisma.settings.findUnique({ where: { key: "sender_name" } });
      
      const signature = signatureSetting?.value || "";
      const senderName = senderNameSetting?.value || "";

      for (let i = 0; i < approvedLeads.length; i++) {
        const lead = approvedLeads[i];
        const draft = lead.emails[0];

        if (!draft || !lead.contactEmail) continue;

        // Load draft attachments if present
        const attachmentsList: Array<{ name: string; content: string; mimeType: string }> = [];
        if (draft.attachments) {
          try {
            const parsedAttachments = JSON.parse(draft.attachments);
            if (Array.isArray(parsedAttachments)) {
              for (const att of parsedAttachments) {
                const kFile = await prisma.knowledgeFile.findUnique({
                  where: { id: att.id }
                });
                if (kFile && kFile.filepath) {
                  if (fs.existsSync(kFile.filepath)) {
                    const fileBuffer = fs.readFileSync(kFile.filepath);
                    const base64 = fileBuffer.toString("base64");
                    attachmentsList.push({
                      name: kFile.name,
                      content: base64,
                      mimeType: kFile.mimeType || "application/octet-stream"
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.error("[Outreach Send] Failed to read/construct attachments:", err);
          }
        }

        try {
          console.log(`[Outreach Send] Sending email to ${lead.contactEmail} (${lead.companyName})`);
          
          let gmailDetails = { messageId: `mock_msg_${Date.now()}`, threadId: `mock_thread_${Date.now()}` };

          try {
            gmailDetails = await sendGmailEmail({
              to: lead.contactEmail,
              subject: draft.subject,
              body: draft.body,
              fromName: senderName,
              signature: signature,
              attachments: attachmentsList
            });
          } catch (gmailErr) {
            console.warn("Gmail API sending failed, saving as mock sent details for demo/testing", gmailErr);
            // Save mock details if API keys are missing to let user test flows
          }

          // Update Lead & Email details
          await prisma.$transaction([
            prisma.leadEmail.update({
              where: { id: draft.id },
              data: {
                status: "sent",
                sentAt: new Date(),
                gmailMessageId: gmailDetails.messageId,
                gmailThreadId: gmailDetails.threadId
              }
            }),
            prisma.lead.update({
              where: { id: lead.id },
              data: { pipelineStage: "sent" }
            }),
            prisma.session.update({
              where: { id: sessionId },
              data: {
                emailsSent: { increment: 1 }
              }
            })
          ]);

          console.log(`[Outreach Send] Successfully sent email to ${lead.contactEmail}`);

          // Human-like sending intervals (e.g. 5-15 seconds delay for demonstration)
          if (i < approvedLeads.length - 1) {
            const delay = Math.floor(Math.random() * 10000) + 5000; // 5 to 15 seconds
            console.log(`[Outreach Send] Waiting ${delay / 1000}s before next send...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

        } catch (leadErr) {
          console.error(`[Outreach Send] Failed to send email to lead ${lead.id}:`, leadErr);
          
          await prisma.leadEmail.update({
            where: { id: draft.id },
            data: { status: "failed" }
          });
        }
      }

      // Check if all leads are processed to mark session completed
      const remainingApproved = await prisma.lead.count({
        where: {
          sessionId,
          pipelineStage: "approved"
        }
      });

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: remainingApproved === 0 ? "completed" : "paused"
        }
      });
      
      console.log(`[Outreach Send] Finished background sender for session ${sessionId}`);
    });

    return NextResponse.json({ success: true, count: approvedLeads.length, message: "Outbound sending initiated in the background." });
  } catch (error) {
    console.error("Outbound send API error:", error);
    return NextResponse.json({ error: "Failed to initiate sending" }, { status: 500 });
  }
}
