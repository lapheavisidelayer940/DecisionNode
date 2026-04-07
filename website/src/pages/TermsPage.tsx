import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Scale, FileText, Shield } from 'lucide-react';

export default function TermsPage() {
    return (
        <>
        <Helmet>
            <title>Terms of Service — DecisionNode</title>
            <meta name="description" content="DecisionNode terms of service — usage terms for the decision memory platform." />
            <link rel="canonical" href="https://decisionnode.dev/terms" />
        </Helmet>
        <div className="min-h-screen pt-24 pb-20 relative">
            <div className="fixed inset-0 bg-grid-fade pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary-500/20 rounded-xl">
                            <Scale className="w-8 h-8 text-primary-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
                            <p className="text-zinc-400 mt-1">Last updated: April 5, 2026</p>
                        </div>
                    </div>
                </div>

                <div className="prose prose-invert prose-zinc max-w-none">
                    <div className="bento-card p-8 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-400" />
                            1. What this is
                        </h2>
                        <p className="text-zinc-400 leading-relaxed">
                            DecisionNode is an open-source CLI tool and MCP server for storing and querying development decisions.
                            The software is licensed under the MIT License. This website (decisionnode.dev) hosts the documentation.
                        </p>
                    </div>

                    <div className="bento-card p-8 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary-400" />
                            2. The software
                        </h2>
                        <ul className="text-zinc-400 space-y-3">
                            <li>DecisionNode runs entirely on your machine. All decisions, embeddings, and configuration are stored locally in <code className="text-zinc-300">~/.decisionnode/</code>.</li>
                            <li>The only external network call is to Google's Gemini API for generating vector embeddings. This requires your own API key and is subject to Google's terms of service.</li>
                            <li>The software is provided "as is" without warranty, as described in the MIT License.</li>
                        </ul>
                    </div>

                    <div className="bento-card p-8 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4">3. This website</h2>
                        <ul className="text-zinc-400 space-y-3">
                            <li>This website serves documentation only. It does not require an account and does not collect personal information.</li>
                            <li>The documentation content is part of the open-source project and can be found in the <a href="https://github.com/decisionnode/decisionnode" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">GitHub repository</a>.</li>
                        </ul>
                    </div>

                    <div className="bento-card p-8 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4">4. Contact</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            For questions, open an issue on{' '}
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
