import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChatMessage, ExportedChat, ExtractionResult, ChatMetadata } from './types';
import { generateChatId, generateChatIdFromContent } from './hashGenerator';

/**
 * Extracts chat messages from Cursor's chat interface
 * This function tries multiple strategies to access the chat data
 */
export async function extractChatMessages(): Promise<ExtractionResult> {
  try {
    console.log('[Chat Tracker] Trying Strategy 1: Built-in export');
    // Strategy 1: Try to execute Cursor's built-in export command
    const result1 = await tryBuiltInExport();
    if (result1.success) {
      console.log('[Chat Tracker] Strategy 1 succeeded');
      return result1;
    }
    console.log('[Chat Tracker] Strategy 1 failed:', result1.error);

    console.log('[Chat Tracker] Trying Strategy 2: WebView extraction');
    // Strategy 2: Try to access chat through WebView
    const result2 = await tryWebViewExtraction();
    if (result2.success) {
      console.log('[Chat Tracker] Strategy 2 succeeded');
      return result2;
    }
    console.log('[Chat Tracker] Strategy 2 failed:', result2.error);

    console.log('[Chat Tracker] Trying Strategy 3: Editor/Clipboard extraction');
    // Strategy 3: Try to get chat from active editor/panel
    const result3 = await tryEditorExtraction();
    if (result3.success) {
      console.log('[Chat Tracker] Strategy 3 succeeded');
      return result3;
    }
    console.log('[Chat Tracker] Strategy 3 failed:', result3.error);

    return {
      success: false,
      error: 'Unable to access chat interface. Please copy the chat text to clipboard and try again.'
    };
  } catch (error) {
    console.error('[Chat Tracker] Extraction error:', error);
    return {
      success: false,
      error: `Chat extraction failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Strategy 1: Trigger Cursor's export and monitor for the saved file
 * This will automatically move the file to .cursor/chat/ after Cursor saves it
 */
async function tryBuiltInExport(): Promise<ExtractionResult> {
  try {
    console.log('[Chat Tracker] Triggering Cursor\'s native export with auto-save...');
    
    // Get user's Downloads folder
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const downloadsPath = path.join(homeDir, 'Downloads');
    
    console.log('[Chat Tracker] Watching Downloads folder:', downloadsPath);
    
    // Set up file watcher BEFORE triggering export
    return new Promise<ExtractionResult>(async (resolve, reject) => {
      let watcher: vscode.FileSystemWatcher | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      
      const cleanup = () => {
        if (watcher) {
          watcher.dispose();
          watcher = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };
      
      try {
        // Watch for new .md files in Downloads
        const pattern = new vscode.RelativePattern(downloadsPath, 'cursor_*.md');
        watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        // When a new file is created
        watcher.onDidCreate(async (uri) => {
          try {
            console.log('[Chat Tracker] ✅ New export file detected:', uri.fsPath);
            
            // Wait for file to finish writing - use exponential backoff for large files
            let fileSize = 0;
            let previousSize = 0;
            let stableCount = 0;
            const maxWaitTime = 30000; // 30 seconds max wait
            const startTime = Date.now();
            
            // Poll file size until it stabilizes (file is fully written)
            // Use Node.js fs for file stats since VS Code API might not have stat
            const filePath = uri.fsPath;
            
            while (Date.now() - startTime < maxWaitTime) {
              try {
                if (fs.existsSync(filePath)) {
                  const stats = fs.statSync(filePath);
                  fileSize = stats.size;
                  
                  // If size hasn't changed in 3 consecutive checks, file is likely complete
                  if (fileSize === previousSize && fileSize > 0) {
                    stableCount++;
                    if (stableCount >= 3) {
                      break; // File size is stable, it's done writing
                    }
                  } else {
                    stableCount = 0; // Reset counter if size changed
                  }
                  
                  previousSize = fileSize;
                }
                await new Promise(resolve => setTimeout(resolve, 200)); // Check every 200ms
              } catch (error) {
                // File might not exist yet or stats failed, wait a bit more
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            
            // Additional small delay to ensure file handle is released
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Read the file content - use readFile which handles large files better
            const content = await vscode.workspace.fs.readFile(uri);
            const text = Buffer.from(content).toString('utf-8');
            
            console.log('[Chat Tracker] Read content, length:', text.length, 'bytes, file size:', fileSize);
            
            // Parse the content
            const messages = parseTextAsChat(text);
            if (messages.length > 0) {
              // Delete the file from Downloads (we'll save it to .cursor/chat/)
              try {
                await vscode.workspace.fs.delete(uri);
                console.log('[Chat Tracker] Cleaned up Downloads file');
              } catch (error) {
                console.log('[Chat Tracker] Could not delete Downloads file:', error);
              }
              
              cleanup();
              resolve(createExtractionResult(messages));
            } else {
              console.log('[Chat Tracker] Failed to parse content');
              cleanup();
              reject(new Error('Failed to parse exported content'));
            }
          } catch (error) {
            console.error('[Chat Tracker] Error processing exported file:', error);
            cleanup();
            reject(error);
          }
        });
        
        // Trigger Cursor's export command
        console.log('[Chat Tracker] Triggering composer.exportChatAsMd...');
        
        // Show instruction to user
        vscode.window.showInformationMessage(
          '💡 Cursor Export Dialog Opened:\n\n' +
          'Just click "Export" (or press Enter) - the extension will handle the rest!',
          { modal: false }
        );
        
        await vscode.commands.executeCommand('composer.exportChatAsMd');
        
        // Set timeout - if no file appears in 60 seconds, give up
        timeoutId = setTimeout(() => {
          console.log('[Chat Tracker] Timeout waiting for export file');
          cleanup();
          resolve({ 
            success: false, 
            error: 'Timeout waiting for export. Did you cancel the save dialog?' 
          });
        }, 60000);
        
      } catch (error) {
        console.error('[Chat Tracker] Error setting up export:', error);
        cleanup();
        reject(error);
      }
    });
    
  } catch (error) {
    console.error('[Chat Tracker] Built-in export error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Strategy 2: Try to extract chat from WebView
 */
async function tryWebViewExtraction(): Promise<ExtractionResult> {
  try {
    // Attempt to execute JavaScript in any visible webview panels
    // Note: This is limited by VS Code's security model
    
    // Try to find Cursor's chat panel
    const chatPanelCommands = [
      'workbench.panel.chat.view.copilot.focus',
      'workbench.action.chat.open'
    ];

    for (const cmd of chatPanelCommands) {
      try {
        await vscode.commands.executeCommand(cmd);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for panel to open
      } catch {
        continue;
      }
    }

    // Note: Direct WebView DOM access is restricted in VS Code extensions
    // This is a placeholder for when/if Cursor provides an API
    return { success: false, error: 'WebView extraction not available' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Strategy 3: Try to extract from active text editor or clipboard
 * This strategy now includes automatic selection and copying from chat panel
 */
async function tryEditorExtraction(): Promise<ExtractionResult> {
  try {
    // First, try to automatically focus and copy from chat panel
    console.log('[Chat Tracker] Attempting automatic chat extraction...');
    const autoResult = await tryAutomaticChatCopy();
    if (autoResult.success) {
      return autoResult;
    }
    console.log('[Chat Tracker] Automatic extraction failed:', autoResult.error);

    // Check if there's selected text that might be a chat export
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.selection && !editor.selection.isEmpty) {
      const selectedText = editor.document.getText(editor.selection);
      const messages = parseTextAsChat(selectedText);
      if (messages.length > 0) {
        return createExtractionResult(messages);
      }
    }

    // Try to get from clipboard as fallback
    const clipboardText = await vscode.env.clipboard.readText();
    if (clipboardText && clipboardText.length > 10) {
      const messages = parseTextAsChat(clipboardText);
      if (messages.length > 0) {
        return createExtractionResult(messages);
      }
    }

    return { success: false, error: 'No chat content found in editor or clipboard' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Attempts to automatically copy chat content
 * NOTE: WebView limitations mean we can't directly access the chat DOM
 * This function checks if user has copied chat content and warns if it might be old
 */
async function tryAutomaticChatCopy(): Promise<ExtractionResult> {
  try {
    console.log('[Chat Tracker] Checking clipboard for chat content...');
    
    // Check if user has already copied something that looks like a chat
    const clipboard = await vscode.env.clipboard.readText();
    
    console.log('[Chat Tracker] Clipboard length:', clipboard?.length || 0);
    console.log('[Chat Tracker] First 200 chars:', clipboard?.substring(0, 200));
    
    if (clipboard && clipboard.length > 50) {
      // Check if this looks like chat content
      const looksLikeChat = 
        clipboard.includes('**User**') ||
        clipboard.includes('**Cursor**') ||
        clipboard.includes('You:') || 
        clipboard.includes('User:') ||
        clipboard.includes('Assistant:') ||
        clipboard.includes('AI:') ||
        clipboard.includes('Cursor:') ||
        clipboard.includes('Claude:') ||
        clipboard.includes('GPT:') ||
        // Check for conversation patterns
        clipboard.split('\n\n').length > 3 ||
        // Check if it has question/answer pattern
        (clipboard.includes('?') && clipboard.length > 200);
      
      console.log('[Chat Tracker] Content looks like chat?', looksLikeChat);
      
      if (looksLikeChat) {
        console.log('[Chat Tracker] Using clipboard content as chat export');
        console.log('[Chat Tracker] WARNING: Make sure you copied from the ACTIVE chat you want to export!');
        
        const messages = parseTextAsChat(clipboard);
        if (messages.length > 0) {
          console.log('[Chat Tracker] Parsed', messages.length, 'messages from clipboard');
          
          // Log first message preview to help user verify it's the right chat
          if (messages[0]) {
            console.log('[Chat Tracker] First message preview:', messages[0].content.substring(0, 100));
          }
          
          return createExtractionResult(messages);
        }
      } else {
        console.log('[Chat Tracker] Clipboard content does not look like a chat');
        console.log('[Chat Tracker] Content preview:', clipboard.substring(0, 300));
      }
    }

    // If we got here, user hasn't copied the chat yet
    return { 
      success: false, 
      error: 'Chat not found in clipboard. Please copy the ACTIVE chat first (click in chat → Ctrl+A → Ctrl+C)' 
    };

  } catch (error) {
    console.error('[Chat Tracker] Clipboard check error:', error);
    return { 
      success: false, 
      error: `Failed to access clipboard: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parses text content as chat messages
 * Attempts to identify user and assistant messages from plain text
 * Supports Cursor's native export format with **User** and **Cursor** markers
 */
function parseTextAsChat(text: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      // Already in message format
      return parsed.filter(msg => msg.role && msg.content).map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
        metadata: msg.metadata
      }));
    }
  } catch {
    // Not JSON, try to parse as plain text
  }

  console.log('[Chat Tracker] Parsing chat text, length:', text.length);
  console.log('[Chat Tracker] First 500 chars:', text.substring(0, 500));

  // Strategy: Split by role markers and capture complete messages
  // This handles multi-line messages properly
  
  const timestamp = new Date().toISOString();
  
  // First, try Cursor's native export format with **User** and **Cursor** markers
  // Format: **User**\n\ncontent\n\n---\n\n**Cursor**\n\ncontent\n\n---
  
  // More flexible pattern that handles variations in spacing and separators
  const cursorFormatPattern = /\*\*(User|Cursor|Assistant)\*\*\s*[\r\n]+([\s\S]*?)(?=[\r\n]+---[\r\n]+\*\*(?:User|Cursor|Assistant)\*\*|[\r\n]+\*\*(?:User|Cursor|Assistant)\*\*|$)/gi;
  const cursorMatches = Array.from(text.matchAll(cursorFormatPattern));
  
  console.log('[Chat Tracker] Trying Cursor format pattern, found', cursorMatches.length, 'matches');
  
  if (cursorMatches.length > 0) {
    cursorMatches.forEach((match, idx) => {
      const role = match[1].toLowerCase();
      const content = match[2].trim();
      
      console.log(`[Chat Tracker] Match ${idx + 1}: role="${role}", content length=${content.length}`);
      console.log(`[Chat Tracker] Content preview: ${content.substring(0, 100)}`);
      
      if (content.length > 0) {
        messages.push({
          role: role === 'user' ? 'user' : 'assistant',
          content: content,
          timestamp
        });
      }
    });
    
    console.log('[Chat Tracker] Extracted', messages.length, 'messages from Cursor format');
    
    if (messages.length > 0) {
      return messages;
    }
  }
  
  // Alternative: Split by --- separator and look for role markers
  console.log('[Chat Tracker] Trying separator-based parsing...');
  const sections = text.split(/\n---\n|\r\n---\r\n/);
  
  console.log('[Chat Tracker] Found', sections.length, 'sections after splitting by ---');
  
  sections.forEach((section, idx) => {
    const trimmedSection = section.trim();
    console.log(`[Chat Tracker] Section ${idx}: ${trimmedSection.substring(0, 100)}`);
    
    // Check if section starts with a role marker
    const roleMatch = trimmedSection.match(/^\*\*(User|Cursor|Assistant)\*\*\s*[\r\n]+([\s\S]*)/i);
    if (roleMatch) {
      const role = roleMatch[1].toLowerCase();
      const content = roleMatch[2].trim();
      
      if (content.length > 0) {
        console.log(`[Chat Tracker] Found ${role} message, length: ${content.length}`);
        messages.push({
          role: role === 'user' ? 'user' : 'assistant',
          content: content,
          timestamp
        });
      }
    }
  });
  
  if (messages.length > 0) {
    console.log('[Chat Tracker] Extracted', messages.length, 'messages using separator method');
    return messages;
  }
  
  // Fallback: Try standard format with colons
  // Pattern: "You:" or "User:" followed by content until next role
  const conversationPattern = /(?:^|\n)((?:You|User|Human):\s*)([\s\S]*?)(?=\n(?:You|User|Human|Assistant|AI|Cursor|Claude|GPT):|$)/gi;
  const matches = Array.from(text.matchAll(conversationPattern));
  
  if (matches.length > 0) {
    console.log('[Chat Tracker] Found', matches.length, 'potential messages using colon pattern');
    
    // Parse user messages
    const userMatches = Array.from(text.matchAll(/(?:^|\n)((?:You|User|Human):\s*)([\s\S]*?)(?=\n(?:Assistant|AI|Cursor|Claude|GPT|You|User|Human):|$)/gi));
    userMatches.forEach(match => {
      const content = match[2].trim();
      if (content.length > 0) {
        messages.push({
          role: 'user',
          content: content,
          timestamp
        });
      }
    });
    
    // Parse assistant messages
    const assistantMatches = Array.from(text.matchAll(/(?:^|\n)((?:Assistant|AI|Cursor|Claude|GPT):\s*)([\s\S]*?)(?=\n(?:You|User|Human|Assistant|AI|Cursor|Claude|GPT):|$)/gi));
    assistantMatches.forEach(match => {
      const content = match[2].trim();
      if (content.length > 0) {
        messages.push({
          role: 'assistant',
          content: content,
          timestamp
        });
      }
    });
    
    console.log('[Chat Tracker] Extracted', messages.length, 'messages');
  }
  
  // Fallback: Try alternative markdown-style format (> for quotes)
  if (messages.length === 0) {
    console.log('[Chat Tracker] Trying markdown/quote style parsing');
    
    // Split by double newlines or role changes
    const blocks = text.split(/\n\n+/);
    
    for (const block of blocks) {
      const trimmed = block.trim();
      if (trimmed.length === 0) continue;
      
      // Check if it starts with > (often user messages in some formats)
      if (trimmed.startsWith('>')) {
        messages.push({
          role: 'user',
          content: trimmed.replace(/^>\s*/gm, '').trim(),
          timestamp
        });
      } else {
        // Assume assistant response
        messages.push({
          role: 'assistant',
          content: trimmed,
          timestamp
        });
      }
    }
  }
  
  // Ultimate fallback: Try to intelligently split long text
  if (messages.length === 0 && text.trim().length > 10) {
    console.log('[Chat Tracker] Using fallback: treating as conversation');
    
    // Look for question marks or command-like statements (likely user)
    // Followed by longer explanatory text (likely assistant)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length > 0) {
      // Group consecutive lines into messages
      let currentRole: 'user' | 'assistant' = 'user';
      let currentContent: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detect likely role switches
        const isQuestion = line.endsWith('?');
        const isShort = line.length < 100;
        const isCommand = /^(create|make|add|update|delete|show|tell|explain|how|what|why|can|please)/i.test(line);
        
        // If this looks like a user message and we were on assistant, switch
        if (currentRole === 'assistant' && (isQuestion || (isShort && isCommand))) {
          // Save current message
          if (currentContent.length > 0) {
            messages.push({
              role: 'assistant',
              content: currentContent.join('\n').trim(),
              timestamp
            });
          }
          currentRole = 'user';
          currentContent = [line];
        }
        // If this looks like an assistant response (long, explanatory)
        else if (currentRole === 'user' && currentContent.length > 0 && !isQuestion && !isCommand) {
          // Save user message
          messages.push({
            role: 'user',
            content: currentContent.join('\n').trim(),
            timestamp
          });
          currentRole = 'assistant';
          currentContent = [line];
        } else {
          currentContent.push(line);
        }
      }
      
      // Save last message
      if (currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
          timestamp
        });
      }
    }
  }
  
  // If still nothing, treat entire text as one user message
  if (messages.length === 0 && text.trim().length > 10) {
    console.log('[Chat Tracker] Final fallback: single user message');
    return [{
      role: 'user',
      content: text.trim(),
      timestamp
    }];
  }

  console.log('[Chat Tracker] Final message count:', messages.length);
  return messages;
}

/**
 * Parses data returned from export commands
 */
function parseExportData(data: any): ChatMessage[] {
  try {
    if (Array.isArray(data)) {
      return data.filter(msg => msg.role && msg.content);
    }
    if (typeof data === 'object' && data.messages) {
      return data.messages;
    }
    if (typeof data === 'string') {
      return parseTextAsChat(data);
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * Creates a complete extraction result with metadata
 */
function createExtractionResult(messages: ChatMessage[]): ExtractionResult {
  const chatId = generateChatId(messages);
  const exportedAt = new Date().toISOString();

  // Calculate total tokens if available
  let totalTokens = 0;
  messages.forEach(msg => {
    if (msg.metadata?.tokenCount) {
      totalTokens += msg.metadata.tokenCount;
    }
  });

  const metadata: ChatMetadata = {
    chatId,
    exportedAt,
    messageCount: messages.length,
    totalTokens: totalTokens > 0 ? totalTokens : undefined,
    model: extractModelFromMessages(messages)
  };

  const exportedChat: ExportedChat = {
    metadata,
    messages
  };

  return {
    success: true,
    data: exportedChat
  };
}

/**
 * Attempts to extract model information from messages
 */
function extractModelFromMessages(messages: ChatMessage[]): string | undefined {
  for (const msg of messages) {
    if (msg.metadata?.model) {
      return msg.metadata.model;
    }
  }
  return undefined;
}

