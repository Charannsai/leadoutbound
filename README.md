# Apollo.io Open Source Alternative (OutReach AI)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

OutReach AI is a free, self-hostable, and powerful **Apollo.io Open Source Alternative**. It is an autonomous, AI-powered outbound sales and lead outreach platform that empowers businesses and creators to automate lead discovery, personalize email outreach campaigns with deep context, manage pipelines, and track conversations in a single unified dashboard.

---

## ✨ Key Features

- **🔍 Intelligent Lead Discovery**: Find and scrape fresh lead data from target sources using integrated extraction pipelines (powered by Apify).
- **🤖 Autonomous AI Sessions**: Coordinate campaigns with the help of an AI copilot (Google Gemini / Groq) that suggests personalized messaging strategies and refines targets.
- **📚 Knowledge Base Integration**: Upload files (PDFs, text documents, or guides) to feed context (brochures, sales decks, company background) directly into the AI's email personalization engine.
- **📊 Visual Outreach Pipeline**: A Kanban CRM board to track every prospect's state, from `Discovered` to `Contacted`, `Replied`, and `Converted`.
- **📥 Unified Inbox & Sentiment Analysis**: Track incoming prospect responses, classify reply intent automatically using AI, and view conversation histories.
- **✉️ Dynamic Templates**: Define and organize reusable email templates with custom template tags.
- **📈 Conversion Analytics**: Measure the effectiveness of campaigns with a dynamic dashboard showing reply rates, sent counts, and trends over time.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js (App Router)](https://nextjs.org), [React Query](https://tanstack.com/query/latest), [Framer Motion](https://www.framer.com/motion/) (for premium fluid animations), [Lucide React](https://lucide.dev)
- **Styling**: Tailwind CSS & Vanilla CSS Design Tokens
- **Database & ORM**: SQLite via [Prisma ORM](https://www.prisma.io)
- **AI Integration**: Google Gemini API, Groq SDK

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18+) and `npm` installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/leadoutreach.git
   cd leadoutreach
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and supply:
   - `DATABASE_URL`: Path to your SQLite DB (defaults to `file:../data/outreach.db`).
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `APIFY_API_KEY`: API key for lead scraping.
   - `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET`: For Google OAuth / Gmail integration.

4. **Initialize the Database:**
   Generate the Prisma client, run migrations, and seed initial database tables:
   ```bash
   npm run db:setup
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤝 Contributing

We welcome contributions to OutReach AI! To contribute:

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
