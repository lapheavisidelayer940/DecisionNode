import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Plus, X, Loader, DollarSign, AlertTriangle } from 'lucide-react';
import { ScopeSelector } from '../components/ScopeSelector';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DecisionNode } from '../lib/database.types';

const SCOPES = ['UI', 'API', 'Backend', 'Frontend', 'Database', 'Security', 'DevOps', 'Other'];

// Generate MD5-like hash for duplicate detection (matches DB function)
async function generateContentHash(decisions: DecisionNode[]): Promise<string> {
    const content = JSON.stringify(decisions);
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function CreatePackPage() {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [loadingStatus, setLoadingStatus] = useState('');
    const [error, setError] = useState('');
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [stripeStatus, setStripeStatus] = useState<'loading' | 'active' | 'incomplete' | 'not_connected'>('loading');

    // Fetch Stripe status on mount
    useEffect(() => {
        if (user) {
            fetchStripeStatus();
        }
    }, [user]);

    async function fetchStripeStatus() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-stripe-status`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                }
            );

            const data = await response.json();
            if (response.ok && data.status) {
                setStripeStatus(data.status === 'active' ? 'active' : data.status === 'incomplete' || data.status === 'pending' ? 'incomplete' : 'not_connected');
            } else {
                setStripeStatus('not_connected');
            }
        } catch (error) {
            console.error('Error fetching Stripe status:', error);
            setStripeStatus('not_connected');
        }
    }

    // Form state
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState('UI');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [decisions, setDecisions] = useState<DecisionNode[]>([]);

    // Pricing state
    const [isPaid, setIsPaid] = useState(false);
    const [priceUsd, setPriceUsd] = useState('');
    const [previewDecisions, setPreviewDecisions] = useState(2);

    // ToS agreement state
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Redirect if not logged in
    if (!user || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
                <div className="fixed inset-0 bg-grid-fade" />
                <div className="text-center z-10 p-8 bento-card max-w-md w-full mx-4">
                    <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
                    <p className="text-zinc-400 mb-6">Please sign in to start creating decision packs.</p>
                    <a href="/login" className="btn-primary w-full inline-block">Sign In</a>
                </div>
            </div>
        );
    }

    function handleNameChange(value: string) {
        setName(value);
        // Auto-generate slug
        setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }

    function addTag() {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim().toLowerCase()]);
            setTagInput('');
        }
    }

    function removeTag(tag: string) {
        setTags(tags.filter(t => t !== tag));
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Handle different file formats
            if (Array.isArray(data)) {
                // Array of decisions
                setDecisions(data);
            } else if (data.decisions && Array.isArray(data.decisions)) {
                // Pack format with decisions and vectors
                setDecisions(data.decisions);
                // vectors will be generated by Edge Function on creation
                if (data.name) setName(data.name);
                if (data.description) setDescription(data.description);
                if (data.scope) setScope(data.scope);
                if (data.tags) setTags(data.tags);
            } else {
                throw new Error('Invalid file format');
            }
        } catch (err) {
            setError('Invalid JSON file. Please upload a valid decisions file.');
        }
    }

    function addDecision() {
        const newDecision: DecisionNode = {
            id: `${scope.toLowerCase()}-${(decisions.length + 1).toString().padStart(3, '0')}`,
            scope: scope.toLowerCase(),
            decision: '',
            status: 'active',
            createdAt: new Date().toISOString()
        };
        setDecisions([...decisions, newDecision]);
    }

    function updateDecision(index: number, updates: Partial<DecisionNode>) {
        const updated = [...decisions];
        updated[index] = { ...updated[index], ...updates };
        setDecisions(updated);
    }

    function removeDecision(index: number) {
        setDecisions(decisions.filter((_, i) => i !== index));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoadingStatus('Validating...');

        try {
            // Validate basic fields
            if (!name.trim()) throw new Error('Name is required');
            if (!description.trim()) throw new Error('Description is required');
            if (decisions.length === 0) throw new Error('Add at least one decision');

            // Check pack creation rate limit
            const { data: rateCheck, error: rateError } = await supabase
                .rpc('can_create_pack', { user_id: user!.id });

            if (rateError) {
                console.error('Rate limit check failed:', rateError);
            } else if (rateCheck && rateCheck.length > 0 && !rateCheck[0].allowed) {
                throw new Error(rateCheck[0].reason);
            }

            // Check content blocklist
            const contentToCheck = `${name} ${description}`;
            const { data: contentCheck } = await supabase
                .rpc('contains_blocked_content', { content: contentToCheck });

            if (contentCheck && contentCheck.length > 0 && contentCheck[0].is_blocked) {
                throw new Error(`Content contains prohibited words. Please revise your pack name or description.`);
            }

            // Check for duplicate content (piracy detection)
            setLoadingStatus('Checking for duplicates...');
            const contentHash = await generateContentHash(decisions);
            const { data: dupCheck } = await supabase
                .rpc('check_duplicate_content', {
                    new_hash: contentHash,
                    author_id: user!.id
                });

            if (dupCheck && dupCheck.length > 0 && dupCheck[0].is_duplicate) {
                throw new Error(`This content appears to be a duplicate of a pack by ${dupCheck[0].original_author}. Piracy is not allowed.`);
            }

            // Verify ToS agreement
            if (!agreedToTerms) {
                throw new Error('You must agree to the Terms of Service to publish.');
            }

            setLoadingStatus('Checking availability...');

            // Check if slug is unique
            const { data: existing } = await supabase
                .from('packs')
                .select('id')
                .eq('slug', slug)
                .single();

            if (existing) {
                throw new Error('A pack with this URL already exists');
            }

            setLoadingStatus('Saving pack...');

            // Create pack as draft (not embedded)
            const priceCents = isPaid && priceUsd ? Math.round(parseFloat(priceUsd) * 100) : 0;
            const { error: insertError } = await supabase.from('packs').insert({
                slug,
                name: name.trim(),
                description: description.trim(),
                scope,
                author_id: user!.id,
                decisions,
                vectors: {},
                tags,
                is_embedded: false, // Not embedded yet - needs explicit publish
                is_paid: isPaid,
                price_cents: priceCents,
                preview_decisions: isPaid ? previewDecisions : 0
            });

            if (insertError) throw insertError;

            // Navigate to dashboard where they can publish
            navigate('/my-packs?created=true');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoadingStatus('');
        }
    }

    return (
        <>
            <div className="relative min-h-screen pt-24 pb-20">
                <div className="fixed inset-0 bg-grid-fade" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white mb-2">Create New Pack</h1>
                            <p className="text-zinc-400 text-lg">Define a set of decisions to share with the ecosystem.</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
                            {/* Basic Info */}
                            <div className="bento-card p-8">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-primary-500 rounded-full" />
                                    Pack Configuration
                                </h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Pack Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => handleNameChange(e.target.value)}
                                            className="input w-full"
                                            placeholder="My Awesome Pack"
                                            required
                                        />
                                    </div>

                                    {/* Slug removed from UI but still auto-generated */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="input w-full h-24 resize-none"
                                            placeholder="Describe what this pack is about..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Scope</label>
                                        <ScopeSelector
                                            value={scope}
                                            onChange={setScope}
                                            options={SCOPES}
                                            placeholder="e.g. UI, API, Backend"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tags</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tagInput}
                                                onChange={e => setTagInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                                className="input flex-1"
                                                placeholder="Add tag..."
                                            />
                                            <button type="button" onClick={addTag} className="btn-secondary">
                                                Add
                                            </button>
                                        </div>
                                        {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {tags.map(tag => (
                                                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-white/10 text-white/70 rounded text-sm">
                                                        {tag}
                                                        <button type="button" onClick={() => removeTag(tag)}>
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="bento-card p-8">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-green-500 rounded-full" />
                                    Pricing
                                </h2>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsPaid(false)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all ${!isPaid
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                                }`}
                                        >
                                            Free
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (stripeStatus !== 'active') {
                                                    setShowStripeModal(true);
                                                    return;
                                                }
                                                setIsPaid(true);
                                            }}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isPaid
                                                ? 'bg-green-500 text-white'
                                                : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                                }`}
                                        >
                                            <DollarSign className="w-4 h-4" />
                                            Paid {stripeStatus === 'loading' ? '(Checking...)' : stripeStatus !== 'active' && '(Setup Required)'}
                                        </button>
                                    </div>


                                    {isPaid && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Price (USD)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.99"
                                                        value={priceUsd}
                                                        onChange={e => setPriceUsd(e.target.value)}
                                                        className="input w-full !pl-10"
                                                        placeholder="2.99"
                                                        required={isPaid}
                                                    />
                                                </div>
                                                <p className="text-xs text-zinc-600 mt-1">You receive 90% (${priceUsd ? (parseFloat(priceUsd) * 0.9).toFixed(2) : '0.00'})</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Preview Decisions</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={decisions.length}
                                                    value={previewDecisions}
                                                    onChange={e => setPreviewDecisions(parseInt(e.target.value) || 0)}
                                                    className="input w-full"
                                                />
                                                <p className="text-xs text-zinc-600 mt-1">How many decisions to show for free</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Decisions */}
                            <div className="bento-card p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <span className="w-1 h-6 bg-accent-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                                        Decision Nodes <span className="text-accent-500">({decisions.length})</span>
                                    </h2>
                                    <div className="flex gap-2">
                                        <label className="btn-secondary cursor-pointer flex items-center gap-2 hover:border-accent-500/50 hover:text-accent-400 transition-colors">
                                            <Upload className="w-4 h-4" />
                                            Upload JSON
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                        </label>
                                        <button type="button" onClick={addDecision} className="btn-primary flex items-center gap-2 bg-gradient-to-r from-accent-600 to-accent-500 border-accent-400/30 text-white hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                                            <Plus className="w-4 h-4" />
                                            Add Decision
                                        </button>
                                    </div>
                                </div>

                                {decisions.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
                                        <p className="text-white/50 mb-4">No decisions yet</p>
                                        <p className="text-white/30 text-sm">Upload a JSON file or add decisions manually</p>
                                    </div>
                                ) : <div className="space-y-4">
                                    {decisions.map((decision, index) => (
                                        <div key={index} className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-800 transition-all hover:border-zinc-700">
                                            {/* Header row: ID, Status, Delete */}
                                            <div className="flex items-center justify-between mb-3 gap-2">
                                                <input
                                                    type="text"
                                                    value={decision.id}
                                                    onChange={e => updateDecision(index, { id: e.target.value })}
                                                    className="input text-sm font-mono flex-1"
                                                    placeholder="id (e.g. ui-001)"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeDecision(index)}
                                                    className="text-white/30 hover:text-red-400 p-1"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* Decision statement */}
                                            <textarea
                                                value={decision.decision}
                                                onChange={e => updateDecision(index, { decision: e.target.value })}
                                                className="input w-full mb-2 h-16 resize-none"
                                                placeholder="Decision statement (required)..."
                                            />

                                            {/* Rationale */}
                                            <textarea
                                                value={decision.rationale || ''}
                                                onChange={e => updateDecision(index, { rationale: e.target.value })}
                                                className="input w-full mb-2 h-12 resize-none text-sm"
                                                placeholder="Rationale - why this decision was made..."
                                            />

                                            {/* Two-column row for appliesTo and constraints */}
                                            {/* Constraints */}
                                            <input
                                                type="text"
                                                value={decision.constraints?.join(', ') || ''}
                                                onChange={e => updateDecision(index, { constraints: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                className="input w-full text-sm mb-2"
                                                placeholder="Constraints (comma-separated rules)"
                                            />
                                        </div>
                                    ))}
                                </div>
                                }
                            </div>


                            {/* Terms Agreement Checkbox */}
                            <div className="bento-card p-6 border-primary-500/30 bg-primary-500/5">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                                        required
                                    />
                                    <span className="text-sm text-zinc-300">
                                        I have read and agree to the{' '}
                                        <Link to="/terms" target="_blank" className="text-primary-400 hover:underline font-medium">Terms of Service</Link>
                                        {' '}and{' '}
                                        <Link to="/privacy" target="_blank" className="text-primary-400 hover:underline font-medium">Privacy Policy</Link>.
                                        I confirm that this content is original and does not violate any intellectual property rights.
                                    </span>
                                </label>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!!loadingStatus}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {loadingStatus ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            {loadingStatus}
                                        </>
                                    ) : 'Save Draft'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Stripe Connect Modal */}
            {
                showStripeModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bento-card p-8 max-w-md w-full animate-slide-up">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-amber-500/20 rounded-xl">
                                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Connect Stripe First</h3>
                            </div>
                            <p className="text-zinc-400 mb-6">
                                To sell paid packs and receive payments, you need to connect your Stripe account. This allows us to send your 90% earnings directly to your bank account.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowStripeModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <Link
                                    to="/settings?tab=payments"
                                    className="btn-primary flex-1 text-center"
                                >
                                    Go to Settings
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
        </>
    );
}
