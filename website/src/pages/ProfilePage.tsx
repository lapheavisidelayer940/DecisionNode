import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Calendar, Crown, Sparkles, Star } from 'lucide-react';
import PackCard from '../components/PackCard';
import { supabase } from '../lib/supabase';
import type { Profile, PackWithRating } from '../lib/database.types';

export default function ProfilePage() {
    const { username } = useParams<{ username: string }>();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [packs, setPacks] = useState<PackWithRating[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (username) {
            fetchProfile();
        }
    }, [username]);

    async function fetchProfile() {
        try {
            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);

            // Fetch user's packs
            const { data: packsData } = await supabase
                .from('packs_with_ratings')
                .select('*')
                .eq('author_id', profileData.id)
                .order('downloads', { ascending: false });

            setPacks(packsData || []);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen relative pt-24 pb-20">
                <div className="fixed inset-0 bg-grid-fade" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="animate-pulse flex items-center gap-6 mb-12">
                        <div className="w-24 h-24 bg-zinc-900 rounded-full border border-zinc-800" />
                        <div>
                            <div className="h-8 bg-zinc-900 rounded w-48 mb-3" />
                            <div className="h-4 bg-zinc-900 rounded w-32" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
                <h1 className="text-2xl font-bold text-white mb-4">User not found</h1>
                <Link to="/marketplace" className="btn-primary">Browse Packs</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative pt-24 pb-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Profile Header */}
                <div className="bento-card p-10 mb-12 relative overflow-hidden group">
                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -z-10 group-hover:bg-primary-500/10 transition-colors duration-700" />

                    <div className="flex flex-col md:flex-row md:items-center gap-8 relative z-10">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.display_name || profile.username}
                                className="w-24 h-24 rounded-full border-2 border-zinc-800 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:border-primary-500/30 transition-colors"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center text-3xl font-bold text-zinc-500">
                                {(profile.display_name || profile.username)[0].toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold text-white tracking-tight">
                                    {profile.display_name || profile.username}
                                </h1>
                                {profile.subscription_tier === 'pro' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-500/20 text-accent-400 text-xs font-bold rounded-full border border-accent-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                        <Crown className="w-3 h-3" />
                                        PRO
                                    </span>
                                )}
                            </div>
                            <p className="text-zinc-400 font-mono text-sm mb-4">@{profile.username}</p>

                            {profile.bio && (
                                <p className="text-zinc-300 max-w-2xl mb-4">{profile.bio}</p>
                            )}

                            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-zinc-900 text-sm text-zinc-500">
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Joined {new Date(profile.created_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    {packs.length} packs published
                                </span>
                                {(() => {
                                    const ratedPacks = packs.filter(p => (p.avg_rating || 0) > 0);
                                    return ratedPacks.length > 0 && (
                                        <span className="flex items-center gap-2 text-yellow-400">
                                            <Star className="w-4 h-4 fill-yellow-400" />
                                            {(ratedPacks.reduce((sum, p) => sum + p.avg_rating, 0) / ratedPacks.length).toFixed(1)} avg rating
                                        </span>
                                    );
                                })()}
                                {profile.subscription_tier === 'pro' && (
                                    <span className="flex items-center gap-2 text-accent-400 font-medium">
                                        <Sparkles className="w-4 h-4" />
                                        Cloud Sync Active
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Packs */}
                <div className="animate-slide-up">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="w-1 h-6 bg-primary-500 rounded-full" />
                            Published Packs
                        </h2>
                        <span className="text-sm text-zinc-500 font-mono">
                            {packs.length} ITEMS
                        </span>
                    </div>

                    {packs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {packs.map(pack => (
                                <PackCard key={pack.id} pack={pack} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
                            <Package className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500">No packs published yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
