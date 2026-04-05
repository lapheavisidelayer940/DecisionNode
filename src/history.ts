import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { DecisionCollection, DecisionNode } from './types.js';
import { loadDecisions } from './store.js';
import { getProjectRoot, ensureProjectFolder } from './env.js';

const HISTORY_DIR = 'history';
const LOG_FILE = path.join(HISTORY_DIR, 'activity.json');

export type ActionType = 'added' | 'updated' | 'deleted' | 'imported' | 'installed' | 'cloud_push' | 'cloud_pull' | 'conflict_resolved';
export type SourceType = 'cli' | 'mcp' | 'cloud' | 'marketplace';

export interface ActivityLogEntry {
    id: string;
    action: ActionType;
    decisionId: string;
    description: string;
    timestamp: string;
    source?: SourceType;
    snapshot: Record<string, DecisionCollection>;
}

interface ActivityLog {
    entries: ActivityLogEntry[];
}

/**
 * Generate a short hash for entry ID
 */
function generateEntryId(): string {
    return crypto.randomBytes(4).toString('hex');
}

/**
 * Get the log file path
 */
function getLogPath(): string {
    return path.join(getProjectRoot(), LOG_FILE);
}

/**
 * Ensure history directory exists
 */
async function ensureHistoryDir(): Promise<void> {
    await fs.mkdir(path.join(getProjectRoot(), HISTORY_DIR), { recursive: true });
}

/**
 * Load the activity log
 */
async function loadActivityLog(): Promise<ActivityLog> {
    try {
        const content = await fs.readFile(getLogPath(), 'utf-8');
        return JSON.parse(content) as ActivityLog;
    } catch {
        return { entries: [] };
    }
}

/**
 * Save the activity log
 */
async function saveActivityLog(log: ActivityLog): Promise<void> {
    ensureProjectFolder();
    await ensureHistoryDir();
    await fs.writeFile(getLogPath(), JSON.stringify(log, null, 2), 'utf-8');
}

/**
 * Get all available scopes by scanning the .decisions directory
 */
async function getAvailableScopes(): Promise<string[]> {
    try {
        const files = await fs.readdir(getProjectRoot());
        return files
            .filter(f => f.endsWith('.json') && f !== 'vectors.json')
            .map(f => f.replace('.json', ''))
            .map(s => s.charAt(0).toUpperCase() + s.slice(1));
    } catch {
        return [];
    }
}

/**
 * Take a snapshot of current decisions
 */
async function takeSnapshot(): Promise<Record<string, DecisionCollection>> {
    const scopes = await getAvailableScopes();
    const snapshot: Record<string, DecisionCollection> = {};

    for (const scope of scopes) {
        const collection = await loadDecisions(scope);
        snapshot[scope.toLowerCase()] = collection;
    }

    return snapshot;
}

/**
 * Log an action to the activity log
 * This captures the current state as a snapshot
 */
export async function logAction(
    action: ActionType,
    decisionId: string,
    description?: string,
    source?: SourceType
): Promise<void> {
    const log = await loadActivityLog();
    const snapshot = await takeSnapshot();

    const entry: ActivityLogEntry = {
        id: generateEntryId(),
        action,
        decisionId,
        description: description || `${action} ${decisionId}`,
        timestamp: new Date().toISOString(),
        source: source || 'cli',
        snapshot
    };

    // Add to beginning (newest first)
    log.entries.unshift(entry);

    // Keep last 100 entries to prevent unbounded growth
    if (log.entries.length > 100) {
        log.entries = log.entries.slice(0, 100);
    }

    await saveActivityLog(log);
}

/**
 * Log a batch action (for multiple decisions at once, like cloud sync)
 * Uses a single entry with a summarized description
 */
export async function logBatchAction(
    action: ActionType,
    decisionIds: string[],
    source: SourceType = 'cloud'
): Promise<void> {
    if (decisionIds.length === 0) return;

    const log = await loadActivityLog();
    const snapshot = await takeSnapshot();

    // Create summarized description
    let description: string;
    const actionVerb = action === 'cloud_push' ? 'Pushed' : action === 'cloud_pull' ? 'Pulled' : action;

    if (decisionIds.length === 1) {
        description = `${actionVerb} ${decisionIds[0]}`;
    } else if (decisionIds.length <= 3) {
        description = `${actionVerb} ${decisionIds.length} decisions (${decisionIds.join(', ')})`;
    } else {
        const shown = decisionIds.slice(0, 3).join(', ');
        description = `${actionVerb} ${decisionIds.length} decisions (${shown}... +${decisionIds.length - 3} more)`;
    }

    const entry: ActivityLogEntry = {
        id: generateEntryId(),
        action,
        decisionId: decisionIds.join(','), // Store all IDs
        description,
        timestamp: new Date().toISOString(),
        source,
        snapshot
    };

    log.entries.unshift(entry);

    if (log.entries.length > 100) {
        log.entries = log.entries.slice(0, 100);
    }

    await saveActivityLog(log);
}

/**
 * Get recent activity log entries
 */
export async function getHistory(limit: number = 20): Promise<ActivityLogEntry[]> {
    const log = await loadActivityLog();
    return log.entries.slice(0, limit);
}

/**
 * Get a specific snapshot by entry ID
 */
export async function getSnapshot(entryId: string): Promise<ActivityLogEntry | null> {
    const log = await loadActivityLog();
    return log.entries.find(e => e.id === entryId) || null;
}

/**
 * Get all decisions from a snapshot
 */
export function getDecisionsFromSnapshot(snapshot: Record<string, DecisionCollection>): DecisionNode[] {
    const decisions: DecisionNode[] = [];
    for (const scope of Object.keys(snapshot)) {
        if (snapshot[scope].decisions && Array.isArray(snapshot[scope].decisions)) {
            decisions.push(...snapshot[scope].decisions);
        }
    }
    return decisions;
}
