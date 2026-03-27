# Mira Studio — Sprint Board

## Sprint History

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| Sprint 1 | Make It Real (Local-First) | TSC ✅ Build ✅ | ✅ Complete |
| Sprint 2 | GitHub Factory (Token-First) | TSC ✅ (Lanes 1–5) | ✅ Complete (Lane 6 deferred) |
| Sprint 3 | Runtime Foundation — Supabase + Experience Types + Renderer + Capture + Integration | TSC ✅ Build ✅ | ✅ Complete — Full ephemeral loop proven. 16 Supabase tables live. |
| Sprint 4 | Experience Engine — Persistent lifecycle, Library, Review, Home, Re-entry | TSC ✅ Build ✅ | ✅ Complete — Full loop: propose → approve → workspace → complete → GPT re-entry. |
| Sprint 5 | Groundwork: Contracts, Graph, Timeline, Profile, Validation, Progression | TSC ✅ Build ✅ | ✅ Complete — Gate 0 contracts, experience graph, timeline, profile, validators, renderer upgrades. All 6 lanes done. |
| Sprint 6 | Experience Workspace: Navigator, Drafts, Renderer Upgrades, Steps API, Scheduling | TSC ✅ Build ✅ | ✅ Complete — Non-linear workspace model, draft persistence, sidebar/topbar navigators, step status/scheduling migration. All 6 lanes done. |
| Sprint 7 | Genkit Intelligence Layer — AI synthesis, facet extraction, smart suggestions, GPT state compression | TSC ✅ Build ✅ | ✅ Complete — 4 Genkit flows, graceful degradation, completion wiring, migration 005. All 6 lanes done. |
| Sprint 8 | Knowledge Integration — Knowledge units, domains, mastery, MiraK webhook, 3-tab unit view, Home dashboard | TSC ✅ Build ✅ | ✅ Complete — Migration 006, Knowledge Tab, domain grid, Mira Studio dashboard, companion integration. All 6 lanes done. |

---

## Sprint 8A — Gate 0: Knowledge Types & Contracts

> **Purpose:** Define the shared types, constants, routes, and copy that Lanes 1–5 all consume. Must be approved before any lane begins.

### Gate 0 Status

| Gate | Focus | Status |
|------|-------|--------|
| ✅ Gate 0 | Knowledge Types & Contracts | G1 ✅ G2 ✅ G3 ✅ G4 ✅ |

**G1 — Create `types/knowledge.ts`** ✅

**G2 — Update `lib/constants.ts`** ✅

**G3 — Update `lib/routes.ts`** ✅

**G4 — Update `lib/studio-copy.ts`** ✅

Create the knowledge type definitions:
```ts
export type KnowledgeUnitType = 'foundation' | 'playbook' | 'deep_dive' | 'example';
export type MasteryStatus = 'unseen' | 'read' | 'practiced' | 'confident';

export interface KnowledgeCitation {
  url: string;
  claim: string;
  confidence: number;
}

export interface RetrievalQuestion {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface KnowledgeUnit {
  id: string;
  user_id: string;
  topic: string;
  domain: string;
  unit_type: KnowledgeUnitType;
  title: string;
  thesis: string;
  content: string;
  key_ideas: string[];
  common_mistake: string | null;
  action_prompt: string | null;
  retrieval_questions: RetrievalQuestion[];
  citations: KnowledgeCitation[];
  linked_experience_ids: string[];
  source_experience_id: string | null;
  subtopic_seeds: string[];
  mastery_status: MasteryStatus;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeProgress {
  id: string;
  user_id: string;
  unit_id: string;
  mastery_status: MasteryStatus;
  last_studied_at: string | null;
  created_at: string;
}

export interface MiraKWebhookPayload {
  topic: string;
  domain: string;
  units: Array<{
    unit_type: KnowledgeUnitType;
    title: string;
    thesis: string;
    content: string;
    key_ideas: string[];
    common_mistake?: string;
    action_prompt?: string;
    retrieval_questions?: RetrievalQuestion[];
    citations?: KnowledgeCitation[];
    subtopic_seeds?: string[];
  }>;
  experience_proposal?: {
    title: string;
    goal: string;
    template_id: string;
    resolution: { depth: string; mode: string; timeScope: string; intensity: string };
    steps: Array<{ step_type: string; title: string; payload: any }>;
  };
}
```

**G2 — Update `lib/constants.ts`** ⬜

Add knowledge-related constants:
```ts
export const KNOWLEDGE_UNIT_TYPES = ['foundation', 'playbook', 'deep_dive', 'example'] as const;
export type KnowledgeUnitType = (typeof KNOWLEDGE_UNIT_TYPES)[number];

export const MASTERY_STATUSES = ['unseen', 'read', 'practiced', 'confident'] as const;
export type MasteryStatus = (typeof MASTERY_STATUSES)[number];
```

**G3 — Update `lib/routes.ts`** ⬜

Add knowledge route:
```ts
knowledge: '/knowledge',
knowledgeUnit: (id: string) => `/knowledge/${id}`,
```

**G4 — Update `lib/studio-copy.ts`** ⬜

Add knowledge copy block:
```ts
knowledge: {
  heading: 'Knowledge',
  subheading: 'Your terrain, mapped from action.',
  emptyState: 'Your knowledge base grows as you explore experiences.',
  sections: {
    domains: 'Domains',
    companion: 'Related Knowledge',
    recentlyAdded: 'Recently Added',
  },
  unitTypes: {
    foundation: 'Foundation',
    playbook: 'Playbook',
    deep_dive: 'Deep Dive',
    example: 'Example',
  },
  mastery: {
    unseen: 'New',
    read: 'Read',
    practiced: 'Practiced',
    confident: 'Confident',
  },
  actions: {
    markRead: 'Mark as Read',
    markPracticed: 'Mark as Practiced',
    startExperience: 'Start Related Experience',
    learnMore: '📖 Learn about this',
  },
},
```

---

## Sprint 8B — Coding Lanes (begins after Gate 0 approval)

> **Goal:** Build the Knowledge Tab, MiraK webhook ingestion, knowledge service, and experience-knowledge linking. Knowledge is a companion to experiences — a home base for multi-day learning with permanent reference material.

> **Key Architectural Rule:** Knowledge units are DURABLE reference material — they never "complete" or "archive" like experiences. They persist in the Knowledge Tab forever. MiraK produces them; the GPT proposes experiences from them; the user earns them through engagement.

### Dependency Graph

```
Gate 0: [G1–G4 TYPES+CONTRACTS] ─── must complete first ───→

Lane 1: [W1–W4]          Lane 2: [W1–W6]          Lane 3: [W1–W6]
  DB MIGRATION +            API ROUTES +              KNOWLEDGE
  KNOWLEDGE SERVICE         MIRAK WEBHOOK             TAB UI
  (lib/services/,           (app/api/,                (app/knowledge/,
   lib/supabase/,            lib/validators/)          components/knowledge/)
   lib/validators/)

Lane 4: [W1–W3]          Lane 5: [W1–W4]
  SIDEBAR + NAV +           EXPERIENCE ↔
  COPY + HOME               KNOWLEDGE LINKING
  (components/shell/,       (components/experience/,
   app/page.tsx)             lib/services/)

ALL 5 ──→ Lane 6: [W1–W8] INTEGRATION + BROWSER TESTING
```

**Lanes 1–5 are fully parallel** — zero file conflicts.
**Lane 6 runs AFTER** Lanes 1–5. Applies migration, resolves cross-lane issues, does all browser testing.

---

### Sprint 8 Ownership Zones

| Zone | Files | Lane |
|------|-------|------|
| DB migration + knowledge service + validator | `lib/supabase/migrations/006_knowledge_units.sql` [NEW], `lib/services/knowledge-service.ts` [NEW], `lib/validators/knowledge-validator.ts` [NEW] | Lane 1 |
| API routes + webhook + dev harness | `app/api/webhook/mirak/route.ts` [NEW], `app/api/knowledge/route.ts` [NEW], `app/api/knowledge/[id]/route.ts` [NEW], `app/api/knowledge/[id]/progress/route.ts` [NEW], `app/api/dev/test-knowledge/route.ts` [NEW] | Lane 2 |
| Knowledge Tab pages + components | `app/knowledge/page.tsx` [NEW], `app/knowledge/KnowledgeClient.tsx` [NEW], `app/knowledge/[unitId]/page.tsx` [NEW], `components/knowledge/DomainCard.tsx` [NEW], `components/knowledge/KnowledgeUnitCard.tsx` [NEW], `components/knowledge/KnowledgeUnitView.tsx` [NEW], `components/knowledge/MasteryBadge.tsx` [NEW] | Lane 3 |
| Sidebar + nav + home integration | `components/shell/studio-sidebar.tsx` [MODIFY], `components/shell/MobileNav.tsx` [MODIFY if exists], `app/page.tsx` [MODIFY] | Lane 4 |
| Experience ↔ knowledge linking | `components/experience/KnowledgeCompanion.tsx` [NEW], `components/experience/ExperienceRenderer.tsx` [MODIFY — append only], `lib/services/synthesis-service.ts` [MODIFY — append only], `app/api/gpt/state/route.ts` [MODIFY — append only] | Lane 5 |
| Integration + testing | All files (read + targeted fixes) | Lane 6 |

---

### Lane 1 — Database + Knowledge Service

**Owns: Migration, knowledge-service.ts, knowledge-validator.ts. This is the data layer all other lanes depend on.**

**Reading list:** `types/knowledge.ts` (Gate 0 output), `lib/services/experience-service.ts` (service pattern to follow), `lib/services/facet-service.ts` (another service example with normalization), `lib/supabase/client.ts` (Supabase client), `lib/constants.ts` (knowledge constants)

**W1 — Write migration 006** ⬜
- Create `lib/supabase/migrations/006_knowledge_units.sql`:
  ```sql
  CREATE TABLE knowledge_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    topic TEXT NOT NULL,
    domain TEXT NOT NULL,
    unit_type TEXT NOT NULL CHECK (unit_type IN ('foundation', 'playbook', 'deep_dive', 'example')),
    title TEXT NOT NULL,
    thesis TEXT NOT NULL,
    content TEXT NOT NULL,
    key_ideas JSONB NOT NULL DEFAULT '[]',
    common_mistake TEXT,
    action_prompt TEXT,
    retrieval_questions JSONB NOT NULL DEFAULT '[]',
    citations JSONB NOT NULL DEFAULT '[]',
    linked_experience_ids JSONB NOT NULL DEFAULT '[]',
    source_experience_id UUID,
    subtopic_seeds JSONB NOT NULL DEFAULT '[]',
    mastery_status TEXT NOT NULL DEFAULT 'unseen' CHECK (mastery_status IN ('unseen', 'read', 'practiced', 'confident')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE knowledge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    unit_id UUID NOT NULL REFERENCES knowledge_units(id),
    mastery_status TEXT NOT NULL DEFAULT 'unseen' CHECK (mastery_status IN ('unseen', 'read', 'practiced', 'confident')),
    last_studied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, unit_id)
  );

  CREATE INDEX idx_knowledge_units_user ON knowledge_units(user_id);
  CREATE INDEX idx_knowledge_units_domain ON knowledge_units(domain);
  CREATE INDEX idx_knowledge_progress_user ON knowledge_progress(user_id);
  ```
- Done when: SQL file compiles cleanly

**W2 — Create knowledge-service.ts** ⬜
- Create `lib/services/knowledge-service.ts` following the same adapter/service pattern as `experience-service.ts`
- Must include `fromDB()`/`toDB()` normalization (snake_case ↔ camelCase) per inbox-service pattern
- Functions:
  - `getKnowledgeUnits(userId: string): Promise<KnowledgeUnit[]>`
  - `getKnowledgeUnitsByDomain(userId: string, domain: string): Promise<KnowledgeUnit[]>`
  - `getKnowledgeUnitById(id: string): Promise<KnowledgeUnit | null>`
  - `createKnowledgeUnit(unit: Omit<KnowledgeUnit, 'id' | 'created_at' | 'updated_at'>): Promise<KnowledgeUnit>`
  - `createKnowledgeUnits(units: ...): Promise<KnowledgeUnit[]>`
  - `updateMasteryStatus(userId: string, unitId: string, status: MasteryStatus): Promise<void>`
  - `getKnowledgeProgress(userId: string): Promise<KnowledgeProgress[]>`
  - `getKnowledgeDomains(userId: string): Promise<{ domain: string; count: number; readCount: number }[]>`
  - `getKnowledgeSummaryForGPT(userId: string): Promise<{ domains: string[]; totalUnits: number; masteredCount: number }>`
- Done when: all functions compile with correct types, no raw Supabase calls in routes

**W3 — Create knowledge-validator.ts** ⬜
- Create `lib/validators/knowledge-validator.ts`
- `validateMiraKPayload(body: unknown): { valid: boolean; error?: string; data?: MiraKWebhookPayload }`
- `validateMasteryUpdate(body: unknown): { valid: boolean; error?: string; data?: { mastery_status: MasteryStatus } }`
- Check all required fields, validate unit_type against `KNOWLEDGE_UNIT_TYPES`, validate mastery_status against `MASTERY_STATUSES`
- Done when: validators compile, handle malformed input gracefully

**W4 — Add type guard to guards.ts** ⬜
- Append to `lib/guards.ts`: `isKnowledgeUnit()`, `isValidMasteryStatus()` type guards
- Done when: guards compile

---

### Lane 2 — API Routes + MiraK Webhook

**Owns: All new API routes under `/api/knowledge/`, `/api/webhook/mirak/`, and `/api/dev/test-knowledge/`.**

**Reading list:** `types/knowledge.ts` (Gate 0), `app/api/experiences/route.ts` (API route pattern), `app/api/webhook/github/route.ts` (webhook pattern), `app/api/dev/test-experience/route.ts` (dev harness pattern), `lib/services/knowledge-service.ts` (Lane 1 — read the interface but don't modify), `lib/validators/knowledge-validator.ts` (Lane 1), `lib/services/inbox-service.ts` (for timeline events)

**W1 — Create MiraK webhook receiver** ⬜
- Create `app/api/webhook/mirak/route.ts`
- `POST` handler:
  - Read `x-mirak-secret` header, compare to `process.env.MIRAK_WEBHOOK_SECRET` (skip validation if not set in dev)
  - Call `validateMiraKPayload()` on body
  - For each unit in payload: call `createKnowledgeUnit()` with `DEFAULT_USER_ID`
  - If `experience_proposal` present: call `createPersistentExperience()` from `experience-service.ts`
  - Create timeline event: `{ event_type: 'knowledge_ready', title: 'New knowledge: [topic]' }`
  - Return `{ created: N, experience_created: boolean }`
- Done when: route compiles, handles valid + invalid payloads

**W2 — Create knowledge list route** ⬜
- Create `app/api/knowledge/route.ts`
- `GET` handler: calls `getKnowledgeUnits(DEFAULT_USER_ID)`
- Optional query params: `domain`, `unit_type` for filtering
- Groups results by domain in response
- Done when: route compiles, returns grouped units

**W3 — Create knowledge unit detail route** ⬜
- Create `app/api/knowledge/[id]/route.ts`
- `GET`: returns single unit via `getKnowledgeUnitById()`
- `PATCH`: accepts `{ mastery_status }`, validates, calls `updateMasteryStatus()`
- Done when: both methods compile

**W4 — Create progress route** ⬜
- Create `app/api/knowledge/[id]/progress/route.ts`
- `POST`: records that user studied this unit, upserts progress via service
- Done when: route compiles

**W5 — Create dev test harness** ⬜
- Create `app/api/dev/test-knowledge/route.ts`
- `POST` handler: creates 4 sample knowledge units across 2 domains ("positioning" and "business-systems")
  - 1 foundation unit, 1 playbook unit, 1 deep_dive unit, 1 example unit
  - Include realistic titles, thesis, key_ideas, retrieval_questions, citations
  - Use `DEFAULT_USER_ID`
- Return `{ created: 4, domains: ['positioning', 'business-systems'] }`
- Done when: harness compiles, follows `/api/dev/test-experience` pattern

**W6 — Update GPT state route** ⬜
- Modify `app/api/gpt/state/route.ts`:
  - Import `getKnowledgeSummaryForGPT()` from knowledge-service
  - Add `knowledgeSummary` field to the response packet
  - Append to existing response — do NOT rewrite the route
- Done when: GPT state includes knowledge summary alongside existing fields

---

### Lane 3 — Knowledge Tab UI

**Owns: All new pages under `app/knowledge/` and all new components under `components/knowledge/`.**

**Reading list:** `types/knowledge.ts` (Gate 0), `lib/studio-copy.ts` (copy constants — use COPY.knowledge.*), `lib/routes.ts` (use ROUTES.knowledge), `app/library/page.tsx` + `app/library/LibraryClient.tsx` (page+client pattern to follow), `components/experience/ExperienceCard.tsx` (card component pattern), `app/globals.css` (existing dark theme tokens)

**W1 — Create MasteryBadge component** ⬜
- Create `components/knowledge/MasteryBadge.tsx`
- Small status chip: unseen=grey, read=blue, practiced=amber, confident=green
- Uses `COPY.knowledge.mastery.*` for labels
- Done when: component compiles, renders all 4 states

**W2 — Create DomainCard component** ⬜
- Create `components/knowledge/DomainCard.tsx`
- Props: `domain: string`, `unitCount: number`, `readCount: number`
- Dark theme card matching existing app style (bg-[#0f0f17], border-[#1e1e2e])
- Shows domain name, unit count badge, mastery progress bar (readCount/unitCount)
- Click handler (onClick prop or Link)
- Done when: component renders with progress indicator

**W3 — Create KnowledgeUnitCard component** ⬜
- Create `components/knowledge/KnowledgeUnitCard.tsx`
- Props: `unit: KnowledgeUnit`
- Compact card: title, thesis (one line), unit_type badge (color-coded), mastery badge
- Click → navigates to `/knowledge/[unitId]`
- Done when: component renders all unit types

**W4 — Create KnowledgeUnitView component** ⬜
- Create `components/knowledge/KnowledgeUnitView.tsx`
- **Use a 3-tab structure**: Learn | Practice | Links
- **Learn tab** (default):
  - Header: title, unit_type badge, mastery badge
  - **Quick Read section**: `thesis` field rendered as a highlighted callout box — always visible, skimmable
  - **Deep Read section**: `content` field rendered below — the full article body
  - Key ideas as bullet list
  - Common mistake callout (warning-styled box)
  - Action prompt (highlighted CTA)
  - Citations list with clickable URLs
- **Practice tab**:
  - Retrieval questions rendered as expandable Q&A cards (question visible, answer hidden until clicked)
  - "Mark as Practiced" button after attempting questions → `PATCH /api/knowledge/[id]`
- **Links tab**:
  - "Start Related Experience" links if `linked_experience_ids.length > 0`
  - `subtopic_seeds` rendered as "Explore Next" chips
  - Source experience link if `source_experience_id` exists
- **Mastery buttons** visible on all tabs: "Mark as Read" / "Mark as Practiced" / "Mark as Confident" → `PATCH /api/knowledge/[id]`
- Back nav link to `/knowledge`
- Done when: 3 tabs render, mastery buttons call API, Quick Read/Deep Read framing visible

**W5 — Create Knowledge Tab page** ⬜
- Create `app/knowledge/page.tsx` (server component):
  - `export const dynamic = 'force-dynamic'` (SOP-19)
  - Fetch knowledge units via `GET /api/knowledge` (or import service directly since server component)
  - Group by domain, compute counts, find most recent units
  - Render `KnowledgeClient`
- Create `app/knowledge/KnowledgeClient.tsx` (client component):
  - **"Continue Learning" dashboard section at top** (only when units exist):
    - "Resume last topic" — most recently updated unit with `mastery_status != 'confident'`
    - "Recently Added" — last 3 units by `created_at`
    - This section should feel like a personalized study dashboard, not a blank grid
  - **Domain cards grid below** as secondary navigation
    - Each card: domain name, unit count badge, mastery progress bar
    - Click domain → expand to show unit cards (or filter)
  - Empty state using `COPY.knowledge.emptyState` when no units exist
  - Uses heading from `COPY.knowledge.heading`
- Done when: page renders continue-learning section + domain grid, handles empty state

**W6 — Create Knowledge Unit detail page** ⬜
- Create `app/knowledge/[unitId]/page.tsx` (server component):
  - `export const dynamic = 'force-dynamic'`
  - Fetch single unit via service or API
  - Render `KnowledgeUnitView`
  - Back link to Knowledge Tab
- Done when: detail page renders full unit view with 3 tabs

---

### Lane 4 — Sidebar Navigation + Copy + Home Integration

**Owns: Sidebar, mobile nav, and home page modifications only.**

**Reading list:** `components/shell/studio-sidebar.tsx`, `components/shell/MobileNav.tsx` (if exists), `app/page.tsx` (home page), `lib/studio-copy.ts` (Gate 0 — knowledge copy), `lib/routes.ts` (Gate 0 — knowledge route)

**W1 — Add Knowledge to sidebar** ⬜
- Modify `components/shell/studio-sidebar.tsx`:
  - Add `{ label: COPY.knowledge.heading, href: ROUTES.knowledge, icon: '📚' }` to NAV_ITEMS
  - Position between Library and Timeline (after icon `◇`, before icon `◷`)
- Done when: sidebar shows Knowledge nav item in correct position

**W2 — Add Knowledge to mobile nav** ⬜
- Check if `components/shell/MobileNav.tsx` exists
- If yes: add Knowledge nav item matching sidebar placement
- If no: note in board.md that mobile nav doesn't exist yet
- Done when: mobile nav updated (or documented as missing)

**W3 — Add Knowledge section to home page** ⬜
- Modify `app/page.tsx`:
  - After the existing active experiences section, add a "Knowledge" summary section
  - Fetch knowledge domains summary (domain count, total units, mastery progress)
  - Only render section if user has ≥1 knowledge unit
  - Show 2-3 domain cards with "View All →" link to `/knowledge`
  - Uses `COPY.knowledge.*` for labels
- Done when: home page conditionally shows knowledge section, handles empty state gracefully

---

### Lane 5 — Experience ↔ Knowledge Linking

**Owns: KnowledgeCompanion component, ExperienceRenderer modification, synthesis-service append, GPT state enrichment.**

**Reading list:** `types/knowledge.ts` (Gate 0), `components/experience/ExperienceRenderer.tsx` (main renderer — append only), `lib/services/synthesis-service.ts` (current `buildGPTStatePacket`), `lib/services/knowledge-service.ts` (Lane 1 — import functions), `app/api/experiences/[id]/suggestions/route.ts` (current suggestions route)

**W1 — Create KnowledgeCompanion component** ⬜
- Create `components/experience/KnowledgeCompanion.tsx`
- Client component with expandable panel:
  - Props: `domain: string` OR `knowledgeUnitId: string`
  - Fetches matching knowledge units via `GET /api/knowledge?domain=X`
  - Renders: icon + "📖 Learn about this" clickable header
  - Expanded: shows unit title, thesis, "Read full →" link to `/knowledge/[id]`
  - Collapsed by default — small, non-intrusive
  - Uses `COPY.knowledge.actions.learnMore` for label
- Done when: companion panel renders, expands, links to knowledge

**W2 — Wire KnowledgeCompanion into ExperienceRenderer** ⬜
- Modify `components/experience/ExperienceRenderer.tsx` (APPEND ONLY — bottom of render):
  - After rendering the step component, check if the current step's `payload` contains a `knowledge_domain` or `knowledge_link` field
  - If present: render `<KnowledgeCompanion domain={payload.knowledge_domain} />` below the step
  - If not present: render nothing (no empty states, no dead space)
  - This is additive — existing renderer behavior is untouched
- Done when: companion appears when step has knowledge_domain, doesn't appear otherwise

**W3 — Add knowledge summary to synthesis service** ⬜
- Modify `lib/services/synthesis-service.ts` (APPEND to `buildGPTStatePacket()`):
  - Import `getKnowledgeSummaryForGPT()` from knowledge-service
  - After building existing packet, add `knowledgeSummary` field
  - Wrap in try/catch so failure doesn't break existing packet generation
  - Fallback: `knowledgeSummary: null`
- Done when: GPT state packet includes knowledge data when available

**W4 — Enrich suggestions with knowledge context** ⬜
- Modify `app/api/experiences/[id]/suggestions/route.ts` (APPEND ONLY):
  - Import `getKnowledgeDomains()` from knowledge-service
  - After generating suggestions, check if any suggestion's domain matches a studied knowledge domain
  - If match: add `knowledgeDomain` and `masteryLevel` fields to the suggestion
  - This allows GPT to say "You've studied X — try this experience"
- Done when: suggestions include knowledge context when available

---

### Lane 6 — Integration + Browser Testing

**Runs AFTER Lanes 1–5 are completed.**

**W1 — Install dependencies + env setup** ⬜
- Verify no new npm packages needed (all existing deps)
- Add `MIRAK_WEBHOOK_SECRET` to `.env.local` (optional, any string for dev)
- Document in `wiring.md`

**W2 — Apply migration 006** ⬜
- Apply `006_knowledge_units.sql` to Supabase project `bbdhhlungcjqzghwovsx`
- Verify tables `knowledge_units` and `knowledge_progress` exist
- Verify indexes created

**W3 — TSC + build fix pass** ⬜
- Run `npx tsc --noEmit` — fix any cross-lane type errors
- Run `npm run build` — fix any build errors
- Common fix areas: missing imports between lanes, type mismatches

**W4 — Seed test knowledge** ⬜
- Call `POST /api/dev/test-knowledge` to seed sample units
- Verify `GET /api/knowledge` returns seeded units grouped by domain
- Verify `GET /api/knowledge/[id]` returns full unit
- Verify `PATCH /api/knowledge/[id]` with `{ mastery_status: 'read' }` updates status

**W5 — Test webhook flow** ⬜
- Call `POST /api/webhook/mirak` with a test payload (4 units, 2 domains)
- Verify units appear in `GET /api/knowledge`
- Verify timeline event created ("New knowledge on [topic] is ready")
- Test invalid payload returns 400 with clear error

**W6 — Test GPT state** ⬜
- Call `GET /api/gpt/state`
- Verify response includes `knowledgeSummary` with domain counts and mastery stats
- Verify backward compatibility — existing fields unchanged

**W7 — Browser test: Knowledge Tab** ⬜
- Navigate to `/knowledge` — verify domain cards render with correct counts
- Click domain card — verify unit list expands/filters
- Click unit card — verify detail page renders all sections (key ideas, citations, etc.)
- Click "Mark as Read" — verify mastery badge updates
- Verify empty state shows correct copy when no units exist

**W8 — Browser test: Navigation + Home** ⬜
- Verify sidebar shows "📚 Knowledge" nav item between Library and Timeline
- Click Knowledge nav → navigates to `/knowledge`
- Navigate to home page — verify knowledge summary section appears (after seeding test data)
- Verify knowledge section hidden when no units exist

---

## Pre-Flight Checklist

- [ ] `npm install` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Dev server starts (`npm run dev`)
- [ ] Supabase is configured and tables exist

## Handoff Protocol

1. Mark W items ⬜→🟡→✅ as you go
2. Run `npx tsc --noEmit` before marking ✅ on your final W item
3. **DO NOT open the browser or perform visual checks** in Lanes 1–5. Lane 6 handles all browser QA.
4. Never touch files owned by other lanes (see Ownership Zones above)
5. Never push/pull from git

## Test Summary

| Lane | TSC | Build | Notes |
|------|-----|-------|-------|
| Gate 0 | ⬜ | ⬜ | Types, constants, routes, copy |
| Lane 1 | ⬜ | ⬜ | Migration, service, validator |
| Lane 2 | ⬜ | ⬜ | API routes, webhook, dev harness |
| Lane 3 | ⬜ | ⬜ | Knowledge Tab pages + components |
| Lane 4 | ⬜ | ⬜ | Sidebar, mobile nav, home page |
| Lane 5 | ⬜ | ⬜ | Experience ↔ knowledge linking |
| Lane 6 | ⬜ | ⬜ | Integration + browser testing |
