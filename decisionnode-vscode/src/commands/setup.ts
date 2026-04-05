import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Save API key to global DecisionNode config
 */
function saveApiKey(apiKey: string): void {
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
function hasApiKey(): boolean {
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
export async function runSetupWizard(): Promise<void> {
    // Check if already configured
    if (hasApiKey()) {
        const result = await vscode.window.showInformationMessage(
            '✅ Gemini API key is already configured.',
            'Update Key',
            'Done'
        );
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
