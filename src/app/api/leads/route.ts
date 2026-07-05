// Next.js hot-reload trigger
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "";
    const industry = searchParams.get("industry") || "";
    const companySize = searchParams.get("companySize") || "";
    const stage = searchParams.get("stage") || "";
    const sessionId = searchParams.get("sessionId") || "";
    const listId = searchParams.get("listId") || "";
    const tech = searchParams.get("tech") || "";
    const funding = searchParams.get("funding") || "";
    const revenue = searchParams.get("revenue") || "";

    const where: any = {};

    // Keyword Search (Contact Name, Title, Company Name, Email)
    if (search) {
      where.OR = [
        { contactName: { contains: search } },
        { contactTitle: { contains: search } },
        { companyName: { contains: search } },
        { contactEmail: { contains: search } },
      ];
    }

    if (location) {
      where.location = { contains: location };
    }

    if (industry) {
      where.industry = { contains: industry };
    }

    if (companySize) {
      // Handles comma-separated or single values
      if (companySize.includes(",")) {
        where.companySize = { in: companySize.split(",") };
      } else {
        where.companySize = companySize;
      }
    }

    if (stage) {
      where.pipelineStage = stage;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    // Filter by Custom List
    if (listId) {
      where.listLeads = {
        some: {
          listId: listId
        }
      };
    }

    // Advanced filters matching JSON rawData columns (tech, funding, revenue)
    if (tech || funding || revenue) {
      // For SQLite, we can search using rawData contains for quick prototyping, since rawData is a JSON string of company details
      const filterConditions: any[] = [];
      if (tech) {
        filterConditions.push({ rawData: { contains: tech } });
      }
      if (funding) {
        filterConditions.push({ rawData: { contains: funding } });
      }
      if (revenue) {
        filterConditions.push({ rawData: { contains: revenue } });
      }
      
      if (where.OR) {
        // combine
        where.AND = filterConditions;
      } else {
        where.AND = filterConditions;
      }
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limitInput = searchParams.get("limit");
    const limit = limitInput === "all" ? undefined : parseInt(limitInput || "50", 10);
    const skip = limit ? (page - 1) * limit : undefined;
    const take = limit;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        emails: { select: { status: true } },
        listLeads: { select: { listId: true } }
      }
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, leadIds, targetSessionId, leadData, listId } = body;

    // Action 1: Bulk enrolling existing leads to another sequence
    if (action === "enroll" && leadIds && targetSessionId) {
      const targetSession = await prisma.session.findUnique({
        where: { id: targetSessionId }
      });
      if (!targetSession) {
        return NextResponse.json({ error: "Target sequence not found" }, { status: 404 });
      }

      const sourceLeads = await prisma.lead.findMany({
        where: { id: { in: leadIds } }
      });

      const targetExistingLeads = await prisma.lead.findMany({
        where: { sessionId: targetSessionId },
        select: { companyName: true, contactEmail: true }
      });
      const targetKeys = new Set(
        targetExistingLeads.map(l => `${(l.companyName || "").toLowerCase().trim()}|${(l.contactEmail || "").toLowerCase().trim()}`)
      );

      const enrolledLeads = [];
      for (const lead of sourceLeads) {
        const key = `${(lead.companyName || "").toLowerCase().trim()}|${(lead.contactEmail || "").toLowerCase().trim()}`;
        if (targetKeys.has(key)) continue;

        // Duplicate the lead in the database under the new session
        const newLead = await prisma.lead.create({
          data: {
            sessionId: targetSessionId,
            companyName: lead.companyName,
            companyWebsite: lead.companyWebsite,
            companySize: lead.companySize,
            industry: lead.industry,
            location: lead.location,
            contactName: lead.contactName,
            contactEmail: lead.contactEmail,
            contactTitle: lead.contactTitle,
            contactLinkedin: lead.contactLinkedin,
            source: "sequence_enrollment",
            qualificationScore: lead.qualificationScore,
            qualificationReason: lead.qualificationReason,
            pipelineStage: "qualified", // set to qualified by default on enrollment
            rawData: lead.rawData
          }
        });

        // Initialize Lead Sequence State at Step 1
        await prisma.leadSequenceState.create({
          data: {
            leadId: newLead.id,
            sessionId: targetSessionId,
            currentStepNumber: 1,
            status: "active",
            nextRunAt: new Date()
          }
        });

        enrolledLeads.push(newLead);
      }

      await prisma.session.update({
        where: { id: targetSessionId },
        data: {
          totalLeads: { increment: enrolledLeads.length }
        }
      });

      return NextResponse.json({ success: true, count: enrolledLeads.length });
    }

    // Action 2: Bulk adding leads to a custom list
    if (action === "add_to_list" && leadIds && listId) {
      const targetList = await prisma.customList.findUnique({
        where: { id: listId }
      });
      if (!targetList) {
        return NextResponse.json({ error: "Custom List not found" }, { status: 404 });
      }

      let count = 0;
      for (const leadId of leadIds) {
        try {
          await prisma.listLead.create({
            data: {
              listId,
              leadId
            }
          });
          count++;
        } catch (e) {
          // Ignore duplicate mappings
        }
      }

      return NextResponse.json({ success: true, count });
    }

    // Action 3: Create a single new lead manually
    if (action === "create" && leadData) {
      const { sessionId, companyName, contactName, contactEmail, contactTitle, location, industry, companySize, companyWebsite, contactLinkedin } = leadData;
      
      // Default to the first session/sequence in DB if not provided
      let targetSessionId = sessionId;
      if (!targetSessionId) {
        const firstSeq = await prisma.session.findFirst();
        if (!firstSeq) {
          return NextResponse.json({ error: "No sequences exist. Please create a sequence first." }, { status: 400 });
        }
        targetSessionId = firstSeq.id;
      }

      const newLead = await prisma.lead.create({
        data: {
          sessionId: targetSessionId,
          companyName,
          companyWebsite: companyWebsite || null,
          companySize: companySize || "1-10",
          industry: industry || "Technology",
          location: location || "Remote",
          contactName: contactName || "Hiring Team",
          contactEmail: contactEmail || null,
          contactTitle: contactTitle || "Lead Profile",
          contactLinkedin: contactLinkedin || null,
          source: "manual",
          pipelineStage: "generated",
          rawData: JSON.stringify({
            name: companyName,
            website: companyWebsite,
            size: companySize,
            industry,
            location
          })
        }
      });

      // Update session totalLeads
      await prisma.session.update({
        where: { id: targetSessionId },
        data: { totalLeads: { increment: 1 } }
      });

      return NextResponse.json(newLead);
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (error) {
    console.error("Leads POST error:", error);
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 });
  }
}
