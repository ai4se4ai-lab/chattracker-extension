import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { writeChatFile } from '../../src/fileManager';
import { ExportedChat, ChatMessage } from '../../src/types';

// Mock vscode module
jest.mock('vscode', () => {
  const { createVSCodeMock } = require('../mocks/vscode-simple');
  return createVSCodeMock();
});

describe('FileManager - Large File Handling', () => {
  let testWorkspaceDir: string;

  beforeEach(() => {
    testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-tracker-large-test-'));
    
    const vscode = require('vscode');
    vscode.workspace.workspaceFolders = [
      {
        uri: {
          fsPath: testWorkspaceDir,
        },
      },
    ];
  });

  afterEach(() => {
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
  });

  describe('Large File Writing', () => {
    it('should write large markdown file (100KB+)', () => {
      // Generate large content
      const largeContent = '# Large Chat Export\n\n';
      const largeBlock = 'This is a large content block. '.repeat(5000);
      const fullContent = largeContent + largeBlock;
      
      const chatData: ExportedChat = {
        metadata: {
          chatId: 'large-test',
          exportedAt: new Date().toISOString(),
          messageCount: 1,
        },
        messages: [
          {
            role: 'user',
            content: largeBlock,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const filePath = writeChatFile(chatData, 'large-test', fullContent, 'md');
      
      expect(fs.existsSync(filePath)).toBe(true);
      
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(100000); // > 100KB
      
      // Verify content integrity
      const writtenContent = fs.readFileSync(filePath, 'utf-8');
      expect(writtenContent.length).toBe(fullContent.length);
      expect(writtenContent.substring(0, 100)).toBe(fullContent.substring(0, 100));
      expect(writtenContent.substring(writtenContent.length - 100)).toBe(fullContent.substring(fullContent.length - 100));
    });

    it('should write very large file (1MB+)', () => {
      // Generate very large content
      const lines: string[] = [];
      for (let i = 0; i < 10000; i++) {
        lines.push(`Line ${i}: This is test content to make the file very large. `.repeat(10));
      }
      const veryLargeContent = lines.join('\n');
      
      const chatData: ExportedChat = {
        metadata: {
          chatId: 'very-large-test',
          exportedAt: new Date().toISOString(),
          messageCount: 1,
        },
        messages: [
          {
            role: 'user',
            content: veryLargeContent,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const filePath = writeChatFile(chatData, 'very-large-test', veryLargeContent, 'md');
      
      expect(fs.existsSync(filePath)).toBe(true);
      
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(1000000); // > 1MB
      
      // Verify first and last chunks
      const writtenContent = fs.readFileSync(filePath, 'utf-8');
      const firstChunk = veryLargeContent.substring(0, 1000);
      const lastChunk = veryLargeContent.substring(veryLargeContent.length - 1000);
      const writtenFirst = writtenContent.substring(0, 1000);
      const writtenLast = writtenContent.substring(writtenContent.length - 1000);
      
      expect(writtenFirst).toBe(firstChunk);
      expect(writtenLast).toBe(lastChunk);
    });

    it('should preserve special characters in large files', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",./<>?';
      const unicode = '你好 🌟 🚀 💻 ⚡ 🎉';
      const largeContent = (specialChars + unicode + '\n').repeat(10000);
      
      const chatData: ExportedChat = {
        metadata: {
          chatId: 'special-chars-large',
          exportedAt: new Date().toISOString(),
          messageCount: 1,
        },
        messages: [
          {
            role: 'user',
            content: largeContent,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const filePath = writeChatFile(chatData, 'special-chars-large', largeContent, 'md');
      
      const writtenContent = fs.readFileSync(filePath, 'utf-8');
      expect(writtenContent).toContain(specialChars);
      expect(writtenContent).toContain('你好');
      expect(writtenContent).toContain('🌟');
    });

    it('should handle large JSON files', () => {
      const largeObject = {
        messages: Array(1000).fill(null).map((_, i): ChatMessage => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: `Message ${i}: ${'A'.repeat(1000)}`,
          timestamp: new Date().toISOString(),
        })),
      };
      
      const jsonContent = JSON.stringify(largeObject, null, 2);
      
      const chatData: ExportedChat = {
        metadata: {
          chatId: 'large-json',
          exportedAt: new Date().toISOString(),
          messageCount: 1000,
        },
        messages: largeObject.messages,
      };

      const filePath = writeChatFile(chatData, 'large-json', jsonContent, 'json');
      
      expect(fs.existsSync(filePath)).toBe(true);
      
      const writtenContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(writtenContent);
      
      expect(parsed.messages.length).toBe(1000);
      expect(parsed.messages[0].content).toContain('Message 0');
    });

    it('should verify file integrity after writing', () => {
      const content = 'A'.repeat(500000); // 500KB of 'A's
      
      const chatData: ExportedChat = {
        metadata: {
          chatId: 'integrity-test',
          exportedAt: new Date().toISOString(),
          messageCount: 1,
        },
        messages: [
          {
            role: 'user',
            content: content,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const filePath = writeChatFile(chatData, 'integrity-test', content, 'md');
      
      // Verify file size matches content size
      const stats = fs.statSync(filePath);
      const expectedSize = Buffer.byteLength(content, 'utf-8');
      expect(stats.size).toBe(expectedSize);
      
      // Verify entire content matches
      const writtenContent = fs.readFileSync(filePath, 'utf-8');
      expect(writtenContent).toBe(content);
      expect(writtenContent.length).toBe(content.length);
    });
  });
});

