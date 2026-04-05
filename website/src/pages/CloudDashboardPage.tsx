import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, RefreshCw, Trash2, Search, Crown, Loader, Edit, ChevronDown, ChevronRight, LayoutGrid, List, Brain, Shield, GitBranch, Calendar, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import EditDecisionModal from '../components/EditDecisionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import DecisionGraph from '../components/DecisionGraph';

interface SyncedDecision {
    id: string;
    project_name: string;
    decision_id: string;
    scope: string;
    decision: string;
    rationale: string | null;
    constraints: string[] | null;
    status: string;
    synced_at: string;
    created_at: string;
    embedding?: string | number[]; // Vector might come as string or array
}

interface ProjectGroup {
    name: string;
    decisions: SyncedDecision[];
    lastSynced: string;
}

export default function CloudDashboardPage() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<ProjectGroup[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingDecision, setEditingDecision] = useState<SyncedDecision | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
    const [expandedScopes, setExpandedScopes] = useState<Record<string, boolean>>({});
    const [expandedDecisions, setExpandedDecisions] = useState<Record<string, boolean>>({});
    const [pendingScopeDelete, setPendingScopeDelete] = useState<{ projectName: string; scopeName: string; count: number } | null>(null);
    const [pendingDecisionDelete, setPendingDecisionDelete] = useState<{ id: string; decisionId: string } | null>(null);

    const isPro = profile?.subscription_tier === 'pro';

    useEffect(() => {
        if (user && isPro) {
            fetchSyncedDecisions();
        } else {
            setLoading(false);
        }
    }, [user, isPro]);

    async function fetchSyncedDecisions() {
        try {
            const { data, error } = await supabase
                .from('user_decisions')
                .select('*')
                .eq('user_id', user!.id)
                .order('synced_at', { ascending: false });

            if (error) throw error;

            // Group by project
            const grouped: Record<string, SyncedDecision[]> = {};
            for (const decision of (data || [])) {
                if (!grouped[decision.project_name]) {
                    grouped[decision.project_name] = [];
                }
                grouped[decision.project_name].push(decision);
            }

            const projectGroups: ProjectGroup[] = Object.entries(grouped).map(([name, decisions]) => ({
                name,
                decisions,
                lastSynced: decisions[0]?.synced_at || ''
            }));

            setProjects(projectGroups);
            if (projectGroups.length > 0 && !selectedProject) {
                setSelectedProject(projectGroups[0].name);
            }
        } catch (err) {
            console.error('Error fetching synced decisions:', err);
        } finally {
            setLoading(false);
        }
    }

    function deleteDecision(id: string, decisionId: string) {
        setPendingDecisionDelete({ id, decisionId });
    }

    async function handleConfirmDeleteDecision() {
        if (!pendingDecisionDelete) return;

        const { id } = pendingDecisionDelete;
        const { error } = await supabase.from('user_decisions').delete().eq('id', id);

        if (error) {
            console.error('Error deleting decision:', error);
            alert('Failed to delete decision');
        } else {
            fetchSyncedDecisions();
        }

        setPendingDecisionDelete(null);
    }

    function deleteScope(projectName: string, scopeName: string, decisionCount: number) {
        setPendingScopeDelete({ projectName, scopeName, count: decisionCount });
    }

    async function handleConfirmDeleteScope() {
        if (!pendingScopeDelete) return;

        const { projectName, scopeName } = pendingScopeDelete;

        const { error } = await supabase
            .from('user_decisions')
            .delete()
            .eq('user_id', user!.id)
            .eq('project_name', projectName)
            .eq('scope', scopeName);

        if (error) {
            console.error('Error deleting scope:', error);
            alert('Failed to delete scope');
        } else {
            fetchSyncedDecisions();
        }

        setPendingScopeDelete(null);
    }

    // Not Pro - show upgrade prompt
    if (!isPro) {
        return (
            <div className="min-h-screen relative pt-24 pb-20">
                <div className="fixed inset-0 bg-grid-fade" />
                <div className="max-w-2xl mx-auto px-4 text-center relative z-10">
                    <Cloud className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
                    <h1 className="text-3xl font-bold text-white mb-4">DecisionNode Cloud Sync</h1>
                    <p className="text-zinc-400 mb-8">
                        Sync your local decisions to the cloud, access them anywhere,
                        and let AI search them with semantic embeddings.
                    </p>
                    <Link to="/pricing" className="btn-primary inline-flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        Upgrade to Pro
                    </Link>
                </div>
            </div>
        );
    }

    const selectedProjectData = projects.find(p => p.name === selectedProject);
    const filteredDecisions = selectedProjectData?.decisions.filter(d =>
        d.decision.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.scope.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const totalDecisions = projects.reduce((sum, p) => sum + p.decisions.length, 0);

    return (
        <>
            <div className="min-h-screen relative pt-24 pb-20">
                <div className="fixed inset-0 bg-grid-fade" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <Cloud className="w-8 h-8 text-primary-400" />
                                Cloud Sync
                            </h1>
                            <p className="text-zinc-400">Your synced decisions from local projects</p>
                        </div>
                        <button
                            onClick={fetchSyncedDecisions}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader className="w-8 h-8 animate-spin text-primary-400" />
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-20 bento-card">
                            <Cloud className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
                            <h2 className="text-xl font-bold text-white mb-2">No synced decisions yet</h2>
                            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                                Use the CLI command <code className="text-primary-400">DecisionNode cloud sync</code> to
                                sync your local decisions to the cloud.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-12 gap-6">
                            {/* Projects Sidebar */}
                            <div className="col-span-3">
                                <div className="bento-card p-4">
                                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Folder className="w-4 h-4" />
                                        Projects ({projects.length})
                                    </h3>
                                    <div className="space-y-1">
                                        {projects.map(project => (
                                            <button
                                                key={project.name}
                                                onClick={() => setSelectedProject(project.name)}
                                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedProject === project.name
                                                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/10'
                                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                                    }`}
                                            >
                                                <div className="font-medium truncate">{project.name}</div>
                                                <div className="text-xs text-zinc-500">
                                                    {project.decisions.length} decisions
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="bento-card p-4 mt-4">
                                    <div className="text-3xl font-bold text-white">{totalDecisions}</div>
                                    <div className="text-sm text-zinc-500">Total synced decisions</div>
                                </div>
                            </div>

                            {/* Decisions List */}
                            <div className="col-span-9">
                                <div className="bento-card p-6">
                                    {/* Header with Search and View Toggle */}
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="text"
                                                placeholder="Search decisions..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="input w-full pl-10 focus:border-accent-500/50"
                                            />
                                        </div>
                                        <span className="text-sm text-zinc-500">
                                            {filteredDecisions.length} decisions
                                        </span>
                                        {/* View Toggle */}
                                        <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                title="List View"
                                            >
                                                <List className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setViewMode('graph')}
                                                className={`p-2 rounded-md transition-all ${viewMode === 'graph' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                title="Graph View"
                                            >
                                                <LayoutGrid className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {viewMode === 'graph' ? (
                                        <DecisionGraph
                                            key={selectedProject}
                                            decisions={filteredDecisions}
                                            projectName={selectedProject || 'Project'}
                                        />
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Group by Scope - Blue Accordions */}
                                            {Object.entries(
                                                filteredDecisions.reduce((acc: Record<string, SyncedDecision[]>, decision) => {
                                                    const scope = decision.scope || 'Unscoped';
                                                    if (!acc[scope]) acc[scope] = [];
                                                    acc[scope].push(decision);
                                                    return acc;
                                                }, {} as Record<string, SyncedDecision[]>)
                                            ).map(([scope, scopeDecisions]) => (
                                                <div key={scope} className="rounded-xl overflow-hidden border border-blue-500/30 bg-zinc-900/30">
                                                    {/* Scope Header - Blue */}
                                                    <div className="flex items-center justify-between bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                                                        <button
                                                            onClick={() => setExpandedScopes(prev => ({ ...prev, [scope]: !prev[scope] }))}
                                                            className="flex-1 px-4 py-3 flex items-center gap-3"
                                                        >
                                                            {expandedScopes[scope] ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4 text-blue-400" />}
                                                            <Folder className="w-4 h-4 text-blue-400" />
                                                            <span className="font-medium text-blue-200">{scope}</span>
                                                            <span className="text-xs text-blue-400/70">({scopeDecisions.length})</span>
                                                        </button>
                                                        <button
                                                            onClick={() => deleteScope(selectedProject!, scope, scopeDecisions.length)}
                                                            className="px-3 py-3 text-blue-400/50 hover:text-red-400 transition-colors"
                                                            title={`Delete all ${scopeDecisions.length} decisions in ${scope}`}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Scope Content - Decision IDs */}
                                                    {expandedScopes[scope] && (
                                                        <div className="border-t border-blue-500/20 p-2 space-y-2">
                                                            {scopeDecisions
                                                                .sort((a, b) => a.decision_id.localeCompare(b.decision_id))
                                                                .map(decision => (
                                                                    <div key={decision.id} className="rounded-lg overflow-hidden border border-amber-500/30 bg-zinc-900/50">
                                                                        {/* Decision ID Header - Yellow/Gold */}
                                                                        <button
                                                                            onClick={() => setExpandedDecisions(prev => ({ ...prev, [decision.id]: !prev[decision.id] }))}
                                                                            className="w-full px-4 py-2.5 flex items-center justify-between bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                {expandedDecisions[decision.id] ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
                                                                                <span className="font-mono font-bold text-amber-300">{decision.decision_id}</span>
                                                                                {decision.embedding ? (
                                                                                    <span className="px-2 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Embedded</span>
                                                                                ) : (
                                                                                    <span className="px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 rounded-full border border-red-500/20">Not Embedded</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setEditingDecision(decision); }}
                                                                                    className="p-1.5 text-zinc-500 hover:text-accent-400 transition-colors rounded"
                                                                                    title="Edit"
                                                                                >
                                                                                    <Edit className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); deleteDecision(decision.id, decision.decision_id); }}
                                                                                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded"
                                                                                    title="Delete"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        </button>

                                                                        {/* Decision Details */}
                                                                        {expandedDecisions[decision.id] && (
                                                                            <div className="border-t border-amber-500/20 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                                                {/* Decision */}
                                                                                <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                                                                                    <div className="flex items-center gap-2 text-accent-400 mb-2">
                                                                                        <GitBranch className="w-3.5 h-3.5" />
                                                                                        <h4 className="text-[10px] font-bold uppercase tracking-wider">Decision</h4>
                                                                                    </div>
                                                                                    <p className="text-white text-sm leading-relaxed">{decision.decision}</p>
                                                                                </div>

                                                                                {/* Rationale & Constraints Grid */}
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                    <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                                                                                        <div className="flex items-center gap-2 text-purple-400 mb-2">
                                                                                            <Brain className="w-3.5 h-3.5" />
                                                                                            <h4 className="text-[10px] font-bold uppercase tracking-wider">Rationale</h4>
                                                                                        </div>
                                                                                        <p className="text-zinc-400 text-sm leading-relaxed">
                                                                                            {decision.rationale || <span className="text-zinc-600 italic">No rationale provided.</span>}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                                                                                        <div className="flex items-center gap-2 text-red-400 mb-2">
                                                                                            <Shield className="w-3.5 h-3.5" />
                                                                                            <h4 className="text-[10px] font-bold uppercase tracking-wider">Constraints</h4>
                                                                                        </div>
                                                                                        {decision.constraints && decision.constraints.length > 0 ? (
                                                                                            <ul className="space-y-1">
                                                                                                {decision.constraints.map((c: string, i: number) => (
                                                                                                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400/40 mt-1.5 shrink-0" />
                                                                                                        {c}
                                                                                                    </li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        ) : (
                                                                                            <p className="text-zinc-600 text-sm italic">No constraints.</p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Synced Date */}
                                                                                <div className="flex items-center gap-2 text-xs text-zinc-600 pt-2 border-t border-zinc-800/50">
                                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                                    <span>Synced {new Date(decision.synced_at).toLocaleString()}</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Decision Modal */}
            {editingDecision && (
                <EditDecisionModal
                    decision={editingDecision}
                    onClose={() => setEditingDecision(null)}
                    onSave={() => {
                        fetchSyncedDecisions();
                        setEditingDecision(null);
                    }}
                />
            )}

            {/* Delete Scope Confirmation Modal */}
            {pendingScopeDelete && (
                <ConfirmationModal
                    title={`Delete Scope "${pendingScopeDelete.scopeName}"?`}
                    message={`Are you sure you want to delete this scope and all ${pendingScopeDelete.count} decisions within it? This action cannot be undone.`}
                    confirmText="Delete Scope"
                    variant="danger"
                    onConfirm={handleConfirmDeleteScope}
                    onCancel={() => setPendingScopeDelete(null)}
                />
            )}

            {/* Delete Decision Confirmation Modal */}
            {pendingDecisionDelete && (
                <ConfirmationModal
                    title={`Delete Decision ${pendingDecisionDelete.decisionId}?`}
                    message="Are you sure you want to delete this synced decision? This will only remove it from the cloud. To remove it locally, use the CLI."
                    confirmText="Delete Decision"
                    variant="danger"
                    onConfirm={handleConfirmDeleteDecision}
                    onCancel={() => setPendingDecisionDelete(null)}
                />
            )}
        </>
    );
}
