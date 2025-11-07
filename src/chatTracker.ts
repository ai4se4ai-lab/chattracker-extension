import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ApiClient } from './apiClient';
import { ChatSummary, TaskStatus } from './types';

export class ChatTracker {
    private context: vscode.ExtensionContext;
    private apiClient: ApiClient;
    private currentChat: ChatSummary | null = null;
    private chatEndCallbacks: ((summary: ChatSummary) => void)[] = [];
    private disposables: vscode.Disposable[] = [];
    private fileWatcher: vscode.FileSystemWatcher | null = null;
    private modifiedFiles: Set<string> = new Set();
    private workspaceRoot: string | undefined;

    constructor(context: vscode.ExtensionContext, apiClient: ApiClient) {
        this.context = context;
        this.apiClient = apiClient;
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    public startTracking(): void {
        // Track file changes
        if (this.workspaceRoot) {
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(this.workspaceRoot, '**/*')
            );
            
            this.fileWatcher.onDidChange((uri) => {
                if (this.currentChat) {
                    const relativePath = path.relative(this.workspaceRoot!, uri.fsPath);
                    this.modifiedFiles.add(relativePath);
                }
            });

            this.fileWatcher.onDidCreate((uri) => {
                if (this.currentChat) {
                    const relativePath = path.relative(this.workspaceRoot!, uri.fsPath);
                    this.modifiedFiles.add(relativePath);
                }
            });

            this.fileWatcher.onDidDelete((uri) => {
                if (this.currentChat) {
                    const relativePath = path.relative(this.workspaceRoot!, uri.fsPath);
                    this.modifiedFiles.add(relativePath);
                }
            });

            this.disposables.push(this.fileWatcher);
        }

        // Listen for editor changes (as a proxy for chat activity)
        const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(() => {
            // This helps track when user is actively working
            this.updateTaskStatus('in-progress');
        });

        this.disposables.push(editorChangeDisposable);

        // Monitor workspace changes
        const workspaceChangeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
            if (this.currentChat && e.document.uri.scheme === 'file') {
                const relativePath = path.relative(this.workspaceRoot || '', e.document.uri.fsPath);
                this.modifiedFiles.add(relativePath);
            }
        });

        this.disposables.push(workspaceChangeDisposable);
    }

    public startNewChat(userPrompt: string): void {
        this.currentChat = {
            id: this.generateChatId(),
            timestamp: new Date().toISOString(),
            userPrompt: userPrompt,
            userObjectives: this.extractObjectives(userPrompt),
            aiResponseSummary: '',
            mainActions: [],
            modifiedFiles: [],
            taskStatus: 'in-progress'
        };
        this.modifiedFiles.clear();
    }

    public updateAIResponse(response: string): void {
        if (!this.currentChat) {
            return;
        }

        this.currentChat.aiResponseSummary = this.summarizeResponse(response);
        this.currentChat.mainActions = this.extractActions(response);
    }

    public updateTaskStatus(status: TaskStatus): void {
        if (this.currentChat) {
            this.currentChat.taskStatus = status;
        }
    }

    public finalizeChat(): void {
        if (!this.currentChat) {
            return;
        }

        // Update modified files list
        this.currentChat.modifiedFiles = Array.from(this.modifiedFiles);

        // Determine final status if still in-progress
        if (this.currentChat.taskStatus === 'in-progress') {
            // Check if there are any errors in the workspace
            const hasErrors = vscode.languages.getDiagnostics().some(([, diagnostics]) => 
                diagnostics.some(d => d.severity === vscode.DiagnosticSeverity.Error)
            );
            this.currentChat.taskStatus = hasErrors ? 'failed' : 'completed';
        }

        // Notify callbacks
        this.chatEndCallbacks.forEach(callback => {
            try {
                callback(this.currentChat!);
            } catch (error) {
                console.error('Error in chat end callback:', error);
            }
        });

        // Auto-send if configured
        // (handled by extension.ts)

        // Keep current chat for UI display
    }

    public getCurrentSummary(): ChatSummary | null {
        if (!this.currentChat) {
            return null;
        }

        // Return a copy with current state
        return {
            ...this.currentChat,
            modifiedFiles: Array.from(this.modifiedFiles)
        };
    }

    public onChatEnd(callback: (summary: ChatSummary) => void): void {
        this.chatEndCallbacks.push(callback);
    }

    private generateChatId(): string {
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private extractObjectives(prompt: string): string[] {
        // Simple extraction - can be enhanced with NLP
        const objectives: string[] = [];
        const lines = prompt.split('\n').filter(line => line.trim());
        
        // Look for bullet points, numbered lists, or question marks
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+[.)]\s+/) || trimmed.includes('?')) {
                objectives.push(trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, ''));
            }
        });

        // If no structured objectives found, use first sentence
        if (objectives.length === 0 && lines.length > 0) {
            objectives.push(lines[0]);
        }

        return objectives.length > 0 ? objectives : [prompt.substring(0, 200)];
    }

    private summarizeResponse(response: string): string {
        // Simple summarization - extract first few sentences
        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length <= 3) {
            return response.substring(0, 500);
        }
        return sentences.slice(0, 3).join('. ') + '.';
    }

    private extractActions(response: string): string[] {
        const actions: string[] = [];
        const actionKeywords = ['created', 'modified', 'updated', 'added', 'removed', 'deleted', 'changed', 'implemented', 'fixed'];

        // Look for action patterns
        const lines = response.split('\n');
        lines.forEach(line => {
            const lowerLine = line.toLowerCase();
            actionKeywords.forEach(keyword => {
                if (lowerLine.includes(keyword)) {
                    // Extract the action sentence
                    const match = line.match(new RegExp(`[^.!?]*${keyword}[^.!?]*[.!?]?`, 'i'));
                    if (match && !actions.includes(match[0].trim())) {
                        actions.push(match[0].trim());
                    }
                }
            });
        });

        // If no actions found, create generic ones from file changes
        if (actions.length === 0 && this.modifiedFiles.size > 0) {
            actions.push(`Modified ${this.modifiedFiles.size} file(s)`);
        }

        return actions.slice(0, 10); // Limit to 10 actions
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
    }
}

