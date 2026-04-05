import { useState } from 'react';
import { X, Save, AlertTriangle, Edit, GitBranch, Brain, Shield, Loader } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { SyncedDecision } from '../types';

interface EditDecisionModalProps {
    decision: SyncedDecision;
    onClose: () => void;
    onSave: (updatedDecision: SyncedDecision) => void;
}

export default function EditDecisionModal({ decision, onClose, onSave }: EditDecisionModalProps) {
    const [decisionText, setDecisionText] = useState(decision.decision);
    const [rationale, setRationale] = useState(decision.rationale || '');
    const [constraints, setConstraints] = useState(decision.constraints?.join('\n') || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            // Get Supabase client
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            // Get current user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            // Call edge function to update decision
            // adhering to api-001: use fetch instead of invoke
            const response = await fetch(`${supabaseUrl}/functions/v1/update-decision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    // 'apikey' is required by Supabase Gateway if not using invoke
                    'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({
                    decision_id: decision.decision_id,
                    updates: {
                        decision: decisionText,
                        rationale: rationale || null,
                        constraints: constraints ? constraints.split('\n').filter(c => c.trim()) : null,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to update decision (${response.status})`);
            }

            // Update local state
            onSave({
                ...decision,
                decision: decisionText,
                rationale: rationale || null,
                constraints: constraints ? constraints.split('\n').filter(c => c.trim()) : null,
            });

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200 flex flex-col">

                {/* Header with Gradient */}
                <div className="relative p-6 pb-4 border-b border-zinc-800/50">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-500/50 to-transparent opacity-50" />
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Edit className="w-5 h-5 text-accent-400" />
                                Edit Decision
                            </h2>
                            <p className="text-xs font-mono text-zinc-500 mt-1 flex items-center gap-1.5">
                                <GitBranch className="w-3 h-3" />
                                {decision.decision_id}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 -mt-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Decision Input - Large & Prominent */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-accent-400 uppercase tracking-wider flex items-center gap-2">
                            Decision Statement
                        </label>
                        <textarea
                            value={decisionText}
                            onChange={(e) => setDecisionText(e.target.value)}
                            rows={3}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-lg font-medium text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500/50 transition-all resize-none leading-relaxed"
                            placeholder="What is the core decision?"
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Rationale */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                <Brain className="w-3 h-3" /> Rationale
                            </label>
                            <textarea
                                value={rationale}
                                onChange={(e) => setRationale(e.target.value)}
                                rows={6}
                                className="w-full bg-zinc-900/30 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none leading-relaxed"
                                placeholder="Explain the context and reasoning..."
                            />
                        </div>

                        {/* Constraints */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Constraints
                            </label>
                            <textarea
                                value={constraints}
                                onChange={(e) => setConstraints(e.target.value)}
                                rows={6}
                                className="w-full bg-zinc-900/30 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all resize-none leading-relaxed font-mono"
                                placeholder="One constraint per line..."
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-zinc-800/50 bg-zinc-950/50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !decisionText.trim()}
                        className="px-5 py-2.5 text-sm font-bold bg-accent-500 hover:bg-accent-400 text-black rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-accent-500/20"
                    >
                        {saving ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
