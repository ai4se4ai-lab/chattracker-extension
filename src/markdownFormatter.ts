import { ExportedChat, ChatMessage } from './types';

/**
 * Formats chat data as Markdown (Cursor-compatible format)
 * @param chatData The chat data to format
 * @returns Markdown string matching Cursor's native export format
 */
export function formatAsMarkdown(chatData: ExportedChat): string {
  const lines: string[] = [];
  
  // Title from first user message
  const firstUserMessage = chatData.messages.find(m => m.role === 'user');
  const title = firstUserMessage 
    ? firstUserMessage.content.split('\n')[0].substring(0, 80) 
    : 'Chat Export';
  
  lines.push(`# ${title}`);
  
  // Export metadata (similar to Cursor's format)
  const exportDate = new Date(chatData.metadata.exportedAt);
  const dateStr = exportDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  const timeStr = exportDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false
  });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  lines.push(`_Exported on ${exportDate.toLocaleDateString()} at ${exportDate.toLocaleTimeString()} from Cursor Chat Tracker_`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Messages in Cursor's format
  chatData.messages.forEach((message, index) => {
    // Role marker
    if (message.role === 'user') {
      lines.push('**User**');
    } else {
      lines.push('**Cursor**');
    }
    lines.push('');
    
    // Message content
    lines.push(message.content);
    lines.push('');
    
    // Separator between messages (except last one)
    if (index < chatData.messages.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });
  
  return lines.join('\n');
}

/**
 * Formats chat data as simple plain text markdown (alternative format)
 * @param chatData The chat data to format
 * @returns Simplified Markdown string
 */
export function formatAsSimpleMarkdown(chatData: ExportedChat): string {
  const lines: string[] = [];
  
  // Simple title
  lines.push(`# Chat Conversation\n`);
  lines.push(`*Exported: ${new Date(chatData.metadata.exportedAt).toLocaleString()}*`);
  lines.push(`*Messages: ${chatData.metadata.messageCount}*\n`);
  lines.push('---\n');
  
  // Messages in simple format
  chatData.messages.forEach((message, index) => {
    if (message.role === 'user') {
      lines.push(`**You:**\n`);
    } else {
      lines.push(`**Assistant:**\n`);
    }
    
    lines.push(message.content);
    lines.push('\n');
  });
  
  return lines.join('\n');
}

