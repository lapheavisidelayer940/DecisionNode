# Contributing to DecisionNode

Thanks for considering contributing! This is a solo project right now, so any help — bug fixes, features, docs improvements, or even just starring the repo — goes a long way.

## What's in the repo

This is a monorepo with several components:

```
src/                    # CLI + MCP server (ships to npm as "decisionnode")
  cli.ts                # CLI entry point (decide command)
  mcp/server.ts         # MCP server (decide-mcp)
  ai/                   # Embedding + RAG search (gemini.ts, rag.ts)
  store.ts              # Decision storage (read/write JSON files)
  env.ts                # Config, paths, global decisions
  types.ts              # TypeScript types

website/                # Docs site (decisionnode.dev)
  src/pages/docs/       # Documentation pages
  src/pages/            # Landing page, terms, privacy
  src/components/       # Shared components
  public/               # Static files (llms.txt, decisionnode-docs.md)

decisionnode-vscode/    # VS Code extension (WIP, not published yet)
website/supabase/       # Marketplace backend (WIP, not active)
src/cloud.ts            # Cloud sync (WIP, commented out in CLI)
src/marketplace.ts      # Marketplace CLI (WIP, commented out in CLI)
```

**What's live right now:** the CLI, MCP server, and docs website.

**What's being worked on:** VS Code extension, marketplace for shared decision packs, cloud sync. These are in the repo but not active — the code is there as a starting point.

## Getting started

```bash
# Clone
git clone https://github.com/decisionnode/DecisionNode.git
cd DecisionNode

# Install dependencies
npm install

# Build the CLI + MCP server
npx tsc

# Test locally
node dist/cli.js help

# Install your local build globally
npm install -g .

# Run the docs site
cd website
npm install
npm run dev
```

## What to work on

### Good first contributions
- Fix a typo in the docs
- Improve a CLI error message
- Add a missing command to the help text
- Write a test

### Bigger contributions
- **CLI features** — new commands, better output formatting, shell completions
- **MCP tools** — new tools, better conflict detection, smarter search
- **Context engine** — support for other embedding providers besides Gemini
- **VS Code extension** — the `decisionnode-vscode/` folder has a WIP extension with decision tree view and commit timeline. Needs work.
- **Marketplace** — `website/src/pages/` has inactive marketplace pages (BrowsePage, CreatePackPage, etc.) and `website/supabase/` has the backend. Not active yet.
- **Cloud sync** — `src/cloud.ts` has the sync logic, CLI handlers are commented out in `src/cli.ts`. Needs a backend.
- **Documentation** — the docs pages are in `website/src/pages/docs/`. The single-file docs are at `website/public/decisionnode-docs.md`.

## How to submit changes

1. Fork the repo
2. Create a branch: `git checkout -b fix/better-error-message`
3. Make your changes
4. Make sure it builds: `npx tsc`
5. Test it: `node dist/cli.js help`
6. Open a PR against `main`

Keep PRs focused — one feature or fix per PR is easier to review.

## Reporting bugs

Open an issue on GitHub. Include:
- What you did
- What you expected
- What happened instead
- Your OS, Node version, and how you installed DecisionNode

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
