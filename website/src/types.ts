export interface SyncedDecision {
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
}

export interface ProjectGroup {
    name: string;
    decisions: SyncedDecision[];
    lastSynced: string;
}
