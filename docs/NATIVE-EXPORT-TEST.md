# Testing Against Cursor's Native Export

## Goal
Ensure our extension's output is **identical** to Cursor's built-in "Export Chat" functionality.

---

## 🧪 Test Procedure

### Step 1: Reload Cursor
```
Ctrl+Shift+P → "Developer: Reload Window"
```

### Step 2: Open Developer Console
```
Press F12 → Go to Console tab
```

### Step 3: Test Cursor's Native Export First

1. **Click the three dots** (•••) in the chat panel (top right)
2. **Click "Export Chat"**
3. **See what happens:**
   - Does it copy to clipboard?
   - Does it save a file?
   - Does it show any dialog?
4. **Check the format:**
   - If copied to clipboard, paste it somewhere
   - If saved to file, open the file
   - Note the exact format

### Step 4: Test Our Extension

1. **Press `Ctrl+Shift+Space`** (our shortcut)
2. **Watch the console** for:
   ```
   [Chat Tracker] Attempting to use Cursor native export...
   [Chat Tracker] Trying command: aichat.exportChat
   [Chat Tracker] Trying command: workbench.action.chat.export
   ...
   ```
3. **Check if it succeeds:**
   - Look for: `[Chat Tracker] Native export succeeded!`
   - Or: `[Chat Tracker] Strategy 1 succeeded`

### Step 5: Compare Outputs

Open both files/content side by side and compare:

#### What to Check:
- ✅ **Same content** - All messages present
- ✅ **Same format** - Markdown/JSON/Plain text
- ✅ **Same structure** - Headers, separators, etc.
- ✅ **Same metadata** - Timestamps, model info
- ✅ **Same code blocks** - Formatting preserved
- ✅ **Complete messages** - No fragments

---

## 🔍 Investigation Steps

### Find the Command Name

1. **Open Keyboard Shortcuts:**
   ```
   Ctrl+Shift+P → "Preferences: Open Keyboard Shortcuts"
   ```

2. **Search for "Export Chat"**

3. **Note the command ID** (e.g., `aichat.exportChat`)

4. **Update our code** if the command name is different

### Check Console for Command Attempts

When you press `Ctrl+Shift+Space`, you should see:

```
[Chat Tracker] Attempting to use Cursor native export...
[Chat Tracker] Trying command: aichat.exportChat
[Chat Tracker] Command failed: aichat.exportChat [error details]
[Chat Tracker] Trying command: workbench.action.chat.export
...
```

### If Native Command Works:
```
[Chat Tracker] Native export succeeded! Content length: 5432
[Chat Tracker] Extracted 15 messages
[Chat Tracker] Strategy 1 succeeded
```

### If Native Command Doesn't Work:
```
[Chat Tracker] No built-in export command found
[Chat Tracker] Trying Strategy 2: WebView extraction
...
```

---

## 📊 Comparison Matrix

| Aspect | Native Export | Our Extension | Match? |
|--------|--------------|---------------|--------|
| Format | ? | Markdown | ? |
| Structure | ? | Headers + Messages | ? |
| Metadata | ? | Yes | ? |
| Code Blocks | ? | Yes | ? |
| Timestamps | ? | Yes | ? |
| File Extension | ? | .md | ? |
| File Location | ? | .cursor/chat/ | ? |

Fill this in after testing!

---

## 🎯 Expected Scenarios

### Scenario A: Native Command Works ✅

**What happens:**
1. Our extension detects `aichat.exportChat` command
2. Executes it programmatically
3. Gets the exact same output as clicking the button
4. Saves it to `.cursor/chat/chat-{hash}.md`

**Result:** Output is **identical** to native export!

### Scenario B: Native Command Returns Markdown

**What happens:**
1. Native export puts Markdown in clipboard
2. Our extension captures it
3. We parse and save it
4. Format matches native export

**Result:** Output **matches** native format!

### Scenario C: Native Command Not Available

**What happens:**
1. Native command doesn't exist or isn't accessible
2. Our extension falls back to Strategy 2 & 3
3. We manually copy and format the chat
4. Output might be slightly different

**Result:** Output is **similar** but our custom format

---

## 🔧 Testing Commands

### Test Native Export Manually

```typescript
// In Developer Console, run:
vscode.commands.getCommands().then(commands => {
  const chatCommands = commands.filter(c => 
    c.includes('chat') || c.includes('export')
  );
  console.log('Chat-related commands:', chatCommands);
});
```

### Test Our Extension

```
1. Press Ctrl+Shift+Space
2. Check console output
3. Check .cursor/chat/ directory
4. Open the exported file
```

---

## 📝 What to Report

After testing, please provide:

### 1. Native Export Behavior
```
When I click "Export Chat":
- [ ] It copies to clipboard
- [ ] It saves a file
- [ ] It shows a dialog
- [ ] Format: Markdown / JSON / Plain Text
- [ ] Location: _______________
```

### 2. Console Output
```
Paste the console output from pressing Ctrl+Shift+Space:
[Chat Tracker] ...
```

### 3. Command Name
```
The actual command ID for "Export Chat" is: _______________
(Found in Keyboard Shortcuts)
```

### 4. Content Comparison
```
- [ ] Both exports have the same content
- [ ] Both have the same format
- [ ] Both have the same structure
- [ ] Output is identical / similar / different
```

### 5. Sample Output

Paste a small sample from **both**:

**Native Export:**
```
[Paste first few lines here]
```

**Our Extension:**
```
[Paste first few lines here]
```

---

## 🚀 Quick Test Now!

1. **Try Cursor's native export** (click ••• → Export Chat)
2. **Try our extension** (press `Ctrl+Shift+Space`)
3. **Compare the results!**

Let me know what you find! 🔍

