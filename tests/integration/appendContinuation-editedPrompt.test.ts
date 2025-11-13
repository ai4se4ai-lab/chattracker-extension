import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  writeChatFile, 
  findMostRecentChatFile, 
  readExistingChatFile, 
  isContinuation,
  isEditedPrompt,
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

describe('Append Continuation - Edited Initial Prompt Scenario', () => {
  let testWorkspaceDir: string;

  beforeEach(() => {
    testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-tracker-edited-test-'));
    
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

  describe('Edited Initial Prompt Scenario', () => {
    it('should handle: prompt1→response1→export → user edits prompt1 to prompt2 → cursor retrieves all → export (should update with latest)', () => {
      const chatDir = getChatDirectory();
      
      // Step 1: prompt1 + response1 → export
      const chat1: ExportedChat = {
        metadata: {
          chatId: 'edited-1',
          exportedAt: new Date().toISOString(),
          messageCount: 2,
        },
        messages: [
          { role: 'user', content: 'prompt1', timestamp: '2024-01-15T10:00:00Z' },
          { role: 'assistant', content: 'response1', timestamp: '2024-01-15T10:00:05Z' },
        ],
      };

      const markdown1 = formatAsMarkdown(chat1);
      const filePath1 = writeChatFile(chat1, 'edited-1', markdown1, 'md');
      
      // Verify file created
      expect(fs.existsSync(filePath1)).toBe(true);
      const content1 = fs.readFileSync(filePath1, 'utf-8');
      expect(content1).toContain('prompt1');
      expect(content1).toContain('response1');
      
      // Verify only 1 file exists
      let files = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
      expect(files.length).toBe(1);

      // Step 2: User edits prompt1 to prompt2, cursor retrieves all → export
      // The new export has prompt2 (edited) instead of prompt1, but same response1
      const chat2: ExportedChat = {
        metadata: {
          chatId: 'edited-2',
          exportedAt: new Date().toISOString(),
          messageCount: 2,
        },
        messages: [
          { role: 'user', content: 'prompt2', timestamp: '2024-01-15T10:00:00Z' }, // EDITED: prompt1 → prompt2
          { role: 'assistant', content: 'response1', timestamp: '2024-01-15T10:00:05Z' }, // Same response
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
        // This should be detected as a continuation (same conversation, just edited first prompt)
        // We need to check if messages match from index 1 onwards (allowing first message to differ)
        const isCont = isContinuation(existingChat.messages, chat2.messages);
        
        // If continuation detected, we should replace/update the file with latest version
        // If not detected, we need special handling for edited prompts
        if (isCont) {
          // Standard continuation - append new messages
          const existingCount = existingChat.messages.length;
          const newMessages = chat2.messages.slice(existingCount);
          if (newMessages.length > 0) {
            appendToChatFile(mostRecentFile, newMessages, 'md');
          }
        } else if (isEditedPrompt(existingChat.messages, chat2.messages)) {
          // Check if it's an edited prompt scenario (first message differs, but rest matches)
          // Replace the file with the updated version (includes edited prompt)
          const markdown2 = formatAsMarkdown(chat2);
          fs.writeFileSync(mostRecentFile, markdown2, 'utf-8');
        } else {
          // Different conversation - create new file
          const markdown2 = formatAsMarkdown(chat2);
          writeChatFile(chat2, 'edited-2', markdown2, 'md');
        }
        
        // Verify still only 1 file exists (should update, not create new)
        files = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
        expect(files.length).toBe(1);
        
        // Verify final content includes the LATEST version (prompt2, not prompt1)
        const finalContent = fs.readFileSync(mostRecentFile, 'utf-8');
        expect(finalContent).toContain('prompt2'); // Should have the edited prompt
        expect(finalContent).toContain('response1'); // Should still have the response
        // Check that the old prompt "prompt1" is not present as a standalone message
        const userPromptPattern = /\*\*User\*\*\s*[\r\n]+\s*prompt1\s*[\r\n]/;
        expect(finalContent).not.toMatch(userPromptPattern); // Should NOT have the old prompt
      }
    });

    it('should handle edited prompt with multiple messages', () => {
      const chatDir = getChatDirectory();
      
      // Step 1: prompt1 + response1 + prompt2 + response2 → export
      const chat1: ExportedChat = {
        metadata: {
          chatId: 'edited-multi-1',
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

      const filePath1 = writeChatFile(chat1, 'edited-multi-1', formatAsMarkdown(chat1), 'md');
      
      // Step 2: User edits prompt1 to prompt1-edited, cursor retrieves all
      const chat2: ExportedChat = {
        metadata: {
          chatId: 'edited-multi-2',
          exportedAt: new Date().toISOString(),
          messageCount: 4,
        },
        messages: [
          { role: 'user', content: 'prompt1-edited', timestamp: '2024-01-15T10:00:00Z' }, // EDITED
          { role: 'assistant', content: 'response1', timestamp: '2024-01-15T10:00:05Z' },
          { role: 'user', content: 'prompt2', timestamp: '2024-01-15T10:01:00Z' },
          { role: 'assistant', content: 'response2', timestamp: '2024-01-15T10:01:05Z' },
        ],
      };

      const mostRecentFile = findMostRecentChatFile();
      expect(mostRecentFile).toBe(filePath1);
      
      if (mostRecentFile) {
        const existingChat = readExistingChatFile(mostRecentFile);
        
        if (existingChat) {
          const isCont = isContinuation(existingChat.messages, chat2.messages);
          const isEdited = isEditedPrompt(existingChat.messages, chat2.messages);
          
          if (isCont) {
            // Standard continuation
            const newMessages = chat2.messages.slice(existingChat.messages.length);
            if (newMessages.length > 0) {
              appendToChatFile(mostRecentFile, newMessages, 'md');
            }
          } else if (isEdited) {
            // Edited prompt - replace with latest
            const markdown2 = formatAsMarkdown(chat2);
            fs.writeFileSync(mostRecentFile, markdown2, 'utf-8');
          } else {
            // New conversation
            writeChatFile(chat2, 'edited-multi-2', formatAsMarkdown(chat2), 'md');
          }
          
          // Verify only 1 file
          const files = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
          expect(files.length).toBe(1);
          
          // Verify latest content
          const finalContent = fs.readFileSync(mostRecentFile, 'utf-8');
          expect(finalContent).toContain('prompt1-edited');
          expect(finalContent).toContain('response1');
          expect(finalContent).toContain('prompt2');
          expect(finalContent).toContain('response2');
          // Check that the old prompt "prompt1" (not "prompt1-edited") is not present as a standalone message
          // We check for the pattern **User**\n\nprompt1\n\n to ensure it's the actual message, not part of "prompt1-edited"
          const userPromptPattern = /\*\*User\*\*\s*[\r\n]+\s*prompt1\s*[\r\n]/;
          expect(finalContent).not.toMatch(userPromptPattern); // Old prompt should be gone
        }
      }
    });

    it('should handle edited prompt with additional new messages', () => {
      const chatDir = getChatDirectory();
      
      // Step 1: prompt1 + response1 → export
      const chat1: ExportedChat = {
        metadata: {
          chatId: 'edited-new-1',
          exportedAt: new Date().toISOString(),
          messageCount: 2,
        },
        messages: [
          { role: 'user', content: 'prompt1', timestamp: '2024-01-15T10:00:00Z' },
          { role: 'assistant', content: 'response1', timestamp: '2024-01-15T10:00:05Z' },
        ],
      };

      const filePath1 = writeChatFile(chat1, 'edited-new-1', formatAsMarkdown(chat1), 'md');
      
      // Step 2: User edits prompt1 to prompt2, adds prompt3 + response3
      const chat2: ExportedChat = {
        metadata: {
          chatId: 'edited-new-2',
          exportedAt: new Date().toISOString(),
          messageCount: 4,
        },
        messages: [
          { role: 'user', content: 'prompt2', timestamp: '2024-01-15T10:00:00Z' }, // EDITED
          { role: 'assistant', content: 'response1', timestamp: '2024-01-15T10:00:05Z' },
          { role: 'user', content: 'prompt3', timestamp: '2024-01-15T10:02:00Z' }, // NEW
          { role: 'assistant', content: 'response3', timestamp: '2024-01-15T10:02:05Z' }, // NEW
        ],
      };

      const mostRecentFile = findMostRecentChatFile();
      
      if (mostRecentFile) {
        const existingChat = readExistingChatFile(mostRecentFile);
        
        if (existingChat) {
          const isCont = isContinuation(existingChat.messages, chat2.messages);
          const isEdited = isEditedPrompt(existingChat.messages, chat2.messages);
          
          if (isCont) {
            const newMessages = chat2.messages.slice(existingChat.messages.length);
            if (newMessages.length > 0) {
              appendToChatFile(mostRecentFile, newMessages, 'md');
            }
          } else if (isEdited) {
            // Edited prompt with new messages - replace with latest version
            const markdown2 = formatAsMarkdown(chat2);
            fs.writeFileSync(mostRecentFile, markdown2, 'utf-8');
          } else {
            writeChatFile(chat2, 'edited-new-2', formatAsMarkdown(chat2), 'md');
          }
          
          // Verify only 1 file
          const files = fs.readdirSync(chatDir).filter(f => f.startsWith('chat-') && f.endsWith('.md'));
          expect(files.length).toBe(1);
          
          // Verify latest content
          const finalContent = fs.readFileSync(mostRecentFile, 'utf-8');
          expect(finalContent).toContain('prompt2'); // Edited prompt
          expect(finalContent).toContain('response1');
          expect(finalContent).toContain('prompt3'); // New messages
          expect(finalContent).toContain('response3');
          // Check that the old prompt "prompt1" is not present as a standalone message
          const userPromptPattern = /\*\*User\*\*\s*[\r\n]+\s*prompt1\s*[\r\n]/;
          expect(finalContent).not.toMatch(userPromptPattern); // Old prompt gone
        }
      }
    });
  });
});

