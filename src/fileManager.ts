import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExportedChat } from './types';

/**
 * Gets the directory path where chat files should be stored
 * @returns The absolute path to .cursor/chat directory
 * @throws Error if no workspace is open and home directory cannot be determined
 */
export function getChatDirectory(): string {
  // Try to use workspace root first
  const workspaceFolders = vscode.workspace.workspaceFolders;
  
  let baseDir: string;
  
  if (workspaceFolders && workspaceFolders.length > 0) {
    baseDir = workspaceFolders[0].uri.fsPath;
  } else {
    // Fallback to user home directory if no workspace is open
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error('No workspace open and cannot determine home directory');
    }
    baseDir = homeDir;
  }
  
  return path.join(baseDir, '.cursor', 'chat');
}

/**
 * Ensures the chat directory exists, creating it if necessary
 * @returns The path to the created directory
 * @throws Error if directory creation fails
 */
export function ensureChatDirectory(): string {
  const chatDir = getChatDirectory();
  
  try {
    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
    }
    return chatDir;
  } catch (error) {
    throw new Error(`Failed to create directory ${chatDir}: ${error}`);
  }
}

/**
 * Writes chat data to a Markdown file
 * Uses writeFileSync with proper error handling for large files
 * Includes verification to ensure data integrity for files > 100KB
 * @param chatData The chat data to export
 * @param chatId The unique identifier for this chat
 * @param content The formatted content to write (Markdown or JSON)
 * @param format The file format ('md' or 'json')
 * @returns The full path to the created file
 * @throws Error if file writing fails or verification fails
 */
export function writeChatFile(
  chatData: ExportedChat, 
  chatId: string, 
  content: string,
  format: 'md' | 'json' = 'md'
): string {
  const chatDir = ensureChatDirectory();
  const fileName = `chat-${chatId}.${format}`;
  const filePath = path.join(chatDir, fileName);
  
  try {
    // For large files, use writeFileSync with explicit encoding
    // This ensures proper handling of large content strings
    const contentLength = Buffer.byteLength(content, 'utf-8');
    console.log(`[FileManager] Writing file: ${fileName}, size: ${contentLength} bytes`);
    
    // Write file with explicit UTF-8 encoding and error handling
    fs.writeFileSync(filePath, content, { 
      encoding: 'utf-8',
      flag: 'w' // Explicit write mode
    });
    
    // Verify file was written correctly by checking size
    const stats = fs.statSync(filePath);
    if (stats.size !== contentLength) {
      throw new Error(`File size mismatch: expected ${contentLength} bytes, got ${stats.size} bytes`);
    }
    
    // For very large files, verify first and last few bytes match
    if (contentLength > 100000) { // For files > 100KB
      const writtenContent = fs.readFileSync(filePath, 'utf-8');
      if (writtenContent.length !== content.length) {
        throw new Error(`Content length mismatch: expected ${content.length} chars, got ${writtenContent.length} chars`);
      }
      // Check first 1000 and last 1000 characters match
      const firstChunk = content.substring(0, 1000);
      const lastChunk = content.substring(content.length - 1000);
      const writtenFirst = writtenContent.substring(0, 1000);
      const writtenLast = writtenContent.substring(writtenContent.length - 1000);
      
      if (firstChunk !== writtenFirst || lastChunk !== writtenLast) {
        throw new Error('Content verification failed: first or last chunk mismatch');
      }
    }
    
    console.log(`[FileManager] Successfully wrote file: ${fileName}, verified size: ${stats.size} bytes`);
    return filePath;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[FileManager] Failed to write file ${filePath}:`, errorMsg);
    throw new Error(`Failed to write file ${filePath}: ${errorMsg}`);
  }
}

/**
 * Gets a relative path for display purposes
 * @param absolutePath The absolute file path
 * @returns A relative path if possible, otherwise the absolute path
 */
export function getDisplayPath(absolutePath: string): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  
  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    if (absolutePath.startsWith(workspaceRoot)) {
      return path.relative(workspaceRoot, absolutePath);
    }
  }
  
  return absolutePath;
}

/**
 * Finds the most recently modified chat file in the chat directory
 * @returns The path to the most recent chat file, or null if none exists
 */
export function findMostRecentChatFile(): string | null {
  try {
    const chatDir = getChatDirectory();
    if (!fs.existsSync(chatDir)) {
      return null;
    }

    const files = fs.readdirSync(chatDir)
      .filter(file => file.startsWith('chat-') && (file.endsWith('.md') || file.endsWith('.json')))
      .map(file => ({
        name: file,
        path: path.join(chatDir, file),
        mtime: fs.statSync(path.join(chatDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

    return files.length > 0 ? files[0].path : null;
  } catch (error) {
    console.error('[FileManager] Error finding most recent chat file:', error);
    return null;
  }
}

/**
 * Extracts the chat ID from a file path
 * @param filePath Path to the chat file (e.g., "chat-abc123.md")
 * @returns The chat ID (e.g., "abc123") or null if not found
 */
export function extractChatIdFromFilePath(filePath: string): string | null {
  try {
    const fileName = path.basename(filePath);
    const match = fileName.match(/^chat-([a-f0-9]+)\.(md|json)$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('[FileManager] Error extracting chat ID from file path:', error);
    return null;
  }
}

/**
 * Reads and parses an existing chat file to extract messages
 * @param filePath Path to the chat file
 * @returns Array of messages from the file, or null if parsing fails
 */
export function readExistingChatFile(filePath: string): { messages: any[], content: string } | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Try to parse as markdown (Cursor format)
    const messages: any[] = [];
    
    // More robust pattern that handles various markdown formats
    // Pattern matches: **User** or **Cursor** or **Assistant** followed by content until next marker or end
    const cursorFormatPattern = /\*\*(User|Cursor|Assistant)\*\*\s*[\r\n]+([\s\S]*?)(?=[\r\n]+---[\r\n]+\*\*(?:User|Cursor|Assistant)\*\*|[\r\n]+\*\*(?:User|Cursor|Assistant)\*\*|$)/gi;
    const matches = Array.from(content.matchAll(cursorFormatPattern));
    
    console.log('[FileManager] readExistingChatFile: Found', matches.length, 'message matches in file');
    
    if (matches.length > 0) {
      matches.forEach((match, index) => {
        const role = match[1].toLowerCase();
        const messageContent = match[2].trim();
        if (messageContent.length > 0) {
          messages.push({
            role: role === 'user' ? 'user' : 'assistant',
            content: messageContent
          });
          console.log(`[FileManager] readExistingChatFile: Message ${index + 1}: ${role} - "${messageContent.substring(0, 50)}..."`);
        }
      });
    } else {
      console.log('[FileManager] readExistingChatFile: No messages found with pattern, trying alternative parsing');
      // Fallback: try to find messages by splitting on separators
      const sections = content.split(/\n---\n/);
      sections.forEach((section, index) => {
        const userMatch = section.match(/\*\*User\*\*\s*[\r\n]+([\s\S]*?)(?=\n|$)/i);
        const cursorMatch = section.match(/\*\*Cursor\*\*\s*[\r\n]+([\s\S]*?)(?=\n|$)/i);
        const assistantMatch = section.match(/\*\*Assistant\*\*\s*[\r\n]+([\s\S]*?)(?=\n|$)/i);
        
        if (userMatch && userMatch[1].trim()) {
          messages.push({
            role: 'user',
            content: userMatch[1].trim()
          });
        } else if (cursorMatch || assistantMatch) {
          const content = (cursorMatch?.[1] || assistantMatch?.[1] || '').trim();
          if (content) {
            messages.push({
              role: 'assistant',
              content: content
            });
          }
        }
      });
      console.log('[FileManager] readExistingChatFile: Fallback parsing found', messages.length, 'messages');
    }
    
    console.log('[FileManager] readExistingChatFile: Total messages parsed:', messages.length);
    return { messages, content };
  } catch (error) {
    console.error('[FileManager] Error reading existing chat file:', error);
    return null;
  }
}

/**
 * Checks if the new messages are a continuation of the existing file
 * A continuation means the new messages start with the same messages that end the existing file
 * @param existingMessages Messages from the existing file
 * @param newMessages New messages to check
 * @returns true if new messages are a continuation, false otherwise
 */
export function isContinuation(existingMessages: any[], newMessages: any[]): boolean {
  if (existingMessages.length === 0 || newMessages.length === 0) {
    console.log('[FileManager] isContinuation: Empty messages, returning false');
    return false;
  }

  // Check if new messages start with ALL the existing messages (continuation)
  // OR if new messages start with the last few messages of existing (partial continuation)
  // We check: do the first N messages of new match the last N messages of existing?
  // But we also check: do the first messages of new match ALL existing messages?
  
  // Strategy 1: Check if new messages start with ALL existing messages (most common case)
  if (newMessages.length >= existingMessages.length) {
    let allMatch = true;
    for (let i = 0; i < existingMessages.length; i++) {
      const existingMsg = existingMessages[i];
      const newMsg = newMessages[i];
      
      if (!existingMsg || !newMsg) {
        allMatch = false;
        break;
      }
      
      // Normalize content
      const normalizeContent = (text: string): string => {
        return (text || '').trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
      };
      
      const existingContent = normalizeContent(existingMsg.content || '');
      const newContent = normalizeContent(newMsg.content || '');
      
      if (existingMsg.role !== newMsg.role || existingContent !== newContent) {
        allMatch = false;
        break;
      }
    }
    
    if (allMatch) {
      console.log('[FileManager] isContinuation: New messages start with ALL existing messages - continuation detected');
      return true;
    }
  }
  
  // Strategy 2: Check if new messages start with the last few messages of existing (partial match)
  // This handles cases where user might have exported mid-conversation
  const checkCount = Math.min(3, existingMessages.length, newMessages.length);
  
  console.log('[FileManager] isContinuation: Strategy 1 failed, trying partial match with', checkCount, 'messages');
  console.log('[FileManager] Existing messages count:', existingMessages.length);
  console.log('[FileManager] New messages count:', newMessages.length);
  
  for (let i = 0; i < checkCount; i++) {
    const existingIndex = existingMessages.length - checkCount + i;
    const existingMsg = existingMessages[existingIndex];
    const newMsg = newMessages[i];
    
    if (!existingMsg || !newMsg) {
      console.log('[FileManager] isContinuation: Missing message at index', i);
      return false;
    }
    
    // Normalize content: trim and normalize whitespace (multiple spaces/newlines to single)
    const normalizeContent = (text: string): string => {
      return (text || '').trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
    };
    
    const existingContent = normalizeContent(existingMsg.content || '');
    const newContent = normalizeContent(newMsg.content || '');
    const roleMatch = existingMsg.role === newMsg.role;
    const contentMatch = existingContent === newContent;
    
    console.log(`[FileManager] isContinuation: Message ${i}: role match=${roleMatch}, content match=${contentMatch}`);
    console.log(`[FileManager]   Existing[${existingIndex}]: ${existingMsg.role} - "${existingContent.substring(0, 50)}..."`);
    console.log(`[FileManager]   New[${i}]:      ${newMsg.role} - "${newContent.substring(0, 50)}..."`);
    
    // Compare role and content (normalize whitespace)
    if (!roleMatch || !contentMatch) {
      console.log('[FileManager] isContinuation: Messages differ, not a continuation');
      console.log(`[FileManager]   Existing length: ${existingContent.length}, New length: ${newContent.length}`);
      return false;
    }
  }
  
  console.log('[FileManager] isContinuation: Partial match found, continuation detected');
  return true;
}

/**
 * Appends new messages to an existing chat file
 * @param filePath Path to the existing file
 * @param newMessages New messages to append
 * @param format File format ('md' or 'json')
 * @returns The file path
 */
export function appendToChatFile(
  filePath: string,
  newMessages: any[],
  format: 'md' | 'json' = 'md'
): string {
  try {
    const existingContent = fs.readFileSync(filePath, 'utf-8');
    
    if (format === 'md') {
      // For markdown, append at the end of the file
      // Build new content to append
      const linesToAppend: string[] = [];
      
      // Always add separator before new messages (unless file is empty)
      if (existingContent.trim().length > 0) {
        linesToAppend.push('');
        linesToAppend.push('---');
        linesToAppend.push('');
      }
      
      newMessages.forEach((message, index) => {
        // Add separator between messages (except before first one)
        if (index > 0) {
          linesToAppend.push('');
          linesToAppend.push('---');
          linesToAppend.push('');
        }
        
        if (message.role === 'user') {
          linesToAppend.push('**User**');
        } else {
          linesToAppend.push('**Cursor**');
        }
        linesToAppend.push('');
        linesToAppend.push(message.content);
        linesToAppend.push('');
      });
      
      // Append to end of file
      const newContent = existingContent.trim() + '\n' + linesToAppend.join('\n');
      
      fs.writeFileSync(filePath, newContent, { encoding: 'utf-8', flag: 'w' });
    } else {
      // For JSON, parse and merge
      const existingData = JSON.parse(existingContent);
      if (existingData.messages && Array.isArray(existingData.messages)) {
        existingData.messages.push(...newMessages);
        existingData.metadata.messageCount = existingData.messages.length;
        existingData.metadata.exportedAt = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), { encoding: 'utf-8', flag: 'w' });
      }
    }
    
    console.log(`[FileManager] Appended ${newMessages.length} messages to ${path.basename(filePath)}`);
    return filePath;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[FileManager] Failed to append to file ${filePath}:`, errorMsg);
    throw new Error(`Failed to append to file ${filePath}: ${errorMsg}`);
  }
}

