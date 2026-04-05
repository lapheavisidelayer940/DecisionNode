import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Download, ShoppingCart, Check, Copy, Flag, Heart, AlertTriangle, User, Tag, Calendar, Lock, CheckCircle } from 'lucide-react';
import RatingStars from '../components/RatingStars';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { SecurePackDetails, DecisionNode } from '../lib/database.types';

export default function PackDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const [pack, setPack] = useState<SecurePackDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [ownspack, setOwnsPack] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState<'inappropriate' | 'piracy' | 'spam' | 'other'>('inappropriate');
    const [reportDetails, setReportDetails] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);

    const isAuthor = user && pack && user.id === pack.author_id;

    // Check for purchase success redirect from Stripe
    useEffect(() => {
        if (searchParams.get('purchased') === 'true') {
            setPurchaseSuccess(true);
            setOwnsPack(true);
            // Clear the query param from URL
            setSearchParams({}, { replace: true });
            // Auto-hide success message after 5 seconds
            setTimeout(() => setPurchaseSuccess(false), 5000);
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (slug) {
            fetchPack();
        }
    }, [slug]);

    useEffect(() => {
        if (user && pack) {
            checkFavorite();
            checkOwnership();
            fetchUserRating();
        }
        if (pack) {
            // Log view (fire and forget)
            supabase.from('pack_views').insert({ pack_id: pack.id, user_id: user?.id })
                .then(({ error }) => {
                    // Ignore unique constraint violation (already viewed)
                    if (error && error.code !== '23505') console.error('Error logging view:', error);
                });
        }
    }, [user, pack]);

    async function fetchPack() {
        if (!slug) {
            console.error('No slug provided to fetchPack');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // First try the secure RPC
            console.log('Fetching secure pack details for slug:', slug);
            const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_secure_pack_details', { p_slug: String(slug) });

            if (rpcError) {
                console.error('RPC Error details:', rpcError);
                throw rpcError;
            }

            if (rpcData && rpcData.length > 0) {
                console.log('Secure pack data received:', rpcData[0]);
                setPack(rpcData[0] as any);
            } else {
                // If RPC returns empty, the pack truly doesn't exist (or slug is wrong)
                console.warn('Pack not found via secure RPC (result empty)');
                setPack(null);
            }
        } catch (error) {
            console.error('Error fetching pack:', error);
        } finally {
            setLoading(false);
        }
    }

    async function checkFavorite() {
        if (!user || !pack) return;
        const { data } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('pack_id', pack.id)
            .single();
        setIsFavorite(!!data);
    }

    async function fetchUserRating() {
        if (!user || !pack) return;
        const { data } = await supabase
            .from('ratings')
            .select('score')
            .eq('user_id', user.id)
            .eq('pack_id', pack.id)
            .single();
        if (data) {
            setUserRating(data.score);
        }
    }

    async function checkOwnership() {
        if (!user || !pack) return;
        // Check if user owns the pack (is author or has purchased)
        if (pack.author_id === user.id) {
            setOwnsPack(true);
            return;
        }
        const { data } = await supabase
            .from('pack_purchases')
            .select('id')
            .eq('user_id', user.id)
            .eq('pack_id', pack.id)
            .eq('status', 'completed')
            .single();
        setOwnsPack(!!data);
    }

    async function handlePurchase() {
        if (!user || !pack) return;
        setPurchasing(true);
        try {
            // Get current session for auth token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Please sign in to purchase');
                setPurchasing(false);
                return;
            }

            // Call the Stripe checkout Edge Function
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL} /functions/v1 / create - checkout`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token} `,
                    },
                    body: JSON.stringify({
                        type: 'pack_purchase',
                        pack_id: pack.id,
                        success_url: `${window.location.origin} /pack/${pack.slug}?purchased = true`,
                        cancel_url: `${window.location.origin} /pack/${pack.slug} `,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                // Handle specific error cases with user-friendly messages
                if (data.error === 'seller_unavailable') {
                    throw new Error('This pack is currently unavailable for purchase. The creator needs to set up their payment account.');
                }
                throw new Error(data.message || data.error || 'Failed to create checkout session');
            }

            // Redirect to Stripe Checkout
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            setPurchaseError((error as Error).message);
        } finally {
            setPurchasing(false);
        }
    }

    async function handleDownload() {
        if (!pack) return;

        // Increment download count (pass user ID to prevent duplicate counting)
        await supabase.rpc('increment_downloads', {
            pack_slug: slug,
            downloader_id: user?.id || null
        });

        // Create download blob with watermark for paid packs
        const downloadData: any = {
            id: pack.slug,
            name: pack.name,
            description: pack.description,
            scope: pack.scope,
            version: pack.version,
            decisions: pack.decisions,
            vectors: pack.vectors,
            tags: pack.tags
        };

        // Add watermark for paid packs (buyer info for piracy tracking)
        if (pack.is_paid && user) {
            downloadData._watermark = {
                buyer_id: user.id,
                buyer_email: user.email,
                purchased_at: new Date().toISOString(),
                license: 'single-user',
                warning: 'This file is licensed to the above buyer. Redistribution is prohibited and traceable.'
            };
        }

        const blob = new Blob([JSON.stringify(downloadData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pack.slug}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // Refresh to update download count
        fetchPack();
    }

    async function handleCopyCommand() {
        await navigator.clipboard.writeText(`decide marketplace install ${slug} `);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function handleToggleFavorite() {
        if (!user || !pack) return;

        if (isFavorite) {
            await supabase.from('favorites').delete()
                .eq('user_id', user.id)
                .eq('pack_id', pack.id);
        } else {
            await supabase.from('favorites').insert({
                user_id: user.id,
                pack_id: pack.id
            });
        }
        setIsFavorite(!isFavorite);
    }

    async function handleRate(score: number) {
        if (!user || !pack) return;

        const { error } = await supabase.from('ratings').upsert(
            {
                pack_id: pack.id,
                user_id: user.id,
                score
            },
            { onConflict: 'pack_id,user_id' }
        );

        if (error) {
            console.error('Rating error:', error);
            return;
        }

        setUserRating(score);
        fetchPack();
    }

    async function handleReport() {
        if (!user || !pack) return;
        setReportSubmitting(true);

        try {
            const { error } = await supabase.from('content_reports').insert({
                pack_id: pack.id,
                reporter_id: user.id,
                reason: reportReason,
                details: reportDetails.trim() || null
            });

            if (error) {
                if (error.code === '23505') {
                    alert('You have already reported this pack.');
                } else {
                    console.error('Report error:', error);
                    alert('Failed to submit report. Please try again.');
                }
            } else {
                setReportSuccess(true);
                setShowReportModal(false);
                setTimeout(() => setReportSuccess(false), 3000);
            }
        } finally {
            setReportSubmitting(false);
            setReportDetails('');
        }
    }

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="animate-pulse">
                    <div className="h-8 bg-white/10 rounded w-1/3 mb-4" />
                    <div className="h-4 bg-white/10 rounded w-1/4 mb-8" />
                    <div className="h-64 bg-white/10 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!pack) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Pack not found</h1>
                <Link to="/marketplace" className="btn-primary">Browse Packs</Link>
            </div>
        );
    }

    // Cast decisions generic JSON to DecisionNode[] for map
    const decisions = pack.decisions as unknown as DecisionNode[];
    const totalDecisions = pack.total_decisions_count || decisions.length;
    const isLocked = totalDecisions > decisions.length;

    return (
        <div className="min-h-screen relative pt-24 pb-20">
            <div className="fixed inset-0 bg-grid-fade" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {!pack.is_published && (
                    <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                            <Tag className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-amber-400 font-bold flex items-center gap-2">
                                Draft Preview
                                <span className="text-xs font-normal text-amber-500/60 border border-amber-500/20 px-2 py-0.5 rounded-full">Not Published</span>
                            </h3>
                            <p className="text-amber-500/80 text-sm mt-1">
                                This pack is currently in draft mode. It is not visible in the marketplace.
                            </p>
                        </div>
                        {isAuthor && (
                            <Link
                                to="/my-packs"
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                            >
                                Publish Now
                            </Link>
                        )}
                    </div>
                )}

                {/* Purchase Success Banner */}
                {purchaseSuccess && (
                    <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-2 bg-green-500/20 rounded-lg shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-green-400 font-bold">Purchase Successful!</h3>
                            <p className="text-green-500/80 text-sm mt-1">
                                You now own this pack. All decisions have been unlocked.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {/* Header */}
                        <div className="mb-10">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-500 mb-4 font-mono">
                                        <Link to="/marketplace" className="hover:text-primary-400 transition-colors">PACKS</Link>
                                        <span>/</span>
                                        <span className="text-zinc-300">{pack.scope.toUpperCase()}</span>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">{pack.name}</h1>
                                    <div className="flex items-center gap-6 text-zinc-500">
                                        <Link to={`/ profile / ${pack.author_username} `} className="flex items-center gap-2 hover:text-white transition-colors group">
                                            {pack.author_avatar ? (
                                                <img src={pack.author_avatar} alt="" className="w-6 h-6 rounded-full border border-zinc-800 group-hover:border-zinc-600" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                                    <User className="w-3 h-3" />
                                                </div>
                                            )}
                                            <span className="text-sm font-medium">{pack.author_display_name || pack.author_username}</span>
                                        </Link>
                                        <span className="flex items-center gap-1.5 text-sm">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(pack.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-zinc-300 text-lg leading-relaxed mb-8 border-l-2 border-primary-500/30 pl-6">
                                {pack.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-8">
                                {pack.tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-xs font-mono uppercase tracking-wide">
                                        <Tag className="w-3 h-3" />
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-8 py-6 border-y border-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <RatingStars rating={pack.avg_rating} count={pack.rating_count} />
                                </div>
                                <span className="flex items-center gap-2 text-zinc-400 text-sm">
                                    <Download className="w-4 h-4" />
                                    {pack.downloads.toLocaleString()} <span className="text-zinc-600">downloads</span>
                                </span>
                            </div>
                        </div>

                        {/* Decisions */}
                        <div className="bento-card p-8">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="w-1 h-6 bg-primary-500 rounded-full" />
                                Decision Nodes ({totalDecisions})
                            </h2>
                            <div className="grid gap-4">
                                {decisions.map((decision: DecisionNode) => (
                                    <div key={decision.id} className="group p-6 bg-zinc-900/40 rounded-xl border border-white/5 hover:border-primary-500/20 hover:bg-zinc-900/60 transition-all duration-300">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono font-bold text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded border border-primary-500/20">
                                                    {decision.id}
                                                </span>
                                            </div>
                                            {decision.createdAt && (
                                                <span className="text-xs text-zinc-600 font-mono">
                                                    {new Date(decision.createdAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="space-y-6 pl-1 font-mono text-sm">
                                            <div>
                                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 select-none">Decision</h4>
                                                <p className="text-zinc-200 leading-relaxed font-sans text-base bg-zinc-950/30 p-3 rounded border border-white/5">
                                                    {decision.decision}
                                                </p>
                                            </div>

                                            {decision.rationale && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 select-none">Rationale</h4>
                                                    <p className="text-zinc-400 italic leading-relaxed pl-3 border-l-2 border-zinc-800">
                                                        {decision.rationale}
                                                    </p>
                                                </div>
                                            )}

                                            {decision.constraints && decision.constraints.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 select-none">Constraints</h4>
                                                    <div className="bg-zinc-950/30 rounded border border-white/5 divide-y divide-white/5">
                                                        {decision.constraints.map((constraint, idx) => (
                                                            <div key={idx} className="p-2.5 flex items-start gap-2.5 text-zinc-300">
                                                                <span className="text-zinc-600 mt-1 select-none">•</span>
                                                                <span className="leading-relaxed font-sans">{constraint}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Locked Decisions */}
                                {isLocked && (
                                    <>
                                        {Array.from({ length: totalDecisions - decisions.length }).map((_, idx) => (
                                            <div key={`locked - ${idx} `} className="relative group p-6 bg-zinc-900/40 rounded-xl border border-white/5 overflow-hidden">
                                                {/* Blur Effect Overlay */}
                                                <div className="absolute inset-0 backdrop-blur-sm bg-zinc-950/50 z-10 flex flex-col items-center justify-center p-6 text-center">
                                                    <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                                                        <Lock className="w-6 h-6 text-zinc-500" />
                                                    </div>
                                                    <h4 className="text-white font-semibold mb-1">Decision Locked</h4>
                                                    <p className="text-zinc-400 text-xs max-w-[200px]">Purchase this pack to unlock {totalDecisions - decisions.length} more decision nodes.</p>
                                                </div>

                                                {/* Mock Content (Blurred Background) */}
                                                <div className="opacity-40 pointer-events-none filter blur-[3px] select-none user-select-none">
                                                    {/* Header with ID */}
                                                    <div className="flex items-center justify-between mb-6">
                                                        <div className="bg-primary-500/20 text-primary-300 px-2 py-1 rounded text-xs font-mono border border-primary-500/30 w-20 h-6"></div>
                                                        <div className="text-xs text-zinc-500 w-16 h-4 bg-zinc-800/50 rounded"></div>
                                                    </div>

                                                    {/* Decision Field */}
                                                    <div className="mb-6">
                                                        <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Decision</h4>
                                                        <div className="p-4 bg-zinc-950/30 rounded border border-white/5 h-16 w-full"></div>
                                                    </div>

                                                    {/* Rationale Field */}
                                                    <div className="mb-6">
                                                        <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Rationale</h4>
                                                        <div className="p-4 bg-zinc-950/30 rounded border border-white/5 h-12 w-full"></div>
                                                    </div>

                                                    {/* Constraints Field */}
                                                    <div>
                                                        <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Constraints</h4>
                                                        <div className="bg-zinc-950/30 rounded border border-white/5 p-3 h-10 w-full"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Price Badge for Paid Packs */}
                        {pack.is_paid && pack.price_cents > 0 && (
                            <div className="bento-card p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
                                <div className="text-center">
                                    <p className="text-xs text-green-400 uppercase tracking-wider mb-1">Price</p>
                                    <p className="text-3xl font-bold text-white">${(pack.price_cents / 100).toFixed(2)}</p>
                                    {ownspack && (
                                        <p className="text-xs text-emerald-400 mt-2 flex items-center justify-center gap-1">
                                            <Check className="w-3 h-3" /> You own this pack
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="bento-card p-6">
                            {purchaseError && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {purchaseError}
                                </div>
                            )}

                            {pack.is_paid && pack.price_cents > 0 && !ownspack ? (
                                <button
                                    onClick={user ? handlePurchase : () => window.location.href = '/login'}
                                    disabled={purchasing}
                                    className="btn-primary w-full flex items-center justify-center gap-2 mb-6 shadow-lg shadow-green-500/10 bg-gradient-to-r from-green-600 to-emerald-500 border-green-400/30"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    {purchasing ? 'Processing...' : `Buy for $${(pack.price_cents / 100).toFixed(2)}`}
                                </button>
                            ) : (
                                <button
                                    onClick={handleDownload}
                                    className="btn-primary w-full flex items-center justify-center gap-2 mb-6 shadow-lg shadow-primary-500/10"
                                >
                                    <Download className="w-4 h-4" />
                                    {pack.is_paid ? 'Download Pack' : 'Install Pack'}
                                </button>
                            )}

                            <div className="relative mb-6">
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">CLI Install</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`decide install ${slug} `}
                                        className="input w-full pr-10 text-xs font-mono bg-zinc-950 border-zinc-800 text-zinc-400 focus:text-zinc-200"
                                    />
                                    <button
                                        onClick={handleCopyCommand}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {user && !isAuthor && (
                                <button
                                    onClick={handleToggleFavorite}
                                    className={`btn - secondary w - full flex items - center justify - center gap - 2 text - sm ${isFavorite ? 'text-red-400 border-red-500/20 bg-red-500/5' : ''} `}
                                >
                                    <Heart className={`w - 4 h - 4 ${isFavorite ? 'fill-current' : ''} `} />
                                    {isFavorite ? 'Saved' : 'Save to Favorites'}
                                </button>
                            )}

                            {/* Report Button */}
                            {user && !isAuthor && (
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="btn-secondary w-full flex items-center justify-center gap-2 text-sm mt-3 text-zinc-500 hover:text-red-400 hover:border-red-500/20"
                                >
                                    <Flag className="w-4 h-4" />
                                    Report Pack
                                </button>
                            )}
                        </div>

                        {/* Rate */}
                        {user && !isAuthor && (
                            <div className="bento-card p-6">
                                <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-wider">
                                    {userRating > 0 ? 'Your Rating' : 'Rate this pack'}
                                </h3>
                                {userRating > 0 && (
                                    <p className="text-xs text-zinc-500 mb-3">Click to change your rating</p>
                                )}
                                <RatingStars
                                    rating={userRating}
                                    interactive
                                    onRate={handleRate}
                                />
                            </div>
                        )}

                        {/* Info */}
                        <div className="bento-card p-6">
                            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Metadata</h3>
                            <dl className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-zinc-800/50">
                                    <dt className="text-zinc-500">Version</dt>
                                    <dd className="text-zinc-300 font-mono">{pack.version}</dd>
                                </div>
                                <div className="flex justify-between py-2 border-b border-zinc-800/50">
                                    <dt className="text-zinc-500">Scope</dt>
                                    <dd className="text-zinc-300">{pack.scope}</dd>
                                </div>
                                <div className="flex justify-between py-2 border-b border-zinc-800/50">
                                    <dt className="text-zinc-500">Nodes</dt>
                                    <dd className="text-zinc-300">{totalDecisions}</dd>
                                </div>
                                <div className="flex justify-between pt-2">
                                    <dt className="text-zinc-500">Vectors</dt>
                                    <dd className={`flex items - center gap - 1 ${pack.is_embedded ? 'text-emerald-400' : 'text-zinc-500'} `}>
                                        {pack.is_embedded ? (
                                            <>
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                Embedded
                                            </>
                                        ) : (
                                            'Not Embedded'
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-white mb-2">Report Pack</h2>
                        <p className="text-zinc-400 text-sm mb-6">Help us keep the marketplace safe. Why are you reporting this pack?</p>

                        <div className="space-y-3 mb-6">
                            {(['inappropriate', 'piracy', 'spam', 'other'] as const).map((reason) => (
                                <label
                                    key={reason}
                                    className={`flex items - center gap - 3 p - 3 rounded - lg border cursor - pointer transition - all ${reportReason === reason
                                        ? 'border-red-500/50 bg-red-500/10'
                                        : 'border-zinc-800 hover:border-zinc-700'
                                        } `}
                                >
                                    <input
                                        type="radio"
                                        name="reportReason"
                                        value={reason}
                                        checked={reportReason === reason}
                                        onChange={() => setReportReason(reason)}
                                        className="sr-only"
                                    />
                                    <div className={`w - 4 h - 4 rounded - full border - 2 flex items - center justify - center ${reportReason === reason ? 'border-red-500' : 'border-zinc-600'
                                        } `}>
                                        {reportReason === reason && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                                    </div>
                                    <span className="text-zinc-300 capitalize">{reason === 'inappropriate' ? 'Inappropriate Content' : reason === 'piracy' ? 'Stolen/Pirated Content' : reason}</span>
                                </label>
                            ))}
                        </div>

                        <textarea
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                            placeholder="Additional details (optional)"
                            className="input w-full h-24 resize-none mb-6"
                        />

                        {reportSuccess && (
                            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                                Thank you for your report. We'll review it shortly.
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowReportModal(false); setReportDetails(''); }}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReport}
                                disabled={reportSubmitting}
                                className="btn-primary flex-1 bg-red-600 hover:bg-red-500 border-red-500/30"
                            >
                                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
