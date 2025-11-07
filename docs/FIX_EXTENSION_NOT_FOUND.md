# Fix: Extension Not Found Error

If you see: `Extension 'ai4se4ai-lab.trackchat' not found`

## Solution Steps

### Step 1: Stop All Debug Sessions
1. In VS Code/Cursor, look at the top toolbar
2. Click the **Stop** button (square icon) to stop any running debug sessions
3. Or press `Shift+F5` to stop debugging

### Step 2: Close Extension Development Host Window
1. Close the Extension Development Host window completely
2. Make sure it's fully closed (not just minimized)

### Step 3: Verify Files Are Compiled
In your main VS Code window terminal, run:
```bash
npm run compile
```

You should see no errors. Verify `out/extension.js` exists.

### Step 4: Clean Restart
1. **Close VS Code/Cursor completely** (all windows)
2. **Reopen VS Code/Cursor**
3. **Open the extension folder**: `c:\Users\babaei\Desktop\Research\Ai4SE4AI\Extension\trackchat`
4. **Press F5** to launch Extension Development Host

### Step 5: Wait for Activation
After pressing F5:
1. Wait 10-15 seconds for the extension to fully activate
2. Check the Output panel: **View → Output → Select "Log (Extension Host)"**
3. Look for: `TrackChat extension is now active!`

### Step 6: Test Commands
1. In the Extension Development Host window
2. Press `Ctrl+Shift+P`
3. Type: `TrackChat`
4. You should see all commands

## Alternative: Check Extension Path

If still not working, verify the extension is being loaded from the correct path:

1. In VS Code/Cursor, open the extension folder
2. Make sure you're in the correct directory
3. The `package.json` should be in the root
4. The `out/extension.js` should exist

## Verify Extension Structure

Your extension folder should have:
```
trackchat/
├── package.json          ✓ (with publisher field)
├── tsconfig.json         ✓
├── out/
│   └── extension.js      ✓ (compiled)
├── src/
│   └── extension.ts      ✓
└── config.json           ✓ (optional, auto-created)
```

## Still Not Working?

If the error persists:

1. **Check for syntax errors in package.json:**
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"
   ```

2. **Verify the main entry point:**
   - `package.json` should have: `"main": "./out/extension.js"`
   - File `out/extension.js` must exist

3. **Try a different activation event:**
   - Change `"onStartupFinished"` to `"*"` in package.json
   - Recompile and restart

4. **Check VS Code/Cursor version:**
   - Make sure you're using a recent version
   - The extension requires VS Code 1.74.0+

## Quick Fix Command

Run this in PowerShell from the extension directory:
```powershell
npm run compile
# Then close and reopen VS Code/Cursor
# Then press F5
```

