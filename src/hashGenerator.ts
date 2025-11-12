import * as crypto from 'crypto';
import { ChatMessage } from './types';

/**
 * Generates a unique chat ID based on message content and timestamp
 * @param messages Array of chat messages
 * @returns A short hash string (first 8 characters of MD5 hash)
 */
export function generateChatId(messages: ChatMessage[]): string {
  // Concatenate all message contents with their timestamps
  const content = messages
    .map(msg => `${msg.role}:${msg.content}:${msg.timestamp}`)
    .join('|');
  
  // Add current timestamp to ensure uniqueness even for identical conversations
  const dataToHash = `${content}|${Date.now()}`;
  
  // Generate MD5 hash and return first 8 characters
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

