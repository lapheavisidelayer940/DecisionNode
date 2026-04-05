import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Sparkles } from 'lucide-react';

export function Steps({ children }: { children: React.ReactNode }) {
    return (
        <div className="ml-4 border-l-2 border-zinc-800 pl-8 space-y-12 my-8 relative">
            {children}
        </div>
    );
}

export function Step({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="relative">
            <span className="absolute -left-[41px] top-0 flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-800 text-zinc-500 text-xs font-bold bg-zinc-950">
            </span>
            <h3 className="text-xl font-bold text-zinc-100 mb-4">{title}</h3>
            <div className="text-zinc-400 space-y-4">
                {children}
            </div>
        </div>
    );
}

export function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
    return (
        <section id={id} className="mb-16 scroll-mt-8">
            <h2 className="text-2xl font-bold text-white mb-6 border-b border-zinc-800 pb-2">{title}</h2>
            {children}
        </section>
    );
}

export function ListItem({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-3">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
            <div>
                <strong className="text-zinc-200 block mb-1">{title}</strong>
                <span className="text-zinc-400 text-sm leading-relaxed">{children}</span>
            </div>
        </li>
    );
}

export function CodeBlock({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4">
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-x-auto font-mono text-sm text-zinc-300">
                {code}
            </pre>
            <button
                onClick={copy}
                className="absolute top-2 right-2 p-2 text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all"
            >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
    );
}

export function Tip({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4 mt-6 flex gap-3">
            <Sparkles className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-zinc-300 leading-relaxed">
                {children}
            </div>
        </div>
    );
}

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
    const [activeTab, setActiveTab] = useState(tabs[0].id);

    return (
        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30 my-6">
            <div className="flex border-b border-zinc-800 bg-zinc-950/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                            ? 'text-primary-400 border-primary-400 bg-primary-500/5'
                            : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="p-6">
                {tabs.find(t => t.id === activeTab)?.content}
            </div>
        </div>
    );
}

export function CardGroup({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
    // Tailwind dynamic classes don't work reliably if constructed at runtime for un-scanned classes
    // We map manually to ensure the classes exist
    const gridCols = {
        1: 'md:grid-cols-1',
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-3',
        4: 'md:grid-cols-4',
    }[cols] || 'md:grid-cols-2';

    return (
        <div className={`grid ${gridCols} gap-4 my-6`}>
            {children}
        </div>
    );
}

export function Card({ title, icon, children, to, href }: { title: string; icon: React.ReactNode; children: React.ReactNode; to?: string; href?: string }) {
    const Content = (
        <div className="h-full flex flex-col p-5 bg-zinc-900/30 border border-zinc-800 rounded-xl hover:border-primary-500/30 hover:bg-zinc-900/50 transition-all group">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-zinc-800/50 text-primary-400 group-hover:bg-primary-500/10 group-hover:text-primary-300 transition-colors">
                    {icon}
                </div>
                <h3 className="font-semibold text-zinc-200 group-hover:text-white transition-colors">{title}</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>
        </div>
    );

    if (to) return <Link to={to} className="block h-full">{Content}</Link>;
    if (href) return <a href={href} target="_blank" rel="noreferrer" className="block h-full">{Content}</a>;
    return Content;
}
