import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Plus, X, Loader, ArrowLeft, DollarSign } from 'lucide-react';
import { ScopeSelector } from '../components/ScopeSelector';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DecisionNode, Pack } from '../lib/database.types';

const SCOPES = ['UI', 'API', 'Backend', 'Frontend', 'Database', 'Security', 'DevOps', 'Other'];

export default function EditPackPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    // Form state
    const [pack, setPack] = useState<Pack | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState('UI');
    const [decisions, setDecisions] = useState<DecisionNode[]>([]);
    // Pricing state
    const [isPaid, setIsPaid] = useState(false);
    const [price, setPrice] = useState('');
    const [previewDecisions, setPreviewDecisions] = useState(2);

    useEffect(() => {
        if (slug) fetchPack();
    }, [slug]);

    async function fetchPack() {
        try {
            const { data, error } = await supabase
                .from('packs')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error) throw error;
            if (data.author_id !== user?.id) {
                navigate('/my-packs');
                return;
            }

            setPack(data);
            setName(data.name);
            setDescription(data.description);
            setScope(data.scope);
            setDecisions(data.decisions || []);
            setIsPaid(data.is_paid || false);
            setPrice(data.price_cents ? (data.price_cents / 100).toString() : '');
            setPreviewDecisions(data.preview_decisions || 2);
        } catch (err) {
            setError('Pack not found');
        } finally {
            setLoading(false);
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

    async function handleSave() {
        if (!pack) return;
        setShowSaveConfirm(true);
    }

    async function confirmSave() {
        if (!pack) return;
        setError('');
        setSaving(true);
        setShowSaveConfirm(false);

        try {
            const priceCents = isPaid ? Math.round(parseFloat(price || '0') * 100) : 0;

            const { error: updateError } = await supabase
                .from('packs')
                .update({
                    name: name.trim(),
                    description: description.trim(),
                    scope,
                    decisions,
                    is_paid: isPaid,
                    price_cents: priceCents,
                    preview_decisions: isPaid ? previewDecisions : 0,
                    // Bump version (patch)
                    version: bumpVersion(pack.version),
                    is_embedded: false, // Reset - needs re-publish
                    vectors: null, // CLEAR VECTORS
                    updated_at: new Date().toISOString()
                })
                .eq('id', pack.id);

            if (updateError) throw updateError;
            navigate('/my-packs?updated=true');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    function bumpVersion(version: string) {
        const parts = version.replace(/^v/, '').split('.').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return version;
        parts[2]++; // Bump patch
        return parts.join('.');
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        );
    }

    if (!pack) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-zinc-400 mb-4">{error || 'Pack not found'}</p>
                    <button onClick={() => navigate('/my-packs')} className="btn-primary">
                        Back to My Packs
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen pt-24 pb-20">
            <div className="fixed inset-0 bg-grid-fade" />

            {/* Save Confirmation Modal */}
            {showSaveConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bento-card p-8 max-w-md w-full border-red-500/30">
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <span className="p-2 bg-red-500/10 rounded-lg">
                                <Loader className="w-6 h-6" /> {/* Using Loader as Alert icon placehoder or import AlertTriangle */}
                            </span>
                            <h2 className="text-xl font-bold text-white">Warning: Vector Reset</h2>
                        </div>

                        <p className="text-zinc-300 mb-6 leading-relaxed">
                            Saving changes will <span className="text-red-400 font-bold">clear existing embeddings</span> for this pack and require re-embedding.
                            <br /><br />
                            This will also bump the version to <span className="font-mono text-white bg-zinc-800 px-1.5 py-0.5 rounded">{bumpVersion(pack.version)}</span>.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmSave}
                                className="btn-primary w-full bg-red-600 hover:bg-red-500 border-red-500/50"
                            >
                                Confirm & Save
                            </button>
                            <button
                                onClick={() => setShowSaveConfirm(false)}
                                className="btn-secondary w-full"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <button
                            onClick={() => navigate('/my-packs')}
                            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to My Packs
                        </button>
                        <h1 className="text-3xl font-bold text-white mb-2">Edit Pack</h1>
                        <p className="text-zinc-400">
                            {pack.is_embedded
                                ? 'Saving changes will bump the version and require re-embedding vectors.'
                                : 'This pack is a draft - publish it when ready.'}
                        </p>
                    </div>
                    {/* Rest of the component... (ensure we match context) */}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    <div className="space-y-8">
                        {/* Basic Info */}
                        <div className="bento-card p-8">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                                Pack Configuration
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Pack Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="input w-full"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="input w-full h-24 resize-none"
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
                                        onClick={() => setIsPaid(true)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isPaid
                                            ? 'bg-green-500 text-white'
                                            : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                            }`}
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Paid
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
                                                    value={price}
                                                    onChange={e => setPrice(e.target.value)}
                                                    className="input w-full !pl-7"
                                                    placeholder="2.99"
                                                    required={isPaid}
                                                />
                                            </div>
                                            <p className="text-xs text-zinc-600 mt-1">You receive 90% (${price ? (parseFloat(price) * 0.9).toFixed(2) : '0.00'})</p>
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
                                <button type="button" onClick={addDecision} className="btn-primary flex items-center gap-2 bg-gradient-to-r from-accent-600 to-accent-500 border-accent-400/30 text-white hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                                    <Plus className="w-4 h-4" />
                                    Add Decision
                                </button>
                            </div>

                            <div className="space-y-4">
                                {decisions.map((decision, index) => (
                                    <div key={index} className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
                                        <div className="flex items-center justify-between mb-3 gap-2">
                                            <input
                                                type="text"
                                                value={decision.id}
                                                onChange={e => updateDecision(index, { id: e.target.value })}
                                                className="input text-sm font-mono flex-1"
                                                placeholder="id"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeDecision(index)}
                                                className="text-white/30 hover:text-red-400 p-1"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <textarea
                                            value={decision.decision}
                                            onChange={e => updateDecision(index, { decision: e.target.value })}
                                            className="input w-full mb-2 h-16 resize-none"
                                            placeholder="Decision statement..."
                                        />
                                        <textarea
                                            value={decision.rationale || ''}
                                            onChange={e => updateDecision(index, { rationale: e.target.value })}
                                            className="input w-full mb-2 h-12 resize-none text-sm"
                                            placeholder="Rationale..."
                                        />
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
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-4">
                            <button onClick={() => navigate('/my-packs')} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary flex items-center gap-2"
                            >
                                {saving ? (
                                    <Loader className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
