import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Book, Terminal, Code2, Server, FileJson, Menu, X, Search, Github, Bot, Star, Copy, Check, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Footer from '../components/Footer';
import { useGitHubStars } from '../hooks/useGitHubStars';
import { useDocSearch } from '../hooks/useDocSearch';
import logo from '../assets/images/DecisionNode-transparent.png';

const DOC_LINKS = [
    {
        title: 'Getting Started',
        items: [
            { label: 'Introduction', path: '/docs', icon: Book },
            { label: 'Quickstart', path: '/docs/quickstart', icon: Terminal },
            { label: 'Installation', path: '/docs/installation', icon: Server },
            { label: 'Configuration', path: '/docs/setup', icon: Server },
        ]
    },
    {
        title: 'Core Concepts',
        items: [
            { label: 'Decision Nodes', path: '/docs/decisions', icon: FileJson },
            { label: 'Context Engine', path: '/docs/context', icon: Code2 },
        ]
    },
    {
        title: 'Guides',
        items: [
            { label: 'Common Workflows', path: '/docs/workflows', icon: Search },
        ]
    },
    {
        title: 'Reference',
        items: [
            { label: 'CLI', path: '/docs/cli', icon: Terminal },
            { label: 'MCP Server', path: '/docs/mcp', icon: Server },
        ]
    }
];

export default function DocsLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const stars = useGitHubStars();
    const { results, search, isOpen, setIsOpen } = useDocSearch();
    const [searchQuery, setSearchQuery] = useState('');

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobileMenuOpen]);

    // Ctrl+K to focus search
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
                searchInputRef.current?.blur();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setIsOpen]);

    function htmlToMarkdown(el: HTMLElement): string {
        let md = '';
        for (const node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                md += node.textContent || '';
                continue;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            const tag = (node as HTMLElement).tagName.toLowerCase();
            const child = node as HTMLElement;

            if (tag === 'h1') { md += `\n# ${child.textContent?.trim()}\n\n`; }
            else if (tag === 'h2') { md += `\n## ${child.textContent?.trim()}\n\n`; }
            else if (tag === 'h3') { md += `\n### ${child.textContent?.trim()}\n\n`; }
            else if (tag === 'h4') { md += `\n#### ${child.textContent?.trim()}\n\n`; }
            else if (tag === 'pre') {
                const code = child.querySelector('code');
                const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
                md += `\n\`\`\`${lang}\n${child.textContent?.trim()}\n\`\`\`\n\n`;
            }
            else if (tag === 'code') { md += `\`${child.textContent}\``; }
            else if (tag === 'strong' || tag === 'b') { md += `**${child.textContent}**`; }
            else if (tag === 'em' || tag === 'i') { md += `*${child.textContent}*`; }
            else if (tag === 'ul') {
                for (const li of child.querySelectorAll(':scope > li')) {
                    md += `- ${htmlToMarkdown(li as HTMLElement).trim()}\n`;
                }
                md += '\n';
            }
            else if (tag === 'ol') {
                let i = 1;
                for (const li of child.querySelectorAll(':scope > li')) {
                    md += `${i}. ${htmlToMarkdown(li as HTMLElement).trim()}\n`;
                    i++;
                }
                md += '\n';
            }
            else if (tag === 'a') {
                const href = child.getAttribute('href') || '';
                md += `[${child.textContent}](${href})`;
            }
            else if (tag === 'p') { md += `${htmlToMarkdown(child).trim()}\n\n`; }
            else if (tag === 'br') { md += '\n'; }
            else if (tag === 'hr') { md += '\n---\n\n'; }
            else if (tag === 'table') {
                const rows = child.querySelectorAll('tr');
                rows.forEach((row, ri) => {
                    const cells = row.querySelectorAll('th, td');
                    const line = Array.from(cells).map(c => (c as HTMLElement).textContent?.trim() || '').join(' | ');
                    md += `| ${line} |\n`;
                    if (ri === 0) {
                        md += `| ${Array.from(cells).map(() => '---').join(' | ')} |\n`;
                    }
                });
                md += '\n';
            }
            else if (tag === 'div' || tag === 'section' || tag === 'nav' || tag === 'li' || tag === 'span' || tag === 'main') {
                md += htmlToMarkdown(child);
            }
            else { md += htmlToMarkdown(child); }
        }
        return md;
    }

    function copyPageForAI() {
        if (!contentRef.current) return;
        const md = htmlToMarkdown(contentRef.current)
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        navigator.clipboard.writeText(md);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const searchBar = (
        <div className="relative w-full">
            <div className="flex items-center gap-2 px-3 py-2 lg:py-1.5 bg-zinc-900 border border-white/5 rounded-md text-zinc-500 text-xs focus-within:border-primary-500/30 transition-colors">
                <Search className="w-3.5 h-3.5 flex-shrink-0" />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search documentation..."
                    className="bg-transparent outline-none text-zinc-300 placeholder-zinc-500 w-full text-sm lg:text-xs"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        search(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => { if (searchQuery) setIsOpen(true); }}
                />
                <span className="hidden lg:block ml-auto text-[10px] border border-zinc-700 px-1 rounded bg-zinc-800 flex-shrink-0">Ctrl K</span>
            </div>
            {isOpen && results.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50">
                    {results.map((r) => (
                        <button
                            key={r.path}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                            onClick={() => {
                                navigate(r.path);
                                setIsOpen(false);
                                setSearchQuery('');
                                search('');
                                setIsMobileMenuOpen(false);
                            }}
                        >
                            <p className="text-sm font-medium text-zinc-200">{r.title}</p>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">{r.snippet}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-300 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
                <div className="max-w-screen-2xl mx-auto h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8">
                    <div className="flex items-center gap-4 lg:gap-8">
                        {/* Mobile menu button */}
                        <button
                            className="lg:hidden p-2 -ml-2 text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 group select-none">
                            <img
                                src={logo}
                                alt="DecisionNode Logo"
                                className="h-6 w-auto object-contain brightness-110 pointer-events-none"
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            <span className="text-sm font-bold tracking-tight text-white group-hover:text-primary-400 transition-colors">
                                <span className="text-primary-400">Decision</span><span className="text-yellow-500">Node</span>
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                Docs
                            </span>
                        </Link>

                        {/* Desktop Search */}
                        <div className="hidden lg:block w-64">
                            {searchBar}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a href="https://github.com/decisionnode/DecisionNode" target="_blank" rel="noopener" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10">
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
            </header>

            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className="flex-1 max-w-screen-2xl mx-auto w-full flex items-start">

                {/* Sidebar */}
                <aside className={`fixed inset-y-0 left-0 z-40 w-72 lg:w-64 bg-zinc-950 lg:bg-transparent border-r border-white/5 lg:border-r-0 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 lg:block overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-4 lg:p-8 border-r border-white/5 h-full">
                        {/* Mobile search */}
                        <div className="lg:hidden mb-6 mt-16">
                            {searchBar}
                        </div>

                        <nav className="space-y-8">
                            {DOC_LINKS.map((section) => (
                                <div key={section.title}>
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                                        {section.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {section.items.map((item) => {
                                            const isActive = location.pathname === item.path;
                                            return (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    className={`flex items-center gap-2 px-3 py-2.5 lg:py-2 rounded-md text-sm font-medium transition-colors border-l-2 ${isActive
                                                        ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                                                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                                                        }`}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    {item.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* LLM-Friendly Docs */}
                            <div>
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                                    For AI / LLMs
                                </h3>
                                <div className="space-y-1">
                                    <a
                                        href="/decisionnode-docs.md"
                                        target="_blank"
                                        rel="noopener"
                                        className="flex items-center gap-2 px-3 py-2.5 lg:py-2 rounded-md text-sm font-medium transition-colors border-l-2 border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                                    >
                                        <Bot className="w-4 h-4" />
                                        decisionnode-docs.md
                                        <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                                    </a>
                                    <a
                                        href="/decisionnode-cli.md"
                                        target="_blank"
                                        rel="noopener"
                                        className="flex items-center gap-2 px-3 py-2.5 lg:py-2 rounded-md text-sm font-medium transition-colors border-l-2 border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                                    >
                                        <Terminal className="w-4 h-4" />
                                        decisionnode-cli.md
                                        <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                                    </a>
                                </div>
                            </div>
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-4rem)]">
                    <div className="flex-1 p-4 sm:p-6 lg:p-12 xl:p-16 max-w-4xl mx-auto w-full">
                        {/* Copy page for AI button */}
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={copyPageForAI}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/50"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-green-400" />
                                        <span className="text-green-400">Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        Copy page for AI
                                    </>
                                )}
                            </button>
                        </div>
                        <div ref={contentRef}>
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 mt-auto relative z-10 bg-zinc-950">
                <Footer />
            </div>
        </div>
    );
}
