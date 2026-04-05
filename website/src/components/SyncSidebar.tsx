import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, Box, GitCommit, Cloud } from 'lucide-react';
import { ProjectGroup, SyncedDecision } from '../../../src/types';

interface SyncSidebarProps {
    projects: ProjectGroup[];
    selectedProject: string | null;
    onSelectProject: (projectName: string) => void;
    onSelectDecision: (decision: SyncedDecision) => void;
}

export default function SyncSidebar({ projects, selectedProject, onSelectProject, onSelectDecision }: SyncSidebarProps) {
    const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
    const [expandedScopes, setExpandedScopes] = useState<Record<string, boolean>>({});

    const toggleProject = (projectName: string) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectName]: !prev[projectName]
        }));
        if (projectName !== selectedProject) {
            onSelectProject(projectName);
        }
    };

    const toggleScope = (scopeId: string) => {
        setExpandedScopes(prev => ({
            ...prev,
            [scopeId]: !prev[scopeId]
        }));
    };

    // Group decisions by scope for a project
    const getScopes = (project: ProjectGroup) => {
        const scopes: Record<string, SyncedDecision[]> = {};
        project.decisions.forEach(d => {
            if (!scopes[d.scope]) scopes[d.scope] = [];
            scopes[d.scope].push(d);
        });
        return scopes;
    };

    return (
        <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cloud Explorer</span>
                <Cloud className="w-3 h-3 text-zinc-500" />
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto py-2">
                {projects.map((project) => {
                    const isExpanded = expandedProjects[project.name] || project.name === selectedProject;
                    const scopes = getScopes(project);

                    return (
                        <div key={project.name}>
                            {/* Project Item */}
                            <div
                                onClick={() => toggleProject(project.name)}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none
                                    text-sm hover:bg-zinc-900 transition-colors
                                    ${project.name === selectedProject ? 'text-white' : 'text-zinc-400'}
                                `}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <Folder className={`w-3.5 h-3.5 shrink-0 ${project.name === selectedProject ? 'text-accent-400' : 'text-zinc-500'}`} />
                                <span className="truncate font-medium">{project.name}</span>
                            </div>

                            {/* Scopes */}
                            {isExpanded && (
                                <div className="ml-2 border-l border-zinc-800/50">
                                    {Object.entries(scopes).map(([scopeName, decisions]) => {
                                        const scopeId = `${project.name}-${scopeName}`;
                                        const isScopeExpanded = expandedScopes[scopeId];

                                        return (
                                            <div key={scopeId}>
                                                <div
                                                    onClick={() => toggleScope(scopeId)}
                                                    className="flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50"
                                                >
                                                    {isScopeExpanded ? (
                                                        <ChevronDown className="w-3 h-3 shrink-0" />
                                                    ) : (
                                                        <ChevronRight className="w-3 h-3 shrink-0" />
                                                    )}
                                                    <Box className="w-3 h-3 shrink-0 text-indigo-400" />
                                                    <span className="truncate">{scopeName}</span>
                                                </div>

                                                {/* Decisions */}
                                                {isScopeExpanded && (
                                                    <div className="ml-2 border-l border-zinc-800/50">
                                                        {decisions.map(decision => (
                                                            <div
                                                                key={decision.id}
                                                                onClick={() => onSelectDecision(decision)}
                                                                className="flex items-center gap-2 px-3 py-1 cursor-pointer select-none group hover:bg-zinc-900/50"
                                                            >
                                                                <GitCommit className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
                                                                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 truncate">
                                                                    {decision.decision_id}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
