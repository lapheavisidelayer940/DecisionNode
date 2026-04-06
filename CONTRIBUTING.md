# Contributing to DecisionNode

Thanks for considering contributing! It's a solo project right now, so any help goes a long way — bug fixes, features, docs, tests, or just ideas.

Check the [Roadmap](ROADMAP.md) for what's planned.

---

## State of the codebase

**Read this first.** The codebase has some mess, and you should know why before you start poking around.

Before publishing, I was building several features in parallel — a cloud sync system, a decision marketplace, a VS Code extension, user auth, a pricing page. I eventually decided to ship the core (CLI + MCP server) first and come back to the rest later. But instead of deleting all that code, I commented it out or left the files in place.

Here's what you'll find:

### Disabled features in `src/cli.ts`

`cli.ts` is 2,100+ lines. The first ~1,150 lines are the active CLI. Lines 1,157–2,085 are **fully implemented handler functions** for features that are commented out in the command switch:

- `handleMarketplace()` — browse and install decision packs
- `handleLogin()` / `handleLogout()` — cloud auth
- `handleSync()` / `handlePull()` / `handleFetch()` — two-way cloud sync
- `handleCloud()` / `handleCloudSyncStatus()` — cloud dashboard
- `handleConflicts()` — cloud conflict resolution

The switch cases at lines 121–164 are commented out, so none of this code is reachable. The handler functions are still there because I might re-enable them.

### Dead source files

| File | Lines | What it is | Status |
|------|-------|-----------|--------|
| `src/cloud.ts` | 808 | Full two-way cloud sync with Supabase, conflict detection, metadata management | Not reachable — CLI commands disabled |
| `src/marketplace.ts` | 369 | Pack browsing, downloading, installing from Supabase. Falls back to hardcoded sample packs. | Not reachable |
| `src/setup.ts` | 162 | Onboarding wizard for MCP setup | Not connected to anything |

These files compile and are imported in `cli.ts`, but nothing calls into them because the CLI commands are commented out.

### What was the marketplace?

The idea was a place to share "decision packs" — curated sets of decisions for common stacks (e.g., "React best practices", "REST API conventions", "Go project structure"). Users could browse, install, and publish packs. It had Stripe integration for paid packs, ratings, download counts, and admin moderation.

The backend is in Supabase (see below). The frontend pages are in `website/src/pages/` (BrowsePage, PackDetailPage, CreatePackPage, etc.). None of it is accessible to users right now.

### Dead website pages

The website has **13 page components** that exist as files but have no routes in `App.tsx`:

`AdminReportsPage`, `BrowsePage`, `CliAuthPage`, `CloudDashboardPage`, `CreatePackPage`, `DashboardPage`, `EditPackPage`, `LoginPage`, `PackAnalyticsPage`, `PackDetailPage`, `PricingPage`, `ProfilePage`, `SettingsPage`

These were for the marketplace, cloud dashboard, auth flows, and pricing. The imports and routes are commented out in `App.tsx`. The pages reference Supabase, Stripe, and auth flows that aren't active.

**Only these website pages are active:** `HomePage`, `TermsPage`, `PrivacyPage`, and everything under `/docs`.

### Supabase backend

There's a full `website/supabase/` directory checked into the repo — migrations, edge functions, and a schema. This was the backend for the marketplace and cloud sync features:

- **Edge functions** — `create-checkout` (Stripe), `sync-decisions`, `embed-pack`, `embed-query`, `stripe-webhook`, etc.
- **Migrations** — 15+ migration files for tables like packs, user downloads, monetization, ratings, stripe connect
- **Schema** — complete database schema for the marketplace

None of this is connected to the active website. You don't need a Supabase account to work on DecisionNode. The `website/.env.example` references Supabase credentials, but those are only needed if you're working on the disabled marketplace/cloud features.

### VS Code extension

There's a `decisionnode-vscode/` directory — a partially built VS Code extension for viewing and managing decisions from the editor sidebar. It has tree views, diff panels, cloud sync providers, and its own build output. It's not published, not documented (the `VsCodePage.tsx` docs page exists but isn't routed), and not connected to anything. It's on the [Roadmap](ROADMAP.md) under "Planned."

### Unused imports

`cli.ts` line 7 imports everything from `cloud.ts` — login, logout, sync, conflicts, etc. These are only used by the commented-out handlers. TypeScript doesn't complain because the functions *are* referenced, just in dead code.

### The bottom line

The core product (CLI + MCP server + website/docs) is clean. If you're contributing to those, you can ignore everything above. The dead code won't affect your work — it just takes up space. If it's confusing, that's on me, and I'll clean it up eventually or re-enable the features when they're ready.

---

## Architecture overview

Here's how the active code flows:

```
User types `decide add`          AI calls `add_decision` via MCP
        |                                  |
        v                                  v
    src/cli.ts                     src/mcp/server.ts
        |                                  |
        +---------------+------------------+
        v               v
    src/store.ts     src/ai/rag.ts
    (read/write      (embed text -> vector,
     JSON files)      cosine similarity search)
        |               |
        v               v
  ~/.decisionnode/    Gemini API
  .decisions/         (gemini-embedding-001)
```

**Data flow:**
1. A decision is added -> `store.ts` writes it to `~/.decisionnode/.decisions/{project}/{scope}.json`
2. The decision text is embedded -> `ai/gemini.ts` calls the Gemini API, stores the vector in `vectors.json`
3. On search -> `ai/rag.ts` embeds the query, computes cosine similarity against all stored vectors, returns ranked matches above the threshold

**Key files (the ones you'll actually work with):**

| File | What it does |
|------|-------------|
| `src/cli.ts` | CLI entry point — all `decide` commands (first 1,150 lines) |
| `src/mcp/server.ts` | MCP server — 9 tools exposed to AI agents over stdio |
| `src/store.ts` | Decision CRUD — reads/writes JSON files, manages scopes |
| `src/ai/rag.ts` | Search engine — embedding, cosine similarity, conflict detection |
| `src/ai/gemini.ts` | Gemini API wrapper — embedding calls, availability checks |
| `src/env.ts` | Config, paths, global decision helpers |
| `src/history.ts` | Activity log — tracks who changed what from which tool |
| `src/types.ts` | TypeScript types (`DecisionNode`, `HistoryEntry`, etc.) |

---

## Getting started

**Prerequisites:** Node >= 20, npm, Git

```bash
# Clone and install
git clone https://github.com/decisionnode/DecisionNode.git
cd DecisionNode
npm install

# Build (TypeScript -> dist/)
npm run build

# Run your local build
node dist/cli.js help

# Install your local build globally (so `decide` uses your version)
npm install -g .

# Run tests
npm test

# Watch mode (rebuilds on save)
npm run dev
```

**Website** (separate project, lives in `website/`):

```bash
cd website
npm install
npm run dev     # dev server at localhost:5173
npm run build   # production build
```

---

## Testing

We use [Vitest](https://vitest.dev/). 36 tests across three tiers:

| Tier | Path | What it tests | Needs API key? |
|------|------|--------------|----------------|
| **Unit** | `tests/unit/` | Pure functions — config, store logic, search filtering | No |
| **Integration** | `tests/integration/` | Store CRUD + search with real file I/O (temp directories) | No |
| **Smoke** | `tests/smoke/` | CLI and MCP server actually start and respond | No |

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
```

**Adding tests:** If your PR changes behavior, add a test. Match the tier — if it's a pure function, unit test. If it touches the file system, integration. If it's about the CLI or MCP working end-to-end, smoke.

---

## Making changes

### Branch naming

```
fix/description       # bug fixes
feat/description      # new features
docs/description      # documentation
test/description      # tests
refactor/description  # code changes that don't change behavior
```

### Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add decide export --csv
fix: handle missing vectors.json gracefully
docs: update CLI reference with deprecate command
test: add integration tests for global decisions
refactor: extract embedding logic from rag.ts
chore: update gemini SDK to v2
```

Use a scope if it helps: `feat(mcp): add conflict detection to add_decision`

### Before opening a PR

```bash
npm run build    # TypeScript compiles clean
npm test         # all tests pass
```

If you changed the website:

```bash
cd website
npm run build    # no build errors
```

Manually test your change with the CLI: `node dist/cli.js <your-command>`

### PR guidelines

- **One thing per PR.** A bug fix is one PR. A feature is one PR. Don't mix.
- **Include a test** if you changed behavior.
- **Update the docs** if your change is user-facing. The docs live in `website/src/pages/docs/`. The single-file LLM docs are at `website/public/decisionnode-docs.md`.
- **Fill out the PR template** — it's short (what, how to test, checklist).

---

## What to work on

### Good first issues

- Fix a typo in the docs
- Improve a CLI error message
- Add a test for an untested edge case
- Add shell completions for `decide`

### Bigger contributions

- **CLI** — new commands, better output formatting
- **MCP tools** — new tools, smarter search
- **Context engine** — support for other embedding providers (OpenAI, Cohere, local models)
- **Website/docs** — pages are in `website/src/pages/docs/`, components in `website/src/components/docs/`

Check the [Roadmap](ROADMAP.md) for what's planned — "Next Up" items are the most likely to get merged.

---

## Project structure

```
DecisionNode/
  src/                     # CLI + MCP server source (TypeScript)
    ai/                    # Embedding and search (gemini.ts, rag.ts)
    mcp/                   # MCP server (server.ts)
    cli.ts                 # CLI entry point
    store.ts               # Decision storage
    env.ts                 # Config and paths
    history.ts             # Activity log
    types.ts               # TypeScript types
    cloud.ts               # [disabled] Cloud sync
    marketplace.ts         # [disabled] Decision marketplace
    setup.ts               # [disabled] Onboarding wizard

  tests/                   # Test suite (Vitest)
    unit/                  # Pure function tests
    integration/           # File I/O tests
    smoke/                 # CLI + MCP end-to-end tests

  website/                 # Docs site (React + Vite + Tailwind)
    src/pages/docs/        # Documentation pages (active)
    src/pages/             # Landing page + dead marketplace/cloud pages
    src/components/        # Shared UI components
    public/                # Static files, recordings

  recordings/              # VHS tape files for terminal recordings
  dist/                    # Compiled output (git-ignored)

  .github/
    workflows/ci.yml       # CI — runs tests on Node 20 + 22
    ISSUE_TEMPLATE/        # Bug report + feature request templates
    pull_request_template.md
```

---

## Deployment

- **npm package** — the CLI + MCP server ships as `decisionnode` on npm. Only the maintainer publishes.
- **Website** — hosted on [Vercel](https://vercel.com), deployed from `website/`. Deploys are manual (`npx vercel --prod` from the `website/` directory). There's no auto-deploy from git push.
- **Supabase** — there's a Supabase project for the marketplace/cloud features, but it's not active. You don't need access to it.

You don't need Vercel or Supabase access to contribute. Just make sure `npm run build` and `cd website && npm run build` both pass.

---

## Reporting bugs

[Open an issue](https://github.com/decisionnode/decisionnode/issues). Include:

- What you did
- What you expected
- What happened instead
- Your OS and Node version (`node -v`)

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
