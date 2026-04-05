import { describe, it, expect } from 'vitest';
import { normalizeScope } from '../../src/store.js';

describe('normalizeScope', () => {
    it('capitalizes first letter of lowercase input', () => {
        expect(normalizeScope('ui')).toBe('Ui');
        expect(normalizeScope('backend')).toBe('Backend');
        expect(normalizeScope('security')).toBe('Security');
    });

    it('lowercases everything except first letter', () => {
        expect(normalizeScope('UI')).toBe('Ui');
        expect(normalizeScope('BACKEND')).toBe('Backend');
        expect(normalizeScope('API')).toBe('Api');
    });

    it('handles mixed case', () => {
        expect(normalizeScope('uI')).toBe('Ui');
        expect(normalizeScope('BackEnd')).toBe('Backend');
    });

    it('handles single character', () => {
        expect(normalizeScope('a')).toBe('A');
        expect(normalizeScope('Z')).toBe('Z');
    });
});
