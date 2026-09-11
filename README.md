# JobPilot

<div align="center">

**AI-Powered Job Search Aggregator & Application Assistant**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat-square&logo=drizzle)](https://orm.drizzle.team/)
[![Vercel AI SDK](https://img.shields.io/badge/AI-Vercel%20AI%20SDK-black?style=flat-square&logo=vercel)](https://sdk.vercel.ai/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Development](#-development) • [Project Structure](#-project-structure)

</div>

---

## 📌 Overview

**JobPilot** is a personal job search platform designed to streamline and automate the modern application process. It brings together opportunities from diverse job boards and ATS platforms into a unified feed, evaluates match quality against your master resume using AI, and drafts tailored resumes and cover letters for each application.

---

## ✨ Features

- 🌐 **Unified Job Ingestion** — Centralizes opportunities from international ATS platforms and regional job boards into a single high-density dashboard.
- 🎯 **Intelligent Match Scoring** — Automatically evaluates job listings against your background to surface high-relevance opportunities.
- 🔍 **Skill Insights & Gap Analysis** — Identifies matched skills and highlights gaps to help you target your preparation.
- ✍️ **Tailored Resumes & Cover Letters** — Dynamically crafts role-specific application materials with an in-browser editor and export options.
- 📊 **Application Tracking Pipeline** — Organizes opportunities across stages: Saved, Applied, Interviewing, and Offers.
- ⚡ **Modern & Responsive UI** — Built with React 19, Tailwind CSS v4, and accessible shadcn/ui components with full dark mode support.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions) |
| **Frontend** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/) |
| **AI Integration** | [Vercel AI SDK](https://sdk.vercel.ai/) |
| **Caching & Storage** | Redis |
| **Background Tasks** | [Inngest](https://www.inngest.com/) |
| **Authentication** | [better-auth](https://better-auth.com/) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20+` or `v22+`
- **pnpm**: `v9+` (recommended)
- **Docker**: For local database and cache services

### 1. Clone & Install

```bash
git clone https://github.com/BenM4k/jobscan.git
cd jobscan
pnpm install
```

### 2. Start Services

Launch the local database and cache:

```bash
docker compose up -d
```

### 3. Setup Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure your local database connection and API keys in `.env.local`.

### 4. Run Migrations

```bash
pnpm db:migrate
```

### 5. Start the App

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📜 Development Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Run development server with Turbopack |
| `pnpm build` | Build the application for production |
| `pnpm start` | Run production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:studio` | Open Drizzle Studio database viewer |
| `pnpm inngest:dev` | Start local background task runner |

---

## 📂 Project Structure

```text
src/
├── app/          # Next.js App Router (pages & API routes)
├── components/   # UI components and layout elements
├── dal/          # Data access layer
├── inngest/      # Background workflows and scheduled tasks
├── lib/          # Utilities and shared helpers
└── services/     # Core application services and AI integrations
```

---

## 📄 License

Private and proprietary. All rights reserved.
