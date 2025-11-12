import * as vscode from 'vscode';
import { extractChatMessages } from './chatExtractor';
import { writeChatFile, getDisplayPath } from './fileManager';
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

        // Write to file in Markdown format
        progress.report({ message: 'Writing to file...' });
        const chatId = extractionResult.data.metadata.chatId;
        const markdownContent = formatAsMarkdown(extractionResult.data);
        const filePath = writeChatFile(extractionResult.data, chatId, markdownContent, 'md');

        // Get display path
        const displayPath = getDisplayPath(filePath);

        // Show success message
        const messageCount = extractionResult.data.messages.length;
        const successMessage = `✅ Exported ${messageCount} message${messageCount !== 1 ? 's' : ''} to ${displayPath}`;
        
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

