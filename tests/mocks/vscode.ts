// Mock VS Code API for testing
// This allows us to test modules that depend on vscode without requiring the actual VS Code environment

const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  withProgress: jest.fn((options, callback) => {
    const progress = {
      report: jest.fn(),
    };
    return callback(progress);
  }),
  activeTextEditor: null,
};

const workspace = {
  workspaceFolders: [
    {
      uri: {
        fsPath: '/test/workspace',
      },
    },
  ],
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    delete: jest.fn(),
  },
  createFileSystemWatcher: jest.fn(() => ({
    onDidCreate: jest.fn(),
    dispose: jest.fn(),
  })),
};

const commands = {
  executeCommand: jest.fn(),
};

const env = {
  clipboard: {
    readText: jest.fn(),
    writeText: jest.fn(),
  },
};

const ProgressLocation = {
  Notification: 15,
  SourceControl: 1,
  Window: 10,
};

const Uri = {
  file: (path: string) => ({
    fsPath: path,
    scheme: 'file',
  }),
};

// Export individual items
export { window, workspace, commands, env, ProgressLocation, Uri };

// Also export as default for compatibility
const vscode = {
  window,
  workspace,
  commands,
  env,
  ProgressLocation,
  Uri,
};

export default vscode;

