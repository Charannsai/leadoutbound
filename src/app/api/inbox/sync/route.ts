import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken, getGmailTokenInfo } from "@/lib/gmail";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const tokens = await getGmailTokenInfo();
    const geminiClient = await getGeminiClient().catch(() => null);

    // If Gmail is not connected, run mock sync to allow showcase/demonstration
    if (!tokens || !tokens.accessToken) {
      const syncResult = await runMockSync(geminiClient);
      return NextResponse.json({ success: true, ...syncResult, mock: true });
    }

    const accessToken = await getValidAccessToken();

    // Find sent emails that don't have replies checked recently
    const sentEmails = await prisma.leadEmail.findMany({
      where: {
        status: "sent",
        gmailThreadId: { not: null }
      },
      include: {
        lead: true
      }
    });

    let newRepliesCount = 0;
    const syncedThreads: string[] = [];

    for (const email of sentEmails) {
      if (!email.gmailThreadId) continue;
      if (syncedThreads.includes(email.gmailThreadId)) continue;
      syncedThreads.push(email.gmailThreadId);

      try {
        const threadRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${email.gmailThreadId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!threadRes.ok) continue;
        const thread = await threadRes.json();
        const messages = thread.messages || [];

        // Check for messages not sent by us (From !== connected email)
        const incomingMessages = messages.filter((msg: any) => {
          const fromHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "from")?.value || "";
          return !fromHeader.includes(tokens.email);
        });

        for (const msg of incomingMessages) {
          const replyExists = await prisma.reply.findFirst({
            where: { gmailMessageId: msg.id }
          });

          if (replyExists) continue;

          // Extract body text
          let bodyText = "";
          const parts = msg.payload?.parts || [];
          const textPart = parts.find((p: any) => p.mimeType === "text/plain");
          if (textPart && textPart.body?.data) {
            bodyText = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          } else if (msg.payload?.body?.data) {
            bodyText = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
          }

          const fromHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "from")?.value || "";
          const fromName = fromHeader.split("<")[0]?.trim() || "";
          const fromEmail = fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader;
          const subject = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "subject")?.value || "";

          // AI Classification
          let classification = "info_request";
          if (geminiClient) {
            try {
              const classPrompt = `Classify this incoming cold outreach reply email into exactly one of these labels:
- positive_interest: Expresses willingness to connect, meet, or jump on a call.
- interview: Specifically requests an interview or application submission.
- pricing: Asks for pricing or freelance rate information.
- info_request: Asks for more details, portfolio, or resume.
- auto_response: Out of office or automated reply.
- rejection: Clearly states not interested or no openings.
- bounce: Delivery failure bounce message.
- spam: Junk mail.

Email Body:
${bodyText}

Respond strictly with the label string, nothing else.`;
              const classText = await geminiClient.generateContent(classPrompt, "You are a sentiment and classification assistant.");
              const cleanClass = classText.trim().toLowerCase();
              if (["positive_interest", "interview", "pricing", "info_request", "auto_response", "rejection", "bounce", "spam"].includes(cleanClass)) {
                classification = cleanClass;
              }
            } catch (err) {
              console.error("Gemini classification failed:", err);
            }
          } else {
            // Basic regex classification
            const lowerBody = bodyText.toLowerCase();
            if (lowerBody.includes("interview") || lowerBody.includes("schedule")) classification = "interview";
            else if (lowerBody.includes("call") || lowerBody.includes("meet") || lowerBody.includes("zoom")) classification = "positive_interest";
            else if (lowerBody.includes("unsubscribe") || lowerBody.includes("not interested")) classification = "rejection";
          }

          // Create Reply
          await prisma.$transaction([
            prisma.reply.create({
              data: {
                leadId: email.leadId,
                gmailThreadId: email.gmailThreadId,
                gmailMessageId: msg.id,
                subject,
                body: bodyText,
                fromEmail,
                fromName,
                classification,
                isRead: false,
                receivedAt: new Date(Number(msg.internalDate) || Date.now())
              }
            }),
            prisma.lead.update({
              where: { id: email.leadId },
              data: { pipelineStage: "replied" }
            }),
            prisma.session.update({
              where: { id: email.lead.sessionId },
              data: {
                repliesCount: { increment: 1 }
              }
            })
          ]);

          newRepliesCount++;
        }
      } catch (err) {
        console.error(`Failed to sync thread ${email.gmailThreadId}:`, err);
      }
    }

    return NextResponse.json({ success: true, count: newRepliesCount, mock: false });
  } catch (error) {
    console.error("Inbox sync API error:", error);
    return NextResponse.json({ error: "Failed to sync inbox" }, { status: 500 });
  }
}

async function runMockSync(geminiClient: any) {
  // Find a sent lead email that has no reply yet
  const sentEmail = await prisma.leadEmail.findFirst({
    where: {
      status: "sent",
      lead: {
        replies: { none: {} }
      }
    },
    include: { lead: true }
  });

  if (!sentEmail) {
    return { count: 0, message: "No active sent emails available to mock a reply." };
  }

  const mockReplies = [
    {
      body: "Hi! Thanks for reaching out. I looked at your resume and experience. We'd love to schedule a quick 15-minute call. Here's my Calendly link: calendly.com/discuss-opportunities. Let me know what works!",
      subject: `Re: ${sentEmail.subject}`,
      classification: "positive_interest"
    },
    {
      body: "Hello, thank you for writing in. Unfortunately we don't have openings matching your background at this time, but I'll keep your profile in our database for future contract needs.",
      subject: `Re: ${sentEmail.subject}`,
      classification: "rejection"
    }
  ];

  // Pick one randomly
  const replyMock = mockReplies[Math.floor(Math.random() * mockReplies.length)];

  await prisma.$transaction([
    prisma.reply.create({
      data: {
        leadId: sentEmail.leadId,
        gmailThreadId: sentEmail.gmailThreadId || `mock_thread_${Date.now()}`,
        gmailMessageId: `mock_reply_msg_${Date.now()}`,
        subject: replyMock.subject,
        body: replyMock.body,
        fromEmail: sentEmail.lead.contactEmail || "hiring@company.com",
        fromName: sentEmail.lead.contactName || "Hiring Lead",
        classification: replyMock.classification,
        isRead: false,
        receivedAt: new Date()
      }
    }),
    prisma.lead.update({
      where: { id: sentEmail.leadId },
      data: { pipelineStage: "replied" }
    }),
    prisma.session.update({
      where: { id: sentEmail.lead.sessionId },
      data: {
        repliesCount: { increment: 1 }
      }
    })
  ]);

  return { count: 1, message: "Mock reply synced successfully." };
}
