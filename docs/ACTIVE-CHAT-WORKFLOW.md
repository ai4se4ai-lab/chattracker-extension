# Export the ACTIVE Chat - Correct Workflow

## ⚠️ Common Mistake

**Problem**: You have multiple chat windows and export the wrong one!

**Why**: The extension reads from clipboard, so it exports whatever chat you copied LAST, not the chat you're currently viewing.

---

## ✅ Correct Workflow

### For EACH chat you want to export:

1. **Go to the chat window** you want to export
2. **Click INSIDE that specific chat**
3. **Select all in THAT chat**: `Ctrl+A`
4. **Copy from THAT chat**: `Ctrl+C`
5. **Immediately export**: `Ctrl+Shift+Space`
6. **Done!** That specific chat is now exported ✅

---

## 📋 Example Scenario

### Scenario: You have 3 chat windows

**Chat A**: "Create React component"
**Chat B**: "Fix TypeScript error"
**Chat C**: "Add test cases"

### To export Chat B:

1. **Click in Chat B window** (the TypeScript error chat)
2. **`Ctrl+A`** (selects all text in Chat B)
3. **`Ctrl+C`** (copies Chat B to clipboard)
4. **`Ctrl+Shift+Space`** (exports Chat B)
5. **Result**: `chat-xyz123.md` contains the TypeScript error conversation ✅

---

## 🎯 Key Rule

**ALWAYS copy from the chat you want to export RIGHT BEFORE pressing `Ctrl+Shift+Space`**

Don't:
- ❌ Copy Chat A yesterday, then try to export Chat B today
- ❌ Have multiple chats open and press the shortcut without copying first
- ❌ Copy something else (like code) and then try to export

Do:
- ✅ Click in target chat → Copy (`Ctrl+A`, `Ctrl+C`) → Export (`Ctrl+Shift+Space`)
- ✅ Fresh copy each time
- ✅ Verify you're in the right chat before copying

---

## 🔍 How to Verify You're Exporting the Right Chat

### Check the Console (F12)

When you press `Ctrl+Shift+Space`, console shows:

```
[Chat Tracker] First message preview: Create React component...
```

**This tells you which chat is being exported!**

If it shows the wrong content:
1. Go back to the correct chat
2. Copy again (`Ctrl+A` → `Ctrl+C`)
3. Press `Ctrl+Shift+Space` again

---

## 💡 Pro Workflow

### Best Practice:

```
1. Open Chat Window A
2. Ctrl+A → Ctrl+C → Ctrl+Shift+Space (exports Chat A)

3. Open Chat Window B  
4. Ctrl+A → Ctrl+C → Ctrl+Shift+Space (exports Chat B)

5. Open Chat Window C
6. Ctrl+A → Ctrl+C → Ctrl+Shift+Space (exports Chat C)
```

**Each chat gets exported to its own file in `.cursor/chat/`**

---

## 🚀 Quick Reference Card

```
┌─────────────────────────────────────┐
│  Export Current Chat - 3 Steps:     │
│                                     │
│  1. Click in chat you want          │
│  2. Ctrl+A → Ctrl+C (copy it)       │
│  3. Ctrl+Shift+Space (export it)    │
│                                     │
│  ✅ Done! Check .cursor/chat/       │
└─────────────────────────────────────┘
```

---

## ❓ FAQ

### Q: Why can't it auto-detect the active chat?
**A**: Cursor's chat runs in a WebView (isolated environment). Extensions can't access WebView content directly for security reasons.

### Q: Can I export multiple chats at once?
**A**: No, export one at a time using the workflow above. Each chat gets its own file.

### Q: How do I know which file is which chat?
**A**: Open the `.md` file - the title will be the first user message from that chat!

### Q: What if I accidentally export the wrong chat?
**A**: No problem! Just export the correct chat - it will create a new file with a different hash.

---

## ✅ Summary

**Golden Rule**: Copy → Export → Repeat for each chat

**Remember**: The extension exports whatever is in your clipboard, so ALWAYS copy the active chat right before exporting!

---

**Now try it with your different chat windows!** 🎉

