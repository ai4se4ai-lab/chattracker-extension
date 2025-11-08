import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ApiClient } from './apiClient';
import { ChatSummary, TaskStatus } from './types';
import { Logger } from './logger';
import { GitignoreParser } from './gitignoreParser';

export class ChatTracker {
    private context: vscode.ExtensionContext;
    private apiClient: ApiClient;
    private currentChat: ChatSummary | null = null;
    private chatEndCallbacks: ((summary: ChatSummary) => void)[] = [];
    private disposables: vscode.Disposable[] = [];
    private fileWatcher: vscode.FileSystemWatcher | null = null;
    private modifiedFiles: Set<string> = new Set();
    private workspaceRoot: string | undefined;
    private gitignoreParser: GitignoreParser | null = null;
    private languageModelAvailable: boolean | null = null; // null = not checked, true = available, false = not available

    constructor(context: vscode.ExtensionContext, apiClient: ApiClient) {
        this.context = context;
        this.apiClient = apiClient;
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        // Initialize gitignore parser if workspace root exists
        if (this.workspaceRoot) {
            try {
                this.gitignoreParser = new GitignoreParser(this.workspaceRoot);
                Logger.log('📋 Gitignore parser initialized');
            } catch (error) {
                Logger.warn('Failed to initialize gitignore parser');
            }
        }
    }

    public startTracking(): void {
        // Track file changes
        if (this.workspaceRoot) {
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(this.workspaceRoot, '**/*')
            );
            
            this.fileWatcher.onDidChange((uri) => {
                if (this.currentChat) {
                    this.addModifiedFile(uri.fsPath);
                }
            });

            this.fileWatcher.onDidCreate((uri) => {
                if (this.currentChat) {
                    this.addModifiedFile(uri.fsPath);
                }
            });

            this.fileWatcher.onDidDelete((uri) => {
                if (this.currentChat) {
                    this.addModifiedFile(uri.fsPath);
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
                this.addModifiedFile(e.document.uri.fsPath);
            }
        });

        this.disposables.push(workspaceChangeDisposable);
    }

    public async startNewChat(userPrompt: string): Promise<void> {
        // Validate userPrompt
        if (!userPrompt || userPrompt.trim().length === 0) {
            Logger.warn('⚠️  Attempted to start chat with empty prompt - ignoring');
            return;
        }

        const trimmedPrompt = userPrompt.trim();
        
        // Reject prompts that are too short or just punctuation/special characters
        if (trimmedPrompt.length < 3) {
            Logger.warn('⚠️  Attempted to start chat with prompt too short - ignoring');
            Logger.warn(`   Rejected: "${trimmedPrompt}"`);
            return;
        }
        
        // Reject prompts that are only punctuation, brackets, or special characters
        if (/^[^\w\s]{1,10}$/.test(trimmedPrompt)) {
            Logger.warn('⚠️  Attempted to start chat with invalid prompt (only special characters) - ignoring');
            Logger.warn(`   Rejected: "${trimmedPrompt}"`);
            return;
        }
        
        // Reject command names and UI text (e.g., "TrackChat: Capture Chat from Cursor (Clipboard)")
        if (this.isCommandNameOrUIText(trimmedPrompt)) {
            Logger.warn('⚠️  Attempted to start chat with command name or UI text - ignoring');
            Logger.warn(`   Rejected: "${trimmedPrompt}"`);
            return;
        }
        
        // Reject JSON fragments and malformed data
        if (this.isJsonFragment(trimmedPrompt)) {
            Logger.warn('⚠️  Attempted to start chat with JSON fragment - ignoring');
            Logger.warn(`   Rejected: ${trimmedPrompt.substring(0, 100)}${trimmedPrompt.length > 100 ? '...' : ''}`);
            return;
        }
        
        if (this.isMalformedData(trimmedPrompt)) {
            Logger.warn('⚠️  Attempted to start chat with malformed data - ignoring');
            Logger.warn(`   Rejected: ${trimmedPrompt.substring(0, 100)}${trimmedPrompt.length > 100 ? '...' : ''}`);
            return;
        }
        
        // Reject error messages and system messages
        if (this.isErrorMessage(trimmedPrompt)) {
            Logger.warn('⚠️  Attempted to start chat with error message - ignoring');
            Logger.warn(`   Rejected: ${trimmedPrompt.substring(0, 100)}${trimmedPrompt.length > 100 ? '...' : ''}`);
            return;
        }
        
        // Store the full user prompt as the objective (capture all user prompts)
        const userObjectives = [trimmedPrompt];
        
        this.currentChat = {
            id: this.generateChatId(),
            timestamp: new Date().toISOString(),
            userPrompt: trimmedPrompt,
            userObjectives: userObjectives,
            aiResponseSummary: '',
            mainActions: [],
            modifiedFiles: [],
            taskStatus: 'in-progress'
        };
        this.modifiedFiles.clear();
        Logger.log('📝 ChatTracker: New chat started');
        Logger.log(`   Chat ID: ${this.currentChat.id}`);
        Logger.log(`   User Prompt: ${trimmedPrompt.substring(0, 100)}${trimmedPrompt.length > 100 ? '...' : ''}`);
        Logger.log(`   User Objectives (captured): ${this.currentChat.userObjectives.length}`);
        this.currentChat.userObjectives.forEach((obj, i) => {
            Logger.log(`     ${i + 1}. ${obj.substring(0, 80)}${obj.length > 80 ? '...' : ''}`);
        });
    }

    public async updateAIResponse(response: string): Promise<void> {
        if (!this.currentChat) {
            Logger.warn('⚠️  Cannot update AI response: No active chat');
            return;
        }

        // Validate response
        if (!response || response.trim().length === 0) {
            Logger.warn('⚠️  Cannot update AI response: Empty response');
            return;
        }

        const trimmedResponse = response.trim();
        
        // Reject responses that are too short
        if (trimmedResponse.length < 3) {
            Logger.warn('⚠️  Cannot update AI response: Response too short');
            return;
        }

        // Don't accept error messages or system messages as AI responses
        if (this.isErrorMessage(trimmedResponse)) {
            Logger.warn('⚠️  Rejected error message as AI response');
            Logger.warn(`   Rejected: ${trimmedResponse.substring(0, 100)}${trimmedResponse.length > 100 ? '...' : ''}`);
            return;
        }

        // Summarize response using AI (with fallback)
        const summary = await this.summarizeResponse(response);
        if (!summary || summary.trim().length === 0 || summary === 'No response available') {
            Logger.warn('⚠️  Summarization returned empty result, using first part of response');
            // Fallback: use first meaningful part of response
            const fallback = response.trim().substring(0, 300);
            this.currentChat.aiResponseSummary = fallback.length > 0 ? fallback : 'No response available';
        } else {
            this.currentChat.aiResponseSummary = summary;
        }
        
        this.currentChat.mainActions = this.extractActions(response);
        Logger.log('🤖 ChatTracker: AI response updated');
        Logger.log(`   Original Response Length: ${response.length} characters`);
        Logger.log(`   Response Summary: ${this.currentChat.aiResponseSummary.substring(0, 100)}${this.currentChat.aiResponseSummary.length > 100 ? '...' : ''}`);
        Logger.log(`   Actions detected: ${this.currentChat.mainActions.length}`);
        this.currentChat.mainActions.forEach((action, i) => {
            Logger.log(`     ${i + 1}. ${action.substring(0, 80)}${action.length > 80 ? '...' : ''}`);
        });
    }

    public updateTaskStatus(status: TaskStatus): void {
        if (this.currentChat) {
            this.currentChat.taskStatus = status;
        }
    }

    /**
     * Add a modified file, checking gitignore
     */
    private addModifiedFile(filePath: string): void {
        if (!this.workspaceRoot) {
            return;
        }

        const relativePath = path.relative(this.workspaceRoot, filePath);
        
        // Check if file should be ignored
        if (this.gitignoreParser) {
            // Use the full absolute path for gitignore checking
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
            if (this.gitignoreParser.shouldIgnore(fullPath)) {
                Logger.log(`🚫 Ignoring file (gitignore): ${relativePath}`);
                return;
            }
        }

        this.modifiedFiles.add(relativePath);
    }

    public async finalizeChat(): Promise<void> {
        if (!this.currentChat) {
            return;
        }

        // Ensure objectives are populated (use userPrompt if empty)
        if (!this.currentChat.userObjectives || this.currentChat.userObjectives.length === 0) {
            if (this.currentChat.userPrompt && this.currentChat.userPrompt.trim().length > 0) {
                this.currentChat.userObjectives = [this.currentChat.userPrompt.trim()];
                Logger.log('📋 Using user prompt as objective during finalization');
            } else {
                this.currentChat.userObjectives = ['No user prompt captured'];
            }
        }

        // Ensure actions are populated (use file changes if empty)
        if (!this.currentChat.mainActions || this.currentChat.mainActions.length === 0) {
            if (this.modifiedFiles.size > 0) {
                const files = Array.from(this.modifiedFiles);
                this.currentChat.mainActions = files.map(f => `Modified: ${f}`);
                Logger.log('📋 Generated actions from file changes');
            }
        }

        // Update modified files list, filtering out ignored files
        let files = Array.from(this.modifiedFiles);
        
        if (this.gitignoreParser && this.workspaceRoot) {
            // Filter files using gitignore parser
            const fullPaths = files.map(f => path.join(this.workspaceRoot!, f));
            const filteredPaths = this.gitignoreParser.filterFiles(fullPaths);
            files = filteredPaths.map(f => path.relative(this.workspaceRoot!, f));
            Logger.log(`📁 Filtered modified files: ${this.modifiedFiles.size} -> ${files.length} (after gitignore)`);
        }

        this.currentChat.modifiedFiles = files;

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

    public async getCurrentSummary(): Promise<ChatSummary | null> {
        if (!this.currentChat) {
            return null;
        }

        // Ensure objectives are populated (use userPrompt if empty)
        let objectives = this.currentChat.userObjectives;
        if (!objectives || objectives.length === 0) {
            if (this.currentChat.userPrompt && this.currentChat.userPrompt.trim().length > 0) {
                // Use the full user prompt as the objective
                objectives = [this.currentChat.userPrompt.trim()];
            } else {
                objectives = ['No user prompt captured'];
            }
        }
        
        // Only filter out JSON fragments and malformed data - don't filter based on content
        // since we want to capture ALL user prompts, even if they mention UI elements
        objectives = objectives.filter(obj => {
            if (!obj || typeof obj !== 'string') return false;
            
            // Only filter out JSON fragments and malformed data
            // Don't filter based on keywords since these might be legitimate user prompts
            if (this.isJsonFragment(obj) || this.isMalformedData(obj)) {
                return false;
            }
            
            return obj.trim().length > 0;
        });
        
        // Ensure we have at least one objective
        if (objectives.length === 0) {
            // Fallback to user prompt if objectives were filtered out
            if (this.currentChat.userPrompt && this.currentChat.userPrompt.trim().length > 0) {
                objectives = [this.currentChat.userPrompt.trim()];
            } else {
                objectives = ['No user prompt captured'];
            }
        }

        // Ensure actions are populated from file changes if empty
        let actions = this.currentChat.mainActions || [];
        if (!actions || actions.length === 0) {
            if (this.modifiedFiles.size > 0) {
                const files = Array.from(this.modifiedFiles);
                if (files.length === 1) {
                    actions = [`Modified file: ${files[0]}`];
                } else {
                    actions = [`Modified ${files.length} files`];
                }
            }
        }
        
        // Filter out placeholder text and UI elements from actions
        actions = actions.filter(action => {
            if (!action || typeof action !== 'string') return false;
            const lower = action.toLowerCase();
            return !lower.includes('not yet captured') && 
                   !lower.includes('waiting for response') &&
                   !lower.includes('no response available') &&
                   !lower.includes('ai response not yet') &&
                   !lower.includes('chat summary') &&
                   !lower.includes('in-progress');
        });

        // Filter modified files based on gitignore
        let files = Array.from(this.modifiedFiles);
        if (this.gitignoreParser && this.workspaceRoot) {
            const fullPaths = files.map(f => {
                // Handle both relative and absolute paths
                if (path.isAbsolute(f)) {
                    return f;
                }
                return path.join(this.workspaceRoot!, f);
            });
            const filteredPaths = this.gitignoreParser.filterFiles(fullPaths);
            files = filteredPaths.map(f => {
                // Return relative path
                if (path.isAbsolute(f)) {
                    return path.relative(this.workspaceRoot!, f);
                }
                return f;
            });
            // Log only if files were actually filtered out
            const removedCount = Array.from(this.modifiedFiles).length - files.length;
            if (removedCount > 0) {
                Logger.log(`📋 Filtered ${Array.from(this.modifiedFiles).length} files to ${files.length} (removed ${removedCount} ignored files)`);
            }
        }

        // Return a copy with current state, ensuring all fields are populated
        return {
            ...this.currentChat,
            userObjectives: objectives,
            mainActions: actions,
            modifiedFiles: files
        };
    }

    public onChatEnd(callback: (summary: ChatSummary) => void): void {
        this.chatEndCallbacks.push(callback);
    }

    private generateChatId(): string {
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async extractObjectives(prompt: string): Promise<string[]> {
        if (!prompt || prompt.trim().length === 0) {
            return ['No objectives specified'];
        }

        const cleanPrompt = prompt.trim();
        
        // Filter out JSON fragments and malformed data
        if (this.isJsonFragment(cleanPrompt)) {
            Logger.warn('⚠️  Rejected JSON fragment as user prompt');
            return ['No objectives specified'];
        }

        // Try to use AI to extract objectives (only if we haven't determined it's unavailable)
        if (this.languageModelAvailable !== false) {
            try {
                const aiObjectives = await this.extractObjectivesWithAI(cleanPrompt);
                if (aiObjectives && aiObjectives.length > 0) {
                    // Filter out JSON fragments and malformed data from AI results
                    const filtered = aiObjectives.filter(obj => 
                        !this.isJsonFragment(obj) && !this.isMalformedData(obj) && obj.trim().length > 0
                    );
                    if (filtered.length > 0) {
                        Logger.log(`🤖 AI extracted ${filtered.length} objectives`);
                        return filtered;
                    }
                }
            } catch (error) {
                // Only log the first time we discover AI is unavailable
                if (this.languageModelAvailable === null) {
                    Logger.log('ℹ️  AI language models not available, using rule-based extraction');
                    this.languageModelAvailable = false;
                }
                // Silently fall through to rule-based extraction
            }
        }

        // Fallback to rule-based extraction
        return this.extractObjectivesRuleBased(cleanPrompt);
    }

    private async extractObjectivesWithAI(prompt: string): Promise<string[]> {
        try {
            // Get available language models
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot', // Use Copilot/Cursor models
                family: 'gpt-4' // Prefer GPT-4 family
            });

            let model;
            if (models.length === 0) {
                // Try any available model
                const allModels = await vscode.lm.selectChatModels({});
                if (allModels.length === 0) {
                    throw new Error('No language models available');
                }
                model = allModels[0];
            } else {
                model = models[0];
            }
            
            const promptText = `Extract the main objectives or goals from the following user prompt. Return only a JSON array of strings, where each string is a clear, concise objective (max 200 characters each). Do not include any explanation or additional text, only the JSON array.

User Prompt:
${prompt}

Return format: ["objective1", "objective2", ...]`;

            const request = await model.sendRequest(
                [
                    { role: vscode.LanguageModelChatMessageRole.User, content: promptText as any, name: undefined }
                ],
                {},
                new vscode.CancellationTokenSource().token
            );

            let responseText = '';
            for await (const fragment of request.text) {
                responseText += fragment;
            }

            // Parse the JSON response
            const cleaned = responseText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            const objectives = JSON.parse(cleaned);
            
            if (Array.isArray(objectives) && objectives.length > 0) {
                this.languageModelAvailable = true; // Mark as available on success
                return objectives.filter((obj: any) => typeof obj === 'string' && obj.trim().length > 0);
            }
        } catch (error) {
            // Mark as unavailable if we get an error
            this.languageModelAvailable = false;
            throw error;
        }

        return [];
    }

    private extractObjectivesRuleBased(prompt: string): string[] {
        const objectives: string[] = [];
        const cleanPrompt = prompt.trim();
        
        const lines = cleanPrompt.split('\n').filter(line => line.trim());
        
        // Look for bullet points, numbered lists, or question marks
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+[.)]\s+/) || trimmed.includes('?')) {
                const clean = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
                // Filter out JSON fragments and malformed data
                if (clean.length > 0 && clean.length < 200 && !this.isJsonFragment(clean) && !this.isMalformedData(clean)) {
                    objectives.push(clean);
                }
            }
        });

        // If no structured objectives found, try to extract from sentences
        if (objectives.length === 0) {
            // Split by sentences (including short prompts without punctuation)
            let sentences = cleanPrompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
            
            // If no sentence delimiters found, treat the whole prompt as one sentence
            if (sentences.length === 0 || (sentences.length === 1 && sentences[0] === cleanPrompt)) {
                sentences = [cleanPrompt];
            }
            
            // Look for imperative verbs (create, add, implement, fix, etc.)
            const imperativePattern = /(create|add|implement|fix|update|build|make|write|generate|develop|design|improve|enhance|refactor|optimize|remove|delete|change|modify|replace|set up|configure|install|test|run|deploy|show|display|render|add|insert|remove|delete|edit|modify|update|change|replace|move|copy|paste|cut|select|choose|pick|use|apply|enable|disable|activate|deactivate|start|stop|pause|resume|open|close|save|load|import|export|upload|download|send|receive|submit|cancel|confirm|deny|accept|reject|approve|disapprove|allow|forbid|permit|prohibit|grant|revoke|give|take|get|put|post|patch|delete|head|options|trace|connect)\s+[^.!?]{3,200}/i;
            
            sentences.forEach(sentence => {
                const trimmedSentence = sentence.trim();
                // Check if sentence starts with imperative verb (even if short)
                if (trimmedSentence.length >= 5) {
                    // Filter out JSON fragments and malformed data
                    if (this.isJsonFragment(trimmedSentence) || this.isMalformedData(trimmedSentence)) {
                        return;
                    }
                    
                    const match = trimmedSentence.match(imperativePattern);
                    if (match) {
                        const objective = match[0].trim();
                        if (objective.length >= 5 && objective.length < 200 && !this.isJsonFragment(objective) && !this.isMalformedData(objective)) {
                            const normalized = objective.toLowerCase();
                            if (!objectives.some(obj => obj.toLowerCase() === normalized)) {
                                objectives.push(objective);
                            }
                        }
                    } else if (trimmedSentence.length >= 5 && trimmedSentence.length < 200) {
                        // If it's a reasonable length and no match, use the whole sentence
                        const normalized = trimmedSentence.toLowerCase();
                        if (!objectives.some(obj => obj.toLowerCase() === normalized)) {
                            objectives.push(trimmedSentence);
                        }
                    }
                }
            });

            // If still no objectives, use the prompt itself (if reasonable length)
            if (objectives.length === 0) {
                // Only use prompt if it's not JSON or malformed
                if (!this.isJsonFragment(cleanPrompt) && !this.isMalformedData(cleanPrompt)) {
                    if (cleanPrompt.length >= 5 && cleanPrompt.length <= 200) {
                        objectives.push(cleanPrompt);
                    } else if (cleanPrompt.length > 200) {
                        objectives.push(cleanPrompt.substring(0, 200) + '...');
                    }
                }
            }
        }

        // Final filter to remove any JSON fragments or malformed data that slipped through
        const filteredObjectives = objectives.filter(obj => 
            !this.isJsonFragment(obj) && !this.isMalformedData(obj) && obj.trim().length > 0
        );

        return filteredObjectives.length > 0 ? filteredObjectives : ['No clear objectives found'];
    }

    private async summarizeResponse(response: string): Promise<string> {
        if (!response || response.trim().length === 0) {
            return 'No response available';
        }

        // Try to use AI to summarize the response (only if we haven't determined it's unavailable)
        if (this.languageModelAvailable !== false) {
            try {
                const aiSummary = await this.summarizeResponseWithAI(response);
                if (aiSummary && aiSummary.trim().length > 0) {
                    Logger.log('🤖 AI generated response summary');
                    return aiSummary;
                }
            } catch (error) {
                // Only log the first time we discover AI is unavailable
                if (this.languageModelAvailable === null) {
                    Logger.log('ℹ️  AI language models not available, using rule-based summarization');
                    this.languageModelAvailable = false;
                }
                // Silently fall through to rule-based summarization
            }
        }

        // Fallback to rule-based summarization
        return this.summarizeResponseRuleBased(response);
    }

    private async summarizeResponseWithAI(response: string): Promise<string> {
        try {
            // Get available language models
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot', // Use Copilot/Cursor models
                family: 'gpt-4' // Prefer GPT-4 family
            });

            let model;
            if (models.length === 0) {
                // Try any available model
                const allModels = await vscode.lm.selectChatModels({});
                if (allModels.length === 0) {
                    throw new Error('No language models available');
                }
                model = allModels[0];
            } else {
                model = models[0];
            }

            // Truncate response if too long (to avoid token limits)
            const maxLength = 8000;
            const truncatedResponse = response.length > maxLength 
                ? response.substring(0, maxLength) + '\n\n[... response truncated ...]'
                : response;

            const promptText = `Summarize the following AI response in 2-4 sentences. Focus on the main actions, changes, or information provided. Keep it concise and clear (max 500 characters).

AI Response:
${truncatedResponse}

Return only the summary text, no additional explanation or formatting.`;

            const request = await model.sendRequest(
                [
                    { role: vscode.LanguageModelChatMessageRole.User, content: promptText as any, name: undefined }
                ],
                {},
                new vscode.CancellationTokenSource().token
            );

            let responseText = '';
            for await (const fragment of request.text) {
                responseText += fragment;
            }

            const summary = responseText.trim();
            if (summary.length > 0 && summary.length <= 500) {
                this.languageModelAvailable = true; // Mark as available on success
                return summary;
            } else if (summary.length > 500) {
                this.languageModelAvailable = true; // Mark as available on success
                return summary.substring(0, 500);
            }
        } catch (error) {
            // Mark as unavailable if we get an error
            this.languageModelAvailable = false;
            throw error;
        }

        return '';
    }

    private summarizeResponseRuleBased(response: string): string {
        // Remove code blocks and file diffs for better summarization
        let cleanResponse = response
            .replace(/```[\s\S]*?```/g, '[code block]')
            .replace(/^[\+\-].*$/gm, '') // Remove diff markers
            .replace(/^\s*[a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx|json|css|html|md|txt|py|java|cpp|h)\s*$/gm, '') // Remove file names on their own line
            .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines
        
        // If after cleaning, we have very little content, use original response
        if (cleanResponse.trim().length < 20) {
            // Use original response but limit length
            return response.trim().substring(0, 500);
        }
        
        // Try to extract meaningful summary
        // Look for sections marked with colons (common in structured responses)
        const colonSections = cleanResponse.split(/:\s*\n/).filter(s => s.trim().length > 20);
        if (colonSections.length > 0) {
            // Take first meaningful section
            const firstSection = colonSections[0].trim();
            if (firstSection.length > 20 && firstSection.length < 500) {
                return firstSection.substring(0, 500);
            }
        }
        
        // Split by sentences (including colons as sentence boundaries)
        // Use a more lenient sentence splitter
        const sentences = cleanResponse.split(/[.!?\n]+/).filter(s => s.trim().length > 5);
        
        if (sentences.length === 0) {
            // If no sentences found, return first meaningful part of response
            const firstPart = cleanResponse.trim().substring(0, 300);
            if (firstPart.length > 0) {
                return firstPart;
            }
            // Last resort: use original response
            return response.trim().substring(0, 500);
        }

        if (sentences.length <= 3) {
            // If 3 or fewer sentences, return all
            const summary = sentences.join('. ').trim();
            if (summary.length > 0) {
                return summary + (summary.endsWith('.') ? '' : '.');
            }
            // Fallback to cleaned response
            return cleanResponse.trim().substring(0, 500);
        }

        // Take first 3-5 sentences for summary (prefer more context)
        const summary = sentences.slice(0, 5).join('. ').trim();
        if (summary.length > 0) {
            return summary + (summary.endsWith('.') ? '' : '.');
        }
        
        // Final fallback: use cleaned response
        return cleanResponse.trim().substring(0, 500);
    }

    private extractActions(response: string): string[] {
        const actions: string[] = [];
        
        if (!response || response.trim().length === 0) {
            // If no response, check file changes
            if (this.modifiedFiles.size > 0) {
                const files = Array.from(this.modifiedFiles);
                if (files.length === 1) {
                    actions.push(`Modified file: ${files[0]}`);
                } else if (files.length <= 5) {
                    files.forEach(file => {
                        actions.push(`Modified: ${file}`);
                    });
                } else {
                    actions.push(`Modified ${files.length} files`);
                }
            }
            return actions;
        }

        // Clean response for better extraction
        let cleanResponse = response
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/^[\+\-].*$/gm, '') // Remove diff markers
            .replace(/\n{3,}/g, '\n\n'); // Normalize newlines

        // Extract structured sections (lines starting with action words or colons)
        const lines = cleanResponse.split('\n').filter((line: string) => line.trim().length > 5);
        
        // Look for action keywords in the response text
        const actionKeywords = [
            'created', 'modified', 'updated', 'added', 'removed', 'deleted', 
            'changed', 'implemented', 'fixed', 'improved', 'enhanced', 'refactored',
            'optimized', 'replaced', 'moved', 'renamed', 'configured', 'set up',
            'installed', 'uninstalled', 'generated', 'built', 'compiled', 'tested',
            'reviewing', 'exploring', 'creating', 'adding', 'removing', 'updating',
            'i\'ll', 'i will', 'i\'ve', 'i have', 'we\'ll', 'we will'
        ];

        // First, look for structured sections (lines that start with action verbs or have colons)
        lines.forEach((line: string) => {
            const trimmed = line.trim();
            // Check if line starts with an action verb or contains a colon (structured format)
            if (/^[A-Z][^:]*:/i.test(trimmed) || /^(created|added|modified|updated|removed|implemented|fixed|improved|enhanced|refactored|optimized|replaced|moved|renamed|configured|set up|installed|generated|built|compiled|tested|reviewing|exploring|creating|adding|removing|updating)/i.test(trimmed)) {
                // Extract action from line
                let action = trimmed;
                // If it has a colon, take the part before colon
                if (action.includes(':')) {
                    action = action.split(':')[0].trim() + ': ' + action.split(':').slice(1).join(':').trim();
                }
                if (action.length > 10 && action.length < 200) {
                    const normalized = action.toLowerCase();
                    if (!actions.some(a => a.toLowerCase() === normalized || a.toLowerCase().includes(normalized) || normalized.includes(a.toLowerCase()))) {
                        actions.push(action);
                    }
                }
            }
        });

        // If we found structured actions, use those
        if (actions.length > 0) {
            return actions.slice(0, 10);
        }

        // Otherwise, look for action patterns in sentences
        const sentences = cleanResponse.split(/[.!?\n]+/).filter((s: string) => s.trim().length > 5);
        
        sentences.forEach((sentence: string) => {
            const lowerSentence = sentence.toLowerCase().trim();
            actionKeywords.forEach(keyword => {
                if (lowerSentence.includes(keyword)) {
                    // Extract the action sentence (limit length)
                    const action = sentence.trim();
                    if (action.length > 10 && action.length < 200) {
                        // Avoid duplicates
                        const normalized = action.toLowerCase();
                        if (!actions.some(a => {
                            const aNorm = a.toLowerCase();
                            return aNorm === normalized || aNorm.includes(normalized) || normalized.includes(aNorm);
                        })) {
                            actions.push(action);
                        }
                    }
                }
            });
        });

        // Also check for file-specific actions
        const filePatterns = [
            /(created|added|modified|updated|deleted|removed)\s+(the\s+)?(file|files?|component|module|function|class|interface|type|config|setting)/i,
            /(created|added|modified|updated)\s+[a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx|json|css|html|md|txt|py|java|cpp|h)/i
        ];

        sentences.forEach((sentence: string) => {
            filePatterns.forEach(pattern => {
                const match = sentence.match(pattern);
                if (match) {
                    const action = sentence.trim();
                    if (action.length > 10 && action.length < 200) {
                        const normalized = action.toLowerCase();
                        if (!actions.some(a => {
                            const aNorm = a.toLowerCase();
                            return aNorm === normalized || aNorm.includes(normalized) || normalized.includes(aNorm);
                        })) {
                            actions.push(action);
                        }
                    }
                }
            });
        });

        // Check file changes as fallback
        if (actions.length === 0 && this.modifiedFiles.size > 0) {
            const files = Array.from(this.modifiedFiles);
            if (files.length === 1) {
                actions.push(`Modified file: ${files[0]}`);
            } else if (files.length <= 5) {
                files.forEach(file => {
                    actions.push(`Modified: ${file}`);
                });
            } else {
                actions.push(`Modified ${files.length} files`);
            }
        }

        // If still no actions from text, create a generic one from response
        if (actions.length === 0 && cleanResponse.trim().length > 0) {
            // Extract first meaningful sentence
            const firstSentence = sentences[0]?.trim();
            if (firstSentence && firstSentence.length > 10) {
                const action = firstSentence.substring(0, 150);
                // Don't add error messages or placeholder text as actions
                if (!action.toLowerCase().includes('not yet captured') && 
                    !action.toLowerCase().includes('waiting for') &&
                    !action.toLowerCase().includes('no response')) {
                    actions.push(action);
                }
            } else {
                // Use first part of response, but filter out error messages
                const fallback = cleanResponse.trim().substring(0, 100);
                if (fallback.length > 0 && 
                    !fallback.toLowerCase().includes('not yet captured') && 
                    !fallback.toLowerCase().includes('waiting for') &&
                    !fallback.toLowerCase().includes('no response')) {
                    actions.push(fallback + '...');
                }
            }
        }

        // Filter out any actions that are error messages or placeholders
        const validActions = actions.filter(action => {
            const lower = action.toLowerCase();
            return !lower.includes('not yet captured') && 
                   !lower.includes('waiting for response') &&
                   !lower.includes('no response available') &&
                   !lower.includes('ai response not yet');
        });

        return validActions.slice(0, 10); // Limit to 10 actions
    }

    /**
     * Check if a string is a JSON fragment (malformed JSON or JSON-like text)
     */
    private isJsonFragment(text: string): boolean {
        if (!text || typeof text !== 'string') {
            return false;
        }
        
        const trimmed = text.trim();
        
        // Check for JSON-like patterns that indicate fragments
        const jsonPatterns = [
            /^[^"]*"[^"]*":\s*"[^"]*"[,\]}]*$/,  // JSON key-value pairs
            /^[^"]*"[^"]*":\s*\[[^\]]*\]/,       // JSON arrays
            /^[^"]*"[^"]*":\s*\{[^\}]*\}/,       // JSON objects
            /^\d+[A-Z]",\s*"[^"]*":\s*"[^"]*"/,  // Pattern like "326Z", "key": "value"
            /^[^"]*"\s*,\s*"[^"]*":\s*/,         // Comma-separated JSON fragments
            /^[^"]*\}\s*,\s*"[^"]*":\s*/,        // Closing brace followed by key
            /^[^"]*\]\s*,\s*"[^"]*":\s*/,        // Closing bracket followed by key
        ];
        
        // Check if text looks like JSON fragment
        for (const pattern of jsonPatterns) {
            if (pattern.test(trimmed)) {
                // Additional check: if it contains multiple JSON-like elements, it's likely a fragment
                const jsonElementCount = (trimmed.match(/"[^"]*":/g) || []).length;
                if (jsonElementCount >= 2) {
                    return true;
                }
            }
        }
        
        // Check for patterns like: 326Z", "userPrompt": "}", "userObjectives": [ "}" ]
        if (/^\d+[A-Z]"\s*,\s*"[^"]*":\s*"[^"]*"\s*,\s*"[^"]*":\s*\[/.test(trimmed)) {
            return true;
        }
        
        // Check if it's mostly JSON syntax (quotes, colons, brackets, braces)
        const jsonCharCount = (trimmed.match(/["{}[\],:]/g) || []).length;
        const totalCharCount = trimmed.length;
        if (totalCharCount > 0 && jsonCharCount / totalCharCount > 0.3) {
            // If more than 30% of characters are JSON syntax, it's likely a fragment
            return true;
        }
        
        return false;
    }

    /**
     * Check if a string is malformed data (contains broken JSON, incomplete structures, etc.)
     */
    private isMalformedData(text: string): boolean {
        if (!text || typeof text !== 'string') {
            return false;
        }
        
        const trimmed = text.trim();
        
        // Check for incomplete JSON structures
        const malformedPatterns = [
            /^[^"]*"[^"]*":\s*"\}"\s*,\s*"[^"]*":\s*\[\s*"\}"\s*\]/,  // Pattern like: "key": "}", "key2": [ "}" ]
            /^[^"]*"\s*\}\s*,\s*"[^"]*":\s*/,                        // Incomplete structures
            /^[^"]*\]\s*,\s*"[^"]*":\s*/,                            // Incomplete arrays
            /^\d+[A-Z]"\s*,\s*"[^"]*":\s*"\}"\s*,\s*"[^"]*":\s*\[\s*"\}"\s*\]/,  // Specific malformed pattern
        ];
        
        for (const pattern of malformedPatterns) {
            if (pattern.test(trimmed)) {
                return true;
            }
        }
        
        // Check for unbalanced brackets/braces/quotes
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;
        const openBrackets = (trimmed.match(/\[/g) || []).length;
        const closeBrackets = (trimmed.match(/\]/g) || []).length;
        const quotes = (trimmed.match(/"/g) || []).length;
        
        // If there are many brackets/braces/quotes but they're unbalanced, it's likely malformed
        if ((openBraces + closeBraces + openBrackets + closeBrackets) > 2 && 
            (openBraces !== closeBraces || openBrackets !== closeBrackets)) {
            return true;
        }
        
        // If there are many quotes but odd number, might be malformed
        if (quotes > 4 && quotes % 2 !== 0) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if a string is a command name or UI text
     */
    private isCommandNameOrUIText(text: string): boolean {
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
    }

    /**
     * Check if a string is an error message or system message
     */
    private isErrorMessage(text: string): boolean {
        const lowerText = text.toLowerCase();
        
        // Check for error patterns
        const errorPatterns = [
            'error:',
            'api error',
            'failed to',
            'network error',
            'request error',
            'bad request',
            'send summary:',
            'failed to send',
            'could not',
            'unable to',
            'exception:',
            'warning:',
            '⚠️',
            '❌',
            'status code:',
            'http error',
            '[7:',  // Log timestamp pattern like [7:30:44 PM]
            'full request payload',
            'error response',
            'missing required',
            'eventtype and status',
            '400',
            '401',
            '403',
            '404',
            '500',
            '502',
            '503'
        ];
        
        // Check if text starts with or contains error patterns
        for (const pattern of errorPatterns) {
            if (lowerText.includes(pattern)) {
                // Additional check: if it's a short message that's mostly error-related, reject it
                if (text.length < 200 && (
                    lowerText.startsWith(pattern) || 
                    lowerText.includes(`: ${pattern}`) ||
                    lowerText.includes(`${pattern} `) ||
                    lowerText.includes(`[${pattern}`)
                )) {
                    return true;
                }
            }
        }
        
        // Check for log message patterns (lines starting with timestamps like [7:30:44 PM])
        if (/^\[\d{1,2}:\d{2}:\d{2}\s+(AM|PM)\]\s*[❌⚠️]/.test(text)) {
            return true;
        }
        
        // Check for common error message structures
        if (/^(send|sending|failed|error|warning|api|network|request)/i.test(lowerText.trim())) {
            // If it's a short message starting with these words, it's likely an error
            if (text.length < 150) {
                return true;
            }
        }
        
        // Check for error messages that contain status codes and error descriptions
        if (/\d{3}\s*-\s*(missing|required|error|failed)/i.test(text)) {
            return true;
        }
        
        return false;
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
    }
}

