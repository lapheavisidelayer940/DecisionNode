import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, Zap } from 'lucide-react';
import PackCard from '../components/PackCard';
import { supabase } from '../lib/supabase';
import type { PackWithRating } from '../lib/database.types';

const SCOPES = ['All', 'UI', 'API', 'Backend', 'Frontend', 'Database', 'Security'];
const EMBED_FILTERS = ['All', 'Vectorized', 'Not Vectorized'] as const;
type EmbedFilter = typeof EMBED_FILTERS[number];

export default function BrowsePage() {
    const [searchParams] = useSearchParams();
    const [packs, setPacks] = useState<PackWithRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [selectedScope, setSelectedScope] = useState(searchParams.get('scope') || 'All');
    const [embedFilter, setEmbedFilter] = useState<EmbedFilter>('All');

    useEffect(() => {
        fetchPacks();
    }, [selectedScope]);

    async function fetchPacks() {
        setLoading(true);
        try {
            let query = supabase.from('packs_with_ratings').select('*')
                .eq('is_published', true); // Only show published packs

            if (selectedScope !== 'All') {
                query = query.ilike('scope', selectedScope);
            }

            query = query.order('downloads', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            setPacks(data || []);
        } catch (error) {
            console.error('Error fetching packs:', error);
        } finally {
            setLoading(false);
        }
    }



    const filteredPacks = packs.filter(pack => {
        // Apply search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesSearch = (
                pack.name.toLowerCase().includes(q) ||
                pack.description.toLowerCase().includes(q) ||
                pack.tags.some(tag => tag.toLowerCase().includes(q))
            );
            if (!matchesSearch) return false;
        }

        // Apply embed filter
        if (embedFilter === 'Vectorized' && !pack.is_embedded) return false;
        if (embedFilter === 'Not Vectorized' && pack.is_embedded) return false;

        return true;
    });

    return (
        <div className="min-h-screen relative pt-24 pb-20 overflow-hidden">

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Hero Header */}
                <div className="text-center mb-16 relative z-10">
                    <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-primary-500/20 bg-primary-500/10 text-primary-400 text-sm font-medium animate-pulse-slow">
                        Community Marketplace
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                        Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-200">Decision Packs</span>
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        High-leverage architectural patterns for your stack. <br className="hidden md:block" />
                        Curated by the community
                    </p>
                </div>

                {/* Search & Filters Container */}
                <div className="max-w-3xl mx-auto mb-20 relative z-10">
                    <div className="relative group mb-8">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                        <div className="relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500 group-focus-within:text-primary-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search packages, tags, or descriptions..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-14 pr-6 py-5 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl text-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 shadow-2xl transition-all"
                            />
                        </div>
                    </div>

                    {/* Scope and Embed Filters */}
                    <div className="flex flex-wrap justify-center items-center gap-2">
                        {SCOPES.map(scope => (
                            <button
                                key={scope}
                                onClick={() => setSelectedScope(scope)}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border backdrop-blur-md ${selectedScope === scope
                                    ? 'bg-primary-500/10 border-primary-500/50 text-primary-400 shadow-[0_0_20px_rgba(14,165,233,0.15)] scale-105'
                                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 hover:border-white/10'
                                    }`}
                            >
                                {scope}
                            </button>
                        ))}

                        {/* Divider */}
                        <span className="w-px h-6 bg-zinc-700 mx-2" />

                        {/* Embed Filters */}
                        {EMBED_FILTERS.filter(f => f !== 'All').map(filter => (
                            <button
                                key={filter}
                                onClick={() => setEmbedFilter(embedFilter === filter ? 'All' : filter)}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 border flex items-center gap-1.5 ${embedFilter === filter
                                    ? filter === 'Vectorized'
                                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]'
                                        : 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                                    : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                                    }`}
                            >
                                {filter === 'Vectorized' && <Zap className="w-3 h-3" />}
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bento-card p-6 animate-pulse h-48">
                                <div className="w-12 h-12 bg-zinc-800 rounded-lg mb-4" />
                                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-3" />
                                <div className="h-3 bg-zinc-800 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : filteredPacks.length > 0 ? (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-zinc-500 font-mono text-sm">{filteredPacks.length} RESULTS FOUND</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPacks.map(pack => (
                                <PackCard key={pack.id} pack={pack} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-24 bento-card border-dashed border-zinc-800">
                        <Package className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-white mb-2">No packs found</h3>
                        <p className="text-zinc-500">
                            {searchQuery
                                ? `No packs match "${searchQuery}"`
                                : 'No packs available in this category'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
