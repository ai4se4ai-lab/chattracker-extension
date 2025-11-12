# Quick Start Guide

Get your Cursor Chat Tracker extension up and running in 5 minutes!

## 🚀 Installation (3 commands)

```bash
npm install
npm run compile
npm run package
```

This creates a `.vsix` file in your project directory.

## 📦 Install in Cursor

1. Open Cursor IDE
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) to open Extensions
3. Click `...` menu → **"Install from VSIX..."**
4. Select `cursor-chat-tracker-1.0.0.vsix`
5. Click **Install**
6. Reload Cursor

## 🎯 Usage

### Export a Chat - Fully Automated! 🚀
1. **Have a chat conversation open in Cursor**
2. **Press `Ctrl+Shift+Space`** (or `Cmd+Shift+Space` on Mac)
3. **Done!** The extension automatically:
   - Focuses your chat panel
   - Selects all content  
   - Copies it
   - Exports to `.cursor/chat/chat-{hash}.json`

**No manual copying needed!** Just press one shortcut.

### View Exported Chats
- Check the `.cursor/chat/` folder in your workspace
- Or click "Open File" when the success notification appears

## 📁 Output Example

Your exported chat will look like this:

```json
{
  "metadata": {
    "chatId": "a3f5b2c",
    "exportedAt": "2025-11-12T10:30:00Z",
    "messageCount": 4
  },
  "messages": [
    {
      "role": "user",
      "content": "How do I create a React component?",
      "timestamp": "2025-11-12T10:25:00Z"
    },
    {
      "role": "assistant",
      "content": "Here's how to create a React component...",
      "timestamp": "2025-11-12T10:25:05Z"
    }
  ]
}
```

## ⚡ Troubleshooting

### "No chat messages found"
- Make sure you have an active chat
- Try selecting the chat text manually
- Copy the chat text, then press the shortcut

### "No workspace open"
- Open a folder in Cursor first
- Or the extension will use your home directory

### Extension not working?
- Check Extensions view - is it installed?
- Press `F1` → type "Export Chat Messages"
- Check if the command appears

## 🔧 Development Mode

Want to test without packaging?

1. Open project in Cursor
2. Press `F5` (Start Debugging)
3. Test in the new window that opens
4. Make changes and press `Ctrl+R` to reload

## 📚 More Info

- Full documentation: [README.md](README.md)
- Installation details: [INSTALLATION.md](INSTALLATION.md)
- Development guide: [DEVELOPMENT.md](DEVELOPMENT.md)
- Project overview: [PROJECT-SUMMARY.md](PROJECT-SUMMARY.md)

## 🎉 You're Ready!

Start exporting your chats with `Ctrl+Shift+Space`!

Need help? Check the [README](README.md) or open an issue.

