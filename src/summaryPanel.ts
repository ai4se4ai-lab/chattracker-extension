import * as vscode from 'vscode';
import * as path from 'path';
import { ChatTracker } from './chatTracker';
import { ChatSummary } from './types';

export class SummaryPanel {
    public static currentPanel: SummaryPanel | undefined;
    public static readonly viewType = 'trackchatSummary';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _chatTracker: ChatTracker;

    public static createOrShow(extensionUri: vscode.Uri, chatTracker: ChatTracker) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (SummaryPanel.currentPanel) {
            SummaryPanel.currentPanel._panel.reveal(column);
            SummaryPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            SummaryPanel.viewType,
            'Chat Summary',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                retainContextWhenHidden: true
            }
        );

        SummaryPanel.currentPanel = new SummaryPanel(panel, extensionUri, chatTracker);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, chatTracker: ChatTracker) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._chatTracker = chatTracker;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        this._update();
                        return;
                    case 'sendToApi':
                        this._sendToApi();
                        return;
                }
            },
            null,
            this._disposables
        );

        // Update content periodically
        const interval = setInterval(() => {
            if (this._panel.visible) {
                this._update();
            }
        }, 2000);

        this._disposables.push(new vscode.Disposable(() => clearInterval(interval)));
    }

    private _sendToApi() {
        const summary = this._chatTracker.getCurrentSummary();
        if (summary) {
            vscode.commands.executeCommand('trackchat.sendSummary');
        }
    }

    public dispose() {
        SummaryPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const summary = this._chatTracker.getCurrentSummary();
        this._panel.webview.html = this._getHtmlForWebview(summary);
    }

    private _getHtmlForWebview(summary: ChatSummary | null) {
        if (!summary) {
            return this._getEmptyStateHtml();
        }

        const statusColor = {
            'completed': '#4CAF50',
            'in-progress': '#FF9800',
            'failed': '#F44336'
        }[summary.taskStatus] || '#757575';

        const statusIcon = {
            'completed': '✓',
            'in-progress': '⟳',
            'failed': '✗'
        }[summary.taskStatus] || '?';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Summary</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .title {
            font-size: 18px;
            font-weight: bold;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            background-color: ${statusColor}33;
            color: ${statusColor};
            border: 1px solid ${statusColor};
        }
        .section {
            margin-bottom: 24px;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }
        .section-content {
            background-color: var(--vscode-editor-background);
            padding: 12px;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
        }
        .objectives-list, .actions-list, .files-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .objectives-list li, .actions-list li {
            padding: 6px 0;
            padding-left: 20px;
            position: relative;
        }
        .objectives-list li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: var(--vscode-textLink-foreground);
        }
        .actions-list li:before {
            content: "→";
            position: absolute;
            left: 0;
            color: var(--vscode-textLink-foreground);
        }
        .files-list li {
            padding: 4px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .timestamp {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 8px;
        }
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .button-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .button-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Chat Summary</div>
        <div>
            <span class="status-badge">${statusIcon} ${summary.taskStatus.toUpperCase()}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">User Objectives</div>
        <div class="section-content">
            <ul class="objectives-list">
                ${summary.userObjectives.map(obj => `<li>${this._escapeHtml(obj)}</li>`).join('')}
            </ul>
        </div>
    </div>

    <div class="section">
        <div class="section-title">AI Response Summary</div>
        <div class="section-content">
            <p>${this._escapeHtml(summary.aiResponseSummary || 'No response summary available.')}</p>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Main Actions</div>
        <div class="section-content">
            <ul class="actions-list">
                ${summary.mainActions.length > 0 
                    ? summary.mainActions.map(action => `<li>${this._escapeHtml(action)}</li>`).join('')
                    : '<li>No actions detected</li>'
                }
            </ul>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Modified Files (${summary.modifiedFiles.length})</div>
        <div class="section-content">
            <ul class="files-list">
                ${summary.modifiedFiles.length > 0
                    ? summary.modifiedFiles.map(file => `<li>${this._escapeHtml(file)}</li>`).join('')
                    : '<li>No files modified</li>'
                }
            </ul>
        </div>
    </div>

    <div class="timestamp">
        Chat ID: ${summary.id}<br>
        Timestamp: ${new Date(summary.timestamp).toLocaleString()}
    </div>

    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--vscode-panel-border);">
        <button class="button" onclick="sendToApi()">Send to API</button>
        <button class="button button-secondary" onclick="refresh()">Refresh</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function sendToApi() {
            vscode.postMessage({ command: 'sendToApi' });
        }
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
    </script>
</body>
</html>`;
    }

    private _getEmptyStateHtml() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Summary</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <h2>No Chat Summary Available</h2>
        <p>Start a chat conversation to see the summary here.</p>
    </div>
</body>
</html>`;
    }

    private _escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

