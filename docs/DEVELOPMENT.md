# Development Guide

## Project Structure

```
cursor-chat-tracker/
├── src/
│   ├── extension.ts       # Main extension entry point
│   ├── chatExtractor.ts   # Chat extraction logic
│   ├── fileManager.ts     # File system operations
│   ├── hashGenerator.ts   # Chat ID generation
│   └── types.ts          # TypeScript interfaces
├── out/                   # Compiled JavaScript (generated)
├── .vscode/              # VS Code configuration
│   ├── launch.json       # Debugging configuration
│   └── tasks.json        # Build tasks
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
└── README.md            # User documentation
```

## Setup Development Environment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Compile TypeScript**
   ```bash
   npm run compile
   ```

3. **Watch Mode (for development)**
   ```bash
   npm run watch
   ```

## Debugging

1. Open the project in VS Code/Cursor
2. Press `F5` or go to Run → Start Debugging
3. A new Extension Development Host window will open
4. Test your extension in this window
5. Set breakpoints in the TypeScript source files
6. Use Debug Console for logging

## Testing the Extension

### Manual Testing

1. Start the extension in debug mode (F5)
2. In the Extension Development Host window:
   - Open or create a chat conversation
   - Press `Ctrl+Shift+Space` (Windows/Linux) or `Cmd+Shift+Space` (Mac)
   - Check that the chat is exported to `.cursor/chat/`
   - Verify the JSON structure and content

### Test Scenarios

1. **Normal Export**: Export an active chat with multiple messages
2. **Empty Chat**: Try to export when no chat is active
3. **No Workspace**: Test without an open workspace
4. **Manual Selection**: Select chat text and export
5. **Clipboard Fallback**: Copy chat text to clipboard and export

## Code Organization

### extension.ts
Main entry point that:
- Registers commands
- Handles the export workflow
- Shows notifications and progress
- Manages error handling

### chatExtractor.ts
Extraction logic that:
- Tries multiple strategies to access chat
- Parses chat data from various sources
- Handles different chat formats
- Returns structured chat data

### fileManager.ts
File operations:
- Determines storage location
- Creates directories
- Writes JSON files
- Provides display paths

### hashGenerator.ts
ID generation:
- Creates unique chat identifiers
- Uses MD5 hashing
- Ensures consistency

### types.ts
Type definitions:
- ChatMessage interface
- ChatMetadata interface
- ExportedChat structure
- ExtractionResult

## Building for Production

1. **Compile**
   ```bash
   npm run compile
   ```

2. **Package**
   ```bash
   npm run package
   ```
   This creates a `.vsix` file in the root directory

3. **Install**
   - Open Cursor
   - Extensions view → `...` menu → "Install from VSIX..."
   - Select the generated `.vsix` file

## Common Issues

### TypeScript Errors
- Run `npm install` to ensure all dependencies are installed
- Check `tsconfig.json` configuration
- Run `npm run compile` to see detailed errors

### Extension Not Activating
- Check `package.json` activation events
- Verify command registration in `extension.ts`
- Look at Output → Extension Host logs

### Chat Extraction Fails
- The extension tries multiple strategies
- Check console logs for detailed error messages
- Verify Cursor's chat interface structure hasn't changed

## Architecture Notes

### Multi-Strategy Extraction

The extension uses a fallback approach:

1. **Primary**: Try built-in Cursor export commands
2. **Secondary**: Access WebView DOM (limited by security)
3. **Tertiary**: Parse selected text or clipboard

This ensures the extension works even if Cursor's internal API changes.

### File Naming

Chat files are named using a hash of their content:
- Format: `chat-{8-char-hash}.json`
- Example: `chat-a3f5b2c.json`
- Ensures uniqueness while being readable

### Storage Location

Files are stored in `.cursor/chat/`:
- In workspace root if a workspace is open
- In user home directory if no workspace is open

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Code Style

- Use TypeScript strict mode
- Add JSDoc comments for public functions
- Follow existing code structure
- Keep functions focused and small
- Handle errors gracefully

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Test all features
- [ ] Update README.md if needed
- [ ] Update CHANGELOG.md
- [ ] Run `npm run compile`
- [ ] Run `npm run package`
- [ ] Test the `.vsix` file
- [ ] Tag the release in git

