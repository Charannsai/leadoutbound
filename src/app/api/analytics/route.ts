import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalLeads,
      qualifiedCount,
      rejectedCount,
      totalSent,
      totalReplies,
      positiveReplies,
      rejectionsReplies,
      bounceReplies,
      templates
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { pipelineStage: { not: "rejected" } } }),
      prisma.lead.count({ where: { pipelineStage: "rejected" } }),
      prisma.leadEmail.count({ where: { status: "sent" } }),
      prisma.reply.count(),
      prisma.reply.count({ where: { classification: { in: ["positive_interest", "interview"] } } }),
      prisma.reply.count({ where: { classification: "rejection" } }),
      prisma.reply.count({ where: { classification: "bounce" } }),
      prisma.template.findMany({
        include: {
          sessions: {
            select: {
              emailsSent: true,
              repliesCount: true
            }
          }
        }
      })
    ]);

    const qualifiedRate = totalLeads > 0 ? ((qualifiedCount / totalLeads) * 100).toFixed(1) : "0.0";
    const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : "0.0";
    const positiveResponseRate = totalReplies > 0 ? ((positiveReplies / totalReplies) * 100).toFixed(1) : "0.0";
    const bounceRate = totalSent > 0 ? ((bounceReplies / totalSent) * 100).toFixed(1) : "0.0";

    const templatePerformance = templates.map(t => {
      let sent = 0;
      let replies = 0;
      t.sessions.forEach(s => {
        sent += s.emailsSent;
        replies += s.repliesCount;
      });

      return {
        id: t.id,
        name: t.name,
        category: t.category,
        tone: t.tone,
        sent,
        replies,
        replyRate: sent > 0 ? ((replies / sent) * 100).toFixed(1) : "0.0"
      };
    });

    return NextResponse.json({
      global: {
        totalLeads,
        qualifiedCount,
        rejectedCount,
        qualifiedRate,
        totalSent,
        totalReplies,
        replyRate,
        positiveReplies,
        rejectionsReplies,
        positiveResponseRate,
        bounceRate
      },
      templates: templatePerformance
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}
