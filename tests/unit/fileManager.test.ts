import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getChatDirectory, ensureChatDirectory, writeChatFile, getDisplayPath } from '../../src/fileManager';
import { ExportedChat, ChatMessage } from '../../src/types';

// Mock vscode module
jest.mock('vscode', () => {
  const { createVSCodeMock } = require('../mocks/vscode-simple');
  return createVSCodeMock();
});

describe('FileManager', () => {
  let testWorkspaceDir: string;
  let originalWorkspaceFolders: any;

  beforeEach(() => {
    // Create a temporary test directory
    testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-tracker-test-'));
    
    // Mock workspace folders
    const vscode = require('vscode');
    originalWorkspaceFolders = vscode.workspace.workspaceFolders;
    vscode.workspace.workspaceFolders = [
      {
        uri: {
          fsPath: testWorkspaceDir,
        },
      },
    ];
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
    
    // Restore original workspace folders
    const vscode = require('vscode');
    vscode.workspace.workspaceFolders = originalWorkspaceFolders;
  });

  describe('getChatDirectory', () => {
    it('should return .cursor/chat directory in workspace', () => {
      const chatDir = getChatDirectory();
      
      expect(chatDir).toBe(path.join(testWorkspaceDir, '.cursor', 'chat'));
    });

    it('should handle workspace root correctly', () => {
      const chatDir = getChatDirectory();
      
      expect(chatDir).toContain('.cursor');
      expect(chatDir).toContain('chat');
    });
  });

  describe('ensureChatDirectory', () => {
    it('should create directory if it does not exist', () => {
      const chatDir = ensureChatDirectory();
      
      expect(fs.existsSync(chatDir)).toBe(true);
      expect(fs.statSync(chatDir).isDirectory()).toBe(true);
    });

    it('should not fail if directory already exists', () => {
      const chatDir1 = ensureChatDirectory();
      const chatDir2 = ensureChatDirectory();
      
      expect(chatDir1).toBe(chatDir2);
      expect(fs.existsSync(chatDir1)).toBe(true);
    });

    it('should create nested directories', () => {
      const chatDir = ensureChatDirectory();
      
      // Should create .cursor/chat even if .cursor doesn't exist
      expect(fs.existsSync(path.dirname(chatDir))).toBe(true);
      expect(fs.existsSync(chatDir)).toBe(true);
    });
  });

  describe('writeChatFile', () => {
    const createTestChat = (): ExportedChat => ({
      metadata: {
        chatId: 'test123',
        exportedAt: '2024-01-15T10:00:00Z',
        messageCount: 2,
      },
      messages: [
        {
          role: 'user',
          content: 'Test message',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          role: 'assistant',
          content: 'Test response',
          timestamp: '2024-01-15T10:00:05Z',
        },
      ],
    });

    it('should write markdown file successfully', () => {
      const chatData = createTestChat();
      const content = '# Test Chat\n\nContent here';
      const filePath = writeChatFile(chatData, 'test123', content, 'md');
      
      expect(fs.existsSync(filePath)).toBe(true);
      expect(filePath).toContain('chat-test123.md');
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should write json file successfully', () => {
      const chatData = createTestChat();
      const content = JSON.stringify(chatData, null, 2);
      const filePath = writeChatFile(chatData, 'test123', content, 'json');
      
      expect(fs.existsSync(filePath)).toBe(true);
      expect(filePath).toContain('chat-test123.json');
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(JSON.parse(fileContent)).toEqual(chatData);
    });

    it('should create directory before writing', () => {
      const chatData = createTestChat();
      const content = 'Test content';
      const filePath = writeChatFile(chatData, 'test123', content, 'md');
      
      // Directory should exist
      expect(fs.existsSync(path.dirname(filePath))).toBe(true);
      // File should exist
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should use correct filename format', () => {
      const chatData = createTestChat();
      const content = 'Test';
      const filePath = writeChatFile(chatData, 'abc12345', content, 'md');
      
      expect(path.basename(filePath)).toBe('chat-abc12345.md');
    });

    it('should handle special characters in content', () => {
      const chatData = createTestChat();
      const content = 'Test with special chars: !@#$%^&*()';
      const filePath = writeChatFile(chatData, 'test123', content, 'md');
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('!@#$%^&*()');
    });

    it('should handle unicode content', () => {
      const chatData = createTestChat();
      const content = 'Test with unicode: 你好 🌟';
      const filePath = writeChatFile(chatData, 'test123', content, 'md');
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('你好');
      expect(fileContent).toContain('🌟');
    });
  });

  describe('getDisplayPath', () => {
    it('should return relative path when in workspace', () => {
      const absolutePath = path.join(testWorkspaceDir, '.cursor', 'chat', 'test.md');
      const displayPath = getDisplayPath(absolutePath);
      
      expect(displayPath).toBe(path.join('.cursor', 'chat', 'test.md'));
      expect(displayPath).not.toContain(testWorkspaceDir);
    });

    it('should return absolute path when outside workspace', () => {
      const outsidePath = path.join(os.tmpdir(), 'outside.md');
      const displayPath = getDisplayPath(outsidePath);
      
      expect(displayPath).toBe(outsidePath);
    });

    it('should handle paths with spaces', () => {
      const pathWithSpaces = path.join(testWorkspaceDir, '.cursor', 'chat', 'test file.md');
      const displayPath = getDisplayPath(pathWithSpaces);
      
      expect(displayPath).toContain('test file.md');
    });
  });
});

