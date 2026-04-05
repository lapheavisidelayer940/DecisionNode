// This file must be imported FIRST to ensure env is set up before any other modules
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// NUCLEAR OPTION: Redirect console.log to console.error
// MCP protocol uses stdout for communication. Any library logging to stdout
// will break the protocol. Redirecting to stderr is safe.
console.log = console.error;

/**
 * Get the global DecisionNode store location
 * ~/.decisionnode/.decisions/
 */
function getGlobalStorePath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.decisionnode', '.decisions');
}

// Current project name - can be overridden at runtime
let currentProjectName: string = path.basename(process.cwd());

/**
 * Set the current project name (called by MCP tools)
 */
export function setCurrentProject(projectName: string): void {
    currentProjectName = projectName;
}

/**
 * Get the current project name
 */
export function getCurrentProject(): string {
    return currentProjectName;
}

/**
 * Get the project-specific storage path
 * ~/.decisionnode/.decisions/{projectname}/
 * Does NOT create the folder - that's done when saving files
 */
export function getProjectPath(projectName?: string): string {
    const name = projectName || currentProjectName;
    return path.join(getGlobalStorePath(), name);
}

/**
 * Ensure project folder exists (call before writing files)
 */
export function ensureProjectFolder(projectName?: string): void {
    const projectPath = getProjectPath(projectName);
    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
    }
}

// Global store path (e.g., ~/.decisionnode/.decisions/)
export const GLOBAL_STORE = getGlobalStorePath();

// Reserved folder name for global decisions
export const GLOBAL_PROJECT_NAME = '_global';

/**
 * Get the path to the global decisions folder
 * ~/.decisionnode/.decisions/_global/
 */
export function getGlobalDecisionsPath(): string {
    return path.join(getGlobalStorePath(), GLOBAL_PROJECT_NAME);
}

/**
 * Ensure the global decisions folder exists
 */
export function ensureGlobalFolder(): void {
    const globalPath = getGlobalDecisionsPath();
    if (!fs.existsSync(globalPath)) {
        fs.mkdirSync(globalPath, { recursive: true });
    }
}

/**
 * Check if a decision ID is a global decision (prefixed with "global:")
 */
export function isGlobalId(id: string): boolean {
    return id.startsWith('global:');
}

/**
 * Strip the "global:" prefix from a decision ID
 */
export function stripGlobalPrefix(id: string): string {
    return id.replace(/^global:/, '');
}

// Also export a getter for dynamic access
export function getProjectRoot(): string {
    return getProjectPath(currentProjectName);
}

// Load .env file from home directory ONLY
// This is the single source of truth for API keys
const homeDir = process.env.HOME || process.env.USERPROFILE || '';
dotenv.config({
    path: path.join(homeDir, '.decisionnode', '.env'),
    quiet: true
});

// ============================================
// Search Sensitivity Configuration
// ============================================
export type SearchSensitivity = 'high' | 'medium';

interface DecisionNodeConfig {
    searchSensitivity: SearchSensitivity;
}

const CONFIG_FILE_PATH = path.join(homeDir, '.decisionnode', 'config.json');

const DEFAULT_CONFIG: DecisionNodeConfig = {
    searchSensitivity: 'high'
};

/**
 * Load the global DecisionNode config
 */
function loadConfig(): DecisionNodeConfig {
    try {
        if (fs.existsSync(CONFIG_FILE_PATH)) {
            const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
        }
    } catch {
        // Return default if file is corrupted
    }
    return DEFAULT_CONFIG;
}

/**
 * Save the global DecisionNode config
 */
function saveConfig(config: DecisionNodeConfig): void {
    try {
        const dir = path.dirname(CONFIG_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch {
        // Silently fail if we can't write config
    }
}

/**
 * Get the current search sensitivity level
 */
export function getSearchSensitivity(): SearchSensitivity {
    return loadConfig().searchSensitivity;
}

/**
 * Set the search sensitivity level
 */
export function setSearchSensitivity(level: SearchSensitivity): void {
    const config = loadConfig();
    config.searchSensitivity = level;
    saveConfig(config);
}
