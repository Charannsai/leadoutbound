import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "outreach.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting Apollo B2B Database seeding...");

  // 1. Create default campaigns/sequences
  console.log("Creating Sequences...");
  const seq1 = await prisma.session.create({
    data: {
      name: "SaaS Founders & CEOs - Seed/Series A",
      searchQuery: "Job Title: CEO/Founder, Size: 10-100, Location: US/Remote",
      description: "Direct outreach to early-stage SaaS founders focusing on workflow optimizations.",
      outboundChannel: "email",
      status: "sending"
    }
  });

  const seq2 = await prisma.session.create({
    data: {
      name: "AI Infrastructure Engineering Teams",
      searchQuery: "Job Title: CTO/VPE/Lead Engineer, Industry: AI/ML, Tech: PyTorch",
      description: "Technical sequencing targeting AI/ML infrastructure engineering heads.",
      outboundChannel: "email",
      status: "qualifying"
    }
  });

  const seq3 = await prisma.session.create({
    data: {
      name: "Enterprise Talent Acquisition & Recruitment",
      searchQuery: "Job Title: Recruitment/Talent, Size: 500+",
      description: "Outreach for sourcing partnerships and recruitment agency leads.",
      outboundChannel: "linkedin",
      status: "paused"
    }
  });

  // Create steps for sequences
  console.log("Creating Sequence Steps...");
  await prisma.sequenceStep.createMany({
    data: [
      // Sequence 1 Steps
      {
        sessionId: seq1.id,
        stepNumber: 1,
        type: "email_auto",
        delayDays: 0,
        subject: "Quick question regarding {{companyName}} outreach",
        body: "Hi {{contactName}},\n\nI love what you're building at {{companyName}} and noticed you are scaling your team in {{location}}. \n\nAre you looking at ways to streamline your outbound sales pipeline using AI? Would love to share how we help SaaS companies automate this.\n\nBest,\nCharan"
      },
      {
        sessionId: seq1.id,
        stepNumber: 2,
        type: "linkedin_connect",
        delayDays: 2,
        instructions: "Send a connection request: 'Hi {{contactName}}, would love to connect and follow up on my email regarding {{companyName}} outreach!'"
      },
      {
        sessionId: seq1.id,
        stepNumber: 3,
        type: "call",
        delayDays: 1,
        instructions: "Call {{contactName}} at their office number. Discuss email follow-up."
      },
      {
        sessionId: seq1.id,
        stepNumber: 4,
        type: "email_auto",
        delayDays: 3,
        subject: "Following up: AI outreach demo",
        body: "Hi {{contactName}},\n\nJust checking if you had a moment to read my previous email. I know you're busy running {{companyName}}.\n\nWe recently helped Linear increase their booking rate by 35% using automated personalizations. Let me know if you have 10 mins this week.\n\nBest,\nCharan"
      },

      // Sequence 2 Steps
      {
        sessionId: seq2.id,
        stepNumber: 1,
        type: "email_auto",
        delayDays: 0,
        subject: "Solving GPU hosting bottlenecks for {{companyName}}",
        body: "Hi {{contactName}},\n\nCame across your profile as {{contactTitle}} at {{companyName}}. \n\nWe build tooling that helps teams scaling with {{industry}} optimize their server configurations. Are you experiencing GPU orchestrating bottlenecks?\n\nBest,\nCharan"
      },
      {
        sessionId: seq2.id,
        stepNumber: 2,
        type: "call",
        delayDays: 2,
        instructions: "Call CTO's direct line. Outcome goal: schedule tech intro call."
      },
      {
        sessionId: seq2.id,
        stepNumber: 3,
        type: "email_manual",
        delayDays: 3,
        subject: "Custom deck for {{companyName}}",
        body: "Hi {{contactName}},\n\nFollowing up on my last email, I put together a quick deck on how {{companyName}} can optimize hosting workflows. Let me know if this aligns with your current priorities.\n\nBest,\nCharan"
      }
    ]
  });

  // 2. Seed custom lists
  console.log("Creating Lists...");
  const listSF = await prisma.customList.create({
    data: { name: "Bay Area Founders", description: "CEOs based in San Francisco/San Jose area." }
  });
  const listEnterprise = await prisma.customList.create({
    data: { name: "Tier 1 Enterprise Accounts", description: "Large companies with over 1000 employees." }
  });

  // 3. Companies & Contacts Data (150+ contacts across 15 companies + randomized profiles)
  console.log("Generating B2B Contacts & Companies database...");
  const companyPool = [
    { name: "Linear", website: "https://linear.app", size: "51-200", industry: "SaaS / Project Management", location: "San Francisco, CA", tech: "Next.js, React, Postgres, Tailwind, AWS, Rust", funding: "Series A", revenue: "$10M-$50M", description: "The issue tracker you'll enjoy using. Built for high-performance teams." },
    { name: "Supabase", website: "https://supabase.com", size: "51-200", industry: "Database & Backend SaaS", location: "Singapore / Remote", tech: "Next.js, Postgres, Go, React, Tailwind, GCP", funding: "Series B", revenue: "$10M-$50M", description: "The open source Firebase alternative. Build backends in minutes." },
    { name: "Vercel", website: "https://vercel.com", size: "201-500", industry: "Cloud Infrastructure", location: "New York, NY / Remote", tech: "Next.js, Node.js, AWS, React, Tailwind, Rust", funding: "Series D", revenue: "$50M-$100M", description: "Vercel provides developer tools and hosting infrastructure for web apps." },
    { name: "Stripe", website: "https://stripe.com", size: "500+", industry: "Fintech Infrastructure", location: "San Francisco, CA", tech: "Ruby, Java, React, Scala, AWS, Kafka", funding: "IPO", revenue: "$50M+", description: "Financial infrastructure for the internet. Payment processing tools." },
    { name: "OpenAI", website: "https://openai.com", size: "500+", industry: "Artificial Intelligence", location: "San Francisco, CA", tech: "Python, PyTorch, React, Azure, Kubernetes, Go", funding: "Series E", revenue: "$50M+", description: "AI research and deployment company behind ChatGPT." },
    { name: "Figma", website: "https://figma.com", size: "500+", industry: "Design & SaaS", location: "San Francisco, CA", tech: "React, WebAssembly, C++, Postgres, AWS", funding: "Series E", revenue: "$50M+", description: "Collaborative design platform for modern teams." },
    { name: "Railway", website: "https://railway.app", size: "11-50", industry: "Cloud Hosting & DevOps", location: "Salt Lake City, UT / Remote", tech: "Next.js, Go, Postgres, Redis, GCP, AWS", funding: "Series A", revenue: "$1M-$10M", description: "Railway is an infrastructure platform where you can provision code." },
    { name: "Prisma", website: "https://prisma.io", size: "51-200", industry: "Database Tooling", location: "Berlin, Germany / Remote", tech: "TypeScript, Node.js, Rust, Go, SQLite, AWS", funding: "Series A", revenue: "$1M-$10M", description: "Next-generation Node.js and TypeScript ORM for databases." },
    { name: "Retool", website: "https://retool.com", size: "201-500", industry: "Internal Tooling SaaS", location: "San Francisco, CA", tech: "Node.js, Postgres, React, AWS, Docker", funding: "Series C", revenue: "$10M-$50M", description: "Build internal tools remarkably fast." },
    { name: "PostHog", website: "https://posthog.com", size: "51-200", industry: "Product Analytics", location: "London, UK / Remote", tech: "Python, React, ClickHouse, AWS, Django", funding: "Series B", revenue: "$1M-$10M", description: "Open source product analytics platform." },
    { name: "Resend", website: "https://resend.com", size: "1-10", industry: "Email Infrastructure SaaS", location: "Miami, FL / Remote", tech: "Next.js, React, Node.js, Postgres, AWS", funding: "Seed", revenue: "Under $1M", description: "Email service provider for developers." },
    { name: "Clerk", website: "https://clerk.com", size: "11-50", industry: "Authentication SaaS", location: "San Francisco, CA", tech: "Next.js, React, Node.js, Postgres, AWS", funding: "Series A", revenue: "$1M-$10M", description: "The easiest way to add authentication and user management to Next.js." },
    { name: "Dub", website: "https://dub.co", size: "1-10", industry: "Analytics / Link Management", location: "New York, NY", tech: "Next.js, PlanetScale, Redis, Tailwind", funding: "Seed", revenue: "Under $1M", description: "Open-source link management infrastructure for modern marketing." },
    { name: "Trigger.dev", website: "https://trigger.dev", size: "1-10", industry: "DevOps / Job Scheduler", location: "London, UK", tech: "Next.js, TypeScript, Postgres, Redis, AWS", funding: "Seed", revenue: "Under $1M", description: "Open-source background jobs framework for Next.js." },
    { name: "Axiom", website: "https://axiom.co", size: "11-50", industry: "Log Management / DevTools", location: "London, UK / Remote", tech: "Go, React, ClickHouse, GCP", funding: "Series A", revenue: "$1M-$10M", description: "Serverless log management and analytics." }
  ];

  const firstNames = ["James", "Sarah", "Michael", "Emily", "David", "Jessica", "John", "Amanda", "Robert", "Ashley", "William", "Olivia", "Daniel", "Sophia", "Matthew", "Isabella", "Joseph", "Emma", "Andrew", "Abigail"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
  const titles = [
    { title: "Chief Executive Officer", role: "CEO" },
    { title: "Chief Technology Officer", role: "CTO" },
    { title: "VP of Engineering", role: "VPE" },
    { title: "Lead Software Engineer", role: "Developer" },
    { title: "Head of Talent Acquisition", role: "Recruiter" },
    { title: "Head of Marketing", role: "Marketing" },
    { title: "VP of Enterprise Sales", role: "Sales" },
    { title: "Developer Relations Lead", role: "Developer" },
    { title: "Product Manager", role: "Product" },
    { title: "Talent Acquisition Specialist", role: "Recruiter" }
  ];

  const leadsToCreate = [];

  // Seed actual prominent contacts first for realism
  const keyContacts = [
    // Linear
    { contactName: "Karri Saarinen", contactTitle: "Chief Executive Officer", contactEmail: "karri@linear.app", companyName: "Linear", companyWebsite: "https://linear.app", companySize: "51-200", industry: "SaaS / Project Management", location: "San Francisco, CA", source: "import", qualificationScore: 95 },
    { contactName: "Sarah Jenkins", contactTitle: "VP of Enterprise Sales", contactEmail: "sjenkins@linear.app", companyName: "Linear", companyWebsite: "https://linear.app", companySize: "51-200", industry: "SaaS / Project Management", location: "San Francisco, CA", source: "import", qualificationScore: 88 },
    // Supabase
    { contactName: "Paul Copplestone", contactTitle: "Chief Executive Officer", contactEmail: "paul@supabase.io", companyName: "Supabase", companyWebsite: "https://supabase.com", companySize: "51-200", industry: "Database & Backend SaaS", location: "Singapore / Remote", source: "manual", qualificationScore: 92 },
    { contactName: "Antony Jones", contactTitle: "Chief Technology Officer", contactEmail: "antony@supabase.io", companyName: "Supabase", companyWebsite: "https://supabase.com", companySize: "51-200", industry: "Database & Backend SaaS", location: "Singapore / Remote", source: "manual", qualificationScore: 90 },
    // Vercel
    { contactName: "Guillermo Rauch", contactTitle: "Chief Executive Officer", contactEmail: "rauchg@vercel.com", companyName: "Vercel", companyWebsite: "https://vercel.com", companySize: "201-500", industry: "Cloud Infrastructure", location: "New York, NY", source: "manual", qualificationScore: 98 },
    { contactName: "Lee Robinson", contactTitle: "VP of Developer Experience", contactEmail: "lee@vercel.com", companyName: "Vercel", companyWebsite: "https://vercel.com", companySize: "201-500", industry: "Cloud Infrastructure", location: "New York, NY / Remote", source: "import", qualificationScore: 85 },
    // OpenAI
    { contactName: "Sam Altman", contactTitle: "Chief Executive Officer", contactEmail: "sam@openai.com", companyName: "OpenAI", companyWebsite: "https://openai.com", companySize: "500+", industry: "Artificial Intelligence", location: "San Francisco, CA", source: "import", qualificationScore: 99 },
    // Railway
    { contactName: "Jake Cooper", contactTitle: "Chief Executive Officer", contactEmail: "jake@railway.app", companyName: "Railway", companyWebsite: "https://railway.app", companySize: "11-50", industry: "Cloud Hosting & DevOps", location: "Salt Lake City, UT", source: "manual", qualificationScore: 89 },
    // Resend
    { contactName: "Zeno Rocha", contactTitle: "Chief Executive Officer", contactEmail: "zeno@resend.com", companyName: "Resend", companyWebsite: "https://resend.com", companySize: "1-10", industry: "Email Infrastructure SaaS", location: "Miami, FL", source: "import", qualificationScore: 93 },
    // Dub
    { contactName: "Steven Tey", contactTitle: "Chief Executive Officer", contactEmail: "steven@dub.co", companyName: "Dub", companyWebsite: "https://dub.co", companySize: "1-10", industry: "Analytics / Link Management", location: "New York, NY", source: "manual", qualificationScore: 91 }
  ];

  // Distribute key contacts into campaigns (sequences)
  let idx = 0;
  for (const c of keyContacts) {
    const targetSeqId = idx % 2 === 0 ? seq1.id : seq2.id;
    const cleanComp = companyPool.find(co => co.name === c.companyName)!;
    
    leadsToCreate.push({
      ...c,
      sessionId: targetSeqId,
      pipelineStage: idx % 3 === 0 ? "replied" : (idx % 2 === 0 ? "qualified" : "sent"),
      rawData: JSON.stringify({ ...cleanComp, contactName: c.contactName, email: c.contactEmail })
    });
    idx++;
  }

  // Generate another 140+ contacts to reach 150+ contacts total
  const totalGenerations = 145;
  for (let i = 0; i < totalGenerations; i++) {
    const company = companyPool[i % companyPool.length];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const contactName = `${firstName} ${lastName}`;
    
    const titleObj = titles[Math.floor(Math.random() * titles.length)];
    
    const emailDomain = company.website.replace("https://", "").replace("www.", "");
    const contactEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`;
    
    const seedSessionId = i % 3 === 0 ? seq1.id : (i % 3 === 1 ? seq2.id : seq3.id);
    
    const stages = ["generated", "qualified", "personalized", "approved", "sent", "replied", "bounced", "rejected"];
    const pipelineStage = stages[Math.floor(Math.random() * stages.length)];

    leadsToCreate.push({
      sessionId: seedSessionId,
      companyName: company.name,
      companyWebsite: company.website,
      companySize: company.size,
      industry: company.industry,
      location: company.location,
      contactName,
      contactEmail,
      contactTitle: titleObj.title,
      contactLinkedin: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      source: i % 2 === 0 ? "apify" : "manual",
      qualificationScore: Math.floor(Math.random() * 40) + 60,
      qualificationReason: `Matches role criteria for ${titleObj.role} in ${company.industry}.`,
      pipelineStage,
      rawData: JSON.stringify(company)
    });
  }

  console.log(`Saving ${leadsToCreate.length} leads in database...`);
  const createdLeads = [];
  for (const lead of leadsToCreate) {
    const created = await prisma.lead.create({ data: lead });
    createdLeads.push(created);
  }

  console.log(`Leads seeded successfully.`);

  // 4. Enroll leads to Custom Lists
  console.log("Enrolling leads to custom lists...");
  // Bay Area list (CEOs based in SF)
  const bayLeads = createdLeads.filter(l => l.location?.includes("San Francisco") || l.location?.includes("SF"));
  for (const bl of bayLeads.slice(0, 15)) {
    await prisma.listLead.create({
      data: { listId: listSF.id, leadId: bl.id }
    }).catch(() => {});
  }

  // Enterprise list (size 500+)
  const entLeads = createdLeads.filter(l => l.companySize === "500+");
  for (const el of entLeads.slice(0, 15)) {
    await prisma.listLead.create({
      data: { listId: listEnterprise.id, leadId: el.id }
    }).catch(() => {});
  }

  // 5. Create Lead Sequence States to track progress
  console.log("Creating lead sequence states...");
  for (const lead of createdLeads.slice(0, 50)) {
    await prisma.leadSequenceState.create({
      data: {
        leadId: lead.id,
        sessionId: lead.sessionId,
        currentStepNumber: Math.floor(Math.random() * 3) + 1,
        status: lead.pipelineStage === "replied" ? "replied" : (lead.pipelineStage === "rejected" ? "paused" : "active"),
        nextRunAt: new Date(Date.now() + Math.random() * 3 * 24 * 60 * 60 * 1000)
      }
    }).catch(() => {});
  }

  // 6. Create Deals (Kanban Pipeline)
  console.log("Creating Deals...");
  const dealStages = ["prospecting", "qualified", "proposal", "won", "lost"];
  const dealLeads = createdLeads.filter(l => l.pipelineStage === "replied" || l.pipelineStage === "qualified");
  
  for (let d = 0; d < 10; d++) {
    if (!dealLeads[d]) break;
    const stage = dealStages[d % dealStages.length];
    const amount = (Math.floor(Math.random() * 9) + 1) * 5000;
    
    await prisma.deal.create({
      data: {
        name: `${dealLeads[d].companyName} - Team Account License`,
        stage,
        amount,
        leadId: dealLeads[d].id
      }
    });
  }

  // 7. Create Scheduled Meetings (Calendar)
  console.log("Creating Meetings...");
  const meetingLeads = createdLeads.filter(l => l.pipelineStage === "replied");
  for (let m = 0; m < 4; m++) {
    if (!meetingLeads[m]) break;
    const today = new Date();
    const startTime = new Date(today);
    startTime.setDate(today.getDate() + (m - 1)); // spreads meetings across yesterday, today, and tomorrow
    startTime.setHours(10 + m, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(30);

    await prisma.meeting.create({
      data: {
        title: `Intro Call: Outreach Automation / ${meetingLeads[m].companyName}`,
        startTime,
        endTime,
        leadId: meetingLeads[m].id,
        status: m === 0 ? "completed" : "scheduled"
      }
    });
  }

  // 8. Create Tasks (Manual steps)
  console.log("Creating Tasks...");
  const taskLeads = createdLeads.filter(l => l.pipelineStage === "qualified" || l.pipelineStage === "sent");
  const taskTypes = ["email_manual", "call", "linkedin", "task"];
  
  for (let t = 0; t < 12; t++) {
    if (!taskLeads[t]) break;
    const type = taskTypes[t % taskTypes.length];
    const status = t % 3 === 0 ? "completed" : "pending";
    
    await prisma.task.create({
      data: {
        leadId: taskLeads[t].id,
        type,
        title: type === "call" ? `Call ${taskLeads[t].contactName} (${taskLeads[t].companyName})` : 
               (type === "linkedin" ? `Connect with ${taskLeads[t].contactName} on LinkedIn` : `Follow up manual draft for ${taskLeads[t].companyName}`),
        description: `Apollo manual outreach task linked to ${taskLeads[t].companyName}.`,
        dueDate: new Date(Date.now() + (t - 4) * 12 * 60 * 60 * 1000), // mix of past and future due dates
        status
      }
    });
  }

  // 9. Log Calls (Call Log Histories)
  console.log("Creating Call logs...");
  const callLeads = createdLeads.filter(l => l.pipelineStage === "sent" || l.pipelineStage === "replied");
  const outcomes = ["connected", "busy", "no_answer", "meeting_scheduled", "left_voicemail"];
  const notes = [
    "No answer, left a brief voicemail outlining our project goals.",
    "Connected! Discussed current hiring challenges and tech stack. Paul asked to see a demo next Tuesday.",
    "Rang multiple times, line was busy. Will call again tomorrow.",
    "Lead answered and requested we send an email case study first before booking a call.",
    "Connected with gatekeeper, CEO is out of office until next Monday."
  ];

  for (let c = 0; c < 8; c++) {
    if (!callLeads[c]) break;
    const outcome = outcomes[c % outcomes.length];
    
    await prisma.callLog.create({
      data: {
        leadId: callLeads[c].id,
        outcome,
        notes: notes[c % notes.length],
        duration: outcome === "connected" || outcome === "meeting_scheduled" ? Math.floor(Math.random() * 200) + 60 : 0
      }
    });
  }

  // 10. Automated Workflows rules
  console.log("Creating Workflow automations...");
  await prisma.workflow.createMany({
    data: [
      {
        name: "Auto-create Deal on Interest",
        trigger: "lead_replied",
        action: "move_deal",
        isActive: true
      },
      {
        name: "LinkedIn Connection Task Generator",
        trigger: "call_logged",
        action: "create_task",
        isActive: true
      },
      {
        name: "Sync replies to database",
        trigger: "email_opened",
        action: "update_lead",
        isActive: false
      }
    ]
  });

  // 11. Saved Searches
  console.log("Creating Saved Searches...");
  await prisma.savedSearch.createMany({
    data: [
      {
        name: "SaaS CEOs in San Francisco",
        filters: JSON.stringify({ search: "CEO", location: "San Francisco", companySize: ["11-50", "51-200"] })
      },
      {
        name: "AI Eng Leads in Berlin/London",
        filters: JSON.stringify({ search: "CTO Lead Engineering", location: "London Berlin", industry: "Artificial Intelligence" })
      }
    ]
  });

  console.log("✅ Apollo Clone database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
