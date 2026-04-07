import { Database, Brain, Zap } from 'lucide-react';
import { Section, ListItem, CodeBlock } from '../../components/docs/DocsComponents';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function ContextEnginePage() {
    return (
        <>
        <Helmet>
            <title>Context Engine — DecisionNode Docs</title>
            <meta name="description" content="How DecisionNode's context engine works — vector embeddings, semantic search, and intelligent retrieval." />
            <link rel="canonical" href="https://decisionnode.dev/docs/context" />
        </Helmet>
        <div className="animate-fade-in max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-8 font-mono">
                <Link to="/docs" className="hover:text-primary-400 transition-colors">Docs</Link>
                <span className="text-zinc-700">/</span>
                <span className="text-primary-400">Core Concepts</span>
            </div>

            <div className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-6">Context Engine</h1>
                <p className="text-xl text-zinc-400 leading-relaxed border-l-2 border-primary-500/50 pl-6">
                    DecisionNode uses a local RAG engine to surface relevant decisions via semantic search. This page explains how decisions get embedded, stored, and retrieved.
                </p>
            </div>

            <Section title="How it works" id="how-it-works">
                <div className="space-y-8">
                    <ListItem title="1. Embedding">
                        <span className="flex items-center gap-2 mb-2"><Brain className="w-4 h-4 text-purple-400" /> <strong>Vectorization</strong></span>
                        <p className="mb-2">When you save a decision, DecisionNode converts it to a vector embedding using Google Gemini's <code>gemini-embedding-001</code> model. The text that gets embedded is a combination of the decision's fields:</p>
                        <div className="bg-zinc-950 p-3 rounded border border-zinc-800 font-mono text-xs text-zinc-400">
                            {'{scope}: {decision}. {rationale} {constraints}'}
                        </div>
                        <p className="mt-2 text-sm">For example: <code className="text-xs">"UI: Use Tailwind CSS for all styling. Consistent design tokens. No arbitrary values Use @apply only for base components"</code></p>
                    </ListItem>
                    <ListItem title="2. Storage">
                        <span className="flex items-center gap-2 mb-2"><Database className="w-4 h-4 text-purple-400" /> <strong>Local vector store</strong></span>
                        <p>Vectors are stored in <code>vectors.json</code> alongside your decisions. Each entry maps a decision ID to its vector and a timestamp of when it was embedded. No external vector database needed.</p>
                        <div className="bg-zinc-950 p-3 rounded border border-zinc-800 font-mono text-xs text-zinc-400 mt-2">
                            {'{ "ui-001": { "vector": [0.12, -0.45, ...], "embeddedAt": "2024-..." } }'}
                        </div>
                        <p className="mt-2 text-sm">Global decisions have their own separate <code>vectors.json</code> in <code>~/.decisionnode/.decisions/_global/</code>.</p>
                    </ListItem>
                    <ListItem title="3. Retrieval">
                        <span className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-purple-400" /> <strong>Cosine similarity search</strong></span>
                        <p>When you or your AI searches, the query text is embedded using the same model, then compared against every stored vector using cosine similarity. Results below the <Link to="/docs/setup#search-threshold" className="text-primary-400 hover:underline">configured threshold</Link> (default 0.3) are filtered out, and the remaining matches are returned ranked by score. Only <Link to="/docs/decisions#lifecycle" className="text-primary-400 hover:underline">active</Link> decisions are searched — <Link to="/docs/decisions#lifecycle" className="text-primary-400 hover:underline">deprecated</Link> decisions are skipped, but their embeddings are kept so re-activating is instant. <Link to="/docs/cli#core-commands" className="text-primary-400 hover:underline">Deleting</Link> a decision removes both the decision and its embedding permanently.</p>
                        <p className="mt-2 text-sm"><Link to="/docs/cli#global-decisions" className="text-primary-400 hover:underline">Global decisions</Link> are included in every search alongside project decisions.</p>
                    </ListItem>
                </div>
            </Section>

            <Section title="Conflict detection" id="conflict-detection">
                <p className="text-zinc-400 mb-4">
                    When you add a new decision, DecisionNode checks for similar existing decisions using a <strong className="text-zinc-200">75% similarity threshold</strong>. This works in both the CLI and MCP, but behaves differently:
                </p>

                <h3 className="text-zinc-200 font-bold mb-2 mt-6">CLI (<code className="text-sm">decide add</code>)</h3>
                <p className="text-zinc-400 mb-3 text-sm">You're shown the similar decisions and asked to confirm:</p>
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-sm text-zinc-400">
                    <span className="text-yellow-400">⚠️  Similar decisions found:</span><br /><br />
                    <span>   ui-001: Use Tailwind CSS for all styling... (89% similar)</span><br /><br />
                    <span>Continue anyway? (y/N):</span>
                </div>

                <h3 className="text-zinc-200 font-bold mb-2 mt-6">MCP (<code className="text-sm">add_decision</code>)</h3>
                <p className="text-zinc-400 mb-3 text-sm">
                    The decision is <strong className="text-zinc-200">not added</strong>. Instead, the similar decisions are returned so the AI can act on them — it might update the existing decision, deprecate it and re-add, or re-call <code>add_decision</code> with <code>force=true</code> to add anyway.
                </p>
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-400">
{`{
  "success": false,
  "reason": "similar_decisions_found",
  "similar": [
    { "id": "ui-001", "decision": "Use Tailwind CSS...", "similarity": "89%" }
  ]
}`}
                </div>

                <p className="text-zinc-400 mt-4 text-sm">
                    If your API key isn't configured, the conflict check is silently skipped and the decision is added directly.
                </p>

                <div className="mt-6 rounded-lg overflow-hidden border border-white/10">
                    <video autoPlay muted loop playsInline className="w-full">
                        <source src="/recordings/conflict.mp4" type="video/mp4" />
                    </video>
                </div>
            </Section>

            <Section title="Explicit retrieval" id="explicit-retrieval">
                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-700">
                    <p className="text-zinc-300">
                        The RAG retrieval is <strong className="text-primary-400">explicit</strong>, not implicit. The AI actively calls the <code>search_decisions</code> MCP tool to retrieve context — decisions are not automatically injected into a system prompt.
                    </p>
                    <p className="text-zinc-400 mt-3 text-sm">
                        This means the AI only retrieves what it needs, when it needs it, keeping the context window focused and relevant.
                    </p>
                </div>
            </Section>

            <Section title="CLI usage" id="cli-usage">
                <CodeBlock code={`# Semantic search
decide search "how should we handle error logging?"
# Returns matches ranked by similarity score

# Check embedding health
decide check
# Shows which decisions are embedded vs missing vectors

# Embed any unembedded decisions
decide embed
# Generates vectors for decisions that failed or were imported

# Remove orphaned vectors
decide clean
# Cleans up vectors for decisions that no longer exist`} />
            </Section>

            <Section title="Why local?" id="why-local">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800">
                        <h3 className="text-white font-bold mb-2">Fast retrieval</h3>
                        <p className="text-sm text-zinc-400">Vector comparison happens in milliseconds on your machine. No network round-trips for search.</p>
                    </div>
                    <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800">
                        <h3 className="text-white font-bold mb-2">Private</h3>
                        <p className="text-sm text-zinc-400">Decisions stay on your machine. The only external call is to Gemini's embedding API when creating vectors — and that's stateless.</p>
                    </div>
                    <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800">
                        <h3 className="text-white font-bold mb-2">No infrastructure</h3>
                        <p className="text-sm text-zinc-400">No Pinecone, no Chroma, no database. Vectors are stored in a JSON file that loads into memory.</p>
                    </div>
                </div>
            </Section>
        </div>
        </>
    );
}
