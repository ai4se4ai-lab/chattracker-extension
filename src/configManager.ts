import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ExtensionConfig {
    CURSOR_CONNECTION_CODE: string;
    EASYITI_API_URL: string;
    autoSend?: boolean;
    autoTrack?: boolean;
    mcpServerUrl?: string;
    mcpServerToken?: string;
}

export class ConfigManager {
    private configPath: string;
    private context: vscode.ExtensionContext;
    private config: ExtensionConfig | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.configPath = path.join(context.extensionPath, 'config.json');
        this.loadConfig();
    }

    private loadConfig(): void {
        try {
            if (fs.existsSync(this.configPath)) {
                const configContent = fs.readFileSync(this.configPath, 'utf8');
                this.config = JSON.parse(configContent);
            } else {
                // Create default config file
                this.config = {
                    CURSOR_CONNECTION_CODE: '',
                    EASYITI_API_URL: '',
                    autoSend: false,
                    autoTrack: true
                };
                this.saveConfig();
            }
        } catch (error) {
            console.error('Error loading config:', error);
            vscode.window.showErrorMessage('Failed to load configuration. Using defaults.');
            this.config = {
                CURSOR_CONNECTION_CODE: '',
                EASYITI_API_URL: '',
                autoSend: false,
                autoTrack: true
            };
        }
    }

    private saveConfig(): void {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving config:', error);
            vscode.window.showErrorMessage('Failed to save configuration.');
        }
    }

    public getConfig(): ExtensionConfig {
        if (!this.config) {
            this.loadConfig();
        }
        return this.config!;
    }

    public updateConfig(updates: Partial<ExtensionConfig>): void {
        if (!this.config) {
            this.loadConfig();
        }
        this.config = { ...this.config!, ...updates };
        this.saveConfig();
    }

    public openConfigFile(): void {
        if (!fs.existsSync(this.configPath)) {
            this.saveConfig();
        }
        vscode.workspace.openTextDocument(this.configPath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

    public isConfigured(): boolean {
        const config = this.getConfig();
        return !!(config.CURSOR_CONNECTION_CODE && config.EASYITI_API_URL);
    }
}

