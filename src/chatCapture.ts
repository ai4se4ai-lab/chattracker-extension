import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatTracker } from './chatTracker';
import { Logger } from './logger';

/**
 * Simple interface for captured chat message
 */
interface ChatMessage {
    prompt: string;
    response?: string;
    timestamp: string;
}

/**
 * ChatCapture monitors and captures all user prompts and AI responses in the active chat
 */
export class ChatCapture {
    private chatTracker: ChatTracker;
    private currentChatMessages: ChatMessage[] = [];
    private disposables: vscode.Disposable[] = [];
    private isMonitoring: boolean = false;

    constructor(chatTracker: ChatTracker) {
        this.chatTracker = chatTracker;
        this.startMonitoring();
    }

    /**
     * Start monitoring for new chats and capture prompts/responses
     */
    private startMonitoring(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        Logger.log('📝 ChatCapture: Started monitoring for chat messages');

        // Monitor chat documents directly
        this.monitorChatDocuments();

        // Also poll chatTracker as a backup
        this.wrapChatTrackerMethods();
    }

    /**
     * Monitor chat documents directly to capture prompts and responses
     */
    private monitorChatDocuments(): void {
        // Monitor active editor changes
        const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                // Check if it's a chat document or just check the content
                this.checkAndCaptureDocument(editor.document);
            }
        });

        // Monitor all document changes
        const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
            // Check all document changes, not just chat documents
            this.checkAndCaptureDocument(e.document);
        });

        // Monitor for new documents
        const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument((doc) => {
            this.checkAndCaptureDocument(doc);
        });

        // Check currently open documents
        vscode.workspace.textDocuments.forEach(doc => {
            this.checkAndCaptureDocument(doc);
        });

        // Also periodically check the active editor (in case it's a chat that's not detected)
        const activeEditorCheckInterval = setInterval(() => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                this.checkAndCaptureDocument(activeEditor.document);
            }
        }, 2000); // Check every 2 seconds

        this.disposables.push(
            editorChangeDisposable, 
            documentChangeDisposable, 
            documentOpenDisposable,
            new vscode.Disposable(() => clearInterval(activeEditorCheckInterval))
        );
    }

    /**
     * Check a document and capture if it looks like a chat
     */
    private checkAndCaptureDocument(document: vscode.TextDocument): void {
        // Skip output channels
        if (document.uri.scheme === 'output' || 
            document.uri.scheme === 'extension-output' ||
            document.uri.toString().includes('extension-output')) {
            return;
        }

        const content = document.getText();
        
        // Debug: log document info
        if (content && content.length > 20) {
            const isChat = this.looksLikeChat(content);
            if (isChat) {
                Logger.log(`📄 Checking document: ${document.uri.toString().substring(0, 100)}`);
                Logger.log(`   Length: ${content.length}, Looks like chat: ${isChat}`);
                this.handleChatDocumentChange(document);
            }
        }
    }

    /**
     * Check if content looks like a chat conversation
     */
    private looksLikeChat(content: string): boolean {
        const lowerContent = content.toLowerCase();
        
        // Check for common chat patterns
        const hasUserPattern = /(you|user|prompt|question|i want|i need|create|build|implement|add|fix|update|how|what|why|can you|could you):/i.test(content);
        const hasAIPattern = /(ai|assistant|cursor|bot|response):/i.test(content) ||
                             /(i'll|i will|i've|i have|here's|here is|to implement|to create)/i.test(content) ||
                             /```/.test(content);
        
        // Check for question marks (user prompts often have questions)
        const hasQuestions = (content.match(/\?/g) || []).length > 0;
        
        // Check for code blocks (AI responses often have code)
        const hasCodeBlocks = /```/.test(content);
        
        // If it has both user and AI patterns, or has questions with code blocks, it's likely a chat
        return (hasUserPattern && hasAIPattern) || (hasQuestions && hasCodeBlocks) || hasAIPattern;
    }

    /**
     * Check if a document is a chat document (by URI/name)
     */
    private isChatDocument(document: vscode.TextDocument): boolean {
        const uri = document.uri.toString();
        const scheme = document.uri.scheme;
        const fileName = path.basename(uri.toLowerCase());

        // Exclude output channels and other non-file schemes
        if (scheme === 'output' || 
            scheme === 'vscode' || 
            scheme === 'extension-output' ||
            uri.includes('extension-output') ||
            uri.includes('output:') ||
            scheme === 'git') {
            return false;
        }

        // Check for common chat indicators
        const hasChatIndicator = (
            uri.includes('/chat/') ||
            uri.includes('/conversation/') ||
            uri.includes('/cursor-chat/') ||
            fileName.includes('chat') ||
            fileName.includes('conversation')
        );

        return hasChatIndicator;
    }

    /**
     * Handle changes in a chat document
     */
    private handleChatDocumentChange(document: vscode.TextDocument): void {
        if (!this.isMonitoring) {
            return;
        }

        const content = document.getText();
        if (content && content.length > 20) {
            this.parseAndCaptureChat(content);
        }
    }

    /**
     * Parse chat content and capture prompts/responses
     */
    private parseAndCaptureChat(content: string): void {
        // Try multiple parsing strategies
        this.parseByMarkers(content);
        this.parseBySections(content);
    }

    /**
     * Parse chat by looking for explicit markers (You:, AI:, etc.)
     */
    private parseByMarkers(content: string): void {
        const lines = content.split('\n');
        let currentPrompt = '';
        let currentResponse = '';
        let inPrompt = false;
        let inResponse = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                // Empty line might indicate section change
                if (inPrompt && currentPrompt) {
                    // Prompt ended, might be starting response
                    inPrompt = false;
                }
                continue;
            }

            // Detect user prompts - look for patterns like "You:", "User:", ">", or questions
            if (/^(you|user|prompt|question|i want|i need|create|build|implement|add|fix|update|how|what|why|can you|could you|please):/i.test(line) ||
                /^> /.test(line)) {
                // If we were in a response, save it first
                if (inResponse && currentResponse) {
                    this.addMessage(currentPrompt || 'User message', currentResponse);
                    currentPrompt = '';
                    currentResponse = '';
                }
                inPrompt = true;
                inResponse = false;
                currentPrompt = line.replace(/^(you|user|prompt|question|i want|i need|create|build|implement|add|fix|update|how|what|why|can you|could you|please):\s*/i, '').replace(/^> /, '').trim();
            }
            // Detect AI responses - look for patterns like "AI:", "Assistant:", code blocks, or "I'll"
            else if (/^(ai|assistant|cursor|bot|response|i'll|i will|i've|i have|here's|here is):/i.test(line) ||
                     /^```/.test(line)) {
                // If we were in a prompt, save it first
                if (inPrompt && currentPrompt) {
                    // Keep the prompt, start response
                }
                inResponse = true;
                inPrompt = false;
                const responseLine = line.replace(/^(ai|assistant|cursor|bot|response|i'll|i will|i've|i have|here's|here is):\s*/i, '').trim();
                if (responseLine) {
                    currentResponse = currentResponse ? currentResponse + '\n' + responseLine : responseLine;
                }
            }
            // Continue current section
            else if (inPrompt) {
                currentPrompt += (currentPrompt ? '\n' : '') + line;
            } else if (inResponse) {
                currentResponse += (currentResponse ? '\n' : '') + line;
            } else {
                // No clear marker - try to infer from content
                // If line starts with common AI phrases, treat as response
                if (/^(i'll|i will|i've|i have|here's|here is|to implement|to create|let me|i can)/i.test(line)) {
                    inResponse = true;
                    currentResponse = line;
                } else if (line.includes('?') && line.length < 300) {
                    // Questions are likely prompts
                    inPrompt = true;
                    currentPrompt = line;
                }
            }
        }

        // Save the last message if we have content
        if (currentPrompt || currentResponse) {
            this.addMessage(currentPrompt || 'User message', currentResponse || undefined);
        }
    }

    /**
     * Parse chat by looking for section patterns (alternating user/AI)
     */
    private parseBySections(content: string): void {
        // Split by common separators or patterns
        const sections = content.split(/\n\s*\n|(?:^|\n)(?=```|(?:you|user|ai|assistant|cursor|bot):)/i);
        
        let lastPrompt = '';
        for (const section of sections) {
            const trimmed = section.trim();
            if (!trimmed || trimmed.length < 10) continue;

            // Check if section looks like a prompt
            if (/^(you|user|prompt|question|i want|i need|create|build|implement|add|fix|update|how|what|why|can you|could you|please)/i.test(trimmed) ||
                (trimmed.includes('?') && trimmed.length < 500)) {
                lastPrompt = trimmed.replace(/^(you|user|prompt|question|i want|i need|create|build|implement|add|fix|update|how|what|why|can you|could you|please):\s*/i, '').trim();
            }
            // Check if section looks like a response
            else if (/^(ai|assistant|cursor|bot|response|i'll|i will|i've|i have|here's|here is)/i.test(trimmed) ||
                     /```/.test(trimmed) ||
                     /^(i'll|i will|i've|i have|here's|here is|to implement|to create|let me|i can)/i.test(trimmed)) {
                const response = trimmed.replace(/^(ai|assistant|cursor|bot|response|i'll|i will|i've|i have|here's|here is):\s*/i, '').trim();
                if (lastPrompt && response) {
                    this.addMessage(lastPrompt, response);
                    lastPrompt = '';
                } else if (response && response.length > 20) {
                    // Response without clear prompt - might be continuation
                    this.addMessage('User message', response);
                }
            }
        }
    }

    /**
     * Add a message to captured chats
     */
    private addMessage(prompt: string, response?: string): void {
        if (!prompt || prompt.trim().length < 3) {
            return;
        }

        const trimmedPrompt = prompt.trim();
        
        // Check if this prompt already exists (with some tolerance for whitespace)
        const existingMessage = this.currentChatMessages.find(
            msg => msg.prompt.trim() === trimmedPrompt || 
                  msg.prompt.trim().substring(0, 50) === trimmedPrompt.substring(0, 50)
        );

        if (existingMessage) {
            // Update existing message with response if provided
            if (response && response.trim().length > 0 && !existingMessage.response) {
                existingMessage.response = response.trim();
                Logger.log(`🤖 Updated AI response for prompt: ${trimmedPrompt.substring(0, 100)}${trimmedPrompt.length > 100 ? '...' : ''}`);
            }
        } else {
            // Add new message
            const message: ChatMessage = {
                prompt: trimmedPrompt,
                response: response?.trim(),
                timestamp: new Date().toISOString()
            };
            this.currentChatMessages.push(message);
            Logger.log(`📝 Captured prompt (${this.currentChatMessages.length} total): ${trimmedPrompt.substring(0, 100)}${trimmedPrompt.length > 100 ? '...' : ''}`);
            if (response) {
                Logger.log(`🤖 Captured response: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
            }
        }
    }

    /**
     * Wrap ChatTracker methods to capture prompts and responses
     * Uses a polling mechanism to detect new chats and capture all messages
     */
    private wrapChatTrackerMethods(): void {
        let lastChatId: string = '';
        let capturedPrompts: Set<string> = new Set();

        // Poll chatTracker to detect new chats and capture all messages
        const pollInterval = setInterval(async () => {
            try {
                const summary = await this.chatTracker.getCurrentSummary();
                if (summary) {
                    // Check if this is a new chat (different chat ID)
                    if (summary.id !== lastChatId) {
                        // New chat started - clear previous messages
                        this.currentChatMessages = [];
                        capturedPrompts.clear();
                        lastChatId = summary.id;
                        Logger.log(`📝 New chat detected: ${summary.id}`);
                    }

                    // Capture all user prompts from userObjectives
                    if (summary.userObjectives && summary.userObjectives.length > 0) {
                        for (const objective of summary.userObjectives) {
                            if (objective && objective.trim().length > 0 && !capturedPrompts.has(objective)) {
                                const message: ChatMessage = {
                                    prompt: objective.trim(),
                                    timestamp: new Date().toISOString()
                                };
                                this.currentChatMessages.push(message);
                                capturedPrompts.add(objective);
                                Logger.log(`📝 Captured prompt: ${objective.substring(0, 100)}${objective.length > 100 ? '...' : ''}`);
                            }
                        }
                    } else if (summary.userPrompt && !capturedPrompts.has(summary.userPrompt)) {
                        // Fallback to userPrompt if userObjectives is empty
                        const message: ChatMessage = {
                            prompt: summary.userPrompt.trim(),
                            timestamp: new Date().toISOString()
                        };
                        this.currentChatMessages.push(message);
                        capturedPrompts.add(summary.userPrompt);
                        Logger.log(`📝 Captured prompt: ${summary.userPrompt.substring(0, 100)}${summary.userPrompt.length > 100 ? '...' : ''}`);
                    }

                    // Update AI response for the last message without a response
                    if (summary.aiResponseSummary && summary.aiResponseSummary.trim().length > 0) {
                        // Find the last message without a response
                        for (let i = this.currentChatMessages.length - 1; i >= 0; i--) {
                            if (!this.currentChatMessages[i].response) {
                                this.currentChatMessages[i].response = summary.aiResponseSummary.trim();
                                Logger.log(`🤖 Captured AI response: ${summary.aiResponseSummary.substring(0, 100)}${summary.aiResponseSummary.length > 100 ? '...' : ''}`);
                                break;
                            }
                        }
                    }
                }
            } catch (error) {
                // Silently handle errors
            }
        }, 1000); // Poll every second

        this.disposables.push(new vscode.Disposable(() => clearInterval(pollInterval)));
    }

    /**
     * Capture chat manually (called by chatMonitor or other components)
     */
    public captureChat(userPrompt: string, aiResponse?: string): void {
        if (!userPrompt || userPrompt.trim().length === 0) {
            return;
        }

        // Check if this is a continuation of the last chat or a new one
        if (this.currentChatMessages.length === 0 || 
            this.currentChatMessages[this.currentChatMessages.length - 1].response) {
            // New message
            const message: ChatMessage = {
                prompt: userPrompt.trim(),
                response: aiResponse?.trim(),
                timestamp: new Date().toISOString()
            };
            this.currentChatMessages.push(message);
        } else {
            // Update last message with response
            const lastMessage = this.currentChatMessages[this.currentChatMessages.length - 1];
            if (lastMessage.prompt === userPrompt.trim()) {
                lastMessage.response = aiResponse?.trim();
            } else {
                // Different prompt, create new message
                const message: ChatMessage = {
                    prompt: userPrompt.trim(),
                    response: aiResponse?.trim(),
                    timestamp: new Date().toISOString()
                };
                this.currentChatMessages.push(message);
            }
        }

        Logger.log(`📝 Captured chat: ${userPrompt.substring(0, 100)}${userPrompt.length > 100 ? '...' : ''}`);
    }

    /**
     * Get the captured chat data as JSON
     */
    public getCapturedChatJson(): string {
        const chatData = {
            chatId: `chat_${Date.now()}`,
            timestamp: new Date().toISOString(),
            messages: this.currentChatMessages
        };

        return JSON.stringify(chatData, null, 2);
    }

    /**
     * Get the captured chat data as object
     */
    public getCapturedChatData(): { chatId: string; timestamp: string; messages: ChatMessage[] } {
        return {
            chatId: `chat_${Date.now()}`,
            timestamp: new Date().toISOString(),
            messages: [...this.currentChatMessages]
        };
    }

    /**
     * Clear all captured messages
     */
    public clearCapturedMessages(): void {
        this.currentChatMessages = [];
        Logger.log('🗑️  Cleared all captured chat messages');
    }

    /**
     * Get the number of captured messages
     */
    public getMessageCount(): number {
        return this.currentChatMessages.length;
    }

    /**
     * Save captured chat to JSON file
     */
    public async saveToJsonFile(filePath?: string): Promise<string> {
        const defaultPath = path.join(
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || __dirname,
            'captured_chats.json'
        );
        
        const targetPath = filePath || defaultPath;
        
        try {
            const jsonContent = this.getCapturedChatJson();
            fs.writeFileSync(targetPath, jsonContent, 'utf8');
            Logger.log(`💾 Chat data saved to: ${targetPath}`);
            return targetPath;
        } catch (error: any) {
            Logger.error(`❌ Failed to save chat data: ${error.message}`);
            throw error;
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.isMonitoring = false;
    }
}
