# Cursor Chat Tracker

A VS Code/Cursor extension that automatically exports chat messages to beautiful Markdown files when you press `Ctrl+Shift+Space` (or `Cmd+Shift+Space` on Mac).

## Features

- **⚡ Super Fast**: Copy chat → Press shortcut → Done! (2 seconds!)
- **🎯 Smart Detection**: Detects chat content from clipboard and parses it perfectly
- **📁 Organized Storage**: Saves chat exports to `.cursor/chat/` directory
- **📝 Markdown Format**: Beautiful, readable Markdown files with syntax highlighting
- **🔖 Smart Naming**: Files are named using unique hashes (e.g., `chat-a3f5b2c.md`)
- **💡 Guided Workflow**: Helpful messages guide you through the export process
- **✅ Complete Messages**: Captures full multi-line messages with code blocks
- **🔄 Retry Button**: Easy retry after copying chat

## Installation

### From Source

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Package the extension:
   ```bash
   npm run package
   ```
5. Install the generated `.vsix` file in Cursor:
   - Open Cursor
   - Go to Extensions view (Ctrl+Shift+X)
   - Click the `...` menu → "Install from VSIX..."
   - Select the generated `.vsix` file

### Quick Install

```bash
npm install
npm run compile
npm run package
```

Then install the `.vsix` file in Cursor.

## Usage

### 🚀 Super Easy - Just 2 Steps!

1. **Press `Ctrl+Shift+Space`** (or `Cmd+Shift+Space` on Mac)
2. **Click "Export"** in the dialog (or just press Enter)

**That's it!** ✨ The extension automatically:
- Watches for the exported file
- Moves it to `.cursor/chat/`
- Renames it with a unique hash (`chat-abc123.md`)
- Cleans up the Downloads folder
- Shows you a success notification!

### How It Works Behind the Scenes

When you press the shortcut:
1. ⚡ Extension triggers Cursor's native export command
2. 💬 Export dialog appears (Downloads is the default location)
3. 👆 You click "Export" (or just press Enter - takes 1 second!)
4. 👀 Extension detects the new file in Downloads
5. 📂 Extension automatically moves it to `.cursor/chat/` with unique name
6. 🧹 Original Downloads file is cleaned up
7. ✅ Success notification with file path!

**Result**: All your chats organized in `.cursor/chat/` automatically! 🎉

### Why This Approach?

Cursor's `composer.exportChatAsMd` command opens a save dialog that **cannot be suppressed**. Our solution:

✅ **Triggers the export for you** - no need to find the button  
✅ **Auto-organizes** - moves file to `.cursor/chat/`  
✅ **Unique filenames** - `chat-{hash}.md` (no overwrites)  
✅ **Cleans up** - removes temporary Downloads file  
✅ **One shortcut** - everything else is automatic!  

**You just press Enter when the dialog appears - the extension does the rest!**

## Export Format

Exported files are beautiful Markdown documents:

```markdown
# Chat Export

## Metadata

- **Chat ID**: a3f5b2c
- **Exported**: 11/12/2025, 10:30:00 AM
- **Messages**: 5
- **Model**: gpt-4
- **Total Tokens**: 1250

---

## Conversation

### 👤 User

Hello, can you help me?

<details>
<summary>Message Details</summary>

**Timestamp**: 11/12/2025, 10:25:00 AM
**Tokens**: 50
</details>

---

### 🤖 Assistant

Of course! What can I help you with?

<details>
<summary>Message Details</summary>

**Timestamp**: 11/12/2025, 10:25:05 AM
**Tokens**: 45
</details>

---

*Exported with Cursor Chat Tracker*
```

The Markdown format is:
- ✅ **Readable** - Easy to read in any text editor or Markdown viewer
- ✅ **Formatted** - Code blocks, lists, and formatting preserved
- ✅ **Searchable** - Plain text, easy to search
- ✅ **Portable** - Works everywhere Markdown works

## File Locations

- **With Workspace**: `.cursor/chat/` in your workspace root
- **Without Workspace**: `.cursor/chat/` in your home directory

## Development

### Build

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Package

```bash
npm run package
```

## Troubleshooting

### "No chat messages found"
- Ensure you have an active chat conversation
- Try selecting the chat text manually before exporting

### "No workspace open"
- Open a folder or workspace in Cursor
- Or the extension will use your home directory

### "Failed to access chat interface"
- The extension uses multiple strategies to access chat content
- Try copying the chat content and running the export command

## Technical Details

The extension attempts multiple strategies to extract chat content:

1. **Built-in Commands**: Checks for Cursor's native export commands
2. **WebView Access**: Attempts to access chat through WebView APIs
3. **Text Extraction**: Falls back to parsing selected text or clipboard content

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
