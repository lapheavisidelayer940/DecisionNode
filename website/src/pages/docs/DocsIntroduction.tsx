import {
    Terminal,
    Puzzle,
    Code2,
    Zap,
    Github
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Section, Tabs, Card, CardGroup, CodeBlock } from '../../components/docs/DocsComponents';

export default function DocsIntroduction() {
    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-8 font-mono">
                <Link to="/docs" className="hover:text-primary-400 transition-colors">Docs</Link>
                <span className="text-zinc-700">/</span>
                <span className="text-primary-400">Introduction</span>
            </div>

            <div className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-6">Introduction</h1>
                <p className="text-xl text-zinc-400 leading-relaxed border-l-2 border-primary-500/50 pl-6">
                    DecisionNode is a structured, queryable memory layer for development decisions. It stores architectural choices as vector embeddings and exposes them to AI agents via MCP.
                </p>
            </div>

            <Section title="The problem" id="the-problem">
                <div className="space-y-4 text-zinc-400">
                    <p>
                        AI coding assistants today have limited memory. Most rely on flat markdown files (<code>CLAUDE.md</code>, <code>CURSORRULES</code>, etc.) that get injected into the system prompt. This approach has clear limitations:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                        <li><strong className="text-zinc-200">No semantic retrieval</strong> — the entire file is loaded every time, regardless of relevance. A question about button styling loads your database migration rules too.</li>
                        <li><strong className="text-zinc-200">Doesn't scale</strong> — as decisions grow, the file becomes too large for context windows. You start deleting old decisions to make room.</li>
                        <li><strong className="text-zinc-200">No structure</strong> — decisions are mixed with setup instructions, code snippets, and notes. There's no way to query, filter, or track the lifecycle of a decision.</li>
                        <li><strong className="text-zinc-200">No history</strong> — when you edit a markdown file, the previous version is gone. There's no audit trail of what changed or why.</li>
                    </ul>
                </div>
            </Section>

            <Section title="How DecisionNode solves this" id="how-it-solves-this">
                <div className="space-y-4 text-zinc-400">
                    <p>
                        DecisionNode treats decisions as structured data, not prose. Each decision is a scoped JSON object with fields for rationale, constraints, status, and tags. These get embedded as vector embeddings using Gemini's embedding model, stored locally, and retrieved via cosine similarity search.
                    </p>
                    <p>
                        The retrieval is <strong className="text-zinc-200">explicit</strong> — the AI calls <code>search_decisions</code> through MCP when it needs context. Decisions aren't blindly injected into the prompt. The AI gets back only the relevant matches, ranked by similarity score.
                    </p>

                    <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800 mt-6">
                        <p className="text-zinc-300 font-mono text-sm mb-3">Comparison:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="text-zinc-500 font-semibold mb-2">Flat markdown files</p>
                                <ul className="space-y-1 text-zinc-500">
                                    <li>Full file loaded into every prompt</li>
                                    <li>String matching or no search at all</li>
                                    <li>No structure, scoping, or status</li>
                                    <li>No change history</li>
                                    <li>Lives in the repo</li>
                                </ul>
                            </div>
                            <div>
                                <p className="text-zinc-200 font-semibold mb-2">DecisionNode</p>
                                <ul className="space-y-1 text-zinc-300">
                                    <li>Only relevant decisions retrieved</li>
                                    <li>Semantic vector search (cosine similarity)</li>
                                    <li>Scoped, structured, with lifecycle tracking</li>
                                    <li>Full activity history with audit log</li>
                                    <li>Lives in <code>~/.decisionnode/</code>, repo stays clean</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            <Section title="How it works" id="how-it-works">
                <div className="space-y-4 text-zinc-400">
                    <p>
                        <strong className="text-zinc-200">1. Record a decision</strong> — via the CLI (<code>decide add</code>) or the AI calls <code>add_decision</code> through MCP when you agree on an approach during a conversation.
                    </p>
                    <p>
                        <strong className="text-zinc-200">2. Embedding</strong> — the decision text is converted to a vector embedding using Gemini's <code>gemini-embedding-001</code> model, then stored locally in <code>vectors.json</code>. No external vector database required.
                    </p>
                    <p>
                        <strong className="text-zinc-200">3. Retrieval</strong> — when the AI needs context, it calls <code>search_decisions</code> via MCP. The query is embedded and compared against stored vectors using cosine similarity. The top matches are returned with their similarity scores.
                    </p>
                </div>
            </Section>

            <Section title="Two interfaces" id="two-interfaces">
                <div className="space-y-4 text-zinc-400">
                    <p>
                        DecisionNode has two interfaces that share the same data:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-zinc-900/50 p-5 rounded-lg border border-zinc-800">
                            <p className="text-zinc-200 font-semibold mb-2">CLI — for you</p>
                            <p className="text-sm">The <code>decide</code> command. Use it to set up projects, add decisions, search, export/import, check embedding health, and configure settings. Supports interactive prompts or <Link to="/docs/cli#core-commands" className="text-primary-400 hover:underline">one-command inline flags</Link>.</p>
                        </div>
                        <div className="bg-zinc-900/50 p-5 rounded-lg border border-zinc-800">
                            <p className="text-zinc-200 font-semibold mb-2">MCP server — for your AI</p>
                            <p className="text-sm">The <code>decide-mcp</code> binary. Connect it once (e.g. <code>claude mcp add decisionnode -s user decide-mcp</code> for Claude Code) and the AI calls tools like <code>search_decisions</code> and <code>add_decision</code> over <a href="https://modelcontextprotocol.io" className="text-primary-400 hover:underline" target="_blank" rel="noopener noreferrer">MCP</a>. Works with Claude Code, Cursor, Windsurf, Antigravity, or any MCP-compliant tool.</p>
                        </div>
                    </div>
                    <p className="text-sm mt-4">
                        Both read and write to the same store (<code>~/.decisionnode/</code>). The CLI handles setup and maintenance (init, setup, embed, clean, export, import, config). The MCP server handles the AI's workflow (search, add, update, delete) with structured JSON input/output and <Link to="/docs/context#conflict-detection" className="text-primary-400 hover:underline">automatic conflict detection</Link>. See the <Link to="/docs/mcp#setup" className="text-primary-400 hover:underline">MCP setup guide</Link> to connect your AI client.
                    </p>
                </div>
            </Section>

            <Section title="Quick install" id="quick-install">
                <Tabs
                    tabs={[
                        {
                            id: 'npm',
                            label: 'NPM (Recommended)',
                            content: (
                                <div>
                                    <p className="text-zinc-400 text-sm mb-3">Install globally:</p>
                                    <CodeBlock code="npm install -g decisionnode" />
                                </div>
                            )
                        },
                        {
                            id: 'npx',
                            label: 'NPX',
                            content: (
                                <div>
                                    <p className="text-zinc-400 text-sm mb-3">Run without installing:</p>
                                    <CodeBlock code="npx decisionnode help" />
                                </div>
                            )
                        }
                    ]}
                />

                <div className="mt-8">
                    <CodeBlock code={`cd your-project\ndecide init\ndecide setup  # configure your Gemini API key`} />
                    <p className="text-zinc-400 mt-4 text-sm">
                        See the <Link to="/docs/quickstart" className="text-primary-400 hover:underline">Quickstart</Link> for a full walkthrough, or the <Link to="/docs/mcp" className="text-primary-400 hover:underline">MCP Server</Link> page to connect your AI client.
                    </p>
                </div>
            </Section>

            <Section title="Next steps">
                <CardGroup cols={2}>
                    <Card title="Quickstart" icon={<Zap className="w-5 h-5" />} to="/docs/quickstart">
                        Install, capture a decision, and search — in under a minute
                    </Card>
                    <Card title="Decision Nodes" icon={<Code2 className="w-5 h-5" />} to="/docs/decisions">
                        How decisions are structured, scoped, and tracked
                    </Card>
                    <Card title="Context Engine" icon={<Puzzle className="w-5 h-5" />} to="/docs/context">
                        How the local RAG engine embeds and retrieves decisions
                    </Card>
                    <Card title="MCP Server" icon={<Terminal className="w-5 h-5" />} to="/docs/mcp">
                        Connect your AI client to DecisionNode
                    </Card>
                </CardGroup>
            </Section>

            <Section title="Resources">
                <CardGroup cols={2}>
                    <Card title="MCP Protocol" icon={<Puzzle className="w-5 h-5" />} href="https://modelcontextprotocol.io">
                        The underlying protocol specification
                    </Card>
                    <Card title="GitHub" icon={<Github className="w-5 h-5" />} href="https://github.com/decisionnode/decisionnode">
                        Source code and issue tracker
                    </Card>
                </CardGroup>
            </Section>
        </div>
    );
}
