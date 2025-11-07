import * as vscode from 'vscode';
import { ChatTracker } from './chatTracker';

/**
 * ChatCapture provides methods to capture chat content from Cursor
 * Since Cursor's chat API may not be directly accessible, this provides
 * alternative methods to capture chat interactions
 */
export class ChatCapture {
    private chatTracker: ChatTracker;
    private disposables: vscode.Disposable[] = [];

    constructor(chatTracker: ChatTracker) {
        this.chatTracker = chatTracker;
    }

    /**
     * Manually capture a chat interaction
     * This can be called from a command or when chat content is detected
     */
    public captureChat(userPrompt: string, aiResponse?: string): void {
        this.chatTracker.startNewChat(userPrompt);
        
        if (aiResponse) {
            this.chatTracker.updateAIResponse(aiResponse);
        }
    }

    /**
     * Try to capture chat from clipboard or selection
     */
    public async captureFromSelection(): Promise<void> {
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

        // Try to detect if this is a user prompt or AI response
        // Simple heuristic: if it starts with "User:" or similar, it's a prompt
        const isUserPrompt = /^(user|prompt|question|request):/i.test(selection.trim());
        
        if (isUserPrompt) {
            this.captureChat(selection);
            vscode.window.showInformationMessage('Chat captured from selection');
        } else {
            // Ask user what type of content this is
            const choice = await vscode.window.showQuickPick(
                ['User Prompt', 'AI Response', 'Cancel'],
                { placeHolder: 'What type of content is this?' }
            );

            if (choice === 'User Prompt') {
                this.captureChat(selection);
                vscode.window.showInformationMessage('User prompt captured');
            } else if (choice === 'AI Response') {
                // Need to have an active chat first
                const prompt = await vscode.window.showInputBox({
                    prompt: 'Enter the user prompt for this response',
                    placeHolder: 'User prompt...'
                });
                if (prompt) {
                    this.captureChat(prompt, selection);
                    vscode.window.showInformationMessage('Chat captured');
                }
            }
        }
    }

    /**
     * Capture from a file (useful for importing chat history)
     */
    public async captureFromFile(): Promise<void> {
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
                    this.captureChat(json.userPrompt, json.aiResponse);
                    vscode.window.showInformationMessage('Chat imported from file');
                    return;
                }
            } catch {
                // Not JSON, treat as plain text
            }

            // Parse plain text format (simple heuristic)
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
                this.captureChat(userPrompt || content, aiResponse);
                vscode.window.showInformationMessage('Chat imported from file');
            } else {
                vscode.window.showWarningMessage('Could not parse chat content from file');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to read file: ${error}`);
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}

