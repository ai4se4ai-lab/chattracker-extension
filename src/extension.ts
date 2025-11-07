import * as vscode from 'vscode';
import { ChatTracker } from './chatTracker';
import { ConfigManager } from './configManager';
import { ApiClient } from './apiClient';
import { SummaryPanel } from './summaryPanel';
import { ChatCapture } from './chatCapture';

let chatTracker: ChatTracker;
let configManager: ConfigManager;
let apiClient: ApiClient;
let chatCapture: ChatCapture;

export function activate(context: vscode.ExtensionContext) {
    console.log('TrackChat extension is now active!');

    // Initialize managers
    configManager = new ConfigManager(context);
    apiClient = new ApiClient(configManager);
    chatTracker = new ChatTracker(context, apiClient);
    chatCapture = new ChatCapture(chatTracker);

    // Register commands
    const showSummaryCommand = vscode.commands.registerCommand('trackchat.showSummary', () => {
        SummaryPanel.createOrShow(context.extensionUri, chatTracker);
    });

    const sendSummaryCommand = vscode.commands.registerCommand('trackchat.sendSummary', async () => {
        const summary = chatTracker.getCurrentSummary();
        if (summary) {
            try {
                await apiClient.sendSummary(summary);
                vscode.window.showInformationMessage('Summary sent to API successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to send summary: ${error}`);
            }
        } else {
            vscode.window.showWarningMessage('No chat summary available yet.');
        }
    });

    const openConfigCommand = vscode.commands.registerCommand('trackchat.openConfig', () => {
        configManager.openConfigFile();
    });

    const captureFromSelectionCommand = vscode.commands.registerCommand('trackchat.captureFromSelection', async () => {
        await chatCapture.captureFromSelection();
    });

    const captureFromFileCommand = vscode.commands.registerCommand('trackchat.captureFromFile', async () => {
        await chatCapture.captureFromFile();
    });

    const captureChatCommand = vscode.commands.registerCommand('trackchat.captureChat', async () => {
        const userPrompt = await vscode.window.showInputBox({
            prompt: 'Enter the user prompt',
            placeHolder: 'User prompt...'
        });
        if (userPrompt) {
            const aiResponse = await vscode.window.showInputBox({
                prompt: 'Enter the AI response (optional)',
                placeHolder: 'AI response...'
            });
            chatCapture.captureChat(userPrompt, aiResponse);
            vscode.window.showInformationMessage('Chat captured!');
        }
    });

    const finalizeChatCommand = vscode.commands.registerCommand('trackchat.finalizeChat', () => {
        chatTracker.finalizeChat();
        vscode.window.showInformationMessage('Chat finalized. Summary ready to send.');
    });

    context.subscriptions.push(
        showSummaryCommand,
        sendSummaryCommand,
        openConfigCommand,
        captureFromSelectionCommand,
        captureFromFileCommand,
        captureChatCommand,
        finalizeChatCommand
    );

    // Start tracking chat content
    chatTracker.startTracking();

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'trackchat.showSummary';
    statusBarItem.text = '$(comment-discussion) TrackChat';
    statusBarItem.tooltip = 'Show Chat Summary';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Update status bar based on chat state
    const updateStatusBar = () => {
        const summary = chatTracker.getCurrentSummary();
        if (summary) {
            const statusIcon = {
                'completed': '$(check)',
                'in-progress': '$(sync~spin)',
                'failed': '$(error)'
            }[summary.taskStatus] || '$(circle-outline)';
            statusBarItem.text = `${statusIcon} TrackChat`;
            statusBarItem.tooltip = `Chat Summary - ${summary.taskStatus}`;
        } else {
            statusBarItem.text = '$(comment-discussion) TrackChat';
            statusBarItem.tooltip = 'Show Chat Summary';
        }
    };

    // Update status bar periodically
    const statusBarInterval = setInterval(updateStatusBar, 1000);
    context.subscriptions.push(new vscode.Disposable(() => clearInterval(statusBarInterval)));

    // Auto-send summary when chat ends (optional - can be configured)
    const autoSend = configManager.getConfig().autoSend || false;
    if (autoSend) {
        chatTracker.onChatEnd((summary) => {
            apiClient.sendSummary(summary).catch(err => {
                console.error('Auto-send failed:', err);
            });
        });
    }
}

export function deactivate() {
    if (chatTracker) {
        chatTracker.dispose();
    }
    if (chatCapture) {
        chatCapture.dispose();
    }
}

