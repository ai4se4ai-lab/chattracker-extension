# Cursor Chat Tracker Extension

A VS Code extension (compatible with Cursor) that captures user prompts and AI responses from chat tabs and submits them to a backend API.

## Features

- 📝 Captures user prompts and AI responses from chat interactions
- 🔄 Monitors code changes that may be AI-generated
- 📤 Exports chat data to backend API via JSON configuration
- 🖱️ Right-click context menu support for easy export
- ⏱️ Timestamps for all messages
- 📋 Fallback capture from text selection or clipboard

## Installation

1. Clone or download this extension
2. Open the extension folder in VS Code/Cursor
3. Run `npm install` to install dependencies
4. Press `F5` to run the extension in a new Extension Development Host window

## Configuration

### Option 1: JSON Configuration File (Recommended)

Create a `.cursor-chat-tracker.json` file in your workspace root:

```json
{
  "CURSOR_CONNECTION_CODE": "your-connection-code-here",
  "EASYITI_API_URL": "https://your-backend-api.com/api/chat"
}
```

### Option 2: VS Code Settings

You can also configure via VS Code settings:

1. Open Settings (Ctrl+, or Cmd+,)
2. Search for "Cursor Chat Tracker"
3. Configure:
   - `cursorChatTracker.configPath`: Path to your JSON config file
   - `cursorChatTracker.backendUrl`: Backend API URL (overrides config file)
   - `cursorChatTracker.connectionCode`: Connection code (overrides config file)

## Usage

### Export Chat Data

1. **Right-click on a chat tab** and select "Export Chat to Backend"
2. Or use the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):
   - Type "Export Chat to Backend"
   - Select the command

### Manual Message Tracking

You can manually add messages to track:

1. Open Command Palette
2. Type "Add User Message"
3. Enter the message content

### Automatic Capture

The extension automatically:
- Tracks significant code changes (likely AI-generated)
- Monitors document changes
- Captures context from active editors

## Data Format

The extension submits data in the following JSON format:

```json
{
  "connectionCode": "your-connection-code",
  "chatData": {
    "chatId": "chat-1234567890-abc123",
    "title": "Optional chat title",
    "messages": [
      {
        "role": "user",
        "content": "User prompt text",
        "timestamp": "2024-01-01T12:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "AI response text",
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

## Backend API Requirements

Your backend API should:

- Accept POST requests to the configured URL
- Accept JSON payloads with the structure above
- Handle the `X-Connection-Code` header for authentication
- Return appropriate HTTP status codes (200 for success)

## Development

### Building

```bash
npm install
npm run compile
```

### Watching for Changes

```bash
npm run watch
```

### Packaging

```bash
npm install -g vsce
vsce package
```

## Limitations

⚠️ **Note**: Since Cursor's chat interface may use internal APIs not fully exposed to VS Code extensions, this extension uses a best-effort approach:

- **Code Change Monitoring**: Automatically captures significant code changes
- **Manual Tracking**: Allows manual addition of messages
- **Selection Capture**: Can capture from text selection or clipboard as fallback
- **Future Enhancement**: May require Cursor-specific APIs for full chat history access

For best results, manually track important prompts and responses, or use the code change monitoring feature.

## Troubleshooting

### No chat data found

- Ensure you've added messages manually or that code changes are being detected
- Check the "Cursor Chat Tracker" output channel for logs
- Try using the "Add User Message" command to test

### Configuration errors

- Verify your JSON config file is valid
- Check that both `CURSOR_CONNECTION_CODE` and `EASYITI_API_URL` are set
- Ensure the config file path is correct in settings

### Backend submission fails

- Check the output channel for detailed error messages
- Verify your backend URL is accessible
- Ensure your connection code is valid
- Check network connectivity

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

