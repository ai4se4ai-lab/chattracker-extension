// Simplified VS Code mock to avoid circular dependencies
// This is a factory function that creates a fresh mock each time

export function createVSCodeMock() {
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

  return {
    window,
    workspace,
    commands,
    env,
    ProgressLocation,
    Uri,
  };
}

