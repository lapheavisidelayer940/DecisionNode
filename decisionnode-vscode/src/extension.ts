import * as vscode from 'vscode';
import { DecisionTreeProvider } from './providers/DecisionTreeProvider';
import { CommitTimelineProvider } from './providers/CommitTimelineProvider';
import { CloudSyncProvider } from './providers/CloudSyncProvider';
import { DecisionDetailPanel } from './views/DecisionDetailPanel';
import { ConflictDiffPanel } from './views/ConflictDiffPanel';
import { CommitDiffPanel } from './views/CommitDiffPanel';
import { runSetupWizard } from './commands/setup';
import { execSync } from 'child_process';
import { getUnreviewedCount, markAsReviewed } from './core/store';

export function activate(context: vscode.ExtensionContext) {
    console.log('DecisionNode extension activated');

    // Register tree providers
    const decisionTreeProvider = new DecisionTreeProvider();
    const commitTimelineProvider = new CommitTimelineProvider();
    const cloudSyncProvider = new CloudSyncProvider(context.extensionUri);

    // Use createTreeView to get TreeView instance for badge support
    const decisionTreeView = vscode.window.createTreeView('decisionTree', {
        treeDataProvider: decisionTreeProvider
    });
    vscode.window.registerTreeDataProvider('commitTimeline', commitTimelineProvider);
    vscode.window.registerTreeDataProvider('cloudSync', cloudSyncProvider);

    // Function to update badge count
    const updateBadge = () => {
        const count = getUnreviewedCount();
        decisionTreeView.badge = count > 0
            ? { value: count, tooltip: `${count} unreviewed decision${count !== 1 ? 's' : ''}` }
            : undefined;
    };

    // Initial badge update
    updateBadge();

    // Watch for file changes to update tree view in real-time
    const setupFileWatcher = async () => {
        const { getProjectRoot } = await import('./core/store');
        const projectRoot = getProjectRoot();
        if (projectRoot) {
            // Watch for JSON changes in the decisions directory
            // Note: Since projectRoot is external to workspace, we use a global pattern if needed, 
            // but RelativePattern works best if we treat it as a base.
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(projectRoot, '**/*.json')
            );

            // Debounce refresh
            let timeout: NodeJS.Timeout;
            const debouncedRefresh = () => {
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(() => {
                    decisionTreeProvider.refresh();
                    cloudSyncProvider.refresh();
                    commitTimelineProvider.refresh();
                    updateBadge();
                }, 500);
            };

            watcher.onDidChange(debouncedRefresh);
            watcher.onDidCreate(debouncedRefresh);
            watcher.onDidDelete(debouncedRefresh);

            context.subscriptions.push(watcher);
        }
    };
    setupFileWatcher();

    // Register commands
    context.subscriptions.push(
        decisionTreeView,

        vscode.commands.registerCommand('decisionnode.refresh', () => {
            decisionTreeProvider.refresh();
            commitTimelineProvider.refresh();
            updateBadge();
        }),

        vscode.commands.registerCommand('decisionnode.viewDecision', (decision) => {
            // Mark as reviewed when user views it
            if (decision?.id) {
                markAsReviewed(decision.id);
                updateBadge();
                decisionTreeProvider.refresh(); // Refresh to update visual indicator
            }
            DecisionDetailPanel.show(context.extensionUri, decision);
        }),

        vscode.commands.registerCommand('decisionnode.viewCommit', (commit) => {
            CommitDiffPanel.show(context.extensionUri, commit);
        }),

        vscode.commands.registerCommand('decisionnode.checkout', async (commitItem) => {
            const result = await vscode.window.showWarningMessage(
                `Checkout commit ${commitItem.commitId}? This will restore decisions to that point.`,
                'Checkout',
                'Cancel'
            );
            if (result === 'Checkout') {
                try {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    if (workspaceFolder) {
                        execSync(`npx decide checkout ${commitItem.commitId}`, { cwd: workspaceFolder });
                        vscode.window.showInformationMessage(`Checked out ${commitItem.commitId}`);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Checkout failed: ${(error as Error).message}`);
                }
                decisionTreeProvider.refresh();
                commitTimelineProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('decisionnode.setup', () => {
            runSetupWizard();
        }),


        // Edit decision command
        vscode.commands.registerCommand('decisionnode.editDecision', async (item) => {
            const decision = item?.decision || item;
            if (!decision?.id) {
                vscode.window.showErrorMessage('No decision selected');
                return;
            }

            const terminal = vscode.window.terminals.find(t => t.name === 'DecisionNode') || vscode.window.createTerminal('DecisionNode');
            terminal.show();
            terminal.sendText(`npx decide edit ${decision.id}`);
        }),

        // Delete decision command
        vscode.commands.registerCommand('decisionnode.deleteDecision', async (item) => {
            const decision = item?.decision || item;
            if (!decision?.id) {
                vscode.window.showErrorMessage('No decision selected');
                return;
            }

            const terminal = vscode.window.terminals.find(t => t.name === 'DecisionNode') || vscode.window.createTerminal('DecisionNode');
            terminal.show();
            terminal.sendText(`npx decide delete ${decision.id}`);
        }),

        // Add decision command
        vscode.commands.registerCommand('decisionnode.addDecision', async (scopeItem) => {
            const scope = await vscode.window.showInputBox({
                title: 'New Decision',
                prompt: 'Scope (e.g., UI, Backend, API)',
                value: scopeItem?.label || '',
                ignoreFocusOut: true
            });

            if (!scope?.trim()) return;

            const decisionText = await vscode.window.showInputBox({
                title: 'New Decision',
                prompt: 'What was decided?',
                ignoreFocusOut: true
            });

            if (!decisionText?.trim()) return;

            const rationale = await vscode.window.showInputBox({
                title: 'Rationale',
                prompt: 'Why was this decided? (optional)',
                ignoreFocusOut: true
            });

            try {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                const fs = await import('fs');
                const path = await import('path');
                const scopeFile = path.join(
                    workspaceFolder,
                    '.decisionnode',
                    '.decisions',
                    vscode.workspace.name || 'default',
                    `${scope.toLowerCase()}.json`
                );

                const dir = path.dirname(scopeFile);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                let content = { scope: scope.trim(), decisions: [] as unknown[] };
                if (fs.existsSync(scopeFile)) {
                    content = JSON.parse(fs.readFileSync(scopeFile, 'utf-8'));
                }

                // Generate next ID
                const prefix = scope.toLowerCase().replace(/[^a-z]/g, '').substring(0, 10);
                let maxNum = 0;
                for (const d of content.decisions as { id: string }[]) {
                    const match = d.id.match(/-(\d+)$/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) maxNum = num;
                    }
                }
                const newId = `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;

                content.decisions.push({
                    id: newId,
                    scope: scope.trim(),
                    decision: decisionText.trim(),
                    rationale: rationale?.trim() || undefined,
                    status: 'active',
                    createdAt: new Date().toISOString()
                });

                fs.writeFileSync(scopeFile, JSON.stringify(content, null, 2));
                vscode.window.showInformationMessage(`Created ${newId}`);
                decisionTreeProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Add failed: ${(error as Error).message}`);
            }
        }),

        // Embed decisions
        vscode.commands.registerCommand('decisionnode.embed', async () => {
            try {
                const { getProjectRoot, getUnembeddedIds } = await import('./core/store');
                const { execSync } = await import('child_process');

                const workspaceFolder = getProjectRoot();
                if (workspaceFolder) {
                    // Check if there's anything to embed first
                    const unembeddedIds = getUnembeddedIds();

                    if (unembeddedIds.size === 0) {
                        vscode.window.showInformationMessage('✅ All decisions are already embedded!');
                        return;
                    }

                    vscode.window.showInformationMessage(`⚡ Embedding ${unembeddedIds.size} decisions...`);
                    execSync(`npx decide embed`, { cwd: workspaceFolder });
                    vscode.window.showInformationMessage('✅ Decisions embedded!');
                    decisionTreeProvider.refresh();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Embedding failed: ${(error as Error).message}`);
            }
        }),



        // Reveal scope file in explorer
        vscode.commands.registerCommand('decisionnode.revealFile', async (item) => {
            const scopeName = item?.label?.toString().toLowerCase();
            if (!scopeName) return;

            const { getProjectRoot } = await import('./core/store');
            const projectRoot = getProjectRoot();
            if (!projectRoot) return;

            const filePath = vscode.Uri.file(`${projectRoot}/${scopeName}.json`);
            vscode.commands.executeCommand('revealFileInOS', filePath);
        }),

        // Filter History
        vscode.commands.registerCommand('decisionnode.filterHistory', async () => {
            const options = [
                { label: 'All Activity', description: 'Show all history events', picked: commitTimelineProvider.getFilter() === 'all' },
                { label: 'Cloud Sync', description: 'Show only cloud push/pull events', value: 'cloud', picked: commitTimelineProvider.getFilter() === 'cloud' },
                { label: 'CLI', description: 'Show only CLI commands', value: 'cli', picked: commitTimelineProvider.getFilter() === 'cli' },
                { label: 'MCP', description: 'Show only AI/MCP actions', value: 'mcp', picked: commitTimelineProvider.getFilter() === 'mcp' },
                { label: 'Marketplace', description: 'Show only marketplace installs', value: 'marketplace', picked: commitTimelineProvider.getFilter() === 'marketplace' }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Filter History by Source',
                title: 'Filter Activity Log'
            });

            if (selected) {
                const filter = (selected as any).value || 'all';
                commitTimelineProvider.setFilter(filter);
            }
        }),

        // Delete entire scope (runs CLI in terminal for confirmation)
        vscode.commands.registerCommand('decisionnode.deleteScope', async (item) => {
            const scopeName = item?.label?.toString();
            if (!scopeName) {
                vscode.window.showErrorMessage('No scope selected');
                return;
            }

            // Extract just the scope name (remove any count suffix like "(5)")
            const cleanScopeName = scopeName.replace(/\s*\(\d+\)$/, '').trim();

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            // Create or get terminal and run the delete-scope command
            // This allows user to see confirmation prompt and type scope name
            const terminal = vscode.window.createTerminal('Delete Scope');
            terminal.show();
            terminal.sendText(`npx decide delete-scope ${cleanScopeName}`);
        }),

        // Cloud Sync command
        vscode.commands.registerCommand('decisionnode.cloudSync', async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            try {
                vscode.window.showInformationMessage('🔄 Syncing decisions (Push & Pull)...');
                execSync('npx decide sync', { cwd: workspaceFolder });
                vscode.window.showInformationMessage('✅ Cloud sync complete!');
                cloudSyncProvider.refresh();
                decisionTreeProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Sync failed: ${error}`);
            }
        }),

        // Cloud Fetch command
        vscode.commands.registerCommand('decisionnode.fetch', async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Fetching updates from cloud...",
                    cancellable: false
                }, async () => {
                    execSync('npx decide fetch', { cwd: workspaceFolder });
                    cloudSyncProvider.refresh();
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Fetch failed: ${error}`);
            }
        }),

        // Cloud Pull command
        vscode.commands.registerCommand('decisionnode.cloudPull', async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            try {
                vscode.window.showInformationMessage('⬇️ Pulling decisions from cloud...');
                execSync('npx decide sync --pull-only', { cwd: workspaceFolder });
                vscode.window.showInformationMessage('✅ Pull complete!');
                cloudSyncProvider.refresh();
                decisionTreeProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Pull failed: ${error}`);
            }
        }),

        // Cloud Push command
        vscode.commands.registerCommand('decisionnode.cloudPush', async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            try {
                vscode.window.showInformationMessage('⬆️ Pushing decisions to cloud...');
                execSync('npx decide sync --push-only', { cwd: workspaceFolder });
                vscode.window.showInformationMessage('✅ Push complete!');
                cloudSyncProvider.refresh();
                decisionTreeProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Push failed: ${error}`);
            }
        }),

        // View Cloud Decision
        vscode.commands.registerCommand('decisionnode.viewCloudDecision', (cloudDecision: any) => {
            if (!cloudDecision) return;

            // Map CloudDecision to DecisionNode format
            const decision: any = {
                id: cloudDecision.decision_id || cloudDecision.id,
                scope: cloudDecision.scope,
                decision: cloudDecision.decision,
                rationale: cloudDecision.rationale,
                constraints: cloudDecision.constraints,
                status: cloudDecision.status || 'active',
                createdAt: cloudDecision.created_at || cloudDecision.updated_at || new Date().toISOString(),
                updatedAt: cloudDecision.updated_at
            };

            DecisionDetailPanel.show(context.extensionUri, decision, 'Incoming Decision');
        }),

        // View Conflict command
        vscode.commands.registerCommand('decisionnode.viewConflict', (conflict: any) => {
            if (!conflict) return;
            ConflictDiffPanel.show(context.extensionUri, conflict);
        }),

        // Resolve Conflict command (called from ConflictDiffPanel)
        vscode.commands.registerCommand('decisionnode.resolveConflict', async (decisionId: string, resolution: 'local' | 'cloud') => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            try {
                // Use CLI to resolve conflict
                execSync(`npx decide conflicts resolve ${decisionId} ${resolution}`, { cwd: workspaceFolder });
                vscode.window.showInformationMessage(`✅ Accepted ${resolution} version for ${decisionId}`);
                cloudSyncProvider.refresh();
                decisionTreeProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Resolution failed: ${error}`);
            }
        }),

        // Webview Serializer to prevent restoration of empty panels on reload
        vscode.window.registerWebviewPanelSerializer('decisionDetail', {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                webviewPanel.dispose();
            }
        }),

        // Serializer for conflict diff panel
        vscode.window.registerWebviewPanelSerializer('conflictDiff', {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                webviewPanel.dispose();
            }
        })
    );
}

export function deactivate() { }
