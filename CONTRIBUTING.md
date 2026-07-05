# Contributing to OutReach AI

Thank you for your interest in contributing to OutReach AI! We welcome contributions of all sizes—whether it's fixing bugs, improving documentation, or adding new features.

---

## 🛠️ Local Development Setup

To start developing locally:

1. **Fork and Clone the Repository**
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment:**
   Create a `.env` file based on `.env.example` and add your local credentials/API keys.
4. **Database Migration and Seed:**
   Initialize SQLite database and schema:
   ```bash
   npm run db:setup
   ```
5. **Start Dev Server:**
   ```bash
   npm run dev
   ```

---

## 📝 Code Style & Guidelines

To maintain code quality, please adhere to the following:

- **TypeScript**: Ensure your code is strictly typed and passes TypeScript compilation.
- **Linting**: Run `npm run lint` before committing to catch any static analysis issues.
- **Styling**: Use the existing Tailwind/CSS design system. Avoid adding arbitrary styles; keep components clean and consistent.
- **Database Schema**: If you change the database schema in `prisma/schema.prisma`, make sure to run:
  ```bash
  npx prisma db push
  ```
  And document the changes.

---

## 📬 Pull Request Process

1. Create a new branch with a descriptive name (e.g., `feature/analytics-export` or `bugfix/inbox-loading`).
2. Implement your changes and verify them locally.
3. Ensure no local secrets/keys are added in your commits.
4. Open a Pull Request pointing to the `main` branch.
5. Provide a clear description of the problem solved and the implementation details.

---

## ⚖️ Code of Conduct

Please review and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all community interactions.
