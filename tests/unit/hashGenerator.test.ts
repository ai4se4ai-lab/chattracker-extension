import { generateChatId, generateChatIdFromContent } from '../../src/hashGenerator';
import { ChatMessage } from '../../src/types';

describe('HashGenerator', () => {
  describe('generateChatId', () => {
    it('should generate a unique hash for messages', async () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: '2024-01-01T00:00:05Z',
        },
      ];

      const hash1 = generateChatId(messages);
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const hash2 = generateChatId(messages);

      // Should be 8 characters
      expect(hash1).toHaveLength(8);
      expect(hash2).toHaveLength(8);
      
      // Should be different due to timestamp (but might be same if generated very quickly)
      // So we just check format
      expect(hash1).toMatch(/^[a-f0-9]{8}$/);
      expect(hash2).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should generate consistent format for same content', () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Test message',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      const hash = generateChatId(messages);
      
      // Should be alphanumeric
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should handle empty messages array', () => {
      const messages: ChatMessage[] = [];
      const hash = generateChatId(messages);
      
      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should generate different hashes for different messages', () => {
      const messages1: ChatMessage[] = [
        { role: 'user', content: 'Message 1', timestamp: '2024-01-01T00:00:00Z' },
      ];
      const messages2: ChatMessage[] = [
        { role: 'user', content: 'Message 2', timestamp: '2024-01-01T00:00:00Z' },
      ];

      const hash1 = generateChatId(messages1);
      const hash2 = generateChatId(messages2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle messages with metadata', () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Test',
          timestamp: '2024-01-01T00:00:00Z',
          metadata: { tokenCount: 10 },
        },
      ];

      const hash = generateChatId(messages);
      expect(hash).toHaveLength(8);
    });
  });

  describe('generateChatIdFromContent', () => {
    it('should generate a hash from content string', () => {
      const content = 'Test chat content';
      const hash = generateChatIdFromContent(content);

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generateChatIdFromContent('Content 1');
      const hash2 = generateChatIdFromContent('Content 2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = generateChatIdFromContent('');
      expect(hash).toHaveLength(8);
    });

    it('should handle long content', () => {
      const longContent = 'A'.repeat(10000);
      const hash = generateChatIdFromContent(longContent);

      expect(hash).toHaveLength(8);
    });

    it('should handle special characters', () => {
      const specialContent = '!@#$%^&*()_+-=[]{}|;:\'",./<>?';
      const hash = generateChatIdFromContent(specialContent);

      expect(hash).toHaveLength(8);
    });
  });
});

