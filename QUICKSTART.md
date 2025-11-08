# Quick Start Guide

## Setup (5 minutes)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the extension:**
   ```bash
   npm run compile
   ```

3. **Create config file** (`.cursor-chat-tracker.json` in workspace root):
   ```json
   {
     "CURSOR_CONNECTION_CODE": "your-code-here",
     "EASYITI_API_URL": "https://your-api.com/endpoint"
   }
   ```

4. **Run extension:**
   - Press `F5` in VS Code/Cursor
   - A new window opens with the extension active

## Usage

### Export Chat Data

**Method 1: Right-click on chat tab**
- Right-click on any chat tab
- Select "Export Chat to Backend"

**Method 2: Command Palette**
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Type "Export Chat to Backend"
- Press Enter

### Track Messages Manually

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type "Add User Message"
3. Enter your message
4. The message is tracked and will be included in exports

## What Gets Captured

- ✅ User messages (manually added or from selection)
- ✅ AI responses (detected from code changes)
- ✅ Code changes (significant edits are captured)
- ✅ Timestamps for all interactions
- ✅ Workspace context

## Data Format Sent to Backend

```json
{
  "connectionCode": "your-code",
  "chatData": {
    "chatId": "unique-id",
    "messages": [
      {
        "role": "user",
        "content": "Your prompt",
        "timestamp": "2024-01-01T12:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "AI response",
        "timestamp": "2024-01-01T12:00:01.000Z"
      }
    ],
    "metadata": {
      "workspaceFolder": "project-name",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "extensionVersion": "0.0.1"
    }
  }
}
```

## Troubleshooting

**No data to export?**
- Add messages manually using "Add User Message"
- Make code changes (they'll be auto-captured)
- Select text and try exporting

**Config error?**
- Check `.cursor-chat-tracker.json` exists
- Verify JSON is valid
- Ensure both fields are filled

**Backend error?**
- Check "Cursor Chat Tracker" output channel
- Verify API URL is correct
- Test connection code

## Next Steps

- Read [README.md](README.md) for full documentation
- See [INSTALLATION.md](INSTALLATION.md) for detailed setup

