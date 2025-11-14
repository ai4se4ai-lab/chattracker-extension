# Changelog

All notable changes to the "cursor-chat-tracker" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-12

### Added
- Initial release of Cursor Chat Tracker extension
- Keyboard shortcut `Ctrl+Shift+Space` (Windows/Linux) or `Cmd+Shift+Space` (Mac) to export chats
- **Fully automated export** - automatically focuses chat, selects all, and copies
- Automatic export of chat messages to `.cursor/chat/` directory
- **Beautiful Markdown format** with syntax highlighting and formatting
- Metadata preserved (timestamps, model info, token counts)
- Smart file naming using content-based hashes (e.g., `chat-a3f5b2c.md`)
- Multiple extraction strategies for accessing chat content:
  - Built-in command detection
  - WebView access (where available)
  - Text parsing from selection or clipboard
- User notifications with success/error messages
- Options to open exported file or folder after export
- Support for both workspace and home directory storage
- Comprehensive error handling and user guidance

### Features
- **Markdown Format**: Beautiful, readable Markdown files
  - Code blocks preserved with syntax highlighting
  - User (👤) and Assistant (🤖) clearly marked
  - Collapsible metadata sections
  - Works in GitHub, Obsidian, Notion, etc.
- **Automated Extraction**: No manual copying needed
  - Automatically focuses chat panel
  - Selects all content programmatically
  - Copies to clipboard
  - Parses complete multi-line messages
- **Complete Message Capture**: Full content, not fragments
- **Token Tracking**: Records token counts when available
- **Model Information**: Captures model used for conversation
- **Message Count**: Tracks total messages in conversation
- **Export Timestamp**: Records when chat was exported
- **Progress Indicators**: Shows progress during export operation

### Technical Details
- Built with TypeScript
- VS Code Extension API
- Crypto-based hash generation for unique IDs
- Recursive directory creation
- JSON formatted output with 2-space indentation

