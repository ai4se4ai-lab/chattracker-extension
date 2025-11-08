import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatCapture, ChatSession } from './chatCapture';
import { ChatTrackerTreeDataProvider } from './treeViewProvider';

interface ChatData {
  chatId: string;
  title?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  metadata: {
    workspaceFolder?: string;
    timestamp: string;
    extensionVersion: string;
  };
}

interface Config {
  CURSOR_CONNECTION_CODE: string;
  EASYITI_API_URL: string;
}

let chatCapture: ChatCapture;
let treeDataProvider: ChatTrackerTreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('Cursor Chat Tracker extension is now active');

  // Initialize chat capture
  chatCapture = new ChatCapture();
  context.subscriptions.push(chatCapture);

  // Initialize tree view provider
  treeDataProvider = new ChatTrackerTreeDataProvider(chatCapture);
  const treeView = vscode.window.createTreeView('cursor-chat-tracker-view', {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);

  // Store tree view reference for use in commands
  (global as any).chatTrackerTreeView = treeView;

  // Refresh tree view when chat data changes
  const refreshTreeView = () => {
    treeDataProvider.refresh();
  };

  // Start a new chat session
  chatCapture.startSession();

  // Register command to export chat
  const exportCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.exportChat',
    async () => {
      await exportCurrentChat();
      refreshTreeView();
    }
  );

  context.subscriptions.push(exportCommand);

  // Register command to manually add user message
  const addUserMessageCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.addUserMessage',
    async () => {
      const text = await vscode.window.showInputBox({
        prompt: 'Enter user message to track',
        placeHolder: 'User prompt or question...'
      });
      if (text) {
        chatCapture.addMessage('user', text);
        vscode.window.showInformationMessage('User message added to chat history');
        refreshTreeView();
      }
    }
  );

  context.subscriptions.push(addUserMessageCommand);

  // Register command to capture from selection
  const captureFromSelectionCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.captureFromSelection',
    async () => {
      const captured = await chatCapture.captureFromSelection();
      if (captured) {
        vscode.window.showInformationMessage('Content captured from selection/clipboard');
        refreshTreeView();
      } else {
        vscode.window.showWarningMessage('No content found in selection or clipboard');
      }
    }
  );
  context.subscriptions.push(captureFromSelectionCommand);

  // Register command to start new session
  const startNewSessionCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.startNewSession',
    async () => {
      chatCapture.startSession();
      vscode.window.showInformationMessage('New chat session started');
      refreshTreeView();
    }
  );
  context.subscriptions.push(startNewSessionCommand);

  // Register command to clear session
  const clearSessionCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.clearSession',
    async () => {
      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to clear the current session?',
        { modal: true },
        'Yes',
        'No'
      );
      if (result === 'Yes') {
        chatCapture.clearSession();
        vscode.window.showInformationMessage('Current session cleared');
        refreshTreeView();
      }
    }
  );
  context.subscriptions.push(clearSessionCommand);

  // Register command to switch session and show content
  const switchSessionCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.switchSession',
    async (sessionId: string) => {
      chatCapture.setCurrentSession(sessionId);
      const session = chatCapture.getChatData(sessionId);
      
      if (session) {
        // Show the session content in a new editor window
        await showSessionContent(session);
        
        vscode.window.showInformationMessage(
          `Switched to session: ${session.chatTabTitle || sessionId.substring(0, 15)}...`
        );
      }
      refreshTreeView();
    }
  );
  context.subscriptions.push(switchSessionCommand);

  // Register command to export a specific session
  const exportSessionCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.exportSession',
    async (item: any) => {
      // Handle both direct sessionId string and tree item
      let sessionId: string | undefined;
      
      if (typeof item === 'string') {
        sessionId = item;
      } else if (item && typeof item === 'object') {
        // Tree item passed from context menu
        if (item.sessionId) {
          sessionId = item.sessionId;
        } else if (item.label) {
          // Try to extract session ID from label or find by matching
          // This is a fallback
        }
      }
      
      // If still no sessionId, try to get from tree view selection
      if (!sessionId) {
        const selected = treeView.selection[0];
        if (selected && (selected as any).sessionId) {
          sessionId = (selected as any).sessionId;
        }
      }

      if (!sessionId) {
        vscode.window.showErrorMessage('Please select a session to export');
        return;
      }

      const session = chatCapture.getChatData(sessionId);
      if (!session) {
        vscode.window.showErrorMessage('Session not found');
        return;
      }
      
      await exportSession(session);
      refreshTreeView();
    }
  );
  context.subscriptions.push(exportSessionCommand);

  // Register command to open config file
  const openConfigCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.openConfig',
    async () => {
      const config = vscode.workspace.getConfiguration('cursorChatTracker');
      const configPath = config.get<string>('configPath', '');
      
      if (configPath) {
        const resolvedPath = configPath.replace('${workspaceFolder}', 
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
        
        if (fs.existsSync(resolvedPath)) {
          const doc = await vscode.workspace.openTextDocument(resolvedPath);
          await vscode.window.showTextDocument(doc);
        } else {
          // Create config file if it doesn't exist
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (workspaceFolder) {
            const defaultConfig = {
              CURSOR_CONNECTION_CODE: "",
              EASYITI_API_URL: "http://localhost:3001/api/cursor-events"
            };
            fs.writeFileSync(resolvedPath, JSON.stringify(defaultConfig, null, 2));
            const doc = await vscode.workspace.openTextDocument(resolvedPath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('Configuration file created');
          }
        }
      } else {
        vscode.window.showErrorMessage('Configuration path not set');
      }
    }
  );
  context.subscriptions.push(openConfigCommand);

  // Register command to open settings
  const openSettingsCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.openSettings',
    async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:your-publisher.cursor-chat-tracker');
    }
  );
  context.subscriptions.push(openSettingsCommand);

  // Register command to reload config
  const reloadConfigCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.reloadConfig',
    async () => {
      vscode.window.showInformationMessage('Configuration reloaded');
      refreshTreeView();
    }
  );
  context.subscriptions.push(reloadConfigCommand);

  // Monitor text document changes (for AI-generated code)
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      chatCapture.captureCodeChange(event.document, event.contentChanges);
      refreshTreeView();
    }
  );

  context.subscriptions.push(documentChangeListener);

  // Monitor active editor changes
  const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) {
        trackEditorContext(editor);
      }
    }
  );

  context.subscriptions.push(editorChangeListener);

  // Try to intercept Cursor chat commands
  setupCommandInterceptor(context);

  // Monitor for chat tab changes and associate sessions
  setupChatTabTracking(context, refreshTreeView);
}

// Track chat tabs and associate with sessions
function setupChatTabTracking(context: vscode.ExtensionContext, refreshTreeView: () => void) {
  // Monitor tab changes to detect when chat tabs become active
  // Note: Cursor's chat tabs are webviews, which may not be directly accessible
  // We'll use a combination of approaches:
  
  // 1. Monitor visible editors (chat tabs might appear as special editors)
  const visibleEditorsListener = vscode.window.onDidChangeVisibleTextEditors((editors) => {
    // Try to detect chat-related editors
    editors.forEach(editor => {
      const uri = editor.document.uri;
      // Check if this might be a chat tab (heuristic)
      if (uri.scheme === 'vscode-webview' || uri.scheme === 'cursor-chat') {
        const chatTabId = uri.toString();
        // Try to get or create a session for this chat tab
        const sessionId = chatCapture.getSessionForChatTab(chatTabId);
        if (!sessionId) {
          // Create a new session for this chat tab
          const title = editor.document.fileName || 'Chat';
          chatCapture.startSession(undefined, chatTabId, title);
          refreshTreeView();
        } else {
          // Switch to the existing session
          chatCapture.setCurrentSession(sessionId);
          refreshTreeView();
        }
      }
    });
  });
  context.subscriptions.push(visibleEditorsListener);

  // 2. Register command to manually associate current session with active chat tab
  const associateChatTabCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.associateChatTab',
    async () => {
      const session = chatCapture.getChatData();
      if (!session) {
        vscode.window.showWarningMessage('No active session to associate');
        return;
      }

      // Try to detect the active chat tab
      const activeEditor = vscode.window.activeTextEditor;
      let chatTabId: string | undefined;
      let chatTabTitle: string | undefined;

      if (activeEditor) {
        const uri = activeEditor.document.uri;
        if (uri.scheme === 'vscode-webview' || uri.scheme === 'cursor-chat') {
          chatTabId = uri.toString();
          chatTabTitle = activeEditor.document.fileName || 'Chat';
        }
      }

      // If we couldn't auto-detect, ask the user
      if (!chatTabId) {
        const input = await vscode.window.showInputBox({
          prompt: 'Enter a name/identifier for this chat tab',
          placeHolder: 'e.g., Chat 1, Main Chat, etc.',
          value: session.chatTabTitle || ''
        });
        if (input) {
          chatTabId = `chat-tab-${input}`;
          chatTabTitle = input;
        } else {
          return;
        }
      }

      if (chatTabId) {
        chatCapture.associateChatTab(session.id, chatTabId, chatTabTitle);
        vscode.window.showInformationMessage(`Session associated with chat tab: ${chatTabTitle || chatTabId}`);
        refreshTreeView();
      }
    }
  );
  context.subscriptions.push(associateChatTabCommand);

  // 3. Periodically check for ALL chat tabs and create sessions
  const checkInterval = setInterval(() => {
    // Detect all chat tabs and create sessions for each
    const detectedTabs = chatCapture.detectAllChatTabs();
    if (detectedTabs.length > 0) {
      refreshTreeView();
    }
  }, 2000); // Check every 2 seconds

  context.subscriptions.push({
    dispose: () => clearInterval(checkInterval)
  });

  // 4. Initial scan for all chat tabs
  setTimeout(() => {
    chatCapture.detectAllChatTabs();
    refreshTreeView();
  }, 1000);
}

/**
 * Display session content in a new editor window
 */
async function showSessionContent(session: ChatSession): Promise<void> {
  try {
    // Format the session content as markdown
    let content = `# Chat Session: ${session.chatTabTitle || session.id}\n\n`;
    content += `**Session ID:** ${session.id}\n`;
    content += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n`;
    content += `**Last Updated:** ${new Date(session.lastUpdated).toLocaleString()}\n`;
    content += `**Messages:** ${session.messages.length}\n\n`;
    content += `---\n\n`;

    // Add all messages
    session.messages.forEach((message, index) => {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const role = message.role === 'user' ? '👤 User' : '🤖 Assistant';
      content += `## ${role} - ${timestamp}\n\n`;
      content += `${message.content}\n\n`;
      content += `---\n\n`;
    });

    // Create an untitled markdown document with the content
    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: content
    });
    
    // Show the document
    await vscode.window.showTextDocument(doc, { preview: false });
  } catch (error) {
    // Fallback: use untitled document
    try {
      let content = `# Chat Session: ${session.chatTabTitle || session.id}\n\n`;
      content += `**Session ID:** ${session.id}\n`;
      content += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n`;
      content += `**Last Updated:** ${new Date(session.lastUpdated).toLocaleString()}\n`;
      content += `**Messages:** ${session.messages.length}\n\n`;
      content += `---\n\n`;

      session.messages.forEach((message) => {
        const timestamp = new Date(message.timestamp).toLocaleString();
        const role = message.role === 'user' ? '👤 User' : '🤖 Assistant';
        content += `## ${role} - ${timestamp}\n\n`;
        content += `${message.content}\n\n`;
        content += `---\n\n`;
      });

      const doc = await vscode.workspace.openTextDocument({
        language: 'markdown',
        content: content
      });
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (fallbackError) {
      vscode.window.showErrorMessage(`Failed to display session content: ${fallbackError}`);
    }
  }
}

/**
 * Export a specific session to the backend
 */
async function exportSession(session: ChatSession): Promise<void> {
  try {
    const config = await loadConfig();
    if (!config) {
      vscode.window.showErrorMessage(
        'Cursor Chat Tracker: Configuration file not found or invalid. Please check your config file.'
      );
      return;
    }

    // Convert session to chat data format
    const chatData: ChatData = {
      chatId: session.id,
      title: session.chatTabTitle,
      messages: session.messages,
      metadata: {
        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.name,
        timestamp: session.createdAt,
        extensionVersion: '0.0.1'
      }
    };

    if (chatData.messages.length === 0) {
      vscode.window.showWarningMessage(
        'Cursor Chat Tracker: No messages in this session to export.'
      );
      return;
    }

    // Submit to backend
    const success = await sendToBackend(chatData, config);
    
    if (success) {
      vscode.window.showInformationMessage(
        `Cursor Chat Tracker: Session exported successfully (${chatData.messages.length} messages)`
      );
    } else {
      vscode.window.showErrorMessage(
        'Cursor Chat Tracker: Failed to export session. Check the output panel for details.'
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Cursor Chat Tracker: Error exporting session - ${errorMessage}`
    );
    console.error('Export session error:', error);
  }
}

async function exportCurrentChat() {
  try {
    const config = await loadConfig();
    if (!config) {
      vscode.window.showErrorMessage(
        'Cursor Chat Tracker: Configuration file not found or invalid. Please check your config file.'
      );
      return;
    }

    // Get current chat data
    const chatData = await gatherChatData();
    
    if (!chatData || chatData.messages.length === 0) {
      vscode.window.showWarningMessage(
        'Cursor Chat Tracker: No chat data found to export.'
      );
      return;
    }

    // Submit to backend
    const success = await sendToBackend(chatData, config);
    
    if (success) {
      vscode.window.showInformationMessage(
        `Cursor Chat Tracker: Chat exported successfully (${chatData.messages.length} messages)`
      );
    } else {
      vscode.window.showErrorMessage(
        'Cursor Chat Tracker: Failed to export chat. Check the output panel for details.'
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Cursor Chat Tracker: Error exporting chat - ${errorMessage}`
    );
    console.error('Export error:', error);
  }
}

async function loadConfig(): Promise<Config | null> {
  try {
    const config = vscode.workspace.getConfiguration('cursorChatTracker');
    const configPath = config.get<string>('configPath', '');
    
    // Try config file first
    let configData: Config | null = null;
    
    if (configPath) {
      const resolvedPath = configPath.replace('${workspaceFolder}', 
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
      
      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
        configData = JSON.parse(fileContent);
      }
    }

    // Override with VS Code settings if provided
    const backendUrl = config.get<string>('backendUrl', '');
    const connectionCode = config.get<string>('connectionCode', '');

    if (backendUrl) {
      configData = configData || {} as Config;
      configData.EASYITI_API_URL = backendUrl;
    }

    if (connectionCode) {
      configData = configData || {} as Config;
      configData.CURSOR_CONNECTION_CODE = connectionCode;
    }

    // Validate required fields
    if (!configData?.EASYITI_API_URL || !configData?.CURSOR_CONNECTION_CODE) {
      return null;
    }

    return configData;
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

async function gatherChatData(): Promise<ChatData | null> {
  try {
    // Get chat data from ChatCapture
    const session = chatCapture.getChatData();
    
    if (!session || session.messages.length === 0) {
      // Try to capture from selection as fallback
      const captured = await chatCapture.captureFromSelection();
      if (captured) {
        const updatedSession = chatCapture.getChatData();
        if (updatedSession) {
          return convertSessionToChatData(updatedSession);
        }
      }
      return null;
    }

    return convertSessionToChatData(session);
  } catch (error) {
    console.error('Error gathering chat data:', error);
    return null;
  }
}

function convertSessionToChatData(session: ChatSession): ChatData {
  return {
    chatId: session.id,
    title: session.title,
    messages: session.messages,
    metadata: {
      workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.name,
      timestamp: session.createdAt,
      extensionVersion: '0.0.1'
    }
  };
}


function trackEditorContext(editor: vscode.TextEditor) {
  // Track which file is being edited
  // This can help associate chat messages with code changes
  const fileName = editor.document.fileName;
  console.log('Active editor changed:', fileName);
}

function setupCommandInterceptor(context: vscode.ExtensionContext) {
  // Try to intercept Cursor-specific commands
  // Note: This is a best-effort approach since Cursor's internal APIs may not be fully exposed
  
  // Monitor for common chat-related patterns
  // In a real implementation, you might need to use Cursor's specific extension API
  // or hook into their command system if available
}

async function sendToBackend(chatData: ChatData, config: Config): Promise<boolean> {
  try {
    const payload = {
      connectionCode: config.CURSOR_CONNECTION_CODE,
      chatData: chatData
    };

    const response = await fetch(config.EASYITI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Connection-Code': config.CURSOR_CONNECTION_CODE
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('Backend response:', result);
    return true;
  } catch (error) {
    console.error('Error sending to backend:', error);
    return false;
  }
}

// Helper function to add a message to chat history (for external use)
export function addChatMessage(role: 'user' | 'assistant', content: string, chatId?: string) {
  if (chatCapture) {
    if (chatId) {
      chatCapture.setCurrentSession(chatId);
    }
    chatCapture.addMessage(role, content, chatId);
  }
}

export function deactivate() {
  // Cleanup is handled by VS Code's subscription system
  if (chatCapture) {
    chatCapture.dispose();
  }
}

