# Automated Chat Export - How It Works

The Cursor Chat Tracker extension is designed to **automatically** extract and export your chat conversations without manual intervention.

## 🚀 What Happens When You Press `Ctrl+Shift+Space`

The extension executes these steps automatically:

### 1. **Focus Chat Panel** 🎯
```
Tries multiple commands to focus the Cursor chat interface:
- aichat.panel.toggle
- workbench.action.chat.open
- cursor.openChat
- And more...
```

### 2. **Select All Content** 📝
```
Executes: editor.action.selectAll
Selects all text in the focused panel
```

### 3. **Copy to Clipboard** 📋
```
Executes: editor.action.clipboardCopyAction
Copies selected content to clipboard
```

### 4. **Extract & Parse** 🔍
```
Reads clipboard content
Parses messages (user/assistant)
Extracts metadata (timestamps, tokens)
```

### 5. **Save to File** 💾
```
Creates .cursor/chat/ directory
Generates unique hash for filename
Writes JSON file
Shows success notification
```

## 🎬 Usage

### Simple Workflow
```
You → Press Ctrl+Shift+Space
Extension → Does everything automatically
You → Get notification with exported file
```

### That's it! No manual steps required.

## 🔧 Technical Details

### Multi-Strategy Extraction

The extension tries 3 strategies in order:

1. **Strategy 1: Built-in Export**
   - Looks for Cursor's native export commands
   - `workbench.action.chat.export`
   - `cursor.chat.export`
   - `aichat.exportConversation`

2. **Strategy 2: WebView Access**
   - Attempts to access chat through WebView APIs
   - Limited by VS Code security model

3. **Strategy 3: Automatic Copy** ⭐ (Primary Method)
   - **Focuses chat panel** using various commands
   - **Selects all** content automatically
   - **Copies** to clipboard programmatically
   - **Extracts** from clipboard

### Command Execution Flow

```typescript
// Focus chat
executeCommand('aichat.panel.toggle')
wait 300ms

// Select all
executeCommand('editor.action.selectAll')
wait 100ms

// Copy
executeCommand('editor.action.clipboardCopyAction')
wait 200ms

// Extract from clipboard
readClipboard()
parseContent()
saveToFile()
```

## 🐛 Debugging

### Enable Console Logging

1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Press `Ctrl+Shift+Space`
4. Watch the logs:

```
[Chat Tracker] Export command triggered
[Chat Tracker] Starting chat extraction...
[Chat Tracker] Trying Strategy 1: Built-in export
[Chat Tracker] Strategy 1 failed: No built-in export command found
[Chat Tracker] Trying Strategy 2: WebView extraction
[Chat Tracker] Strategy 2 failed: WebView extraction not available
[Chat Tracker] Trying Strategy 3: Editor/Clipboard extraction
[Chat Tracker] Attempting automatic chat extraction...
[Chat Tracker] Trying to focus chat panel...
[Chat Tracker] Successfully executed: aichat.panel.toggle
[Chat Tracker] Attempting to select all content...
[Chat Tracker] Attempting to copy to clipboard...
[Chat Tracker] Clipboard content length: 1523
[Chat Tracker] Successfully copied new content from chat
[Chat Tracker] Parsed 8 messages from clipboard
[Chat Tracker] Strategy 3 succeeded
```

## ⚙️ Configuration

### Timing Adjustments

The extension uses delays to ensure commands complete:
- **Focus delay**: 300ms (after focusing chat)
- **Select delay**: 100ms (after selecting all)
- **Copy delay**: 200ms (after copying)
- **Clipboard delay**: 200ms (before reading clipboard)

These can be adjusted in `src/chatExtractor.ts` if needed.

## 🔄 Fallback Behavior

If automatic extraction fails:

1. **Retry Button**: Shows "Try Again" button in notification
2. **Manual Instructions**: Shows "Manual Steps" with copy instructions
3. **Clipboard Fallback**: Can still export manually copied content

## 💡 Tips for Best Results

### For Automatic Export:
1. **Ensure chat panel is visible** before pressing shortcut
2. **Wait for chat to load** completely
3. **Don't switch focus** immediately after pressing shortcut

### If Automatic Fails:
1. **Click in chat panel** to ensure it's focused
2. **Try pressing shortcut again** - it often works on second try
3. **Manual fallback**: `Ctrl+A` → `Ctrl+C` → `Ctrl+Shift+Space`

## 🎯 Success Indicators

You'll know it worked when you see:

✅ **Notification**: "Successfully exported X messages to .cursor/chat/..."
✅ **File created**: Check `.cursor/chat/` directory
✅ **Console logs**: Show "Strategy 3 succeeded"
✅ **Options**: "Open File" and "Open Folder" buttons

## 🚧 Known Limitations

1. **Cursor's API**: No official API for chat access
2. **Timing sensitive**: May need retry on slower systems
3. **Focus required**: Chat must be accessible to focus
4. **Platform differences**: Commands may vary between OS

## 🔮 Future Improvements

- [ ] Detect chat panel state before attempting export
- [ ] Adjust timing dynamically based on system performance
- [ ] Support for multiple concurrent chats
- [ ] Real-time export on chat close
- [ ] Direct DOM access when API becomes available

---

**The goal is simple: Press one key, get your chat exported. No manual steps!** 🎉

