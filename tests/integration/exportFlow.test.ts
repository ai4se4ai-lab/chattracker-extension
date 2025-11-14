/**
 * Integration tests for the complete export flow
 * These tests verify that all components work together correctly
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { formatAsMarkdown } from '../../src/markdownFormatter';
import { writeChatFile, ensureChatDirectory } from '../../src/fileManager';
import { generateChatId } from '../../src/hashGenerator';
import { ExportedChat, ChatMessage } from '../../src/types';

// Mock vscode module
jest.mock('vscode', () => {
  const { createVSCodeMock } = require('../mocks/vscode-simple');
  return createVSCodeMock();
});

describe('Export Flow Integration', () => {
  let testWorkspaceDir: string;

  beforeEach(() => {
    testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-tracker-integration-'));
    
    // Mock workspace
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

  describe('Complete Export Workflow', () => {
    it('should export a simple conversation end-to-end', () => {
      // 1. Create chat data
      const messages: ChatMessage[] = [
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
      ];

      // 2. Generate chat ID
      const chatId = generateChatId(messages);

      // 3. Create exported chat
      const exportedChat: ExportedChat = {
        metadata: {
          chatId,
          exportedAt: new Date().toISOString(),
          messageCount: messages.length,
        },
        messages,
      };

      // 4. Format as markdown
      const markdownContent = formatAsMarkdown(exportedChat);

      // 5. Write to file
      const filePath = writeChatFile(exportedChat, chatId, markdownContent, 'md');

      // 6. Verify
      expect(fs.existsSync(filePath)).toBe(true);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('Hello');
      expect(fileContent).toContain('Hi there!');
      expect(fileContent).toContain('**User**');
      expect(fileContent).toContain('**Cursor**');
    });

    it('should export a multi-turn conversation', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Q1', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'A1', timestamp: '2024-01-15T10:00:05Z' },
        { role: 'user', content: 'Q2', timestamp: '2024-01-15T10:01:00Z' },
        { role: 'assistant', content: 'A2', timestamp: '2024-01-15T10:01:05Z' },
        { role: 'user', content: 'Q3', timestamp: '2024-01-15T10:02:00Z' },
        { role: 'assistant', content: 'A3', timestamp: '2024-01-15T10:02:05Z' },
      ];

      const chatId = generateChatId(messages);
      const exportedChat: ExportedChat = {
        metadata: {
          chatId,
          exportedAt: new Date().toISOString(),
          messageCount: messages.length,
        },
        messages,
      };

      const markdownContent = formatAsMarkdown(exportedChat);
      const filePath = writeChatFile(exportedChat, chatId, markdownContent, 'md');

      expect(fs.existsSync(filePath)).toBe(true);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Should contain all messages
      expect(fileContent).toContain('Q1');
      expect(fileContent).toContain('A1');
      expect(fileContent).toContain('Q2');
      expect(fileContent).toContain('A2');
      expect(fileContent).toContain('Q3');
      expect(fileContent).toContain('A3');
      
      // Should have correct number of separators
      // Note: There's also a separator after metadata, so we check for at least 5
      const separatorCount = (fileContent.match(/^---$/gm) || []).length;
      expect(separatorCount).toBeGreaterThanOrEqual(5); // 6 messages = 5 separators between messages + 1 after metadata
    });

    it('should handle code blocks in messages', () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Show me code',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          role: 'assistant',
          content: 'Here is code:\n```javascript\nconsole.log("test");\n```',
          timestamp: '2024-01-15T10:00:05Z',
        },
      ];

      const chatId = generateChatId(messages);
      const exportedChat: ExportedChat = {
        metadata: {
          chatId,
          exportedAt: new Date().toISOString(),
          messageCount: messages.length,
        },
        messages,
      };

      const markdownContent = formatAsMarkdown(exportedChat);
      const filePath = writeChatFile(exportedChat, chatId, markdownContent, 'md');

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('```javascript');
      expect(fileContent).toContain('console.log("test");');
    });

    it('should create unique files for different chats', () => {
      const messages1: ChatMessage[] = [
        { role: 'user', content: 'Chat 1', timestamp: '2024-01-15T10:00:00Z' },
      ];
      const messages2: ChatMessage[] = [
        { role: 'user', content: 'Chat 2', timestamp: '2024-01-15T10:00:00Z' },
      ];

      const chatId1 = generateChatId(messages1);
      const chatId2 = generateChatId(messages2);

      expect(chatId1).not.toBe(chatId2);

      const exportedChat1: ExportedChat = {
        metadata: {
          chatId: chatId1,
          exportedAt: new Date().toISOString(),
          messageCount: 1,
        },
        messages: messages1,
      };

      const exportedChat2: ExportedChat = {
        metadata: {
          chatId: chatId2,
          exportedAt: new Date().toISOString(),
          messageCount: 1,
        },
        messages: messages2,
      };

      const filePath1 = writeChatFile(exportedChat1, chatId1, 'Content 1', 'md');
      const filePath2 = writeChatFile(exportedChat2, chatId2, 'Content 2', 'md');

      expect(filePath1).not.toBe(filePath2);
      expect(fs.existsSync(filePath1)).toBe(true);
      expect(fs.existsSync(filePath2)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty messages array', () => {
      const messages: ChatMessage[] = [];
      const chatId = generateChatId(messages);
      
      const exportedChat: ExportedChat = {
        metadata: {
          chatId,
          exportedAt: new Date().toISOString(),
          messageCount: 0,
        },
        messages,
      };

      const markdownContent = formatAsMarkdown(exportedChat);
      expect(markdownContent).toContain('# Chat Export');
    });
  });
});

