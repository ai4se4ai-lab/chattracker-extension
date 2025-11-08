# Installation Guide

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- VS Code or Cursor IDE

## Step-by-Step Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@types/node` - Node.js type definitions
- `@types/vscode` - VS Code API type definitions
- `typescript` - TypeScript compiler

### 2. Build the Extension

```bash
npm run compile
```

This compiles TypeScript to JavaScript in the `out/` directory.

### 3. Run in Development Mode

1. Open this folder in VS Code/Cursor
2. Press `F5` to launch a new Extension Development Host window
3. The extension will be active in the new window

### 4. Configure the Extension

Create a `.cursor-chat-tracker.json` file in your workspace:

```json
{
  "CURSOR_CONNECTION_CODE": "your-connection-code",
  "EASYITI_API_URL": "https://your-api.com/endpoint"
}
```

### 5. Package for Distribution (Optional)

```bash
npm install -g vsce
vsce package
```

This creates a `.vsix` file that can be installed in VS Code/Cursor.

## Testing

1. Open the Extension Development Host window (F5)
2. Open a workspace
3. Use the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):
   - Type "Export Chat to Backend"
   - Or "Add User Message" to manually track messages

## Troubleshooting

### Build Errors

If you see TypeScript errors:
```bash
npm run compile
```

Check the output for specific errors.

### Extension Not Loading

- Check the Developer Console (Help > Toggle Developer Tools)
- Look for errors in the "Cursor Chat Tracker" output channel
- Verify `package.json` has correct `main` path: `"./out/extension.js"`

### Configuration Not Found

- Ensure `.cursor-chat-tracker.json` exists in workspace root
- Check file path in VS Code settings
- Verify JSON syntax is valid

