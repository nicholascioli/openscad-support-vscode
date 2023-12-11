import * as vscode from "vscode";

import { FSEntry, PreviewExtensionMsg, PreviewWebviewMsg } from "../messages";

export class PreviewPanel {
    public static readonly viewType = 'openscad-preview.wasm-preview';
    public static currentPanel?: PreviewPanel;

    private _disposables: vscode.Disposable[] = [];
    private _mainPreviewWatcher?: vscode.Disposable;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _panel: vscode.WebviewPanel,
    ) {
        this._render();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.Two;

        // If we already have a panel, show it.
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            PreviewPanel.viewType,
            'OpenSCAD Model Preview',
            column,

            // Configure the webview
            {
                enableScripts: true,
                // localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
            }
        );

        PreviewPanel.currentPanel = new PreviewPanel(extensionUri, panel);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        PreviewPanel.currentPanel = new PreviewPanel(extensionUri, panel);
    }

    public static preview(file: vscode.Uri, dependencies: vscode.Uri[]) {
        console.log("Previewing file!", file, dependencies);
        const self = PreviewPanel.currentPanel;
        if (!self) {
            return;
        }
        const panel = self._panel;

        const toFsEntry = (uri: vscode.Uri): FSEntry => ({ url: uri.toString(), path: uri.path });
        const path = toFsEntry(panel.webview.asWebviewUri(file));
        const deps = dependencies.map(uri => toFsEntry(panel.webview.asWebviewUri(uri)));

        console.log("Mapped to path:", path, deps);
        // const watcher = vscode.workspace.createFileSystemWatcher(path.fsPath);

        // self._mainPreviewWatcher?.dispose();
        // self._mainPreviewWatcher = watcher;

        // watcher.onDidChange(_ => panel.webview.postMessage({ command: 'preview', path } as PreviewExtensionMsg));
        panel.webview.postMessage({ command: 'preview', path, deps } as PreviewExtensionMsg);
    }

    public dispose() {
        PreviewPanel.currentPanel = undefined;

        // Clean up our resources
        this._mainPreviewWatcher?.dispose();
        this._panel.dispose();
    }

    private _render(): void | Thenable<void> {
        const webview = this._panel.webview;

        this._panel.title = "OpenSCAD Model Preview";
        webview.html = this._getHtmlForWebview(webview);

        // Pass messages to the preview, when needing to update it
        webview.onDidReceiveMessage(data => {
            // let msg = data as PreviewWebviewMsg;
            // switch (msg.command) {
            //     case 'fetchWorkspaces': {
            //         const folders = vscode.workspace.workspaceFolders?.map(folder => webview.asWebviewUri(folder.uri));
            //         webview.postMessage({ command: 'loadWorkspaces', folders } as PreviewExtensionMsg);
            //         break;
            //     }
            // }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Map paths to extension paths
        const previewPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'preview');

        const cssBundle = webview.asWebviewUri(vscode.Uri.joinPath(previewPath, 'reset.css'))
        const mediaPrefix = webview.asWebviewUri(vscode.Uri.joinPath(previewPath));

        const entrypointBundle = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js'));
        const nonce = this.getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">

                    <!--
                        Use a content security policy to only allow loading styles from our extension directory,
                        and only allow scripts that have a specific nonce.
                        (See the 'webview-sample' extension sample for img-src content security policy examples)
                    -->
                    <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"> -->

                    <link href="${cssBundle}" rel="stylesheet">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    <title>OpenSCAD Preview</title>
                </head>
                <body>
                </body>

                <script nonce="${nonce}">var EXTENSION_PREFIX = "${mediaPrefix}/";</script>
                <script nonce="${nonce}" src="${entrypointBundle}" type="module"></script>
            </html>
        `;
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
