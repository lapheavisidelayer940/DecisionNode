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
exports.DecisionTreeItem = exports.DecisionTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const store_1 = require("../core/store");
class DecisionTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        const projectRoot = (0, store_1.getProjectRoot)();
        if (!projectRoot || !fs.existsSync(projectRoot)) {
            return [new DecisionTreeItem('No decisions found', 'info', vscode.TreeItemCollapsibleState.None)];
        }
        if (!element) {
            // Root level: show scopes
            return this.getScopes(projectRoot);
        }
        else if (element.contextValue === 'scope') {
            // Scope level: show decisions in that scope
            return this.getDecisionsForScope(projectRoot, element.label);
        }
        return [];
    }
    async getScopes(projectRoot) {
        try {
            const files = fs.readdirSync(projectRoot);
            const scopes = files
                .filter(f => f.endsWith('.json') && f !== 'vectors.json' && f !== 'reviewed.json' && f !== 'incoming.json' && f !== 'sync-metadata.json')
                .map(f => f.replace('.json', ''));
            // Check for unembedded decisions
            const unembeddedIds = (0, store_1.getUnembeddedIds)();
            const unembeddedCount = unembeddedIds.size;
            const items = [];
            // Add embed status banner if there are unembedded decisions
            if (unembeddedCount > 0) {
                const embedBanner = new DecisionTreeItem(`⚠️ ${unembeddedCount} decision${unembeddedCount > 1 ? 's' : ''} not embedded`, 'embed-banner', vscode.TreeItemCollapsibleState.None);
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
                    const unreviewedIds = (0, store_1.getUnreviewedIds)(); // Get set of unreviewed IDs
                    for (const d of collection.decisions) {
                        if (unembeddedIds.has(d.id)) {
                            scopeUnembeddedCount++;
                        }
                        if (unreviewedIds.has(d.id)) {
                            scopeUnreviewedCount++;
                        }
                    }
                }
                catch { }
                const item = new DecisionTreeItem(scope.charAt(0).toUpperCase() + scope.slice(1), 'scope', vscode.TreeItemCollapsibleState.Collapsed);
                // Icon logic: Unreviewed takes priority over standard folder
                if (scopeUnreviewedCount > 0) {
                    item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
                }
                else {
                    item.iconPath = new vscode.ThemeIcon('folder');
                }
                // Description logic
                const parts = [];
                if (scopeUnembeddedCount > 0)
                    parts.push(`${scopeUnembeddedCount} not embedded`);
                if (scopeUnreviewedCount > 0)
                    parts.push(`${scopeUnreviewedCount} new`);
                if (parts.length > 0) {
                    item.description = parts.join(', ');
                }
                items.push(item);
            }
            return items;
        }
        catch {
            return [];
        }
    }
    async getDecisionsForScope(projectRoot, scope) {
        try {
            const filePath = path.join(projectRoot, `${scope.toLowerCase()}.json`);
            console.error(`[DecisionNode] Loading decisions from: ${filePath}`);
            const content = fs.readFileSync(filePath, 'utf-8');
            const collection = JSON.parse(content);
            // Get unembedded decision IDs
            const unembeddedIds = (0, store_1.getUnembeddedIds)();
            return collection.decisions.map((decision) => {
                const isUnembedded = unembeddedIds.has(decision.id);
                const similarDecisions = (0, store_1.findSimilarDecisions)(decision.id, 0.85);
                const hasConflicts = similarDecisions.length > 0;
                const unreviewedIds = (0, store_1.getUnreviewedIds)();
                const isUnreviewed = unreviewedIds.has(decision.id);
                const item = new DecisionTreeItem(`${decision.id}: ${decision.decision.substring(0, 40)}...`, 'decision', vscode.TreeItemCollapsibleState.None, decision, isUnembedded, isUnreviewed);
                // Icon priority: unembedded > unreviewed > conflict > status
                if (isUnembedded) {
                    item.iconPath = new vscode.ThemeIcon('zap', new vscode.ThemeColor('charts.orange'));
                    item.description = 'not embedded';
                }
                else if (isUnreviewed) {
                    item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
                    item.description = 'new';
                }
                else if (hasConflicts) {
                    item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
                    item.description = `${similarDecisions.length} similar`;
                }
                else {
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
        }
        catch (error) {
            console.error(`[DecisionNode] Error loading decisions for ${scope}:`, error);
            return [];
        }
    }
}
exports.DecisionTreeProvider = DecisionTreeProvider;
class DecisionTreeItem extends vscode.TreeItem {
    constructor(label, contextValue, collapsibleState, decision, isUnembedded, isUnreviewed) {
        super(label, collapsibleState);
        this.label = label;
        this.contextValue = contextValue;
        this.collapsibleState = collapsibleState;
        this.decision = decision;
        this.isUnembedded = isUnembedded;
        this.isUnreviewed = isUnreviewed;
    }
}
exports.DecisionTreeItem = DecisionTreeItem;
//# sourceMappingURL=DecisionTreeProvider.js.map