# Debug Guide - Finding What's Being Captured

## Issue: Wrong Content Being Captured

If the export contains file content (like `compilerOptions`) instead of chat messages, the automatic selection is focusing on the wrong thing.

---

## 🔍 Debugging Steps

### Step 1: Check What's Being Captured

1. **Reload Cursor**: `Ctrl+Shift+P` → "Developer: Reload Window"
2. **Open Console**: `F12` → Console tab
3. **Press `Ctrl+Shift+Space`** to trigger export
4. **Look for these console messages:**

```
[Chat Tracker] First 200 chars of clipboard: ...
[Chat Tracker] Content looks like chat? true/false
[Chat Tracker] Content preview: ...
```

This shows you EXACTLY what was captured.

### Step 2: Identify the Problem

**If you see:**
```
[Chat Tracker] First 200 chars of clipboard: {
  "compilerOptions": {
    "target": "ES2020",
```

**Problem:** It's copying a file (like `tsconfig.json`) instead of the chat!

**If you see:**
```
[Chat Tracker] First 200 chars of clipboard: write a cursor extension that calls "export chat" functionality...
```

**Problem:** It's getting user text but not the assistant responses!

### Step 3: Manual Test

Let's test manually to see what format Cursor uses:

1. **Click in the chat panel** (make sure it's focused)
2. **Manually press `Ctrl+A`** (select all in chat)
3. **Press `Ctrl+C`** (copy)
4. **Paste into a text file** and save it
5. **Share the format** - what does it look like?

---

## 🎯 What Cursor's Format Might Be

### Format Option 1: Role Markers
```
You: write a cursor extension
Cursor: Here's how to create...
You: can you add more details?
Cursor: Sure! Let me explain...
```

### Format Option 2: Plain Conversation
```
write a cursor extension

Here's how to create...

can you add more details?

Sure! Let me explain...
```

### Format Option 3: Markdown Style
```
> write a cursor extension

Here's how to create...

> can you add more details?

Sure! Let me explain...
```

### Format Option 4: JSON
```json
[
  {"role": "user", "content": "write a cursor extension"},
  {"role": "assistant", "content": "Here's how to create..."}
]
```

---

## 🔧 Quick Fix Options

### Option A: Focus Chat Panel First

Try clicking directly in the chat panel before pressing `Ctrl+Shift+Space`.

### Option B: Use Native Export Button

1. Click ••• (three dots) in chat
2. Click "Export Chat"
3. See what it does
4. Then try our shortcut

### Option C: Manual Copy Method

1. **Click in chat panel**
2. **Press `Ctrl+A`** manually
3. **Press `Ctrl+C`** manually
4. **Then press `Ctrl+Shift+Space`** - our extension will use the clipboard

---

## 📊 Debug Checklist

Please provide this information:

### 1. Console Output
```
[Paste all [Chat Tracker] messages here]
```

### 2. What's in Clipboard?
After pressing `Ctrl+Shift+Space`, paste your clipboard here:
```
[Paste first 500 characters]
```

### 3. Manual Copy Test
Click in chat → `Ctrl+A` → `Ctrl+C` → Paste here:
```
[Paste first 500 characters]
```

### 4. Where Was Focus?
When you pressed `Ctrl+Shift+Space`, what was focused?
- [ ] Chat panel
- [ ] Code editor
- [ ] File tree
- [ ] Other: _______

---

## 🚀 Temporary Workaround

Until we fix the automatic focusing:

**Manual Method:**
1. **Click in the chat panel**
2. **Select all**: `Ctrl+A`
3. **Copy**: `Ctrl+C`
4. **Export**: `Ctrl+Shift+Space`
5. **Should work!**

The extension will detect you already copied the chat and use that content.

---

## 💡 What to Test

1. **Try the manual workaround** above
2. **Share the console output** with me
3. **Show me** what format you get when you manually copy the chat
4. I'll update the extension to properly detect and focus the chat panel!

Let me know what you find! 🔍

