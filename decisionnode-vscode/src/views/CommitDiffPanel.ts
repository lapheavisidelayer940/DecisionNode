import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getProjectRoot, DecisionNode } from '../core/store';
import { ActivityItem } from '../providers/CommitTimelineProvider';

interface ActivityLogEntry {
    id: string;
    action: 'added' | 'updated' | 'deleted' | 'imported';
    decisionId: string;
    description: string;
    timestamp: string;
    snapshot: Record<string, { scope: string; decisions: DecisionNode[] }>;
}

export class CommitDiffPanel {
    public static currentPanel: CommitDiffPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static async show(extensionUri: vscode.Uri, activityItem: ActivityItem) {
        const column = vscode.ViewColumn.Beside;
        const projectRoot = getProjectRoot();

        if (!projectRoot) {
            vscode.window.showErrorMessage('No project detected');
            return;
        }

        // Get the activity log entry
        const entry = await CommitDiffPanel.getActivityEntry(projectRoot, activityItem.entryId);
        if (!entry) {
            vscode.window.showInformationMessage('Activity entry has no snapshot to display');
            return;
        }

        if (CommitDiffPanel.currentPanel) {
            CommitDiffPanel.currentPanel._panel.reveal(column);
            CommitDiffPanel.currentPanel._panel.webview.html = CommitDiffPanel.currentPanel._getHtml(entry);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'activitySnapshot',
            `Activity: ${entry.id}`,
            column,
            { enableScripts: true }
        );

        CommitDiffPanel.currentPanel = new CommitDiffPanel(panel);
        CommitDiffPanel.currentPanel._panel.webview.html = CommitDiffPanel.currentPanel._getHtml(entry);
    }

    private static async getActivityEntry(projectRoot: string, entryId: string): Promise<ActivityLogEntry | null> {
        try {
            const logPath = path.join(projectRoot, 'history', 'activity.json');
            if (!fs.existsSync(logPath)) return null;
            const content = fs.readFileSync(logPath, 'utf-8');
            const log = JSON.parse(content);
            return log.entries?.find((e: ActivityLogEntry) => e.id === entryId) || null;
        } catch {
            return null;
        }
    }

    private _getHtml(entry: ActivityLogEntry): string {
        const allDecisions: DecisionNode[] = [];
        for (const scope of Object.values(entry.snapshot || {})) {
            allDecisions.push(...scope.decisions);
        }

        return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        .header { margin-bottom: 20px; }
        .entry-id { 
            font-family: monospace; 
            background: var(--vscode-textCodeBlock-background);
            padding: 4px 8px;
            border-radius: 4px;
        }
        h1 { font-size: 18px; margin: 10px 0; }
        .meta { font-size: 12px; color: var(--vscode-descriptionForeground); }
        .decision { 
            padding: 12px;
            margin: 8px 0;
            border-radius: 6px;
            background: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .decision-id { font-weight: bold; margin-bottom: 6px; }
        .decision-text { margin-bottom: 8px; }
        .decision-field { font-size: 12px; color: var(--vscode-descriptionForeground); margin: 2px 0; }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            margin-left: 8px;
        }
        .badge-added { background: #4caf50; color: white; }
        .badge-updated { background: #2196f3; color: white; }
        .badge-deleted { background: #f44336; color: white; }
        .badge-imported { background: #9c27b0; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <span class="entry-id">${entry.id}</span>
        <span class="badge badge-${entry.action}">${entry.action}</span>
        <h1>${entry.description}</h1>
        <div class="meta">${new Date(entry.timestamp).toLocaleString()}</div>
    </div>

    <h2>Decisions at this point (${allDecisions.length})</h2>
    
    ${allDecisions.map(d => `
        <div class="decision">
            <div class="decision-id">${d.id} (${d.scope})</div>
            <div class="decision-text">${d.decision}</div>
            ${d.rationale ? `<div class="decision-field">💡 ${d.rationale}</div>` : ''}
            ${d.constraints?.length ? `<div class="decision-field">⚠️ Constraints: ${d.constraints.join(', ')}</div>` : ''}
        </div>
    `).join('')}
</body>
</html>`;
    }

    public dispose() {
        CommitDiffPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) d.dispose();
        }
    }
}
