# Changelog

All notable changes to DecisionNode are documented here.

## [0.5.1] - 2026-04-08

### Added
- `glama.json` for Glama MCP registry listing

### Changed
- Updated README subtitle with cross-tool compatibility messaging

## [0.5.0] - 2026-04-06

### Added
- Configurable search threshold (`decide config search-threshold`, default 0.3)
- Search results below threshold are now filtered out (CLI + MCP)
- MCP client name tracking in history — shows `claude-code`, `cursor`, etc. instead of generic "MCP"
- Conflict detection now works in inline mode (`decide add -s ... -d ...`), not just interactive
- Agent behavior setting (`decide config agent-behavior strict|relaxed`) — renamed from search-sensitivity
- Feature recordings (VHS) for history, conflict, deprecate, global, threshold, embed, behavior
- Colorized history output — action words, decision IDs, and MCP client names in color
- "Copy page for AI" button outputs proper markdown instead of raw text
- ROADMAP.md with tiered priorities
- Accurate MCP setup instructions for Cursor, Windsurf, Antigravity, Claude Desktop
- Homepage feature grid with embedded terminal recordings

### Changed
- Repositioned messaging: "Record a decision, embed it as a vector, search it later"
- Renamed search-sensitivity to agent-behavior (strict/relaxed instead of high/medium)
- Updated all docs, README, LLM docs, homepage for consistency
- History log shows Deprecated/Activated instead of generic "Updated"
- MCP updates and deletes now log with correct source

## [0.4.0] - 2026-04-06

### Added
- Polished CLI with colored output, box-drawing, and branded banner
- Hidden API key input in `decide setup` (password-style)
- Test suite: 32 tests (unit, integration, smoke) with Vitest
- CHANGELOG.md
- GitHub issue templates, PR template, and CI workflow (Node 20/22)

### Changed
- Removed `.mcp.json` from repo (users connect via `claude mcp add`)
- Requires Node >= 20

## [0.3.0] - 2026-04-05

### Added
- MCP setup instructions for Claude Code, Cursor, Windsurf, Antigravity, Claude Desktop
- Open Graph preview image for link sharing
- JSON-LD structured data for Google rich results
- Sitemap, robots.txt, SEO meta tags
- Mobile responsive docs layout
- GitHub stars badge on landing page and docs sidebar
- Anchor links on all docs sections

### Changed
- MCP setup now uses `claude mcp add decisionnode -s user decide-mcp` instead of `.mcp.json`
- `decide init` no longer creates `.mcp.json`
- Removed references to VS Code extension, marketplace, and cloud sync from website

### Fixed
- MCP server connection issues on Windows

## [0.2.0] - 2026-04-05

### Fixed
- npm version conflict (v0.1.0 was permanently locked after unpublish)

## [0.1.0] - 2026-04-05

### Added
- CLI with commands: init, setup, add, list, get, search, edit, delete, deprecate, activate, check, embed, export, import, history, projects, config
- Inline add with `-s`, `-d`, `-r`, `-c` flags
- MCP server with 9 tools for AI agent integration
- Semantic search via Gemini `gemini-embedding-001` embeddings
- Cosine similarity scoring with ranked results
- Global decisions (`--global` flag, `global:` prefix, shared across projects)
- Conflict detection at 75% similarity threshold
- Decision lifecycle: active and deprecated statuses
- Activity history with audit log
- Export to JSON, Markdown, CSV
- Import from JSON with optional overwrite
- Agent behavior configuration (strict/relaxed)
- Per-project storage in `~/.decisionnode/.decisions/`
