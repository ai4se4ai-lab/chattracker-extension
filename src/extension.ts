import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatCapture, ChatSession } from './chatCapture';

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

export function activate(context: vscode.ExtensionContext) {
  console.log('Cursor Chat Tracker extension is now active');

  // Initialize chat capture
  chatCapture = new ChatCapture();
  context.subscriptions.push(chatCapture);

  // Start a new chat session
  chatCapture.startSession();

  // Register command to export chat
  const exportCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.exportChat',
    async () => {
      await exportCurrentChat();
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
      }
    }
  );

  context.subscriptions.push(addUserMessageCommand);

  // Monitor text document changes (for AI-generated code)
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      chatCapture.captureCodeChange(event.document, event.contentChanges);
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

