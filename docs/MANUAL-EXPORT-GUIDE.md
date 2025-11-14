# Manual Export Guide for Cursor Chat Tracker

Since Cursor doesn't expose a direct API for accessing chat content, you need to manually copy the chat text first.

## 🚀 Quick Steps

1. **In Cursor chat**: `Ctrl+A` (select all) → `Ctrl+C` (copy)
2. **Press** `Ctrl+Shift+Space`
3. **Done!** Check `.cursor/chat/` for your exported JSON

## Step-by-Step Instructions

### Method 1: Copy Chat to Clipboard (Recommended)

1. **Open your Cursor chat panel** (where you have your conversation with the AI)

2. **Select all the chat text**:
   - Click inside the chat panel
   - Press `Ctrl+A` (Windows/Linux) or `Cmd+A` (Mac) to select all
   
3. **Copy the text**:
   - Press `Ctrl+C` (Windows/Linux) or `Cmd+C` (Mac)

4. **Export the chat**:
   - Press `Ctrl+Shift+Space` (Windows/Linux) or `Cmd+Shift+Space` (Mac)
   - Or use Command Palette: `Ctrl+Shift+P` → Type "Export Chat Messages"

5. **Check for notification**:
   - You should see a success notification with the file path
   - The chat will be saved to `.cursor/chat/chat-{hash}.json`

### Method 2: Select Text in Editor

1. **Copy your chat** to a text editor or new file in Cursor

2. **Select the chat text** you want to export

3. **Press `Ctrl+Shift+Space`** while the text is selected

4. The extension will export the selected text

## What to Expect

### Success ✅
- Notification: "Successfully exported X messages to .cursor/chat/chat-abc123.json"
- Options to "Open File" or "Open Folder"
- File created in `.cursor/chat/` directory

### Need to Copy First ⚠️
- Notification: "No chat messages found. Please manually select the chat text..."
- This means you need to copy the chat text first (see steps above)

## Checking the Debug Output

To see what's happening behind the scenes:

1. Press `F12` or `Ctrl+Shift+I` to open Developer Tools
2. Go to the **Console** tab
3. Look for messages starting with `[Chat Tracker]`
4. Try the export again and watch the console

You should see:
```
[Chat Tracker] Export command triggered
[Chat Tracker] Starting chat extraction...
[Chat Tracker] Trying Strategy 1: Built-in export
[Chat Tracker] Strategy 1 failed: No built-in export command found
[Chat Tracker] Trying Strategy 2: WebView extraction
[Chat Tracker] Strategy 2 failed: WebView extraction not available
[Chat Tracker] Trying Strategy 3: Editor/Clipboard extraction
[Chat Tracker] Strategy 3 succeeded
```

## Troubleshooting

### "Nothing happens when I press Ctrl+Shift+Space"

1. **Check if the extension is loaded:**
   - Open Console (F12)
   - Look for "Cursor Chat Tracker extension is now active"

2. **Test the command manually:**
   - Press `Ctrl+Shift+P` (Command Palette)
   - Type "Export Chat Messages"
   - See if it appears and click it

3. **Check for keyboard shortcut conflicts:**
   - File → Preferences → Keyboard Shortcuts
   - Search for "Ctrl+Shift+Space"
   - Make sure only your extension is using it

4. **Check the console for errors:**
   - Press F12 → Console tab
   - Press `Ctrl+Shift+Space` again
   - Look for `[Chat Tracker] Export command triggered`
   - If you don't see this message, the command isn't being triggered

### "No .cursor/chat directory"

- The directory is only created when an export succeeds
- Make sure you've copied the chat text to clipboard first
- Check the error notification for details

### "No chat messages found"

This is the most common issue. To fix it:

1. **Go to your chat in Cursor**
2. **Click inside the chat panel**
3. **Press `Ctrl+A`** to select all
4. **Press `Ctrl+C`** to copy
5. **Press `Ctrl+Shift+Space`** to export
6. You should see a success message!

### "Extension not found"

Reload Cursor:
- Press `Ctrl+Shift+P`
- Type "Developer: Reload Window"
- Try the export again

## Testing if Extension Works

Quick test:

1. Copy this text to clipboard:
```
You: Hello, how are you?