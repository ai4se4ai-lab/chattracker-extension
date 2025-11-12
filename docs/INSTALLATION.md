# Installation Guide

This guide will walk you through installing the Cursor Chat Tracker extension.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Cursor IDE](https://cursor.sh/) or VS Code

## Quick Installation

### Step 1: Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

This will install all required dependencies including:
- TypeScript
- VS Code extension types
- crypto-js for hash generation
- vsce for packaging

### Step 2: Compile the Extension

```bash
npm run compile
```

This compiles the TypeScript source files into JavaScript in the `out/` directory.

### Step 3: Package the Extension

```bash
npm run package
```

This creates a `.vsix` file (e.g., `cursor-chat-tracker-1.0.0.vsix`) in the project root.

### Step 4: Install in Cursor

1. Open Cursor IDE
2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X on Mac)
3. Click the `...` menu (three dots) at the top of the Extensions view
4. Select "Install from VSIX..."
5. Navigate to your project directory
6. Select the `.vsix` file
7. Click "Install"
8. Reload Cursor when prompted

## Alternative: Development Mode

If you want to run the extension in development mode without packaging:

1. Open the project in Cursor
2. Press `F5` or go to Run → Start Debugging
3. A new "Extension Development Host" window will open
4. Test the extension in this window
5. Any changes you make will require reloading the window (Ctrl+R or Cmd+R)

## Verify Installation

1. Open Cursor
2. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
3. Type "Export Chat Messages"
4. You should see the command in the list
5. Or simply press `Ctrl+Shift+Space` (Windows/Linux) or `Cmd+Shift+Space` (Mac)

## Troubleshooting

### "npm: command not found"

Install Node.js from [nodejs.org](https://nodejs.org/). npm comes bundled with Node.js.

### "Cannot find module" errors during compilation

Run `npm install` again to ensure all dependencies are properly installed.

### "EACCES: permission denied" on Linux/Mac

You may need to run with sudo or fix npm permissions:
```bash
sudo npm install
```

Or follow [npm's guide to fix permissions](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).

### Extension not appearing in Cursor

1. Check that the installation completed successfully
2. Try restarting Cursor completely
3. Check Extensions view to see if it's installed but disabled
4. Check the Output panel (Help → Toggle Developer Tools → Console) for errors

### "No chat messages found" error

This is expected if:
- You don't have an active chat conversation open
- The extension couldn't access Cursor's chat interface

Try:
1. Select the chat text manually
2. Copy the chat text to clipboard
3. Run the export command again

## Uninstallation

1. Open Cursor
2. Go to Extensions view (Ctrl+Shift+X)
3. Find "Cursor Chat Tracker"
4. Click the gear icon → Uninstall

## Updating

To update to a new version:

1. Pull the latest changes (if using git)
2. Run `npm install` to update dependencies
3. Run `npm run compile` to recompile
4. Run `npm run package` to create a new .vsix
5. Uninstall the old version in Cursor
6. Install the new .vsix file

Or in the Extensions view, if available through marketplace:
- Click the Update button next to the extension

## Next Steps

- Read [README.md](README.md) for usage instructions
- Check [DEVELOPMENT.md](DEVELOPMENT.md) if you want to contribute
- See [example-export.json](example-export.json) for output format

