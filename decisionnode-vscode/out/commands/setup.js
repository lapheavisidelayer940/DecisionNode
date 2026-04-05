"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
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
exports.runSetupWizard = runSetupWizard;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Save API key to global DecisionNode config
 */
function saveApiKey(apiKey) {
    const configDir = path.join(os.homedir(), '.decisionnode');
    const envPath = path.join(configDir, '.env');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(envPath, `GEMINI_API_KEY=${apiKey}\n`, 'utf-8');
}
/**
 * Check if API key exists
 */
function hasApiKey() {
    const envPath = path.join(os.homedir(), '.decisionnode', '.env');
    if (!fs.existsSync(envPath)) {
        return false;
    }
    const content = fs.readFileSync(envPath, 'utf-8');
    return content.includes('GEMINI_API_KEY=') && !content.includes('GEMINI_API_KEY=\n');
}
/**
 * Simple setup - just get Gemini API key
 */
async function runSetupWizard() {
    // Check if already configured
    if (hasApiKey()) {
        const result = await vscode.window.showInformationMessage('✅ Gemini API key is already configured.', 'Update Key', 'Done');
        if (result !== 'Update Key') {
            return;
        }
    }
    // Ask for API key
    const apiKey = await vscode.window.showInputBox({
        title: 'DecisionNode Setup',
        prompt: 'Enter your Gemini API Key (get one free at https://aistudio.google.com/api-keys)',
        placeHolder: 'AIza...',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.length < 10) {
                return 'Please enter a valid API key';
            }
            return null;
        }
    });
    if (!apiKey) {
        vscode.window.showInformationMessage('Setup cancelled. You can run setup later.');
        return;
    }
    // Save the key
    saveApiKey(apiKey);
    vscode.window.showInformationMessage('✅ Gemini API key saved! Semantic search is now enabled.');
}
//# sourceMappingURL=setup.js.map