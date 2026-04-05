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
exports.ActivityItem = exports.CommitTimelineProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const store_1 = require("../core/store");
class CommitTimelineProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.currentFilter = 'all';
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    setFilter(filter) {
        this.currentFilter = filter;
        this.refresh();
    }
    getFilter() {
        return this.currentFilter;
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren() {
        const projectRoot = (0, store_1.getProjectRoot)();
        if (!projectRoot) {
            return [new ActivityItem('No project detected', '', '', 'info')];
        }
        try {
            let entries = await this.getActivityLog(projectRoot);
            // Apply filter if set
            if (this.currentFilter !== 'all') {
                entries = entries.filter(e => e.source === this.currentFilter);
            }
            if (entries.length === 0) {
                return [new ActivityItem(this.currentFilter === 'all' ? 'No activity yet' : `No ${this.currentFilter} activity`, '', '', 'info')];
            }
            // Show newest first (no reverse needed)
            return [...entries].map(entry => {
                return new ActivityItem(entry.description, entry.id, entry.timestamp, entry.action, entry.source);
            });
        }
        catch {
            return [new ActivityItem('No activity yet', '', '', 'info')];
        }
    }
    async getActivityLog(projectRoot) {
        try {
            const logPath = path.join(projectRoot, 'history', 'activity.json');
            if (!fs.existsSync(logPath)) {
                return [];
            }
            const content = fs.readFileSync(logPath, 'utf-8');
            const log = JSON.parse(content);
            return log.entries || [];
        }
        catch {
            return [];
        }
    }
}
exports.CommitTimelineProvider = CommitTimelineProvider;
class ActivityItem extends vscode.TreeItem {
    constructor(description_text, entryId, timestamp, action, source) {
        super(description_text, vscode.TreeItemCollapsibleState.None);
        this.description_text = description_text;
        this.entryId = entryId;
        this.timestamp = timestamp;
        this.action = action;
        this.source = source;
        this.contextValue = 'activity';
        if (timestamp) {
            const date = new Date(timestamp);
            this.description = this.getTimeAgo(date);
        }
        const sourceLabel = source ? ` [${source.toUpperCase()}]` : '';
        this.tooltip = `${entryId}${sourceLabel}\n${description_text}\n${timestamp}`;
        // Icon based on action type
        if (action === 'added') {
            this.iconPath = new vscode.ThemeIcon('add', new vscode.ThemeColor('charts.green'));
        }
        else if (action === 'updated') {
            this.iconPath = new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.blue'));
        }
        else if (action === 'deleted') {
            this.iconPath = new vscode.ThemeIcon('trash', new vscode.ThemeColor('charts.red'));
        }
        else if (action === 'imported' || action === 'installed') {
            this.iconPath = new vscode.ThemeIcon('cloud-download', new vscode.ThemeColor('charts.purple'));
        }
        else if (action === 'cloud_push') {
            this.iconPath = new vscode.ThemeIcon('cloud-upload', new vscode.ThemeColor('charts.blue'));
        }
        else if (action === 'cloud_pull') {
            this.iconPath = new vscode.ThemeIcon('cloud-download', new vscode.ThemeColor('charts.purple'));
        }
        else if (action === 'conflict_resolved') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.yellow'));
        }
    }
    getTimeAgo(date) {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1)
            return 'just now';
        if (minutes < 60)
            return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}
exports.ActivityItem = ActivityItem;
//# sourceMappingURL=CommitTimelineProvider.js.map