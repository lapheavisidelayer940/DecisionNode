import { Shield, AlertTriangle } from 'lucide-react';
import { Section, CodeBlock, Tip } from '../../components/docs/DocsComponents';
import { Link } from 'react-router-dom';

export default function InstallationPage() {
    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-8 font-mono">
                <Link to="/docs" className="hover:text-primary-400 transition-colors">Docs</Link>
                <span className="text-zinc-700">/</span>
                <span className="text-primary-400">Installation</span>
            </div>

            <div className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-6">Installation</h1>
                <p className="text-xl text-zinc-400 leading-relaxed border-l-2 border-primary-500/50 pl-6">
                    Get DecisionNode running on your machine. You can install it globally or use it via NPX.
                </p>
            </div>

            <Section title="Method 1: Global CLI (Recommended)" id="global-cli">
                <p className="text-zinc-400 mb-4">
                    Installing globally gives you access to the <code>decide</code> and <code>decisionnode</code> commands anywhere in your terminal. It also installs <code>decide-mcp</code> for AI integrations.
                </p>
                <CodeBlock code="npm install -g decisionnode" />
                <p className="text-zinc-400 mt-4 mb-2">Verify the installation:</p>
                <CodeBlock code="decide help" />
            </Section>

            <Section title="Method 2: NPX (No Installation)" id="npx">
                <p className="text-zinc-400 mb-4">
                    NPX downloads the package temporarily from npm, runs it, and discards it after. Nothing is installed on your machine permanently.
                </p>
                <CodeBlock code="npx decide help" />
                <p className="text-zinc-400 mt-4 text-sm">
                    You can also use <code>npx decisionnode {'<command>'}</code> as the full package name.
                </p>
                <Tip>
                    NPX is fine for trying DecisionNode out, but for regular use you'll want the global install — it gives you persistent access to <code>decide</code>, <code>decisionnode</code>, and <code>decide-mcp</code> without re-downloading every time.
                </Tip>
            </Section>

            <Section title="What gets installed" id="what-gets-installed">
                <p className="text-zinc-400 mb-4">
                    The package installs three executables:
                </p>
                <div className="space-y-2">
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
                        <code className="text-primary-400 font-bold text-sm w-36">decide</code>
                        <span className="text-zinc-400 text-sm">The CLI tool (short alias)</span>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
                        <code className="text-primary-400 font-bold text-sm w-36">decisionnode</code>
                        <span className="text-zinc-400 text-sm">The CLI tool (full name)</span>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
                        <code className="text-primary-400 font-bold text-sm w-36">decide-mcp</code>
                        <span className="text-zinc-400 text-sm">The MCP server — you don't run this directly. AI clients (Claude Code, Cursor, etc.) launch it automatically in the background via their MCP config.</span>
                    </div>
                </div>
            </Section>

            <Section title="Troubleshooting" id="troubleshooting">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Permission Errors
                </h3>
                <p className="text-zinc-400 mb-4">
                    If you see <code>EACCES</code> errors when installing globally on macOS or Linux:
                </p>
                <CodeBlock code="sudo npm install -g decisionnode" />

                <h3 className="text-lg font-bold text-white mt-8 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-yellow-500" />
                    Execution Policy (Windows)
                </h3>
                <p className="text-zinc-400 mb-4">
                    On PowerShell, if you cannot run the command:
                </p>
                <CodeBlock code="Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" />
            </Section>
        </div>
    );
}
