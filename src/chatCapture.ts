import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatTracker } from './chatTracker';
import { Logger } from './logger';
import { ConfigManager } from './configManager';
import { ApiRequest, ChatSummary, TaskStatus } from './types';

/**
 * Simple interface for captured chat data
 */
interface CapturedChat {
    userPrompt: string;
    aiResponse?: string;
    timestamp: string;
}

/**
 * ChatCapture provides methods to capture chat content and prepare it for API submission
 */
export class ChatCapture {
    private chatTracker: ChatTracker;
    private configManager: ConfigManager;
    private capturedChats: CapturedChat[] = [];
    private disposables: vscode.Disposable[] = [];

    constructor(chatTracker: ChatTracker, configManager: ConfigManager) {
        this.chatTracker = chatTracker;
        this.configManager = configManager;
    }

    /**
     * Capture chat content (user prompt and optional AI response)
     */
    public captureChat(userPrompt: string, aiResponse?: string): void {
        if (!userPrompt || userPrompt.trim().length === 0) {
            Logger.warn('⚠️  Cannot capture empty chat content');
            return;
        }

        const captured: CapturedChat = {
            userPrompt: userPrompt.trim(),
            aiResponse: aiResponse?.trim(),
            timestamp: new Date().toISOString()
        };

        this.capturedChats.push(captured);
        Logger.log(`📝 Chat captured: ${captured.userPrompt.substring(0, 100)}${captured.userPrompt.length > 100 ? '...' : ''}`);
        
        // Also update the chat tracker for compatibility
        this.chatTracker.startNewChat(captured.userPrompt);
        if (captured.aiResponse) {
            this.chatTracker.updateAIResponse(captured.aiResponse);
        }
    }

    /**
     * Prepare JSON payload for API submission from captured chat
     */
    public async prepareApiPayload(chatIndex?: number): Promise<ApiRequest | null> {
        const config = this.configManager.getConfig();
        
        if (!config.CURSOR_CONNECTION_CODE || !config.EASYITI_API_URL) {
            Logger.error('❌ API configuration is missing. Please configure CURSOR_CONNECTION_CODE and EASYITI_API_URL');
            return null;
        }

        // Use the most recent chat if no index specified
        const chat = chatIndex !== undefined 
            ? this.capturedChats[chatIndex]
            : this.capturedChats[this.capturedChats.length - 1];

        if (!chat) {
            Logger.warn('⚠️  No chat captured yet');
            return null;
        }

        // Get current summary from chat tracker or create a basic one
        const summary = await this.createChatSummary(chat);

        const apiRequest: ApiRequest = {
            connectionCode: config.CURSOR_CONNECTION_CODE,
            eventType: 'chat-summary',
            status: summary.taskStatus,
            summary: summary
        };

        return apiRequest;
    }

    /**
     * Create a ChatSummary from captured chat data
     */
    private async createChatSummary(chat: CapturedChat): Promise<ChatSummary> {
        // Try to get summary from chat tracker first
        const trackerSummary = await this.chatTracker.getCurrentSummary();
        
        if (trackerSummary) {
            return trackerSummary;
        }

        // Otherwise create a basic summary from captured chat
        return {
            id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: chat.timestamp,
            userPrompt: chat.userPrompt,
            userObjectives: [chat.userPrompt], // Use prompt as objective
            aiResponseSummary: chat.aiResponse || '',
            mainActions: chat.aiResponse ? this.extractBasicActions(chat.aiResponse) : [],
            modifiedFiles: [],
            taskStatus: 'completed' as TaskStatus
        };
    }

    /**
     * Extract basic actions from AI response (simple extraction)
     */
    private extractBasicActions(response: string): string[] {
        const actions: string[] = [];
        const lines = response.split('\n').filter(line => line.trim().length > 0);
        
        // Look for lines that mention actions (created, modified, added, etc.)
        const actionKeywords = ['created', 'modified', 'added', 'updated', 'removed', 'deleted', 'implemented', 'fixed'];
        
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            for (const keyword of actionKeywords) {
                if (lowerLine.includes(keyword) && line.trim().length < 200) {
                    actions.push(line.trim());
                    break;
                }
            }
            if (actions.length >= 5) break; // Limit to 5 actions
        }

        return actions.length > 0 ? actions : ['Chat interaction completed'];
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
            const payload = await this.prepareApiPayload();
            if (!payload) {
                throw new Error('No chat data to save');
            }

            fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
            Logger.log(`💾 Chat data saved to: ${targetPath}`);
            return targetPath;
        } catch (error: any) {
            Logger.error(`❌ Failed to save chat data: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all captured chats
     */
    public getCapturedChats(): CapturedChat[] {
        return [...this.capturedChats];
    }

    /**
     * Clear all captured chats
     */
    public clearCapturedChats(): void {
        this.capturedChats = [];
        Logger.log('🗑️  All captured chats cleared');
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}




