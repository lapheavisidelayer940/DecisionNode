import fs from 'fs/promises';
import path from 'path';
import { DecisionNode, DecisionCollection } from './types.js';
import { getProjectRoot, GLOBAL_STORE, GLOBAL_PROJECT_NAME, getGlobalDecisionsPath, ensureGlobalFolder, isGlobalId, stripGlobalPrefix, setCurrentProject, getCurrentProject } from './env.js';
import { embedDecision, clearEmbedding, renameEmbedding, embedDecisions, embedGlobalDecision, clearGlobalEmbedding } from './ai/rag.js';
import { logAction, SourceType } from './history.js';
import { syncDecisionsToCloud, deleteDecisionFromCloud, getAutoSyncEnabled } from './cloud.js';

// getProjectRoot() returns ~/.decisionnode/.decisions/{projectname}/
// Files go directly there: ui.json, backend.json, vectors.json, history/

/**
 * Get all available scopes by scanning the .decisions directory
 */
export async function getAvailableScopes(): Promise<string[]> {
    try {
        const files = await fs.readdir(getProjectRoot());
        return files
            .filter(f => f.endsWith('.json') && f !== 'vectors.json' && f !== 'reviewed.json' && f !== 'sync-metadata.json' && f !== 'incoming.json')
            .map(f => f.replace('.json', ''))
            .map(s => s.charAt(0).toUpperCase() + s.slice(1));
    } catch {
        return [];
    }
}

/**
 * Get all available scopes in the global decisions folder
 */
export async function getGlobalScopes(): Promise<string[]> {
    try {
        const globalPath = getGlobalDecisionsPath();
        const files = await fs.readdir(globalPath);
        return files
            .filter(f => f.endsWith('.json') && f !== 'vectors.json' && f !== 'reviewed.json' && f !== 'sync-metadata.json' && f !== 'incoming.json')
            .map(f => f.replace('.json', ''))
            .map(s => s.charAt(0).toUpperCase() + s.slice(1));
    } catch {
        return [];
    }
}

/**
 * Get the path to a decision file in the global folder
 */
function getGlobalDecisionFilePath(scope: string): string {
    const cleanScope = scope.toLowerCase()
        .replace('.json', '')
        .replace(/[\/\\]/g, '_')
        .replace(/[^a-z0-9_\-]/g, '_');

    return path.join(getGlobalDecisionsPath(), `${cleanScope}.json`);
}

/**
 * Load all decisions for a given scope from the global folder
 */
export async function loadGlobalDecisions(scope: string): Promise<DecisionCollection> {
    const filePath = getGlobalDecisionFilePath(scope);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as DecisionCollection;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { scope, decisions: [] };
        }
        throw error;
    }
}

/**
 * Save decisions for a given scope in the global folder
 */
export async function saveGlobalDecisions(collection: DecisionCollection): Promise<void> {
    const filePath = getGlobalDecisionFilePath(collection.scope);
    ensureGlobalFolder();
    await fs.writeFile(filePath, JSON.stringify(collection, null, 2), 'utf-8');
}

/**
 * List all global decisions, optionally filtered by scope
 * Returns decisions with "global:" prefix on IDs
 */
export async function listGlobalDecisions(scope?: string): Promise<DecisionNode[]> {
    const scopes = scope
        ? [scope]
        : await getGlobalScopes();

    const allDecisions: DecisionNode[] = [];

    for (const s of scopes) {
        const collection = await loadGlobalDecisions(s);
        if (collection.decisions && Array.isArray(collection.decisions)) {
            // Prefix IDs with "global:" for display
            const prefixed = collection.decisions.map(d => ({
                ...d,
                id: d.id.startsWith('global:') ? d.id : `global:${d.id}`,
            }));
            allDecisions.push(...prefixed);
        }
    }

    return allDecisions;
}

/**
 * Get a global decision by ID (with or without "global:" prefix)
 */
export async function getGlobalDecisionById(id: string): Promise<DecisionNode | null> {
    const rawId = stripGlobalPrefix(id);
    const scopes = await getGlobalScopes();

    for (const scope of scopes) {
        const collection = await loadGlobalDecisions(scope);
        const decision = collection.decisions.find(d => d.id === rawId);
        if (decision) {
            return { ...decision, id: `global:${decision.id}` };
        }
    }

    return null;
}

/**
 * Generate the next decision ID for a global scope
 * Returns ID without the "global:" prefix (prefix is added on read)
 */
export async function getNextGlobalDecisionId(scope: string): Promise<string> {
    const collection = await loadGlobalDecisions(scope);
    const prefix = scope.toLowerCase().replace(/[^a-z]/g, '').substring(0, 10);

    let maxNum = 0;
    for (const d of collection.decisions) {
        const match = d.id.match(/-([0-9]+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }

    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Add a new global decision
 */
export async function addGlobalDecision(decision: DecisionNode, source: SourceType = 'cli'): Promise<{ embedded: boolean }> {
    const normalizedDecision = { ...decision, scope: normalizeScope(decision.scope) };
    // Store without the "global:" prefix in the file
    const rawId = stripGlobalPrefix(normalizedDecision.id);
    const storedDecision = { ...normalizedDecision, id: rawId };

    const collection = await loadGlobalDecisions(normalizedDecision.scope);

    if (collection.decisions.some(d => d.id === rawId)) {
        throw new Error(`Global decision with ID ${rawId} already exists`);
    }

    collection.decisions.push(storedDecision);
    await saveGlobalDecisions(collection);

    // Auto-embed using global vectors
    let embedded = false;
    try {
        await embedGlobalDecision(storedDecision);
        embedded = true;
    } catch { }

    // Log the action
    await logAction('added', `global:${rawId}`, `Added global decision global:${rawId}`, source);

    return { embedded };
}

/**
 * Update an existing global decision
 */
export async function updateGlobalDecision(id: string, updates: Partial<DecisionNode>, source: SourceType = 'cli'): Promise<DecisionNode | null> {
    const rawId = stripGlobalPrefix(id);
    const scopes = await getGlobalScopes();

    for (const scope of scopes) {
        const collection = await loadGlobalDecisions(scope);
        const index = collection.decisions.findIndex(d => d.id === rawId);

        if (index !== -1) {
            const updated = {
                ...collection.decisions[index],
                ...updates,
                id: rawId,
                updatedAt: new Date().toISOString()
            };
            collection.decisions[index] = updated;
            await saveGlobalDecisions(collection);

            embedGlobalDecision(updated).catch(() => { });
            const desc = updates.status === 'deprecated' ? `Deprecated global:${rawId}`
                : updates.status === 'active' ? `Activated global:${rawId}`
                : `Updated global decision global:${rawId}`;
            await logAction('updated', `global:${rawId}`, desc, source);

            return { ...updated, id: `global:${rawId}` };
        }
    }

    return null;
}

/**
 * Delete a global decision
 */
export async function deleteGlobalDecision(id: string, source: SourceType = 'cli'): Promise<boolean> {
    const rawId = stripGlobalPrefix(id);
    const scopes = await getGlobalScopes();

    for (const scope of scopes) {
        const collection = await loadGlobalDecisions(scope);
        const index = collection.decisions.findIndex(d => d.id === rawId);

        if (index !== -1) {
            collection.decisions.splice(index, 1);

            if (collection.decisions.length === 0) {
                try {
                    const filePath = getGlobalDecisionFilePath(scope);
                    await fs.unlink(filePath);
                } catch { }
            } else {
                await saveGlobalDecisions(collection);
            }

            clearGlobalEmbedding(rawId).catch(() => { });
            await logAction('deleted', `global:${rawId}`, `Deleted global decision global:${rawId}`, source);

            return true;
        }
    }

    return false;
}

/**
 * Normalize scope to consistent capitalized format
 * e.g., 'ui', 'UI', 'Ui', 'uI' all become 'UI'
 * e.g., 'backend', 'Backend', 'BACKEND' all become 'Backend'
 */
export function normalizeScope(scope: string): string {
    // Convert to lowercase, then capitalize first letter
    const lower = scope.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export interface ProjectInfo {
    name: string;
    decisionCount: number;
    scopes: string[];
    lastModified?: string;
}

/**
 * List all available projects in the global store
 * Returns project name, decision count, and available scopes
 */
export async function listProjects(): Promise<ProjectInfo[]> {
    const projects: ProjectInfo[] = [];

    try {
        const dirs = await fs.readdir(GLOBAL_STORE, { withFileTypes: true });

        for (const dir of dirs) {
            if (!dir.isDirectory()) continue;
            // Skip the _global folder — it's not a project
            if (dir.name === GLOBAL_PROJECT_NAME) continue;

            const projectPath = path.join(GLOBAL_STORE, dir.name);
            const projectInfo: ProjectInfo = {
                name: dir.name,
                decisionCount: 0,
                scopes: [],
            };

            try {
                const files = await fs.readdir(projectPath);
                const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'vectors.json' && f !== 'reviewed.json' && f !== 'sync-metadata.json' && f !== 'incoming.json');

                for (const jsonFile of jsonFiles) {
                    const filePath = path.join(projectPath, jsonFile);
                    try {
                        const content = await fs.readFile(filePath, 'utf-8');
                        const collection: DecisionCollection = JSON.parse(content);
                        projectInfo.decisionCount += collection.decisions.length;
                        projectInfo.scopes.push(collection.scope);

                        // Get last modified time
                        const stat = await fs.stat(filePath);
                        if (!projectInfo.lastModified || stat.mtime.toISOString() > projectInfo.lastModified) {
                            projectInfo.lastModified = stat.mtime.toISOString();
                        }
                    } catch {
                        // Skip invalid files
                    }
                }
            } catch {
                // Skip inaccessible projects
            }

            projects.push(projectInfo);
        }
    } catch {
        // Global store doesn't exist yet
    }

    // Sort by decision count (most decisions first)
    return projects.sort((a, b) => b.decisionCount - a.decisionCount);
}

/**
 * Get the path to a decision file for a given scope
 */
function getDecisionFilePath(scope: string): string {
    const cleanScope = scope.toLowerCase()
        .replace('.json', '')
        .replace(/[\/\\]/g, '_')
        .replace(/[^a-z0-9_\-]/g, '_');

    return path.join(getProjectRoot(), `${cleanScope}.json`);
}

/**
 * Load all decisions for a given scope
 */
export async function loadDecisions(scope: string): Promise<DecisionCollection> {
    const filePath = getDecisionFilePath(scope);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as DecisionCollection;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { scope, decisions: [] };
        }
        throw error;
    }
}

/**
 * Save decisions for a given scope
 */
export async function saveDecisions(collection: DecisionCollection): Promise<void> {
    const filePath = getDecisionFilePath(collection.scope);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(collection, null, 2), 'utf-8');
}

/**
 * Get a single decision by ID across all scopes
 */
export async function getDecisionById(id: string): Promise<DecisionNode | null> {
    const scopes = await getAvailableScopes();

    for (const scope of scopes) {
        const collection = await loadDecisions(scope);
        const decision = collection.decisions.find(d => d.id === id);
        if (decision) {
            return decision;
        }
    }

    return null;
}

/**
 * List all decisions, optionally filtered by scope
 */
export async function listDecisions(scope?: string): Promise<DecisionNode[]> {
    const scopes = scope
        ? [scope]
        : await getAvailableScopes();

    const allDecisions: DecisionNode[] = [];

    for (const s of scopes) {
        const collection = await loadDecisions(s);
        if (collection.decisions && Array.isArray(collection.decisions)) {
            allDecisions.push(...collection.decisions);
        } else {
            console.warn(`⚠️  Warning: Scope '${s}' is corrupted or empty (missing 'decisions' array). Skipping.`);
        }
    }

    return allDecisions;
}

/**
 * Add a new decision
 * Auto-embeds and logs the action
 * @param decision - The decision to add
 * @param source - Where this action originated (default: 'cli')
 */
export async function addDecision(decision: DecisionNode, source: SourceType = 'cli'): Promise<{ embedded: boolean }> {
    // Normalize scope to consistent capitalization
    const normalizedDecision = { ...decision, scope: normalizeScope(decision.scope) };

    const collection = await loadDecisions(normalizedDecision.scope);

    if (collection.decisions.some(d => d.id === normalizedDecision.id)) {
        throw new Error(`Decision with ID ${normalizedDecision.id} already exists`);
    }

    collection.decisions.push(normalizedDecision);
    await saveDecisions(collection);

    // Auto-embed — await to report success/failure
    let embedded = false;
    try {
        await embedDecision(normalizedDecision);
        embedded = true;
    } catch { }

    // Auto-sync to cloud (async, non-blocking, Pro only, if enabled)
    getAutoSyncEnabled().then(enabled => {
        if (enabled) syncDecisionsToCloud(path.basename(getProjectRoot()), [normalizedDecision]).catch(() => { });
    });

    // Log the action with source
    await logAction('added', normalizedDecision.id, `Added ${normalizedDecision.id}`, source);

    return { embedded };
}

/**
 * Update an existing decision
 * Auto-embeds and logs the action
 */
export async function updateDecision(id: string, updates: Partial<DecisionNode>, source: SourceType = 'cli'): Promise<DecisionNode | null> {
    const scopes = await getAvailableScopes();

    for (const scope of scopes) {
        const collection = await loadDecisions(scope);
        const index = collection.decisions.findIndex(d => d.id === id);

        if (index !== -1) {
            const updated = {
                ...collection.decisions[index],
                ...updates,
                id,
                updatedAt: new Date().toISOString()
            };
            collection.decisions[index] = updated;
            await saveDecisions(collection);

            // Auto-embed (async, non-blocking)
            embedDecision(updated).catch(() => { });

            // Auto-sync to cloud (async, non-blocking, Pro only, if enabled)
            getAutoSyncEnabled().then(enabled => {
                if (enabled) syncDecisionsToCloud(path.basename(getProjectRoot()), [updated]).catch(() => { });
            });

            // Log the action
            const desc = updates.status === 'deprecated' ? `Deprecated ${id}`
                : updates.status === 'active' ? `Activated ${id}`
                : `Updated ${id}`;
            await logAction('updated', id, desc, source);

            return updated;
        }
    }

    return null;
}

/**
 * Delete a decision by ID
 * Clears embedding and logs the action
 */
export async function deleteDecision(id: string, source: SourceType = 'cli'): Promise<boolean> {
    const scopes = await getAvailableScopes();

    for (const scope of scopes) {
        const collection = await loadDecisions(scope);
        const index = collection.decisions.findIndex(d => d.id === id);

        if (index !== -1) {
            const deleted = collection.decisions[index];
            collection.decisions.splice(index, 1);

            if (collection.decisions.length === 0) {
                // Remove empty scope file
                try {
                    const filePath = getDecisionFilePath(scope);
                    await fs.unlink(filePath);
                } catch {
                    // Ignore delete error (e.g. file already gone)
                }
            } else {
                await saveDecisions(collection);
            }

            // Clear embedding
            clearEmbedding(id).catch(() => { });

            // Auto-delete from cloud (async, non-blocking, Pro only, if enabled)
            getAutoSyncEnabled().then(enabled => {
                if (enabled) deleteDecisionFromCloud(id).catch(() => { });
            });

            // Log the action
            await logAction('deleted', id, `Deleted ${id}`, source);

            return true;
        }
    }

    return false;
}

/**
 * Delete an entire scope (all decisions within it)
 * Deletes the scope file, embeddings, and optionally from cloud
 */
export async function deleteScope(scope: string): Promise<{ deleted: number; decisionIds: string[] }> {
    const normalizedScope = normalizeScope(scope);
    const collection = await loadDecisions(normalizedScope);

    if (!collection.decisions || collection.decisions.length === 0) {
        return { deleted: 0, decisionIds: [] };
    }

    const decisionIds = collection.decisions.map(d => d.id);
    const count = decisionIds.length;

    // Delete the scope file
    try {
        const filePath = getDecisionFilePath(normalizedScope);
        await fs.unlink(filePath);
    } catch {
        // Ignore if file doesn't exist
    }

    // Clear embeddings for all decisions
    for (const id of decisionIds) {
        clearEmbedding(id).catch(() => { });
    }

    // Auto-delete from cloud (async, non-blocking, Pro only, if enabled)
    getAutoSyncEnabled().then(enabled => {
        if (enabled) {
            for (const id of decisionIds) {
                deleteDecisionFromCloud(id).catch(() => { });
            }
        }
    });

    // Log the action
    await logAction('deleted', `scope:${normalizedScope}`, `Deleted scope ${normalizedScope} (${count} decisions)`);

    return { deleted: count, decisionIds };
}

/**
 * Generate the next decision ID for a scope
 */
export async function getNextDecisionId(scope: string): Promise<string> {
    const collection = await loadDecisions(scope);
    const prefix = scope.toLowerCase().replace(/[^a-z]/g, '').substring(0, 10);

    let maxNum = 0;
    for (const d of collection.decisions) {
        const match = d.id.match(/-([0-9]+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }

    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Renumber decisions in a scope after deletion
 * Also updates embeddings for renamed IDs
 */
export async function renumberDecisions(scope: string): Promise<string[]> {
    const collection = await loadDecisions(scope);
    const prefix = scope.toLowerCase().replace(/[^a-z]/g, '').substring(0, 10);
    const renames: string[] = [];

    const sorted = [...collection.decisions].sort((a, b) => {
        const aMatch = a.id.match(/-([0-9]+)$/);
        const bMatch = b.id.match(/-([0-9]+)$/);
        const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
        const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;
        return aNum - bNum;
    });

    for (let i = 0; i < sorted.length; i++) {
        const newId = `${prefix}-${String(i + 1).padStart(3, '0')}`;
        if (sorted[i].id !== newId) {
            const oldId = sorted[i].id;
            renames.push(`${oldId} → ${newId}`);
            sorted[i].id = newId;
            // Rename embedding
            renameEmbedding(oldId, newId).catch(() => { });
        }
    }

    if (renames.length > 0) {
        collection.decisions = sorted;
        await saveDecisions(collection);
    }

    return renames;
}

/**
 * Import decisions from a JSON file or object
 * Auto-embeds all imported decisions
 */
export async function importDecisions(
    decisions: DecisionNode[],
    options?: { overwrite?: boolean }
): Promise<{ added: number; skipped: number; embedded: number }> {
    let added = 0;
    let skipped = 0;

    const toEmbed: DecisionNode[] = [];

    for (const decision of decisions) {
        const existing = await getDecisionById(decision.id);

        if (existing && !options?.overwrite) {
            skipped++;
            continue;
        }

        if (existing && options?.overwrite) {
            await updateDecision(decision.id, decision);
        } else {
            const collection = await loadDecisions(decision.scope);
            collection.decisions.push(decision);
            await saveDecisions(collection);
        }

        toEmbed.push(decision);
        added++;
    }

    // Batch embed all imported decisions
    const { success } = await embedDecisions(toEmbed);

    // Log import action
    if (added > 0) {
        await logAction('imported', `${added}-decisions`, `Imported ${added} decisions`);
    }

    return { added, skipped, embedded: success };
}
