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
exports.ConflictDiffPanel = void 0;
const vscode = __importStar(require("vscode"));
class ConflictDiffPanel {
    constructor(panel, conflict) {
        this._disposables = [];
        this._panel = panel;
        this._conflict = conflict;
        this._panel.webview.html = this._getHtml(conflict);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'resolve') {
                // Fire the resolution command
                await vscode.commands.executeCommand('decisionnode.resolveConflict', conflict.decisionId, message.resolution // 'local' or 'cloud'
                );
                this._panel.dispose();
            }
        }, null, this._disposables);
    }
    static show(extensionUri, conflict) {
        const column = vscode.ViewColumn.Beside;
        if (ConflictDiffPanel.currentPanel) {
            ConflictDiffPanel.currentPanel._conflict = conflict;
            ConflictDiffPanel.currentPanel._panel.title = `Conflict: ${conflict.decisionId}`;
            ConflictDiffPanel.currentPanel._panel.reveal();
            ConflictDiffPanel.currentPanel._panel.webview.html = ConflictDiffPanel.currentPanel._getHtml(conflict);
            return;
        }
        const panel = vscode.window.createWebviewPanel('conflictDiff', `Conflict: ${conflict.decisionId}`, column, { enableScripts: true });
        ConflictDiffPanel.currentPanel = new ConflictDiffPanel(panel, conflict);
    }
    _getHtml(conflict) {
        const localDate = conflict.localUpdatedAt
            ? new Date(conflict.localUpdatedAt).toLocaleString()
            : 'Unknown';
        const cloudDate = conflict.cloudUpdatedAt
            ? new Date(conflict.cloudUpdatedAt).toLocaleString()
            : 'Unknown';
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 24px; 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            line-height: 1.6;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .scope-badge { 
            background: var(--vscode-badge-background); 
            color: var(--vscode-badge-foreground);
            padding: 2px 8px; 
            border-radius: 4px; 
            font-size: 11px;
            font-weight: 500;
        }
        .id { 
            font-size: 13px; 
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-textPreformat-foreground); 
            opacity: 0.8;
        }
        .conflict-icon {
            color: var(--vscode-charts-yellow);
            font-size: 18px;
        }
        .diff-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 32px;
        }
        .diff-panel {
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            overflow: hidden;
        }
        .diff-header {
            padding: 12px 16px;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .diff-header.local {
            background: rgba(59, 130, 246, 0.15);
            color: var(--vscode-charts-blue);
            border-bottom: 2px solid var(--vscode-charts-blue);
        }
        .diff-header.cloud {
            background: rgba(139, 92, 246, 0.15);
            color: var(--vscode-charts-purple);
            border-bottom: 2px solid var(--vscode-charts-purple);
        }
        .diff-content {
            padding: 16px;
            min-height: 120px;
            font-size: 14px;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .diff-timestamp {
            padding: 8px 16px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            border-top: 1px solid var(--vscode-widget-border);
            background: var(--vscode-sideBar-background);
        }
        .actions {
            display: flex;
            gap: 16px;
            justify-content: center;
            padding-top: 16px;
        }
        .btn {
            padding: 10px 24px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-local {
            background: var(--vscode-charts-blue);
            color: white;
        }
        .btn-local:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        .btn-cloud {
            background: var(--vscode-charts-purple);
            color: white;
        }
        .btn-cloud:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        .hint {
            text-align: center;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="conflict-icon">⚠️</span>
        <span class="scope-badge">${conflict.scope}</span>
        <span class="id">${conflict.decisionId}</span>
    </div>

    <div class="diff-container">
        <div class="diff-panel">
            <div class="diff-header local">📁 Local Version</div>
            <div class="diff-content">${this._escapeHtml(conflict.localDecision)}</div>
            <div class="diff-timestamp">Updated: ${localDate}</div>
        </div>
        <div class="diff-panel">
            <div class="diff-header cloud">☁️ Cloud Version</div>
            <div class="diff-content">${this._escapeHtml(conflict.cloudDecision)}</div>
            <div class="diff-timestamp">Updated: ${cloudDate}</div>
        </div>
    </div>

    <div class="actions">
        <button class="btn btn-local" onclick="resolve('local')">⬆️ Accept Local & Push</button>
        <button class="btn btn-cloud" onclick="resolve('cloud')">⬇️ Accept Cloud</button>
    </div>

    <div class="hint">
        "Accept Local & Push" will push your version to cloud.<br>
        "Accept Cloud" will overwrite your local version.
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function resolve(resolution) {
            vscode.postMessage({ command: 'resolve', resolution });
        }
    </script>
</body>
</html>`;
    }
    _escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    dispose() {
        ConflictDiffPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d)
                d.dispose();
        }
    }
}
exports.ConflictDiffPanel = ConflictDiffPanel;
//# sourceMappingURL=ConflictDiffPanel.js.map