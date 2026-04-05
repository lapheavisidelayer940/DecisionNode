import { useState } from 'react';
import { Check, Zap, Cloud, Sparkles, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = {
    free: [
        'Full CLI, VS Code extension, MCP server',
        'Unlimited local decisions',
        'Marketplace downloads',
        'Unlimited marketplace publishes*',
        'Needs your Gemini API key for embeddings',
    ],
    pro: [
        'Everything in Free',
        'Cloud embedding — no local Gemini API key needed',
        'Cloud sync your local decisions',
        'Unlimited embedded marketplace publishes',
    ],
};

export default function PricingPage() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);
    const [error, setError] = useState('');

    const isPro = profile?.subscription_tier === 'pro';

    async function handleSubscribe(plan: 'monthly' | 'yearly') {
        if (!user) {
            window.location.href = '/login?redirect=/pricing';
            return;
        }

        setLoading(plan);
        setError('');

        try {
            const response = await supabase.functions.invoke('create-checkout', {
                body: {
                    type: 'subscription',
                    plan,
                    success_url: `${window.location.origin}/my-packs?subscription=success`,
                    cancel_url: `${window.location.origin}/pricing`,
                },
            });

            console.log('Checkout response:', response);

            if (response.error) {
                throw new Error(response.error.message || 'Checkout failed');
            }

            if (response.data?.error) {
                throw new Error(response.data.error);
            }

            if (response.data?.checkout_url) {
                window.location.href = response.data.checkout_url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (err) {
            console.error('Subscribe error:', err);
            setError((err as Error).message);
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="relative min-h-screen pt-24 pb-20 overflow-hidden">


            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-16 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary-500/20 rounded-full blur-[60px] pointer-events-none" />
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight relative z-10">
                        <span className="text-primary-400 text-glow">Decision</span>
                        <span className="text-yellow-500 text-glow-accent">Node</span> Cloud Sync
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto relative z-10 leading-relaxed">
                        DecisionNode is <span className="text-white">completely free</span> to use locally.
                        Pro adds cloud sync and serverside embedding for convenience features.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-8 max-w-md mx-auto text-center">
                        {error}
                    </div>
                )}

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Free Tier */}
                    <div className="bento-card p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white mb-2">Free</h2>
                            <p className="text-zinc-400">Everything you need to get started</p>
                        </div>

                        <div className="mb-8">
                            <span className="text-4xl font-bold text-white">$0</span>
                            <span className="text-zinc-500">/forever</span>
                        </div>

                        <ul className="space-y-3 mb-8">
                            {FEATURES.free.slice(0, 3).map((feature) => (
                                <li key={feature} className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-zinc-300">{feature}</span>
                                </li>
                            ))}
                            <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-0.5" />
                                <span className="text-zinc-500">{FEATURES.free[3]}</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-0.5" />
                                <span className="text-zinc-500">{FEATURES.free[4]}</span>
                            </li>
                        </ul>

                        <button
                            className="btn-secondary w-full"
                            disabled
                        >
                            {isPro ? 'Included' : 'Current Plan'}
                        </button>
                        <p className="text-xs text-zinc-600 mt-4 text-center">
                            *Publishes are unlimited, but only 3/week will be embedded using the cloud API. When u exhaust this limit, you would publish your collection to the marketplace without the embeddings and people would have to use their own API key <br /> (or cloud API if they have the Pro plan) to embed them after download.
                        </p>
                    </div>

                    {/* Pro Tier */}
                    <div className="bento-card p-8 border-accent-500/30 relative overflow-hidden bg-accent-500/5 transition-all group">

                        <div className="mb-6 relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-2xl font-bold text-white">Pro</h2>
                                <Crown className="w-5 h-5 text-accent-400" />
                            </div>
                            <p className="text-zinc-400">Cloud sync services</p>
                        </div>

                        <div className="mb-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-white">$4.99</span>
                                <span className="text-zinc-500">/month</span>
                            </div>
                            <p className="text-sm text-zinc-500 mt-1">
                                or $39.99/year (save 33%)
                            </p>
                        </div>

                        <ul className="space-y-3 mb-8">
                            {FEATURES.pro.map((feature) => (
                                <li key={feature} className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-white">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {isPro ? (
                            <button className="btn-secondary w-full border-accent-500/30 text-accent-400 flex items-center justify-center gap-2" disabled>
                                <Check className="w-4 h-4" />
                                You're subscribed!
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleSubscribe('monthly')}
                                    disabled={!!loading}
                                    className="btn-primary w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-600 to-accent-500 border-accent-400/30 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                                >
                                    {loading === 'monthly' ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <Zap className="w-4 h-4" />
                                    )}
                                    Subscribe Monthly
                                </button>
                                <button
                                    onClick={() => handleSubscribe('yearly')}
                                    disabled={!!loading}
                                    className="btn-secondary w-full flex items-center justify-center gap-2"
                                >
                                    {loading === 'yearly' ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <Cloud className="w-4 h-4" />
                                    )}
                                    Subscribe Yearly (Save 33%)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-20">
                    <h2 className="text-2xl font-bold text-white text-center mb-12">
                        What's included in Pro?
                    </h2>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bento-card p-6 hover:border-accent-500/30 transition-colors">
                            <Cloud className="w-8 h-8 text-accent-400 mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">Cloud Sync</h3>
                            <p className="text-zinc-400 text-sm">
                                Your local decisions for every project automatically sync to the cloud.
                                Access them from anywhere.
                            </p>
                        </div>

                        <div className="bento-card p-6 hover:border-accent-500/30 transition-colors">
                            <Sparkles className="w-8 h-8 text-accent-400 mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">Cloud Embedding</h3>
                            <p className="text-zinc-400 text-sm">
                                Every decision you add locally / every RAG query is automatically embedded using the cloud API.
                                No local API key setup required.
                            </p>
                        </div>

                        <div className="bento-card p-6 hover:border-accent-500/30 transition-colors">
                            <Zap className="w-8 h-8 text-accent-400 mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">Marketplace Publishing</h3>
                            <p className="text-zinc-400 text-sm">
                                All the Decision packs you publish in the marketplace are automatically embedded using the cloud API.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
