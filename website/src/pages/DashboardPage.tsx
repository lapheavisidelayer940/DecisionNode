import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Heart, Download, Trash2, Plus, Zap, Loader, Check, Edit2, ShoppingBag, Activity, Eye, AlertTriangle } from 'lucide-react';
import PackCard from '../components/PackCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { PackWithRating } from '../lib/database.types';

export default function DashboardPage() {
    const { user } = useAuth();
    const [myPacks, setMyPacks] = useState<PackWithRating[]>([]);
    const [favorites, setFavorites] = useState<PackWithRating[]>([]);
    const [downloadedPacks, setDownloadedPacks] = useState<PackWithRating[]>([]);
    const [purchasedPacks, setPurchasedPacks] = useState<PackWithRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'packs' | 'purchased' | 'favorites' | 'downloaded'>('packs');
    const [publishing, setPublishing] = useState<string | null>(null);
    const [totalEarnings, setTotalEarnings] = useState(0);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    async function fetchData() {
        try {
            // Fetch user's packs
            const { data: packsData } = await supabase
                .from('packs_with_ratings')
                .select('*')
                .eq('author_id', user!.id)
                .order('created_at', { ascending: false });

            setMyPacks(packsData || []);

            // Fetch favorites
            const { data: favData } = await supabase
                .from('favorites')
                .select('pack_id')
                .eq('user_id', user!.id);

            if (favData && favData.length > 0) {
                const packIds = favData.map(f => f.pack_id);
                const { data: favPacks } = await supabase
                    .from('packs_with_ratings')
                    .select('*')
                    .in('id', packIds);
                setFavorites(favPacks || []);
            }

            // Fetch downloaded packs
            const { data: downloadData } = await supabase
                .from('user_downloads')
                .select('pack_id')
                .eq('user_id', user!.id);

            if (downloadData && downloadData.length > 0) {
                const downloadedPackIds = downloadData.map(d => d.pack_id);
                const { data: dlPacks } = await supabase
                    .from('packs_with_ratings')
                    .select('*')
                    .in('id', downloadedPackIds);
                setDownloadedPacks(dlPacks || []);
            }

            // Fetch purchased packs
            const { data: purchaseData } = await supabase
                .from('pack_purchases')
                .select('pack_id')
                .eq('user_id', user!.id)
                .eq('status', 'completed');

            if (purchaseData && purchaseData.length > 0) {
                const purchasedPackIds = purchaseData.map(p => p.pack_id).filter(Boolean);
                const { data: purchPacks } = await supabase
                    .from('packs_with_ratings')
                    .select('*')
                    .in('id', purchasedPackIds);
                setPurchasedPacks(purchPacks || []);
            }

            // Fetch earnings (sum of creator_amount_cents from sales of user's packs)
            const { data: earningsData } = await supabase
                .from('pack_purchases')
                .select('creator_amount_cents, pack_id, packs!inner(author_id)')
                .eq('packs.author_id', user!.id)
                .eq('status', 'completed');

            if (earningsData) {
                const total = earningsData.reduce((sum, p) => sum + (p.creator_amount_cents || 0), 0);
                setTotalEarnings(total);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }
    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [packToDelete, setPackToDelete] = useState<string | null>(null);

    function confirmDeletePack(packId: string) {
        setPackToDelete(packId);
        setShowDeleteModal(true);
    }

    async function handleDeleteConfirmed() {
        if (!packToDelete) return;

        try {
            await supabase.from('packs').delete().eq('id', packToDelete);
            setMyPacks(myPacks.filter(p => p.id !== packToDelete));
        } catch (error) {
            console.error('Error deleting pack:', error);
            alert('Failed to delete pack');
        } finally {
            setShowDeleteModal(false);
            setPackToDelete(null);
        }
    }

    // State for publish modal
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [packToPublish, setPackToPublish] = useState<PackWithRating | null>(null);
    const [weeklyEmbedCount, setWeeklyEmbedCount] = useState(0);

    function openPublishModal(pack: PackWithRating) {
        setPackToPublish(pack);
        setShowPublishModal(true);
        // Fetch weekly embed count
        fetchWeeklyEmbedCount();
    }

    async function fetchWeeklyEmbedCount() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Call edge function to check quota (or use a simpler approach)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { count } = await supabase
            .from('embedding_publishes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user!.id)
            .gte('created_at', oneWeekAgo.toISOString());

        setWeeklyEmbedCount(count || 0);
    }

    async function publishWithEmbed() {
        if (!packToPublish) return;
        setPublishing(packToPublish.id);
        setShowPublishModal(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const { data, error } = await supabase.functions.invoke('embed-pack', {
                body: {
                    pack_id: packToPublish.id,
                    decisions: packToPublish.decisions,
                    access_token: session?.access_token
                },
            });

            if (error) throw error;

            if (data?.quota_exceeded) {
                alert(data.message);
                return;
            }

            // Determine if we need to bump minor version (e.g. re-embedding an already published pack)
            let newVersion = packToPublish.version;
            // If vectors are missing (which they should be for re-embed scenario), we assume this is a re-embed of a changed pack.
            // Or if is_published is true.
            if (packToPublish.is_published) {
                newVersion = bumpMinorVersion(packToPublish.version);
            }

            // Mark as published AND embedded
            await supabase.from('packs').update({
                is_published: true,
                is_embedded: true,
                version: newVersion,
                updated_at: new Date().toISOString()
            }).eq('id', packToPublish.id);

            // Update local state
            setMyPacks(myPacks.map(p =>
                p.id === packToPublish.id ? { ...p, is_published: true, is_embedded: true, version: newVersion } : p
            ));
        } catch (err) {
            console.error('Publish error:', err);
            alert('Failed to publish: ' + (err as Error).message);
        } finally {
            setPublishing(null);
            setPackToPublish(null);
        }
    }

    function bumpMinorVersion(version: string) {
        const parts = version.replace(/^v/, '').split('.').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return version;
        parts[1]++; // Bump minor
        parts[2] = 0; // Reset patch
        return parts.join('.');
    }

    async function publishWithoutEmbed() {
        if (!packToPublish) return;
        setPublishing(packToPublish.id);
        setShowPublishModal(false);

        try {
            // Just mark as published, no embedding
            await supabase.from('packs').update({
                is_published: true
            }).eq('id', packToPublish.id);

            // Update local state
            setMyPacks(myPacks.map(p =>
                p.id === packToPublish.id ? { ...p, is_published: true } : p
            ));
        } catch (err) {
            console.error('Publish error:', err);
            alert('Failed to publish: ' + (err as Error).message);
        } finally {
            setPublishing(null);
            setPackToPublish(null);
        }
    }

    if (!user) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Sign in to view your dashboard</h1>
                <Link to="/login" className="btn-primary">Sign In</Link>
            </div>
        );
    }

    // Calculate stats
    const totalDownloads = myPacks.reduce((sum, p) => sum + p.downloads, 0);
    const ratedPacks = myPacks.filter(p => (p.avg_rating || 0) > 0);
    const avgRating = ratedPacks.length > 0
        ? ratedPacks.reduce((sum, p) => sum + p.avg_rating, 0) / ratedPacks.length
        : 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative min-h-screen overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Packs</h1>
                    <p className="text-white/60">Manage your created and downloaded packs</p>
                </div>
                <Link to="/create" className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create Pack
                </Link>
            </div>

            {/* Stats */}
            {/* Creator Analytics */}
            <div className="mb-8">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    Creator Analytics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bento-card p-6">
                        <div className="text-3xl font-bold text-white mb-1">{myPacks.length}</div>
                        <div className="text-white/50 text-sm">Packs Published</div>
                    </div>
                    <div className="bento-card p-6">
                        <div className="text-3xl font-bold text-white mb-1">{totalDownloads.toLocaleString()}</div>
                        <div className="text-white/50 text-sm">Downloads Received</div>
                    </div>
                    <div className="bento-card p-6">
                        <div className="text-3xl font-bold text-white mb-1">{avgRating.toFixed(1)}</div>
                        <div className="text-white/50 text-sm">Average Rating</div>
                    </div>
                    <div className="bento-card p-6">
                        <div className="text-3xl font-bold text-green-400 mb-1">${(totalEarnings / 100).toFixed(2)}</div>
                        <div className="text-white/50 text-sm">Total Earnings</div>
                    </div>
                </div>
            </div>

            {/* Library Stats */}
            <div className="mb-10">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    My Library
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bento-card p-6">
                        <div className="text-3xl font-bold text-white mb-1">{purchasedPacks.length}</div>
                        <div className="text-white/50 text-sm">Packs Purchased</div>
                    </div>
                    <div className="bento-card p-6">
                        <div className="text-3xl font-bold text-white mb-1">{downloadedPacks.length}</div>
                        <div className="text-white/50 text-sm">Packs Installed</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('packs')}
                    className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'packs'
                        ? 'text-primary-400 border-b-2 border-primary-400'
                        : 'text-white/50 hover:text-white'
                        }`}
                >
                    <Package className="w-4 h-4 inline mr-2" />
                    My Packs ({myPacks.length})
                </button>
                <button
                    onClick={() => setActiveTab('purchased')}
                    className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'purchased'
                        ? 'text-primary-400 border-b-2 border-primary-400'
                        : 'text-white/50 hover:text-white'
                        }`}
                >
                    <ShoppingBag className="w-4 h-4 inline mr-2" />
                    Purchased ({purchasedPacks.length})
                </button>
                <button
                    onClick={() => setActiveTab('downloaded')}
                    className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'downloaded'
                        ? 'text-primary-400 border-b-2 border-primary-400'
                        : 'text-white/50 hover:text-white'
                        }`}
                >
                    <Download className="w-4 h-4 inline mr-2" />
                    Downloaded ({downloadedPacks.length})
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'favorites'
                        ? 'text-primary-400 border-b-2 border-primary-400'
                        : 'text-white/50 hover:text-white'
                        }`}
                >
                    <Heart className="w-4 h-4 inline mr-2" />
                    Favorites ({favorites.length})
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="glass rounded-xl p-6 animate-pulse">
                            <div className="w-12 h-12 bg-white/10 rounded-lg mb-4" />
                            <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-white/10 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : activeTab === 'packs' ? (
                myPacks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myPacks.map(pack => (
                            <div key={pack.id} className="bento-card p-6 flex flex-col h-full group relative">
                                {/* Ambient Backlight */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -z-10 group-hover:bg-primary-500/10 transition-colors duration-500" />

                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <Link to={`/pack/${pack.slug}`} className="block">
                                            <h3 className="font-semibold text-lg text-white hover:text-primary-400 transition-colors truncate">
                                                {pack.name}
                                            </h3>
                                        </Link>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                {pack.scope}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${pack.is_paid
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                                {pack.is_paid ? `$${(pack.price_cents / 100).toFixed(2)}` : 'Free'}
                                            </span>
                                        </div>
                                    </div>
                                    {pack.is_published ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <Check className="w-3 h-3" />
                                                LIVE
                                            </div>
                                            {!pack.is_embedded && (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); openPublishModal(pack); }}
                                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors z-20"
                                                    title="Click to embed vectors"
                                                >
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Vectors Missing
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            DRAFT
                                        </div>
                                    )}
                                </div>

                                <Link to={`/pack/${pack.slug}`} className="flex-1 block mb-6">
                                    <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">
                                        {pack.description}
                                    </p>
                                </Link>

                                <div className="border-t border-white/5 pt-4 mt-auto">
                                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1.5">
                                                <Download className="w-3.5 h-3.5" />
                                                {pack.downloads}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 uppercase">
                                                    {pack.decisions.length} nodes
                                                </span>
                                            </span>
                                        </div>
                                        <div>
                                            {new Date(pack.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {!pack.is_published ? (
                                            <button
                                                onClick={() => openPublishModal(pack)}
                                                disabled={publishing === pack.id}
                                                className="col-span-2 btn-primary py-2 text-xs flex items-center justify-center gap-2"
                                            >
                                                {publishing === pack.id ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                                Publish Pack
                                            </button>
                                        ) : (
                                            <>
                                                <Link
                                                    to={`/pack/${pack.slug}/analytics`}
                                                    className="btn-secondary py-2 text-xs flex items-center justify-center gap-2 hover:bg-zinc-800"
                                                >
                                                    <Activity className="w-3 h-3" />
                                                    Analytics
                                                </Link>
                                                <Link
                                                    to={`/pack/${pack.slug}`}
                                                    className="btn-secondary py-2 text-xs flex items-center justify-center gap-2 hover:bg-zinc-800"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    View Pack
                                                </Link>
                                            </>
                                        )}
                                        <Link
                                            to={`/edit/${pack.slug}`}
                                            className="btn-secondary py-2 text-xs flex items-center justify-center gap-2 hover:text-white"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => confirmDeletePack(pack.id)}
                                            className="btn-secondary text-xs py-1.5 flex items-center justify-center gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/30"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 glass rounded-xl overflow-hidden">
                        <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-white mb-2">No packs yet</h3>
                        <p className="text-white/50 mb-4">Create your first decision pack</p>
                        <Link to="/create" className="btn-primary">Create Pack</Link>
                    </div>
                )
            ) : activeTab === 'purchased' ? (
                purchasedPacks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {purchasedPacks.map(pack => (
                            <PackCard key={pack.id} pack={pack} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 glass rounded-xl overflow-hidden">
                        <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-white mb-2">No purchased packs</h3>
                        <p className="text-white/50 mb-4">Packs you buy will appear here.</p>
                        <Link to="/marketplace" className="btn-primary">Browse Packs</Link>
                    </div>
                )
            ) : activeTab === 'downloaded' ? (
                downloadedPacks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {downloadedPacks.map(pack => (
                            <PackCard key={pack.id} pack={pack} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 glass rounded-xl overflow-hidden">
                        <Download className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-white mb-2">No downloaded packs</h3>
                        <p className="text-white/50 mb-4">Packs you install will appear here.</p>
                        <Link to="/marketplace" className="btn-primary">Browse Packs</Link>
                    </div>
                )
            ) : (
                favorites.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map(pack => (
                            <PackCard key={pack.id} pack={pack} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 glass rounded-xl overflow-hidden">
                        <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-white mb-2">No favorites yet</h3>
                        <p className="text-white/50 mb-4">Browse packs and add them to favorites</p>
                        <Link to="/marketplace" className="btn-primary">Browse Packs</Link>
                    </div>
                )
            )}

            {/* Publish Modal */}
            {
                showPublishModal && packToPublish && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bento-card p-8 max-w-md w-full">
                            <h2 className="text-xl font-bold text-white mb-2">
                                {packToPublish.is_published ? `Embed "${packToPublish.name}"` : `Publish "${packToPublish.name}"`}
                            </h2>
                            <p className="text-zinc-400 mb-6">
                                {packToPublish.is_published
                                    ? "Add vector embeddings for this pack."
                                    : "Would you like to embed this pack with vectors?"
                                }
                            </p>

                            <div className="bg-zinc-900/50 rounded-lg p-4 mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-zinc-400">Weekly embed quota:</span>
                                    <span className="text-sm font-mono text-white">{weeklyEmbedCount} / 3 used</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-500 transition-all"
                                        style={{ width: `${Math.min(100, (weeklyEmbedCount / 3) * 100)}%` }}
                                    />
                                </div>
                                {weeklyEmbedCount >= 3 && (
                                    <p className="text-xs text-amber-400 mt-2">
                                        Quota exceeded. Upgrade to Pro for unlimited embeddings.
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={publishWithEmbed}
                                    disabled={weeklyEmbedCount >= 3}
                                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Zap className="w-4 h-4" />
                                    {packToPublish.is_published ? "Generate Embeddings" : "Publish with Embedding"}
                                </button>
                                {!packToPublish.is_published && (
                                    <button
                                        onClick={publishWithoutEmbed}
                                        className="btn-secondary w-full"
                                    >
                                        Publish without Embedding
                                    </button>
                                )}
                                <button
                                    onClick={() => { setShowPublishModal(false); setPackToPublish(null); }}
                                    className="text-zinc-500 hover:text-white text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bento-card p-8 max-w-sm w-full border-red-500/30">
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <span className="p-2 bg-red-500/10 rounded-lg">
                                <Trash2 className="w-6 h-6" />
                            </span>
                            <h2 className="text-xl font-bold text-white">Delete Pack?</h2>
                        </div>
                        <p className="text-zinc-400 mb-6 leading-relaxed">
                            Are you sure you want to delete this pack? This action cannot be undone.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDeleteConfirmed}
                                className="btn-primary w-full bg-red-600 hover:bg-red-500 border-red-500/50"
                            >
                                Yes, Delete Pack
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="btn-secondary w-full"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
