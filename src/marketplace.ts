/**
 * DecisionNode Marketplace
 * 
 * Download and install curated decision packs. Embeddings are generated locally.
 */

import fs from 'fs/promises';
import path from 'path';
import { getProjectRoot, ensureProjectFolder } from './env.js';
import { DecisionNode, DecisionCollection } from './types.js';
import { logAction } from './history.js';

// Supabase configuration for the official DecisionNode Marketplace
// Users can override with environment variables from ~/.decisionnode/.env
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured(): boolean {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Get helpful error message for missing Supabase config
 */
function getSupabaseConfigError(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
    return `Marketplace requires Supabase configuration.\n` +
        `Please add the following to ${homeDir}/.decisionnode/.env:\n\n` +
        `  SUPABASE_URL=https://your-project.supabase.co\n` +
        `  SUPABASE_ANON_KEY=your-anon-key\n\n` +
        `You can find these values in your Supabase project dashboard.`;
}

// Legacy GitHub fallback (for sample packs)
const MARKETPLACE_BASE = 'https://raw.githubusercontent.com/decisionnode/marketplace/main';

/**
 * A Decision Pack is a pre-made collection of decisions with vectors
 */
export interface DecisionPack {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
    scope: string;
    decisions: DecisionNode[];
    vectors: Record<string, number[]>;
}

/**
 * Marketplace index entry (lightweight metadata)
 */
export interface MarketplaceEntry {
    id: string;
    name: string;
    description: string;
    author: string;
    scope: string;
    decisionCount: number;
    downloads: number;
}

/**
 * Fetch the marketplace index from Supabase
 */
export async function getMarketplaceIndex(): Promise<MarketplaceEntry[]> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
        console.error(getSupabaseConfigError());
        return getSamplePacks();
    }

    try {
        // Fetch from Supabase REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/packs_with_ratings?select=slug,name,description,author_username,scope,decisions,tags,downloads`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch marketplace index: ${response.statusText}`);
        }

        const packs = await response.json() as any[];

        // Transform to MarketplaceEntry format
        return packs.map(pack => ({
            id: pack.slug,
            name: pack.name,
            description: pack.description,
            author: pack.author_username || 'Unknown',
            scope: pack.scope,
            decisionCount: Array.isArray(pack.decisions) ? pack.decisions.length : 0,
            downloads: pack.downloads || 0
        }));
    } catch (error) {
        console.error('Failed to fetch from Supabase, using sample packs:', error);
        // Return sample packs as fallback
        return getSamplePacks();
    }
}

/**
 * Get sample packs for demo/development
 */
function getSamplePacks(): MarketplaceEntry[] {
    return [
        {
            id: 'ui-modern-web',
            name: 'Modern Web UI',
            description: 'Best practices for modern web interfaces: colors, typography, spacing, animations',
            author: 'DecisionNode',
            scope: 'UI',
            decisionCount: 12,
            downloads: 1250
        },
        {
            id: 'api-rest-best-practices',
            name: 'REST API Best Practices',
            description: 'RESTful API design patterns, versioning, error handling, authentication',
            author: 'DecisionNode',
            scope: 'API',
            decisionCount: 15,
            downloads: 890
        },
        {
            id: 'backend-nodejs',
            name: 'Node.js Backend',
            description: 'Node.js architecture decisions: error handling, logging, security, testing',
            author: 'DecisionNode',
            scope: 'Backend',
            decisionCount: 18,
            downloads: 670
        },
        {
            id: 'react-architecture',
            name: 'React Architecture',
            description: 'React best practices: component patterns, state management, hooks, testing',
            author: 'DecisionNode',
            scope: 'Frontend',
            decisionCount: 20,
            downloads: 1560
        }
    ];
}

/**
 * Download and install a decision pack
 */
export async function installPack(packId: string): Promise<{ installed: number; skipped: number }> {
    // For demo, generate sample pack
    const pack = await fetchPack(packId);

    if (!pack) {
        throw new Error(`Pack ${packId} not found`);
    }

    ensureProjectFolder();
    const projectRoot = getProjectRoot();

    // Load existing decisions for this scope
    const scopeFile = path.join(projectRoot, `${pack.scope.toLowerCase()}.json`);
    let existing: DecisionCollection = { scope: pack.scope.toLowerCase(), decisions: [] };

    try {
        const content = await fs.readFile(scopeFile, 'utf-8');
        existing = JSON.parse(content);
    } catch {
        // File doesn't exist yet
    }

    // Track existing IDs to avoid duplicates
    const existingIds = new Set(existing.decisions.map(d => d.id));

    let installed = 0;
    let skipped = 0;

    // Add new decisions (with new IDs to avoid conflicts)
    for (const decision of pack.decisions) {
        // Generate new ID based on scope and count
        const newId = `${pack.scope.toLowerCase()}-${(existing.decisions.length + installed + 1).toString().padStart(3, '0')}`;

        // Check if a very similar decision already exists
        const isDuplicate = existing.decisions.some(d =>
            d.decision.toLowerCase() === decision.decision.toLowerCase()
        );

        if (isDuplicate) {
            skipped++;
            continue;
        }

        existing.decisions.push({
            ...decision,
            id: newId,
            createdAt: new Date().toISOString()
        });
        installed++;
    }

    // Save updated decisions
    await fs.writeFile(scopeFile, JSON.stringify(existing, null, 2), 'utf-8');

    // Merge vectors from pack
    const vectorsFile = path.join(projectRoot, 'vectors.json');
    let existingVectors: Record<string, number[]> = {};

    try {
        const content = await fs.readFile(vectorsFile, 'utf-8');
        existingVectors = JSON.parse(content);
    } catch {
        // File doesn't exist yet
    }

    // Add pack vectors with new IDs
    let vectorIndex = 0;
    for (const decision of pack.decisions) {
        const originalId = decision.id;
        const newId = `${pack.scope.toLowerCase()}-${(existing.decisions.length - pack.decisions.length + vectorIndex + 1).toString().padStart(3, '0')}`;

        if (pack.vectors[originalId]) {
            existingVectors[newId] = pack.vectors[originalId];
        }
        vectorIndex++;
    }

    await fs.writeFile(vectorsFile, JSON.stringify(existingVectors, null, 2), 'utf-8');

    // Log the installation to history
    if (installed > 0) {
        await logAction('installed', `${pack.id}`, `Installed pack "${pack.name}" (${installed} decisions)`);
    }

    return { installed, skipped };
}

/**
 * Fetch a specific pack from Supabase by slug
 */
async function fetchPack(packId: string): Promise<DecisionPack | null> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
        console.error(getSupabaseConfigError());
        return generateSamplePack(packId);
    }

    try {
        // Fetch from Supabase REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/packs_with_ratings?slug=eq.${encodeURIComponent(packId)}&select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch pack: ${response.statusText}`);
        }

        const packs = await response.json() as any[];

        if (packs.length === 0) {
            // Try legacy sample pack
            return generateSamplePack(packId);
        }

        const pack = packs[0];

        // Transform to DecisionPack format
        return {
            id: pack.slug,
            name: pack.name,
            description: pack.description,
            author: pack.author_username || 'Unknown',
            version: pack.version || '1.0.0',
            scope: pack.scope,
            decisions: pack.decisions || [],
            vectors: pack.vectors || {}
        };
    } catch (error) {
        console.error('Failed to fetch pack from Supabase:', error);
        // Fall through to sample pack
        return generateSamplePack(packId);
    }
}

/**
 * Generate a sample pack for demonstration
 */
function generateSamplePack(packId: string): DecisionPack | null {
    const samplePacks: Record<string, DecisionPack> = {
        'ui-modern-web': {
            id: 'ui-modern-web',
            name: 'Modern Web UI',
            description: 'Best practices for modern web interfaces',
            author: 'DecisionNode',
            version: '1.0.0',
            scope: 'UI',
            decisions: [
                {
                    id: 'pack-001',
                    scope: 'ui',
                    decision: 'Use a consistent 8px spacing grid for all layout decisions',
                    rationale: '8px grid provides visual rhythm and makes responsive design easier',
                    constraints: ['Margins and padding must be multiples of 8px', 'Icon sizes should be 16, 24, 32, or 48px'],
                    status: 'active',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'pack-002',
                    scope: 'ui',
                    decision: 'Use Inter or system fonts for body text, display fonts for headings only',
                    rationale: 'Inter is highly readable and open source, system fonts ensure fast loading',
                    constraints: ['Minimum body font size is 16px', 'Line height should be 1.5 for body text'],
                    status: 'active',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'pack-003',
                    scope: 'ui',
                    decision: 'All interactive elements must have visible focus states',
                    rationale: 'Accessibility requirement for keyboard users',
                    constraints: ['Focus ring must have 2px offset', 'Focus color must have 3:1 contrast ratio'],
                    status: 'active',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'pack-004',
                    scope: 'ui',
                    decision: 'Animations should complete within 300ms for UI feedback',
                    rationale: 'Longer animations feel sluggish, shorter ones are jarring',
                    constraints: ['Use ease-out for entrances', 'Use ease-in for exits', 'Disable for reduced-motion preference'],
                    status: 'active',
                    createdAt: new Date().toISOString()
                }
            ],
            vectors: {
                'pack-001': new Array(768).fill(0).map(() => Math.random() * 2 - 1),
                'pack-002': new Array(768).fill(0).map(() => Math.random() * 2 - 1),
                'pack-003': new Array(768).fill(0).map(() => Math.random() * 2 - 1),
                'pack-004': new Array(768).fill(0).map(() => Math.random() * 2 - 1)
            }
        }
    };

    return samplePacks[packId] || null;
}

/**
 * Search marketplace by query
 */
export async function searchMarketplace(query: string): Promise<MarketplaceEntry[]> {
    const index = await getMarketplaceIndex();
    const lowerQuery = query.toLowerCase();

    return index.filter(entry =>
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery) ||
        entry.scope.toLowerCase().includes(lowerQuery)
    );
}
