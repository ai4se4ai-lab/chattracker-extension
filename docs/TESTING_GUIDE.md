# Testing Guide - TrackChat Extension

This guide walks you through testing the TrackChat extension using Command Palette commands.

## Prerequisites

1. **Build the Extension**
   ```bash
   npm install
   npm run compile
   ```

2. **Configure the Extension**
   - The extension will auto-create `config.json` on first run
   - Or manually create it from `config.json.template`
   - Fill in your `CURSOR_CONNECTION_CODE` and `EASYITI_API_URL`

3. **Launch Extension Development Host**
   - Press `F5` in VS Code/Cursor
   - A new window will open with the extension loaded

## Testing Steps

### Step 1: Open Command Palette

Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) to open the Command Palette.

### Step 2: Test Chat Capture

#### Option A: Manual Capture
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `TrackChat: Capture Chat Manually`
3. Enter a test user prompt, e.g., "Create a login page with email and password fields"
4. Optionally enter an AI response, e.g., "I'll create a login page component with form validation"
5. Click OK
6. You should see: "Chat captured!" notification

#### Option B: Capture from Selection
1. Open any file in the editor
2. Type or select some text (e.g., "User: Add authentication\nAI: I'll implement JWT-based auth")
3. Select the text
4. Open Command Palette (`Ctrl+Shift+P`)
5. Type: `TrackChat: Capture Chat from Selection`
6. Select the option
7. If prompted, choose "User Prompt" or "AI Response"

#### Option C: Capture from File
1. Create a test file `test-chat.txt` with content:
   ```
   User: Create a REST API endpoint
   AI: I'll create an Express.js endpoint with proper error handling
   ```
2. Open Command Palette (`Ctrl+Shift+P`)
3. Type: `TrackChat: Capture Chat from File`
4. Select your test file
5. The chat should be imported

### Step 3: Make Some File Changes

To test file tracking:
1. Create a new file: `test-file.ts`
2. Add some code to it
3. Save the file
4. Modify another existing file
5. The extension should automatically track these changes

### Step 4: View the Summary

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `TrackChat: Show Chat Summary`
3. A webview panel should open showing:
   - User Objectives
   - AI Response Summary
   - Main Actions
   - Modified Files list
   - Task Status

**Alternative**: Click the "TrackChat" icon in the status bar (bottom right)

### Step 5: Finalize the Chat

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `TrackChat: Finalize Current Chat`
3. You should see: "Chat finalized. Summary ready to send."
4. The task status should update (check the summary panel)

### Step 6: Send Summary to API

**Important**: Make sure your `config.json` has valid API credentials:
```json
{
  "CURSOR_CONNECTION_CODE": "your-actual-code",
  "EASYITI_API_URL": "https://your-api.com/endpoint"
}
```

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `TrackChat: Send Summary to API`
3. If successful: "Summary sent to API successfully!"
4. If failed: Error message will show (check your API URL and credentials)

### Step 7: Open Configuration

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `TrackChat: Open Configuration`
3. The `config.json` file should open in the editor
4. You can modify settings and save

## Testing Checklist

- [ ] Extension activates (check Output panel: View → Output → Select "TrackChat")
- [ ] Status bar shows "TrackChat" icon
- [ ] Can capture chat manually
- [ ] Can capture chat from selection
- [ ] Can capture chat from file
- [ ] File changes are tracked automatically
- [ ] Summary panel displays correctly
- [ ] Summary shows user objectives
- [ ] Summary shows AI response
- [ ] Summary shows main actions
- [ ] Summary shows modified files
- [ ] Task status updates correctly
- [ ] Can finalize chat
- [ ] Can send summary to API (if configured)
- [ ] Configuration file opens correctly

## Troubleshooting

### Extension Not Activating
- Check Output panel for errors
- Verify `npm run compile` completed successfully
- Check that `out/extension.js` exists

### Commands Not Appearing
- Reload the window: `Ctrl+R` or `Cmd+R`
- Check extension is activated in the Extension Development Host window

### API Sending Fails
- Verify `config.json` exists and has correct values
- Check API URL is accessible
- Verify connection code is correct
- Check network connectivity

### File Changes Not Tracked
- Ensure you're working in a workspace folder
- Check that files are being saved
- Verify `autoTrack` is `true` in config.json

### Summary Panel Not Showing
- Check if webview is blocked
- Try closing and reopening the panel
- Check browser console (if available in webview)

## Quick Test Script

Here's a quick test sequence:

1. `F5` - Launch Extension Development Host
2. `Ctrl+Shift+P` → `TrackChat: Capture Chat Manually`
   - Prompt: "Create a hello world function"
   - Response: "I'll create a simple hello world function in TypeScript"
3. Create a file `hello.ts` with: `function hello() { return "Hello World"; }`
4. `Ctrl+Shift+P` → `TrackChat: Show Chat Summary` - Verify all sections
5. `Ctrl+Shift+P` → `TrackChat: Finalize Current Chat`
6. `Ctrl+Shift+P` → `TrackChat: Send Summary to API` - If API configured

## Expected Results

After following these steps, you should see:
- ✅ Chat summary with all sections populated
- ✅ Modified files list includes `hello.ts`
- ✅ Task status shows "completed" or "in-progress"
- ✅ Status bar icon updates based on status
- ✅ API call succeeds (if properly configured)

## Next Steps

Once basic functionality is verified:
- Test with longer conversations
- Test with multiple file modifications
- Test error scenarios (invalid API, network issues)
- Test auto-send feature (set `autoSend: true` in config)

