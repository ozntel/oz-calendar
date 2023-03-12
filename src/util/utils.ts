import { TFile, TFolder } from 'obsidian';
import OZCalendarPlugin from '../main';

/**
 * Helper to open a file passed in params within Obsidian (Tab/Separate)
 * @param params
 */
export const openFile = (params: {
	file: TFile;
	plugin: OZCalendarPlugin;
	newLeaf: boolean;
	leafBySplit?: boolean;
}) => {
	const { file, plugin, newLeaf, leafBySplit } = params;
	let leaf = plugin.app.workspace.getLeaf(newLeaf);
	if (!newLeaf && leafBySplit) leaf = plugin.app.workspace.createLeafBySplit(leaf, 'vertical');
	plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
	leaf.openFile(file, { eState: { focus: true } });
};

export const createNewMarkdownFile = async (
	plugin: OZCalendarPlugin,
	folder: TFolder,
	newFileName: string,
	content?: string
) => {
	// @ts-ignore
	const newFile = await plugin.app.fileManager.createNewMarkdownFile(folder, newFileName);
	if (content && content !== '') await plugin.app.vault.modify(newFile, content);
	openFile({ file: newFile, plugin: plugin, newLeaf: false });
};

export function isMouseEvent(e: React.TouchEvent | React.MouseEvent): e is React.MouseEvent {
	return e && 'screenX' in e;
}
