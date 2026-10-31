import { AbstractInputSuggest, App, TAbstractFile, TFile, TFolder } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	private inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.inputEl = inputEl;
	}

	getSuggestions(inputStr: string): TFolder[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const folders: TFolder[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		abstractFiles.forEach((folder: TAbstractFile) => {
			if (folder instanceof TFolder && folder.path.toLowerCase().contains(lowerCaseInputStr)) {
				folders.push(folder);
			}
		});

		return folders;
	}

	renderSuggestion(file: TFolder, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFolder): void {
		this.setValue(file.path);
		// Trigger input so that Setting onChange handlers pick up the new value
		this.inputEl.trigger('input');
		this.close();
	}
}

export class FileSuggest extends AbstractInputSuggest<TFile> {
	private inputEl: HTMLInputElement;
	private getPreferredFolder?: () => string | null;

	/**
	 * @param getPreferredFolder Optional, files within this folder are suggested first (e.g. the templates folder)
	 */
	constructor(app: App, inputEl: HTMLInputElement, getPreferredFolder?: () => string | null) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.getPreferredFolder = getPreferredFolder;
	}

	getSuggestions(inputStr: string): TFile[] {
		const lowerCaseInputStr = inputStr.toLowerCase();
		const files = this.app.vault
			.getMarkdownFiles()
			.filter((file) => file.path.toLowerCase().contains(lowerCaseInputStr));

		const preferredFolder = this.getPreferredFolder?.();
		if (!preferredFolder || preferredFolder === '/') return files;
		const isInPreferredFolder = (file: TFile) => file.path.startsWith(preferredFolder + '/');
		return [...files.filter(isInPreferredFolder), ...files.filter((file) => !isInPreferredFolder(file))];
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		this.setValue(file.path);
		// Trigger input so that Setting onChange handlers pick up the new value
		this.inputEl.trigger('input');
		this.close();
	}
}
