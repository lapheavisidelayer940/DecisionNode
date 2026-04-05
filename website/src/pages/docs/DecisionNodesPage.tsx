import { FileJson, Tag, CheckCircle } from 'lucide-react';
import { Section, CodeBlock, ListItem } from '../../components/docs/DocsComponents';
import { Link } from 'react-router-dom';

export default function DecisionNodesPage() {
    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-8 font-mono">
                <Link to="/docs" className="hover:text-primary-400 transition-colors">Docs</Link>
                <span className="text-zinc-700">/</span>
                <span className="text-primary-400">Core Concepts</span>
            </div>

            <div className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-6">Decision Nodes</h1>
                <p className="text-xl text-zinc-400 leading-relaxed border-l-2 border-primary-500/50 pl-6">
                    A Decision Node is the atomic unit of architectural memory. It represents a single, scoped technical choice, its rationale, and its lifecycle.
                </p>
            </div>

            <Section title="Structure" id="structure">
                <p className="text-zinc-400 mb-6">
                    Decisions are stored as structured JSON, organized by scope. Each decision captures what was decided, why, and what constraints follow from it.
                </p>
                <CodeBlock code={`{
  "id": "ui-001",
  "scope": "UI",
  "decision": "Use Tailwind CSS for all styling",
  "status": "active",
  "rationale": "Consistent design tokens, easy for AI to generate correct classes.",
  "constraints": [
    "No arbitrary values (e.g. w-[37px]) unless absolutely necessary",
    "Use @apply only for reusable base components"
  ],
  "createdAt": "2024-03-20T10:00:00Z"
}`} />
            </Section>

            <Section title="Fields" id="fields">
                <p className="text-zinc-400 mb-4 text-sm">
                    Fields marked <span className="text-zinc-500">(optional)</span> can be left blank when adding a decision.
                </p>
                <ul className="space-y-6">
                    <ListItem title="id">
                        <span className="flex items-center gap-2 mb-2"><Tag className="w-4 h-4 text-purple-400" /> <code>ui-001</code>, <code>backend-003</code>, <code>api-012</code></span>
                        Auto-generated from the scope name (first 10 lowercase letters) + incrementing 3-digit number. For global decisions, displayed with a <code>global:</code> prefix (e.g. <code>global:ui-001</code>).
                    </ListItem>
                    <ListItem title="scope">
                        <span className="flex items-center gap-2 mb-2"><FileJson className="w-4 h-4 text-purple-400" /> <code>UI</code>, <code>Backend</code>, <code>API</code>, <code>Architecture</code>, <code>Security</code></span>
                        The architectural domain this decision belongs to. Scopes are normalized to title case (<code>ui</code>, <code>UI</code>, <code>Ui</code> all become <code>Ui</code>). Each scope becomes its own JSON file on disk (e.g. <code>ui.json</code>, <code>backend.json</code>).
                    </ListItem>
                    <ListItem title="decision">
                        A clear, actionable statement of what was decided. One sentence. e.g. "Use Tailwind CSS for all styling."
                    </ListItem>
                    <ListItem title="rationale">
                        <span className="text-zinc-500 text-xs">(optional)</span> The <strong>why</strong>. Explains the trade-offs considered. This is what prevents the AI from suggesting alternatives that violate your reasoning.
                    </ListItem>
                    <ListItem title="constraints">
                        <span className="text-zinc-500 text-xs">(optional)</span> Specific rules that must be followed. e.g. "No arbitrary values like w-[37px]." The AI reads these as hard requirements.
                    </ListItem>
                    <ListItem title="status">
                        <span className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-purple-400" /> <code>active</code> | <code>deprecated</code></span>
                        Always <code>active</code> when created. Use <code>decide deprecate {'<id>'}</code> to deprecate and <code>decide activate {'<id>'}</code> to re-activate. Only active decisions appear in semantic search results.
                    </ListItem>
                </ul>
            </Section>

            <Section title="Storage" id="storage">
                <p className="text-zinc-400 mb-4">
                    Each scope is stored as a JSON file wrapping an array of decisions:
                </p>
                <CodeBlock code={`// ~/.decisionnode/.decisions/MyProject/ui.json
{
  "scope": "UI",
  "decisions": [
    { "id": "ui-001", "scope": "UI", "decision": "...", ... },
    { "id": "ui-002", "scope": "UI", "decision": "...", ... }
  ]
}`} />
                <CodeBlock code={`~/.decisionnode/.decisions/
  _global/                    # Global decisions (shared across all projects)
    ui.json
    vectors.json
  MyProject/
    ui.json                   # UI scope decisions
    backend.json              # Backend scope decisions
    vectors.json              # Embedding vectors for semantic search
    history/
      activity.json           # Audit log`} />
            </Section>

            <Section title="Lifecycle" id="lifecycle">
                <p className="text-zinc-400 mb-4">
                    Decisions are either active or deprecated:
                </p>
                <div className="space-y-3">
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                        <code className="text-green-400 text-sm font-bold">active</code>
                        <span className="text-zinc-500 text-xs ml-2">(default)</span>
                        <p className="text-zinc-400 text-sm mt-1">Currently in effect. Only active decisions appear in semantic search results.</p>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                        <code className="text-yellow-400 text-sm font-bold">deprecated</code>
                        <p className="text-zinc-400 text-sm mt-1">No longer in effect. Excluded from search results and invisible to AI agents. A softer alternative to deleting — you can re-activate it later with <code>decide activate</code> if you change your mind.</p>
                    </div>
                </div>
                <CodeBlock code={`# Deprecate a decision (hides from search)
decide deprecate ui-001

# Re-activate it later
decide activate ui-001`} />
                <p className="text-zinc-400 mt-4 text-sm">
                    Deprecating is a softer alternative to deleting — the decision is hidden from search and invisible to the AI, but you can bring it back with <code>decide activate</code> if you change your mind. The vector embedding is kept, so re-activating is instant with no need to re-embed. The AI can also deprecate/activate decisions through the MCP <code>update_decision</code> tool when you ask it to.
                </p>
            </Section>
        </div>
    );
}
