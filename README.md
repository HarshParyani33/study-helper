# Personal Learning OS

> A persistent, AI-assisted learning environment that converts everyday learning material into structured, searchable, reviewable knowledge powered by the **FSRS 4.5** spaced repetition scheduler.

---

## 🌟 Overview & Capabilities

Personal Learning OS is built for deep technical mastery across multiple subjects without passive re-reading. It converts engineering notes, PDFs, articles, and transcripts into indexed concepts, dependency graphs, and active recall questions.

### Core User Journeys

1. **Daily Ingestion**:
   - Ingest notes, markdown, PDFs, or transcripts.
   - Idempotent: SHA-256 content hashing guarantees zero duplicates on repeated imports.
   - Enriches existing concepts with new production examples and anti-patterns while preserving review history.
   - Generates diverse question types: `recall`, `explanation`, `comparison`, `application`, `interview`, `scenario`, and `cross-topic`.

2. **Daily Recall**:
   - Active retrieval: tests intuition before revealing answers.
   - Free-text AI grading: evaluates student responses against evaluation criteria with scores and actionable feedback.
   - True FSRS 4.5 scheduling: updates card stability, difficulty, repetitions, and review intervals via ratings: `Again` (1), `Hard` (2), `Good` (3), `Easy` (4).

3. **Fresh Start Recovery**:
   - Input: Subject + duration of inactivity (e.g. 2 weeks, 1 month, 3 months).
   - Generates a condensed architectural overview, dependency bottleneck map, 4 baseline diagnostic questions, and a 3-stage prioritized recovery roadmap.

4. **Technical Interview Mode**:
   - Seniority level selection (`junior`, `mid`, `senior`, `staff`).
   - High-yield architectural concepts, real-world failure scenarios (cascading failures, network partitions), interviewer follow-up probes, candidate misconceptions, and interactive mock interview simulator.
   - Interactive 24-hour revision checklist.

5. **Surprise Recall**:
   - Cross-topic random drills targeting forgotten concepts, long-unseen items, and foundational principles to break cognitive silos.

6. **Interactive Knowledge Graph**:
   - 2D React Flow topological network with prerequisite edges, related concept associations, and live recall status (Due, Learning, Mastered).

7. **Learning Analytics & History**:
   - Recharts visualizer for review volume over time, retention rate %, and FSRS rating frequency.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS (Dark, minimal, premium aesthetic) |
| **Knowledge Graph** | `@xyflow/react` (React Flow) |
| **Analytics Charts** | Recharts |
| **Icons** | Lucide React |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | MongoDB Atlas / Persistent Embedded MongoDB (WiredTiger) |
| **Validation** | Zod (strict runtime schema validation) |
| **Spaced Repetition** | FSRS 4.5 (`ts-fsrs`) |
| **AI Engine** | Modular LLM Engine (Gemini / OpenAI / smart offline heuristic fallback) |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+ recommended, tested on Node v24)
- npm (v9+)

### 2. Environment Configuration
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Environment variables:
- `PORT`: Server port (default: `5000`)
- `MONGODB_URI`: (Optional) MongoDB Atlas or local URI. If left blank, the system automatically runs an embedded MongoDB instance with persistent on-disk storage in `data/embedded-db`!
- `GEMINI_API_KEY`: (Optional) Gemini API Key.
- `OPENAI_API_KEY`: (Optional) OpenAI API Key.
- `FSRS_REQUEST_RETENTION`: Target retention rate (default: `0.9` for 90%).

### 3. Install Dependencies
```bash
# Root & Server
npm install
cd server && npm install && cd ..

# Client
cd client && npm install && cd ..
```

### 4. Seed Rich Demo Data (Optional)
```bash
npm run seed
```
Seeds 7 concepts, 14 questions, and realistic review history across *System Design* and *Node.js & Concurrency*.

### 5. Start Development Servers
Run frontend and backend simultaneously:
```bash
npm run dev
```
Or start them individually:
```bash
# Backend (Port 5000)
npm run dev:server

# Frontend (Port 5173)
npm run dev:client
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🧪 Testing & Verification

### Run Automated Test Suite
```bash
npm test
```
Executes all 5 test suites covering:
- FSRS 4.5 algorithm state transitions and interval calculations
- Knowledge Ingestion Engine idempotency & concept enrichment
- Review preservation during note updates
- Daily Recall due cards queue and AI evaluation
- Fresh Start & Technical Interview generation
- Database snapshot export & isolated restore verification

### Run 18-Step Acceptance Checklist
```bash
npx tsx scripts/verify-phase7.ts
```
Verifies all 18 end-to-end criteria defined in Phase 7 of the specification with 100% pass rate.

---

## 🛠️ CLI Utilities & Workflows

### 1. Ingest Knowledge via CLI
```bash
npx tsx scripts/import-knowledge.ts --file path/to/notes.md --subject "System Design" --title "Rate Limiting"
```

### 2. Export Database Backup
```bash
npm run backup
# or
npx tsx scripts/export-backup.ts --out data/backup.json
```

### 3. Restore Database from Backup
```bash
npm run restore
# or
npx tsx scripts/restore-backup.ts --file data/backup.json
```

---

## 📂 Project Structure

```text
personal-learning-os/
│
├── client/
│   ├── src/
│   │   ├── components/    # Sidebar, Header
│   │   ├── pages/         # Dashboard, Recall, Ingest, Graph, Concepts, FreshStart, Interview, Surprise, Analytics, Settings
│   │   ├── services/      # REST API client
│   │   └── types/         # TypeScript interfaces
│   ├── index.html
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── config/        # Database (Atlas + Persistent Embedded MMS) & Env
│   │   ├── controllers/   # Express controllers
│   │   ├── models/        # Subject, Source, Concept, Question, Review
│   │   ├── routes/        # Express REST routes
│   │   ├── services/      # FSRS 4.5, Ingestion, Recall, FreshStart, Interview, Backup, LLM
│   │   ├── utils/         # Hash, Slugify, Error Handler
│   │   └── validators/    # Zod schemas
│   └── index.ts
│
├── agent/
│   ├── workflows/         # ingest.md, fresh-start.md, interview-prep.md, maintenance.md
│   └── schemas/           # JSON schemas
│
├── scripts/
│   ├── import-knowledge.ts
│   ├── export-backup.ts
│   ├── restore-backup.ts
│   ├── seed-demo.ts
│   └── verify-phase7.ts
│
├── tests/                 # Vitest automated test suite
├── .env.example
├── package.json
└── README.md
```
