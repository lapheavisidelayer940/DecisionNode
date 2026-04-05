#!/usr/bin/env node

import { listDecisions, getDecisionById, addDecision, updateDecision, deleteDecision, deleteScope, getNextDecisionId, renumberDecisions, importDecisions, getAvailableScopes, listProjects, saveDecisions, listGlobalDecisions, getGlobalDecisionById, addGlobalDecision, updateGlobalDecision, deleteGlobalDecision, getNextGlobalDecisionId, getGlobalScopes } from './store.js';
import { DecisionNode } from './types.js';
import { getHistory, getSnapshot, getDecisionsFromSnapshot, logBatchAction, logAction, ActivityLogEntry } from './history.js';
import { getSearchSensitivity, setSearchSensitivity, SearchSensitivity, isGlobalId } from './env.js';
import { loginToCloud, logoutFromCloud, getCloudStatus, syncDecisionsToCloud, getCloudSyncStatus, isProSubscriber, refreshCloudProfile, pullDecisionsFromCloud, detectConflicts, resolveConflict, CloudDecision, SyncConflict, updateSyncMetadata, getAutoSyncEnabled, setAutoSyncEnabled, saveIncomingChanges, removeIncomingChanges } from './cloud.js';
import { getProjectRoot } from './env.js';
import * as readline from 'readline';
import fs from 'fs/promises';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
    try {
        switch (command) {
            case 'list':
                await handleList();
                break;

            case 'get':
                await handleGet();
                break;

            case 'search':
                await handleSearch();
                break;

            case 'add':
            case 'add-decision':
                await handleAddDecision();
                break;

            case 'edit':
                await handleEdit();
                break;

            case 'delete':
                await handleDelete();
                break;

            case 'deprecate':
                await handleDeprecate();
                break;

            case 'activate':
                await handleActivate();
                break;

            case 'import':
                await handleImport();
                break;

            case 'history':
                await handleHistory();
                break;

            case 'init':
                await handleInit();
                break;

            case 'setup':
                await handleSetup();
                break;

            case 'embed':
                await handleEmbed();
                break;

            case 'check':
                await handleCheck();
                break;

            case 'clean':
                await handleClean();
                break;

            case 'export':
                await handleExport();
                break;

            // case 'marketplace':
            // case 'market':
            //     await handleMarketplace();
            //     break;

            case 'projects':
                await handleProjects();
                break;

            case 'config':
                await handleConfig();
                break;

            // case 'login':
            //     await handleLogin();
            //     break;

            // case 'logout':
            //     await handleLogout();
            //     break;

            // case 'status':
            //     await handleStatus();
            //     break;

            // case 'sync':
            //     await handleSync();
            //     break;

            // case 'cloud':
            //     await handleCloud();
            //     break;

            // case 'conflicts':
            //     await handleConflicts();
            //     break;

            // case 'fetch':
            //     await handleFetch();
            //     break;

            // case 'pull':
            //     await handlePull();
            //     break;

            case 'delete-scope':
                await handleDeleteScope();
                break;

            default:
                printUsage();
                break;
        }
    } catch (error) {
        console.error('❌ Error:', (error as Error).message);
        process.exit(1);
    }
}

async function handleList() {
    const scopeFlag = args.indexOf('--scope');
    const scope = scopeFlag > -1 ? args[scopeFlag + 1] : undefined;
    const globalOnly = args.includes('--global');

    // Get project decisions (unless --global flag is set)
    const projectDecisions = globalOnly ? [] : await listDecisions(scope);

    // Get global decisions (always, unless --scope is filtering a project scope)
    const globalDecisions = globalOnly
        ? await listGlobalDecisions(scope)
        : await listGlobalDecisions();

    const allDecisions = [...projectDecisions, ...globalDecisions];

    if (allDecisions.length === 0) {
        console.log('📭 No decisions found.');
        console.log('\nRun: decide add');
        return;
    }

    const label = globalOnly ? 'Global Decisions' : `Decisions${scope ? ` (${scope})` : ''}`;
    console.log(`\n📋 ${label}: \n`);

    // Show global decisions first, then project decisions
    if (globalDecisions.length > 0) {
        const globalGrouped: Record<string, DecisionNode[]> = {};
        for (const d of globalDecisions) {
            if (!globalGrouped[d.scope]) globalGrouped[d.scope] = [];
            globalGrouped[d.scope].push(d);
        }

        console.log('🌐 Global');
        for (const [scopeName, scopeDecisions] of Object.entries(globalGrouped)) {
            console.log(`  📁 ${scopeName} `);
            for (const d of scopeDecisions) {
                const statusIcon = d.status === 'active' ? '✅' :
                    '⚠️';
                console.log(`     ${statusIcon} [${d.id}] ${d.decision} `);
            }
        }
        console.log('');
    }

    if (projectDecisions.length > 0) {
        const grouped: Record<string, DecisionNode[]> = {};
        for (const d of projectDecisions) {
            if (!grouped[d.scope]) grouped[d.scope] = [];
            grouped[d.scope].push(d);
        }

        for (const [scopeName, scopeDecisions] of Object.entries(grouped)) {
            console.log(`📁 ${scopeName} `);
            for (const d of scopeDecisions) {
                const statusIcon = d.status === 'active' ? '✅' :
                    '⚠️';
                console.log(`   ${statusIcon} [${d.id}] ${d.decision} `);
            }
            console.log('');
        }
    }

    const parts = [];
    if (projectDecisions.length > 0) parts.push(`${projectDecisions.length} project`);
    if (globalDecisions.length > 0) parts.push(`${globalDecisions.length} global`);
    console.log(`Total: ${parts.join(' + ')} decisions`);
}

async function handleGet() {
    const id = args[1];
    if (!id) {
        console.log('Usage: decide get <decision-id>');
        return;
    }

    const decision = isGlobalId(id)
        ? await getGlobalDecisionById(id)
        : await getDecisionById(id);

    if (!decision) {
        console.log(`❌ Decision "${id}" not found`);
        return;
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`📌 ${decision.id} `);
    console.log('─'.repeat(60));
    console.log(`\n📋 Decision: ${decision.decision} `);
    if (decision.rationale) {
        console.log(`\n💡 Rationale: ${decision.rationale} `);
    }
    console.log(`\n📁 Scope: ${decision.scope} `);
    console.log(`📊 Status: ${decision.status} `);

    if (decision.constraints?.length) {
        console.log(`⚠️  Constraints: ${decision.constraints.join(', ')} `);
    }
    console.log('');
}

async function handleSearch() {
    const query = args.slice(1).join(' ');
    if (!query) {
        console.log('Usage: decide search "<your question>"');
        return;
    }

    try {
        const { findRelevantDecisions } = await import('./ai/rag.js');
        const results = await findRelevantDecisions(query, 5);

        if (results.length === 0) {
            console.log('🔍 No relevant decisions found.');
            console.log('   (Have you added decisions yet?)');
            return;
        }

        console.log(`\n🔍 Results for: "${query}"\n`);

        for (const result of results) {
            const score = (result.score * 100).toFixed(0);
            console.log(`[${score}%] ${result.decision.id}: ${result.decision.decision} `);
        }
        console.log('');
    } catch (error) {
        console.log('❌ Semantic search requires a Gemini API key.');
        console.log('   Run: decide setup');
    }
}

function prompt(question: string, defaultValue?: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
        if (defaultValue) {
            rl.write(defaultValue);
        }
    });
}

function getFlag(flag: string): string | undefined {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx + 1 >= args.length) return undefined;
    return args[idx + 1];
}

async function handleAddDecision() {
    const isGlobal = args.includes('--global');

    // Check for inline mode: decide add --scope UI --decision "Use Tailwind" ...
    const inlineScope = getFlag('--scope') || getFlag('-s');
    const inlineDecision = getFlag('--decision') || getFlag('-d');

    let scope: string;
    let decisionText: string;
    let rationale: string;
    let constraintsInput: string;

    if (inlineScope && inlineDecision) {
        // Inline mode — no prompts
        scope = inlineScope;
        decisionText = inlineDecision;
        rationale = getFlag('--rationale') || getFlag('-r') || '';
        constraintsInput = getFlag('--constraints') || getFlag('-c') || '';
    } else {
        // Interactive mode
        console.log(`\n➕ Add New ${isGlobal ? 'Global ' : ''}Decision\n`);

        // Show existing scopes for consistency
        const existingScopes = isGlobal ? await getGlobalScopes() : await getAvailableScopes();
        if (existingScopes.length > 0) {
            console.log(`Existing scopes: ${existingScopes.join(', ')} \n`);
        }

        const scopeExamples = existingScopes.length > 0
            ? existingScopes.slice(0, 3).join(', ')
            : 'UI, Backend, API';
        scope = await prompt(`Scope (e.g., ${scopeExamples} - capitalization doesn't matter): `);
        if (!scope.trim()) {
            console.log('❌ Scope is required');
            return;
        }

        decisionText = await prompt('Decision: ');
        if (!decisionText.trim()) {
            console.log('❌ Decision text is required');
            return;
        }

        // Check for potential conflicts with existing decisions
        try {
            const { findPotentialConflicts } = await import('./ai/rag.js');
            const conflicts = await findPotentialConflicts(`${scope}: ${decisionText}`, 0.75);

            if (conflicts.length > 0) {
                console.log('\n⚠️  Similar decisions found:\n');
                for (const { decision, score } of conflicts) {
                    const similarity = Math.round(score * 100);
                    console.log(`   ${decision.id}: ${decision.decision.substring(0, 50)}... (${similarity}% similar)`);
                }
                console.log('');
                const proceed = await prompt('Continue anyway? (y/N): ');
                if (proceed.toLowerCase() !== 'y') {
                    console.log('Cancelled.');
                    return;
                }
            }
        } catch {
            // Conflict check failed (API key not set) - continue anyway
        }

        rationale = await prompt('Rationale (optional): ');
        constraintsInput = await prompt('Constraints (comma-separated, optional): ');
    }

    if (isGlobal) {
        const rawId = await getNextGlobalDecisionId(scope.trim());

        const newDecision: DecisionNode = {
            id: rawId,
            scope: scope.trim(),
            decision: decisionText.trim(),
            rationale: rationale.trim() || undefined,
            constraints: constraintsInput.trim() ? constraintsInput.split(',').map(s => s.trim()) : undefined,
            status: 'active',
            createdAt: new Date().toISOString()
        };

        const { embedded } = await addGlobalDecision(newDecision);

        console.log(`\n✅ Created global:${rawId}`);
        console.log(`   This decision applies to all projects`);
        if (embedded) {
            console.log(`   Auto-embedded for semantic search`);
        } else {
            console.log(`\n⚠️  Not embedded — semantic search won't find this decision.`);
            console.log(`   Run: decide setup    (to set your Gemini API key)`);
            console.log(`   Then: decide embed   (to embed all unembedded decisions)`);
        }
    } else {
        const id = await getNextDecisionId(scope.trim());

        const newDecision: DecisionNode = {
            id,
            scope: scope.trim(),
            decision: decisionText.trim(),
            rationale: rationale.trim() || undefined,
            constraints: constraintsInput.trim() ? constraintsInput.split(',').map(s => s.trim()) : undefined,
            status: 'active',
            createdAt: new Date().toISOString()
        };

        const { embedded } = await addDecision(newDecision);

        console.log(`\n✅ Created ${id}`);
        if (embedded) {
            console.log(`   Auto-embedded for semantic search`);
        } else {
            console.log(`\n⚠️  Not embedded — semantic search won't find this decision.`);
            console.log(`   Run: decide setup    (to set your Gemini API key)`);
            console.log(`   Then: decide embed   (to embed all unembedded decisions)`);
        }
    }
}

async function handleEdit() {
    const id = args[1];
    if (!id) {
        console.log('Usage: decide edit <decision-id>');
        return;
    }

    const global = isGlobalId(id);
    const decision = global
        ? await getGlobalDecisionById(id)
        : await getDecisionById(id);

    if (!decision) {
        console.log(`❌ Decision ${id} not found`);
        return;
    }

    if (global) {
        console.log(`\n⚠️  This is a global decision that affects ALL projects.`);
        const confirm = await prompt('Continue editing? (y/N): ');
        if (confirm.trim().toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
        }
    }

    console.log(`\n✏️  Editing ${id}`);
    console.log('Press Enter to keep current value.\n');

    const newDecision = await prompt('Decision: ', decision.decision);
    const newRationale = await prompt('Rationale: ', decision.rationale || '');
    const newConstraints = await prompt('Constraints: ', (decision.constraints || []).join(', '));

    const updates: Partial<DecisionNode> = {};
    if (newDecision.trim()) updates.decision = newDecision.trim();
    if (newRationale.trim()) updates.rationale = newRationale.trim();
    if (newConstraints.trim()) updates.constraints = newConstraints.split(',').map(s => s.trim());

    if (Object.keys(updates).length === 0) {
        console.log('\nNo changes made.');
        return;
    }

    if (global) {
        await updateGlobalDecision(id, updates);
    } else {
        await updateDecision(id, updates);
    }
    console.log(`\n✅ Updated ${id}`);
    console.log(`   Auto-embedded for semantic search`);
}

async function handleDelete() {
    const id = args[1];
    if (!id) {
        console.log('Usage: decide delete <decision-id>');
        return;
    }

    const global = isGlobalId(id);
    const decision = global
        ? await getGlobalDecisionById(id)
        : await getDecisionById(id);

    if (!decision) {
        console.log(`❌ Decision ${id} not found`);
        return;
    }

    console.log(`\n🗑️  Delete: ${id}`);
    console.log(`   "${decision.decision}"\n`);

    if (global) {
        console.log(`⚠️  This is a global decision that affects ALL projects.`);
    }

    const confirm = await prompt('Type "yes" to confirm: ');
    if (confirm.trim().toLowerCase() !== 'yes') {
        console.log('Cancelled.');
        return;
    }

    if (global) {
        await deleteGlobalDecision(id);
    } else {
        await deleteDecision(id);

        // Auto-clean orphaned data (reviews, etc.)
        try {
            const { cleanOrphanedData } = await import('./maintenance.js');
            await cleanOrphanedData();
        } catch {
            // Ignore clean errors during delete flow
        }

        const renumber = await prompt('Renumber remaining decisions? (y/n): ');
        if (renumber.trim().toLowerCase() === 'y') {
            const renames = await renumberDecisions(decision.scope);
            if (renames.length > 0) {
                console.log('\nRenumbered:');
                renames.forEach(r => console.log(`   ${r}`));
            }
        }
    }

    console.log(`\n✅ Deleted ${id}`);
}

async function handleDeprecate() {
    const id = args[1];
    if (!id) {
        console.log('Usage: decide deprecate <decision-id>');
        return;
    }

    const global = isGlobalId(id);
    const decision = global
        ? await getGlobalDecisionById(id)
        : await getDecisionById(id);

    if (!decision) {
        console.log(`❌ Decision ${id} not found`);
        return;
    }

    if (decision.status === 'deprecated') {
        console.log(`⚠️  ${id} is already deprecated.`);
        return;
    }

    console.log(`\n📌 ${id}: ${decision.decision}`);

    if (global) {
        await updateGlobalDecision(id, { status: 'deprecated' });
    } else {
        await updateDecision(id, { status: 'deprecated' });
    }

    console.log(`\n✅ Deprecated ${id}`);
    console.log(`   This decision will no longer appear in search results.`);
}

async function handleActivate() {
    const id = args[1];
    if (!id) {
        console.log('Usage: decide activate <decision-id>');
        return;
    }

    const global = isGlobalId(id);
    const decision = global
        ? await getGlobalDecisionById(id)
        : await getDecisionById(id);

    if (!decision) {
        console.log(`❌ Decision ${id} not found`);
        return;
    }

    if (decision.status === 'active') {
        console.log(`⚠️  ${id} is already active.`);
        return;
    }

    console.log(`\n📌 ${id}: ${decision.decision}`);

    if (global) {
        await updateGlobalDecision(id, { status: 'active' });
    } else {
        await updateDecision(id, { status: 'active' });
    }

    console.log(`\n✅ Activated ${id}`);
    console.log(`   This decision will now appear in search results.`);
}

async function handleDeleteScope() {
    const scopeArg = args[1];

    if (!scopeArg) {
        console.log('Usage: decide delete-scope <scope>');
        console.log('\nDeletes all decisions in a scope.');
        console.log('Example: decide delete-scope UI');
        return;
    }

    // Show what will be deleted
    const scopes = await getAvailableScopes();
    const normalizedInput = scopeArg.charAt(0).toUpperCase() + scopeArg.slice(1).toLowerCase();

    if (!scopes.some(s => s.toLowerCase() === scopeArg.toLowerCase())) {
        console.log(`❌ Scope "${scopeArg}" not found.`);
        console.log(`Available scopes: ${scopes.join(', ')}`);
        return;
    }

    const decisions = await listDecisions(normalizedInput);
    console.log(`\n⚠️  This will delete the "${normalizedInput}" scope and ALL ${decisions.length} decision(s) in it:`);
    decisions.forEach(d => console.log(`   - ${d.id}: ${d.decision.substring(0, 50)}...`));

    console.log('\n⚠️  This action cannot be undone!');
    const confirm = await prompt('Type the scope name to confirm deletion: ');

    if (confirm.toLowerCase() !== scopeArg.toLowerCase() && confirm.toLowerCase() !== normalizedInput.toLowerCase()) {
        console.log('❌ Deletion cancelled.');
        return;
    }

    const result = await deleteScope(scopeArg);
    console.log(`\n✅ Deleted scope "${normalizedInput}" (${result.deleted} decisions removed)`);
}

async function handleImport() {
    const globalFlag = args.includes('--global');
    const filePath = args.find(a => a !== 'import' && a !== '--global' && a !== '--overwrite' && !a.startsWith('-'));
    if (!filePath) {
        console.log('Usage: decide import <file.json> [--global] [--overwrite]');
        console.log('\nExample JSON format:');
        console.log(`[
  { "id": "ui-001", "scope": "UI", "decision": "...", "status": "active" },
  { "id": "ui-002", "scope": "UI", "decision": "...", "status": "active" }
]`);
        return;
    }

    console.log(`\n📥 Importing from ${filePath}${globalFlag ? ' (global)' : ''}...`);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Support both array and {decisions: [...]} format
        const decisions: DecisionNode[] = Array.isArray(data) ? data : data.decisions;

        if (!decisions || decisions.length === 0) {
            console.log('❌ No decisions found in file');
            return;
        }

        const overwriteFlag = args.includes('--overwrite');

        if (globalFlag) {
            // Import into global store
            let added = 0;
            let skipped = 0;
            for (const decision of decisions) {
                try {
                    await addGlobalDecision(decision);
                    added++;
                } catch {
                    skipped++;
                }
            }
            console.log(`\n✅ Import complete (global)`);
            console.log(`   Added: ${added}`);
            console.log(`   Skipped: ${skipped}`);
        } else {
            const result = await importDecisions(decisions, { overwrite: overwriteFlag });

            console.log(`\n✅ Import complete`);
            console.log(`   Added: ${result.added}`);
            console.log(`   Skipped: ${result.skipped}`);
            console.log(`   Embedded: ${result.embedded}`);
        }
    } catch (error) {
        console.log(`❌ Import failed: ${(error as Error).message}`);
    }
}

async function handleHistory() {
    const entryId = args[1];

    if (entryId && !entryId.startsWith('-')) {
        // View specific snapshot
        const entry = await getSnapshot(entryId);
        if (!entry) {
            console.log(`❌ Entry ${entryId} not found`);
            return;
        }

        console.log(`\n📜 Snapshot: ${entry.id}`);
        console.log(`   Action: ${entry.action}`);
        console.log(`   Time: ${new Date(entry.timestamp).toLocaleString()}`);
        console.log(`   ${entry.description}\n`);

        const decisions = getDecisionsFromSnapshot(entry.snapshot);
        console.log(`Decisions at this point (${decisions.length}):\n`);

        for (const d of decisions) {
            console.log(`\n─── ${d.id} ───`);
            console.log(`  Decision: ${d.decision}`);
            if (d.rationale) console.log(`  Rationale: ${d.rationale}`);
            if (d.constraints?.length) console.log(`  Constraints: ${d.constraints.join(', ')}`);
            console.log(`  Status: ${d.status}`);
        }
        console.log('');
        return;
    }

    // List recent history
    const filterIndex = args.indexOf('--filter');
    const filter = filterIndex > -1 ? args[filterIndex + 1] : undefined;

    const history = await getHistory(50); // Get last 50 entries

    let displayedHistory = history;
    if (filter) {
        const validFilters = ['cloud', 'cli', 'mcp', 'marketplace'];
        if (!validFilters.includes(filter)) {
            console.log(`❌ Invalid filter: ${filter}`);
            console.log(`   Valid options: ${validFilters.join(', ')}`);
            return;
        }
        displayedHistory = history.filter(h => h.source === filter);
    }

    if (displayedHistory.length === 0) {
        console.log(`📭 No history found${filter ? ` for filter "${filter}"` : ''}.`);
        return;
    }

    console.log(`\n📜 Activity History${filter ? ` (Filter: ${filter.toUpperCase()})` : ''}\n`);
    console.log('━'.repeat(60));

    displayedHistory.forEach(entry => {
        const date = new Date(entry.timestamp).toLocaleString();
        const icon = getActionIcon(entry.action);
        const source = entry.source ? `[${entry.source.toUpperCase()}]` : '[CLI]';

        console.log(`${icon} ${date} ${source.padEnd(13)} ${entry.description}`);
    });
    console.log('');
}

function getActionIcon(action: string): string {
    switch (action) {
        case 'added': return '✅';
        case 'updated': return '✏️ ';
        case 'deleted': return '🗑️ '; // Windows terminal handles this best
        case 'imported': return '📥';
        case 'installed': return '📦';
        case 'cloud_push': return '⬆️ ';
        case 'cloud_pull': return '⬇️ ';
        case 'conflict_resolved': return '🤝';
        default: return '🔹';
    }
}

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

async function handleInit() {
    const cwd = process.cwd();
    const projectName = path.basename(cwd);

    console.log('\n🚀 Initializing DecisionNode\n');
    console.log(`   Project: ${projectName}`);
    console.log(`   Location: ${cwd}\n`);

    // Check if already initialized by looking for existing decisions
    const existingScopes = await getAvailableScopes();
    if (existingScopes.length > 0) {
        console.log(`✅ Already initialized with ${existingScopes.length} scope(s): ${existingScopes.join(', ')}`);
        console.log('\n   Run: decide list');
        return;
    }

    // Create the .decisions directory
    const { getProjectRoot } = await import('./env.js');
    const projectRoot = getProjectRoot();
    await fs.mkdir(projectRoot, { recursive: true });

    console.log('\n✅ DecisionNode initialized!\n');
    console.log('Next steps:');
    console.log('  1. Configure your API key:       decide setup');
    console.log('  2. Connect your AI client:');
    console.log('     Claude Code:                  claude mcp add decisionnode -s user decide-mcp');
    console.log('     Cursor:                       Add decide-mcp in Cursor Settings → MCP');
    console.log('     Windsurf:                     Add decide-mcp in Windsurf Settings → MCP');
    console.log('  3. Add your first decision:      decide add\n');
}

async function handleSetup() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const envPath = path.join(homeDir, '.decisionnode', '.env');
    const envDir = path.dirname(envPath);

    console.log('\n⚙️  DecisionNode Setup\n');
    console.log('Semantic search requires a Gemini API key (free tier available).');
    console.log('Get one at: https://aistudio.google.com/\n');

    // Check if key already exists
    let existingKey = process.env.GEMINI_API_KEY || '';
    if (!existingKey) {
        try {
            const content = await fs.readFile(envPath, 'utf-8');
            const match = content.match(/GEMINI_API_KEY=(.+)/);
            if (match) existingKey = match[1].trim();
        } catch { /* no existing file */ }
    }

    if (existingKey) {
        const masked = existingKey.slice(0, 8) + '...' + existingKey.slice(-4);
        console.log(`Current key: ${masked}`);
        console.log('');
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (q: string) => new Promise<string>(resolve => rl.question(q, resolve));

    const key = await question(existingKey ? 'New Gemini API key (enter to keep current): ' : 'Gemini API key: ');
    rl.close();

    if (!key && existingKey) {
        console.log('\n✅ Keeping existing key.');
        return;
    }

    if (!key) {
        console.log('\n⚠️  No key provided. You can run decide setup again later.');
        return;
    }

    // Write the .env file
    await fs.mkdir(envDir, { recursive: true });

    let envContent = '';
    try {
        envContent = await fs.readFile(envPath, 'utf-8');
    } catch { /* file doesn't exist yet */ }

    if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.+/, `GEMINI_API_KEY=${key}`);
    } else {
        envContent = envContent ? envContent.trimEnd() + '\n' + `GEMINI_API_KEY=${key}\n` : `GEMINI_API_KEY=${key}\n`;
    }

    await fs.writeFile(envPath, envContent, 'utf-8');
    process.env.GEMINI_API_KEY = key;

    console.log(`\n✅ API key saved to ${envPath}`);
    console.log('\nYou can now use:');
    console.log('  decide search "your query"');
    console.log('  decide embed');
    console.log('');
}

async function handleEmbed() {
    console.log('\n⚡ Embedding decisions...\n');

    try {
        const { getUnembeddedDecisions, embedAllDecisions } = await import('./ai/rag.js');
        const unembedded = await getUnembeddedDecisions();

        if (unembedded.length === 0) {
            console.log('✅ All decisions are embedded!');
            return;
        }

        console.log(`Found ${unembedded.length} unembedded decisions:`);
        unembedded.forEach(d => console.log(`   ⚠️  ${d.id}`));
        console.log('');

        console.log('Generating embeddings...');
        const result = await embedAllDecisions();

        if (result.embedded.length > 0) {
            console.log(`\n✅ Embedded: ${result.embedded.join(', ')}`);
        }
        if (result.failed.length > 0) {
            console.log(`❌ Failed: ${result.failed.join(', ')}`);
        }
    } catch (error) {
        console.log('❌ Embedding requires a Gemini API key.');
        console.log('   Run: decide setup');
        process.exit(1);
    }
}

async function handleCheck() {
    console.log('\n🔍 Decision Health Check\n');

    const { loadVectorCache, loadGlobalVectorCache } = await import('./ai/rag.js');

    // Project decisions
    const projectDecisions = await listDecisions();
    const projectCache = await loadVectorCache();
    const projectMissing = projectDecisions.filter(d => !projectCache[d.id]);

    console.log(`📦 Project: ${projectDecisions.length} decisions`);
    console.log(`   ✅ Embedded: ${projectDecisions.length - projectMissing.length}`);
    if (projectMissing.length > 0) {
        console.log(`   ⚠️  Missing vectors: ${projectMissing.length}`);
        projectMissing.forEach(d => console.log(`      - ${d.id}: ${d.decision.substring(0, 50)}`));
    }

    // Global decisions
    const globalDecs = await listGlobalDecisions();
    let globalMissingCount = 0;
    if (globalDecs.length > 0) {
        const globalCache = await loadGlobalVectorCache();
        const globalMissing = globalDecs.filter(d => {
            const rawId = d.id.replace(/^global:/, '');
            return !globalCache[rawId];
        });
        globalMissingCount = globalMissing.length;

        console.log(`\n🌐 Global: ${globalDecs.length} decisions`);
        console.log(`   ✅ Embedded: ${globalDecs.length - globalMissing.length}`);
        if (globalMissing.length > 0) {
            console.log(`   ⚠️  Missing vectors: ${globalMissing.length}`);
            globalMissing.forEach(d => console.log(`      - ${d.id}: ${d.decision.substring(0, 50)}`));
        }
    }

    const totalMissing = projectMissing.length + globalMissingCount;
    if (totalMissing > 0) {
        console.log(`\n${totalMissing} decision(s) not searchable. Run: decide embed`);
    } else {
        console.log(`\n✅ All decisions are embedded and searchable!`);
    }
}

async function handleClean() {
    console.log('\n🧹 Cleaning orphaned data...\n');
    try {
        const { cleanOrphanedData } = await import('./maintenance.js');
        const result = await cleanOrphanedData();

        if (result.vectorsRemoved === 0 && result.reviewsRemoved === 0) {
            console.log('✅ Nothing to clean. Your data is tidy!');
        } else {
            if (result.vectorsRemoved > 0) {
                console.log(`✅ Removed ${result.vectorsRemoved} orphaned vectors.`);
            }
            if (result.reviewsRemoved > 0) {
                console.log(`✅ Removed ${result.reviewsRemoved} orphaned reviews.`);
            }
        }
    } catch (error) {
        console.error('❌ Error cleaning data:', (error as Error).message);
        process.exit(1);
    }
}

async function handleExport() {
    const globalOnly = args.includes('--global');
    const formatArg = args.find(a => a !== '--global' && a !== 'export');
    const format = formatArg?.toLowerCase() || 'md';
    const decisions = globalOnly ? await listGlobalDecisions() : await listDecisions();

    if (decisions.length === 0) {
        console.error('No decisions to export.');
        return;
    }

    let output: string;

    switch (format) {
        case 'json':
            output = JSON.stringify(decisions, null, 2);
            break;

        case 'csv':
            output = exportToCSV(decisions);
            break;

        case 'md':
        case 'markdown':
        default:
            output = exportToMarkdown(decisions);
            break;
    }

    console.log(output);
}

function exportToMarkdown(decisions: DecisionNode[]): string {
    const grouped = new Map<string, DecisionNode[]>();

    for (const d of decisions) {
        const scope = d.scope.charAt(0).toUpperCase() + d.scope.slice(1);
        if (!grouped.has(scope)) grouped.set(scope, []);
        grouped.get(scope)!.push(d);
    }

    let md = '# Project Decisions\n\n';
    md += `> Generated by DecisionNode on ${new Date().toLocaleDateString()}\n\n`;

    for (const [scope, items] of grouped) {
        md += `## ${scope}\n\n`;
        for (const d of items) {
            md += `### ${d.id}\n\n`;
            md += `**Decision:** ${d.decision}\n\n`;
            if (d.rationale) md += `**Rationale:** ${d.rationale}\n\n`;
            if (d.constraints?.length) {
                md += '**Constraints:**\n';
                d.constraints.forEach(c => md += `- ${c}\n`);
                md += '\n';
            }
            md += `---\n\n`;
        }
    }

    return md;
}

function exportToCSV(decisions: DecisionNode[]): string {
    const headers = ['id', 'scope', 'decision', 'rationale', 'constraints', 'status', 'createdAt'];
    const rows = decisions.map(d => [
        d.id,
        d.scope,
        `"${d.decision.replace(/"/g, '""')}"`,
        d.rationale ? `"${d.rationale.replace(/"/g, '""')}"` : '',
        (d.constraints || []).join('; '),
        d.status,
        d.createdAt
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

async function handleMarketplace() {
    const subCommand = args[1];
    const { getMarketplaceIndex, searchMarketplace, installPack } = await import('./marketplace.js');

    switch (subCommand) {
        case 'browse':
        case undefined: {
            console.log('\n📚 Decision Pack Marketplace\n');
            const packs = await getMarketplaceIndex();

            for (const pack of packs) {
                console.log(`📦 ${pack.name} (${pack.id})`);
                console.log(`   ${pack.description}`);
                console.log(`   Scope: ${pack.scope} | ${pack.decisionCount} decisions | ⬇ ${pack.downloads}`);
                console.log('');
            }
            console.log('Install: decide marketplace install <pack-id>');
            break;
        }

        case 'search': {
            const query = args[2];
            if (!query) {
                console.log('Usage: decide marketplace search <query>');
                return;
            }

            console.log(`\n🔍 Searching for "${query}"...\n`);
            const results = await searchMarketplace(query);

            if (results.length === 0) {
                console.log('No packs found.');
                return;
            }

            for (const pack of results) {
                console.log(`📦 ${pack.name} (${pack.id})`);
                console.log(`   ${pack.description}`);
                console.log('');
            }
            break;
        }

        case 'install': {
            const packId = args[2];
            if (!packId) {
                console.log('Usage: decide marketplace install <pack-id>');
                return;
            }

            console.log(`\n📥 Installing ${packId}...\n`);

            try {
                const result = await installPack(packId);
                console.log(`✅ Installed ${result.installed} decisions`);
                if (result.skipped > 0) {
                    console.log(`⚠️  Skipped ${result.skipped} duplicates`);
                }
                console.log('\nPre-embedded vectors included - no sync needed!');
            } catch (error) {
                console.log(`❌ ${(error as Error).message}`);
            }
            break;
        }

        default:
            console.log('Usage: decide marketplace [browse|search|install]');
    }
}

async function handleProjects() {
    console.log('\n📂 Available Projects\n');

    // Show global decisions first
    const globalDecisions = await listGlobalDecisions();
    if (globalDecisions.length > 0) {
        const globalScopes = await getGlobalScopes();
        console.log(`🌐 Global (shared across all projects)`);
        console.log(`   ${globalDecisions.length} decisions [${globalScopes.join(', ')}]`);
        console.log('');
    }

    const projects = await listProjects();

    if (projects.length === 0 && globalDecisions.length === 0) {
        console.log('No projects found.');
        console.log('\nCreate decisions with: decide add');
        return;
    }

    for (const project of projects) {
        const scopeStr = project.scopes.length > 0 ? `[${project.scopes.join(', ')}]` : '';
        console.log(`📦 ${project.name}`);
        console.log(`   ${project.decisionCount} decisions ${scopeStr}`);
        console.log('');
    }

    console.log(`Total: ${projects.length} projects${globalDecisions.length > 0 ? ` + global (${globalDecisions.length} decisions)` : ''}`);
}

/**
 * Handle login command - authenticate with DecisionNode
 */
async function handleLogin(): Promise<void> {
    const status = await getCloudStatus();

    if (status.authenticated) {
        console.log(`\n✅ Already logged in as ${status.username || status.email || 'Unknown'}`);
        console.log(`   Subscription: ${status.isPro ? '⭐ Pro' : 'Free'}`);
        console.log('\n   Run "decide logout" to sign out first.\n');
        return;
    }

    await loginToCloud();
}

/**
 * Handle logout command - sign out from DecisionNode
 */
async function handleLogout(): Promise<void> {
    await logoutFromCloud();
}

/**
 * Handle status command - show account and subscription status
 */
async function handleStatus(): Promise<void> {
    const status = await getCloudStatus();

    console.log('\n📊 DecisionNode Status\n');
    console.log('━'.repeat(40));

    if (!status.authenticated) {
        console.log('\n  ❌ Not logged in');
        console.log('\n  Run "decide login" to authenticate.\n');
        return;
    }

    console.log(`\n  👤 Account: ${status.username || status.email || 'Unknown'}`);
    console.log(`  🆔 User ID: ${status.userId || 'Unknown'}`);

    if (status.isPro) {
        console.log(`  ⭐ Subscription: Pro`);
        if (status.expiresAt) {
            const expiresDate = new Date(status.expiresAt);
            const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            console.log(`  📅 Expires: ${expiresDate.toLocaleDateString()} (${daysLeft} days)`);
        }
    } else {
        console.log(`  📦 Subscription: Free`);
        console.log(`\n  💡 Upgrade to Pro for cloud sync and embedding:`);
        console.log(`     https://decisionnode.dev/pricing`);
    }

    if (status.lastSync) {
        console.log(`\n  ☁️  Last sync: ${new Date(status.lastSync).toLocaleString()}`);
    }

    console.log('');
}

/**
 * Handle sync command - intelligent two-way sync (Pro only)
 */
async function handleSync(): Promise<void> {
    const status = await getCloudStatus();

    if (!status.authenticated) {
        console.log('\n❌ Not logged in. Run "decide login" first.\n');
        return;
    }

    if (!status.isPro) {
        console.log('\n❌ Cloud sync requires a Pro subscription.');
        console.log('\n   Upgrade at: https://decisionnode.dev/pricing\n');
        return;
    }

    const pushOnly = args.includes('--push-only');
    const pullOnly = args.includes('--pull-only');

    const cwd = process.cwd();
    const projectName = path.basename(cwd);
    const projectRoot = getProjectRoot();

    console.log(`\n☁️  Syncing decisions...`);
    console.log(`   Project: ${projectName}\n`);

    // Get local and cloud decisions
    const localDecisions = await listDecisions();
    const cloudDecisions = await pullDecisionsFromCloud(projectName) as CloudDecision[] | null;

    if (!cloudDecisions && !pushOnly) {
        console.log('❌ Failed to fetch cloud decisions.\n');
        return;
    }

    // Detect what needs to be done
    const { toPush, toPull, conflicts } = await detectConflicts(
        projectRoot,
        localDecisions.map(d => ({ id: d.id, decision: d.decision, updatedAt: d.updatedAt, scope: d.scope })),
        cloudDecisions || []
    );

    // Report conflicts
    if (conflicts.length > 0) {
        console.log(`⚠️  ${conflicts.length} conflict(s) detected!`);
        console.log('   Run "decide conflicts" to resolve them.\n');
    }

    // Push local changes
    if (!pullOnly && toPush.length > 0) {
        console.log(`⬆️  Pushing ${toPush.length} decision(s)...`);

        // Attach embeddings if available
        const { loadVectorCache } = await import('./ai/rag.js');
        const vectorCache = await loadVectorCache();

        const decisionsToSync = localDecisions
            .filter(d => toPush.includes(d.id))
            .map(d => {
                const entry = vectorCache[d.id];
                const vector = entry ? (Array.isArray(entry) ? entry : entry.vector) : undefined;
                return {
                    ...d,
                    embedding: vector
                };
            });

        const result = await syncDecisionsToCloud(projectName, decisionsToSync);

        if (result) {
            console.log(`   ✅ Pushed: ${result.synced.length}`);
            console.log(`   📊 Embedded: ${result.embedded}`);
            if (result.failed.length > 0) {
                console.log(`   ❌ Failed: ${result.failed.join(', ')}`);
            }

            // Update sync metadata
            await updateSyncMetadata(projectRoot, result.synced, cloudDecisions || []);

            // Log push to history
            if (result.synced.length > 0) {
                await logBatchAction('cloud_push', result.synced, 'cloud');
            }
        }
    } else if (!pullOnly) {
        console.log('⬆️  No local changes to push.');
    }

    // Pull cloud changes
    if (!pushOnly && toPull.length > 0) {
        console.log(`\n⬇️  Pulling ${toPull.length} decision(s) from cloud...`);

        // Group by scope and save
        const updatesByScope: Record<string, DecisionNode[]> = {};
        for (const cloud of toPull) {
            // Skip metadata scope
            if (cloud.scope === 'Sync-metadata') continue;

            const node: DecisionNode = {
                id: cloud.decision_id,
                scope: cloud.scope,
                decision: cloud.decision,
                rationale: cloud.rationale || undefined,
                constraints: cloud.constraints || undefined,
                status: (cloud.status === 'active' || cloud.status === 'deprecated') ? cloud.status : 'active',
                tags: (cloud as any).tags || undefined,
                createdAt: (cloud as any).created_at || new Date().toISOString(),
                updatedAt: cloud.synced_at || undefined,
            };
            if (!updatesByScope[cloud.scope]) updatesByScope[cloud.scope] = [];
            updatesByScope[cloud.scope].push(node);
        }

        // Safe Merge Logic
        for (const [scope, newNodes] of Object.entries(updatesByScope)) {
            // Get CURRENT local items for this scope
            const currentScopeItems = localDecisions.filter(d => d.scope === scope);

            // Merge: Start with existing, map updates over them
            const mergedItems = [...currentScopeItems];

            for (const newNode of newNodes) {
                const index = mergedItems.findIndex(m => m.id === newNode.id);
                if (index >= 0) {
                    // Update existing
                    mergedItems[index] = newNode;
                } else {
                    // Add new
                    mergedItems.push(newNode);
                }
            }

            // Save matched scope
            await saveDecisions({ scope, decisions: mergedItems });

            // Save vectors from cloud directly - NO local generation fallback
            const { loadVectorCache, saveVectorCache } = await import('./ai/rag.js');
            const vectorCache = await loadVectorCache();
            let vectorsUpdated = false;

            for (const newNode of newNodes) {
                const cloudMatch = toPull.find(c => c.decision_id === newNode.id || c.id === newNode.id);

                if (cloudMatch && cloudMatch.embedding) {
                    // Option A: Use Cloud Vector
                    let vector: number[] | null = null;

                    if (typeof cloudMatch.embedding === 'string') {
                        try {
                            vector = JSON.parse(cloudMatch.embedding);
                        } catch {
                            vector = null;
                        }
                    } else if (Array.isArray(cloudMatch.embedding)) {
                        vector = cloudMatch.embedding;
                    }

                    if (vector && Array.isArray(vector)) {
                        vectorCache[newNode.id] = {
                            vector: vector,
                            embeddedAt: new Date().toISOString()
                        };
                        vectorsUpdated = true;
                    }
                }
            }

            if (vectorsUpdated) {
                await saveVectorCache(vectorCache);
            }

            console.log(`   ✅ Pulled: ${scope} (${newNodes.length} updates)`);
        }

        // Update sync metadata for pulled decisions
        const pulledIds = toPull.map(d => d.decision_id);
        await updateSyncMetadata(projectRoot, pulledIds, toPull);

        // Clear pulled items from incoming changes
        await removeIncomingChanges(projectRoot, pulledIds);

        // Log pull to history
        if (pulledIds.length > 0) {
            await logBatchAction('cloud_pull', pulledIds, 'cloud');
        }
    } else if (!pushOnly) {
        console.log('\n⬇️  No cloud-only changes to pull.');
    }

    // Self-Heal: If no changes were made but decisions exist on both sides, 
    // ensure metadata is up to date (fixes missing sync-metadata.json case).
    if (toPush.length === 0 && toPull.length === 0 && conflicts.length === 0) {
        if (localDecisions.length > 0 && cloudDecisions && cloudDecisions.length > 0) {
            // Find intersection
            const cloudIds = new Set(cloudDecisions.map(d => d.decision_id));
            const inSyncIds = localDecisions
                .filter(d => cloudIds.has(d.id))
                .map(d => d.id);

            if (inSyncIds.length > 0) {
                // Determine if metadata file exists or needs update
                // For simplicity, we just update it. It's cheap.
                await updateSyncMetadata(projectRoot, inSyncIds, cloudDecisions);
                // console.log('   🔄 Verified sync metadata.'); // Optional logging
            }
        }
    }

    console.log('\n🎉 Sync complete!\n');
}

/**
 * Handle cloud command - show cloud sync status
 */
async function handleCloud(): Promise<void> {
    const subCommand = args[1];

    if (subCommand === 'status') {
        await handleCloudSyncStatus();
        return;
    }

    // Default: show help
    console.log(`
☁️  DecisionNode Cloud

Commands:
  decide cloud status   Show sync status for current project

Related commands:
  decide login          Log in to your DecisionNode account
  decide logout         Log out
  decide status         Show account status
  decide sync           Sync decisions to cloud (Pro only)
`);
}

/**
 * Handle cloud status - show which decisions are synced
 */
async function handleCloudSyncStatus(): Promise<void> {
    const status = await getCloudStatus();

    if (!status.authenticated) {
        console.log('\n❌ Not logged in. Run "decide login" first.\n');
        return;
    }

    if (!status.isPro) {
        console.log('\n❌ Cloud sync requires a Pro subscription.');
        console.log('\n   Upgrade at: https://decisionnode.dev/pricing\n');
        return;
    }

    const cwd = process.cwd();
    const projectName = path.basename(cwd);

    console.log(`\n☁️  Cloud Sync Status: ${projectName}\n`);
    console.log('━'.repeat(40));

    // Get local decisions
    const localDecisions = await listDecisions();

    // Get synced decisions from cloud
    const cloudStatus = await getCloudSyncStatus(projectName);

    if (!cloudStatus) {
        console.log('\n  Unable to fetch cloud status.\n');
        return;
    }

    const syncedIds = new Set(cloudStatus.synced);
    const notSynced: string[] = [];

    for (const decision of localDecisions) {
        if (!syncedIds.has(decision.id)) {
            notSynced.push(decision.id);
        }
    }

    console.log(`\n  📁 Local decisions: ${localDecisions.length}`);
    console.log(`  ☁️  In cloud: ${cloudStatus.total_in_cloud}`);

    if (notSynced.length === 0) {
        console.log(`\n  ✅ All decisions are synced!\n`);
    } else {
        console.log(`\n  ⚠️  Not synced (${notSynced.length}):`);
        for (const id of notSynced.slice(0, 10)) {
            console.log(`     - ${id}`);
        }
        if (notSynced.length > 10) {
            console.log(`     ... and ${notSynced.length - 10} more`);
        }
        console.log(`\n  Run "decide sync" to sync all decisions.\n`);
    }
}

/**
 * Handle pull command - pull decisions from cloud
 */
async function handlePull(): Promise<void> {
    console.log('\n☁️  Pulling decisions from cloud...\n');

    const cwd = process.cwd();
    const projectName = path.basename(cwd);
    const projectRoot = getProjectRoot();

    // 1. Get local decisions
    const localDecisions = await listDecisions();

    // 2. Get cloud decisions
    const cloudDecisions = await pullDecisionsFromCloud(projectName) as CloudDecision[] | null;

    if (!cloudDecisions) {
        console.log('❌ Failed to pull decisions.');
        console.log('   Check if you are logged in (decide login) and have a Pro subscription.');
        return;
    }

    if (cloudDecisions.length === 0) {
        console.log('✅ No decisions found in cloud for this project.');
        return;
    }

    console.log(`Cloud has ${cloudDecisions.length} decisions.`);
    console.log('🔍 Checking for conflicts...');

    // 3. Detect conflicts
    const { conflicts, toPull } = await detectConflicts(
        projectRoot,
        localDecisions.map(d => ({ id: d.id, decision: d.decision, updatedAt: d.updatedAt, scope: d.scope })),
        cloudDecisions
    );

    // 4. Handle Conflicts
    if (conflicts.length > 0) {
        console.log(`\n❌ Aborting pull: ${conflicts.length} conflict(s) detected.`);
        console.log('   These decisions have changed both locally and in the cloud:');
        conflicts.slice(0, 3).forEach(c => console.log(`   - ${c.decisionId} (${c.scope})`));
        if (conflicts.length > 3) console.log(`   ...and ${conflicts.length - 3} more.`);
        console.log('\n👉 Run "decide conflicts" to examine and resolve them safely.');
        return;
    }

    // 5. Check if anything to pull
    if (toPull.length === 0) {
        console.log('\n✅ Local decisions are already up to date with cloud.');
        return;
    }

    console.log(`\n⬇️  Pulling ${toPull.length} new/updated decision(s) from cloud...`);

    // 6. Merge & Save (Safe Update)
    const updatesByScope: Record<string, DecisionNode[]> = {};

    // Group toPull items by scope
    for (const d of toPull) {
        // Skip metadata scope if it accidentally got synced
        if (d.scope === 'Sync-metadata') continue;

        const node: DecisionNode = {
            id: d.decision_id || d.id,
            scope: d.scope,
            decision: d.decision,
            rationale: d.rationale || undefined,
            constraints: d.constraints || undefined,
            status: (d.status === 'active' || d.status === 'deprecated') ? d.status : 'active',
            tags: (d as any).tags || undefined,
            createdAt: (d as any).created_at || new Date().toISOString(),
            updatedAt: d.synced_at || undefined,
        };

        if (!updatesByScope[node.scope]) {
            updatesByScope[node.scope] = [];
        }
        updatesByScope[node.scope].push(node);
    }

    let savedCount = 0;

    // Apply updates scope by scope
    for (const [scope, newNodes] of Object.entries(updatesByScope)) {
        // Get CURRENT local items for this scope
        const currentScopeItems = localDecisions.filter(d => d.scope === scope);

        // Merge: Start with existing, map updates over them
        const mergedItems = [...currentScopeItems];

        for (const newNode of newNodes) {
            const index = mergedItems.findIndex(m => m.id === newNode.id);
            if (index >= 0) {
                // Update existing
                mergedItems[index] = newNode;
            } else {
                // Add new
                mergedItems.push(newNode);
            }
        }

        // Save matched scope
        await saveDecisions({
            scope: scope,
            decisions: mergedItems
        });

        // Save vectors from cloud directly, OR fallback to local embedding
        const { loadVectorCache, saveVectorCache, embedDecisions } = await import('./ai/rag.js');
        const vectorCache = await loadVectorCache();
        let vectorsUpdated = false;
        const nodesToAutoEmbed: DecisionNode[] = [];

        for (const newNode of newNodes) {
            const cloudMatch = toPull.find(c => c.decision_id === newNode.id || c.id === newNode.id);

            if (cloudMatch && cloudMatch.embedding) {
                // Option A: Use Cloud Vector
                let vector: number[] | null = null;

                if (typeof cloudMatch.embedding === 'string') {
                    try {
                        vector = JSON.parse(cloudMatch.embedding);
                    } catch {
                        vector = null;
                    }
                } else if (Array.isArray(cloudMatch.embedding)) {
                    vector = cloudMatch.embedding;
                }

                if (vector && Array.isArray(vector)) {
                    vectorCache[newNode.id] = {
                        vector: vector,
                        embeddedAt: new Date().toISOString()
                    };
                    vectorsUpdated = true;
                } else {
                    // Invalid vector format - fallback
                    nodesToAutoEmbed.push(newNode);
                }
            } else {
                // Option B: Cloud has no vector? Fallback to local gen
                nodesToAutoEmbed.push(newNode);
            }
        }

        if (vectorsUpdated) {
            await saveVectorCache(vectorCache);
        }

        // Fallback: Embed any nodes that didn't have cloud vectors
        if (nodesToAutoEmbed.length > 0) {
            console.log(`   ⚠️  ${nodesToAutoEmbed.length} decisions missing cloud vectors. Generating locally...`);
            await embedDecisions(nodesToAutoEmbed);
        }

        savedCount += newNodes.length;
        console.log(`   ✅ Updated ${scope} (+${newNodes.length} changes)`);
    }

    // Also handle scopes that are NEW (no local file yet)
    // The previous loop only handles updates where 'updatesByScope' has keys.

    // 7. Update Sync Metadata
    // This ensures VS Code and CLI know these files are now in sync
    await updateSyncMetadata(
        projectRoot,
        toPull.map(d => d.decision_id),
        cloudDecisions
    );

    // 8. Clear pulled items from incoming changes (fetch state)
    const { removeIncomingChanges } = await import('./cloud.js');
    await removeIncomingChanges(projectRoot, toPull.map(d => d.decision_id));

    console.log(`\n🎉 Pull complete. Updated ${savedCount} decisions.`);
}

/**
 * Handle conflicts command - list and resolve sync conflicts
 * Usage: decide conflicts [resolve <id> <local|cloud>]
 */
async function handleConflicts(): Promise<void> {
    const subCommand = args[1];
    const projectRoot = getProjectRoot();

    // Handle non-interactive 'resolve' subcommand (for VS Code integration)
    if (subCommand === 'resolve') {
        const decisionId = args[2];
        const resolution = args[3] as 'local' | 'cloud';

        if (!decisionId || !resolution) {
            console.error('❌ Usage: decide conflicts resolve <decision-id> <local|cloud>');
            process.exit(1);
        }

        if (resolution !== 'local' && resolution !== 'cloud') {
            console.error('❌ Resolution must be "local" or "cloud"');
            process.exit(1);
        }

        // Load incoming.json to get conflicts
        const incomingPath = path.join(projectRoot, 'incoming.json');
        let data: { conflicts?: SyncConflict[] } = { conflicts: [] };

        try {
            const content = await fs.readFile(incomingPath, 'utf-8');
            data = JSON.parse(content);
        } catch {
            // No incoming file
        }

        const conflicts = data.conflicts || [];
        const conflict = conflicts.find(c => c.decisionId === decisionId);

        if (!conflict) {
            console.error(`❌ No conflict found for decision: ${decisionId}`);
            process.exit(1);
        }

        // If cloud wins, update local decision
        if (resolution === 'cloud') {
            const updated = await updateDecision(decisionId, {
                decision: conflict.cloudDecision,
                updatedAt: new Date().toISOString()
            });
            if (!updated) {
                console.error(`❌ Failed to update local decision: ${decisionId}`);
                process.exit(1);
            }
        }

        // Resolve conflict in metadata
        await resolveConflict(
            projectRoot,
            decisionId,
            resolution,
            resolution === 'cloud' ? {
                id: '',
                user_id: '',
                project_name: '',
                decision_id: decisionId,
                scope: conflict.scope,
                decision: conflict.cloudDecision,
                rationale: null,
                constraints: null,
                status: 'active',
                synced_at: new Date().toISOString(),
                updated_at: conflict.cloudUpdatedAt
            } as CloudDecision : undefined
        );

        // Remove conflict from incoming.json
        await removeIncomingChanges(projectRoot, [decisionId]);

        // If local wins, push to cloud to make it the source of truth
        if (resolution === 'local') {
            const decision = await getDecisionById(decisionId);
            if (decision) {
                const projectName = path.basename(projectRoot);
                console.log('   ⬆️  Pushing local version to cloud...');
                await syncDecisionsToCloud(projectName, [decision]);
            }
        }

        console.log(`\n✅ Conflict resolved: ${decisionId}`);
        console.log(`   Accepted: ${resolution} version\n`);

        // Log conflict resolution to history
        await logAction('conflict_resolved', decisionId, `Conflict resolved: accepted ${resolution} (${decisionId})`, 'cloud');
        return;
    }

    // Default: Interactive conflict resolution
    const status = await getCloudStatus();

    if (!status.authenticated) {
        console.log('\n❌ Not logged in. Run "decide login" first.\n');
        return;
    }

    if (!status.isPro) {
        console.log('\n❌ Cloud sync requires a Pro subscription.');
        console.log('\n   Upgrade at: https://decisionnode.dev/pricing\n');
        return;
    }

    const cwd = process.cwd();
    const projectName = path.basename(cwd);

    console.log('\n⚠️  Checking for conflicts...\n');

    // Get local and cloud decisions
    const localDecisions = await listDecisions();
    const cloudDecisions = await pullDecisionsFromCloud(projectName) as CloudDecision[] | null;

    if (!cloudDecisions) {
        console.log('❌ Failed to fetch cloud decisions.');
        return;
    }

    // Detect conflicts
    const { conflicts } = await detectConflicts(
        projectRoot,
        localDecisions.map(d => ({ id: d.id, decision: d.decision, updatedAt: d.updatedAt, scope: d.scope })),
        cloudDecisions
    );

    if (conflicts.length === 0) {
        console.log('✅ No conflicts found! Everything is in sync.\n');
        return;
    }

    console.log(`Found ${conflicts.length} conflict(s):\n`);
    console.log('━'.repeat(60));

    for (let i = 0; i < conflicts.length; i++) {
        const conflict = conflicts[i];
        const cloudDecision = cloudDecisions.find(d => d.decision_id === conflict.decisionId);

        console.log(`\n${i + 1}. ${conflict.decisionId} (${conflict.scope})`);
        console.log('─'.repeat(40));
        console.log(`   📁 Local:  "${conflict.localDecision.substring(0, 50)}${conflict.localDecision.length > 50 ? '...' : ''}"`);
        console.log(`      Updated: ${conflict.localUpdatedAt ? new Date(conflict.localUpdatedAt).toLocaleString() : 'Unknown'}`);
        console.log(`   ☁️  Cloud:  "${conflict.cloudDecision.substring(0, 50)}${conflict.cloudDecision.length > 50 ? '...' : ''}"`);
        console.log(`      Updated: ${new Date(conflict.cloudUpdatedAt).toLocaleString()}`);

        const choice = await prompt('\n   [L]ocal or [C]loud? ');
        const resolution = choice.toLowerCase().startsWith('l') ? 'local' : 'cloud';

        if (resolution === 'local') {
            // Keep local version - mark for push
            await resolveConflict(projectRoot, conflict.decisionId, 'local');
            console.log('   ✅ Keeping local version (will push on next sync)');
        } else {
            // Use cloud version - update local
            if (cloudDecision) {
                await resolveConflict(projectRoot, conflict.decisionId, 'cloud', cloudDecision);
                // Update local decision with cloud data
                await updateDecision(conflict.decisionId, {
                    decision: cloudDecision.decision,
                    rationale: cloudDecision.rationale || undefined,
                    constraints: cloudDecision.constraints || undefined,
                    status: cloudDecision.status as 'active' | 'deprecated',
                });
                console.log('   ✅ Updated to cloud version');
            }
        }
    }

    console.log('\n🎉 All conflicts resolved!\n');
}

/**
 * Handle fetch command - check for cloud updates without applying them
 */
async function handleFetch(): Promise<void> {
    const status = await getCloudStatus();

    if (!status.authenticated) {
        console.log('\n❌ Not logged in. Run "decide login" first.\n');
        return;
    }

    if (!status.isPro) {
        console.log('\n❌ Cloud sync requires a Pro subscription.');
        console.log('\n   Upgrade at: https://decisionnode.dev/pricing\n');
        return;
    }

    console.log('\n🔍 Fetching updates from cloud... (no changes will be applied)\n');

    const cwd = process.cwd();
    const projectName = path.basename(cwd);
    const projectRoot = getProjectRoot();

    // 1. Get local decisions
    const localDecisions = await listDecisions();

    // 2. Get cloud decisions
    const cloudDecisions = await pullDecisionsFromCloud(projectName) as CloudDecision[] | null;

    if (!cloudDecisions) {
        console.log('❌ Failed to fetch cloud decisions.');
        return;
    }

    // 3. Detect conflicts/updates
    const { toPull, conflicts } = await detectConflicts(
        projectRoot,
        localDecisions.map(d => ({ id: d.id, decision: d.decision, updatedAt: d.updatedAt, scope: d.scope })),
        cloudDecisions
    );

    // 4. Save results to incoming.json
    await saveIncomingChanges(projectRoot, { toPull, conflicts });

    // 5. Report status
    if (toPull.length === 0 && conflicts.length === 0) {
        console.log('✅ Local decisions are up to date.');
    } else {
        if (toPull.length > 0) {
            console.log(`⬇️  ${toPull.length} incoming change(s) available.`);
            toPull.slice(0, 3).forEach(d => console.log(`   - ${d.decision_id} (${d.scope})`));
            if (toPull.length > 3) console.log(`     ...and ${toPull.length - 3} more`);
        }

        if (conflicts.length > 0) {
            console.log(`\n⚠️  ${conflicts.length} conflict(s) detected.`);
        }

        console.log('\n👉 Run "decide sync --pull-only" to apply changes.');
    }
}

function printUsage() {
    console.log(`
DecisionNode CLI

Usage:
  decide <command> [options]

Commands:
  init                  Initialize DecisionNode in current project
  setup                 Configure Gemini API key
  list [--scope <s>]    List all decisions (includes global)
  list --global         List only global decisions
  get <id>              View a decision
  search "<query>"      Semantic search (includes global)

  add                   Add a new decision interactively (auto-embeds)
  add -s <scope> -d <decision> [-r <rationale>] [-c <constraints>]
                        Add a decision in one command
  add --global          Add a global decision (applies to all projects)
  edit <id>             Edit a decision (auto-embeds)
  deprecate <id>        Deprecate a decision (hides from search)
  activate <id>         Re-activate a deprecated decision
  delete <id>           Delete a decision permanently

  import <file.json>    Import decisions from JSON (auto-embeds)
  import <file> --global  Import into global decisions
  export [format]       Export decisions (md, json, csv)
  export --global       Export global decisions
  check                 Show which decisions are missing embeddings
  embed                 Embed any unembedded decisions
  clean                 Remove orphaned vectors and reviews
  history [entry-id]    View activity log or snapshot

  projects              List all available projects
  config                View/set configuration
  delete-scope <scope>  Delete all decisions in a scope

Global decision IDs use the "global:" prefix (e.g., global:ui-001).
Use this prefix with get, edit, and delete commands.

Examples:
  decide init
  decide add
  decide add --global
  decide search "What font should I use?"
  decide list --global
  decide get global:ui-001
  decide edit global:ui-001
`);
}

/**
 * Handle config command - view or set configuration options
 */
async function handleConfig(): Promise<void> {
    const subCommand = args[1];
    const value = args[2];

    if (!subCommand) {
        // Show current config
        const sensitivity = getSearchSensitivity();
        console.log('\n⚙️  DecisionNode Configuration\n');
        console.log(`  search-sensitivity: ${sensitivity}`);
        console.log('\n  Options:');
        console.log('    search-sensitivity  high|medium');
        console.log('\n  Usage: decide config <option> <value>');
        return;
    }

    if (subCommand === 'search-sensitivity') {
        if (!value) {
            const current = getSearchSensitivity();
            console.log(`\n🔍 Current search-sensitivity: ${current}`);
            console.log('\nUsage: decide config search-sensitivity <high|medium>');
            return;
        }

        if (value !== 'high' && value !== 'medium') {
            console.error('❌ Invalid value. Use "high" or "medium"');
            process.exit(1);
        }

        setSearchSensitivity(value as SearchSensitivity);
        console.log(`\n✅ Search sensitivity set to: ${value}`);

        if (value === 'high') {
            console.log('   AI will be REQUIRED to search decisions before any code changes.');
        } else {
            console.log('   AI will check decisions for significant changes only.');
        }
        console.log('\n💡 Refresh your MCP Server Config for changes to take effect.');
        return;
    }

    console.error(`❌ Unknown config option: ${subCommand}`);
    console.log('Available options: search-sensitivity, auto-sync');
    process.exit(1);
}

main();
