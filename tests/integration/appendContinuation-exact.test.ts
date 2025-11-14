import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  writeChatFile, 
  findMostRecentChatFile, 
  readExistingChatFile, 
  isContinuation, 
  appendToChatFile,
  getChatDirectory
} from '../../src/fileManager';
import { formatAsMarkdown } from '../../src/markdownFormatter';
import { ExportedChat, ChatMessage } from '../../src/types';

// Mock vscode module
jest.mock('vscode', () => {
  const { createVSCodeMock } = require('../mocks/vscode-simple');
  return createVSCodeMock();
});

describe('Exact Append Scenario: prompt1→export→prompt2→export→new→export', () => {
  let testWorkspaceDir: string;

  beforeEach(() => {
    testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-tracker-exact-test-'));
    
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

  it('should create only ONE file for continuation (prompt1→export→prompt2→export)', () => {
    const chatDir = getChatDirectory();
    
    // Step 1: prompt1 + response1 → export
    const chat1: ExportedChat = {
      metadata: {
        chatId: 'test-chat-1',
        exportedAt: new Date().toISOString(),
        messageCount: 2,
      },
      messages: [
        { role: 'user', content: 'prompt1', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'response1', timestamp: '2024-01-15T10:00:05Z' },
      ],
    };

    const markdown1 = formatAsMarkdown(chat1);
    const filePath1 = writeChatFile(chat1, 'test-chat-1', markdown1, 'md');
    
    // Verify file created
    expect(fs.existsSync(filePath1)).toBe(true);
    
    // Count files in directory
    const filesAfterStep1 = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
    expect(filesAfterStep1.length).toBe(1);
    expect(filesAfterStep1[0]).toBe('chat-test-chat-1.md');

    // Step 2: prompt2 + response2 → export (should append, NOT create new file)
    const chat2: ExportedChat = {
      metadata: {
        chatId: 'test-chat-2', // Different chatId but should still append
        exportedAt: new Date().toISOString(),
        messageCount: 4, // All messages including previous
      },
      messages: [
        { role: 'user', content: 'prompt1', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'response1', timestamp: '2024-01-15T10:00:05Z' },
        { role: 'user', content: 'prompt2', timestamp: '2024-01-15T10:01:00Z' },
        { role: 'assistant', content: 'response2', timestamp: '2024-01-15T10:01:05Z' },
      ],
    };

    // Simulate the extension logic
    const mostRecentFile = findMostRecentChatFile();
    expect(mostRecentFile).toBe(filePath1);
    expect(mostRecentFile).not.toBeNull();
    
    if (!mostRecentFile) {
      throw new Error('Most recent file should not be null');
    }
    
    const existingChat = readExistingChatFile(mostRecentFile);
    expect(existingChat).not.toBeNull();
    
    if (existingChat) {
      // Check if continuation
      const isCont = isContinuation(existingChat.messages, chat2.messages);
      expect(isCont).toBe(true); // Should detect continuation
      
      // Append new messages
      const existingCount = existingChat.messages.length;
      const newMessages = chat2.messages.slice(existingCount);
      expect(newMessages.length).toBe(2); // Should have 2 new messages
      
      appendToChatFile(mostRecentFile, newMessages, 'md');
      
      // Verify still only ONE file exists
      const filesAfterStep2 = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
      expect(filesAfterStep2.length).toBe(1); // Still only 1 file!
      expect(filesAfterStep2[0]).toBe('chat-test-chat-1.md'); // Same file!
      
      // Verify content includes both conversations
      const content2 = fs.readFileSync(filePath1, 'utf-8');
      expect(content2).toContain('prompt1');
      expect(content2).toContain('response1');
      expect(content2).toContain('prompt2');
      expect(content2).toContain('response2');
    }
  });

  it('should create NEW file for different conversation (prompt1→export→prompt2→export→new→export)', () => {
    const chatDir = getChatDirectory();
    
    // Step 1: prompt1 + response1 → export
    const chat1: ExportedChat = {
      metadata: {
        chatId: 'test-chat-1',
        exportedAt: new Date().toISOString(),
        messageCount: 2,
      },
      messages: [
        { role: 'user', content: 'prompt1', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'response1', timestamp: '2024-01-15T10:00:05Z' },
      ],
    };

    const markdown1 = formatAsMarkdown(chat1);
    const filePath1 = writeChatFile(chat1, 'test-chat-1', markdown1, 'md');
    
    // Step 2: prompt2 + response2 → export (append)
    const chat2: ExportedChat = {
      metadata: {
        chatId: 'test-chat-2',
        exportedAt: new Date().toISOString(),
        messageCount: 4,
      },
      messages: [
        { role: 'user', content: 'prompt1', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'response1', timestamp: '2024-01-15T10:00:05Z' },
        { role: 'user', content: 'prompt2', timestamp: '2024-01-15T10:01:00Z' },
        { role: 'assistant', content: 'response2', timestamp: '2024-01-15T10:01:05Z' },
      ],
    };

    const mostRecentFile1 = findMostRecentChatFile();
    expect(mostRecentFile1).not.toBeNull();
    
    if (mostRecentFile1) {
      const existingChat1 = readExistingChatFile(mostRecentFile1);
      
      if (existingChat1 && isContinuation(existingChat1.messages, chat2.messages)) {
        const newMessages1 = chat2.messages.slice(existingChat1.messages.length);
        appendToChatFile(mostRecentFile1, newMessages1, 'md');
      }
    }
    
    // Verify still only 1 file
    let filesAfterStep2 = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
    expect(filesAfterStep2.length).toBe(1);

    // Step 3: NEW conversation (different content) → export (should create NEW file)
    const chat3: ExportedChat = {
      metadata: {
        chatId: 'test-chat-3',
        exportedAt: new Date().toISOString(),
        messageCount: 2,
      },
      messages: [
        { role: 'user', content: 'NEW prompt', timestamp: '2024-01-15T10:02:00Z' }, // Different content!
        { role: 'assistant', content: 'NEW response', timestamp: '2024-01-15T10:02:05Z' },
      ],
    };

    const mostRecentFile2 = findMostRecentChatFile();
    expect(mostRecentFile2).not.toBeNull();
    
    if (mostRecentFile2) {
      const existingChat2 = readExistingChatFile(mostRecentFile2);
      expect(existingChat2).not.toBeNull();
      
      if (existingChat2) {
        // Should NOT be a continuation
        const isCont2 = isContinuation(existingChat2.messages, chat3.messages);
        expect(isCont2).toBe(false); // Should NOT detect continuation
      }
    }
    
    // Should create new file
    const markdown3 = formatAsMarkdown(chat3);
    const filePath3 = writeChatFile(chat3, 'test-chat-3', markdown3, 'md');
    
    // Verify now TWO files exist
    const filesAfterStep3 = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
    expect(filesAfterStep3.length).toBe(2); // Now 2 files!
    expect(filesAfterStep3).toContain('chat-test-chat-1.md');
    expect(filesAfterStep3).toContain('chat-test-chat-3.md');
    
    // Verify file1 still has original content
    const content1 = fs.readFileSync(filePath1, 'utf-8');
    expect(content1).toContain('prompt1');
    expect(content1).toContain('prompt2');
    
    // Verify file3 has new content
    const content3 = fs.readFileSync(filePath3, 'utf-8');
    expect(content3).toContain('NEW prompt');
    expect(content3).toContain('NEW response');
    expect(content3).not.toContain('prompt1'); // Should not have old content
  });

  it('should handle multiple continuations correctly', () => {
    const chatDir = getChatDirectory();
    
    // Export 1: prompt1 + response1
    const chat1: ExportedChat = {
      metadata: { chatId: 'multi-1', exportedAt: new Date().toISOString(), messageCount: 2 },
      messages: [
        { role: 'user', content: 'Q1', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'A1', timestamp: '2024-01-15T10:00:05Z' },
      ],
    };
    const filePath1 = writeChatFile(chat1, 'multi-1', formatAsMarkdown(chat1), 'md');
    
    // Export 2: Q1+A1+Q2+A2 (continuation)
    const chat2: ExportedChat = {
      metadata: { chatId: 'multi-2', exportedAt: new Date().toISOString(), messageCount: 4 },
      messages: [
        { role: 'user', content: 'Q1', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'A1', timestamp: '2024-01-15T10:00:05Z' },
        { role: 'user', content: 'Q2', timestamp: '2024-01-15T10:01:00Z' },
        { role: 'assistant', content: 'A2', timestamp: '2024-01-15T10:01:05Z' },
      ],
    };
    const existing2 = readExistingChatFile(filePath1);
    if (existing2 && isContinuation(existing2.messages, chat2.messages)) {
      appendToChatFile(filePath1, chat2.messages.slice(2), 'md');
    }
    
    // Export 3: Q1+A1+Q2+A2+Q3+A3 (continuation)
    // First, re-read the file to get updated message count
    const existingAfter2 = readExistingChatFile(filePath1);
    expect(existingAfter2).not.toBeNull();
    expect(existingAfter2!.messages.length).toBe(4); // Should have Q1, A1, Q2, A2
    
    const chat3: ExportedChat = {
      metadata: { chatId: 'multi-3', exportedAt: new Date().toISOString(), messageCount: 6 },
      messages: [
        { role: 'user', content: 'Q1', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'A1', timestamp: '2024-01-15T10:00:05Z' },
        { role: 'user', content: 'Q2', timestamp: '2024-01-15T10:01:00Z' },
        { role: 'assistant', content: 'A2', timestamp: '2024-01-15T10:01:05Z' },
        { role: 'user', content: 'Q3', timestamp: '2024-01-15T10:02:00Z' },
        { role: 'assistant', content: 'A3', timestamp: '2024-01-15T10:02:05Z' },
      ],
    };
    
    if (existingAfter2) {
      const isCont3 = isContinuation(existingAfter2.messages, chat3.messages);
      expect(isCont3).toBe(true); // Should detect continuation
      
      if (isCont3) {
        const newMessages3 = chat3.messages.slice(existingAfter2.messages.length);
        expect(newMessages3.length).toBe(2); // Should have Q3, A3
        appendToChatFile(filePath1, newMessages3, 'md');
      }
    }
    
    // Should still be only ONE file
    const files = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
    expect(files.length).toBe(1);
    
    // Verify all messages are in the file
    const content = fs.readFileSync(filePath1, 'utf-8');
    expect(content).toContain('Q1');
    expect(content).toContain('A1');
    expect(content).toContain('Q2');
    expect(content).toContain('A2');
    expect(content).toContain('Q3');
    expect(content).toContain('A3');
  });

  it('should not append if messages are completely different', () => {
    const chatDir = getChatDirectory();
    
    // Export 1: prompt1 + response1
    const chat1: ExportedChat = {
      metadata: { chatId: 'diff-1', exportedAt: new Date().toISOString(), messageCount: 2 },
      messages: [
        { role: 'user', content: 'Hello', timestamp: '2024-01-15T10:00:00Z' },
        { role: 'assistant', content: 'Hi there', timestamp: '2024-01-15T10:00:05Z' },
      ],
    };
    const filePath1 = writeChatFile(chat1, 'diff-1', formatAsMarkdown(chat1), 'md');
    
    // Export 2: Completely different conversation
    const chat2: ExportedChat = {
      metadata: { chatId: 'diff-2', exportedAt: new Date().toISOString(), messageCount: 2 },
      messages: [
        { role: 'user', content: 'Goodbye', timestamp: '2024-01-15T10:01:00Z' }, // Different!
        { role: 'assistant', content: 'See you', timestamp: '2024-01-15T10:01:05Z' },
      ],
    };
    
    const existing = readExistingChatFile(filePath1);
    const isCont = isContinuation(existing!.messages, chat2.messages);
    expect(isCont).toBe(false); // Should NOT be continuation
    
    // Should create new file
    const filePath2 = writeChatFile(chat2, 'diff-2', formatAsMarkdown(chat2), 'md');
    
    // Should have TWO files
    const files = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
    expect(files.length).toBe(2);
    expect(files).toContain('chat-diff-1.md');
    expect(files).toContain('chat-diff-2.md');
  });
});

