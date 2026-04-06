import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Github, Star } from 'lucide-react';
import { useGitHubStars } from '../hooks/useGitHubStars';
import logo from '../assets/images/DecisionNode-transparent.png';

export default function Navbar() {
    const location = useLocation();
    const stars = useGitHubStars();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [showComingSoon, setShowComingSoon] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < 20) {
                setIsVisible(true);
            } else if (currentScrollY < lastScrollY) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    return (
        <nav
            className={`fixed top-0 inset-x-0 z-50 flex justify-center pt-6 px-4 pb-6 pointer-events-none transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-32'
                }`}
        >
            <div className="w-full max-w-5xl bg-zinc-950/80 md:backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 pointer-events-auto transition-all duration-300 hover:border-white/20">
                {/* Top row: Logo + GitHub */}
                <div className="relative flex items-center justify-between h-14 px-4 sm:px-6">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group relative z-10 select-none">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden md:block" />
                            <img
                                src={logo}
                                alt="DecisionNode Logo"
                                className="h-8 w-auto object-contain relative z-10 brightness-110 pointer-events-none"
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                        </div>
                        <span className="text-lg font-bold tracking-tight">
                            <span className="text-primary-400 group-hover:text-primary-400 group-hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] transition-all">Decision</span>
                            <span className="text-yellow-500 group-hover:text-yellow-400 group-hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] transition-all">Node</span>
                        </span>
                    </Link>

                    {/* Desktop nav (centered) */}
                    <div className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900/50 p-1 rounded-full border border-white/5">
                        <Link
                            to="/docs"
                            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-300 ${location.pathname.startsWith('/docs')
                                ? 'bg-purple-500/10 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20'
                                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                                }`}
                        >
                            Docs
                        </Link>
                        <span className="group/mp relative px-4 py-1.5 text-sm font-medium rounded-full text-zinc-600/40 cursor-default select-none">
                            Marketplace
                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/mp:opacity-100 transition-opacity pointer-events-none">
                                Coming soon
                            </span>
                        </span>
                    </div>

                    {/* GitHub */}
                    <div className="flex items-center gap-4 z-10">
                        <a
                            href="https://github.com/decisionnode/DecisionNode"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10"
                        >
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

                {/* Mobile nav row */}
                <div className="flex md:hidden items-center justify-center gap-2 px-4 pb-3 -mt-1">
                    <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-full border border-white/5">
                        <Link
                            to="/docs"
                            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${location.pathname.startsWith('/docs')
                                ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20'
                                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                                }`}
                        >
                            Docs
                        </Link>
                        <span
                            className="relative px-4 py-1.5 text-xs font-medium rounded-full text-zinc-600/40 cursor-default select-none"
                            onClick={() => { setShowComingSoon(true); setTimeout(() => setShowComingSoon(false), 1500); }}
                        >
                            Marketplace
                            {showComingSoon && (
                                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded whitespace-nowrap animate-in fade-in">
                                    Coming soon
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </nav>
    );
}
