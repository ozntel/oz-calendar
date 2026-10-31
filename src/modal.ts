import OZCalendarPlugin from 'main';
import { Modal, TFolder, Notice } from 'obsidian';
import { openFile } from './util/utils';
import { createNoteFromTemplate } from './util/templates';
import { FolderSuggest } from 'settings/suggestor';
import { getStartOfWeek, getWeeklyNoteName, getWeeklyNotesFolder } from './util/weeklyNotes';

export class CreateNoteModal extends Modal {
	plugin: OZCalendarPlugin;
	destinationDate: Date;
	weekly: boolean;

	constructor(plugin: OZCalendarPlugin, destinationDate: Date, options?: { weekly?: boolean }) {
		super(plugin.app);
		this.plugin = plugin;
		this.destinationDate = destinationDate;
		this.weekly = options?.weekly ?? false;
	}

	onOpen(): void {
		let { contentEl } = this;
		let thisModal = this;

		const headerEl = contentEl.createEl('div', { text: this.weekly ? 'Create Weekly Note' : 'Create Note' });
		headerEl.addClass('modal-title');

		// Input El
		contentEl.createEl('p', { text: 'File Name:' });
		const fileNameInputEl = contentEl.createEl('input', { cls: 'oz-calendar-modal-inputel' });

		let defFileNamePref = this.plugin.settings.defaultFileNamePrefix;
		if (this.weekly) {
			fileNameInputEl.value = getWeeklyNoteName(this.plugin, this.destinationDate);
		} else if (defFileNamePref !== '') {
			fileNameInputEl.value = this.plugin.formatDate(this.destinationDate, defFileNamePref) + ' ';
		}

		fileNameInputEl.focus();

		// Folder Select
		let folderInputEl: HTMLInputElement = null;
		const defaultFolder = this.weekly ? getWeeklyNotesFolder(this.plugin) : this.plugin.settings.defaultFolder;
		if (this.plugin.settings.showDestinationFolderDuringCreate) {
			contentEl.createEl('p', { text: 'Destination Folder:' });
			folderInputEl = contentEl.createEl('input', { cls: 'oz-calendar-modal-inputel' });
			new FolderSuggest(this.app, folderInputEl);
			folderInputEl.value = defaultFolder;
		}

		// Additional Space
		let addSpace = contentEl.createEl('div', { cls: 'oz-calendar-modal-addspacediv ' });

		// Create - Cancel Buttons
		const createButton = contentEl.createEl('button', {
			text: 'Create Note',
			cls: this.plugin.settings.newNoteCancelButtonReverse ? 'oz-calendar-modal-float-right' : '',
		});
		const cancelButton = contentEl.createEl('button', {
			text: 'Cancel',
			cls: this.plugin.settings.newNoteCancelButtonReverse ? '' : 'oz-calendar-modal-float-right',
		});
		cancelButton.addEventListener('click', () => {
			thisModal.close();
		});

		const onClickCreateButton = async () => {
			let newFileName = fileNameInputEl.value;

			if (newFileName === '') {
				new Notice('You didnt provide file name');
				return;
			}

			if (newFileName.includes('/') && !this.plugin.settings.allowSlashhDuringCreate) {
				new Notice('You can not have a slash (/) in file name');
				return;
			}

			let defFolderSrc = folderInputEl ? folderInputEl.value : defaultFolder;
			let defFolder = this.app.vault.getAbstractFileByPath(defFolderSrc);

			if (!defFolder || !(defFolder instanceof TFolder)) {
				new Notice('Folder couldnt be found in the Vault');
				return;
			}

			// Date YAML for the new note. Weekly notes don't get it, so they don't show up on a day
			const { yamlKey, dateFormat, dateSource } = this.plugin.settings;
			const frontmatter =
				!this.weekly && dateSource === 'yaml'
					? { [yamlKey]: this.plugin.formatDate(this.destinationDate, dateFormat) }
					: undefined;

			// Create the MD File, open it and close the modal
			const newFile = await createNoteFromTemplate({
				plugin: this.plugin,
				folder: defFolder as TFolder,
				fileName: newFileName,
				date: this.weekly ? getStartOfWeek(this.plugin, this.destinationDate) : this.destinationDate,
				templatePath: this.weekly ? this.plugin.settings.weeklyNoteTemplate : this.plugin.settings.dailyNoteTemplate,
				frontmatter: frontmatter,
			});
			openFile({ file: newFile, plugin: this.plugin, newLeaf: false });

			thisModal.close();
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
