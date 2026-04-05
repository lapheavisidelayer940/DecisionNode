
import { useMemo, useState, useEffect } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType, Node, Edge, ControlButton } from '@xyflow/react';
import dagre from 'dagre';
import { X, Brain, Shield, Calendar, GitBranch, RotateCcw, Edit } from 'lucide-react';
import EditDecisionModal from './EditDecisionModal';
import { SyncedDecision } from '../types';

import '@xyflow/react/dist/style.css';

interface DecisionGraphProps {
    decisions: SyncedDecision[];
    projectName: string;
}

const nodeHeight = 60; // Slightly shorter for tighter layout

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: 'LR' }); // Left to Right layout

    nodes.forEach((node) => {
        // Dynamic width based on type
        const w = node.id.startsWith('root') || node.id.startsWith('scope') ? 180 : 140;
        dagreGraph.setNode(node.id, { width: w, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const w = node.id.startsWith('root') || node.id.startsWith('scope') ? 180 : 140;
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - w / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

export default function DecisionGraph({ decisions, projectName }: DecisionGraphProps) {
    const [selectedNode, setSelectedNode] = useState<SyncedDecision | null>(null);
    const [editingDecision, setEditingDecision] = useState<SyncedDecision | null>(null);
    const storageKey = `decision-graph-layout-${projectName}`;

    const { initialNodes, initialEdges } = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // 1. Root Node (Project)
        const rootId = 'root';
        nodes.push({
            id: rootId,
            data: { label: projectName },
            position: { x: 0, y: 0 },
            style: {
                background: '#3b82f6', // blue-500
                color: '#ffffff',      // white
                border: '1px solid #2563eb', // blue-600
                width: 180,
                fontWeight: 'bold',
                borderRadius: '12px',
                padding: '10px',
                textAlign: 'center',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }
        });

        // 2. Scope Nodes
        const scopes = Array.from(new Set(decisions.map(d => d.scope)));

        scopes.forEach(scope => {
            const scopeId = `scope-${scope}`;
            nodes.push({
                id: scopeId,
                data: { label: scope },
                position: { x: 0, y: 0 },
                style: {
                    background: '#18181b', // zinc-900
                    color: '#bfdbfe',      // blue-200
                    border: '1px solid #3b82f6', // blue-500
                    width: 150,
                    borderRadius: '12px',
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: 500
                }
            });

            edges.push({
                id: `${rootId}-${scopeId}`,
                source: rootId,
                target: scopeId,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 }
            });

            // 3. Decision Nodes
            const scopeDecisions = decisions.filter(d => d.scope === scope);
            scopeDecisions.forEach(d => {
                const decisionNodeId = d.id;
                nodes.push({
                    id: decisionNodeId,
                    data: { label: d.decision_id },
                    position: { x: 0, y: 0 },
                    style: {
                        background: '#ca8a04', // accent-600 (Darker Gold)
                        color: '#ffffff',      // White text
                        border: 'none',        // No border as per previous user manual edit
                        width: 'auto',
                        minWidth: 120,
                        fontSize: '13px',
                        fontWeight: '700',
                        borderRadius: '999px',
                        padding: '8px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 6px -1px rgba(202, 138, 4, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }
                });

                edges.push({
                    id: `${scopeId}-${decisionNodeId}`,
                    source: scopeId,
                    target: decisionNodeId,
                    type: 'default',
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#ca8a04' },
                    style: { stroke: '#ca8a04', opacity: 0.8, strokeWidth: 1.5 }
                });
            });
        });

        return { initialNodes: nodes, initialEdges: edges };
    }, [decisions, projectName]);

    const layout = useMemo(() => getLayoutedElements(initialNodes, initialEdges), [initialNodes, initialEdges]);

    // We use standard ReactFlow state
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Initialize graph (Load from Storage or Calculate Layout)
    useEffect(() => {
        const savedLayout = localStorage.getItem(storageKey);

        if (savedLayout) {
            try {
                const savedNodes = JSON.parse(savedLayout);
                // Merge saved positions with current data
                // We map over the CALCULATED layout to ensure we have all current nodes
                // but use positions from storage if they exist
                const mergedNodes = layout.nodes.map(node => {
                    const savedNode = savedNodes.find((n: any) => n.id === node.id);
                    if (savedNode) {
                        return { ...node, position: savedNode.position };
                    }
                    return node;
                });

                setNodes(mergedNodes);
                setEdges(layout.edges);
            } catch (e) {
                console.error("Failed to load layout", e);
                setNodes(layout.nodes);
                setEdges(layout.edges);
            }
        } else {
            // No saved layout, use calculated
            setNodes(layout.nodes);
            setEdges(layout.edges);
        }
    }, [layout, setNodes, setEdges, storageKey]);

    // Save to LocalStorage on Change (Debounced slightly by nature of React state, or raw effect)
    // For simplicity/performance in this scale, we can save on changes directly or in a separate effect
    // To avoid too many writes, we only save when nodes actually change position relevantly
    // But simplified:
    useEffect(() => {
        if (nodes.length > 0) {
            // Only save the ID and Position to save space and avoid stale data conflicts
            const nodesToSave = nodes.map(n => ({ id: n.id, position: n.position }));
            localStorage.setItem(storageKey, JSON.stringify(nodesToSave));
        }
    }, [nodes, storageKey]);

    const onNodeClick = (_: any, node: Node) => {
        // Find the decision object corresponding to the clicked node
        const decision = decisions.find(d => d.id === node.id);
        if (decision) {
            setSelectedNode(decision);
        }
    };

    return (
        <div style={{ height: '600px', width: '100%', border: '1px solid #27272a', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            {/* Fix React Flow Attribution and Controls Visibility */}
            <style>
                {`
                    .react-flow__attribution {
                        background: rgba(39, 39, 42, 0.9) !important;
                        padding: 4px 8px !important;
                        border-radius: 6px !important;
                    }
                    .react-flow__attribution a {
                        color: #a1a1aa !important;
                    }
                    .react-flow__controls {
                        background: #18181b !important;
                        border: 1px solid #27272a !important;
                        border-radius: 8px !important;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
                    }
                    .react-flow__controls-button {
                        background: #18181b !important;
                        border: none !important;
                        border-bottom: 1px solid #27272a !important;
                        width: 32px !important;
                        height: 32px !important;
                        padding: 6px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        color: #a1a1aa !important;
                    }
                    .react-flow__controls-button:last-child {
                        border-bottom: none !important;
                    }
                    .react-flow__controls-button:hover {
                        background: #27272a !important;
                        color: #ffffff !important;
                    }
                    /* Default React Flow icons (+, -, FitView) use fill */
                    .react-flow__controls-button svg {
                        fill: currentColor !important;
                        stroke: none !important;
                        width: 14px !important;
                        height: 14px !important;
                        max-width: none !important;
                        max-height: none !important;
                    }
                    /* Our Custom Reset Icon (RotateCcw) uses stroke, no fill */
                    .react-flow__controls-button:last-child svg {
                        fill: none !important;
                        stroke: currentColor !important;
                        stroke-width: 2px !important;
                        width: 16px !important;
                        height: 16px !important;
                    }
                    .react-flow__controls-button path {
                        fill: currentColor !important;
                    }
                    /* Reset icon path should not have fill */
                    .react-flow__controls-button:last-child path {
                        fill: none !important;
                    }
                `}
            </style>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                attributionPosition="bottom-right"
            >
                <Background color="#27272a" gap={16} />
                <Controls showInteractive={false}>
                    <ControlButton onClick={() => {
                        localStorage.removeItem(storageKey); // Clear saved
                        setNodes(layout.nodes); // Reset to auto
                        setEdges(layout.edges);
                    }} title="Reset Layout">
                        <RotateCcw />
                    </ControlButton>
                </Controls>
            </ReactFlow>

            {/* Decision Detail Modal */}
            {selectedNode && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200 ring-1 ring-white/10">

                        {/* Header Decoration */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-accent-500 to-blue-500 opacity-50" />

                        <button
                            onClick={() => setSelectedNode(null)}
                            className="absolute right-4 top-5 text-zinc-500 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-full z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-6 md:p-8 space-y-6">

                            <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent-500/10 text-accent-400 rounded-full text-xs font-medium border border-accent-500/20">
                                    <GitBranch className="w-3.5 h-3.5" />
                                    {selectedNode.decision_id}
                                </span>
                                {selectedNode.status === 'active' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium border border-green-500/20 shadow-[0_0_10px_-4px_rgba(74,222,128,0.5)]">
                                        Embedded
                                    </span>
                                )}
                            </div>

                            {/* Main Title */}
                            <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50 max-h-40 overflow-y-auto">
                                <div className="flex items-center gap-2 text-accent-400 mb-2">
                                    <GitBranch className="w-3.5 h-3.5" />
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider">Decision</h4>
                                </div>
                                <h3 className="text-xl font-bold text-white leading-snug">
                                    {selectedNode.decision}
                                </h3>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Rationale Column */}
                                <div className="flex-1 min-w-[300px]">
                                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50 h-full max-h-40 overflow-y-auto">
                                        <div className="flex items-center gap-2 text-purple-400 mb-2">
                                            <Brain className="w-3.5 h-3.5" />
                                            <h4 className="text-[10px] font-bold uppercase tracking-wider">Rationale</h4>
                                        </div>
                                        {selectedNode.rationale ? (
                                            <p className="text-zinc-300 text-sm leading-relaxed">
                                                {selectedNode.rationale}
                                            </p>
                                        ) : (
                                            <p className="text-zinc-600 text-sm italic">No rationale provided.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Constraints Column */}
                                <div className="flex-1 min-w-[300px]">
                                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50 h-full max-h-40 overflow-y-auto">
                                        <div className="flex items-center gap-2 text-red-400 mb-2">
                                            <Shield className="w-3.5 h-3.5" />
                                            <h4 className="text-[10px] font-bold uppercase tracking-wider">Constraints</h4>
                                        </div>
                                        {selectedNode.constraints && selectedNode.constraints.length > 0 ? (
                                            <ul className="space-y-2">
                                                {selectedNode.constraints.map((constraint, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400/40 mt-1.5 shrink-0" />
                                                        <span>{constraint}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-zinc-600 text-sm italic">No explicit constraints.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-zinc-800/50 flex items-center justify-between bg-zinc-950/30">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Synced {new Date(selectedNode.synced_at).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setEditingDecision(selectedNode);
                                        setSelectedNode(null);
                                    }}
                                    className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-black text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors border border-zinc-700 shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Decision Modal */}
            {editingDecision && (
                <EditDecisionModal
                    decision={editingDecision}
                    onClose={() => setEditingDecision(null)}
                    onSave={(updated) => {
                        // Update local state if needed - in real app would refetch
                        console.log('Decision updated:', updated);
                        setEditingDecision(null);
                    }}
                />
            )}
        </div>
    );
}
