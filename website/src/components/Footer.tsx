import { Link } from 'react-router-dom';
import { Github, Star } from 'lucide-react';
import { useGitHubStars } from '../hooks/useGitHubStars';

import logo from '../assets/images/DecisionNode-transparent.png';

export default function Footer() {
    const stars = useGitHubStars();
    return (
        <footer className="border-t border-white/10 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-1 mb-4 select-none">
                            <img
                                src={logo}
                                alt="DecisionNode Logo"
                                className="h-10 w-auto object-contain pointer-events-none"
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            <h3 className="text-xl font-bold">
                                <span className="text-primary-400">Decision</span>
                                <span className="text-yellow-500">Node</span>
                            </h3>
                        </div>
                        <p className="text-white/50 max-w-md">
                            A structured, queryable context layer for development decisions
                            that your AI assistant uses to remember decisions.
                        </p>
                        <div className="flex gap-4 mt-4">
                            <a href="https://github.com/decisionnode/decisionnode" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10">
                                <Github className="w-4 h-4" />
                                {stars !== null && (
                                    <span className="flex items-center gap-1 text-xs font-medium">
                                        <Star className="w-3 h-3 text-yellow-500" />
                                        {stars}
                                    </span>
                                )}
                            </a>
                        </div>
                    </div>

                    {/* Docs Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Documentation</h4>
                        <ul className="space-y-2">
                            <li><Link to="/docs" className="text-white/50 hover:text-white transition-colors">Introduction</Link></li>
                            <li><Link to="/docs/quickstart" className="text-white/50 hover:text-white transition-colors">Quickstart</Link></li>
                            <li><Link to="/docs/cli" className="text-white/50 hover:text-white transition-colors">CLI Reference</Link></li>
                            <li><Link to="/docs/mcp" className="text-white/50 hover:text-white transition-colors">MCP Server</Link></li>
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Resources</h4>
                        <ul className="space-y-2">
                            <li><a href="https://github.com/decisionnode/decisionnode" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">GitHub</a></li>
                            <li><a href="/decisionnode-docs.md" target="_blank" rel="noopener" className="text-white/50 hover:text-white transition-colors">Full Docs (Markdown)</a></li>
                            <li><a href="/decisionnode-cli.md" target="_blank" rel="noopener" className="text-white/50 hover:text-white transition-colors">CLI Reference (Markdown)</a></li>
                            <li><Link to="/docs/workflows" className="text-white/50 hover:text-white transition-colors">Workflows</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Legal Links */}
                <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex gap-6 text-sm">
                        <Link to="/terms" className="text-white/40 hover:text-white transition-colors">Terms of Service</Link>
                        <Link to="/privacy" className="text-white/40 hover:text-white transition-colors">Privacy Policy</Link>
                    </div>
                    <p className="text-white/30 text-sm">
                        © {new Date().getFullYear()} DecisionNode. MIT Licensed.
                    </p>
                </div>
            </div>
        </footer>
    );
}
