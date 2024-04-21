import * as vscode from 'vscode';
import { AlwaysOpenProvider } from './alwaysOpen';

export async function pickDirectoryToImport():Promise<vscode.Uri|undefined> {
    const importUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        title: "Select Folder To Pin in folders",
        canSelectMany: false,
        openLabel: "Select Folder To Pin in folders"
    });
    if (importUri?.length === 0) { return; }
    const folder = importUri![0];
    if (!folder?.fsPath) { return; }
    await vscode.workspace.fs.createDirectory(folder);
    return folder;
}

const PinnedFoldersKey = "pinned-folders";
async function addEntry(context: vscode.ExtensionContext){
	var folder = await pickDirectoryToImport();
	if (folder){
		var pinnedFolders: Array<string> = context.globalState.get(PinnedFoldersKey)??[];
		pinnedFolders.push(folder.fsPath);
		context.globalState.update(PinnedFoldersKey, pinnedFolders);
		vscode.commands.executeCommand(`${PinnedFoldersKey}.refreshEntry`);
	}
}

export function activate(context: vscode.ExtensionContext) {
	var folderList: Array<string> = context.globalState.get(PinnedFoldersKey)?? [];
	const listOfFolders: Array<vscode.Uri> = folderList.map(folder => vscode.Uri.file(folder));
	const alwaysTreeItemProvider = new AlwaysOpenProvider(listOfFolders);
	vscode.window.registerTreeDataProvider(PinnedFoldersKey, alwaysTreeItemProvider);
	vscode.commands.registerCommand(`${PinnedFoldersKey}.refreshEntry`, () => {
		const pinnedFolders: Array<string> = context.globalState.get(PinnedFoldersKey) ?? [];
		var folderList: Array<vscode.Uri> = (pinnedFolders).map(folder => vscode.Uri.file(folder));
		alwaysTreeItemProvider.updateWorksapaceRoot(folderList);
		alwaysTreeItemProvider.refresh();
	});
	vscode.commands.registerCommand(`${PinnedFoldersKey}.addEntry`, () => addEntry(context));
}

export function deactivate() {}
