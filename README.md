# TrackChat - Cursor Extension

A Cursor extension that tracks and summarizes chat conversations, automatically capturing user prompts, AI responses, actions performed, and modified files. The extension sends this information to a configurable backend API.

## Features

- 📝 **Chat Content Tracking**: Automatically tracks chat interactions and file modifications
- 📊 **Smart Summarization**: Creates comprehensive summaries including:
  - User prompt objectives
  - AI response summaries
  - Main actions performed (bullet points)
  - List of modified files
  - Task status (completed, in-progress, failed)
- 🔌 **Backend Integration**: Sends summaries to your backend API
- 🎨 **User-Friendly UI**: Simple and intuitive interface to view and manage chat summaries
- ⚙️ **Configurable**: Easy JSON-based configuration

## Installation

1. Clone or download this extension
2. Open the extension folder in VS Code/Cursor
3. Run `npm install` to install dependencies
4. Run `npm run compile` to build the extension
5. Press `F5` to open a new window with the extension loaded

## Configuration

1. The extension will create a `config.json` file in the extension directory on first run
2. Edit `config.json` with your settings:

```json
{
  "CURSOR_CONNECTION_CODE": "your-connection-code-here",
  "EASYITI_API_URL": "https://your-api-endpoint.com/api/chat-summary",
  "autoSend": false,
  "autoTrack": true
}
```

### Configuration Options

- `CURSOR_CONNECTION_CODE`: Your connection code for the backend API
- `EASYITI_API_URL`: The full URL of your backend API endpoint
- `autoSend`: Automatically send summaries when chat ends (default: false)
- `autoTrack`: Automatically track file changes (default: true)

## Usage

### Commands

Access commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- **TrackChat: Show Chat Summary** - Opens the summary panel
- **TrackChat: Send Summary to API** - Sends current summary to backend
- **TrackChat: Open Configuration** - Opens config.json for editing
- **TrackChat: Capture Chat Manually** - Manually capture a chat interaction
- **TrackChat: Capture Chat from Selection** - Capture chat from selected text
- **TrackChat: Capture Chat from File** - Import chat from a file
- **TrackChat: Finalize Current Chat** - Mark current chat as complete

### Workflow

1. **Start a Chat**: Use the "Capture Chat Manually" command or select text and use "Capture Chat from Selection"
2. **Work on Tasks**: The extension automatically tracks file modifications
3. **View Summary**: Use "Show Chat Summary" to see the current summary
4. **Finalize**: Use "Finalize Current Chat" when done
5. **Send to API**: Use "Send Summary to API" to send the summary to your backend

## API Integration

The extension sends data to your backend API in the following format:

```json
{
  "connectionCode": "your-connection-code",
  "summary": {
    "id": "chat_1234567890_abc123",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "userPrompt": "Create a new feature",
    "userObjectives": [
      "Implement user authentication",
      "Add database schema"
    ],
    "aiResponseSummary": "Created authentication system with JWT tokens...",
    "mainActions": [
      "Created auth.ts file",
      "Updated database schema",
      "Added login endpoint"
    ],
    "modifiedFiles": [
      "src/auth.ts",
      "src/db/schema.ts",
      "src/api/login.ts"
    ],
    "taskStatus": "completed"
  }
}
```

### Expected API Response

Your API should return a standard HTTP response (200 OK for success). The extension will show error messages if the API call fails.

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

### Testing

```bash
npm test
```

## Project Structure

```
trackchat/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── chatTracker.ts        # Core chat tracking logic
│   ├── chatCapture.ts        # Chat content capture methods
│   ├── configManager.ts      # Configuration management
│   ├── apiClient.ts          # Backend API client
│   ├── summaryPanel.ts       # UI panel for displaying summaries
│   └── types.ts              # TypeScript type definitions
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
├── config.json.template      # Configuration template
└── README.md                 # This file
```

## Troubleshooting

### Extension Not Activating

- Check that all dependencies are installed: `npm install`
- Verify the extension compiled: `npm run compile`
- Check the Output panel for error messages

### API Connection Issues

- Verify `CURSOR_CONNECTION_CODE` and `EASYITI_API_URL` are set correctly
- Check that your API endpoint is accessible
- Review error messages in the notification popup

### Chat Not Being Captured

- Use "Capture Chat Manually" command to manually start tracking
- Ensure files are being saved (the extension tracks file system changes)
- Check that `autoTrack` is set to `true` in config.json

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

