import { describe, it, expect } from 'vitest';
import { isGlobalId, stripGlobalPrefix, getSearchThreshold, setSearchThreshold } from '../../src/env.js';

describe('isGlobalId', () => {
    it('returns true for global: prefixed IDs', () => {
        expect(isGlobalId('global:ui-001')).toBe(true);
        expect(isGlobalId('global:security-003')).toBe(true);
    });

    it('returns false for regular IDs', () => {
        expect(isGlobalId('ui-001')).toBe(false);
        expect(isGlobalId('backend-002')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isGlobalId('')).toBe(false);
    });
});

describe('stripGlobalPrefix', () => {
    it('strips global: prefix', () => {
        expect(stripGlobalPrefix('global:ui-001')).toBe('ui-001');
        expect(stripGlobalPrefix('global:security-003')).toBe('security-003');
    });

    it('returns unchanged if no prefix', () => {
        expect(stripGlobalPrefix('ui-001')).toBe('ui-001');
        expect(stripGlobalPrefix('backend-002')).toBe('backend-002');
    });

    it('only strips first occurrence', () => {
        expect(stripGlobalPrefix('global:global:ui-001')).toBe('global:ui-001');
    });
});

describe('getSearchThreshold', () => {
    it('returns a number between 0 and 1', () => {
        const threshold = getSearchThreshold();
        expect(threshold).toBeGreaterThanOrEqual(0);
        expect(threshold).toBeLessThanOrEqual(1);
    });
});

describe('setSearchThreshold', () => {
    it('rejects values below 0', () => {
        expect(() => setSearchThreshold(-0.1)).toThrow('between 0.0 and 1.0');
    });

    it('rejects values above 1', () => {
        expect(() => setSearchThreshold(1.5)).toThrow('between 0.0 and 1.0');
    });

    it('accepts valid values', () => {
        expect(() => setSearchThreshold(0.5)).not.toThrow();
        expect(() => setSearchThreshold(0)).not.toThrow();
        expect(() => setSearchThreshold(1)).not.toThrow();
    });
});
