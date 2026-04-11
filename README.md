<p align="center">
  <img src="website/src/assets/images/DecisionNode-transparent.png" width="150" />
</p>

<h1 align="center">DecisionNode</h1>

<p align="center">
  Record structured decisions once, search them from all your AI coding tools — a shared structured memory store across Claude Code, Cursor, Windsurf, Antigravity, and every MCP client.
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.npmjs.com/package/decisionnode"><img src="https://img.shields.io/npm/v/decisionnode.svg" alt="npm version" /></a>
  <img src="https://github.com/decisionnode/DecisionNode/actions/workflows/ci.yml/badge.svg" alt="CI" />
  <a href="https://glama.ai/mcp/servers/decisionnode/DecisionNode"><img src="https://glama.ai/mcp/servers/decisionnode/DecisionNode/badges/score.svg?v=1" alt="Glama" /></a>
</p>

---

<p align="center">
  <img src="website/public/recordings/demo.gif" alt="DecisionNode Demo" width="800" />
</p>

Not a markdown file — structured decisions with semantic search, exposed over MCP.

## Install

```bash
npm install -g decisionnode
cd your-project
decide init      # creates project store
decide setup     # configure Gemini API key (free tier)

# Connect to Claude Code (run once)
claude mcp add decisionnode -s user decide-mcp
```

## What a decision looks like

```json
{
  "id": "backend-007",
  "scope": "Backend",
  "decision": "Skipped connection pooling for the embeddings DB — single writer, revisit if we add a sync daemon",
  "status": "active",
  "rationale": "Only one process writes at a time in the current architecture. Pooling added complexity with no measurable benefit. If we add a background sync process this will need to change.",
  "constraints": [
    "Do not add concurrent writers without revisiting this first"
  ],
  "createdAt": "2024-11-14T09:22:00Z"
}
```
Stored as JSON, embedded as a vector, searchable by meaning.
Decisions are not exactly "Rules" that the AI should have in it's context window the entire time (those are better suited for CLAUDE.md or memory.md). Decisions are thought of to be more like "Memories" that the AI can pull in when it's actually relevant through semantic search. 

## How it works

1. **A decision is made** — via `decide add` or the AI calls `add_decision` through MCP
2. **Embedded as a vector** — using Gemini's `gemini-embedding-001`, stored locally in `vectors.json`
3. **AI retrieves it later** — calls `search_decisions` via MCP, gets back relevant decisions ranked by cosine similarity

The retrieval is explicit — the AI calls search decisions tool via MCP passing a query and getting back the top N decisions ranked by cosine similarity. Nothing is pre-injected into the system prompt.

## Two interfaces

| | CLI (`decide`) | MCP Server (`decide-mcp`) |
|---|---|---|
| **For** | You (and your AI) | Your AI (and you) |
| **How** | Terminal commands | Structured JSON over MCP |
| **Does** | Setup, add, search, edit, deprecate, export, import, config | Search, add, update, delete, list, history |

Both read and write to the same local store (`~/.decisionnode/`).

## Quick reference

```bash
decide add                          # interactive add
decide add -s Backend -d "Skipped connection pooling for the embeddings DB — single writer, revisit if we add a sync daemon"
decide add --global                 # applies to all projects
decide search "connection pooling"  # semantic search
decide list                         # list all (includes global)
decide deprecate ui-003             # soft-delete (reversible)
decide activate ui-003              # bring it back
decide check                        # embedding health
decide embed                        # fix missing embeddings
decide export json > decisions.json # export to file
```

## Features

<details>
<summary><strong>History tracking</strong> — full audit trail with source tracking</summary>
<br/>
Every add, edit, deprecation, and delete is logged. The history shows which tool made each change — <code>cli</code> for terminal commands, or the MCP client name (<code>claude-code</code>, <code>cursor</code>, <code>windsurf</code>) for AI-initiated changes.

<img src="website/public/recordings/history.gif" alt="decide history" width="700" />
</details>

<details>
<summary><strong>Conflict detection</strong> — catch duplicates before they're saved</summary>
<br/>
When adding a decision, existing decisions are checked at 75% similarity. The CLI warns you and asks to confirm. The MCP server returns the conflicts so the AI can decide whether to update, deprecate, or force-add.

<img src="website/public/recordings/conflict.gif" alt="conflict detection" width="700" />
</details>

<details>
<summary><strong>Deprecate / Activate</strong> — soft-delete without losing embeddings</summary>
<br/>
Deprecated decisions are hidden from search but their embeddings are preserved. Reactivate them later and they're immediately searchable again — no re-embedding needed.

<img src="website/public/recordings/deprecate.gif" alt="deprecate and activate" width="700" />
</details>

<details>
<summary><strong>Global decisions</strong> — shared across all projects</summary>
<br/>
Decisions like "never commit .env files" or "always use TypeScript strict mode" can be marked as global. They're stored separately and automatically included in every project's search results.

<img src="website/public/recordings/global.gif" alt="global decisions in search" width="700" />
</details>

<details>
<summary><strong>Agent behavior</strong> — control how aggressively the AI searches</summary>
<br/>
This setting changes the <code>search_decisions</code> tool description sent to the AI. <strong>Strict</strong> (default) tells the AI searching is mandatory before any code change. <strong>Relaxed</strong> lets the AI decide when searching is relevant.

<img src="website/public/recordings/behavior.gif" alt="agent behavior strict vs relaxed" width="700" />
</details>

<details>
<summary><strong>Configurable threshold</strong> — filter out weak matches</summary>
<br/>
Set the minimum similarity score (0.0–1.0) for search results. The default is 0.3. Raise it to reduce noise, lower it to surface more loosely related decisions. Applies to both CLI and MCP searches.

<img src="website/public/recordings/threshold.gif" alt="configurable search threshold" width="700" />
</details>

<details>
<summary><strong>Embedding health</strong> — check and fix missing vectors</summary>
<br/>
<code>decide check</code> shows which decisions are missing embeddings. <code>decide embed</code> generates them. <code>decide clean</code> removes orphaned vectors from deleted decisions.

<img src="website/public/recordings/embed.gif" alt="decide check and decide embed" width="700" />
</details>

## Documentation

Full docs at [decisionnode.dev/docs](https://decisionnode.dev/docs)

- [Quickstart](https://decisionnode.dev/docs/quickstart)
- [CLI Reference](https://decisionnode.dev/docs/cli) — all commands
- [MCP Server](https://decisionnode.dev/docs/mcp) — 9 tools, setup for Claude/Cursor/Windsurf
- [Decision Nodes](https://decisionnode.dev/docs/decisions) — structure, fields, lifecycle
- [Context Engine](https://decisionnode.dev/docs/context) — embedding, search, conflict detection
- [Configuration](https://decisionnode.dev/docs/setup) — storage, agent behavior, search threshold, global decisions
- [Workflows](https://decisionnode.dev/docs/workflows) — common patterns

For LLM consumption: [decisionnode.dev/decisionnode-docs.md](https://decisionnode.dev/decisionnode-docs.md)

## Contributing

See [ROADMAP.md](./ROADMAP.md) for what's coming next. Bug fixes, features, docs improvements, or just ideas are all welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get started.

## License

MIT — see [LICENSE](LICENSE).
