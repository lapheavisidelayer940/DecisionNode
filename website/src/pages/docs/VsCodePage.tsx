import { Layout, GitBranch, RefreshCw, History } from 'lucide-react';
import { Section } from '../../components/docs/DocsComponents';
import { Link } from 'react-router-dom';

export default function VsCodePage() {
    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-8 font-mono">
                <Link to="/docs" className="hover:text-primary-400 transition-colors">Docs</Link>
                <span className="text-zinc-700">/</span>
                <span className="text-primary-400">Reference</span>
            </div>

            <div className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-6">VS Code Extension</h1>
                <p className="text-xl text-zinc-400 leading-relaxed border-l-2 border-primary-500/50 pl-6">
                    Manage your architectural decisions directly within your editor.
                </p>
            </div>

            <Section title="Features">
                <div className="grid gap-6">
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                        <h3 className="flex items-center gap-2 text-white font-bold mb-4">
                            <Layout className="w-5 h-5 text-purple-400" />
                            Tree View Explorer
                        </h3>
                        <p className="text-zinc-400 mb-4">
                            View all your decisions organized by scope in the "DecisionNode" side panel.
                        </p>
                        <ul className="text-sm text-zinc-500 space-y-2">
                            <li>• Click to open the markdown file</li>
                            <li>• Right-click to Edit or Change Status</li>
                            <li>• Icons indicate status (Active/Proposed/Deprecated)</li>
                        </ul>
                    </div>

                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                        <h3 className="flex items-center gap-2 text-white font-bold mb-4">
                            <GitBranch className="w-5 h-5 text-purple-400" />
                            Diff View
                        </h3>
                        <p className="text-zinc-400">
                            See how a decision has evolved over time. Helper commands allow you to view the Git history of any decision file.
                        </p>
                    </div>

                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                        <h3 className="flex items-center gap-2 text-white font-bold mb-4">
                            <RefreshCw className="w-5 h-5 text-purple-400" />
                            Auto-Integration
                        </h3>
                        <p className="text-zinc-400">
                            The extension automatically detects your <code>.decisionnode/</code> config and syncs with the CLI. No extra setup required.
                        </p>
                    </div>

                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                        <h3 className="flex items-center gap-2 text-white font-bold mb-4">
                            <History className="w-5 h-5 text-purple-400" />
                            History Timeline
                        </h3>
                        <p className="text-zinc-400 mb-4">
                            Track every change to your decision log.
                        </p>
                        <ul className="text-sm text-zinc-500 space-y-2">
                            <li>• Real-time updates as you work</li>
                            <li>• Filter by source (CLI, MCP, Cloud, etc.)</li>
                            <li>• See what changed and when</li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section title="Commands">
                <p className="text-zinc-400 mb-4">Access these via the Command Palette (<code>Ctrl+Shift+P</code>):</p>
                <div className="space-y-2 font-mono text-sm text-zinc-300">
                    <div className="p-3 bg-zinc-950 rounded border border-zinc-800">DecisionNode: Create New Decision</div>
                    <div className="p-3 bg-zinc-950 rounded border border-zinc-800">DecisionNode: Sync Marketplace Packs</div>
                </div>
            </Section>
        </div>
    );
}
