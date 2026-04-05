import { describe, it, expect } from 'vitest';
import { _cosineSimilarity, _getDecisionText, _getVectorFromEntry } from '../../src/ai/rag.js';

describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
        const vec = [1, 2, 3, 4, 5];
        expect(_cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
    });

    it('returns 0 for orthogonal vectors', () => {
        const a = [1, 0, 0];
        const b = [0, 1, 0];
        expect(_cosineSimilarity(a, b)).toBeCloseTo(0.0);
    });

    it('returns -1 for opposite vectors', () => {
        const a = [1, 2, 3];
        const b = [-1, -2, -3];
        expect(_cosineSimilarity(a, b)).toBeCloseTo(-1.0);
    });

    it('returns correct value for known pair', () => {
        const a = [1, 0];
        const b = [1, 1];
        // cos(45°) = 1/√2 ≈ 0.7071
        expect(_cosineSimilarity(a, b)).toBeCloseTo(0.7071, 3);
    });
});

describe('getDecisionText', () => {
    it('includes all fields', () => {
        const decision = {
            id: 'ui-001',
            scope: 'UI',
            decision: 'Use Tailwind',
            status: 'active' as const,
            rationale: 'Consistent tokens',
            constraints: ['No arbitrary values', 'Use @apply sparingly'],
            createdAt: '2024-01-01T00:00:00Z',
        };
        const text = _getDecisionText(decision);
        expect(text).toContain('UI: Use Tailwind.');
        expect(text).toContain('Consistent tokens');
        expect(text).toContain('No arbitrary values');
        expect(text).toContain('Use @apply sparingly');
    });

    it('handles missing rationale and constraints', () => {
        const decision = {
            id: 'ui-002',
            scope: 'UI',
            decision: 'Use dark theme',
            status: 'active' as const,
            createdAt: '2024-01-01T00:00:00Z',
        };
        const text = _getDecisionText(decision);
        expect(text).toContain('UI: Use dark theme.');
        // Should not throw
    });
});

describe('getVectorFromEntry', () => {
    it('handles legacy format (raw number array)', () => {
        const legacy = [0.1, 0.2, 0.3];
        expect(_getVectorFromEntry(legacy)).toEqual([0.1, 0.2, 0.3]);
    });

    it('handles new format (object with vector and embeddedAt)', () => {
        const entry = { vector: [0.4, 0.5, 0.6], embeddedAt: '2024-01-01T00:00:00Z' };
        expect(_getVectorFromEntry(entry)).toEqual([0.4, 0.5, 0.6]);
    });
});
