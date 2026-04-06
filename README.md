<p align="center">
  <img src="website/src/assets/images/DecisionNode-transparent.png" width="150" />
</p>

<h1 align="center">DecisionNode</h1>

<p align="center">
  Record a decision, embed it as a vector, search it later.<br/>
  Works from the CLI or through your AI via MCP.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  <img src="https://img.shields.io/npm/v/decisionnode.svg" alt="npm version" />
  <img src="https://github.com/decisionnode/DecisionNode/actions/workflows/ci.yml/badge.svg" alt="CI" />
</p>

---

<p align="center">
  <img src="website/public/recordings/demo.gif" alt="DecisionNode Demo" width="800" />
</p>

Record a decision, embed it as a vector, search it later. Works from the CLI or through your AI via MCP. Same store, every tool.

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

## How it works

1. **A decision is made** — via `decide add` or the AI calls `add_decision` through MCP
2. **Embedded as a vector** — using Gemini's `gemini-embedding-001`, stored locally in `vectors.json`
3. **AI retrieves it later** — calls `search_decisions` via MCP, gets back relevant decisions ranked by cosine similarity

The retrieval is explicit — the AI calls the MCP tool to search. Decisions are not injected into a system prompt.

## Two interfaces

| | CLI (`decide`) | MCP Server (`decide-mcp`) |
|---|---|---|
| **For** | You | Your AI |
| **How** | Terminal commands | Structured JSON over MCP |
| **Does** | Setup, add, search, edit, deprecate, export, import, config | Search, add, update, delete, list, history |

Both read and write to the same local store (`~/.decisionnode/`).

## Quick reference

```bash
decide add                          # interactive add
decide add -s UI -d "Use Tailwind"  # one-command add
decide add --global                 # applies to all projects
decide search "error handling"      # semantic search
decide list                         # list all (includes global)
decide deprecate ui-003             # soft-delete (reversible)
decide activate ui-003              # bring it back
decide check                        # embedding health
decide embed                        # fix missing embeddings
decide export json > decisions.json # export to file
```

## Features in action

### History tracking
Every change is logged with the source — `cli` for terminal, or the MCP client name (`claude-code`, `cursor`, etc.).

<img src="website/public/recordings/history.gif" alt="decide history" width="700" />

### Conflict detection
<img src="website/public/recordings/conflict.gif" alt="conflict detection" width="700" />

### Deprecate / Activate
<img src="website/public/recordings/deprecate.gif" alt="deprecate and activate" width="700" />

### Global decisions
<img src="website/public/recordings/global.gif" alt="global decisions in search" width="700" />

### Agent behavior
<img src="website/public/recordings/behavior.gif" alt="agent behavior strict vs relaxed" width="700" />

### Configurable threshold
<img src="website/public/recordings/threshold.gif" alt="configurable search threshold" width="700" />

### Embedding health
<img src="website/public/recordings/embed.gif" alt="decide check and decide embed" width="700" />

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
