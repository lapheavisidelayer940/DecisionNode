# DecisionNode — Full Documentation

> Structured, queryable memory for development decisions. Stores architectural choices as vector embeddings, exposes them to AI agents via MCP.

DecisionNode stores decisions as scoped JSON objects, embeds them as vectors using Gemini, and retrieves them via cosine similarity search. The AI calls `search_decisions` through MCP when it needs context — decisions are not injected into a system prompt.

---

## Two interfaces

DecisionNode has two interfaces that share the same data store (`~/.decisionnode/`):

- **CLI (`decide` or `decisionnode`) — for you.** Setup, add decisions, search, export/import, check embedding health, configure settings. Supports interactive prompts or one-command inline flags.
- **MCP server (`decide-mcp`) — for your AI.** `decide init` creates a `.mcp.json` in your project so AI clients connect automatically. The AI calls tools like `search_decisions` and `add_decision` over MCP with structured JSON input/output. Works with Claude Code, Cursor, Windsurf, Antigravity, or any MCP-compliant tool.

The CLI handles setup and maintenance (init, setup, embed, clean, export, import, config). The MCP server handles the AI's workflow (search, add, update, delete) with automatic conflict detection.

---

## Installation

```bash
npm install -g decisionnode
```

Installs three executables:
- `decide` — the CLI (short alias)
- `decisionnode` — the CLI (full name, same thing)
- `decide-mcp` — the MCP server (launched by AI clients, not run directly)

---

## Quickstart

### 1. Initialize

```bash
cd your-project
decide init
```

Creates `~/.decisionnode/.decisions/<ProjectName>/` and a `.mcp.json` for AI client integration.

### 2. Set up your API key

```bash
decide setup
```

Get a free key from [Google AI Studio](https://aistudio.google.com/) and paste it when prompted. Saved to `~/.decisionnode/.env`.

### 3. Add a decision

```bash
decide add
```

Prompts for:
- **Scope** — architectural domain (e.g. UI, Backend, API, Security). Each scope becomes its own JSON file.
- **Decision** — clear statement of what was decided.
- **Rationale** (optional) — the reasoning behind the choice.
- **Constraints** (optional) — specific rules to follow, comma-separated.

Or add in one command:

```bash
decide add -s UI -d "Use Tailwind for all styling" -r "Consistent tokens" -c "No arbitrary values"
```

### 4. Search

```bash
decide search "how should we style components?"
```

### 5. Your AI is already connected

`decide init` created `.mcp.json`. AI clients like Claude Code and Cursor read it automatically.

---

## Configuration

### Storage layout

```
~/.decisionnode/
  .env                          # Gemini API key
  config.json                   # Settings (search sensitivity)
  .decisions/
    _global/                    # Global decisions (shared across all projects)
      ui.json
      vectors.json
    MyProject/
      ui.json                   # Decisions scoped to "UI"
      backend.json              # Decisions scoped to "Backend"
      vectors.json              # Embedding vectors
      history/
        activity.json           # Audit log
```

### Multiple projects

Each project is identified by its directory name. `decide projects` lists all of them. The MCP server resolves the project automatically from the AI client's working directory.

### Search sensitivity

Changes the tool description the MCP server sends to the AI, controlling how often it calls `search_decisions`:

```bash
decide config search-sensitivity high    # Search before ANY code change (default)
decide config search-sensitivity medium  # Search only for significant changes
```

Restart the MCP server after changing.

### Global decisions

Decisions that apply across all projects:

```bash
decide add --global -s Security -d "Never commit .env files"
```

Stored in `~/.decisionnode/.decisions/_global/`. Automatically included in search results for every project. Global IDs use the `global:` prefix (e.g. `global:security-001`). If a project decision conflicts with a global one, the project decision takes priority.

---

## Decision Nodes

A Decision Node is a scoped technical choice with rationale and lifecycle.

### Structure

```json
{
  "id": "ui-001",
  "scope": "UI",
  "decision": "Use Tailwind CSS for all styling",
  "status": "active",
  "rationale": "Consistent design tokens, easy for AI to generate correct classes.",
  "constraints": [
    "No arbitrary values (e.g. w-[37px]) unless absolutely necessary",
    "Use @apply only for reusable base components"
  ],
  "createdAt": "2024-03-20T10:00:00Z"
}
```

### Fields

- **id** — auto-generated: first 10 lowercase letters of scope + 3-digit number (e.g. `ui-001`, `backend-003`). Global decisions display with `global:` prefix.
- **scope** — architectural domain. Normalized to title case. Each scope becomes its own JSON file.
- **decision** — clear, actionable statement. One sentence.
- **rationale** (optional) — the "why". Prevents the AI from suggesting alternatives that violate your reasoning.
- **constraints** (optional) — specific rules the AI reads as hard requirements.
- **status** — `active` (default, appears in search) or `deprecated` (hidden from search, re-activate later).

### Lifecycle

- **active** — in effect. Appears in search results.
- **deprecated** — hidden from search, invisible to AI. A softer alternative to deleting — the embedding is preserved, so re-activating with `decide activate` is instant.

```bash
decide deprecate ui-001   # hide from search
decide activate ui-001    # bring it back
```

Status can also be changed via MCP `update_decision(status="deprecated")`.

---

## Context Engine

### How it works

1. **Embedding** — decision text is converted to a vector using Gemini's `gemini-embedding-001`. The text embedded is: `{scope}: {decision}. {rationale} {constraints}`
2. **Storage** — vectors stored in `vectors.json` as `{ "ui-001": { "vector": [...], "embeddedAt": "..." } }`. Global vectors stored separately in `_global/vectors.json`.
3. **Retrieval** — query is embedded, compared against stored vectors via cosine similarity. Only active decisions are searched. Deprecated decisions are skipped but their embeddings are preserved.

### Conflict detection

When adding a decision (CLI or MCP), existing decisions are checked at a 75% similarity threshold.

- **CLI** — shows similar decisions, asks "Continue anyway?"
- **MCP** — returns the similar decisions without adding. The AI can then update the existing one, deprecate it, or re-call `add_decision` with `force=true`.

If the API key is missing, conflict detection is silently skipped.

### Why local?

- Fast retrieval (milliseconds, no network round-trips for search)
- Private (decisions stay on your machine, only embedding API calls are external)
- No infrastructure (no vector database, just a JSON file)

---

## CLI Reference

All commands work with both `decide` and `decisionnode` — they're the same command.

### Core Commands

- `decide init` — initialize project, creates `.mcp.json`
- `decide setup` — configure Gemini API key interactively
- `decide add` — add a decision interactively
- `decide add -s <scope> -d <decision> [-r <rationale>] [-c <constraints>]` — add in one command
- `decide add --global` — add a global decision (works with both modes)
- `decide list [--scope <scope>]` — list all decisions (includes global)
- `decide list --global` — list only global decisions
- `decide get <id>` — view full details (supports `global:` prefix)
- `decide search "<query>"` — semantic search, only active decisions, includes global
- `decide edit <id>` — edit text, rationale, constraints (supports `global:` prefix)
- `decide deprecate <id>` — hide from search, keep decision and embedding
- `decide activate <id>` — re-activate, immediately searchable
- `decide delete <id>` — permanently delete decision and embedding
- `decide delete-scope <scope>` — delete entire scope

### Data & Maintenance

- `decide export [format]` — prints to terminal, save with `> ~/file.json`. Formats: md (default), json, csv
- `decide export --global` — export global decisions
- `decide import <file> [--overwrite]` — import from JSON file (e.g. `decide import ~/decisions.json`)
- `decide import <file> --global` — import into global store
- `decide check` — show which decisions are missing embeddings
- `decide embed` — generate embeddings for unembedded decisions
- `decide clean` — remove orphaned vectors
- `decide history [--filter <source>]` — view activity log
- `decide projects` — list all projects (shows global separately)
- `decide config` — view/set search-sensitivity

---

## MCP Server

### Setup

`decide init` creates `.mcp.json` in your project. Claude Code, Cursor, and other clients read it automatically.

For Claude Desktop, add manually to its config file:

```json
{
  "mcpServers": {
    "decisionnode": {
      "command": "npx",
      "args": ["-y", "decisionnode", "start-server"]
    }
  }
}
```

For other clients, use `decide-mcp` with no arguments in their MCP settings.

### Tools (9)

1. **search_decisions(query, limit?, project)** — semantic search across active decisions. Includes global. Returns matches with similarity scores.
2. **list_decisions(scope?, project)** — list all decisions including global.
3. **get_decision(id, project)** — full details by ID. Supports `global:` prefix.
4. **add_decision(scope, decision, rationale, constraints, global?, force?, project)** — add a decision. If similar exist (75%), returns them instead. Re-call with `force=true` to override. `global=true` for cross-project.
5. **update_decision(id, decision?, rationale?, status?, constraints?, project)** — update content or status. Supports `global:` prefix.
6. **delete_decision(id, project)** — permanently delete. Supports `global:` prefix.
7. **get_history(limit?, project)** — activity log.
8. **get_status(project)** — project overview: counts, last activity.
9. **list_projects(verbose?)** — all projects + global count.

### Search Sensitivity

Changes the `search_decisions` tool description sent to the AI:

- **high** (default) — tool description says searching is mandatory before any code change.
- **medium** — tool description says search only for significant changes.

---

## Links

- GitHub: https://github.com/decisionnode/decisionnode
- Website: https://decisionnode.dev
- License: MIT
- MCP Protocol: https://modelcontextprotocol.io
