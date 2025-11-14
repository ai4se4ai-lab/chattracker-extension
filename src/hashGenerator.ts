import * as crypto from 'crypto';
import { ChatMessage } from './types';

/**
 * Generates a stable chat ID based on the first user message
 * This creates a permanent identifier for a chat tab/session
 * The same chat tab will always have the same ID, even if the prompt is edited later
 * @param messages Array of chat messages
 * @returns A short hash string (first 8 characters of MD5 hash)
 */
export function generateChatId(messages: ChatMessage[]): string {
  // Find the first user message - this represents the chat tab/session
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  
  if (firstUserMessage) {
    // Use first user message content as the stable identifier
    // This creates a permanent link to the chat tab
    // Even if the user edits the prompt later, we can still identify it's the same chat
    const content = firstUserMessage.content.trim();
    const dataToHash = `chat-tab:${content}`;
    
    // Generate MD5 hash and return first 8 characters
    const hash = crypto.createHash('md5').update(dataToHash).digest('hex');
    return hash.substring(0, 8);
  }
  
  // Fallback: if no user message, use all messages (shouldn't happen in practice)
  const content = messages
    .map(msg => `${msg.role}:${msg.content}`)
    .join('|');
  const dataToHash = `chat:${content}`;
  const hash = crypto.createHash('md5').update(dataToHash).digest('hex');
  return hash.substring(0, 8);
}

/**
 * Generates a chat ID from raw content string
 * Useful when messages aren't yet structured
 * @param content Raw content string
 * @returns A short hash string
 */
export function generateChatIdFromContent(content: string): string {
  const dataToHash = `${content}|${Date.now()}`;
  const hash = crypto.createHash('md5').update(dataToHash).digest('hex');
  return hash.substring(0, 8);
}

