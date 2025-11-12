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
 * @param chatData The chat data to export
 * @param chatId The unique identifier for this chat
 * @param content The formatted content to write (Markdown or JSON)
 * @param format The file format ('md' or 'json')
 * @returns The full path to the created file
 * @throws Error if file writing fails
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
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
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

