import * as vscode from 'vscode';
import { ChatTracker } from './chatTracker';
import { ConfigManager } from './configManager';
import { ApiClient } from './apiClient';
import { SummaryPanel } from './summaryPanel';
import { ChatCapture } from './chatCapture';
import { ChatMonitor } from './chatMonitor';
import { Logger } from './logger';
import { testExtraction } from './testExtraction';
import { testUserPromptCapture } from './testUserPromptCapture';
import { ConversationViewer } from './conversationViewer';
import { MCPIntegration } from './mcpIntegration';

let chatTracker: ChatTracker;
let configManager: ConfigManager;
let apiClient: ApiClient;
let chatCapture: ChatCapture;
let chatMonitor: ChatMonitor;

export function activate(context: vscode.ExtensionContext) {
    // Initialize logger first
    Logger.initialize();
    Logger.log('🚀 TrackChat extension is now active!');
    Logger.show(); // Show the output channel automatically

    // Initialize managers
    configManager = new ConfigManager(context);
    apiClient = new ApiClient(configManager);
    chatTracker = new ChatTracker(context, apiClient);
    chatCapture = new ChatCapture(chatTracker);
    const autoSend = configManager.getConfig().autoSend || false;
    chatMonitor = new ChatMonitor(chatTracker, apiClient, autoSend, chatCapture);

    // Register commands
    const showSummaryCommand = vscode.commands.registerCommand('trackchat.showSummary', async () => {
        // Show captured chat JSON
        const chatData = chatCapture.getCapturedChatData();
        
        if (chatData.messages.length === 0) {
            vscode.window.showInformationMessage('No chat messages captured yet. Start a chat to begin capturing.');
            return;
        }

        // Create and show JSON in a new document
        const jsonContent = chatCapture.getCapturedChatJson();
        const doc = await vscode.workspace.openTextDocument({
            content: jsonContent,
            language: 'json'
        });
        await vscode.window.showTextDocument(doc);
        
        vscode.window.showInformationMessage(`Showing ${chatData.messages.length} captured chat message(s)`);
    });

    const sendSummaryCommand = vscode.commands.registerCommand('trackchat.sendSummary', async () => {
        const summary = await chatTracker.getCurrentSummary();
        if (summary) {
            try {
                await apiClient.sendSummary(summary);
                vscode.window.showInformationMessage('Summary sent to API successfully!');
                // Refresh the summary panel if it's open
                SummaryPanel.currentPanel?.update();
            } catch (error: any) {
                const errorMessage = error?.message || String(error);
                vscode.window.showErrorMessage(`Failed to send summary: ${errorMessage}`);
                Logger.error('Failed to send summary', error);
                // Don't update the summary panel with error - just show notification
            }
        } else {
            vscode.window.showWarningMessage('No chat summary available yet.');
        }
    });

    const openConfigCommand = vscode.commands.registerCommand('trackchat.openConfig', () => {
        configManager.openConfigFile();
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

    const saveToJsonCommand = vscode.commands.registerCommand('trackchat.saveToJson', async () => {
        try {
            const filePath = await chatCapture.saveToJsonFile();
            vscode.window.showInformationMessage(`Chat data saved to: ${filePath}`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to save: ${error.message}`);
        }
    });

    // Helper function to check if text is a command name or UI text
    const isCommandNameOrUIText = (text: string): boolean => {
        if (!text || typeof text !== 'string') {
            return false;
        }
        
        const trimmed = text.trim();
        const lowerText = trimmed.toLowerCase();
        
        // If text is very long (> 200 chars), it's likely actual content, not just a command/UI text
        // But still check if it's ONLY command/UI text with no actual content
        if (trimmed.length > 200) {
            // For longer text, only reject if it's clearly a summary panel dump with no actual user prompt
            // Check if it contains multiple UI elements but no substantial user content
            const uiElementCount = (lowerText.match(/chat summary|in-progress|user prompt|user objectives|main actions|modified files|trackchat:/g) || []).length;
            const hasSubstantialContent = trimmed.length > 300 || 
                                         /[a-z]{20,}/i.test(trimmed) || // Has substantial text
                                         trimmed.split('\n').length > 5; // Has multiple lines
            
            // If it has many UI elements but no substantial content, reject it
            if (uiElementCount >= 3 && !hasSubstantialContent) {
                return true;
            }
            // Otherwise, allow it - it might be a summary panel that contains actual chat
            return false;
        }
        
        // For shorter text, check for command patterns (must be at start or whole text)
        const commandPatterns = [
            /^trackchat:\s*(capture|send|show|start|stop|save|open|finalize|test)/i,
            /^command:\s*/i,
            /^cmd:\s*/i,
            /^extension:\s*/i,
            /^vscode:\s*/i,
            /^cursor:\s*/i,
            /^trackchat: start monitoring$/i,  // Exact match for common commands
            /^trackchat: stop monitoring$/i,
            /^trackchat: capture chat$/i,
            /^trackchat: send summary$/i,
            /^trackchat: show summary$/i,
        ];
        
        for (const pattern of commandPatterns) {
            if (pattern.test(trimmed)) {
                return true;
            }
        }
        
        // Check for UI text patterns - only reject if text is short and mostly UI text
        const uiTextPatterns = [
            'chat summary',
            'in-progress',
            'waiting for response',
            'not yet captured',
            'no actions detected',
            'no files modified',
            'ai response not yet',
        ];
        
        for (const pattern of uiTextPatterns) {
            if (lowerText.includes(pattern)) {
                // Only reject if it's a short text that's mostly UI text
                if (trimmed.length < 100) {
                    // Check if it's mostly UI text (more than 50% of the text)
                    const uiTextRatio = (lowerText.match(new RegExp(pattern, 'g')) || []).length * pattern.length / trimmed.length;
                    if (uiTextRatio > 0.3) {
                        return true;
                    }
                }
            }
        }
        
        // Check if text looks like a menu item or command (starts with common command prefixes)
        // Only if it's short and matches the pattern exactly
        if (trimmed.length < 100 && /^(trackchat|command|cmd|extension|vscode|cursor):\s*[a-z\s]+$/i.test(trimmed)) {
            return true;
        }
        
        return false;
    };

    const captureFromCursorChatCommand = vscode.commands.registerCommand('trackchat.captureFromCursorChat', async () => {
        try {
            const clipboardText = await vscode.env.clipboard.readText();
            
            if (!clipboardText || clipboardText.trim().length === 0) {
                vscode.window.showWarningMessage('Clipboard is empty. Please copy chat content from Cursor first.');
                return;
            }

            // Validate that clipboard doesn't contain command names or UI text
            const trimmedClipboard = clipboardText.trim();
            if (isCommandNameOrUIText(trimmedClipboard)) {
                const moreInfo = await vscode.window.showWarningMessage(
                    'Clipboard contains a command name or UI text, not chat content.',
                    'Show Help',
                    'Use Manual Capture Instead'
                );
                
                if (moreInfo === 'Show Help') {
                    vscode.window.showInformationMessage(
                        'Copy the actual conversation text from Cursor (your question and AI response), not command names or UI elements. ' +
                        'You can also use "TrackChat: Capture Chat" to manually enter the content.'
                    );
                } else if (moreInfo === 'Use Manual Capture Instead') {
                    vscode.commands.executeCommand('trackchat.captureChat');
                }
                
                Logger.warn(`⚠️  Rejected clipboard content (command/UI text): "${trimmedClipboard.substring(0, 100)}${trimmedClipboard.length > 100 ? '...' : ''}"`);
                return;
            }

            // Try to parse the clipboard content as chat
            const lines = clipboardText.split('\n');
            let userPrompt = '';
            let aiResponse = '';
            let currentSection: 'user' | 'ai' | null = null;

            // Simple parsing: look for user/AI markers or patterns
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Detect user prompts
                if (/^(you|user|prompt|question|request|i want|i need|create|build|implement|add|fix|update|how|what|why|when|where|can you|could you|please):/i.test(trimmed) || 
                    /^> /.test(trimmed) ||
                    (currentSection === null && !/^(ai|assistant|response|cursor|bot|i'll|i will|i've|i have|here's|here is):/i.test(trimmed))) {
                    if (currentSection !== 'user') {
                        if (userPrompt) userPrompt += '\n';
                        userPrompt += trimmed.replace(/^(you|user|prompt|question|request|i want|i need|create|build|implement|add|fix|update|how|what|why|when|where|can you|could you|please):\s*/i, '').replace(/^> /, '');
                        currentSection = 'user';
                    } else {
                        userPrompt += '\n' + trimmed;
                    }
                }
                // Detect AI responses
                else if (/^(ai|assistant|response|cursor|bot):/i.test(trimmed) ||
                         /^```/.test(trimmed) ||
                         /^(i'll|i will|i've|i have|here's|here is|to implement|to create|to add|to fix|to update)/i.test(trimmed)) {
                    if (currentSection !== 'ai') {
                        if (aiResponse) aiResponse += '\n';
                        aiResponse += trimmed.replace(/^(ai|assistant|response|cursor|bot):\s*/i, '');
                        currentSection = 'ai';
                    } else {
                        aiResponse += '\n' + trimmed;
                    }
                }
                // Continue current section
                else if (currentSection === 'user') {
                    userPrompt += '\n' + trimmed;
                } else if (currentSection === 'ai') {
                    aiResponse += '\n' + trimmed;
                }
            }

            // Clean up
            userPrompt = userPrompt.trim();
            aiResponse = aiResponse.trim();

            // Validate parsed user prompt is not a command name or UI text
            if (userPrompt && isCommandNameOrUIText(userPrompt)) {
                vscode.window.showWarningMessage('Parsed content appears to be a command name or UI text, not chat content. Please copy the actual chat conversation.');
                Logger.warn(`⚠️  Rejected parsed user prompt (command/UI text): "${userPrompt.substring(0, 100)}${userPrompt.length > 100 ? '...' : ''}"`);
                return;
            }

            if (userPrompt) {
                chatCapture.captureChat(userPrompt, aiResponse || undefined);
                vscode.window.showInformationMessage('Chat captured from clipboard!');
            } else {
                // If we couldn't parse, validate the raw clipboard text first
                if (isCommandNameOrUIText(trimmedClipboard)) {
                    vscode.window.showWarningMessage('Clipboard content appears to be a command name or UI text, not chat content. Please copy the actual chat conversation.');
                    return;
                }
                
                // If we couldn't parse, ask user
                const choice = await vscode.window.showQuickPick(
                    ['Use as User Prompt', 'Use as AI Response', 'Cancel'],
                    { placeHolder: 'Could not auto-detect format. How should we use this?' }
                );
                
                if (choice === 'Use as User Prompt') {
                    // Validate before capturing
                    if (isCommandNameOrUIText(trimmedClipboard)) {
                        vscode.window.showWarningMessage('Content appears to be a command name or UI text, not chat content.');
                        return;
                    }
                    chatCapture.captureChat(clipboardText);
                    vscode.window.showInformationMessage('Chat captured!');
                } else if (choice === 'Use as AI Response') {
                    const prompt = await vscode.window.showInputBox({
                        prompt: 'Enter the user prompt for this response',
                        placeHolder: 'User prompt...'
                    });
                    if (prompt) {
                        // Validate prompt is not a command name
                        if (isCommandNameOrUIText(prompt)) {
                            vscode.window.showWarningMessage('User prompt appears to be a command name or UI text.');
                            return;
                        }
                        chatCapture.captureChat(prompt, clipboardText);
                        vscode.window.showInformationMessage('Chat captured!');
                    }
                }
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to capture from clipboard: ${error.message}`);
            Logger.error('Failed to capture from clipboard', error);
        }
    });

    const captureFromSelectionCommand = vscode.commands.registerCommand('trackchat.captureFromSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const selection = editor.document.getText(editor.selection);
        if (!selection) {
            vscode.window.showWarningMessage('No text selected');
            return;
        }

        // Validate that selection is not a command name or UI text
        const trimmedSelection = selection.trim();
        if (isCommandNameOrUIText(trimmedSelection)) {
            vscode.window.showWarningMessage('Selected text appears to be a command name or UI text, not chat content.');
            Logger.warn(`⚠️  Rejected selection (command/UI text): "${trimmedSelection.substring(0, 100)}${trimmedSelection.length > 100 ? '...' : ''}"`);
            return;
        }

        // Try to detect if this is a user prompt or AI response
        const isUserPrompt = /^(user|prompt|question|request):/i.test(trimmedSelection);
        
        if (isUserPrompt) {
            chatCapture.captureChat(selection);
            vscode.window.showInformationMessage('Chat captured from selection');
        } else {
            // Ask user what type of content this is
            const choice = await vscode.window.showQuickPick(
                ['User Prompt', 'AI Response', 'Cancel'],
                { placeHolder: 'What type of content is this?' }
            );

            if (choice === 'User Prompt') {
                // Validate again before capturing
                if (isCommandNameOrUIText(trimmedSelection)) {
                    vscode.window.showWarningMessage('Selected text appears to be a command name or UI text.');
                    return;
                }
                chatCapture.captureChat(selection);
                vscode.window.showInformationMessage('User prompt captured');
            } else if (choice === 'AI Response') {
                const prompt = await vscode.window.showInputBox({
                    prompt: 'Enter the user prompt for this response',
                    placeHolder: 'User prompt...'
                });
                if (prompt) {
                    // Validate prompt is not a command name
                    if (isCommandNameOrUIText(prompt)) {
                        vscode.window.showWarningMessage('User prompt appears to be a command name or UI text.');
                        return;
                    }
                    chatCapture.captureChat(prompt, selection);
                    vscode.window.showInformationMessage('Chat captured');
                }
            }
        }
    });

    const captureFromFileCommand = vscode.commands.registerCommand('trackchat.captureFromFile', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'Text files': ['txt', 'md', 'json'],
                'All files': ['*']
            }
        });

        if (!fileUri || fileUri.length === 0) {
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(fileUri[0]);
            const content = document.getText();
            
            // Try to parse as JSON first
            try {
                const json = JSON.parse(content);
                if (json.userPrompt && json.aiResponse) {
                    chatCapture.captureChat(json.userPrompt, json.aiResponse);
                    vscode.window.showInformationMessage('Chat imported from file');
                    return;
                }
            } catch {
                // Not JSON, treat as plain text
            }

            // Parse plain text format
            const lines = content.split('\n');
            let userPrompt = '';
            let aiResponse = '';
            let currentSection = '';

            for (const line of lines) {
                if (/^(user|prompt|question):/i.test(line)) {
                    currentSection = 'user';
                    userPrompt = line.replace(/^(user|prompt|question):\s*/i, '');
                } else if (/^(ai|assistant|response):/i.test(line)) {
                    currentSection = 'ai';
                    aiResponse = line.replace(/^(ai|assistant|response):\s*/i, '');
                } else if (currentSection === 'user') {
                    userPrompt += '\n' + line;
                } else if (currentSection === 'ai') {
                    aiResponse += '\n' + line;
                }
            }

            if (userPrompt || aiResponse) {
                chatCapture.captureChat(userPrompt || content, aiResponse);
                vscode.window.showInformationMessage('Chat imported from file');
            } else {
                vscode.window.showWarningMessage('Could not parse chat content from file');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to read file: ${error.message}`);
            Logger.error('Failed to read file', error);
        }
    });

    const finalizeChatCommand = vscode.commands.registerCommand('trackchat.finalizeChat', async () => {
        await chatTracker.finalizeChat();
        vscode.window.showInformationMessage('Chat finalized. Summary ready to send.');
    });

    const startMonitoringCommand = vscode.commands.registerCommand('trackchat.startMonitoring', () => {
        chatMonitor.startMonitoring();
    });

    const stopMonitoringCommand = vscode.commands.registerCommand('trackchat.stopMonitoring', () => {
        chatMonitor.stopMonitoring();
    });

    const testExtractionCommand = vscode.commands.registerCommand('trackchat.testExtraction', async () => {
        await testExtraction(context, apiClient);
    });

    const testUserPromptCaptureCommand = vscode.commands.registerCommand('trackchat.testUserPromptCapture', async () => {
        await testUserPromptCapture(context, apiClient);
    });

    const viewConversationsCommand = vscode.commands.registerCommand('trackchat.viewConversations', () => {
        ConversationViewer.createOrShow(context.extensionUri, chatCapture);
    });

    context.subscriptions.push(
        showSummaryCommand,
        sendSummaryCommand,
        openConfigCommand,
        captureChatCommand,
        captureFromCursorChatCommand,
        captureFromSelectionCommand,
        captureFromFileCommand,
        saveToJsonCommand,
        finalizeChatCommand,
        startMonitoringCommand,
        stopMonitoringCommand,
        testExtractionCommand,
        testUserPromptCaptureCommand,
        viewConversationsCommand
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
    const updateStatusBar = async () => {
        const summary = await chatTracker.getCurrentSummary();
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

    // Auto-start monitoring if configured
    const autoTrack = configManager.getConfig().autoTrack || false;
    if (autoTrack) {
        // Start monitoring automatically after a short delay
        setTimeout(() => {
            chatMonitor.startMonitoring();
        }, 2000);
    }

    // Auto-send summary when chat ends (optional - can be configured)
    if (autoSend) {
        chatTracker.onChatEnd((summary) => {
            apiClient.sendSummary(summary).catch(err => {
                console.error('Auto-send failed:', err);
            });
        });
    }

    // Initialize MCP integration (optional)
    const config = configManager.getConfig();
    if (config.mcpServerUrl) {
        MCPIntegration.registerDefaultServer({
            mcpServerUrl: config.mcpServerUrl,
            mcpServerToken: config.mcpServerToken
        }).catch(err => {
            Logger.warn('MCP server registration failed (this is optional)');
        });
    }
}

export function deactivate() {
    if (chatMonitor) {
        chatMonitor.dispose();
    }
    if (chatTracker) {
        chatTracker.dispose();
    }
    if (chatCapture) {
        chatCapture.dispose();
    }
    Logger.dispose();
}

