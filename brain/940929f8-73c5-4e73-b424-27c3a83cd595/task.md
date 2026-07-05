# 500k B2B Real Seeding & Crawler Checklist

- [x] Step 1: Add Database Indices
  - [x] Modify `prisma/schema.prisma` to add index definitions to search columns on the `Lead` model
  - [x] Execute `npx prisma db push` to write the new index schema
- `[ ]` Step 2: Seed 500k Real Domains
  - `[ ]` Update `scripts/seed-real-companies.ts` cap to collect 500,500 real domains
  - `[ ]` Run `npx tsx scripts/seed-real-companies.ts` to replace the database catalog with 500,000 real domain leads
- `[ ]` Step 3: Create Background Crawler Engine
  - `[ ]` Implement the asynchronous worker daemon `scripts/enrichment-worker.ts` with parallel scraping, tech stack detection, and regex email matching
- `[ ]` Step 4: Create Enrichment Worker API
  - `[ ]` Implement `/api/enrich` controller route in `src/app/api/enrich/route.ts` to control worker queues and report metrics
- `[ ]` Step 5: Implement Enrichment Monitoring Dashboard
  - `[ ]` Create `/enrichment` page component in `src/app/enrichment/page.tsx` with queue stats, progress sliders, and live crawler log feeds
- `[ ]` Step 6: Run Build Verification
  - `[ ]` Run `npx tsc --noEmit` to verify type safety
