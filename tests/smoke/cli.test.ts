import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';

const CLI_PATH = path.resolve('dist/cli.js');
const NODE_PATH = process.execPath;

function runCli(args: string): string {
    const result = spawnSync(NODE_PATH, [CLI_PATH, ...args.split(' ')], {
        encoding: 'utf-8',
        timeout: 10000,
    });
    // CLI redirects console.log to stderr via env.ts
    return (result.stdout || '') + (result.stderr || '');
}

describe('CLI smoke tests', () => {
    it('shows help output', () => {
        const output = runCli('help');
        expect(output).toContain('decide');
        expect(output).toContain('add');
        expect(output).toContain('search');
        expect(output).toContain('list');
    });

    it('shows version-like info in help', () => {
        const output = runCli('help');
        expect(output).toContain('init');
        expect(output).toContain('setup');
    });
});
