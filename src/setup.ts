#!/usr/bin/env node
// Load environment variables first
import './env.js';

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MCPConfig {
    mcpServers?: {
        [key: string]: {
            command: string;
            args: string[];
            cwd?: string;
            env?: Record<string, string>;
        };
    };
}

/**
 * Prompt user for input
 */
function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * Get the MCP config file path
 */
function getMCPConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.gemini', 'antigravity', 'mcp_config.json');
}

/**
 * Read existing MCP config
 */
async function readMCPConfig(configPath: string): Promise<MCPConfig> {
    try {
        const content = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        // File doesn't exist or is invalid, return empty config
        return { mcpServers: {} };
    }
}

/**
 * Write MCP config
 */
async function writeMCPConfig(configPath: string, config: MCPConfig): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Try to read API key from environment (already loaded by env.ts)
 */
function getApiKeyFromEnv(): string | null {
    return process.env.GEMINI_API_KEY || null;
}

/**
 * Main setup flow
 */
export async function runSetup() {
    console.log('🧠 DecisionNode MCP Setup\n');

    // 1. Try to auto-detect API key from .env
    let apiKey = getApiKeyFromEnv();

    if (apiKey) {
        console.log('✓ Found GEMINI_API_KEY in .env file\n');
    } else {
        console.log('Step 1: Gemini API Key');
        console.log('Get your free API key from: https://aistudio.google.com/api-keys\n');

        apiKey = await prompt('Enter your GEMINI_API_KEY (or press Enter to skip): ');

        if (!apiKey) {
            console.log('\n⚠️  Skipping API key for now. You can add it later in the MCP config file.');
        }
    }

    // 2. Get MCP config path
    const configPath = getMCPConfigPath();
    console.log(`\nStep 2: Updating MCP config at:\n${configPath}\n`);

    // 3. Read existing config
    let config: MCPConfig;
    try {
        config = await readMCPConfig(configPath);
        console.log('✓ Found existing MCP config');
    } catch (error) {
        config = { mcpServers: {} };
        console.log('✓ Creating new MCP config');
    }

    // 4. Add/update DecisionNode entry for THIS project
    if (!config.mcpServers) {
        config.mcpServers = {};
    }

    // Single entry - Antigravity sets cwd based on active workspace
    config.mcpServers.decisionnode = {
        command: 'npx',
        args: ['decide-mcp'],
        ...(apiKey ? { env: { GEMINI_API_KEY: apiKey } } : {})
    };

    // 5. Write config
    try {
        await writeMCPConfig(configPath, config);
        console.log('✓ Updated MCP config\n');
    } catch (error) {
        console.error('✗ Failed to write MCP config:', error);
        process.exit(1);
    }

    // 6. Success message
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const globalStore = path.join(homeDir, '.decisionnode');

    console.log('✅ DecisionNode MCP setup complete!\n');
    console.log('📁 Global store: ' + globalStore);
    console.log('   Each project gets its own isolated folder automatically.\n');

    if (!apiKey) {
        console.log('📝 To add your API key later, edit:');
        console.log(`   ${configPath}\n`);
        console.log('   Add this to the "decisionnode" entry:');
        console.log('   "env": { "GEMINI_API_KEY": "your-key-here" }\n');
    }

    console.log('🚀 Next steps:');
    console.log('   1. Restart Antigravity (or reload MCP servers)');
    console.log('   2. Open any project - decisions are automatically isolated!');
    console.log('   3. Try asking: "Add a decision about our architecture"\n');
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runSetup().catch((error) => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}
