import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getProjectRoot, getDecisions, DecisionNode, getUnembeddedIds, findSimilarDecisions, getUnreviewedIds } from '../core/store';

export class DecisionTreeProvider implements vscode.TreeDataProvider<DecisionTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<DecisionTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: DecisionTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DecisionTreeItem): Promise<DecisionTreeItem[]> {
        const projectRoot = getProjectRoot();

        if (!projectRoot || !fs.existsSync(projectRoot)) {
            return [new DecisionTreeItem('No decisions found', 'info', vscode.TreeItemCollapsibleState.None)];
        }

        if (!element) {
            // Root level: show scopes
            return this.getScopes(projectRoot);
        } else if (element.contextValue === 'scope') {
            // Scope level: show decisions in that scope
            return this.getDecisionsForScope(projectRoot, element.label as string);
        }

        return [];
    }

    private async getScopes(projectRoot: string): Promise<DecisionTreeItem[]> {
        try {
            const files = fs.readdirSync(projectRoot);
            const scopes = files
                .filter(f => f.endsWith('.json') && f !== 'vectors.json' && f !== 'reviewed.json' && f !== 'incoming.json' && f !== 'sync-metadata.json')
                .map(f => f.replace('.json', ''));

            // Check for unembedded decisions
            const unembeddedIds = getUnembeddedIds();
            const unembeddedCount = unembeddedIds.size;

            const items: DecisionTreeItem[] = [];

            // Add embed status banner if there are unembedded decisions
            if (unembeddedCount > 0) {
                const embedBanner = new DecisionTreeItem(
                    `⚠️ ${unembeddedCount} decision${unembeddedCount > 1 ? 's' : ''} not embedded`,
                    'embed-banner',
                    vscode.TreeItemCollapsibleState.None
                );
                embedBanner.iconPath = new vscode.ThemeIcon('zap', new vscode.ThemeColor('charts.orange'));
                embedBanner.tooltip = `${unembeddedCount} decision${unembeddedCount > 1 ? 's' : ''} need embedding for AI search.\n\nRun in terminal:\n  decide embed\n\nOr click the ⚡ button above.`;
                embedBanner.description = 'run: decide embed';
                embedBanner.command = {
                    command: 'decisionnode.embed',
                    title: 'Embed Decisions'
                };
                items.push(embedBanner);
            }

            // Add scope folders
            for (const scope of scopes) {
                // Count unembedded and unreviewed in this scope
                const scopeFilePath = path.join(projectRoot, `${scope}.json`);
                let scopeUnembeddedCount = 0;
                let scopeUnreviewedCount = 0;
                try {
                    const content = fs.readFileSync(scopeFilePath, 'utf-8');
                    const collection = JSON.parse(content);
                    const unreviewedIds = getUnreviewedIds(); // Get set of unreviewed IDs
                    for (const d of collection.decisions) {
                        if (unembeddedIds.has(d.id)) {
                            scopeUnembeddedCount++;
                        }
                        if (unreviewedIds.has(d.id)) {
                            scopeUnreviewedCount++;
                        }
                    }
                } catch { }

                const item = new DecisionTreeItem(
                    scope.charAt(0).toUpperCase() + scope.slice(1),
                    'scope',
                    vscode.TreeItemCollapsibleState.Collapsed
                );

                // Icon logic: Unreviewed takes priority over standard folder
                if (scopeUnreviewedCount > 0) {
                    item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
                } else {
                    item.iconPath = new vscode.ThemeIcon('folder');
                }

                // Description logic
                const parts: string[] = [];
                if (scopeUnembeddedCount > 0) parts.push(`${scopeUnembeddedCount} not embedded`);
                if (scopeUnreviewedCount > 0) parts.push(`${scopeUnreviewedCount} new`);

                if (parts.length > 0) {
                    item.description = parts.join(', ');
                }

                items.push(item);
            }

            return items;
        } catch {
            return [];
        }
    }

    private async getDecisionsForScope(projectRoot: string, scope: string): Promise<DecisionTreeItem[]> {
        try {
            const filePath = path.join(projectRoot, `${scope.toLowerCase()}.json`);
            console.error(`[DecisionNode] Loading decisions from: ${filePath}`);
            const content = fs.readFileSync(filePath, 'utf-8');
            const collection = JSON.parse(content);

            // Get unembedded decision IDs
            const unembeddedIds = getUnembeddedIds();

            return collection.decisions.map((decision: DecisionNode) => {
                const isUnembedded = unembeddedIds.has(decision.id);
                const similarDecisions = findSimilarDecisions(decision.id, 0.85);
                const hasConflicts = similarDecisions.length > 0;
                const unreviewedIds = getUnreviewedIds();
                const isUnreviewed = unreviewedIds.has(decision.id);

                const item = new DecisionTreeItem(
                    `${decision.id}: ${decision.decision.substring(0, 40)}...`,
                    'decision',
                    vscode.TreeItemCollapsibleState.None,
                    decision,
                    isUnembedded,
                    isUnreviewed
                );

                // Icon priority: unembedded > unreviewed > conflict > status
                if (isUnembedded) {
                    item.iconPath = new vscode.ThemeIcon('zap', new vscode.ThemeColor('charts.orange'));
                    item.description = 'not embedded';
                } else if (isUnreviewed) {
                    item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
                    item.description = 'new';
                } else if (hasConflicts) {
                    item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
                    item.description = `${similarDecisions.length} similar`;
                } else {
                    switch (decision.status) {
                        case 'active':
                            item.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
                            break;
                        case 'deprecated':
                            item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
                            break;
                        case 'overridden':
                            item.iconPath = new vscode.ThemeIcon('close', new vscode.ThemeColor('charts.red'));
                            break;
                    }
                }

                // Build tooltip with decision details and conflicts
                let tooltip = decision.decision;
                if (isUnembedded) {
                    tooltip += `\n\n⚠️ Not embedded - run 'decide embed'`;
                }
                if (hasConflicts) {
                    tooltip += `\n\n↔️ Similar decisions:`;
                    for (const similar of similarDecisions.slice(0, 3)) {
                        const pct = Math.round(similar.similarity * 100);
                        tooltip += `\n  • ${similar.id}: ${similar.decision.substring(0, 40)}... (${pct}%)`;
                    }
                    if (similarDecisions.length > 3) {
                        tooltip += `\n  • ...and ${similarDecisions.length - 3} more`;
                    }
                }
                item.tooltip = tooltip;

                item.command = {
                    command: 'decisionnode.viewDecision',
                    title: 'View Decision',
                    arguments: [decision]
                };

                return item;
            });
        } catch (error) {
            console.error(`[DecisionNode] Error loading decisions for ${scope}:`, error);
            return [];
        }
    }
}

export class DecisionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly decision?: DecisionNode,
        public readonly isUnembedded?: boolean,
        public readonly isUnreviewed?: boolean
    ) {
        super(label, collapsibleState);
    }
}
