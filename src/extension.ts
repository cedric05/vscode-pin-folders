import * as vscode from 'vscode';
import { PinFoldersTreeDataProvider, PinTreeItem } from './pinFolders';
import path from 'path';
import os = require("os");
import { open } from 'fs';

var hostname = os.hostname();

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

const pinFoldersSub = `pinned-folders`;

const pinFoldersSubKey = `${hostname}-${pinFoldersSub}`;
async function addEntry(context: vscode.ExtensionContext) {
	var folder = await pickDirectoryToImport();
	if (folder) {
		var pinnedFolders: Array<[string, string]> = context.globalState.get(pinFoldersSubKey) ?? [];
		pinnedFolders.push(folder);
		context.globalState.update(pinFoldersSubKey, pinnedFolders);
		vscode.commands.executeCommand(`${pinFoldersSub}.refreshEntry`);
	}
}

export function activate(context: vscode.ExtensionContext) {
	var folderList: Array<[string, string]> = context.globalState.get(pinFoldersSubKey) ?? [];
	const alwaysTreeItemProvider = new PinFoldersTreeDataProvider(folderList);
	vscode.window.registerTreeDataProvider(pinFoldersSub, alwaysTreeItemProvider);

	const refreshEntryCommand = vscode.commands.registerCommand(`${pinFoldersSub}.refreshEntry`, () => {
		const pinnedFolders: Array<[string, string]> = context.globalState.get(pinFoldersSubKey) ?? [];
		alwaysTreeItemProvider.updateWorksapaceRoot(pinnedFolders);
		alwaysTreeItemProvider.refresh();
	});

	const removeEntryCommand = vscode.commands.registerCommand(`${pinFoldersSub}.removeEntry`, async (item: PinTreeItem) => {
		const pinnedFolders: Array<[string, string]> = context.globalState.get(pinFoldersSubKey) ?? [];
		const index = pinnedFolders.findIndex(x => x[0] === item.uri.fsPath);
		if (index !== -1) {
			pinnedFolders.splice(index, 1);
			context.globalState.update(pinFoldersSubKey, pinnedFolders);
			vscode.commands.executeCommand(`${pinFoldersSub}.refreshEntry`);
		}
	});

	const renameEntryCommand = vscode.commands.registerCommand(`${pinFoldersSub}.renameEntry`, async (item: PinTreeItem) => {
		const pinnedFolders: Array<[string, string]> = context.globalState.get(pinFoldersSubKey) ?? [];
		const index = pinnedFolders.findIndex(x => x[0] === item.uri.fsPath);
		if (index !== -1) {
			const folder = pinnedFolders[index];
			const name = await vscode.window.showInputBox({
				title: "Pick Name (used when multiple pinned folders with same name)",
				ignoreFocusOut: true,
				value: folder[1]
			});
			if (name) {
				pinnedFolders[index] = [folder[0], name];
				context.globalState.update(pinFoldersSubKey, pinnedFolders);
				vscode.commands.executeCommand(`${pinFoldersSub}.refreshEntry`);
			}
		}
	});

	// Add entry from workspace explorer 
	const addEntryFromExplorer = vscode.commands.registerCommand('pinned-folders.addEntryFromExplorer', async (uri: vscode.Uri) => {
		// ask for name with which we want to add.
		const name = await vscode.window.showInputBox({
			title: "Pick Name (used when multiple pinned folders with same name)",
			ignoreFocusOut: true,
			value: path.basename(uri.fsPath)
		});
		const folder: [string, string] = [uri.fsPath, name ?? path.basename(uri.fsPath)];
		var pinnedFolders: Array<[string, string]> = context.globalState.get(pinFoldersSubKey) ?? [];
		pinnedFolders.push(folder);
		context.globalState.update(pinFoldersSubKey, pinnedFolders);
		vscode.commands.executeCommand(`${pinFoldersSub}.refreshEntry`);
	});

	const addEntryCommand = vscode.commands.registerCommand(`${pinFoldersSub}.addEntry`, () => addEntry(context));

	const openInNewWindowCommand = vscode.commands.registerCommand(`${pinFoldersSub}.openInNewWindow`, async (item: PinTreeItem) => {
		vscode.commands.executeCommand('vscode.openFolder', item.uri, true);
	});

	const updateOrderCommand = vscode.commands.registerCommand('pinned-folders.updateOrder', (newOrder: Array<[string, string]>) => {
		context.globalState.update(pinFoldersSubKey, newOrder);
		alwaysTreeItemProvider.updateWorksapaceRoot(newOrder);
		alwaysTreeItemProvider.refresh();
	});

	// Register drag and drop handler
	vscode.window.createTreeView(pinFoldersSub, {
		treeDataProvider: alwaysTreeItemProvider,
		dragAndDropController: {
			dropMimeTypes: ['application/vnd.code.tree.pinned-folders'],
			dragMimeTypes: ['application/vnd.code.tree.pinned-folders'],
			handleDrag: (source: readonly vscode.TreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken) => {
				dataTransfer.set('application/vnd.code.tree.pinned-folders', new vscode.DataTransferItem(source));
			},
			handleDrop: async (target: vscode.TreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken) => {
				const transferItem = await dataTransfer.get('application/vnd.code.tree.pinned-folders');
				const sources = transferItem?.value as vscode.TreeItem[];
				alwaysTreeItemProvider.handleDrag(sources as PinTreeItem[], target as PinTreeItem);
			}
		}
	});

	context.subscriptions.push(refreshEntryCommand, removeEntryCommand, addEntryCommand, renameEntryCommand, addEntryFromExplorer, openInNewWindowCommand, updateOrderCommand);
}

export function deactivate() { }
