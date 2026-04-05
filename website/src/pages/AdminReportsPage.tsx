import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Trash2, CheckCircle, Eye, User, Package, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ContentReport {
    id: string;
    pack_id: string;
    reporter_id: string;
    reason: 'inappropriate' | 'piracy' | 'spam' | 'harassment' | 'other';
    details: string | null;
    status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
    created_at: string;
    // Joined data
    pack_name?: string;
    pack_slug?: string;
    reporter_username?: string;
}

export default function AdminReportsPage() {
    const { user, profile } = useAuth();
    const [reports, setReports] = useState<ContentReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'actioned'>('pending');
    const [reasonFilter, setReasonFilter] = useState<string>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [stats, setStats] = useState({ pending: 0, actioned: 0, dismissed: 0 });

    // Use database role instead of hardcoded email list
    const isAdmin = profile?.is_admin === true;

    useEffect(() => {
        if (isAdmin) {
            fetchReports();
        }
    }, [isAdmin, filter]);

    async function fetchReports() {
        setLoading(true);
        try {
            let query = supabase
                .from('content_reports')
                .select(`
                    *,
                    packs:pack_id (name, slug),
                    profiles:reporter_id (username)
                `)
                .order('created_at', { ascending: false });

            if (filter === 'pending') {
                query = query.eq('status', 'pending');
            } else if (filter === 'actioned') {
                query = query.in('status', ['actioned', 'dismissed']);
            }

            const { data, error } = await query;

            if (error) throw error;

            const formatted = (data || []).map((r: any) => ({
                ...r,
                pack_name: r.packs?.name,
                pack_slug: r.packs?.slug,
                reporter_username: r.profiles?.username
            }));

            setReports(formatted);

            // Calculate stats
            const allReports = formatted;
            setStats({
                pending: allReports.filter((r: ContentReport) => r.status === 'pending').length,
                actioned: allReports.filter((r: ContentReport) => r.status === 'actioned').length,
                dismissed: allReports.filter((r: ContentReport) => r.status === 'dismissed').length
            });
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDismiss(reportId: string) {
        setActionLoading(reportId);
        try {
            await supabase
                .from('content_reports')
                .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
                .eq('id', reportId);
            fetchReports();
        } finally {
            setActionLoading(null);
        }
    }

    async function handleRemovePack(reportId: string, packId: string) {
        if (!confirm('Are you sure you want to remove this pack? This action cannot be undone.')) return;

        setActionLoading(reportId);
        try {
            // Remove the pack
            await supabase.from('packs').delete().eq('id', packId);
            // Mark report as actioned
            await supabase
                .from('content_reports')
                .update({ status: 'actioned', reviewed_at: new Date().toISOString() })
                .eq('id', reportId);
            fetchReports();
        } finally {
            setActionLoading(null);
        }
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
                    <Link to="/login" className="btn-primary">Sign In</Link>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-zinc-400">You don't have permission to view this page.</p>
                </div>
            </div>
        );
    }

    const reasonIcons: Record<string, any> = {
        inappropriate: '🔞',
        piracy: '🏴‍☠️',
        spam: '📧',
        harassment: '😠',
        other: '❓'
    };

    return (
        <div className="min-h-screen pt-24 pb-20 relative">
            <div className="fixed inset-0 bg-grid-fade" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Shield className="w-8 h-8 text-primary-500" />
                            Content Reports
                        </h1>
                        <p className="text-zinc-400 mt-2">Review and moderate reported content</p>
                    </div>

                    <div className="flex gap-2">
                        {(['pending', 'all', 'actioned'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                    ? 'bg-primary-500 text-black'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bento-card p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                        <p className="text-xs text-zinc-500 uppercase">Pending</p>
                    </div>
                    <div className="bento-card p-4 text-center">
                        <p className="text-2xl font-bold text-red-400">{stats.actioned}</p>
                        <p className="text-xs text-zinc-500 uppercase">Actioned</p>
                    </div>
                    <div className="bento-card p-4 text-center">
                        <p className="text-2xl font-bold text-green-400">{stats.dismissed}</p>
                        <p className="text-xs text-zinc-500 uppercase">Dismissed</p>
                    </div>
                </div>

                {/* Reason Filter */}
                <div className="flex items-center gap-2 mb-6">
                    <span className="text-sm text-zinc-500">Filter by reason:</span>
                    <select
                        value={reasonFilter}
                        onChange={(e) => setReasonFilter(e.target.value)}
                        className="input text-sm py-1 px-3"
                    >
                        <option value="all">All Reasons</option>
                        <option value="inappropriate">🔞 Inappropriate</option>
                        <option value="piracy">🏴‍☠️ Piracy</option>
                        <option value="spam">📧 Spam</option>
                        <option value="harassment">😠 Harassment</option>
                        <option value="other">❓ Other</option>
                    </select>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bento-card p-6 animate-pulse">
                                <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4" />
                                <div className="h-4 bg-zinc-800 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : reports.filter(r => reasonFilter === 'all' || r.reason === reasonFilter).length === 0 ? (
                    <div className="bento-card p-12 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">All Clear!</h2>
                        <p className="text-zinc-400">No {filter === 'pending' ? 'pending' : ''} reports to review{reasonFilter !== 'all' ? ` for ${reasonFilter}` : ''}.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.filter(r => reasonFilter === 'all' || r.reason === reasonFilter).map((report) => (
                            <div key={report.id} className="bento-card p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-2xl">{reasonIcons[report.reason]}</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                report.status === 'actioned' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-zinc-500/20 text-zinc-400'
                                                }`}>
                                                {report.status}
                                            </span>
                                            <span className="text-sm text-zinc-500 capitalize">{report.reason}</span>
                                        </div>

                                        <div className="flex items-center gap-6 text-sm text-zinc-400 mb-4">
                                            <Link
                                                to={`/pack/${report.pack_slug}`}
                                                className="flex items-center gap-2 hover:text-primary-400"
                                            >
                                                <Package className="w-4 h-4" />
                                                {report.pack_name || 'Unknown Pack'}
                                            </Link>
                                            <span className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                Reported by: {report.reporter_username || 'Unknown'}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                {new Date(report.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {report.details && (
                                            <div className="bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-300">
                                                <p className="text-xs text-zinc-500 mb-1">Additional Details:</p>
                                                {report.details}
                                            </div>
                                        )}
                                    </div>

                                    {report.status === 'pending' && (
                                        <div className="flex gap-2 ml-4">
                                            <Link
                                                to={`/pack/${report.pack_slug}`}
                                                className="btn-secondary p-2"
                                                title="View Pack"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDismiss(report.id)}
                                                disabled={actionLoading === report.id}
                                                className="btn-secondary p-2 hover:bg-green-500/20 hover:border-green-500/30"
                                                title="Dismiss Report"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRemovePack(report.id, report.pack_id)}
                                                disabled={actionLoading === report.id}
                                                className="btn-secondary p-2 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400"
                                                title="Remove Pack"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
