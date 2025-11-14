import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { extractChatMessages } from './chatExtractor';
import { writeChatFile, getDisplayPath, findChatFileById, findChatFileByFirstMessage, extractChatIdFromFilePath, readExistingChatFile, isContinuation, appendToChatFile } from './fileManager';
import { formatAsMarkdown } from './markdownFormatter';

/**
 * Activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Cursor Chat Tracker extension is now active');

  // Register the export chat command
  const exportCommand = vscode.commands.registerCommand(
    'cursor-chat-tracker.exportChat',
    async () => {
      await exportChatHandler();
    }
  );

  context.subscriptions.push(exportCommand);
}

/**
 * Main handler for the export chat command
 */
async function exportChatHandler(): Promise<void> {
  console.log('[Chat Tracker] Export command triggered');
  
  try {
    // Show progress notification
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Exporting chat...',
        cancellable: false
      },
      async (progress) => {
        // Extract chat messages
        progress.report({ message: 'Extracting chat messages...' });
        console.log('[Chat Tracker] Starting chat extraction...');
        const extractionResult = await extractChatMessages();

        console.log('[Chat Tracker] Extraction result:', extractionResult.success, extractionResult.error);

        if (!extractionResult.success || !extractionResult.data) {
          // Show what we captured for debugging
          const clipboard = await vscode.env.clipboard.readText();
          console.error('[Chat Tracker] Captured content preview:', clipboard.substring(0, 500));
          throw new Error(extractionResult.error || 'Failed to extract chat messages');
        }

        // Validate that we have messages
        if (extractionResult.data.messages.length === 0) {
          const clipboard = await vscode.env.clipboard.readText();
          console.error('[Chat Tracker] No messages parsed. Content preview:', clipboard.substring(0, 500));
          throw new Error('No chat messages found to export. The captured content may not be from the chat panel.');
        }
        
        console.log('[Chat Tracker] Successfully extracted', extractionResult.data.messages.length, 'messages');

        // Generate stable chat ID based on first user message (chat tab identifier)
        const chatId = extractionResult.data.metadata.chatId;
        const firstUserMessage = extractionResult.data.messages.find(m => m.role === 'user')?.content || '';
        console.log('[Chat Tracker] Chat ID (based on first user message):', chatId);
        console.log('[Chat Tracker] First user message:', firstUserMessage.substring(0, 50));
        
        // Check if a file with this chat ID already exists (permanent link to chat tab)
        progress.report({ message: 'Checking for existing chat...' });
        let existingFile = findChatFileById(chatId);
        let filePath: string;
        let isAppended = false;
        
        // If no file found by exact chat ID, try to find by matching first user message
        // This handles cases where the first prompt was edited (chat ID changed but same chat tab)
        if (!existingFile && firstUserMessage) {
          console.log('[Chat Tracker] No file found with exact chat ID, checking for file with matching first message...');
          existingFile = findChatFileByFirstMessage(firstUserMessage);
          if (existingFile) {
            // Found file with matching first message - extract its chat ID and use that
            const existingChatId = extractChatIdFromFilePath(existingFile);
            if (existingChatId) {
              console.log('[Chat Tracker] Found existing chat file with matching first message, chat ID:', existingChatId);
              // Use the existing chat ID to maintain the permanent link
              // But we'll update the file with new content
            }
          }
        }
        
        if (existingFile) {
          // File exists for this chat tab - update it with latest version
          console.log('[Chat Tracker] ✅ Found existing file for this chat tab:', path.basename(existingFile));
          console.log('[Chat Tracker] This is the same chat tab - updating file with latest version');
          
          const existingChat = readExistingChatFile(existingFile);
          console.log('[Chat Tracker] Existing messages count:', existingChat?.messages.length || 0);
          console.log('[Chat Tracker] New messages count:', extractionResult.data.messages.length);
          
          if (existingChat) {
            // Check if it's a continuation (new messages added) or update (same/edited messages)
            if (isContinuation(existingChat.messages, extractionResult.data.messages)) {
              // This is a continuation - append new messages
              console.log('[Chat Tracker] ✅ Detected continuation, appending new messages');
              progress.report({ message: 'Appending to existing chat...' });
              
              const existingCount = existingChat.messages.length;
              const newMessages = extractionResult.data.messages.slice(existingCount);
              
              console.log('[Chat Tracker] Existing messages:', existingCount, 'New messages to append:', newMessages.length);
              
              if (newMessages.length > 0) {
                filePath = appendToChatFile(existingFile, newMessages, 'md');
                isAppended = true;
              } else {
                // All messages already exist, just use existing file
                console.log('[Chat Tracker] All messages already exist in file');
                filePath = existingFile;
                isAppended = true;
              }
            } else {
              // Same chat tab but different content - update with latest version
              // This handles edited prompts or other changes
              console.log('[Chat Tracker] ✅ Same chat tab, updating with latest version');
              progress.report({ message: 'Updating chat with latest changes...' });
              
              // Get the existing chat ID from the file to maintain the permanent link
              const existingChatId = extractChatIdFromFilePath(existingFile);
              const finalChatId = existingChatId || chatId; // Use existing ID if available
              
              // Replace the entire file with the updated version, but keep the same chat ID
              const markdownContent = formatAsMarkdown(extractionResult.data);
              
              // If chat ID changed, we need to rename the file to maintain the link
              if (existingChatId && existingChatId !== chatId) {
                console.log('[Chat Tracker] Chat ID changed, but keeping existing file name to maintain chat tab link');
                // Write to existing file (maintains the permanent link)
                fs.writeFileSync(existingFile, markdownContent, 'utf-8');
                filePath = existingFile;
              } else {
                // Same chat ID, just update content
                fs.writeFileSync(existingFile, markdownContent, 'utf-8');
                filePath = existingFile;
              }
              
              isAppended = true; // Mark as updated (not a new file)
              console.log('[Chat Tracker] Updated file with latest messages');
            }
          } else {
            // Couldn't parse existing file, but file exists - update it
            console.log('[Chat Tracker] Could not parse existing file, updating with new content');
            const markdownContent = formatAsMarkdown(extractionResult.data);
            fs.writeFileSync(existingFile, markdownContent, 'utf-8');
            filePath = existingFile;
            isAppended = true;
          }
        } else {
          // No file exists for this chat tab - create new file
          console.log('[Chat Tracker] No existing file for this chat tab, creating new file');
          progress.report({ message: 'Writing to file...' });
          const markdownContent = formatAsMarkdown(extractionResult.data);
          filePath = writeChatFile(extractionResult.data, chatId, markdownContent, 'md');
        }

        // Get display path
        const displayPath = getDisplayPath(filePath);

        // Show success message
        const messageCount = extractionResult.data.messages.length;
        const actionText = isAppended ? 'Appended' : 'Exported';
        const successMessage = `✅ ${actionText} ${messageCount} message${messageCount !== 1 ? 's' : ''} to ${displayPath}`;
        
        const action = await vscode.window.showInformationMessage(
          successMessage,
          '📄 Open File',
          '📁 Open Folder'
        );

        // Handle user action
        if (action === '📄 Open File') {
          const doc = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(doc, { preview: false });
        } else if (action === '📁 Open Folder') {
          await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
        }
      }
    );
  } catch (error) {
    // Handle errors with appropriate messages
    handleExportError(error);
  }
}

/**
 * Handles errors during chat export
 */
function handleExportError(error: unknown): void {
  let errorMessage: string;
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = String(error);
  }

  // Provide user-friendly error messages based on error type
  if (errorMessage.includes('No workspace open')) {
    vscode.window.showErrorMessage(
      'Chat Export Failed: No workspace is currently open. Please open a folder or workspace first.'
    );
  } else if (errorMessage.includes('Timeout waiting for export')) {
    vscode.window.showWarningMessage(
      '⏱️ Export was cancelled or timed out.\n\n' +
      'Press Ctrl+Shift+Space again to retry.',
      'Retry'
    ).then(action => {
      if (action === 'Retry') {
        exportChatHandler();
      }
    });
  } else if (errorMessage.includes('No chat messages found') || errorMessage.includes('Unable to access chat interface') || errorMessage.includes('Chat not found in clipboard') || errorMessage.includes('Direct export not available')) {
    vscode.window.showInformationMessage(
      '⚠️ Automatic export didn\'t work.\n\n' +
      'The export dialog should have opened - just click "Export" and the extension will handle the rest!',
      'OK'
    );
  } else if (errorMessage.includes('Failed to create directory') || errorMessage.includes('Failed to write file')) {
    vscode.window.showErrorMessage(
      `Chat Export Failed: Unable to write file. ${errorMessage}`,
      'Show Details'
    ).then(action => {
      if (action === 'Show Details') {
        vscode.window.showErrorMessage(errorMessage);
      }
    });
  } else {
    vscode.window.showErrorMessage(
      `Chat Export Failed: ${errorMessage}`,
      'Copy Error'
    ).then(action => {
      if (action === 'Copy Error') {
        vscode.env.clipboard.writeText(errorMessage);
        vscode.window.showInformationMessage('Error message copied to clipboard');
      }
    });
  }

  // Log error for debugging
  console.error('Chat export error:', error);
}

/**
 * Deactivates the extension
 */
export function deactivate() {
  console.log('Cursor Chat Tracker extension is now deactivated');
}

