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
  chatTabId?: string; // Identifier for the associated chat tab
  chatTabTitle?: string; // Display title of the chat tab
}

export class ChatCapture {
  private sessions: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;
  private outputChannel: vscode.OutputChannel;
  private chatTabToSession: Map<string, string> = new Map(); // Maps chat tab ID to session ID
  private sessionToChatTab: Map<string, string> = new Map(); // Maps session ID to chat tab ID

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Cursor Chat Tracker');
  }

  /**
   * Start tracking a new chat session
   */
  startSession(sessionId?: string, chatTabId?: string, chatTabTitle?: string): string {
    const id = sessionId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        id,
        messages: [],
        createdAt: now,
        lastUpdated: now,
        chatTabId,
        chatTabTitle
      });
    } else {
      // Update existing session with chat tab info
      const session = this.sessions.get(id)!;
      if (chatTabId) {
        session.chatTabId = chatTabId;
      }
      if (chatTabTitle) {
        session.chatTabTitle = chatTabTitle;
      }
    }

    // Update mappings
    if (chatTabId) {
      // Remove old mapping if this chat tab was associated with another session
      const oldSessionId = this.chatTabToSession.get(chatTabId);
      if (oldSessionId && oldSessionId !== id) {
        this.sessionToChatTab.delete(oldSessionId);
      }
      this.chatTabToSession.set(chatTabId, id);
      this.sessionToChatTab.set(id, chatTabId);
    }

    this.currentSessionId = id;
    this.log(`Started tracking chat session: ${id}${chatTabId ? ` (chat tab: ${chatTabId})` : ''}`);
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
   * Associate a session with a chat tab
   */
  associateChatTab(sessionId: string, chatTabId: string, chatTabTitle?: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Remove old mapping if this chat tab was associated with another session
      const oldSessionId = this.chatTabToSession.get(chatTabId);
      if (oldSessionId && oldSessionId !== sessionId) {
        const oldSession = this.sessions.get(oldSessionId);
        if (oldSession) {
          oldSession.chatTabId = undefined;
          oldSession.chatTabTitle = undefined;
        }
        this.sessionToChatTab.delete(oldSessionId);
      }

      session.chatTabId = chatTabId;
      if (chatTabTitle) {
        session.chatTabTitle = chatTabTitle;
      }
      this.chatTabToSession.set(chatTabId, sessionId);
      this.sessionToChatTab.set(sessionId, chatTabId);
      this.log(`Associated session ${sessionId} with chat tab ${chatTabId}`);
    }
  }

  /**
   * Get session ID for a chat tab
   */
  getSessionForChatTab(chatTabId: string): string | null {
    return this.chatTabToSession.get(chatTabId) || null;
  }

  /**
   * Get chat tab ID for a session
   */
  getChatTabForSession(sessionId: string): string | null {
    return this.sessionToChatTab.get(sessionId) || null;
  }

  /**
   * Find or create a session for the current active chat tab
   */
  getOrCreateSessionForActiveChatTab(): string | null {
    // Try to detect active chat tab
    const activeChatTabId = this.detectActiveChatTab();
    if (activeChatTabId) {
      // Check if we already have a session for this chat tab
      let sessionId = this.getSessionForChatTab(activeChatTabId);
      if (!sessionId) {
        // Create a new session for this chat tab
        sessionId = this.startSession(undefined, activeChatTabId);
      } else {
        // Switch to existing session
        this.setCurrentSession(sessionId);
      }
      return sessionId;
    }
    return null;
  }

  /**
   * Detect all chat tabs and create sessions for each
   */
  detectAllChatTabs(): string[] {
    const detectedChatTabs: string[] = [];
    
    try {
      // Check all visible editors
      const visibleEditors = vscode.window.visibleTextEditors;
      for (const editor of visibleEditors) {
        const uri = editor.document.uri;
        
        // Check for webview schemes (Cursor chat tabs are typically webviews)
        if (uri.scheme === 'vscode-webview' || uri.scheme === 'cursor-chat' || uri.scheme === 'chat') {
          const chatTabId = uri.toString();
          if (!detectedChatTabs.includes(chatTabId)) {
            detectedChatTabs.push(chatTabId);
            
            // Create a session for this chat tab if it doesn't exist
            let sessionId = this.getSessionForChatTab(chatTabId);
            if (!sessionId) {
              const title = editor.document.fileName || `Chat ${detectedChatTabs.length}`;
              sessionId = this.startSession(undefined, chatTabId, title);
              this.log(`Auto-detected chat tab and created session: ${title}`);
            }
          }
        }
        
        // Also check by file name pattern
        const fileName = editor.document.fileName.toLowerCase();
        if ((fileName.includes('chat') || fileName.includes('cursor')) && 
            !detectedChatTabs.includes(uri.toString())) {
          const chatTabId = uri.toString();
          detectedChatTabs.push(chatTabId);
          
          let sessionId = this.getSessionForChatTab(chatTabId);
          if (!sessionId) {
            const title = editor.document.fileName || `Chat ${detectedChatTabs.length}`;
            sessionId = this.startSession(undefined, chatTabId, title);
            this.log(`Auto-detected chat tab by name and created session: ${title}`);
          }
        }
      }
    } catch (error) {
      this.log(`Error detecting all chat tabs: ${error}`);
    }
    
    return detectedChatTabs;
  }

  /**
   * Detect the currently active chat tab
   * This is a best-effort approach since Cursor's chat tabs may not be directly accessible
   */
  private detectActiveChatTab(): string | null {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      
      if (activeEditor) {
        const uri = activeEditor.document.uri;
        
        // Check for webview schemes (Cursor chat tabs are typically webviews)
        if (uri.scheme === 'vscode-webview' || uri.scheme === 'cursor-chat' || uri.scheme === 'chat') {
          // Use the URI as the chat tab identifier
          return uri.toString();
        }
        
        // Check if the document title or path suggests it's a chat tab
        const fileName = activeEditor.document.fileName;
        if (fileName && (fileName.toLowerCase().includes('chat') || fileName.toLowerCase().includes('cursor'))) {
          return uri.toString();
        }
      }

      // Check visible editors for chat-related content
      const visibleEditors = vscode.window.visibleTextEditors;
      for (const editor of visibleEditors) {
        const uri = editor.document.uri;
        if (uri.scheme === 'vscode-webview' || uri.scheme === 'cursor-chat' || uri.scheme === 'chat') {
          return uri.toString();
        }
      }
      
      return null;
    } catch (error) {
      this.log(`Error detecting active chat tab: ${error}`);
      return null;
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

