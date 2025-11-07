# Troubleshooting: Commands Not Showing

If commands don't appear in Command Palette, try these steps:

## Step 1: Verify Extension is Active

1. Check the Output panel:
   - Go to: **View → Output**
   - In the dropdown, select **"Log (Extension Host)"**
   - Look for: `TrackChat extension is now active!`
   - If you see this, the extension is loaded

2. Check Status Bar:
   - Look at the bottom-right of the Extension Development Host window
   - You should see a "TrackChat" icon
   - If you see it, the extension is working

## Step 2: Reload the Extension Development Host Window

**Important**: Commands might not appear until you reload:

1. In the **Extension Development Host** window (the one that opened with F5):
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type: `Developer: Reload Window`
   - Press Enter

   OR

   - Simply press `Ctrl+R` (or `Cmd+R` on Mac)

2. Wait for the window to reload
3. Try the command again

## Step 3: Try Different Search Terms

In Command Palette (`Ctrl+Shift+P`), try typing:

- `TrackChat` (should show all 7 commands)
- `Capture` (should show 3 capture commands)
- `Chat` (should show chat-related commands)
- `trackchat` (lowercase - sometimes helps)

## Step 4: Check for Errors

1. Open Output panel: **View → Output**
2. Select **"Log (Extension Host)"**
3. Look for any red error messages
4. If you see errors, note them down

## Step 5: Rebuild and Reload

1. In your main VS Code window (not Extension Development Host):
   ```bash
   npm run compile
   ```

2. In Extension Development Host window:
   - Press `Ctrl+R` to reload
   - Or close it and press `F5` again

## Step 6: Verify Commands Are Registered

Run this in the Extension Development Host window:

1. Press `Ctrl+Shift+P`
2. Type: `Developer: Inspect Context Keys`
3. This opens developer tools
4. In the Console, type:
   ```javascript
   vscode.commands.getCommands().then(commands => {
       console.log(commands.filter(c => c.includes('trackchat')));
   });
   ```
5. You should see all 7 trackchat commands listed

## Alternative: Use Status Bar

If commands don't work, try the status bar:

1. Look for "TrackChat" icon in bottom-right
2. Click it - this should open the summary panel
3. Even if empty, it confirms the extension is working

## Still Not Working?

If none of the above works:

1. **Close Extension Development Host window**
2. **In main VS Code window:**
   - Stop any running debug sessions
   - Run: `npm run compile`
   - Check for compilation errors
3. **Press F5 again** to launch fresh Extension Development Host
4. **Wait 5-10 seconds** for extension to fully activate
5. **Try Command Palette again**

## Quick Test Command

Try this exact sequence:

1. `F5` - Launch Extension Development Host
2. Wait for window to fully load
3. `Ctrl+Shift+P` - Open Command Palette
4. Type: `TrackChat` (exactly like this, with capital T and C)
5. You should see 7 commands

If you still see nothing, there might be an activation issue. Check the Output panel for errors.

