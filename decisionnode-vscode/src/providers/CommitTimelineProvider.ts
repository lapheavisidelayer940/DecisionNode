import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getProjectRoot } from '../core/store';

type ActionType = 'added' | 'updated' | 'deleted' | 'imported' | 'installed' | 'cloud_push' | 'cloud_pull' | 'conflict_resolved';
type SourceType = 'cli' | 'mcp' | 'cloud' | 'marketplace';

interface ActivityLogEntry {
    id: string;
    action: ActionType;
    decisionId: string;
    description: string;
    timestamp: string;
    source?: SourceType;
}

export class CommitTimelineProvider implements vscode.TreeDataProvider<ActivityItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ActivityItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private currentFilter: SourceType | 'all' = 'all';

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    setFilter(filter: SourceType | 'all'): void {
        this.currentFilter = filter;
        this.refresh();
    }

    getFilter(): SourceType | 'all' {
        return this.currentFilter;
    }

    getTreeItem(element: ActivityItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<ActivityItem[]> {
        const projectRoot = getProjectRoot();

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
                return [new ActivityItem(
                    this.currentFilter === 'all' ? 'No activity yet' : `No ${this.currentFilter} activity`,
                    '', '', 'info'
                )];
            }

            // Show newest first (no reverse needed)
            return [...entries].map(entry => {
                return new ActivityItem(
                    entry.description,
                    entry.id,
                    entry.timestamp,
                    entry.action,
                    entry.source
                );
            });
        } catch {
            return [new ActivityItem('No activity yet', '', '', 'info')];
        }
    }

    private async getActivityLog(projectRoot: string): Promise<ActivityLogEntry[]> {
        try {
            const logPath = path.join(projectRoot, 'history', 'activity.json');
            if (!fs.existsSync(logPath)) {
                return [];
            }
            const content = fs.readFileSync(logPath, 'utf-8');
            const log = JSON.parse(content);
            return log.entries || [];
        } catch {
            return [];
        }
    }
}

export class ActivityItem extends vscode.TreeItem {
    constructor(
        public readonly description_text: string,
        public readonly entryId: string,
        public readonly timestamp: string,
        public readonly action: string,
        public readonly source?: SourceType
    ) {
        super(
            description_text,
            vscode.TreeItemCollapsibleState.None
        );

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
        } else if (action === 'updated') {
            this.iconPath = new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.blue'));
        } else if (action === 'deleted') {
            this.iconPath = new vscode.ThemeIcon('trash', new vscode.ThemeColor('charts.red'));
        } else if (action === 'imported' || action === 'installed') {
            this.iconPath = new vscode.ThemeIcon('cloud-download', new vscode.ThemeColor('charts.purple'));
        } else if (action === 'cloud_push') {
            this.iconPath = new vscode.ThemeIcon('cloud-upload', new vscode.ThemeColor('charts.blue'));
        } else if (action === 'cloud_pull') {
            this.iconPath = new vscode.ThemeIcon('cloud-download', new vscode.ThemeColor('charts.purple'));
        } else if (action === 'conflict_resolved') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.yellow'));
        }
    }

    private getTimeAgo(date: Date): string {
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
}
