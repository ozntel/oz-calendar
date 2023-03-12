import OZCalendarPlugin from 'main';
import { Modal, TFolder, Notice } from 'obsidian';
import { createNewMarkdownFile } from './util/utils';
import { stripIndents } from 'common-tags';
import dayjs from 'dayjs';

export class CreateNoteModal extends Modal {
	plugin: OZCalendarPlugin;
	selectedDay: Date;

	constructor(plugin: OZCalendarPlugin, selectedDay: Date) {
		super(plugin.app);
		this.plugin = plugin;
		this.selectedDay = selectedDay;
	}

	onOpen(): void {
		let { contentEl } = this;
		let thisModal = this;

		const headerEl = contentEl.createEl('div', { text: 'Create Note: Provide Name' });
		headerEl.addClass('modal-title');

		// Input El
		const inputEl = contentEl.createEl('input');
		inputEl.style.cssText = 'width: 100%; height: 2.5em; margin-bottom: 15px;';

		let defFileNamePref = this.plugin.settings.defaultFileNamePrefix;
		if (defFileNamePref !== '' && dayjs(new Date(), defFileNamePref, true).isValid()) {
			inputEl.value = dayjs().format(defFileNamePref) + ' ';
		}

		inputEl.focus();

		const createButton = contentEl.createEl('button', { text: 'Create Note' });

		const cancelButton = contentEl.createEl('button', { text: 'Cancel' });
		cancelButton.style.cssText = 'float: right;';
		cancelButton.addEventListener('click', () => {
			thisModal.close();
		});

		let defaultNewFileText = stripIndents`
        ---
        ${this.plugin.settings.yamlKey}: ${dayjs().format(this.plugin.settings.dateFormat)}
        ---
        `;

		const onClickCreateButton = async () => {
			let newFileName = inputEl.value;
			if (newFileName !== '') {
				let defFolderSrc = this.plugin.settings.defaultFolder;
				let defFolder = this.app.vault.getAbstractFileByPath(defFolderSrc);
				if (defFolder && defFolder instanceof TFolder) {
					await createNewMarkdownFile(this.plugin, defFolder, newFileName, defaultNewFileText);
					thisModal.close();
				}
			} else {
				new Notice('You didnt provide file name');
			}
		};

		createButton.addEventListener('click', onClickCreateButton);
		inputEl.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') await onClickCreateButton();
		});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
