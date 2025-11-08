import * as vscode from 'vscode';
import * as path from 'path';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: string;
  lastUpdated: string;
}

export class ChatCapture {
  private sessions: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Cursor Chat Tracker');
  }

  /**
   * Start tracking a new chat session
   */
  startSession(sessionId?: string): string {
    const id = sessionId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        id,
        messages: [],
        createdAt: now,
        lastUpdated: now
      });
    }

    this.currentSessionId = id;
    this.log(`Started tracking chat session: ${id}`);
    return id;
  }

  /**
   * Add a message to the current or specified session
   */
  addMessage(role: 'user' | 'assistant', content: string, sessionId?: string): void {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      this.log('Warning: No active session, creating new one');
      this.startSession();
      return;
    }

    let session = this.sessions.get(id);
    if (!session) {
      session = {
        id,
        messages: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      this.sessions.set(id, session);
    }

    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date().toISOString()
    };

    session.messages.push(message);
    session.lastUpdated = new Date().toISOString();
    
    this.log(`Added ${role} message to session ${id} (${session.messages.length} total messages)`);
  }

  /**
   * Get chat data for export
   */
  getChatData(sessionId?: string): ChatSession | null {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      return null;
    }

    return this.sessions.get(id) || null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Set the current session
   */
  setCurrentSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.currentSessionId = sessionId;
      this.log(`Switched to session: ${sessionId}`);
    }
  }

  /**
   * Clear a session
   */
  clearSession(sessionId?: string): void {
    const id = sessionId || this.currentSessionId;
    if (id) {
      this.sessions.delete(id);
      if (this.currentSessionId === id) {
        this.currentSessionId = null;
      }
      this.log(`Cleared session: ${id}`);
    }
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.sessions.clear();
    this.currentSessionId = null;
    this.log('Cleared all sessions');
  }

  /**
   * Try to capture chat from clipboard or selection
   */
  async captureFromSelection(): Promise<boolean> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (editor && !editor.selection.isEmpty) {
        const text = editor.document.getText(editor.selection);
        this.addMessage('user', text);
        return true;
      }

      // Try clipboard
      const clipboardText = await vscode.env.clipboard.readText();
      if (clipboardText && clipboardText.length > 10) {
        this.addMessage('user', clipboardText);
        return true;
      }

      return false;
    } catch (error) {
      this.log(`Error capturing from selection: ${error}`);
      return false;
    }
  }

  /**
   * Monitor document changes for AI-generated code
   */
  captureCodeChange(
    document: vscode.TextDocument,
    changes: readonly vscode.TextDocumentContentChangeEvent[]
  ): void {
    const significantChanges = changes.filter(change => 
      change.text.length > 20 && 
      (change.text.includes('\n') || change.text.includes('function') || change.text.includes('class'))
    );

    if (significantChanges.length > 0) {
      const codeContent = significantChanges
        .map(change => change.text)
        .join('\n')
        .substring(0, 1000); // Limit size

      const fileName = path.basename(document.fileName);
      const codeMessage = `Code change in ${fileName}:\n\`\`\`\n${codeContent}\n\`\`\``;
      
      this.addMessage('assistant', codeMessage);
    }
  }

  private log(message: string): void {
    this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

