import * as vscode from 'vscode';
import * as path from 'path';

export class PinFoldersTreeDataProvider implements vscode.TreeDataProvider<PinTreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<PinTreeItem | undefined | void> = new vscode.EventEmitter<PinTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<PinTreeItem | undefined | void> = this._onDidChangeTreeData.event;
	private pinnedFolders: Array<[vscode.Uri, string]>;

	constructor(workspaceRoot: Array<[string, string]>) {
		this.pinnedFolders = this.getPinnedFolders(workspaceRoot);
	}

	public updateWorksapaceRoot(workspaceRoot: Array<[string, string]>) {
		this.pinnedFolders = this.getPinnedFolders(workspaceRoot);
	}

	private getPinnedFolders(workspaceRoot: [string, string][]): [vscode.Uri, string][] {
		return workspaceRoot.map(x => [vscode.Uri.file(x[0]), x[1]]);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: PinTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: PinTreeItem): Promise<PinTreeItem[]> {
		if (this.pinnedFolders.length === 0) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return [];
		}
		if (element) {
			return this.getFilesinDirectory(element);
		} else {
			var ret = await Promise.all(this.pinnedFolders.map(async (item) => {
				try {
					var stat = await vscode.workspace.fs.stat(item[0]);
					if ((stat.type & vscode.FileType.Directory) === vscode.FileType.Directory) {
						return new PinTreeItem(true, item[0], vscode.TreeItemCollapsibleState.Collapsed, undefined, item[1]);
					} else {
						var command = {
							command: 'vscode.open',
							title: 'open',
							arguments: [item[0]]
						};
						return new PinTreeItem(false, item[0], vscode.TreeItemCollapsibleState.None, command, item[1]);
					}
				} catch (error) {
					console.log(`ran into error ${error}`);
					return null;
				}
			}));
			return ret.filter(x => x !== null) as PinTreeItem[];
		}
	}

	private async getFilesinDirectory(element: PinTreeItem): Promise<PinTreeItem[]> {
		if (element.isDirectory) {
			return (await vscode.workspace.fs.readDirectory(element.uri))
				.map(x => {
					var isDirectory = (x[1] & vscode.FileType.Directory) === vscode.FileType.Directory;
					var subUri = vscode.Uri.joinPath(element.uri, x[0]);
					if (isDirectory) {
						return new PinTreeItem(true, subUri, vscode.TreeItemCollapsibleState.Collapsed);
					} else {
						var command = {
							command: 'vscode.open',
							title: 'open',
							arguments: [subUri]
						};
						return new PinTreeItem(false, subUri, vscode.TreeItemCollapsibleState.None, command);

					}
				});
		} else {
			return [];
		}
	}

}

export class PinTreeItem extends vscode.TreeItem {

	constructor(
		public readonly isDirectory: boolean,
		public readonly uri: vscode.Uri,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command,
		public readonly name?: string,
	) {
		var givenName = name ?? path.basename(uri.fsPath);
		super(givenName, collapsibleState);
		this.tooltip = uri.fsPath;
		this.uri = uri;
		this.description = givenName === path.basename(uri.fsPath) ? '' : path.basename(uri.fsPath);
		this.command = command;
	}
}
