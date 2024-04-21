import * as vscode from 'vscode';
import * as path from 'path';

export class AlwaysOpenProvider implements vscode.TreeDataProvider<AlwaysTreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<AlwaysTreeItem | undefined | void> = new vscode.EventEmitter<AlwaysTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<AlwaysTreeItem | undefined | void> = this._onDidChangeTreeData.event;
	private pinnedFolders: Array<vscode.Uri>;

	constructor(workspaceRoot :Array<vscode.Uri> ) {
        this.pinnedFolders = workspaceRoot;
	}

	public updateWorksapaceRoot(pinnedFolders :Array<vscode.Uri>){
		this.pinnedFolders = pinnedFolders;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: AlwaysTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: AlwaysTreeItem): Promise<AlwaysTreeItem[]> {
		if (this.pinnedFolders.length === 0) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}
		if (element) {
			return this.getFilesinDirectory(element);
		} else {
			return Promise.resolve(this.pinnedFolders.map(x=> new AlwaysTreeItem(true, x, vscode.TreeItemCollapsibleState.Collapsed)));
		}

	}

	/**
	 * Given the path to package.json, read all its dependencies and devDependencies.
	 */
	private async getFilesinDirectory(element: AlwaysTreeItem): Promise<AlwaysTreeItem[]> {
		if (element.isDirectory){
			return (await vscode.workspace.fs.readDirectory(element.uri))
			.map(x=> 
				{
					var isDirectory =  x[1] === vscode.FileType.Directory;
					var subUri = vscode.Uri.joinPath(element.uri, x[0]);
					if (isDirectory){
						return new AlwaysTreeItem(true, subUri, vscode.TreeItemCollapsibleState.Collapsed);
					} else {
						var command = {
							command: 'vscode.open',
							title: 'open',
							arguments: [subUri]
						};
						return new AlwaysTreeItem(false, subUri, vscode.TreeItemCollapsibleState.None, command);

					}
				});
		} else {
			return [];
		}
	}

}

export class AlwaysTreeItem extends vscode.TreeItem {

	constructor(
		public readonly isDirectory: boolean,
		public readonly uri: vscode.Uri,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command,
	) {
		var name = path.basename(uri.fsPath);
		super(name, collapsibleState);
		this.tooltip = name;
		this.uri = uri;
		this.description = this.isDirectory;
		this.command = command;
	}
}
