import * as vscode from 'vscode';
import { PinFoldersTreeDataProvider } from './pinFolders';
import path from 'path';

export async function pickDirectoryToImport(): Promise<([string, string] | undefined)> {
	const importUri = await vscode.window.showOpenDialog({
		canSelectFolders: true,
		canSelectFiles: true,
		title: "Select Folder To Pin in folders",
		canSelectMany: false,
		openLabel: "Select Folder To Pin in folders"
	});
	if (importUri?.length === 0) { return; }
	const folder = importUri![0];
	if (!folder?.fsPath) { return; }
	const defaultName = path.basename(folder.fsPath);
	const name = await vscode.window.showInputBox({
		title: "Pick Name (used when multiple pinned folders with same name)",
		ignoreFocusOut: true,
		value: defaultName
	});
	return [folder.fsPath, name ?? defaultName];
}

const PinnedFoldersKey = "pinned-folders";
async function addEntry(context: vscode.ExtensionContext) {
	var folder = await pickDirectoryToImport();
	if (folder) {
		var pinnedFolders: Array<[string, string]> = context.globalState.get(PinnedFoldersKey) ?? [];
		pinnedFolders.push(folder);
		context.globalState.update(PinnedFoldersKey, pinnedFolders);
		vscode.commands.executeCommand(`${PinnedFoldersKey}.refreshEntry`);
	}
}

export function activate(context: vscode.ExtensionContext) {
	var folderList: Array<[string, string]> = context.globalState.get(PinnedFoldersKey) ?? [];
	const alwaysTreeItemProvider = new PinFoldersTreeDataProvider(folderList);
	vscode.window.registerTreeDataProvider(PinnedFoldersKey, alwaysTreeItemProvider);
	vscode.commands.registerCommand(`${PinnedFoldersKey}.refreshEntry`, () => {
		const pinnedFolders: Array<[string, string]> = context.globalState.get(PinnedFoldersKey) ?? [];
		alwaysTreeItemProvider.updateWorksapaceRoot(pinnedFolders);
		alwaysTreeItemProvider.refresh();
	});
	vscode.commands.registerCommand(`${PinnedFoldersKey}.addEntry`, () => addEntry(context));
}

export function deactivate() { }
