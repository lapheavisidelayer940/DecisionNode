<p align="center">
  <img src="website/src/assets/images/DecisionNode-transparent.png" width="150" />
</p>

<h1 align="center">DecisionNode</h1>

<p align="center">
  Structured, queryable memory for development decisions.<br/>
  Stores architectural choices as vector embeddings, exposes them to AI agents via MCP.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  <img src="https://img.shields.io/npm/v/decisionnode.svg" alt="npm version" />
  <img src="https://github.com/decisionnode/DecisionNode/actions/workflows/ci.yml/badge.svg" alt="CI" />
</p>

---

<p align="center">
  <img src="website/public/demo.gif" alt="DecisionNode Demo" width="800" />
</p>

Your AI keeps forgetting what you agreed on. You say "use Tailwind, no CSS modules" — next session, it writes CSS modules. DecisionNode stores these decisions as vector embeddings so the AI can search them before writing code.

Not a markdown file. A queryable memory layer with semantic search.

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

## Documentation

Full docs at [decisionnode.dev/docs](https://decisionnode.dev/docs)

- [Quickstart](https://decisionnode.dev/docs/quickstart)
- [CLI Reference](https://decisionnode.dev/docs/cli) — all commands
- [MCP Server](https://decisionnode.dev/docs/mcp) — 9 tools, setup for Claude/Cursor/Windsurf
- [Decision Nodes](https://decisionnode.dev/docs/decisions) — structure, fields, lifecycle
- [Context Engine](https://decisionnode.dev/docs/context) — embedding, search, conflict detection
- [Configuration](https://decisionnode.dev/docs/setup) — storage, search sensitivity, global decisions
- [Workflows](https://decisionnode.dev/docs/workflows) — common patterns

For LLM consumption: [decisionnode.dev/decisionnode-docs.md](https://decisionnode.dev/decisionnode-docs.md)

## Contributing

The CLI and MCP server are just the start. There's a VS Code extension, a marketplace for shared decision packs, and cloud sync being worked on — contributions to any of these are welcome.

Whether it's a bug fix, a new feature, improving the docs, or just starring the repo — all help is appreciated. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get started.

## License

MIT — see [LICENSE](LICENSE).
