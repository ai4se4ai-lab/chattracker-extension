import * as vscode from 'vscode';

/**
 * Logger utility for TrackChat extension
 * Uses VS Code output channel for proper log visibility
 */
export class Logger {
    private static outputChannel: vscode.OutputChannel | null = null;

    /**
     * Initialize the logger with an output channel
     */
    public static initialize(): void {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel('TrackChat');
            this.outputChannel.show(true); // Show the output channel
        }
    }

    /**
     * Log a message
     */
    public static log(message: string): void {
        if (!this.outputChannel) {
            this.initialize();
        }
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel!.appendLine(`[${timestamp}] ${message}`);
        // Also log to console for debugging
        console.log(message);
    }

    /**
     * Log an error
     */
    public static error(message: string, error?: any): void {
        if (!this.outputChannel) {
            this.initialize();
        }
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel!.appendLine(`[${timestamp}] ❌ ERROR: ${message}`);
        if (error) {
            this.outputChannel!.appendLine(`   ${error.toString()}`);
        }
        // Also log to console
        console.error(message, error);
    }

    /**
     * Log a warning
     */
    public static warn(message: string): void {
        if (!this.outputChannel) {
            this.initialize();
        }
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel!.appendLine(`[${timestamp}] ⚠️  WARNING: ${message}`);
        console.warn(message);
    }

    /**
     * Show the output channel
     */
    public static show(): void {
        if (!this.outputChannel) {
            this.initialize();
        }
        this.outputChannel!.show(true);
    }

    /**
     * Dispose the logger
     */
    public static dispose(): void {
        if (this.outputChannel) {
            this.outputChannel.dispose();
            this.outputChannel = null;
        }
    }
}

