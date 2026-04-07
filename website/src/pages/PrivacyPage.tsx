import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, Database, Shield } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <>
        <Helmet>
            <title>Privacy Policy — DecisionNode</title>
            <meta name="description" content="DecisionNode privacy policy — how we handle your data and protect your privacy." />
            <link rel="canonical" href="https://decisionnode.dev/privacy" />
        </Helmet>
        <div className="min-h-screen pt-24 pb-20 relative">
            <div className="fixed inset-0 bg-grid-fade pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary-500/20 rounded-xl">
                            <Lock className="w-8 h-8 text-primary-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
                            <p className="text-zinc-400 mt-1">Last updated: April 5, 2026</p>
                        </div>
                    </div>
                </div>

                <div className="prose prose-invert prose-zinc max-w-none">
                    <div className="bento-card p-8 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary-400" />
                            1. Your data stays on your machine
                        </h2>
                        <p className="text-zinc-400 leading-relaxed">
                            DecisionNode stores all decisions, vector embeddings, configuration, and activity logs locally on your machine in <code className="text-zinc-300">~/.decisionnode/</code>.
                            Nothing is sent to our servers. We don't have servers. There are no accounts, no telemetry, no analytics in the CLI or MCP server.
                        </p>
                    </div>

                    <div className="bento-card p-8 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary-400" />
                            2. External API calls
                        </h2>
                        <p className="text-zinc-400 mb-4">
                            The only external network call DecisionNode makes is to Google's Gemini API for generating vector embeddings. This happens when:
                        </p>
                        <ul className="text-zinc-400 space-y-2">
                            <li>You add or edit a decision (auto-embedding)</li>
                            <li>You run <code className="text-zinc-300">decide search</code> or <code className="text-zinc-300">decide embed</code></li>
                        </ul>
                        <p className="text-zinc-400 mt-4">
                            This uses your own Gemini API key. The decision text is sent to Google for embedding — refer to <a href="https://ai.google.dev/terms" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Google's AI terms</a> for how they handle that data.
                        </p>
                    </div>

                    <div className="bento-card p-8 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4">3. This website</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            This website (decisionnode.dev) serves documentation only. It does not use cookies, does not require sign-in, and does not collect personal information.
                            The site may make a request to the GitHub API to display the repository's star count.
                        </p>
                    </div>

                    <div className="bento-card p-8 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4">4. Contact</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            For privacy questions, open an issue on{' '}
                            <a href="https://github.com/decisionnode/decisionnode/issues" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">
                                GitHub
                            </a>.
                        </p>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <Link to="/" className="btn-secondary">
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
        </>
    );
}
