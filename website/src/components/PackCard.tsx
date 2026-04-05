import { Link } from 'react-router-dom';
import { Download, Star, Package, Zap } from 'lucide-react';
import type { PackWithRating } from '../lib/database.types';

interface PackCardProps {
    pack: PackWithRating;
}

export default function PackCard({ pack }: PackCardProps) {
    const scopeStyles: Record<string, string> = {
        ui: 'text-purple-300 bg-purple-500/20 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
        api: 'text-blue-300 bg-blue-500/20 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
        backend: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
        frontend: 'text-orange-300 bg-orange-500/20 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
        database: 'text-red-300 bg-red-500/20 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    };

    const scopeStyle = scopeStyles[pack.scope.toLowerCase()] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';

    return (
        <Link
            to={`/pack/${pack.slug}`}
            className="group relative p-5 bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md hover:border-primary-500/30 hover:bg-zinc-900/60 transition-all duration-300 flex flex-col h-full"
        >
            {/* Hover Glow Effect */}
            <div className="absolute -inset-px bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Ambient Backlight */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -z-10 group-hover:bg-primary-500/10 transition-colors duration-500" />

            {/* Header */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center group-hover:border-primary-500/30 group-hover:text-primary-400 transition-colors shadow-inner">
                        <Package className="w-5 h-5 text-zinc-400 group-hover:text-primary-400 transition-colors" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-zinc-100 group-hover:text-primary-400 transition-colors tracking-tight">{pack.name}</h3>
                        <p className="text-xs text-zinc-500 font-mono">@{pack.author_username}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded border whitespace-nowrap ${scopeStyle}`}>
                        {pack.scope}
                    </span>
                    {pack.is_embedded ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-teal-500/20 text-teal-400 border border-teal-500/30 whitespace-nowrap">
                            <Zap className="w-2.5 h-2.5" />
                            Vectorized
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                            Not Vectorized
                        </span>
                    )}
                    {pack.is_paid && pack.price_cents > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                            ${(pack.price_cents / 100).toFixed(2)}
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-zinc-800 text-zinc-400 border border-zinc-700 whitespace-nowrap">
                            Free
                        </span>
                    )}
                </div>
            </div>

            {/* Description */}
            <p className="text-zinc-400 text-sm mb-4 line-clamp-2 leading-relaxed flex-1 relative z-10 group-hover:text-zinc-300 transition-colors">
                {pack.description}
            </p>

            {/* Tags */}
            {pack.tags && pack.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6 relative z-10">
                    {pack.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 group-hover:border-primary-500/20 group-hover:text-primary-400/80 transition-colors">
                            #{tag}
                        </span>
                    ))}
                    {pack.tags.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 text-zinc-500">+{pack.tags.length - 3}</span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-white/5 pt-4 mt-auto relative z-10">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
                        <Download className="w-3.5 h-3.5" />
                        {pack.downloads.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
                        <Star className="w-3.5 h-3.5" />
                        {pack.avg_rating.toFixed(1)}
                    </span>
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                    {pack.decisions.length} NODES
                </span>
            </div>
        </Link>
    );
}
