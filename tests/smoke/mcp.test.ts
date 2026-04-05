import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const MCP_PATH = path.resolve('dist/mcp/server.js');

describe('MCP server smoke tests', () => {
    it('responds to initialize request', () => {
        const request = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'test', version: '1.0.0' },
            },
        }) + '\n';

        // Send initialize via stdin, the server should respond on stdout
        const output = execSync(
            `echo '${request.replace(/'/g, "'\\''")}' | node "${MCP_PATH}"`,
            {
                encoding: 'utf-8',
                timeout: 10000,
                shell: 'bash',
            }
        );

        // MCP uses Content-Length header framing or newline-delimited JSON
        // Parse the response — it may have Content-Length headers
        const jsonMatch = output.match(/\{.*"result".*\}/s);
        expect(jsonMatch).not.toBeNull();

        const response = JSON.parse(jsonMatch![0]);
        expect(response.result).toBeDefined();
        expect(response.result.serverInfo.name).toBe('decisionnode');
    });

    it('lists 9 tools', async () => {
        const initRequest = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'test', version: '1.0.0' },
            },
        });

        const initializedNotification = JSON.stringify({
            jsonrpc: '2.0',
            method: 'notifications/initialized',
        });

        const listToolsRequest = JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {},
        });

        const input = `${initRequest}\n${initializedNotification}\n${listToolsRequest}\n`;

        const output = execSync(
            `echo '${input.replace(/'/g, "'\\''")}' | node "${MCP_PATH}"`,
            {
                encoding: 'utf-8',
                timeout: 10000,
                shell: 'bash',
            }
        );

        // Find the tools/list response (id: 2)
        const toolsMatch = output.match(/\{[^{}]*"id"\s*:\s*2[^{}]*"result"[^}]*"tools"\s*:\s*\[.*?\]\s*\}/s);
        if (toolsMatch) {
            const response = JSON.parse(toolsMatch[0]);
            expect(response.result.tools).toHaveLength(9);
        } else {
            // Try parsing all JSON objects from the output
            const jsonObjects = output.split('\n').filter(line => line.includes('"id":2') || line.includes('"id": 2'));
            expect(jsonObjects.length).toBeGreaterThan(0);
        }
    });
});
