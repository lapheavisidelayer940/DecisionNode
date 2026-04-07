import { Box } from 'lucide-react';
import { Section, CodeBlock } from '../../components/docs/DocsComponents';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function McpServerPage() {
    const tools = [
        {
            name: "search_decisions",
            params: "query, limit?, project",
            desc: "Semantic search across active decisions only — deprecated decisions are excluded. Automatically includes global decisions. The AI calls this before writing code.",
        },
        {
            name: "list_decisions",
            params: "scope?, project",
            desc: "List all recorded decisions for a project, including global decisions. Optionally filter by scope.",
        },
        {
            name: "get_decision",
            params: "id, project",
            desc: "Get full details of a specific decision by ID. Supports global: prefix for global decisions (e.g. global:ui-001).",
        },
        {
            name: "add_decision",
            params: "scope, decision, rationale, constraints, global?, force?, project",
            desc: "Record a new decision. If similar decisions exist (75% similarity), returns them instead of adding — the AI can then update the existing one, deprecate it, or re-call with force=true to add anyway. Set global=true for cross-project decisions.",
        },
        {
            name: "update_decision",
            params: "id, decision?, rationale?, status?, constraints?, project",
            desc: "Update an existing decision. Supports global: prefix. Set status to 'deprecated' to hide from search or 'active' to re-enable.",
        },
        {
            name: "delete_decision",
            params: "id, project",
            desc: "Permanently delete a decision and its embedding. Supports global: prefix. Consider deprecating instead if the user might want it back.",
        },
        {
            name: "get_history",
            params: "limit?, project",
            desc: "View the activity log of recent decision changes — adds, edits, deletes, and syncs.",
        },
        {
            name: "get_status",
            params: "project",
            desc: "Get a project overview: total decisions, active count, and last activity.",
        },
        {
            name: "list_projects",
            params: "verbose?",
            desc: "List all projects with decisions, plus global decision count. Use this first in monorepos to find the right project name.",
        },
    ];

    return (
        <>
        <Helmet>
            <title>MCP Server — DecisionNode Docs</title>
            <meta name="description" content="DecisionNode MCP server setup — connect your AI coding tools via the Model Context Protocol." />
            <link rel="canonical" href="https://decisionnode.dev/docs/mcp" />
        </Helmet>
        <div className="animate-fade-in max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-8 font-mono">
                <Link to="/docs" className="hover:text-primary-400 transition-colors">Docs</Link>
                <span className="text-zinc-700">/</span>
                <span className="text-primary-400">Reference</span>
            </div>

            <div className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-6">MCP Server</h1>
                <p className="text-xl text-zinc-400 leading-relaxed border-l-2 border-primary-500/50 pl-6">
                    DecisionNode exposes your decisions to AI agents via the <strong>Model Context Protocol (MCP)</strong>. This is how your AI actually reads and writes decisions.
                </p>
            </div>

            <Section title="What is MCP?" id="what-is-mcp">
                <p className="text-zinc-400 mb-4">
                    MCP is an open standard that lets AI models interact with local tools and data. DecisionNode provides an MCP server that exposes your architectural decisions as tools to agents like Claude, Cursor, Windsurf, or Antigravity.
                </p>
                <p className="text-zinc-400">
                    The server runs via <strong>stdio</strong> transport — no ports, no background processes. It starts on demand when your AI client needs it.
                </p>
            </Section>

            <Section title="Setup" id="setup">
                <p className="text-zinc-400 mb-4">
                    After installing DecisionNode, connect the MCP server to your AI client.
                </p>

                <h3 className="text-zinc-200 font-bold mb-2">Claude Code</h3>
                <p className="text-zinc-400 text-sm mb-3">
                    Run this once — it registers the MCP server globally so it works in every project:
                </p>
                <CodeBlock code="claude mcp add decisionnode -s user decide-mcp" />
                <p className="text-zinc-400 text-sm mt-3">
                    Restart Claude Code after running this. Verify with <code>/mcp</code> — it should show under "User MCPs".
                </p>

                <h3 className="text-zinc-200 font-bold mb-2 mt-8">Cursor</h3>
                <p className="text-zinc-400 text-sm mb-3">
                    Open <strong className="text-zinc-200">Cursor Settings → Tools & MCP</strong> → click "Add new MCP server". Or edit the config file directly:
                </p>
                <p className="text-sm text-zinc-500 mb-2 font-mono">
                    ~/.cursor/mcp.json
                </p>
                <CodeBlock code={`{
  "mcpServers": {
    "decisionnode": {
      "command": "decide-mcp",
      "args": []
    }
  }
}`} />
                <p className="text-zinc-400 text-sm mt-3">
                    Fully restart Cursor after adding. You can check the status in <strong className="text-zinc-200">Settings → Tools & MCP</strong> — it should show a green indicator.
                </p>

                <h3 className="text-zinc-200 font-bold mb-2 mt-8">Windsurf</h3>
                <p className="text-zinc-400 text-sm mb-3">
                    Go to <strong className="text-zinc-200">File → Preferences → Windsurf Settings → Manage MCPs → View raw config</strong> to edit <code>mcp_config.json</code>:
                </p>
                <p className="text-sm text-zinc-500 mb-2 font-mono">
                    ~/.codeium/windsurf/mcp_config.json
                </p>
                <CodeBlock code={`{
  "mcpServers": {
    "decisionnode": {
      "command": "decide-mcp",
      "args": []
    }
  }
}`} />

                <h3 className="text-zinc-200 font-bold mb-2 mt-8">Antigravity</h3>
                <p className="text-zinc-400 text-sm mb-3">
                    Open the side panel → click <strong className="text-zinc-200">"…" dropdown → MCP Servers → Manage MCP Servers → View raw config</strong> to edit <code>mcp_config.json</code>:
                </p>
                <p className="text-sm text-zinc-500 mb-2 font-mono">
                    ~/.gemini/antigravity/mcp_config.json
                </p>
                <CodeBlock code={`{
  "mcpServers": {
    "decisionnode": {
      "command": "decide-mcp",
      "args": []
    }
  }
}`} />

                <h3 className="text-zinc-200 font-bold mb-2 mt-8">Claude Desktop</h3>
                <p className="text-zinc-400 text-sm mb-2">
                    Add to the config file manually:
                </p>
                <p className="text-sm text-zinc-500 mb-2 font-mono">
                    ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)<br />
                    %APPDATA%\Claude\claude_desktop_config.json (Windows)
                </p>
                <CodeBlock code={`{
  "mcpServers": {
    "decisionnode": {
      "command": "decide-mcp",
      "args": []
    }
  }
}`} />

                <h3 className="text-zinc-200 font-bold mb-2 mt-8">Other MCP clients</h3>
                <p className="text-zinc-400 text-sm mb-3">
                    Any client that supports MCP stdio transport should work. The command is <code>decide-mcp</code> with no arguments. If the client needs a full path, use <code>npx -y decisionnode start-server</code> instead.
                </p>
            </Section>

            <Section title="Tools (9)" id="tools">
                <p className="text-zinc-400 mb-6">
                    These tools are automatically available to any connected AI agent.
                </p>
                <div className="space-y-4">
                    {tools.map((t) => (
                        <div key={t.name} className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-5">
                            <div className="flex items-start gap-3">
                                <Box className="w-4 h-4 text-primary-400 mt-1 flex-shrink-0" />
                                <div>
                                    <code className="text-primary-400 font-bold text-sm">{t.name}</code>
                                    <span className="text-zinc-600 text-xs ml-2 font-mono">({t.params})</span>
                                    <p className="text-zinc-400 text-sm mt-1.5">{t.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="What the AI actually sees" id="tool-descriptions">
                <p className="text-zinc-400 mb-4">
                    MCP tool descriptions are sent to the AI as part of its system prompt on every message. This is how the AI decides when to call each tool. Here's what it sees for the key tools:
                </p>

                <div className="space-y-4">
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">search_decisions</code>
                            <span className="text-xs text-yellow-400/80 border border-yellow-400/30 rounded px-1.5 py-0.5">strict mode</span>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            MANDATORY: Call this FIRST before ANY code changes. When user asks you to: add a feature, modify code, fix a bug, implement something, refactor, style UI, or make ANY technical choice — you MUST call this tool FIRST to check for existing conventions. Skipping this causes inconsistency and wasted rework. Query with what you're about to work on. If no decisions exist, proceed freely; if decisions exist, FOLLOW them.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">search_decisions</code>
                            <span className="text-xs text-blue-400/80 border border-blue-400/30 rounded px-1.5 py-0.5">relaxed mode</span>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            Check for existing decisions when making significant changes or when unsure about project conventions. Use this tool to understand established patterns before implementing major features, architectural changes, or when working on new areas of the codebase. If no decisions exist, proceed with your best judgment.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">add_decision</code>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            Call this IMMEDIATELY when user says phrases like: "Let's use...", "From now on...", "Always do...", "Never do...", "I prefer...", "The standard is...", "We should always...", or confirms ANY technical approach. Also call when a design pattern is established, an architectural choice is made, coding standards are discussed, UI/UX conventions are agreed, or technology stack decisions happen. Capture decisions DURING the conversation, not after.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">list_decisions</code>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            List all recorded decisions for the project. Use this when you need a complete overview of project conventions, or when starting work on a new feature area to understand existing patterns.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">get_decision</code>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            Get full details of a specific decision by ID. Use this after search_decisions returns relevant results to get complete context including rationale and constraints.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">update_decision</code>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            Update an existing decision when requirements change or the approach evolves. Use this instead of creating duplicate decisions.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">delete_decision</code>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            Permanently delete a decision. Only use when a decision was created in error. For outdated decisions, prefer update_decision with status=deprecated to preserve history.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">get_history</code>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            View the activity log of recent decision changes. Use this to understand what decisions were recently added or modified.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">get_status</code>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            Get project decision status overview including total count and last activity. Use this for a quick health check of the decision store.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <code className="text-primary-400 font-bold text-sm">list_projects</code>
                        </div>
                        <p className="text-zinc-500 text-sm font-mono leading-relaxed">
                            Call this FIRST if unsure which project to use. In monorepos or multi-project workspaces, this lists all projects with decisions. Match the returned project name to the subfolder in the user's active file path.
                        </p>
                    </div>
                </div>
            </Section>

            <Section title="Agent Behavior" id="agent-behavior">
                <p className="text-zinc-400 mb-4">
                    This setting changes the <strong className="text-zinc-200">tool description</strong> that the MCP server sends to the AI client for the <code>search_decisions</code> tool. AI agents read tool descriptions to decide when to call each tool — so changing the description changes how often the AI searches.
                </p>
                <div className="space-y-3">
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                        <code className="text-yellow-400 text-sm font-bold">strict</code>
                        <span className="text-zinc-500 text-xs ml-2">(default)</span>
                        <p className="text-zinc-400 text-sm mt-1">The tool description tells the AI that calling <code>search_decisions</code> is <strong className="text-zinc-200">mandatory</strong> before any code change — features, bug fixes, refactors, styling, anything.</p>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                        <code className="text-blue-400 text-sm font-bold">relaxed</code>
                        <p className="text-zinc-400 text-sm mt-1">The tool description tells the AI to search only for significant changes or when unsure about conventions. The AI uses its own judgment for smaller tasks.</p>
                    </div>
                </div>
                <CodeBlock code="decide config agent-behavior relaxed" />
                <p className="text-zinc-400 mt-4 text-sm">
                    After changing this, restart your MCP server or reconnect your AI client for the new description to take effect.
                </p>

                <div className="mt-6 rounded-lg overflow-hidden border border-white/10">
                    <video autoPlay muted loop playsInline className="w-full">
                        <source src="/recordings/behavior.mp4" type="video/mp4" />
                    </video>
                </div>
            </Section>
        </div>
        </>
    );
}
