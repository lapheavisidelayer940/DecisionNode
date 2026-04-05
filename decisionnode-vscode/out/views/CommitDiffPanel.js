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
exports.CommitDiffPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const store_1 = require("../core/store");
class CommitDiffPanel {
    constructor(panel) {
        this._disposables = [];
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    static async show(extensionUri, activityItem) {
        const column = vscode.ViewColumn.Beside;
        const projectRoot = (0, store_1.getProjectRoot)();
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
        const panel = vscode.window.createWebviewPanel('activitySnapshot', `Activity: ${entry.id}`, column, { enableScripts: true });
        CommitDiffPanel.currentPanel = new CommitDiffPanel(panel);
        CommitDiffPanel.currentPanel._panel.webview.html = CommitDiffPanel.currentPanel._getHtml(entry);
    }
    static async getActivityEntry(projectRoot, entryId) {
        try {
            const logPath = path.join(projectRoot, 'history', 'activity.json');
            if (!fs.existsSync(logPath))
                return null;
            const content = fs.readFileSync(logPath, 'utf-8');
            const log = JSON.parse(content);
            return log.entries?.find((e) => e.id === entryId) || null;
        }
        catch {
            return null;
        }
    }
    _getHtml(entry) {
        const allDecisions = [];
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
    dispose() {
        CommitDiffPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d)
                d.dispose();
        }
    }
}
exports.CommitDiffPanel = CommitDiffPanel;
//# sourceMappingURL=CommitDiffPanel.js.map