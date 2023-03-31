import OZCalendarPlugin from 'main';
import { Modal, TFolder, Notice } from 'obsidian';
import { createNewMarkdownFile } from './util/utils';
import { stripIndents } from 'common-tags';
import dayjs from 'dayjs';
import { FolderSuggest } from 'settings/suggestor';

export class CreateNoteModal extends Modal {
	plugin: OZCalendarPlugin;
	destinationDate: Date;

	constructor(plugin: OZCalendarPlugin, destinationDate: Date) {
		super(plugin.app);
		this.plugin = plugin;
		this.destinationDate = destinationDate;
	}

	onOpen(): void {
		let { contentEl } = this;
		let thisModal = this;

		const headerEl = contentEl.createEl('div', { text: 'Create Note' });
		headerEl.addClass('modal-title');

		// Input El
		contentEl.createEl('p', { text: 'File Name:' });
		const fileNameInputEl = contentEl.createEl('input', { cls: 'oz-calendar-modal-inputel' });

		let defFileNamePref = this.plugin.settings.defaultFileNamePrefix;
		if (defFileNamePref !== '') {
			fileNameInputEl.value = dayjs(this.destinationDate).format(defFileNamePref) + ' ';
		}

		fileNameInputEl.focus();

		// Folder Select
		let folderInputEl: HTMLInputElement = null;
		if (this.plugin.settings.showDestinationFolderDuringCreate) {
			contentEl.createEl('p', { text: 'Destination Folder:' });
			folderInputEl = contentEl.createEl('input', { cls: 'oz-calendar-modal-inputel' });
			new FolderSuggest(folderInputEl);
			folderInputEl.value = this.plugin.settings.defaultFolder;
		}

		// Additional Space
		let addSpace = contentEl.createEl('div', { cls: 'oz-calendar-modal-addspacediv ' });

		// Create - Cancel Buttons
		const createButton = contentEl.createEl('button', { text: 'Create Note' });
		const cancelButton = contentEl.createEl('button', {
			text: 'Cancel',
			cls: 'oz-calendar-modal-float-right',
		});
		cancelButton.addEventListener('click', () => {
			thisModal.close();
		});

		const onClickCreateButton = async () => {
			let newFileName = fileNameInputEl.value;
			if (newFileName !== '') {
				let defFolderSrc = folderInputEl ? folderInputEl.value : this.plugin.settings.defaultFolder;
				let defFolder = this.app.vault.getAbstractFileByPath(defFolderSrc);
				if (defFolder && defFolder instanceof TFolder) {
					// Default Text Preparation for File with YAML and Date
					let defaultNewFileText = stripIndents`
                    ---
                    ${this.plugin.settings.yamlKey}: ${dayjs(this.destinationDate).format(
						this.plugin.settings.dateFormat
					)}
                    ---
                    `;
					// Create the MD File and close the modal
					await createNewMarkdownFile(
						this.plugin,
						defFolder,
						newFileName,
						this.plugin.settings.dateSource === 'yaml' ? defaultNewFileText : ''
					);
					thisModal.close();
				} else {
					new Notice('Folder couldnt be found in the Vault');
				}
			} else {
				new Notice('You didnt provide file name');
			}
		};

		createButton.addEventListener('click', onClickCreateButton);
		fileNameInputEl.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') await onClickCreateButton();
		});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
