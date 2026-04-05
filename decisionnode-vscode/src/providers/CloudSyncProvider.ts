import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { getProjectRoot, getDecisions, DecisionNode } from '../core/store';

/**
 * Cloud sync status for a decision
 */
export type SyncStatus = 'synced' | 'local-only' | 'cloud-only' | 'conflict';

/**
 * Cloud sync metadata interface
 */
interface SyncMetadata {
    lastSyncAt: string;
    decisions: Record<string, { syncedAt: string; cloudUpdatedAt?: string }>;
}

/**
 * Cloud config for authentication
 */
interface CloudConfig {
    access_token?: string;
    subscription_tier?: 'free' | 'pro';
}

/**
 * Cloud decision from Supabase
 */
interface CloudDecision {
    decision_id: string;
    scope: string;
    decision: string;
    rationale?: string;
    constraints?: string[];
    status?: string;
    updated_at: string;
    created_at?: string;
}

/**
 * Sync conflict between local and cloud
 */
interface SyncConflict {
    decisionId: string;
    scope: string;
    localDecision: string;
    cloudDecision: string;
    localUpdatedAt: string;
    cloudUpdatedAt: string;
}

/**
 * Tree view provider for cloud sync status
 */
export class CloudSyncProvider implements vscode.TreeDataProvider<CloudSyncItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<CloudSyncItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly extensionUri: vscode.Uri) { }

    private syncedDecisions: DecisionNode[] = [];
    private localOnlyDecisions: DecisionNode[] = [];
    private cloudOnlyDecisions: CloudDecision[] = [];
    private conflictData: SyncConflict[] = [];
    private incomingChanges: Set<string> = new Set();
    private incomingConflicts: Set<string> = new Set();
    private modifiedSinceSync: Set<string> = new Set(); // Decisions edited locally after last sync

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: CloudSyncItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CloudSyncItem): Promise<CloudSyncItem[]> {
        if (!element) {
            // Root - Check Auth First
            const cloudConfig = await this.loadCloudConfig();
            if (!cloudConfig.access_token) {
                const item = new CloudSyncItem('Please login to DecisionNode', 'info', vscode.TreeItemCollapsibleState.None);
                item.description = '(Pro feature)';
                item.command = { command: 'decisionnode.login', title: 'Login' }; // Assuming sync command triggers login flow or similar
                return [item];
            }
            if (cloudConfig.subscription_tier !== 'pro') {
                const item = new CloudSyncItem('Cloud Sync requires Pro', 'info', vscode.TreeItemCollapsibleState.None);
                item.description = 'Upgrade to use cloud features';
                return [item];
            }

            await this.loadSyncStatus();
            const scopes = new Set<string>();
            this.syncedDecisions.forEach(d => scopes.add(d.scope));
            this.localOnlyDecisions.forEach(d => scopes.add(d.scope));
            this.cloudOnlyDecisions.forEach(d => scopes.add(d.scope));

            return Array.from(scopes).sort().map(scope => {
                const count = this.getScopeDecisionCount(scope);
                const hasUnsynced = this.hasUnsyncedDecisions(scope);

                const item = new CloudSyncItem(
                    scope,
                    'scope',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    count
                );

                if (hasUnsynced) {
                    item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-offline.svg');
                } else if (this.hasIncomingChanges(scope)) {
                    item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-incoming.svg');
                } else {
                    item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-synced.svg');
                }

                return item;
            });
        }

        if (element.contextValue === 'scope') {
            const scope = element.label;
            const items: CloudSyncItem[] = [];

            // Add decisions for this scope
            const synced = this.syncedDecisions
                .filter(d => d.scope === scope)
                .map(d => this.createDecisionItem(d, 'synced'));

            const local = this.localOnlyDecisions
                .filter(d => d.scope === scope)
                .map(d => this.createDecisionItem(d, 'local-only'));

            const incoming = this.cloudOnlyDecisions
                .filter(d => d.scope === scope)
                .map(d => this.createCloudDecisionItem(d));

            // Conflict items for this scope
            const conflicts = this.conflictData
                .filter(c => c.scope === scope)
                .map(c => this.createConflictItem(c));

            // Sort by ID
            return [...conflicts, ...incoming, ...synced, ...local].sort((a, b) => a.label.localeCompare(b.label));
        }

        return [];
    }

    private getScopeDecisionCount(scope: string): number {
        const synced = this.syncedDecisions.filter(d => d.scope === scope).length;
        const local = this.localOnlyDecisions.filter(d => d.scope === scope).length;
        const cloud = this.cloudOnlyDecisions.filter(d => d.scope === scope).length;
        return synced + local + cloud;
    }

    private hasUnsyncedDecisions(scope: string): boolean {
        // Check if ANY decision in this scope is local-only (unsynced) OR modified since sync
        const hasLocalOnly = this.localOnlyDecisions.some(d => d.scope === scope);
        const hasModified = this.syncedDecisions.some(d => d.scope === scope && this.modifiedSinceSync.has(d.id));
        return hasLocalOnly || hasModified;
    }

    private hasIncomingChanges(scope: string): boolean {
        // Check if ANY decision in this scope has incoming changes (synced update OR new cloud-only)
        const hasSyncedUpdate = this.syncedDecisions.some(d => d.scope === scope && this.incomingChanges.has(d.id));
        const hasNewCloud = this.cloudOnlyDecisions.some(d => d.scope === scope);
        return hasSyncedUpdate || hasNewCloud;
    }

    private createDecisionItem(decision: DecisionNode, status: SyncStatus): CloudSyncItem {
        const item = new CloudSyncItem(
            decision.id,
            `decision-${status}`,
            vscode.TreeItemCollapsibleState.None,
            decision
        );

        if (status === 'synced') {
            if (this.modifiedSinceSync.has(decision.id)) {
                // Decision was edited locally after last sync - needs push
                item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-offline.svg');
                item.tooltip = 'Status: Modified Locally (Needs Push)';
                item.description = 'modified';
            } else if (this.incomingChanges.has(decision.id)) {
                item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-incoming.svg');
                item.tooltip = 'Status: Synced (Incoming Changes Available)';
            } else if (this.incomingConflicts.has(decision.id)) {
                item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-offline.svg');
                item.tooltip = 'Status: Conflict';
            } else {
                item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-synced.svg');
                item.tooltip = 'Status: Synced';
            }
        } else {
            // Local Only (Not synced) or Error
            item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-offline.svg');
            item.tooltip = 'Status: Local Only';
        }

        return item;
    }

    private async loadSyncStatus(): Promise<void> {
        const projectRoot = getProjectRoot();
        if (!projectRoot) {
            this.resetCounts();
            return;
        }

        const cloudConfig = await this.loadCloudConfig();
        if (!cloudConfig.access_token || cloudConfig.subscription_tier !== 'pro') {
            this.resetCounts();
            return;
        }

        const localDecisions = await getDecisions();
        const syncMetadata = await this.loadSyncMetadata(projectRoot);
        const syncedIds = new Set(Object.keys(syncMetadata.decisions));

        // Detect decisions modified since last sync
        this.modifiedSinceSync.clear();
        for (const d of localDecisions) {
            const syncInfo = syncMetadata.decisions[d.id];
            if (syncInfo && d.updatedAt) {
                const syncedAt = new Date(syncInfo.syncedAt).getTime();
                const updatedAt = new Date(d.updatedAt).getTime();
                if (updatedAt > syncedAt) {
                    this.modifiedSinceSync.add(d.id);
                }
            }
        }

        this.syncedDecisions = localDecisions.filter(d => syncedIds.has(d.id));
        this.localOnlyDecisions = localDecisions.filter(d => !syncedIds.has(d.id));
        this.cloudOnlyDecisions = [];
        this.conflictData = [];

        // Load incoming changes
        try {
            const incomingPath = path.join(projectRoot, 'incoming.json');
            if (fs.existsSync(incomingPath)) {
                const content = fs.readFileSync(incomingPath, 'utf-8');
                const data = JSON.parse(content);
                this.incomingChanges = new Set(data.toPull.map((d: any) => d.decision_id || d.id));
                this.incomingConflicts = new Set(data.conflicts.map((c: any) => c.decisionId));

                // Populate cloudOnlyDecisions (items in incoming but not in local)
                const localIds = new Set(localDecisions.map(d => d.id));
                this.cloudOnlyDecisions = data.toPull
                    .filter((d: any) => !localIds.has(d.decision_id || d.id))
                    .map((d: any) => ({
                        decision_id: d.decision_id || d.id,
                        scope: d.scope,
                        decision: d.decision,
                        rationale: d.rationale,
                        constraints: d.constraints,
                        status: d.status,
                        updated_at: d.updated_at,
                        created_at: d.created_at
                    }));

                // Populate conflictData from conflicts array
                this.conflictData = (data.conflicts || []).map((c: any) => ({
                    decisionId: c.decisionId,
                    scope: c.scope,
                    localDecision: c.localDecision,
                    cloudDecision: c.cloudDecision,
                    localUpdatedAt: c.localUpdatedAt,
                    cloudUpdatedAt: c.cloudUpdatedAt
                }));
            } else {
                this.incomingChanges.clear();
                this.incomingConflicts.clear();
                this.cloudOnlyDecisions = [];
            }
        } catch {
            this.incomingChanges.clear();
            this.incomingConflicts.clear();
            this.cloudOnlyDecisions = [];
        }
    }

    private resetCounts(): void {
        this.syncedDecisions = [];
        this.localOnlyDecisions = [];
        this.cloudOnlyDecisions = [];
        this.conflictData = [];
    }

    private createCloudDecisionItem(cloud: CloudDecision): CloudSyncItem {
        const item = new CloudSyncItem(
            cloud.decision_id,
            'decision-cloud-only',
            vscode.TreeItemCollapsibleState.None
        );
        item.description = 'New from Cloud';
        item.tooltip = 'Status: Incoming (New)';
        item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-incoming.svg');
        item.command = {
            command: 'decisionnode.viewCloudDecision',
            title: 'View Cloud Decision',
            arguments: [cloud]
        };
        return item;
    }

    private createConflictItem(conflict: SyncConflict): CloudSyncItem {
        const item = new CloudSyncItem(
            conflict.decisionId,
            'decision-conflict',
            vscode.TreeItemCollapsibleState.None
        );
        item.description = '⚠️ Conflict';
        item.tooltip = 'Status: Conflict - Click to resolve';
        item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
        item.command = {
            command: 'decisionnode.viewConflict',
            title: 'View Conflict',
            arguments: [conflict]
        };
        return item;
    }

    private async loadCloudConfig(): Promise<CloudConfig> {
        const configPath = path.join(os.homedir(), '.decisionnode', 'cloud.json');
        try {
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf-8');
                return JSON.parse(content);
            }
        } catch { }
        return {};
    }

    private async loadSyncMetadata(projectRoot: string): Promise<SyncMetadata> {
        const metadataPath = path.join(projectRoot, 'sync-metadata.json');
        try {
            if (fs.existsSync(metadataPath)) {
                const content = fs.readFileSync(metadataPath, 'utf-8');
                return JSON.parse(content);
            }
        } catch { }
        return { lastSyncAt: '', decisions: {} };
    }
}

/**
 * Tree item for cloud sync view
 */
export class CloudSyncItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly decision?: DecisionNode,
        public readonly count?: number
    ) {
        super(label, collapsibleState);
        if (contextValue === 'scope') {
            // Icon is set by the provider
            this.description = `(${count})`;
        }
    }
}
