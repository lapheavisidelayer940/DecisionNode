import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Shield, Bell, Save, CreditCard, ExternalLink, Check, AlertCircle, Loader, Clock, X, AlertTriangle, Download, Trash2, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useStripeStatus } from '../hooks/useStripeStatus';

type SettingsTab = 'general' | 'payments' | 'security';

export default function SettingsPage() {
    const { user, profile, refreshProfile } = useAuth();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [connectingStripe, setConnectingStripe] = useState(false);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaLoading, setMfaLoading] = useState(false);
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [mfaQrCode, setMfaQrCode] = useState('');
    const [mfaSecret, setMfaSecret] = useState('');
    const [mfaVerifyCode, setMfaVerifyCode] = useState('');

    // Auto-updating Stripe status hook
    const { stripeStatus, refreshing, fetchStripeStatus } = useStripeStatus(activeTab, searchParams);

    // Set active tab from URL parameter

    // Form state matching Profile interface
    const [formData, setFormData] = useState({
        username: '',
        display_name: '',
        bio: '',
    });

    // Sync form data with profile from AuthContext
    useEffect(() => {
        if (profile) {
            setFormData({
                username: profile.username || '',
                display_name: profile.display_name || '',
                bio: profile.bio || '',
            });
        }
    }, [profile]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;

        // Validate username
        if (!formData.username || !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            setErrorMessage('Username can only contain letters, numbers, and underscores');
            return;
        }

        setLoading(true);
        setSuccess(false);
        setErrorMessage('');

        try {
            // Check if username has changed
            const usernameChanged = profile?.username !== formData.username;

            // If username changed, check rate limit
            if (usernameChanged) {
                const { data: rateLimitCheck, error: rateLimitError } = await supabase
                    .rpc('can_change_username', { user_id: user.id });

                if (rateLimitError) throw rateLimitError;

                if (rateLimitCheck && rateLimitCheck.length > 0 && !rateLimitCheck[0].can_change) {
                    throw new Error(rateLimitCheck[0].reason || 'Cannot change username at this time');
                }
            }

            // Prepare update data
            const updateData: any = {
                display_name: formData.display_name,
                bio: formData.bio,
                updated_at: new Date().toISOString(),
            };

            // Add username if changed
            if (usernameChanged) {
                updateData.username = formData.username;
                updateData.username_changed_at = new Date().toISOString();

                // Increment counter or reset if needed
                const lastChanged = profile?.username_changed_at;
                const daysSinceChange = lastChanged
                    ? (Date.now() - new Date(lastChanged).getTime()) / (1000 * 60 * 60 * 24)
                    : null;

                updateData.username_change_count =
                    (daysSinceChange && daysSinceChange < 14)
                        ? (profile?.username_change_count || 0) + 1
                        : 1;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id);

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    throw new Error('Username already taken');
                }
                throw error;
            }

            // Refresh profile in AuthContext for real-time update
            await refreshProfile();

            setSuccess(true);

            // Reset success message after 3s
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setErrorMessage((error as Error).message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    }

    async function handleConnectStripe() {
        setConnectingStripe(true);
        setErrorMessage('');
        try {
            // Must use fetch with explicit auth header - supabase.functions.invoke doesn't send auth properly
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setErrorMessage('Please sign in first');
                return;
            }

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-connect-link`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        return_url: `${window.location.origin}/settings?tab=payments&connect=success`,
                        refresh_url: `${window.location.origin}/settings?tab=payments&connect=refresh`
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create Stripe Connect link');
            }

            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Stripe Connect error:', error);
            setErrorMessage('Failed to connect Stripe: ' + (error as Error).message);
        } finally {
            setConnectingStripe(false);
        }
    }

    async function handleDisconnectStripe() {
        setDisconnecting(true);
        setErrorMessage('');
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ stripe_connect_id: null })
                .eq('id', user!.id);

            if (error) throw error;

            // Refresh page to update UI
            window.location.reload();
        } catch (error) {
            console.error('Error disconnecting Stripe:', error);
            setErrorMessage('Failed to disconnect Stripe. Please try again.');
            setShowDisconnectModal(false);
        } finally {
            setDisconnecting(false);
        }
    }

    // Export user data as JSON
    async function handleExportData() {
        if (!user) return;
        setExporting(true);
        try {
            // Fetch user's profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            // Fetch user's packs
            const { data: packsData } = await supabase
                .from('packs')
                .select('*')
                .eq('author_id', user.id);

            // Fetch user's ratings
            const { data: ratingsData } = await supabase
                .from('ratings')
                .select('*')
                .eq('user_id', user.id);

            // Fetch user's favorites
            const { data: favoritesData } = await supabase
                .from('favorites')
                .select('*')
                .eq('user_id', user.id);

            const exportData = {
                exported_at: new Date().toISOString(),
                profile: profileData,
                packs: packsData,
                ratings: ratingsData,
                favorites: favoritesData,
            };

            // Download as JSON file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `decisionnode-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            setErrorMessage('Failed to export data. Please try again.');
        } finally {
            setExporting(false);
        }
    }

    // Delete account
    async function handleDeleteAccount() {
        if (!user || deleteConfirmText !== 'DELETE') return;
        setDeleting(true);
        try {
            // Delete all user data (cascades via FK)
            const { error } = await supabase.auth.admin.deleteUser(user.id);

            if (error) {
                // Try RPC method if admin method fails
                const { error: rpcError } = await supabase.rpc('delete_user_account');
                if (rpcError) throw rpcError;
            }

            // Sign out
            await supabase.auth.signOut();
            window.location.href = '/';
        } catch (error) {
            console.error('Delete account error:', error);
            setErrorMessage('Failed to delete account. Please contact support.');
        } finally {
            setDeleting(false);
        }
    }

    // 2FA - Check if enabled
    async function checkMfaStatus() {
        try {
            const { data } = await supabase.auth.mfa.listFactors();
            const totpFactor = data?.totp?.find(f => f.status === 'verified');
            setMfaEnabled(!!totpFactor);
        } catch (error) {
            console.error('MFA check error:', error);
        }
    }

    // 2FA - Start enrollment
    async function handleEnrollMfa() {
        setMfaLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'Authenticator App'
            });

            if (error) throw error;

            if (data) {
                setMfaQrCode(data.totp.qr_code);
                setMfaSecret(data.totp.secret);
                setShowMfaSetup(true);
            }
        } catch (error) {
            console.error('MFA enroll error:', error);
            setErrorMessage('Failed to set up 2FA. Please try again.');
        } finally {
            setMfaLoading(false);
        }
    }

    // 2FA - Verify and complete enrollment
    async function handleVerifyMfa() {
        setMfaLoading(true);
        try {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const unverifiedFactor = (factors?.totp as any)?.find((f: any) => f.status === 'unverified');

            if (!unverifiedFactor) {
                throw new Error('No pending 2FA setup found');
            }

            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: unverifiedFactor.id
            });

            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: unverifiedFactor.id,
                challengeId: challenge.id,
                code: mfaVerifyCode
            });

            if (verifyError) throw verifyError;

            setMfaEnabled(true);
            setShowMfaSetup(false);
            setMfaVerifyCode('');
        } catch (error) {
            console.error('MFA verify error:', error);
            setErrorMessage('Invalid code. Please try again.');
        } finally {
            setMfaLoading(false);
        }
    }

    // 2FA - Disable
    async function handleDisableMfa() {
        if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) return;

        setMfaLoading(true);
        try {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const verifiedFactor = factors?.totp?.find(f => f.status === 'verified');

            if (verifiedFactor) {
                const { error } = await supabase.auth.mfa.unenroll({
                    factorId: verifiedFactor.id
                });
                if (error) throw error;
            }

            setMfaEnabled(false);
        } catch (error) {
            console.error('MFA disable error:', error);
            setErrorMessage('Failed to disable 2FA. Please try again.');
        } finally {
            setMfaLoading(false);
        }
    }

    // Check MFA status on security tab
    useEffect(() => {
        if (activeTab === 'security' && user) {
            checkMfaStatus();
        }
    }, [activeTab, user]);

    return (
        <div className="min-h-screen relative pt-24 pb-20 overflow-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
                    <p className="text-zinc-400">Manage your profile and preferences.</p>
                </div>

                <div className="grid md:grid-cols-[240px_1fr] gap-8">
                    {/* Sidebar */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'general'
                                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <User className="w-4 h-4" />
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'payments'
                                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <CreditCard className="w-4 h-4" />
                            Payments
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security'
                                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <Shield className="w-4 h-4" />
                            Security
                        </button>
                        <button disabled className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors opacity-50 cursor-not-allowed">
                            <Bell className="w-4 h-4" />
                            Notifications
                        </button>
                    </div>

                    {/* Main Content */}
                    {activeTab === 'general' ? (
                        <div className="bento-card p-8">
                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">@</span>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                            className="input w-full bg-zinc-900/50 border-white/5 focus:border-primary-500/50 pl-8 font-mono"
                                            placeholder="your_username"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-zinc-500">Your unique handle. Letters, numbers, and underscores only.</p>
                                        <p className="text-xs text-blue-400/80">💡 You can change your username up to 2 times every 14 days.</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.display_name}
                                        onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                                        className="input w-full bg-zinc-900/50 border-white/5 focus:border-primary-500/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                        rows={4}
                                        className="input w-full bg-zinc-900/50 border-white/5 focus:border-primary-500/50 resize-none"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>

                                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                    {success && (
                                        <span className="text-green-400 text-sm flex items-center gap-2">
                                            Saved successfully!
                                        </span>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary ml-auto flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : activeTab === 'payments' ? (
                        <div className="space-y-6">
                            {/* Stripe Connect Section */}
                            <div className="bento-card p-8">
                                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-primary-400" />
                                    Receive Payments
                                </h2>
                                <p className="text-zinc-400 mb-6">
                                    Connect your Stripe account to receive payments when users buy your packs.
                                    You'll receive 90% of each sale directly to your bank account.
                                </p>

                                {/* Status: Loading */}
                                {stripeStatus.status === 'loading' && (
                                    <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-lg">
                                        <Loader className="w-5 h-5 text-zinc-500 animate-spin" />
                                        <span className="text-zinc-400">Checking Stripe status...</span>
                                    </div>
                                )}

                                {/* Status: Fully Active */}
                                {stripeStatus.status === 'active' && (
                                    <div className="space-y-4">
                                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
                                            <Check className="w-5 h-5 text-green-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-green-400 font-medium">Stripe Active</p>
                                                <p className="text-zinc-400 text-sm mt-1">
                                                    {stripeStatus.message || 'Your account is ready to receive payments'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 flex-wrap items-center">
                                            <button
                                                onClick={() => setShowDisconnectModal(true)}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                Disconnect Stripe
                                            </button>
                                            <button
                                                onClick={() => fetchStripeStatus(true)}
                                                disabled={refreshing}
                                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {refreshing && <Loader className="w-4 h-4 animate-spin" />}
                                                {refreshing ? 'Refreshing...' : 'Refresh Status'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Status: Pending Verification */}
                                {stripeStatus.status === 'pending' && (
                                    <div className="space-y-4">
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
                                            <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-blue-400 font-medium">Pending Verification</p>
                                                <p className="text-zinc-400 text-sm mt-1">
                                                    {stripeStatus.message || 'Stripe is verifying your information. You may need to provide additional details.'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleConnectStripe}
                                                disabled={connectingStripe}
                                                className="btn-primary flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {connectingStripe ? (
                                                    <Loader className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ExternalLink className="w-4 h-4" />
                                                )}
                                                {connectingStripe ? 'Loading...' : 'Check Requirements'}
                                            </button>
                                            <button
                                                onClick={handleDisconnectStripe}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                Start Over
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Status: Setup Incomplete */}
                                {stripeStatus.status === 'incomplete' && (
                                    <div className="space-y-4">
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-amber-400 font-medium">Setup Incomplete</p>
                                                <p className="text-zinc-400 text-sm mt-1">
                                                    {stripeStatus.message || 'Please complete your Stripe account setup to receive payments'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleConnectStripe}
                                                disabled={connectingStripe}
                                                className="btn-primary flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {connectingStripe ? (
                                                    <Loader className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ExternalLink className="w-4 h-4" />
                                                )}
                                                {connectingStripe ? 'Loading...' : 'Continue Setup'}
                                            </button>
                                            <button
                                                onClick={handleDisconnectStripe}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                Start Over
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Status: Not Connected */}
                                {stripeStatus.status === 'not_connected' && (
                                    <div className="space-y-4">
                                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-start gap-3">
                                            <CreditCard className="w-5 h-5 text-zinc-500 mt-0.5" />
                                            <div>
                                                <p className="text-zinc-300 font-medium">Not Connected</p>
                                                <p className="text-zinc-400 text-sm mt-1">
                                                    Connect your Stripe account to start receiving payments.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleConnectStripe}
                                            disabled={connectingStripe}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            {connectingStripe ? (
                                                <Loader className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CreditCard className="w-4 h-4" />
                                            )}
                                            {connectingStripe ? 'Connecting...' : 'Connect Stripe Account'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Earnings Summary */}
                            <div className="bento-card p-8">
                                <h2 className="text-xl font-bold text-white mb-4">Earnings Summary</h2>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-green-400">$0.00</p>
                                        <p className="text-xs text-zinc-500 mt-1">Total Earnings</p>
                                    </div>
                                    <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-white">$0.00</p>
                                        <p className="text-xs text-zinc-500 mt-1">Pending Payout</p>
                                    </div>
                                    <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-white">0</p>
                                        <p className="text-xs text-zinc-500 mt-1">Total Sales</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'security' ? (
                        <div className="space-y-6">
                            {/* Two-Factor Authentication */}
                            <div className="bento-card p-8">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-primary-400" />
                                    Two-Factor Authentication
                                </h2>
                                <p className="text-zinc-400 text-sm mb-6">
                                    Add an extra layer of security to your account by requiring a verification code from your authenticator app.
                                </p>

                                {showMfaSetup ? (
                                    <div className="space-y-6">
                                        <div className="bg-zinc-900/50 rounded-lg p-6 text-center">
                                            <p className="text-sm text-zinc-400 mb-4">Scan this QR code with your authenticator app:</p>
                                            <img src={mfaQrCode} alt="2FA QR Code" className="mx-auto mb-4 rounded-lg" />
                                            <p className="text-xs text-zinc-500">Or enter this code manually:</p>
                                            <code className="text-xs text-primary-400 bg-zinc-800 px-3 py-1 rounded mt-2 inline-block break-all">{mfaSecret}</code>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-2">Enter verification code:</label>
                                            <input
                                                type="text"
                                                value={mfaVerifyCode}
                                                onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                placeholder="000000"
                                                className="input w-full text-center text-2xl tracking-[0.5em] font-mono"
                                                maxLength={6}
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => { setShowMfaSetup(false); setMfaVerifyCode(''); }} className="btn-secondary flex-1">
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleVerifyMfa}
                                                disabled={mfaLoading || mfaVerifyCode.length !== 6}
                                                className="btn-primary flex-1"
                                            >
                                                {mfaLoading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Verify & Enable'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${mfaEnabled ? 'bg-green-500' : 'bg-zinc-600'}`} />
                                            <span className="text-white">{mfaEnabled ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                        {mfaEnabled ? (
                                            <button onClick={handleDisableMfa} disabled={mfaLoading} className="btn-secondary text-red-400">
                                                {mfaLoading ? 'Disabling...' : 'Disable 2FA'}
                                            </button>
                                        ) : (
                                            <button onClick={handleEnrollMfa} disabled={mfaLoading} className="btn-primary">
                                                {mfaLoading ? 'Setting up...' : 'Enable 2FA'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Export Data */}
                            <div className="bento-card p-8">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Download className="w-5 h-5 text-primary-400" />
                                    Export Your Data
                                </h2>
                                <p className="text-zinc-400 text-sm mb-6">
                                    Download a copy of all your data including your profile, packs, ratings, and favorites.
                                </p>
                                <button onClick={handleExportData} disabled={exporting} className="btn-secondary flex items-center gap-2">
                                    {exporting ? (
                                        <><Loader className="w-4 h-4 animate-spin" /> Exporting...</>
                                    ) : (
                                        <><Download className="w-4 h-4" /> Download My Data</>
                                    )}
                                </button>
                            </div>

                            {/* Delete Account */}
                            <div className="bento-card p-8 border-red-500/20">
                                <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                                    <Trash2 className="w-5 h-5" />
                                    Danger Zone
                                </h2>
                                <p className="text-zinc-400 text-sm mb-6">
                                    Permanently delete your account and all associated data. This action cannot be undone.
                                </p>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                >
                                    Delete My Account
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-3 max-w-md animate-slide-in">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-red-300 text-sm flex-1">{errorMessage}</p>
                    <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Disconnect Stripe Confirmation Modal */}
            {showDisconnectModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bento-card p-6 max-w-md w-full animate-scale-in">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">Disconnect Stripe?</h3>
                                <p className="text-zinc-400 text-sm mb-6">
                                    You won't be able to sell paid packs anymore. Any existing packs will remain, but new purchases won't be possible until you reconnect.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowDisconnectModal(false)}
                                        disabled={disconnecting}
                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDisconnectStripe}
                                        disabled={disconnecting}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {disconnecting && <Loader className="w-4 h-4 animate-spin" />}
                                        {disconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bento-card p-6 max-w-md w-full animate-scale-in">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">Delete Your Account?</h3>
                                <p className="text-zinc-400 text-sm mb-4">
                                    This will permanently delete your account and all your data including packs, ratings, and favorites. This action cannot be undone.
                                </p>
                                <div className="mb-6">
                                    <label className="block text-sm text-zinc-500 mb-2">Type <strong className="text-red-400">DELETE</strong> to confirm:</label>
                                    <input
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                                        className="input w-full"
                                        placeholder="DELETE"
                                    />
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                                        disabled={deleting}
                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deleting || deleteConfirmText !== 'DELETE'}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {deleting && <Loader className="w-4 h-4 animate-spin" />}
                                        {deleting ? 'Deleting...' : 'Delete Forever'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
