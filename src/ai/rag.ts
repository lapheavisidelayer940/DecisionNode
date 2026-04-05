import fs from 'fs/promises';
import path from 'path';
import { DecisionNode } from '../types.js';
import { listDecisions, listGlobalDecisions } from '../store.js';
import { getEmbedding } from './gemini.js';
import { getProjectRoot, ensureProjectFolder, getGlobalDecisionsPath, ensureGlobalFolder } from '../env.js';

// getProjectRoot() returns ~/.decisionnode/.decisions/{projectname}/
const VECTORS_FILE = () => path.join(getProjectRoot(), 'vectors.json');

// New format stores embeddedAt timestamp for change detection
interface VectorEntry {
    vector: number[];
    embeddedAt: string;
}
type VectorCache = Record<string, VectorEntry | number[]>; // number[] for legacy compatibility

interface ScoredDecision {
    decision: DecisionNode;
    score: number;
}

/**
 * Load the vector cache from disk
 */
export async function loadVectorCache(): Promise<VectorCache> {
    try {
        const content = await fs.readFile(VECTORS_FILE(), 'utf-8');
        return JSON.parse(content) as VectorCache;
    } catch {
        return {};
    }
}

/**
 * Save the vector cache to disk
 */
export async function saveVectorCache(cache: VectorCache): Promise<void> {
    ensureProjectFolder();
    await fs.writeFile(VECTORS_FILE(), JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Get the vector from a cache entry (handles both legacy and new format)
 */
function getVectorFromEntry(entry: VectorEntry | number[]): number[] {
    if (Array.isArray(entry)) return entry;
    return entry.vector;
}

// Global vectors file path
const GLOBAL_VECTORS_FILE = () => path.join(getGlobalDecisionsPath(), 'vectors.json');

/**
 * Load the global vector cache from disk
 */
export async function loadGlobalVectorCache(): Promise<VectorCache> {
    try {
        const content = await fs.readFile(GLOBAL_VECTORS_FILE(), 'utf-8');
        return JSON.parse(content) as VectorCache;
    } catch {
        return {};
    }
}

/**
 * Save the global vector cache to disk
 */
export async function saveGlobalVectorCache(cache: VectorCache): Promise<void> {
    ensureGlobalFolder();
    await fs.writeFile(GLOBAL_VECTORS_FILE(), JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Embed a single global decision
 * Throws on failure so callers can report embedding status.
 */
export async function embedGlobalDecision(decision: DecisionNode): Promise<void> {
    const cache = await loadGlobalVectorCache();
    const text = getDecisionText(decision);
    const embedding = await getEmbedding(text);
    cache[decision.id] = {
        vector: embedding,
        embeddedAt: new Date().toISOString()
    };
    await saveGlobalVectorCache(cache);
}

/**
 * Clear the embedding for a deleted global decision
 */
export async function clearGlobalEmbedding(decisionId: string): Promise<void> {
    try {
        const cache = await loadGlobalVectorCache();
        delete cache[decisionId];
        await saveGlobalVectorCache(cache);
    } catch {
        // Silently fail
    }
}

/**
 * Generate the text representation of a decision for embedding
 */
function getDecisionText(decision: DecisionNode): string {
    return `${decision.scope}: ${decision.decision}. ${decision.rationale || ''} ${decision.constraints?.join(' ') || ''}`;
}

/**
 * Calculate Cosine Similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Embed a single decision immediately.
 * Called automatically when decisions are added or updated.
 * Throws on failure so callers can report embedding status.
 */
export async function embedDecision(decision: DecisionNode): Promise<void> {
    const cache = await loadVectorCache();
    const text = getDecisionText(decision);
    const embedding = await getEmbedding(text);
    cache[decision.id] = {
        vector: embedding,
        embeddedAt: new Date().toISOString()
    };
    await saveVectorCache(cache);
}

/**
 * Clear the embedding for a deleted decision
 */
export async function clearEmbedding(decisionId: string): Promise<void> {
    try {
        const cache = await loadVectorCache();
        delete cache[decisionId];
        await saveVectorCache(cache);
    } catch {
        // Silently fail
    }
}

/**
 * Update embedding for a renamed decision ID
 */
export async function renameEmbedding(oldId: string, newId: string): Promise<void> {
    try {
        const cache = await loadVectorCache();
        if (cache[oldId]) {
            cache[newId] = cache[oldId];
            delete cache[oldId];
            await saveVectorCache(cache);
        }
    } catch {
        // Silently fail
    }
}

/**
 * Batch embed multiple decisions (used for import)
 */
export async function embedDecisions(decisions: DecisionNode[]): Promise<{ success: number; failed: number }> {
    const cache = await loadVectorCache();
    let success = 0;
    let failed = 0;

    for (const decision of decisions) {
        try {
            // Rate limit protection
            await new Promise(r => setTimeout(r, 500));
            const text = getDecisionText(decision);
            const embedding = await getEmbedding(text);
            cache[decision.id] = {
                vector: embedding,
                embeddedAt: new Date().toISOString()
            };
            success++;
        } catch {
            failed++;
        }
    }

    await saveVectorCache(cache);
    return { success, failed };
}

/**
 * Find the most relevant decisions for a given query
 * Automatically includes global decisions in results
 */
export async function findRelevantDecisions(query: string, limit: number = 3): Promise<ScoredDecision[]> {
    const cache = await loadVectorCache();
    const globalCache = await loadGlobalVectorCache();

    const queryEmbedding = await getEmbedding(query);

    // Project decisions
    const allDecisions = await listDecisions();
    const activeDecisions = allDecisions.filter(d => d.status === 'active');

    // Global decisions (already prefixed with "global:")
    const globalDecisions = await listGlobalDecisions();
    const activeGlobalDecisions = globalDecisions.filter(d => d.status === 'active');

    const scores: ScoredDecision[] = [];

    // Score project decisions
    for (const decision of activeDecisions) {
        if (cache[decision.id]) {
            const score = cosineSimilarity(queryEmbedding, getVectorFromEntry(cache[decision.id]));
            scores.push({ decision, score });
        }
    }

    // Score global decisions (stored without prefix in cache)
    for (const decision of activeGlobalDecisions) {
        const rawId = decision.id.replace(/^global:/, '');
        if (globalCache[rawId]) {
            const score = cosineSimilarity(queryEmbedding, getVectorFromEntry(globalCache[rawId]));
            scores.push({ decision, score });
        }
    }

    return scores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Get decisions that are missing embeddings
 */
export async function getUnembeddedDecisions(): Promise<DecisionNode[]> {
    const cache = await loadVectorCache();
    const allDecisions = await listDecisions();

    return allDecisions.filter(d => !cache[d.id]);
}

/**
 * Embed all unembedded decisions
 * Returns list of embedded decision IDs
 */
export async function embedAllDecisions(): Promise<{ embedded: string[]; failed: string[] }> {
    const unembedded = await getUnembeddedDecisions();
    const embedded: string[] = [];
    const failed: string[] = [];

    if (unembedded.length === 0) {
        return { embedded, failed };
    }

    const cache = await loadVectorCache();

    for (const decision of unembedded) {
        try {
            await new Promise(r => setTimeout(r, 500));
            const text = getDecisionText(decision);
            const embedding = await getEmbedding(text);
            cache[decision.id] = {
                vector: embedding,
                embeddedAt: new Date().toISOString()
            };
            embedded.push(decision.id);
        } catch {
            failed.push(decision.id);
        }
    }

    if (embedded.length > 0) {
        await saveVectorCache(cache);
    }

    return { embedded, failed };
}

// Exported for testing
export { cosineSimilarity as _cosineSimilarity, getDecisionText as _getDecisionText, getVectorFromEntry as _getVectorFromEntry };

/**
 * Find potential conflicts with existing decisions
 * Uses semantic similarity to find decisions that might contradict a new one
 */
export async function findPotentialConflicts(
    newDecisionText: string,
    threshold: number = 0.75
): Promise<ScoredDecision[]> {
    try {
        const cache = await loadVectorCache();
        if (Object.keys(cache).length === 0) return [];

        const newEmbedding = await getEmbedding(newDecisionText);
        const allDecisions = await listDecisions();
        const activeDecisions = allDecisions.filter(d => d.status === 'active');

        const conflicts: ScoredDecision[] = [];

        for (const decision of activeDecisions) {
            if (cache[decision.id]) {
                const score = cosineSimilarity(newEmbedding, getVectorFromEntry(cache[decision.id]));
                if (score >= threshold) {
                    conflicts.push({ decision, score });
                }
            }
        }

        return conflicts.sort((a, b) => b.score - a.score);
    } catch {
        return []; // API key not set or other error
    }
}
