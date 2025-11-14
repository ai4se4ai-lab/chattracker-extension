import { formatAsMarkdown, formatAsSimpleMarkdown } from '../../src/markdownFormatter';
import { ExportedChat, ChatMessage } from '../../src/types';

describe('MarkdownFormatter', () => {
  const createTestChat = (messages: ChatMessage[]): ExportedChat => ({
    metadata: {
      chatId: 'test123',
      exportedAt: '2024-01-15T10:00:00Z',
      messageCount: messages.length,
    },
    messages,
  });

  describe('formatAsMarkdown', () => {
    it('should format simple conversation', () => {
      const chat = createTestChat([
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: '2024-01-15T10:00:05Z',
        },
      ]);

      const result = formatAsMarkdown(chat);

      expect(result).toContain('# Hello');
      expect(result).toContain('**User**');
      expect(result).toContain('**Cursor**');
      expect(result).toContain('Hello');
      expect(result).toContain('Hi there!');
      expect(result).toContain('---');
    });

    it('should use first user message as title', () => {
      const chat = createTestChat([
        {
          role: 'user',
          content: 'What is TypeScript?',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          role: 'assistant',
          content: 'TypeScript is...',
          timestamp: '2024-01-15T10:00:05Z',
        },
      ]);

      const result = formatAsMarkdown(chat);

      expect(result).toContain('# What is TypeScript?');
    });

    it('should truncate long title to 80 characters', () => {
      const longMessage = 'A'.repeat(100);
      const chat = createTestChat([
        {
          role: 'user',
          content: longMessage,
          timestamp: '2024-01-15T10:00:00Z',
        },
      ]);

      const result = formatAsMarkdown(chat);
      const titleMatch = result.match(/^# (.+)$/m);

      expect(titleMatch).toBeTruthy();
      if (titleMatch) {
        expect(titleMatch[1].length).toBeLessThanOrEqual(80);
      }
    });

    it('should handle multi-line messages', () => {
      const chat = createTestChat([
        {
          role: 'user',
          content: 'Line 1\nLine 2\nLine 3',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          role: 'assistant',
          content: 'Response line 1\nResponse line 2',
          timestamp: '2024-01-15T10:00:05Z',
        },
      ]);

      const result = formatAsMarkdown(chat);

      expect(result).toContain('Line 1\nLine 2\nLine 3');
      expect(result).toContain('Response line 1\nResponse line 2');
    });

    it('should include export metadata', () => {
      const chat = createTestChat([
        {
          role: 'user',
          content: 'Test',
          timestamp: '2024-01-15T10:00:00Z',
        },
      ]);

      const result = formatAsMarkdown(chat);

      expect(result).toContain('Exported on');
      expect(result).toContain('from Cursor Chat Tracker');
    });

    it('should separate messages with ---', () => {
      const chat = createTestChat([
        {
          role: 'user',
          content: 'Message 1',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          role: 'assistant',
          content: 'Response 1',
          timestamp: '2024-01-15T10:00:05Z',
        },
        {
          role: 'user',
          content: 'Message 2',
          timestamp: '2024-01-15T10:01:00Z',
        },
      ]);

      const result = formatAsMarkdown(chat);
      const separators = (result.match(/^---$/gm) || []).length;

      // Should have 2 separators (between 3 messages)
      // Note: There's also a separator after metadata, so we check for at least 2
      expect(separators).toBeGreaterThanOrEqual(2);
    });

    it('should not add separator after last message', () => {
      const chat = createTestChat([
        {
          role: 'user',
          content: 'Message',
          timestamp: '2024-01-15T10:00:00Z',
        },
      ]);

      const result = formatAsMarkdown(chat);
      
      // Should not end with ---
      expect(result.trim()).not.toMatch(/---\s*$/);
    });

    it('should handle empty messages array', () => {
      const chat = createTestChat([]);
      const result = formatAsMarkdown(chat);

      expect(result).toContain('# Chat Export');
    });

    it('should handle code blocks in messages', () => {
      const chat = createTestChat([
        {
          role: 'user',
          content: 'Show me code:\n```js\nconsole.log("test");\n```',
          timestamp: '2024-01-15T10:00:00Z',
        },
      ]);

      const result = formatAsMarkdown(chat);

      expect(result).toContain('```js');
      expect(result).toContain('console.log("test");');
    });
  });

  describe('formatAsSimpleMarkdown', () => {
    it('should format with simple structure', () => {
      const chat = createTestChat([
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          role: 'assistant',
          content: 'Hi!',
          timestamp: '2024-01-15T10:00:05Z',
        },
      ]);

      const result = formatAsSimpleMarkdown(chat);

      expect(result).toContain('# Chat Conversation');
      expect(result).toContain('**You:**');
      expect(result).toContain('**Assistant:**');
      expect(result).toContain('Hello');
      expect(result).toContain('Hi!');
    });

    it('should include message count', () => {
      const chat = createTestChat([
        {
          role: 'user',
          content: 'Test',
          timestamp: '2024-01-15T10:00:00Z',
        },
      ]);

      const result = formatAsSimpleMarkdown(chat);

      expect(result).toContain('Messages: 1');
    });
  });
});

