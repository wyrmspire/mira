# Mira Studio

> Your ideas, shaped and shipped.

Mira is a Vercel-hosted Studio UI for managing ideas from capture through execution. It connects to a custom GPT that sends structured idea payloads via webhook, then provides a focused flow for defining, prioritizing, and executing those ideas.

## The Journey

| Zone | Route | Description |
|------|-------|-------------|
| **Captured** | `/send` | Incoming ideas from GPT |
| **Defined** | `/drill` | 6-step idea definition flow |
| **In Progress**| `/arena` | Active projects (max 3) |
| **On Hold** | `/icebox` | Deferred ideas and projects |
| **Archive** | `/shipped` `/killed` | Shipped + Removed |

## The Rule

Every idea gets a clear decision. No limbo.

## Tech Stack

- **Next.js 14.2** with App Router
- **TypeScript** — strict mode
- **Tailwind CSS 3.4** — dark studio theme
- **JSON File Storage** — local persistence under `.local-data/`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local Development & Testing

### Simulating GPT Ideas
Since Mira is designed to receive ideas from a custom GPT, you can simulate this locally using the **Dev Harness**:
Go to [`/dev/gpt-send`](http://localhost:3000/dev/gpt-send) to fill out a form that POSTs to the same `/api/webhook/gpt` endpoint used in production.

### Data Persistence
Mira uses a local JSON file for data persistence during development.
- Data location: `.local-data/studio.json`
- This file is gitignored and survives server restarts.
- To reset your data, simply delete this file; it will auto-seed from `lib/seed-data.ts` on the next request.

## Project Structure

```
app/           # Next.js App Router pages and API routes
components/    # UI components (shell, common, zone-specific)
lib/           # Services, storage, state machine, copy, validators
types/         # TypeScript type definitions
content/       # Product copy and principles
docs/          # Architecture and planning docs
.local-data/   # Local JSON persistence (gitignored)
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ideas` | GET, POST | Ideas CRUD |
| `/api/ideas/materialize` | POST | Convert idea to project |
| `/api/drill` | POST | Save drill session |
| `/api/projects` | GET | Projects list |
| `/api/tasks` | GET | Tasks by project |
| `/api/prs` | GET | PRs by project |
| `/api/inbox` | GET, PATCH | Inbox events & mark-read |
| `/api/actions/promote-to-arena` | POST | Move project to in-progress |
| `/api/actions/move-to-icebox` | POST | Move project to on-hold |
| `/api/actions/mark-shipped` | POST | Mark project shipped |
| `/api/actions/kill-idea` | POST | Mark idea removed |
| `/api/actions/merge-pr` | POST | Merge a PR |
| `/api/webhook/gpt` | POST | GPT webhook receiver |

## Environment Variables

See `.env.example` for required variables.

## Deploy

Deploy to Vercel:

```bash
vercel deploy
```
