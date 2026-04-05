import { describe, it, expect } from 'vitest';
import { isGlobalId, stripGlobalPrefix } from '../../src/env.js';

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
