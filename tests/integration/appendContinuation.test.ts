import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  writeChatFile, 
  findMostRecentChatFile, 
  readExistingChatFile, 
  isContinuation, 
  appendToChatFile,
  ensureChatDirectory 
} from '../../src/fileManager';
import { formatAsMarkdown } from '../../src/markdownFormatter';
import { ExportedChat, ChatMessage } from '../../src/types';

// Mock vscode module
jest.mock('vscode', () => {
  const { createVSCodeMock } = require('../mocks/vscode-simple');
  return createVSCodeMock();
});

describe('Append Continuation Scenario', () => {
  let testWorkspaceDir: string;

  beforeEach(() => {
    testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-tracker-append-test-'));
    
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

  describe('Complete Append Scenario', () => {
    it('should handle: prompt1+response1 -> export -> prompt2+response2 -> export (append) -> prompt1+response1 (new) -> export (new file)', () => {
      // Step 1: User prompt 1, AI response 1, user export
      const chat1: ExportedChat = {
        metadata: {
          chatId: 'chat1',
          exportedAt: new Date().toISOString(),
          messageCount: 2,
        },
        messages: [
          {
            role: 'user',
            content: 'User prompt 1',
            timestamp: '2024-01-15T10:00:00Z',
          },
          {
            role: 'assistant',
            content: 'AI response 1',
            timestamp: '2024-01-15T10:00:05Z',
          },
        ],
      };

      const markdown1 = formatAsMarkdown(chat1);
      const filePath1 = writeChatFile(chat1, 'chat1', markdown1, 'md');
      
      expect(fs.existsSync(filePath1)).toBe(true);
      const content1 = fs.readFileSync(filePath1, 'utf-8');
      expect(content1).toContain('User prompt 1');
      expect(content1).toContain('AI response 1');
      
      // Verify most recent file is found
      const mostRecent1 = findMostRecentChatFile();
      expect(mostRecent1).toBe(filePath1);

      // Step 2: User prompt 2, AI response 2, user export (should append)
      const chat2: ExportedChat = {
        metadata: {
          chatId: 'chat2',
          exportedAt: new Date().toISOString(),
          messageCount: 4, // Includes previous 2 + new 2
        },
        messages: [
          {
            role: 'user',
            content: 'User prompt 1',
            timestamp: '2024-01-15T10:00:00Z',
          },
          {
            role: 'assistant',
            content: 'AI response 1',
            timestamp: '2024-01-15T10:00:05Z',
          },
          {
            role: 'user',
            content: 'User prompt 2',
            timestamp: '2024-01-15T10:01:00Z',
          },
          {
            role: 'assistant',
            content: 'AI response 2',
            timestamp: '2024-01-15T10:01:05Z',
          },
        ],
      };

      // Check if it's a continuation
      const existingChat = readExistingChatFile(filePath1);
      expect(existingChat).not.toBeNull();
      if (existingChat) {
        const isCont = isContinuation(existingChat.messages, chat2.messages);
        expect(isCont).toBe(true);
        
        // Append new messages
        const newMessages = chat2.messages.slice(2); // Get only the new messages
        const appendedPath = appendToChatFile(filePath1, newMessages, 'md');
        expect(appendedPath).toBe(filePath1);
        
        // Verify appended content
        const content2 = fs.readFileSync(filePath1, 'utf-8');
        expect(content2).toContain('User prompt 1');
        expect(content2).toContain('AI response 1');
        expect(content2).toContain('User prompt 2');
        expect(content2).toContain('AI response 2');
        
        // Verify it's still the most recent
        const mostRecent2 = findMostRecentChatFile();
        expect(mostRecent2).toBe(filePath1);
      }

      // Step 3: User prompt 1, AI response 1 (different conversation), user export (should create new file)
      const chat3: ExportedChat = {
        metadata: {
          chatId: 'chat3',
          exportedAt: new Date().toISOString(),
          messageCount: 2,
        },
        messages: [
          {
            role: 'user',
            content: 'User prompt 1', // Same content but different conversation
            timestamp: '2024-01-15T10:02:00Z', // Different timestamp
          },
          {
            role: 'assistant',
            content: 'AI response 1',
            timestamp: '2024-01-15T10:02:05Z',
          },
        ],
      };

      // Check if it's a continuation (should be false because timestamps/content don't match existing)
      const existingChat2 = readExistingChatFile(filePath1);
      expect(existingChat2).not.toBeNull();
      if (existingChat2) {
        // This should NOT be a continuation because the existing file has 4 messages
        // and this new chat only has 2, and they don't match the end of existing
        const isCont2 = isContinuation(existingChat2.messages, chat3.messages);
        expect(isCont2).toBe(false);
        
        // Should create new file
        const markdown3 = formatAsMarkdown(chat3);
        const filePath3 = writeChatFile(chat3, 'chat3', markdown3, 'md');
        expect(filePath3).not.toBe(filePath1);
        expect(fs.existsSync(filePath3)).toBe(true);
        
        // Verify new file content
        const content3 = fs.readFileSync(filePath3, 'utf-8');
        expect(content3).toContain('User prompt 1');
        expect(content3).toContain('AI response 1');
        
        // Verify both files exist
        expect(fs.existsSync(filePath1)).toBe(true);
        expect(fs.existsSync(filePath3)).toBe(true);
        
        // Most recent should be the new one
        const mostRecent3 = findMostRecentChatFile();
        expect(mostRecent3).toBe(filePath3);
      }
    });

    it('should correctly identify continuation when messages match', () => {
      const existingMessages: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-15T10:00:05Z' },
      ];

      const newMessages: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-15T10:00:05Z' },
        { role: 'user', content: 'How are you?', timestamp: '2024-01-15T10:01:00Z' },
        { role: 'assistant', content: 'I am fine', timestamp: '2024-01-15T10:01:05Z' },
      ];

      const isCont = isContinuation(existingMessages, newMessages);
      expect(isCont).toBe(true);
    });

    it('should correctly identify non-continuation when messages differ', () => {
      const existingMessages: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-15T10:00:05Z' },
      ];

      const newMessages: ChatMessage[] = [
        { role: 'user', content: 'Goodbye', timestamp: '2024-01-15T10:02:00Z' },
        { role: 'assistant', content: 'See you!', timestamp: '2024-01-15T10:02:05Z' },
      ];

      const isCont = isContinuation(existingMessages, newMessages);
      expect(isCont).toBe(false);
    });

    it('should append only new messages to existing file', () => {
      const chat1: ExportedChat = {
        metadata: {
          chatId: 'test-append',
          exportedAt: new Date().toISOString(),
          messageCount: 2,
        },
        messages: [
          { role: 'user', content: 'Message 1', timestamp: '2024-01-15T10:00:00Z' },
          { role: 'assistant', content: 'Response 1', timestamp: '2024-01-15T10:00:05Z' },
        ],
      };

      const markdown1 = formatAsMarkdown(chat1);
      const filePath = writeChatFile(chat1, 'test-append', markdown1, 'md');
      
      // New messages to append
      const newMessages: ChatMessage[] = [
        { role: 'user', content: 'Message 2', timestamp: '2024-01-15T10:01:00Z' },
        { role: 'assistant', content: 'Response 2', timestamp: '2024-01-15T10:01:05Z' },
      ];

      appendToChatFile(filePath, newMessages, 'md');
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('Message 1');
      expect(content).toContain('Response 1');
      expect(content).toContain('Message 2');
      expect(content).toContain('Response 2');
      
      // Count separators - should have separators between messages
      const separatorCount = (content.match(/^---$/gm) || []).length;
      expect(separatorCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple append operations', () => {
      const chat1: ExportedChat = {
        metadata: {
          chatId: 'multi-append',
          exportedAt: new Date().toISOString(),
          messageCount: 2,
        },
        messages: [
          { role: 'user', content: 'First message', timestamp: '2024-01-15T10:00:00Z' },
          { role: 'assistant', content: 'First response', timestamp: '2024-01-15T10:00:05Z' },
        ],
      };

      const markdown1 = formatAsMarkdown(chat1);
      const filePath = writeChatFile(chat1, 'multi-append', markdown1, 'md');
      
      // First append
      const newMessages1: ChatMessage[] = [
        { role: 'user', content: 'Second message', timestamp: '2024-01-15T10:01:00Z' },
        { role: 'assistant', content: 'Second response', timestamp: '2024-01-15T10:01:05Z' },
      ];
      appendToChatFile(filePath, newMessages1, 'md');
      
      // Second append
      const newMessages2: ChatMessage[] = [
        { role: 'user', content: 'Third message', timestamp: '2024-01-15T10:02:00Z' },
        { role: 'assistant', content: 'Third response', timestamp: '2024-01-15T10:02:05Z' },
      ];
      appendToChatFile(filePath, newMessages2, 'md');
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('First message');
      expect(content).toContain('First response');
      expect(content).toContain('Second message');
      expect(content).toContain('Second response');
      expect(content).toContain('Third message');
      expect(content).toContain('Third response');
    });
  });
});

