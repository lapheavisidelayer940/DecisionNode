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

tests/                  # Test suite (Vitest)
  unit/                 # Pure function tests
  integration/          # Store CRUD, search logic
  smoke/                # CLI and MCP server smoke tests

website/                # Docs site (decisionnode.dev)
  src/pages/docs/       # Documentation pages
  src/pages/            # Landing page, terms, privacy
  src/components/       # Shared components
  public/               # Static files (llms.txt, decisionnode-docs.md)
```

**What's live right now:** the CLI, MCP server, and docs website.

**What's being worked on:** VS Code extension, cloud sync, and a marketplace for shared decision packs. These aren't active yet — the code is in the repo as a starting point.

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
- **Documentation** — the docs pages are in `website/src/pages/docs/`. The single-file docs are at `website/public/decisionnode-docs.md`.

## How to submit changes

1. Fork the repo
2. Create a branch: `git checkout -b fix/better-error-message`
3. Make your changes
4. Make sure it builds: `npx tsc`
5. Run tests: `npm test`
6. Test it manually: `node dist/cli.js help`
7. Commit using conventional commits (see below)
8. Open a PR against `main`

Keep PRs focused — one feature or fix per PR is easier to review.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
type: short description
```

Types:
- `feat:` — new feature (`feat: add decide export --csv`)
- `fix:` — bug fix (`fix: handle missing vectors.json gracefully`)
- `docs:` — documentation changes (`docs: update CLI reference with deprecate command`)
- `chore:` — maintenance, config, dependencies (`chore: update gemini SDK to v2`)
- `refactor:` — code change that doesn't fix a bug or add a feature
- `test:` — adding or updating tests

Use a scope if it helps: `feat(mcp): add conflict detection to add_decision`

## Reporting bugs

Open an issue on GitHub. Include:
- What you did
- What you expected
- What happened instead
- Your OS, Node version, and how you installed DecisionNode

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
