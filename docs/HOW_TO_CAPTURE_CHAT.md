# How to Capture Chat Content in TrackChat Extension

This guide explains the different methods available to capture chat content from Cursor and prepare it for API submission.

## Overview

The TrackChat extension provides multiple ways to capture chat interactions:

1. **Manual Capture** - Enter chat content manually via command
2. **Automatic Monitoring** - Automatically detect and capture chat from documents/clipboard
3. **Programmatic Capture** - Use the API in your code

## Method 1: Manual Capture (Command Palette)

### Step-by-Step:

1. **Open Command Palette:**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type: `TrackChat: Capture Chat`

2. **Enter User Prompt:**
   - A dialog will appear asking for the user prompt
   - Enter the question/request you sent to the AI

3. **Enter AI Response (Optional):**
   - Another dialog will appear for the AI response
   - You can skip this if you only want to capture the prompt
   - Press `Enter` to skip or type the response

4. **Chat is Captured:**
   - The chat is now stored in memory
   - You'll see a confirmation message

### Example:
```
User Prompt: "Create a function to calculate fibonacci numbers"
AI Response: "I'll create a function that calculates fibonacci numbers using recursion..."
```

## Method 2: Capture from Clipboard

### Step-by-Step:

1. **Copy Chat Content from Cursor:**
   - Open the chat panel in Cursor (if available)
   - Select and copy the actual conversation text (your question and the AI's response)
   - **Important:** Copy the conversation text itself, NOT:
     - ❌ Command names like "TrackChat: Capture Chat from Cursor (Clipboard)"
     - ❌ UI elements or buttons
     - ❌ Menu items or status messages
     - ✅ **DO copy:** The actual question you asked and the AI's response

2. **Capture from Clipboard:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type: `TrackChat: Capture Chat from Cursor (Clipboard)`
   - The extension will parse and capture the chat

### What to Copy (Examples):

✅ **Good - Copy this:**
```
User: Create a function to calculate fibonacci numbers

AI: I'll create a function that calculates fibonacci numbers using recursion...
```

✅ **Also Good:**
```
How do I implement authentication in my app?

Here's how you can implement authentication...
```

❌ **Don't Copy This:**
- "TrackChat: Capture Chat from Cursor (Clipboard)" (command name)
- "Chat Summary" (UI text)
- "in-progress" (status message)

### Troubleshooting:

If you see "Clipboard contains a command name or UI text":
1. Make sure you copied the actual chat conversation, not a command or menu item
2. Try copying the text directly from the chat panel
3. If the chat is in a file, use "TrackChat: Capture from Selection" instead
4. Or use "TrackChat: Capture Chat" to manually enter the content

## Method 3: Automatic Monitoring

### Enable Automatic Monitoring:

1. **Start Monitoring:**
   - Press `Ctrl+Shift+P`
   - Type: `TrackChat: Start Monitoring`
   - Or set `autoTrack: true` in `config.json`

2. **How It Works:**
   - Monitors document changes for chat-like content
   - Checks clipboard every 2 seconds for chat content
   - Detects chat patterns in markdown/text files
   - Automatically captures when chat is detected

3. **Stop Monitoring:**
   - Press `Ctrl+Shift+P`
   - Type: `TrackChat: Stop Monitoring`

### What Gets Captured Automatically:

- ✅ Chat content in markdown files (`.md`)
- ✅ Chat content in text files (`.txt`)
- ✅ Chat content copied to clipboard
- ✅ Documents with "chat" or "conversation" in the path/name
- ❌ Cursor's native chat panel (not directly accessible)

## Method 4: Save to JSON File

After capturing chat, you can save it to a JSON file ready for API submission:

1. **Save Captured Chat:**
   - Press `Ctrl+Shift+P`
   - Type: `TrackChat: Save to JSON`
   - The file will be saved to your workspace root as `captured_chats.json`

2. **JSON Structure:**
   ```json
   {
     "connectionCode": "your-connection-code",
     "eventType": "chat-summary",
     "status": "completed",
     "summary": {
       "id": "chat_1234567890_abc123",
       "timestamp": "2024-01-01T12:00:00.000Z",
       "userPrompt": "Create a function...",
       "userObjectives": ["Create a function..."],
       "aiResponseSummary": "I'll create a function...",
       "mainActions": ["Created fibonacci function"],
       "modifiedFiles": [],
       "taskStatus": "completed"
     }
   }
   ```

## Method 5: Programmatic Capture (For Developers)

If you're extending the extension or creating custom integrations:

### Basic Usage:

```typescript
import { ChatCapture } from './chatCapture';

// Capture chat
chatCapture.captureChat(
    "User prompt text here",
    "AI response text here (optional)"
);

// Prepare JSON payload for API
const payload = await chatCapture.prepareApiPayload();
if (payload) {
    // Send to API or save to file
    console.log(JSON.stringify(payload, null, 2));
}

// Save to file
const filePath = await chatCapture.saveToJsonFile();
console.log(`Saved to: ${filePath}`);

// Get all captured chats
const chats = chatCapture.getCapturedChats();
console.log(`Total chats captured: ${chats.length}`);
```

### Advanced Usage:

```typescript
// Capture multiple chats
chatCapture.captureChat("First prompt", "First response");
chatCapture.captureChat("Second prompt", "Second response");

// Get specific chat payload
const firstChatPayload = await chatCapture.prepareApiPayload(0);
const secondChatPayload = await chatCapture.prepareApiPayload(1);

// Clear all captured chats
chatCapture.clearCapturedChats();
```

## Method 6: Integration with ChatMonitor

When automatic monitoring is enabled, `ChatMonitor` automatically uses `ChatCapture` to store detected chats:

```typescript
// ChatMonitor automatically calls:
chatCapture.captureChat(userPrompt, aiResponse);
```

This means:
- ✅ All automatically detected chats are stored in `ChatCapture`
- ✅ You can access them via `getCapturedChats()`
- ✅ You can save them all to JSON
- ✅ They're ready for API submission

## Complete Workflow Example

### Scenario: You had a chat conversation in Cursor

**Option A: Manual Capture**
1. Copy the conversation from Cursor
2. Run `TrackChat: Capture Chat`
3. Paste user prompt
4. Paste AI response
5. Run `TrackChat: Save to JSON`
6. Submit the JSON file to your API

**Option B: Automatic Capture**
1. Enable `autoTrack: true` in `config.json`
2. Save the chat conversation to a `.md` file in your workspace
3. The extension automatically detects and captures it
4. Run `TrackChat: Save to JSON` when ready
5. Submit the JSON file to your API

**Option C: Direct API Submission**
1. Capture chat (manual or automatic)
2. Run `TrackChat: Send Summary`
3. The extension sends directly to your configured API endpoint

## Configuration

Make sure your `config.json` is set up:

```json
{
  "CURSOR_CONNECTION_CODE": "your-connection-code",
  "EASYITI_API_URL": "https://your-api-endpoint.com/api",
  "autoSend": false,
  "autoTrack": true
}
```

## Troubleshooting

### Chat not being captured?

1. **Check if monitoring is active:**
   - Look for "TrackChat: Automatic monitoring started!" message
   - Or manually start monitoring

2. **Check the output log:**
   - View → Output → Select "TrackChat" from dropdown
   - Look for capture messages

3. **Verify chat format:**
   - Chat should have user prompts and AI responses
   - Look for patterns like "User:", "AI:", ">", etc.

### JSON file not created?

1. **Check workspace:**
   - Make sure you have a workspace folder open
   - The file is saved to workspace root

2. **Check permissions:**
   - Ensure you have write permissions to workspace

3. **Check if chat was captured:**
   - Run `TrackChat: Capture Chat` first
   - Or enable automatic monitoring

## Best Practices

1. **Use Automatic Monitoring:**
   - Set `autoTrack: true` in config
   - Saves chat conversations to files
   - Extension will automatically detect them

2. **Save Regularly:**
   - Run `TrackChat: Save to JSON` after important conversations
   - Keep backups of captured chats

3. **Review Before Sending:**
   - Check the JSON file before API submission
   - Verify all required fields are present

4. **Use Clear Prompts:**
   - Well-formatted chat content is easier to parse
   - Include both user prompts and AI responses

## API Submission Format

The JSON file is ready for direct API submission. It follows this structure:

```typescript
{
  connectionCode: string;      // From config.json
  eventType: "chat-summary";   // Always "chat-summary"
  status: "completed" | "in-progress" | "failed";
  summary: {
    id: string;                // Unique chat ID
    timestamp: string;         // ISO timestamp
    userPrompt: string;        // Full user prompt
    userObjectives: string[]; // Extracted objectives
    aiResponseSummary: string; // AI response summary
    mainActions: string[];    // Detected actions
    modifiedFiles: string[];   // Files modified (if tracked)
    taskStatus: TaskStatus;    // Current status
  }
}
```

This format matches exactly what the API expects, so you can submit it directly!
