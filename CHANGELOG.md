# Changelog

All notable changes to DecisionNode are documented here.

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
- Search sensitivity configuration (high/medium)
- Per-project storage in `~/.decisionnode/.decisions/`
