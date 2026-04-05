/**
 * DecisionNode v0 - The atomic unit of decision tracking
 * 
 * This is our Data Model
 * 
 * This is NOT documentation, note-taking, or chat history.
 * This IS a structured, queryable, enforceable memory layer.
 */

export type DecisionScope = string;

export type DecisionStatus = "active" | "deprecated";

export interface DecisionNode {
    /** Unique identifier for this decision */
    id: string;

    /** Domain this decision applies to */
    scope: DecisionScope;

    /** What was decided (1 sentence, clear and actionable) */
    decision: string;

    /** Why this decision was made (short, optional but encouraged) */
    rationale?: string;

    /** Things that must hold true - constraints and rules */
    constraints?: string[];

    /** Current status of this decision */
    status: DecisionStatus;

    /** When this decision was created (ISO 8601 format) */
    createdAt: string;

    /** Optional: When this decision was last updated */
    updatedAt?: string;

    /** Arbitrary tags for organization */
    tags?: string[];
}

/**
 * Collection of decisions for a specific scope
 */
export interface DecisionCollection {
    scope: DecisionScope;
    decisions: DecisionNode[];
}

/**
 * Represents a decision synced to the cloud database
 */
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

/**
 * Represents a group of decisions belonging to a project
 */
export interface ProjectGroup {
    name: string;
    decisions: SyncedDecision[];
    lastSynced: string;
}
