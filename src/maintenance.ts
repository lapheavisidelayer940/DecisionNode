import fs from 'fs/promises';
import path from 'path';
import { getProjectRoot } from './env.js';
import { listDecisions } from './store.js';
import { loadVectorCache, saveVectorCache } from './ai/rag.js';

const REVIEWED_FILE = () => path.join(getProjectRoot(), 'reviewed.json');

async function loadReviewed(): Promise<{ reviewed: string[] }> {
    try {
        const content = await fs.readFile(REVIEWED_FILE(), 'utf-8');
        return JSON.parse(content);
    } catch {
        return { reviewed: [] };
    }
}

async function saveReviewed(data: { reviewed: string[] }): Promise<void> {
    await fs.writeFile(REVIEWED_FILE(), JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Clean orphaned data (vectors and reviews) for decisions that no longer exist
 */
export async function cleanOrphanedData(): Promise<{ vectorsRemoved: number, reviewsRemoved: number }> {
    const decisions = await listDecisions();
    const validIds = new Set(decisions.map(d => d.id));

    // Clean Vectors
    const cache = await loadVectorCache();
    let vectorsRemoved = 0;

    for (const id of Object.keys(cache)) {
        if (!validIds.has(id)) {
            delete cache[id];
            vectorsRemoved++;
        }
    }

    if (vectorsRemoved > 0) {
        await saveVectorCache(cache);
    }

    // Clean Reviews
    const reviewData = await loadReviewed();
    // Use optional chaining just in case
    const currentReviews = reviewData.reviewed || [];
    const originalCount = currentReviews.length;

    const cleanReviews = currentReviews.filter(id => validIds.has(id));
    const reviewsRemoved = originalCount - cleanReviews.length;

    if (reviewsRemoved > 0) {
        reviewData.reviewed = cleanReviews;
        await saveReviewed(reviewData);
    }

    return { vectorsRemoved, reviewsRemoved };
}
