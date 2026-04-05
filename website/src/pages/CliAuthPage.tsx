import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Terminal, Check, LogIn, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function CliAuthPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const [authorizing, setAuthorizing] = useState(false);
    const [authorized, setAuthorized] = useState(false);
    const [error, setError] = useState('');

    const callbackUrl = searchParams.get('callback');
    const authCode = searchParams.get('code');

    async function handleAuthorize() {
        if (!user || !callbackUrl) return;

        setAuthorizing(true);
        setError('');

        try {
            // Get current session token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('No active session');
            }

            // Build callback URL with auth data
            const callback = new URL(callbackUrl);
            callback.searchParams.set('token', session.access_token);
            if (session.refresh_token) {
                callback.searchParams.set('refresh_token', session.refresh_token);
            }
            if (session.expires_at) {
                callback.searchParams.set('token_expires_at', session.expires_at.toString());
            }

            // Pass the anon key so the CLI can use it for headers
            const anonKey = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
            if (anonKey) {
                callback.searchParams.set('anon_key', anonKey);
            }

            callback.searchParams.set('user_id', user.id);
            callback.searchParams.set('username', profile?.username || '');
            callback.searchParams.set('email', user.email || '');
            callback.searchParams.set('tier', profile?.subscription_tier || 'free');
            if (profile?.subscription_expires_at) {
                callback.searchParams.set('expires_at', profile.subscription_expires_at);
            }

            // Redirect to CLI callback
            window.location.href = callback.toString();
            setAuthorized(true);
        } catch (err) {
            console.error('Authorization error:', err);
            setError((err as Error).message);
            setAuthorizing(false);
        }
    }

    // Auto-authorize if user is logged in and callback is present
    useEffect(() => {
        // Don't auto-authorize, let user click buttn
    }, []);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        );
    }

    // Not logged in - show login prompt
    if (!user) {
        return (
            <div className="min-h-screen pt-24 pb-20 relative">
                <div className="fixed inset-0 bg-grid-fade pointer-events-none" />

                <div className="max-w-md mx-auto px-4 text-center relative z-10">
                    <div className="bento-card p-8">
                        <Terminal className="w-16 h-16 text-primary-400 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-white mb-4">
                            Authorize DecisionNode CLI
                        </h1>
                        <p className="text-zinc-400 mb-8">
                            Sign in to connect your CLI to your DecisionNode account.
                        </p>
                        <Link
                            to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <LogIn className="w-4 h-4" />
                            Sign In to Continue
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Already authorized
    if (authorized) {
        return (
            <div className="min-h-screen pt-24 pb-20 relative">
                <div className="fixed inset-0 bg-grid-fade pointer-events-none" />

                <div className="max-w-md mx-auto px-4 text-center relative z-10">
                    <div className="bento-card p-8">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-4">
                            CLI Authorized!
                        </h1>
                        <p className="text-zinc-400 mb-4">
                            You can close this window and return to your terminal.
                        </p>
                        <p className="text-sm text-zinc-500">
                            The CLI is now connected to your DecisionNode account.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Missing callback URL
    if (!callbackUrl) {
        return (
            <div className="min-h-screen pt-24 pb-20 relative">
                <div className="fixed inset-0 bg-grid-fade pointer-events-none" />

                <div className="max-w-md mx-auto px-4 text-center relative z-10">
                    <div className="bento-card p-8">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-white mb-4">
                            Invalid Request
                        </h1>
                        <p className="text-zinc-400 mb-4">
                            This page should be opened from the DecisionNode CLI.
                        </p>
                        <p className="text-sm text-zinc-500 mb-6">
                            Run <code className="text-primary-400">decide login</code> in your terminal to authenticate.
                        </p>
                        <Link to="/" className="btn-secondary">
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Show authorization prompt
    return (
        <div className="min-h-screen pt-24 pb-20 relative">
            <div className="fixed inset-0 bg-grid-fade pointer-events-none" />

            <div className="max-w-md mx-auto px-4 relative z-10">
                <div className="bento-card p-8">
                    <Terminal className="w-16 h-16 text-primary-400 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-white mb-4 text-center">
                        Authorize DecisionNode CLI
                    </h1>

                    <div className="bg-zinc-900/50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-zinc-400 mb-2">Logged in as:</p>
                        <p className="text-white font-medium">
                            {profile?.username ? `@${profile.username}` : user.email}
                        </p>
                        <p className="text-sm text-zinc-500 mt-1">
                            {profile?.subscription_tier === 'pro' ? '⭐ Pro' : 'Free'} subscription
                        </p>
                    </div>

                    <p className="text-zinc-400 text-sm mb-6 text-center">
                        The CLI will be able to access your DecisionNode account.
                    </p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleAuthorize}
                        disabled={authorizing}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {authorizing ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Authorizing...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Authorize CLI
                            </>
                        )}
                    </button>

                    <p className="text-xs text-zinc-600 mt-4 text-center">
                        Auth code: {authCode || 'N/A'}
                    </p>
                </div>
            </div>
        </div>
    );
}
