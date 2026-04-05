import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Download, ShoppingBag, Star, DollarSign, Eye, Activity, MousePointerClick } from 'lucide-react';
import type { PackWithRating, PackPurchase } from '../lib/database.types';

export default function PackAnalyticsPage() {
    const { slug } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [pack, setPack] = useState<PackWithRating | null>(null);
    const [purchases, setPurchases] = useState<PackPurchase[]>([]);
    const [uniqueViews, setUniqueViews] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && slug) fetchData();
    }, [user, slug]);

    async function fetchData() {
        try {
            // Get pack details
            const { data: packData, error } = await supabase
                .from('packs_with_ratings')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error || !packData) throw error;

            // Security check: Must be author
            if (packData.author_id !== user?.id) {
                navigate('/');
                return;
            }

            setPack(packData);

            // Get purchases/sales history
            const { data: purchaseData } = await supabase
                .from('pack_purchases')
                .select('*')
                .eq('pack_id', packData.id)
                .eq('status', 'completed')
                .order('created_at', { ascending: false });

            setPurchases(purchaseData || []);

            // Get unique views
            const { count: viewCount } = await supabase
                .from('pack_views')
                .select('*', { count: 'exact', head: true })
                .eq('pack_id', packData.id);

            setUniqueViews(viewCount || 0);

        } catch (error) {
            console.error(error);
            navigate('/my-packs');
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
    );

    if (!pack) return null;

    // Calculate Sales
    const totalSalesAmount = purchases.reduce((sum, p) => sum + (p.creator_amount_cents || 0), 0);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative min-h-screen">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
            </div>

            <Link to="/my-packs" className="inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors relative z-10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        {pack.name}
                        <span className="text-zinc-500 font-normal text-lg">Analytics</span>
                    </h1>
                    <p className="text-zinc-400">Track performance, sales, and detailed metrics for this pack.</p>
                </div>
                <div className="flex gap-3">
                    <Link to={`/edit/${pack.slug}`} className="btn-secondary flex items-center gap-2">
                        Edit Pack
                    </Link>
                    <Link to={`/pack/${pack.slug}`} className="btn-secondary flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Pack Page
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 relative z-10">
                <div className="bento-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-zinc-400 text-sm">Total Earnings</span>
                        <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">${(totalSalesAmount / 100).toFixed(2)}</div>
                    <div className="text-xs text-zinc-500 mt-2">From this Pack</div>
                </div>
                <div className="bento-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-zinc-400 text-sm">Downloads</span>
                        <Download className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{pack.downloads.toLocaleString()}</div>
                    <div className="text-xs text-zinc-500 mt-2">Total installs</div>
                </div>
                <div className="bento-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-zinc-400 text-sm">Unique Views</span>
                        <MousePointerClick className="w-5 h-5 text-pink-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{uniqueViews.toLocaleString()}</div>
                    <div className="text-xs text-zinc-500 mt-2">Unique per user</div>
                </div>
                <div className="bento-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-zinc-400 text-sm">Sales Count</span>
                        <ShoppingBag className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{purchases.length}</div>
                    <div className="text-xs text-zinc-500 mt-2">Unique purchases</div>
                </div>
                <div className="bento-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-zinc-400 text-sm">Avg Rating</span>
                        <Star className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{pack.avg_rating.toFixed(1)}</div>
                    <div className="text-xs text-zinc-500 mt-2">Based on {pack.rating_count} reviews</div>
                </div>
            </div>

            {/* Recent Sales Table */}
            <div className="bento-card p-6 relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary-400" />
                        Recent Sales
                    </h3>
                </div>
                {purchases.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs text-zinc-500 uppercase border-b border-white/10">
                                <tr>
                                    <th className="pb-4 pl-4 font-medium">Date</th>
                                    <th className="pb-4 font-medium">Customer</th>
                                    <th className="pb-4 font-medium">Gross Amount</th>
                                    <th className="pb-4 font-medium text-right pr-4">Your Earnings</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {purchases.map(p => (
                                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="py-4 pl-4 text-zinc-300">{new Date(p.created_at).toLocaleDateString()}</td>
                                        <td className="py-4 text-zinc-400 font-mono text-xs">{p.user_id ? `${p.user_id.substring(0, 8)}...` : 'Unknown'}</td>
                                        <td className="py-4 text-zinc-300">${(p.amount_cents / 100).toFixed(2)}</td>
                                        <td className="py-4 text-green-400 text-right pr-4 font-medium">+${(p.creator_amount_cents / 100).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-zinc-500 bg-white/5 rounded-lg border border-white/5 border-dashed">
                        No sales recordings yet.
                    </div>
                )}
            </div>
        </div>
    );
}
