import * as vscode from 'vscode';
import { ChatCapture, ChatSession } from './chatCapture';

export class ChatTrackerTreeItem extends vscode.TreeItem {
  public sessionId?: string; // Store session ID for context menu commands

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly iconPath?: vscode.ThemeIcon,
    public readonly contextValue?: string,
    sessionId?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = label;
    this.sessionId = sessionId;
  }
}

export class ChatTrackerTreeDataProvider implements vscode.TreeDataProvider<ChatTrackerTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ChatTrackerTreeItem | undefined | null | void> = new vscode.EventEmitter<ChatTrackerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ChatTrackerTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private chatCapture: ChatCapture) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ChatTrackerTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ChatTrackerTreeItem): Thenable<ChatTrackerTreeItem[]> {
    if (!element) {
      // Root level items
      return Promise.resolve([
        new ChatTrackerTreeItem(
          '📊 Current Session',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          new vscode.ThemeIcon('comment-discussion')
        ),
        new ChatTrackerTreeItem(
          '⚡ Actions',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          new vscode.ThemeIcon('rocket')
        ),
        new ChatTrackerTreeItem(
          '⚙️ Configuration',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          new vscode.ThemeIcon('settings-gear')
        ),
        new ChatTrackerTreeItem(
          '📝 Sessions',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          new vscode.ThemeIcon('files')
        )
      ]);
    }

    if (element.label === '📊 Current Session') {
      const session = this.chatCapture.getChatData();
      if (!session || session.messages.length === 0) {
        return Promise.resolve([
          new ChatTrackerTreeItem(
            'No active session',
            vscode.TreeItemCollapsibleState.None,
            {
              command: 'cursor-chat-tracker.startNewSession',
              title: 'Start New Session'
            },
            new vscode.ThemeIcon('circle-outline')
          )
        ]);
      }

      const items: ChatTrackerTreeItem[] = [
        new ChatTrackerTreeItem(
          `ID: ${session.id.substring(0, 20)}...`,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          new vscode.ThemeIcon('tag')
        ),
        new ChatTrackerTreeItem(
          `Messages: ${session.messages.length}`,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          new vscode.ThemeIcon('message')
        ),
        new ChatTrackerTreeItem(
          `Created: ${new Date(session.createdAt).toLocaleString()}`,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          new vscode.ThemeIcon('calendar')
        )
      ];

      // Show chat tab connection if available
      if (session.chatTabId || session.chatTabTitle) {
        items.push(
          new ChatTrackerTreeItem(
            `Chat Tab: ${session.chatTabTitle || session.chatTabId?.substring(0, 20) || 'Unknown'}`,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            new vscode.ThemeIcon('link')
          )
        );
      } else {
        items.push(
          new ChatTrackerTreeItem(
            'Not connected to chat tab',
            vscode.TreeItemCollapsibleState.None,
            {
              command: 'cursor-chat-tracker.associateChatTab',
              title: 'Associate with Chat Tab'
            },
            new vscode.ThemeIcon('link-external'),
            'action.associate'
          )
        );
      }

      return Promise.resolve(items);
    }

    if (element.label === '⚡ Actions') {
      return Promise.resolve([
        new ChatTrackerTreeItem(
          'Export Chat to Backend',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'cursor-chat-tracker.exportChat',
            title: 'Export Chat to Backend'
          },
          new vscode.ThemeIcon('export'),
          'action.export'
        ),
        new ChatTrackerTreeItem(
          'Add User Message',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'cursor-chat-tracker.addUserMessage',
            title: 'Add User Message'
          },
          new vscode.ThemeIcon('add'),
          'action.addMessage'
        ),
        new ChatTrackerTreeItem(
          'Capture from Selection',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'cursor-chat-tracker.captureFromSelection',
            title: 'Capture from Selection'
          },
          new vscode.ThemeIcon('selection'),
          'action.capture'
        ),
        new ChatTrackerTreeItem(
          'Start New Session',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'cursor-chat-tracker.startNewSession',
            title: 'Start New Session'
          },
          new vscode.ThemeIcon('new-file'),
          'action.newSession'
        ),
        new ChatTrackerTreeItem(
          'Clear Current Session',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'cursor-chat-tracker.clearSession',
            title: 'Clear Current Session'
          },
          new vscode.ThemeIcon('trash'),
          'action.clear'
        ),
        new ChatTrackerTreeItem(
          'Associate with Chat Tab',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'cursor-chat-tracker.associateChatTab',
            title: 'Associate with Chat Tab'
          },
          new vscode.ThemeIcon('link'),
          'action.associate'
        )
      ]);
    }

    if (element.label === '⚙️ Configuration') {
      return Promise.resolve([
        new ChatTrackerTreeItem(
          'Edit Configuration',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'cursor-chat-tracker.openConfig',
            title: 'Open Configuration'
          },
          new vscode.ThemeIcon('edit'),
          'config.edit'
        ),
        new ChatTrackerTreeItem(
          'View Settings',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'cursor-chat-tracker.openSettings',
            title: 'Open Settings'
          },
          new vscode.ThemeIcon('settings'),
          'config.settings'
        ),
        new ChatTrackerTreeItem(
          'Reload Configuration',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'cursor-chat-tracker.reloadConfig',
            title: 'Reload Configuration'
          },
          new vscode.ThemeIcon('refresh'),
          'config.reload'
        )
      ]);
    }

    if (element.label === '📝 Sessions') {
      const sessions = this.chatCapture.getAllSessions();
      if (sessions.length === 0) {
        return Promise.resolve([
          new ChatTrackerTreeItem(
            'No sessions available',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            new vscode.ThemeIcon('circle-outline')
          )
        ]);
      }

      return Promise.resolve(
        sessions.map(session => {
          const chatTabInfo = session.chatTabTitle 
            ? ` → ${session.chatTabTitle}`
            : session.chatTabId 
            ? ` → ${session.chatTabId.substring(0, 15)}...`
            : '';
          const item = new ChatTrackerTreeItem(
            `${session.id.substring(0, 15)}... (${session.messages.length} msgs)${chatTabInfo}`,
            vscode.TreeItemCollapsibleState.None,
            {
              command: 'cursor-chat-tracker.switchSession',
              title: 'Switch Session',
              arguments: [session.id]
            },
            session.chatTabId ? new vscode.ThemeIcon('link') : new vscode.ThemeIcon('file'),
            'session.item',
            session.id
          );
          return item;
        })
      );
    }

    return Promise.resolve([]);
  }
}

