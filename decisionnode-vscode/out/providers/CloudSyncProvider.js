"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudSyncItem = exports.CloudSyncProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const store_1 = require("../core/store");
/**
 * Tree view provider for cloud sync status
 */
class CloudSyncProvider {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.syncedDecisions = [];
        this.localOnlyDecisions = [];
        this.cloudOnlyDecisions = [];
        this.conflictData = [];
        this.incomingChanges = new Set();
        this.incomingConflicts = new Set();
        this.modifiedSinceSync = new Set(); // Decisions edited locally after last sync
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
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
            const scopes = new Set();
            this.syncedDecisions.forEach(d => scopes.add(d.scope));
            this.localOnlyDecisions.forEach(d => scopes.add(d.scope));
            this.cloudOnlyDecisions.forEach(d => scopes.add(d.scope));
            return Array.from(scopes).sort().map(scope => {
                const count = this.getScopeDecisionCount(scope);
                const hasUnsynced = this.hasUnsyncedDecisions(scope);
                const item = new CloudSyncItem(scope, 'scope', vscode.TreeItemCollapsibleState.Collapsed, undefined, count);
                if (hasUnsynced) {
                    item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-offline.svg');
                }
                else if (this.hasIncomingChanges(scope)) {
                    item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-incoming.svg');
                }
                else {
                    item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-synced.svg');
                }
                return item;
            });
        }
        if (element.contextValue === 'scope') {
            const scope = element.label;
            const items = [];
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
    getScopeDecisionCount(scope) {
        const synced = this.syncedDecisions.filter(d => d.scope === scope).length;
        const local = this.localOnlyDecisions.filter(d => d.scope === scope).length;
        const cloud = this.cloudOnlyDecisions.filter(d => d.scope === scope).length;
        return synced + local + cloud;
    }
    hasUnsyncedDecisions(scope) {
        // Check if ANY decision in this scope is local-only (unsynced) OR modified since sync
        const hasLocalOnly = this.localOnlyDecisions.some(d => d.scope === scope);
        const hasModified = this.syncedDecisions.some(d => d.scope === scope && this.modifiedSinceSync.has(d.id));
        return hasLocalOnly || hasModified;
    }
    hasIncomingChanges(scope) {
        // Check if ANY decision in this scope has incoming changes (synced update OR new cloud-only)
        const hasSyncedUpdate = this.syncedDecisions.some(d => d.scope === scope && this.incomingChanges.has(d.id));
        const hasNewCloud = this.cloudOnlyDecisions.some(d => d.scope === scope);
        return hasSyncedUpdate || hasNewCloud;
    }
    createDecisionItem(decision, status) {
        const item = new CloudSyncItem(decision.id, `decision-${status}`, vscode.TreeItemCollapsibleState.None, decision);
        if (status === 'synced') {
            if (this.modifiedSinceSync.has(decision.id)) {
                // Decision was edited locally after last sync - needs push
                item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-offline.svg');
                item.tooltip = 'Status: Modified Locally (Needs Push)';
                item.description = 'modified';
            }
            else if (this.incomingChanges.has(decision.id)) {
                item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-incoming.svg');
                item.tooltip = 'Status: Synced (Incoming Changes Available)';
            }
            else if (this.incomingConflicts.has(decision.id)) {
                item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-offline.svg');
                item.tooltip = 'Status: Conflict';
            }
            else {
                item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-synced.svg');
                item.tooltip = 'Status: Synced';
            }
        }
        else {
            // Local Only (Not synced) or Error
            item.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'cloud-offline.svg');
            item.tooltip = 'Status: Local Only';
        }
        return item;
    }
    async loadSyncStatus() {
        const projectRoot = (0, store_1.getProjectRoot)();
        if (!projectRoot) {
            this.resetCounts();
            return;
        }
        const cloudConfig = await this.loadCloudConfig();
        if (!cloudConfig.access_token || cloudConfig.subscription_tier !== 'pro') {
            this.resetCounts();
            return;
        }
        const localDecisions = await (0, store_1.getDecisions)();
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
                this.incomingChanges = new Set(data.toPull.map((d) => d.decision_id || d.id));
                this.incomingConflicts = new Set(data.conflicts.map((c) => c.decisionId));
                // Populate cloudOnlyDecisions (items in incoming but not in local)
                const localIds = new Set(localDecisions.map(d => d.id));
                this.cloudOnlyDecisions = data.toPull
                    .filter((d) => !localIds.has(d.decision_id || d.id))
                    .map((d) => ({
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
                this.conflictData = (data.conflicts || []).map((c) => ({
                    decisionId: c.decisionId,
                    scope: c.scope,
                    localDecision: c.localDecision,
                    cloudDecision: c.cloudDecision,
                    localUpdatedAt: c.localUpdatedAt,
                    cloudUpdatedAt: c.cloudUpdatedAt
                }));
            }
            else {
                this.incomingChanges.clear();
                this.incomingConflicts.clear();
                this.cloudOnlyDecisions = [];
            }
        }
        catch {
            this.incomingChanges.clear();
            this.incomingConflicts.clear();
            this.cloudOnlyDecisions = [];
        }
    }
    resetCounts() {
        this.syncedDecisions = [];
        this.localOnlyDecisions = [];
        this.cloudOnlyDecisions = [];
        this.conflictData = [];
    }
    createCloudDecisionItem(cloud) {
        const item = new CloudSyncItem(cloud.decision_id, 'decision-cloud-only', vscode.TreeItemCollapsibleState.None);
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
    createConflictItem(conflict) {
        const item = new CloudSyncItem(conflict.decisionId, 'decision-conflict', vscode.TreeItemCollapsibleState.None);
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
    async loadCloudConfig() {
        const configPath = path.join(os.homedir(), '.decisionnode', 'cloud.json');
        try {
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf-8');
                return JSON.parse(content);
            }
        }
        catch { }
        return {};
    }
    async loadSyncMetadata(projectRoot) {
        const metadataPath = path.join(projectRoot, 'sync-metadata.json');
        try {
            if (fs.existsSync(metadataPath)) {
                const content = fs.readFileSync(metadataPath, 'utf-8');
                return JSON.parse(content);
            }
        }
        catch { }
        return { lastSyncAt: '', decisions: {} };
    }
}
exports.CloudSyncProvider = CloudSyncProvider;
/**
 * Tree item for cloud sync view
 */
class CloudSyncItem extends vscode.TreeItem {
    constructor(label, contextValue, collapsibleState, decision, count) {
        super(label, collapsibleState);
        this.label = label;
        this.contextValue = contextValue;
        this.collapsibleState = collapsibleState;
        this.decision = decision;
        this.count = count;
        if (contextValue === 'scope') {
            // Icon is set by the provider
            this.description = `(${count})`;
        }
    }
}
exports.CloudSyncItem = CloudSyncItem;
//# sourceMappingURL=CloudSyncProvider.js.map