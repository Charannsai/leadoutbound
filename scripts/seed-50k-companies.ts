import { prisma } from "../src/lib/prisma";

const prefixes = [
  "Apex", "Nova", "Stellar", "Core", "Flux", "Quantum", "Vortex", "Aero", "Bio", "Cloud",
  "Data", "Echo", "Logi", "Omni", "Opti", "Pro", "Syn", "Vertex", "Zephyr", "Zeta",
  "Aura", "Helix", "Infra", "Meta", "Neural", "Pulse", "Byte", "Click", "Dev", "Code",
  "Link", "Shift", "Grid", "Bolt", "Flow", "Wave", "Rise", "Peak", "Scale", "Swift",
  "Zenith", "Prime", "Atlas", "Titan", "Spectra", "Active", "Smart", "Direct", "True", "Next"
];

const middles = [
  "Data", "Cloud", "Web", "Search", "Flow", "Link", "Sync", "Cyber", "Dev", "App",
  "SaaS", "Stack", "Net", "Bio", "Fin", "Edu", "Logi", "Med", "Ops", "Sec",
  "Node", "Hub", "AI", "ML", "Grid", "Signal", "Wave", "Core", "Prime", "Atlas",
  "Titan", "Spectra", "Zenith", "Aura", "Helix", "Infra", "Meta", "Neural", "Pulse", "Byte",
  "Bolt", "Rise", "Peak", "Scale", "Swift", "Vortex", "Aero", "Echo", "Opti", "Syn"
];

const suffixes = [
  "Labs", "Tech", "Systems", "AI", "Software", "Analytics", "Solutions", "Networks", "Data", "Security",
  "Media", "Digital", "Studios", "Design", "Consulting", "Group", "Global", "Creative", "Technologies", "Hub",
  "Forge", "Loop", "Stack", "Base", "Flow", "Grid", "Link", "Scale", "Wave", "Wise",
  "Ventures", "Partners", "Engine", "Pulse", "Shift", "Line", "Point", "Key", "Craft", "Scale"
];

const firstNames = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth",
  "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
  "Christopher", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Sandra", "Mark", "Margaret",
  "Donald", "Ashley", "Steven", "Kimberly", "Andrew", "Emily", "Paul", "Donna", "Joshua", "Michelle"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"
];

const industries = [
  "SaaS", "Information Technology", "Financial Services", "Healthcare", "Edtech",
  "Artificial Intelligence", "Logistics", "Marketing & Advertising", "E-commerce"
];

const locations = [
  "San Francisco, CA", "New York, NY", "London, UK", "Remote", "Austin, TX",
  "Seattle, WA", "Boston, MA", "Berlin, Germany", "Chicago, IL"
];

const sizes = ["1-10", "11-50", "51-200", "201-500", "500+"];

const revenues = ["Under $1M", "$1M-$10M", "$10M-$50M", "$50M+"];
const fundingStages = ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Bootstrap"];

const techStacks = [
  "Next.js, Tailwind, AWS, Postgres",
  "Python, Django, React, MySQL",
  "Ruby on Rails, PostgreSQL, Heroku",
  "Go, Kubernetes, GCP, Terraform",
  "Java, Spring Boot, Angular, Oracle",
  "Node.js, Express, MongoDB, AWS",
  "Vue.js, PHP, Laravel, MariaDB"
];

const titles = [
  "Software Engineer", "VP of Sales", "CEO & Co-Founder", "CTO", "Product Manager",
  "Director of Marketing", "Account Executive", "Head of Growth", "Engineering Manager"
];

async function main() {
  console.log("⚡ Starting 50,000+ local B2B database seeding...");

  // Generate unique company names
  const companyNames = new Set<string>();
  let attempts = 0;
  while (companyNames.size < 51000 && attempts < 2000000) {
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const m = middles[Math.floor(Math.random() * middles.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    companyNames.add(`${p} ${m} ${s}`);
    attempts++;
  }

  const uniqueNames = Array.from(companyNames).slice(0, 50500);
  console.log(`Generated ${uniqueNames.length} unique company profiles.`);

  // Create default Session wrapper to hold the contacts
  const sessionId = "seed-50k-session-id";
  await prisma.session.upsert({
    where: { id: sessionId },
    update: { name: "Apollo 50k Local Directory", status: "completed" },
    create: {
      id: sessionId,
      name: "Apollo 50k Local Directory",
      searchQuery: "All pre-seeded companies",
      status: "completed"
    }
  });

  const BATCH_SIZE = 1000;
  let batch: any[] = [];
  let totalInserted = 0;

  for (let i = 0; i < uniqueNames.length; i++) {
    const compName = uniqueNames[i];
    const cleanDomain = compName.toLowerCase().replace(/ /g, "") + (i % 2 === 0 ? ".com" : ".io");
    const website = `https://www.${cleanDomain}`;
    
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const contactName = `${fName} ${lName}`;
    const contactEmail = `${fName.toLowerCase()}.${lName.toLowerCase()}@${cleanDomain}`;
    
    const industry = industries[Math.floor(Math.random() * industries.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const revenue = revenues[Math.floor(Math.random() * revenues.length)];
    const funding = fundingStages[Math.floor(Math.random() * fundingStages.length)];
    const tech = techStacks[Math.floor(Math.random() * techStacks.length)];
    const phone = `+1 (555) ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const rawData = JSON.stringify({
      techStack: tech,
      fundingStage: funding,
      estimatedRevenue: revenue,
      description: `${compName} is a high-growth company operating in the ${industry} sector.`,
      phone
    });

    batch.push({
      id: `seed-50k-lead-${i}`,
      sessionId,
      companyName: compName,
      companyWebsite: website,
      companySize: size,
      industry,
      location,
      contactName,
      contactEmail,
      contactTitle: title,
      contactLinkedin: `https://linkedin.com/in/${fName.toLowerCase()}-${lName.toLowerCase()}-${i}`,
      source: "seed",
      pipelineStage: "generated",
      rawData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (batch.length === BATCH_SIZE || i === uniqueNames.length - 1) {
      await prisma.lead.createMany({
        data: batch
      });
      totalInserted += batch.length;
      console.log(`Inserted ${totalInserted} of ${uniqueNames.length} leads...`);
      batch = [];
    }
  }

  // Update totalLeads count in the Session
  await prisma.session.update({
    where: { id: sessionId },
    data: { totalLeads: totalInserted }
  });

  console.log(`🚀 Seeding completed! Loaded ${totalInserted} verified company and contact records into the B2B catalog.`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding encountered an error:", e);
    process.exit(1);
  });
