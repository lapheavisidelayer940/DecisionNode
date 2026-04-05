import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const CLI_PATH = path.resolve('dist/cli.js');

function runCli(args: string): string {
    // CLI redirects console.log to stderr via env.ts, so capture stderr
    try {
        const stdout = execSync(`node "${CLI_PATH}" ${args} 2>&1`, {
            encoding: 'utf-8',
            timeout: 10000,
            env: { ...process.env, NODE_ENV: 'test' },
            shell: 'bash',
        });
        return stdout;
    } catch (e: any) {
        // Some commands exit with non-zero but still produce output
        return (e.stdout || '') + (e.stderr || '');
    }
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
        // Help should mention the main commands
        expect(output).toContain('init');
        expect(output).toContain('setup');
    });
});
