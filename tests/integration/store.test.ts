import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fsAsync from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';

// Use globalThis so hoisted vi.mock factories can access it
(globalThis as any).__TEST_TEMP_DIR = '';

vi.mock('../../src/env.js', () => ({
    getProjectRoot: () => (globalThis as any).__TEST_TEMP_DIR,
    ensureProjectFolder: () => {
        const dir = (globalThis as any).__TEST_TEMP_DIR;
        if (dir && !fsSync.existsSync(dir)) {
            fsSync.mkdirSync(dir, { recursive: true });
        }
    },
    getGlobalDecisionsPath: () => path.join((globalThis as any).__TEST_TEMP_DIR, '_global'),
    ensureGlobalFolder: () => {
        const globalPath = path.join((globalThis as any).__TEST_TEMP_DIR, '_global');
        if (!fsSync.existsSync(globalPath)) {
            fsSync.mkdirSync(globalPath, { recursive: true });
        }
    },
    GLOBAL_STORE: '',
    GLOBAL_PROJECT_NAME: '_global',
    isGlobalId: (id: string) => id.startsWith('global:'),
    stripGlobalPrefix: (id: string) => id.replace(/^global:/, ''),
    setCurrentProject: () => {},
    getCurrentProject: () => 'TestProject',
}));

vi.mock('../../src/ai/rag.js', () => ({
    embedDecision: vi.fn().mockResolvedValue(undefined),
    clearEmbedding: vi.fn().mockResolvedValue(undefined),
    renameEmbedding: vi.fn().mockResolvedValue(undefined),
    embedDecisions: vi.fn().mockResolvedValue({ success: 0, failed: 0 }),
    embedGlobalDecision: vi.fn().mockResolvedValue(undefined),
    clearGlobalEmbedding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/history.js', () => ({
    logAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/cloud.js', () => ({
    syncDecisionsToCloud: vi.fn().mockResolvedValue(undefined),
    deleteDecisionFromCloud: vi.fn().mockResolvedValue(undefined),
    getAutoSyncEnabled: vi.fn().mockResolvedValue(false),
}));

import {
    addDecision,
    listDecisions,
    getDecisionById,
    updateDecision,
    deleteDecision,
} from '../../src/store.js';

describe('store integration', () => {
    beforeEach(async () => {
        (globalThis as any).__TEST_TEMP_DIR = await fsAsync.mkdtemp(path.join(os.tmpdir(), 'decisionnode-test-'));
    });

    afterEach(async () => {
        const dir = (globalThis as any).__TEST_TEMP_DIR;
        if (dir) await fsAsync.rm(dir, { recursive: true, force: true });
    });

    it('adds and lists a decision', async () => {
        await addDecision({
            id: 'ui-001',
            scope: 'UI',
            decision: 'Use Tailwind',
            status: 'active',
            createdAt: new Date().toISOString(),
        });

        const decisions = await listDecisions();
        expect(decisions).toHaveLength(1);
        expect(decisions[0].id).toBe('ui-001');
        expect(decisions[0].decision).toBe('Use Tailwind');
    });

    it('gets a decision by ID', async () => {
        await addDecision({
            id: 'backend-001',
            scope: 'Backend',
            decision: 'Use PostgreSQL',
            status: 'active',
            createdAt: new Date().toISOString(),
        });

        const decision = await getDecisionById('backend-001');
        expect(decision).not.toBeNull();
        expect(decision!.decision).toBe('Use PostgreSQL');
    });

    it('updates a decision', async () => {
        await addDecision({
            id: 'ui-001',
            scope: 'UI',
            decision: 'Use Tailwind',
            status: 'active',
            createdAt: new Date().toISOString(),
        });

        await updateDecision('ui-001', { decision: 'Use Tailwind v4' });
        const updated = await getDecisionById('ui-001');
        expect(updated!.decision).toBe('Use Tailwind v4');
        expect(updated!.updatedAt).toBeDefined();
    });

    it('deletes a decision', async () => {
        await addDecision({
            id: 'ui-001',
            scope: 'UI',
            decision: 'Use Tailwind',
            status: 'active',
            createdAt: new Date().toISOString(),
        });

        const deleted = await deleteDecision('ui-001');
        expect(deleted).toBe(true);

        const decisions = await listDecisions();
        expect(decisions).toHaveLength(0);
    });

    it('normalizes scope on add', async () => {
        await addDecision({
            id: 'ui-001',
            scope: 'ui',
            decision: 'Use Tailwind',
            status: 'active',
            createdAt: new Date().toISOString(),
        });

        const decisions = await listDecisions();
        expect(decisions[0].scope).toBe('Ui');
    });

    it('throws on duplicate ID', async () => {
        const decision = {
            id: 'ui-001',
            scope: 'UI',
            decision: 'Use Tailwind',
            status: 'active' as const,
            createdAt: new Date().toISOString(),
        };

        await addDecision(decision);
        await expect(addDecision(decision)).rejects.toThrow('already exists');
    });
});
