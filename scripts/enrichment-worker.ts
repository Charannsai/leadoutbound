import { prisma } from "../src/lib/prisma";
import * as http from "http";
import * as https from "https";

// Common B2B Tech Stack signatures in HTML source
const TECH_SIGNATURES: Record<string, string[]> = {
  "Google Analytics": ["google-analytics.com", "gtag", "googletagmanager.com"],
  "HubSpot": ["js.hs-scripts.com", "hs-analytics", "hubspot.com"],
  "Shopify": ["cdn.shopify.com", "shopify-payment-button", "Shopify.theme"],
  "Stripe": ["js.stripe.com", "stripe-checkout"],
  "WordPress": ["wp-content", "wp-includes"],
  "Webflow": ["uploads.ssl.webflow.com", "data-wf-page"],
  "Intercom": ["widget.intercom.io/widget"],
  "Hotjar": ["static.hotjar.com", "hjSiteSettings"],
  "Salesforce": ["salesforce.com", "force.com"],
  "Cloudflare": ["cloudflare-static", "email-decode.min.js"]
};

// Regex patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const META_DESC_REGEX = /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i;

// Fetch page utility with timeout
function fetchPage(url: string, timeoutMs = 3500): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    
    const req = client.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) B2B-Crawler/1.0"
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith("http")) {
          // relative redirect
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        resolve(fetchPage(redirectUrl, timeoutMs));
        return;
      }

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
        // Cap payload size to 200KB to save memory
        if (data.length > 200000) {
          req.destroy();
          resolve(data);
        }
      });
      res.on("end", () => resolve(data));
    });

    req.on("error", (err) => reject(err));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

// Extract B2B profile info from raw HTML
function analyzeHtml(html: string, domain: string) {
  // Detect Technologies
  const detectedTechs: string[] = [];
  for (const [tech, signatures] of Object.entries(TECH_SIGNATURES)) {
    if (signatures.some(sig => html.includes(sig))) {
      detectedTechs.push(tech);
    }
  }

  // Detect description meta
  const descMatch = html.match(META_DESC_REGEX);
  const description = descMatch ? descMatch[1] : `Real B2B company operating on ${domain}.`;

  // Detect Emails
  const rawEmails = html.match(EMAIL_REGEX) || [];
  const validEmails = Array.from(new Set(rawEmails))
    .filter(email => {
      // Filter out typical false positive file extensions
      const ext = email.split(".").pop()?.toLowerCase();
      if (ext && ["png", "jpg", "jpeg", "gif", "svg", "css", "js"].includes(ext)) {
        return false;
      }
      // Prefer emails matching the domain or standard roles
      return email.endsWith(domain) || ["info@", "sales@", "contact@", "support@", "admin@"].some(role => email.startsWith(role));
    });

  // Detect Phones
  const rawPhones = html.match(PHONE_REGEX) || [];
  const validPhones = Array.from(new Set(rawPhones)).slice(0, 2);

  // Detect Social links
  const socialLinks: Record<string, string> = {};
  const linkedInMatch = html.match(/linkedin\.com\/company\/[a-zA-Z0-9-_]+/i);
  if (linkedInMatch) socialLinks.linkedin = `https://www.${linkedInMatch[0]}`;
  
  const twitterMatch = html.match(/twitter\.com\/[a-zA-Z0-9-_]+/i);
  if (twitterMatch) socialLinks.twitter = `https://www.${twitterMatch[0]}`;

  return {
    techStack: detectedTechs.length > 0 ? detectedTechs.join(", ") : "Vanilla HTML, JS",
    description: description.substring(0, 200),
    emails: validEmails.slice(0, 3),
    phone: validPhones[0] || "",
    socialLinks
  };
}

async function processQueue(concurrency = 15) {
  console.log(`🚀 Starting B2B Crawler Worker with concurrency throttle of ${concurrency} sites...`);

  let activeCount = 0;
  let successCount = 0;
  let failCount = 0;

  // Retrieve pending leads that haven't been crawled yet
  const leads = await prisma.lead.findMany({
    where: {
      source: "seed",
      pipelineStage: "generated" // generated means seeded but uncrawled
    },
    take: 1000 // Pull in batches of 1,000 for queue iteration
  });

  if (leads.length === 0) {
    console.log("💤 No pending corporate profiles in enrichment queue.");
    return;
  }

  console.log(`🔍 Found ${leads.length} pending corporate domains to crawl.`);

  const queue = [...leads];

  const next = async (): Promise<void> => {
    if (queue.length === 0) return;
    const lead = queue.shift();
    if (!lead) return;

    activeCount++;
    const domain = lead.companyWebsite?.replace("https://www.", "").replace("http://www.", "") || "";

    try {
      console.log(`[CRAWL] Fetching homepage for ${domain}...`);
      const html = await fetchPage(`https://www.${domain}`);
      const analysis = analyzeHtml(html, domain);

      let parsedRaw: any = {};
      try { parsedRaw = JSON.parse(lead.rawData || "{}"); } catch {}

      const updatedRaw = JSON.stringify({
        ...parsedRaw,
        techStack: analysis.techStack,
        description: analysis.description,
        crawled: true,
        phone: analysis.phone || parsedRaw.phone,
        socials: analysis.socialLinks
      });

      // Update lead details in DB
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          pipelineStage: "qualified", // mark as enriched/qualified
          contactEmail: analysis.emails[0] || lead.contactEmail, // overwrite with real parsed email if found
          rawData: updatedRaw
        }
      });

      successCount++;
      console.log(`[SUCCESS] Enriched ${domain}. Techs: [${analysis.techStack}] Email: ${analysis.emails[0] || "None"}`);
    } catch (err: any) {
      failCount++;
      // Mark as skipped/failed to avoid infinite retries
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          pipelineStage: "failed" // mark as failed
        }
      });
      console.log(`[FAIL] Skipped ${domain}: ${err.message}`);
    } finally {
      activeCount--;
      // Call next in queue
      await next();
    }
  };

  // Launch initial parallel worker promises
  const promises: Promise<void>[] = [];
  const workerThreads = Math.min(concurrency, queue.length);
  for (let i = 0; i < workerThreads; i++) {
    promises.push(next());
  }

  await Promise.all(promises);
  console.log(`🏁 Crawling batch completed! Success: ${successCount}, Failed: ${failCount}`);
}

async function runLoop() {
  while (true) {
    try {
      await processQueue(20);
      // Wait 10 seconds before polling for new items in the queue
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (e) {
      console.error("Worker error loop:", e);
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
}

// Check if running as a direct script
if (require.main === module) {
  runLoop();
}

export { processQueue };
