import { describe, it, expect } from 'vitest';
import { _cosineSimilarity } from '../../src/ai/rag.js';

describe('search logic', () => {
    // Test the core search behavior: scoring and ranking
    // We test cosineSimilarity directly since findRelevantDecisions
    // requires full mocking of file I/O + embeddings

    it('ranks more similar vectors higher', () => {
        const query = [1, 0, 0, 0];
        const closeMatch = [0.9, 0.1, 0, 0];
        const farMatch = [0.1, 0.9, 0, 0];

        const closeScore = _cosineSimilarity(query, closeMatch);
        const farScore = _cosineSimilarity(query, farMatch);

        expect(closeScore).toBeGreaterThan(farScore);
    });

    it('scores above 0.75 threshold for very similar vectors', () => {
        const a = [1, 0.5, 0.2, 0.1];
        const b = [0.95, 0.55, 0.18, 0.12];

        const score = _cosineSimilarity(a, b);
        expect(score).toBeGreaterThan(0.75);
    });

    it('scores below 0.75 threshold for dissimilar vectors', () => {
        const a = [1, 0, 0, 0];
        const b = [0, 0, 1, 0];

        const score = _cosineSimilarity(a, b);
        expect(score).toBeLessThan(0.75);
    });

    it('handles high-dimensional vectors', () => {
        // Simulate realistic embedding dimensions
        const dim = 100;
        const a = Array.from({ length: dim }, (_, i) => Math.sin(i));
        const b = Array.from({ length: dim }, (_, i) => Math.sin(i + 0.1));

        const score = _cosineSimilarity(a, b);
        expect(score).toBeGreaterThan(0.9); // Very similar with small offset
        expect(score).toBeLessThanOrEqual(1.0);
    });
});
