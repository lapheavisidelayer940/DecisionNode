import { Box } from 'lucide-react';
import { Section, CodeBlock } from '../../components/docs/DocsComponents';
import { Link } from 'react-router-dom';

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
                    Restart Claude Code after running this. You can verify it's connected with <code>/mcp</code> — it should show under "User MCPs".
                </p>

                <h3 className="text-zinc-200 font-bold mb-2 mt-8">Cursor / Windsurf / Antigravity</h3>
                <p className="text-zinc-400 text-sm mb-3">
                    Each has its own MCP settings panel. Use the command <code>decide-mcp</code> with no arguments.
                </p>

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

            <Section title="Resources" id="resources">
                <p className="text-zinc-400 mb-4">
                    The server also exposes one MCP resource:
                </p>
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-5">
                    <code className="text-primary-400 font-bold text-sm">decisionnode://instructions</code>
                    <p className="text-zinc-400 text-sm mt-1.5">
                        AI assistant guidelines — tells the agent when and how to use DecisionNode tools. Includes trigger phrases, quality guidelines, and example workflows.
                    </p>
                </div>
            </Section>

            <Section title="Search Sensitivity" id="search-sensitivity">
                <p className="text-zinc-400 mb-4">
                    This setting changes the <strong className="text-zinc-200">tool description</strong> that the MCP server sends to the AI client for the <code>search_decisions</code> tool. AI agents read tool descriptions to decide when to call each tool — so changing the description changes how often the AI searches.
                </p>
                <div className="space-y-3">
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                        <code className="text-yellow-400 text-sm font-bold">high</code>
                        <span className="text-zinc-500 text-xs ml-2">(default)</span>
                        <p className="text-zinc-400 text-sm mt-1">The tool description tells the AI that calling <code>search_decisions</code> is <strong className="text-zinc-200">mandatory</strong> before any code change — features, bug fixes, refactors, styling, anything.</p>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                        <code className="text-blue-400 text-sm font-bold">medium</code>
                        <p className="text-zinc-400 text-sm mt-1">The tool description tells the AI to search only for significant changes or when unsure about conventions. The AI uses its own judgment for smaller tasks.</p>
                    </div>
                </div>
                <CodeBlock code="decide config search-sensitivity medium" />
                <p className="text-zinc-400 mt-4 text-sm">
                    After changing this, restart your MCP server or reconnect your AI client for the new description to take effect.
                </p>
            </Section>
        </div>
    );
}
