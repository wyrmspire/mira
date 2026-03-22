# Mira Studio

> Chat is where ideas are born. Studio is where ideas are forced into truth.

Mira is a Vercel-hosted Studio UI for managing ideas from conception through execution. It connects to a custom GPT that sends structured idea payloads via webhook, then provides a focused flow for defining, prioritizing, and executing those ideas.

## The Five Zones

| Zone | Route | Description |
|------|-------|-------------|
| **Send** | `/send` | Incoming ideas from GPT |
| **Drill** | `/drill` | 6-step idea definition flow |
| **Arena** | `/arena` | Active projects (max 3) |
| **Icebox** | `/icebox` | Deferred ideas and projects |
| **Archive** | `/shipped` `/killed` | Trophy Room + Graveyard |

## The Rule

No limbo. Every idea is either **in play**, **frozen**, or **gone**.

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** — strict mode
- **Tailwind CSS** — dark studio theme
- **Mock data** — no database required initially

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/           # Next.js App Router pages and API routes
components/    # UI components (shell, common, zone-specific)
lib/           # Services, adapters, formatters, validators
types/         # TypeScript type definitions
content/       # Product copy and principles
docs/          # Architecture and planning docs
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
| `/api/inbox` | GET | Inbox events |
| `/api/actions/promote-to-arena` | POST | Move project to arena |
| `/api/actions/move-to-icebox` | POST | Move project to icebox |
| `/api/actions/mark-shipped` | POST | Mark project shipped |
| `/api/actions/kill-idea` | POST | Mark idea removed |
| `/api/actions/merge-pr` | POST | Merge a PR |
| `/api/webhook/gpt` | POST | GPT webhook receiver |
| `/api/webhook/github` | POST | GitHub webhook receiver |
| `/api/webhook/vercel` | POST | Vercel webhook receiver |

## Environment Variables

See `.env.example` for required variables.

## Deploy

Deploy to Vercel:

```bash
vercel deploy
```
