import { Section, CodeBlock } from '../../components/docs/DocsComponents';
import { Link } from 'react-router-dom';

export default function SetupPage() {
    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-8 font-mono">
                <Link to="/docs" className="hover:text-primary-400 transition-colors">Docs</Link>
                <span className="text-zinc-700">/</span>
                <span className="text-primary-400">Configuration</span>
            </div>

            <div className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-6">Configuration</h1>
                <p className="text-xl text-zinc-400 leading-relaxed border-l-2 border-primary-500/50 pl-6">
                    Storage layout, search sensitivity, and multi-project setup.
                </p>
            </div>

            <Section title="Storage layout" id="storage-layout">
                <p className="text-zinc-400 mb-4">
                    All data lives in your home directory. Nothing is added to your project repo.
                </p>
                <CodeBlock code={`~/.decisionnode/
  .env                          # Gemini API key
  config.json                   # Global settings (search sensitivity)
  .decisions/
    _global/                    # Global decisions (shared across all projects)
      ui.json
      vectors.json
    MyProject/
      ui.json                   # Decisions scoped to "UI"
      backend.json              # Decisions scoped to "Backend"
      vectors.json              # Embedding vectors for semantic search
      history/
        activity.json           # Audit log of all changes`} />
                <p className="text-zinc-400 mt-4 text-sm">
                    Each scope becomes its own JSON file. Vector embeddings are cached in <code>vectors.json</code> so they don't need to be regenerated on every search.
                </p>
            </Section>

            <Section title="Multiple projects" id="multiple-projects">
                <p className="text-zinc-400 mb-4">
                    Each project is identified by its directory name. When you run <code>decide init</code>, a folder is created at <code>~/.decisionnode/.decisions/{'<dirname>'}/</code>.
                </p>
                <CodeBlock code="decide projects" />
                <p className="text-zinc-400 mt-4 text-sm">
                    The MCP server resolves the project automatically based on the working directory of the AI client.
                </p>
            </Section>

            <Section title="Search sensitivity" id="search-sensitivity">
                <p className="text-zinc-400 mb-4">
                    Controls how aggressively the MCP server instructs AI agents to search before writing code:
                </p>
                <CodeBlock code={`decide config search-sensitivity high    # Search before ANY code change (default)
decide config search-sensitivity medium  # Search only for significant changes`} />
                <p className="text-zinc-400 mt-4">
                    This works by changing the <strong className="text-zinc-200">tool description</strong> that the MCP server sends to the AI client. AI agents read tool descriptions to decide when to call each tool:
                </p>
                <ul className="list-disc list-inside text-zinc-400 mt-3 ml-4 space-y-2 text-sm">
                    <li><strong className="text-zinc-200">high</strong> — the <code>search_decisions</code> tool description tells the AI it is <em>mandatory</em> to search before any code change. The AI will call it before every feature, bug fix, refactor, or styling task.</li>
                    <li><strong className="text-zinc-200">medium</strong> — the description tells the AI to search only for significant changes or when unsure about conventions. The AI uses its own judgment for smaller tasks.</li>
                </ul>
                <p className="text-zinc-400 mt-4 text-sm">
                    After changing this setting, restart your MCP server (or reconnect your AI client) for the new description to take effect. Run <code>decide config</code> with no arguments to view the current setting.
                </p>
            </Section>
        </div>
    );
}
