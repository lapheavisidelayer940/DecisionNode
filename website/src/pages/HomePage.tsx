import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Terminal, Code2, Sparkles, Copy, Check, Eye, Play, Pause, Maximize, RotateCcw } from 'lucide-react';

import decisionNodeBlue from '../assets/images/DecisionNode-transparent-Blue.png';
import decisionNodeYellow from '../assets/images/DecisionNode-transparent-Yellow.png';

export default function HomePage() {
    const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(2);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onTimeUpdate = () => setProgress((video.currentTime / video.duration) * 100 || 0);
        video.addEventListener('timeupdate', onTimeUpdate);
        return () => video.removeEventListener('timeupdate', onTimeUpdate);
    }, []);

    function togglePlay() {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setIsPlaying(true); }
        else { v.pause(); setIsPlaying(false); }
    }

    function cycleSpeed() {
        const v = videoRef.current;
        if (!v) return;
        const speeds = [1, 1.5, 2, 3];
        const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
        v.playbackRate = next;
        setSpeed(next);
    }

    function seekVideo(e: React.MouseEvent<HTMLDivElement>) {
        const v = videoRef.current;
        if (!v) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        v.currentTime = pct * v.duration;
    }

    const playerRef = useRef<HTMLDivElement>(null);

    function goFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            playerRef.current?.requestFullscreen();
        }
    }

    function restart() {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = 0;
        v.play();
        setIsPlaying(true);
    }

    function copyCommand(command: string) {
        navigator.clipboard.writeText(command);
        setCopiedCommand(command);
        setTimeout(() => setCopiedCommand(null), 2000);
    }

    return (
        <div className="relative min-h-screen overflow-hidden">

            {/* Hero */}
            <section className="relative pt-28 pb-20 border-b border-white/5 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-0">
                    <div className="absolute top-20 left-[20%] w-72 h-72 bg-primary-500/15 rounded-full blur-[100px] animate-pulse-slow" />
                    <div className="absolute top-40 right-[20%] w-96 h-96 bg-accent-500/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
                </div>

                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 animate-slide-up">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 text-xs font-mono mb-8">
                        <span className="text-primary-400">npm i -g decisionnode</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-white leading-tight">
                        Your AI keeps forgetting
                        <br />
                        what you agreed on.
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed">
                        You tell your AI "use Tailwind, no CSS modules." Next session, it writes CSS modules.
                        DecisionNode stores your decisions as vector embeddings so the AI can search them before writing code.
                        Not a markdown file — a queryable memory layer.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="#install" className="btn-primary flex items-center justify-center gap-2 group px-6 py-3">
                            Get Started
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                        <Link to="/docs" className="btn-secondary flex items-center justify-center gap-2 px-6 py-3">
                            Read the Docs
                        </Link>
                    </div>
                </div>
            </section>

            {/* Demo video */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 mb-20 relative z-20">
                <div ref={playerRef} className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 backdrop-blur-md shadow-2xl relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 to-accent-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="relative z-10">
                        {/* Terminal title bar */}
                        <div className="px-4 py-2 bg-zinc-900/80 border-b border-white/5 flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                            </div>
                        </div>

                        {/* Video (no native controls) */}
                        <video
                            ref={videoRef}
                            className="w-full cursor-pointer"
                            autoPlay
                            muted
                            loop
                            playsInline
                            onClick={togglePlay}
                            onLoadedData={(e) => { (e.target as HTMLVideoElement).playbackRate = 2; }}
                        >
                            <source src="/demo.mp4" type="video/mp4" />
                        </video>

                        {/* Custom controls */}
                        <div className="px-4 py-2 bg-zinc-900/80 border-t border-white/5 flex items-center gap-3">
                            <button onClick={togglePlay} className="text-zinc-400 hover:text-white transition-colors">
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button onClick={restart} className="text-zinc-400 hover:text-white transition-colors">
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* Progress bar */}
                            <div className="flex-1 h-1 bg-zinc-700 rounded-full cursor-pointer group" onClick={seekVideo}>
                                <div
                                    className="h-full bg-primary-500 rounded-full relative transition-all"
                                    style={{ width: `${progress}%` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>

                            {/* Speed button */}
                            <button
                                onClick={cycleSpeed}
                                className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                            >
                                {speed}x
                            </button>

                            <button onClick={goFullscreen} className="text-zinc-400 hover:text-white transition-colors">
                                <Maximize className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works — the actual flow */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-b border-white/5 relative z-10">
                <h2 className="text-2xl font-bold text-white mb-3 text-center">What happens under the hood</h2>
                <p className="text-zinc-500 text-center mb-12 max-w-2xl mx-auto">
                    From recording a decision to the AI retrieving it in a future session.
                </p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Step 1 */}
                    <div className="bento-card p-6 relative group">
                        <div className="text-4xl font-bold text-zinc-800/50 absolute top-3 right-4">1</div>
                        <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 p-1 select-none">
                            <img src={decisionNodeBlue} alt="" className="w-full h-full object-contain brightness-110 pointer-events-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">A decision is made</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                            During a conversation, you and your AI agree: "use our custom dropdown, not the native one." The AI records it via MCP, or you run <code className="text-primary-400 text-xs">decide add</code>.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="bento-card p-0 relative group overflow-hidden md:col-span-2 lg:col-span-1">
                        <div className="p-6 pb-2">
                            <div className="text-4xl font-bold text-zinc-800/50 absolute top-3 right-4">2</div>
                            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4 p-1 select-none">
                                <img src={decisionNodeYellow} alt="" className="w-full h-full object-contain brightness-110 pointer-events-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Stored as structured JSON</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                                Not a line in a markdown file. A typed object with scope, rationale, and constraints.
                            </p>
                        </div>

                        <div className="bg-zinc-950/50 border-t border-white/5 p-4 font-mono text-[10px] leading-relaxed text-zinc-500 overflow-hidden relative">
                            <div className="absolute inset-0 bg-yellow-500/5 blur-2xl rounded-full translate-y-10" />
                            <div className="relative z-10 space-y-1">
                                <div className="text-yellow-500/80">{"{"}</div>
                                <div className="pl-4">
                                    <span className="text-zinc-400">id:</span> <span className="text-green-400">"ui-009"</span>,<br />
                                    <span className="text-zinc-400">scope:</span> <span className="text-yellow-500">"UI"</span>,<br />
                                    <span className="text-zinc-400">decision:</span> <span className="text-white">"Use custom ScopeSelector instead of native datalist"</span>,<br />
                                    <span className="text-zinc-400">rationale:</span> <span className="text-zinc-500">"Native datalists differ across browsers"</span>,<br />
                                    <span className="text-zinc-400">constraints:</span> [ <span className="text-green-400">"Must match dark theme"</span> ]<br />
                                </div>
                                <div className="text-yellow-500/80">{"}"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bento-card p-6 relative group">
                        <div className="text-4xl font-bold text-zinc-800/50 absolute top-3 right-4">3</div>
                        <div className="w-10 h-10 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mb-4 text-accent-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Embedded as a vector</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                            The decision text is converted to a vector embedding using Gemini's <code className="text-zinc-300 text-xs">gemini-embedding-001</code> and stored locally in <code className="text-zinc-300 text-xs">vectors.json</code>.
                        </p>
                    </div>

                    {/* Step 4 */}
                    <div className="bento-card p-6 relative group">
                        <div className="text-4xl font-bold text-zinc-800/50 absolute top-3 right-4">4</div>
                        <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 text-primary-400">
                            <Terminal className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Later: AI needs context</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                            You start a new session: "Build me a settings form with a dropdown." Before writing code, the AI calls <code className="text-primary-400 text-xs">search_decisions</code> through MCP.
                        </p>
                    </div>

                    {/* Step 5 */}
                    <div className="bento-card p-6 relative group">
                        <div className="text-4xl font-bold text-zinc-800/50 absolute top-3 right-4">5</div>
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 text-orange-400">
                            <Eye className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Cosine similarity match</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                            The query is embedded and compared against stored vectors. The closest decisions are returned with a similarity score.
                        </p>
                        <div className="text-xs text-zinc-400 font-mono">
                            ui-009: "Use custom ScopeSelector..." <span className="text-green-400">94%</span>
                        </div>
                    </div>

                    {/* Step 6 */}
                    <div className="bento-card p-6 relative group">
                        <div className="text-4xl font-bold text-zinc-800/50 absolute top-3 right-4">6</div>
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4 text-green-400">
                            <Check className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">AI follows the decision</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                            It sees <span className="text-zinc-200">ui-009</span> and uses <code className="text-xs">ScopeSelector</code> instead of a native datalist. The decision you made weeks ago is still enforced.
                        </p>
                    </div>
                </div>

                <div className="mt-10 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 max-w-2xl mx-auto">
                    <p className="text-center text-zinc-400 text-sm">
                        The retrieval is <span className="text-primary-400">explicit</span> — the AI calls DecisionNode's MCP tool to search. Decisions are not injected into the system prompt.
                    </p>
                </div>
            </section>

            {/* CLI + MCP */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-b border-white/5 relative z-10">
                <h2 className="text-2xl font-bold text-white mb-3 text-center">Two interfaces, one store</h2>
                <p className="text-zinc-500 text-center mb-12 max-w-2xl mx-auto">
                    The CLI is for you. The MCP server is for your AI. Both read and write to the same local data.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bento-card p-6 group hover:border-primary-500/30 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0">
                                <Terminal className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">CLI</h3>
                                <p className="text-zinc-400 text-sm mb-3">
                                    <code className="text-primary-400">decide add</code>,{' '}
                                    <code className="text-primary-400">search</code>,{' '}
                                    <code className="text-primary-400">list</code>,{' '}
                                    <code className="text-primary-400">deprecate</code>,{' '}
                                    <code className="text-primary-400">export</code>.
                                    Setup, maintenance, and direct interaction from your terminal.
                                </p>
                                <Link to="/docs/cli" className="text-xs text-zinc-500 hover:text-primary-400 transition-colors">
                                    CLI Reference →
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="bento-card p-6 group hover:border-zinc-500/30 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-700/50 border border-zinc-600/50 flex items-center justify-center text-zinc-300 flex-shrink-0">
                                <Code2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">MCP Server</h3>
                                <p className="text-zinc-400 text-sm mb-3">
                                    9 tools over the Model Context Protocol. Works with Claude Code, Cursor, Windsurf, and Antigravity.
                                </p>
                                <Link to="/docs/mcp" className="text-xs text-zinc-500 hover:text-primary-400 transition-colors">
                                    MCP Server docs →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Install */}
            <section id="install" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-b border-white/5 relative z-10">
                <h2 className="text-2xl font-bold text-white mb-3 text-center">Install</h2>
                <p className="text-zinc-500 text-center mb-10">
                    Install, initialize, and connect your AI.
                </p>

                <div className="space-y-4 max-w-2xl mx-auto">
                    {[
                        { label: 'Install the CLI', command: 'npm install -g decisionnode' },
                        { label: 'Initialize in your project', command: 'cd your-project && decide init' },
                        { label: 'Set up your Gemini API key (free)', command: 'decide setup' },
                        { label: 'Connect to your AI (e.g. Claude Code)', command: 'claude mcp add decisionnode -s user decide-mcp' },
                    ].map((step, i) => (
                        <div key={i} className="bento-card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-zinc-500">{i + 1}. {step.label}</span>
                                <button
                                    onClick={() => copyCommand(step.command)}
                                    className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
                                >
                                    {copiedCommand === step.command ? (
                                        <Check className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <code className="text-primary-400 text-sm font-mono">{step.command}</code>
                        </div>
                    ))}
                </div>

                <p className="text-center text-zinc-500 text-sm mt-8">
                    Restart your AI client after connecting.
                    <Link to="/docs/mcp" className="text-primary-400 hover:text-primary-300 ml-1">
                        Setup for other clients →
                    </Link>
                </p>
            </section>

            {/* Open source + Contributing */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 mb-10 text-center relative z-10">
                <h2 className="text-2xl font-bold text-white mb-4">
                    Open source, MIT licensed
                </h2>
                <p className="text-zinc-400 max-w-xl mx-auto mb-4">
                    Everything runs locally. Your decisions stay on your machine. The only external call is to Gemini's embedding API (free tier).
                </p>
                <p className="text-zinc-500 max-w-xl mx-auto mb-8 text-sm">
                    Bug fixes, new features, docs improvements, or just a star on the repo — all contributions are welcome.
                </p>
                <a
                    href="https://github.com/decisionnode/decisionnode"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
                >
                    View on GitHub
                    <ArrowRight className="w-4 h-4" />
                </a>
            </section>
        </div>
    );
}
