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
exports.DecisionDetailPanel = void 0;
const vscode = __importStar(require("vscode"));
class DecisionDetailPanel {
    constructor(panel, decision) {
        this._disposables = [];
        this._panel = panel;
        this._panel.webview.html = this._getHtml(decision);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    static show(extensionUri, decision, title = 'Decision') {
        const column = vscode.ViewColumn.Beside;
        if (DecisionDetailPanel.currentPanel) {
            DecisionDetailPanel.currentPanel._panel.title = `${title}: ${decision.id}`;
            DecisionDetailPanel.currentPanel._panel.reveal();
            DecisionDetailPanel.currentPanel._panel.webview.html = DecisionDetailPanel.currentPanel._getHtml(decision);
            return;
        }
        const panel = vscode.window.createWebviewPanel('decisionDetail', `${title}: ${decision.id}`, column, { enableScripts: true });
        DecisionDetailPanel.currentPanel = new DecisionDetailPanel(panel, decision);
    }
    _getHtml(decision) {
        // Map 'active' to 'Embedded' as requested, keep others as is
        const displayStatus = decision.status === 'active' ? 'Embedded' :
            decision.status.charAt(0).toUpperCase() + decision.status.slice(1);
        const statusColors = {
            active: 'var(--vscode-charts-green)',
            deprecated: 'var(--vscode-charts-orange)',
            overridden: 'var(--vscode-charts-red)'
        };
        const statusColor = statusColors[decision.status] || 'var(--vscode-descriptionForeground)';
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
            max-width: 800px;
            margin: 0 auto;
        }
        .header { 
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .title-group {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .id { 
            font-size: 13px; 
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-textPreformat-foreground); 
            opacity: 0.8;
        }
        .status-badge { 
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px; 
            border-radius: 12px; 
            font-size: 11px;
            font-weight: 600;
            color: ${statusColor};
            border: 1px solid ${statusColor};
            background: transparent;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${statusColor};
        }
        .scope-badge { 
            background: var(--vscode-badge-background); 
            color: var(--vscode-badge-foreground);
            padding: 2px 8px; 
            border-radius: 4px; 
            font-size: 11px;
            font-weight: 500;
        }
        .section { margin-bottom: 32px; }
        .label { 
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
            font-weight: 600;
        }
        .value { 
            font-size: 15px;
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            padding-left: 16px;
            margin-left: 4px;
        }
        .chips { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 8px; 
        }
        .chip { 
            background: var(--vscode-keybindingTable-headerBackground);
            color: var(--vscode-foreground);
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            border: 1px solid var(--vscode-widget-border);
        }
        .footer { 
            margin-top: 48px;
            padding-top: 16px;
            border-top: 1px dashed var(--vscode-widget-border);
            font-size: 12px; 
            color: var(--vscode-descriptionForeground);
            display: flex;
            justify-content: space-between;
        }
        .action-hint {
            opacity: 0.7;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title-group">
            <span class="scope-badge">${decision.scope}</span>
            <span class="id">${decision.id}</span>
        </div>
        <div class="status-badge">
            <div class="status-dot"></div>
            ${displayStatus}
        </div>
    </div>
    
    <div class="section">
        <div class="label">Decision</div>
        <div class="value">${decision.decision}</div>
    </div>

    ${decision.rationale ? `
    <div class="section">
        <div class="label">Rationale</div>
        <div class="value">${decision.rationale}</div>
    </div>
    ` : ''}

    ${decision.constraints && decision.constraints.length > 0 ? `
    <div class="section">
        <div class="label">Constraints</div>
        <div class="chips">
            ${decision.constraints.map(c => `<span class="chip">${c}</span>`).join('')}
        </div>
    </div>
    ` : ''}

    <div class="footer">
        <span>Created: ${new Date(decision.createdAt).toLocaleDateString()} ${new Date(decision.createdAt).toLocaleTimeString()}</span>
        <span class="action-hint">Use sidebar buttons to edit or delete</span>
    </div>
</body>
</html>`;
    }
    dispose() {
        DecisionDetailPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d)
                d.dispose();
        }
    }
}
exports.DecisionDetailPanel = DecisionDetailPanel;
//# sourceMappingURL=DecisionDetailPanel.js.map