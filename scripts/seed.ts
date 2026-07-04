import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "outreach.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

const defaultTemplates = [
  {
    name: "Job Application",
    category: "job_application",
    description: "Apply to open positions at companies you've discovered",
    subjectRules: "Reference the specific role and company. Keep it under 8 words. Avoid generic phrases like 'Application for...'",
    bodyInstructions: "Open with a specific reference to the company's recent work or news. Connect your experience directly to their tech stack and requirements. Show genuine interest in their mission. Close with a clear call to action for a brief conversation.",
    tone: "professional",
    followUpEnabled: true,
    followUpCount: 2,
    followUpDelayDays: 4,
    followUpInstructions: "First follow-up: Add value by sharing a relevant insight or article about their industry. Second follow-up: Brief and friendly check-in, mention availability.",
    attachResume: true,
    attachPortfolio: false,
    isDefault: true,
  },
  {
    name: "Startup Founder Outreach",
    category: "startup_founder",
    description: "Connect directly with startup founders about opportunities",
    subjectRules: "Reference their product or a specific achievement. Be conversational. Avoid corporate language.",
    bodyInstructions: "Start by acknowledging something specific about their startup—product launch, funding, tech choice. Explain what you can bring to their specific challenges. Keep it concise—founders are busy. Focus on value you can deliver, not just your background.",
    tone: "casual",
    followUpEnabled: true,
    followUpCount: 2,
    followUpDelayDays: 5,
    followUpInstructions: "First follow-up: Share a quick thought on their product or industry. Second follow-up: Short and direct, offer flexibility on timing.",
    attachResume: false,
    attachPortfolio: true,
    isDefault: true,
  },
  {
    name: "Recruiter Outreach",
    category: "recruiter",
    description: "Reach out to recruiters who are hiring for relevant roles",
    subjectRules: "Mention the specific role or tech stack you're interested in. Be direct and clear.",
    bodyInstructions: "Be upfront about what you're looking for. Highlight your most relevant experience and metrics. Make it easy for the recruiter to match you with open positions. Include preferred role type, location flexibility, and availability.",
    tone: "professional",
    followUpEnabled: true,
    followUpCount: 1,
    followUpDelayDays: 7,
    followUpInstructions: "Brief follow-up checking if they have any matching opportunities. Mention flexibility on role scope.",
    attachResume: true,
    attachPortfolio: false,
    isDefault: true,
  },
  {
    name: "Freelance Client Outreach",
    category: "freelance",
    description: "Pitch freelance services to potential clients",
    subjectRules: "Focus on the problem you can solve. Reference their specific situation. Avoid 'freelancer available' language.",
    bodyInstructions: "Identify a specific problem or improvement opportunity for their product/company. Present your solution briefly with supporting evidence from past work. Include a concrete next step—a quick audit, a prototype, or a discovery call.",
    tone: "professional",
    followUpEnabled: true,
    followUpCount: 2,
    followUpDelayDays: 4,
    followUpInstructions: "First follow-up: Share a specific example or case study relevant to their situation. Second follow-up: Offer a quick free consultation or audit.",
    attachResume: false,
    attachPortfolio: true,
    isDefault: true,
  },
  {
    name: "Agency Outreach",
    category: "agency",
    description: "Connect with agencies looking for contract developers",
    subjectRules: "Position yourself as a solution to their capacity needs. Reference their specialization.",
    bodyInstructions: "Show that you understand their agency model and client work. Highlight relevant tech skills and experience with agency workflows. Emphasize reliability, communication, and ability to integrate with existing teams. Mention rate range and availability.",
    tone: "professional",
    followUpEnabled: true,
    followUpCount: 2,
    followUpDelayDays: 5,
    followUpInstructions: "First follow-up: Mention a specific area where you could add value. Second follow-up: Short check-in with updated availability.",
    attachResume: true,
    attachPortfolio: true,
    isDefault: true,
  },
  {
    name: "SaaS Sales Outreach",
    category: "saas_sales",
    description: "Reach out to companies that could benefit from your SaaS product",
    subjectRules: "Lead with the outcome or benefit. Reference a specific pain point. Avoid salesy language.",
    bodyInstructions: "Open with an observation about their current approach or a pain point you've identified. Present your solution as a natural fit. Include one key metric or result from existing users. End with a soft CTA—demo, trial, or quick chat.",
    tone: "casual",
    followUpEnabled: true,
    followUpCount: 3,
    followUpDelayDays: 3,
    followUpInstructions: "First: Share a relevant case study. Second: Offer a specific benefit or limited-time offer. Third: Brief breakup email acknowledging they might not be interested.",
    attachResume: false,
    attachPortfolio: false,
    isDefault: true,
  },
  {
    name: "Partnership Outreach",
    category: "partnerships",
    description: "Propose partnerships, integrations, or collaborations",
    subjectRules: "Frame as a mutual opportunity. Reference something specific about their product or audience.",
    bodyInstructions: "Establish credibility quickly. Explain the partnership idea clearly—what you bring, what you need, and how both sides benefit. Be specific about the proposed collaboration format. Suggest a brief call to explore further.",
    tone: "professional",
    followUpEnabled: true,
    followUpCount: 2,
    followUpDelayDays: 5,
    followUpInstructions: "First follow-up: Add more detail about the partnership opportunity. Second follow-up: Brief and friendly, offer alternative contact methods.",
    attachResume: false,
    attachPortfolio: false,
    isDefault: true,
  },
  {
    name: "Investor Outreach",
    category: "investor",
    description: "Connect with investors for fundraising or advisory relationships",
    subjectRules: "Lead with traction or a compelling hook. Keep it intriguing but not clickbaity.",
    bodyInstructions: "Start with your most impressive traction metric or unique insight. Explain the problem, your solution, and why now. Mention relevant social proof—team background, advisors, early customers. Keep it under 200 words. End with a specific ask.",
    tone: "formal",
    followUpEnabled: true,
    followUpCount: 2,
    followUpDelayDays: 7,
    followUpInstructions: "First follow-up: Share a recent milestone or update. Second follow-up: Brief check-in, mention any new traction.",
    attachResume: false,
    attachPortfolio: false,
    isDefault: true,
  },
  {
    name: "Referral Requests",
    category: "referral",
    description: "Ask existing contacts for introductions and referrals",
    subjectRules: "Be personal and direct. Reference your relationship or mutual connection.",
    bodyInstructions: "Acknowledge the relationship warmly. Be specific about what you're looking for—role type, company stage, industry. Make it easy for them to help by providing a forwardable blurb. Express genuine appreciation regardless of outcome.",
    tone: "casual",
    followUpEnabled: false,
    followUpCount: 0,
    followUpDelayDays: 0,
    followUpInstructions: "",
    attachResume: true,
    attachPortfolio: false,
    isDefault: true,
  },
  {
    name: "General Business Development",
    category: "general_bd",
    description: "Flexible template for general business outreach",
    subjectRules: "Adapt to context. Be specific to the recipient's situation. Avoid generic subjects.",
    bodyInstructions: "Research the recipient and their company. Open with something specific that shows genuine interest. Clearly state why you're reaching out and what value you bring. Keep it brief—under 150 words. Include a clear, low-friction next step.",
    tone: "professional",
    followUpEnabled: true,
    followUpCount: 2,
    followUpDelayDays: 4,
    followUpInstructions: "First follow-up: Add additional context or value. Second follow-up: Brief and final, leave the door open.",
    attachResume: false,
    attachPortfolio: false,
    isDefault: true,
  },
];

import { pathToFileURL } from "node:url";

let prisma: any;

async function main() {
  const clientPath = path.resolve(process.cwd(), "src", "generated", "prisma", "client.ts");
  const { PrismaClient } = await import(pathToFileURL(clientPath).href);
  prisma = new PrismaClient({ adapter });

  console.log("🌱 Seeding database...");

  // Seed templates
  const existingTemplates = await prisma.template.count();
  if (existingTemplates === 0) {
    for (const template of defaultTemplates) {
      await prisma.template.create({ data: template });
    }
    console.log(`  ✓ Created ${defaultTemplates.length} default templates`);
  } else {
    console.log(`  → Skipping templates (${existingTemplates} already exist)`);
  }

  // Seed default settings
  const defaultSettings = [
    { key: "gemini_model", value: "gemini-2.0-flash" },
    { key: "gmail_redirect_uri", value: "https://ykiwsxkycybntfjklxvk.supabase.co/auth/v1/callback" },
  ];

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("  ✓ Default settings configured");

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
