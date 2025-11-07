# Quick Start Guide

## Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build the Extension**
   ```bash
   npm run compile
   ```

3. **Configure the Extension**
   - The extension will create a `config.json` file automatically on first run
   - Or copy `config.json.template` to `config.json` and fill in your values:
     ```json
     {
       "CURSOR_CONNECTION_CODE": "your-connection-code",
       "EASYITI_API_URL": "https://your-api.com/endpoint",
       "autoSend": false,
       "autoTrack": true
     }
     ```

4. **Run the Extension**
   - Press `F5` to open a new Extension Development Host window
   - The extension will be active in that window

## Basic Usage

### Method 1: Manual Capture
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "TrackChat: Capture Chat Manually"
3. Enter your user prompt
4. Optionally enter the AI response
5. Work on your tasks
6. Run "TrackChat: Finalize Current Chat" when done
7. Run "TrackChat: Show Chat Summary" to view
8. Run "TrackChat: Send Summary to API" to send to backend

### Method 2: Capture from Selection
1. Select text in the editor (could be a user prompt or AI response)
2. Run "TrackChat: Capture Chat from Selection"
3. Follow steps 5-8 from Method 1

### Method 3: Capture from File
1. Save your chat content to a file (text, markdown, or JSON)
2. Run "TrackChat: Capture Chat from File"
3. Select your file
4. Follow steps 5-8 from Method 1

## Status Bar

Look for the "TrackChat" icon in the status bar (bottom right). Click it to quickly open the summary panel.

## Example Chat File Format

If importing from a file, you can use this format:

**Plain Text:**
```
User: Create a login page
AI: I'll create a login page with email and password fields...
```

**JSON:**
```json
{
  "userPrompt": "Create a login page",
  "aiResponse": "I'll create a login page with email and password fields..."
}
```

## Troubleshooting

- **Extension not working?** Check the Output panel (View → Output → Select "TrackChat")
- **API errors?** Verify your `config.json` has correct values
- **No summary showing?** Make sure you've captured a chat first

