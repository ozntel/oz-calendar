import OZCalendarPlugin from 'main';
import { PluginSettingTab, App, Setting } from 'obsidian';
import { FolderSuggest } from 'settings/suggestor';

export type OpenFileBehaviourType = 'new-tab' | 'new-tab-group' | 'current-tab';
export type SortingOption = 'name' | 'name-rev';
export type DateSourceOption = 'filename' | 'yaml';
export type NewNoteDateType = 'current-date' | 'active-date';

export interface OZCalendarPluginSettings {
	openViewOnStart: boolean;
	dateSource: DateSourceOption;
	yamlKey: string;
	dateFormat: string;
	defaultFolder: string;
	defaultFileNamePrefix: string;
	fixedCalendar: boolean;
	showDestinationFolderDuringCreate: boolean;
	openFileBehaviour: OpenFileBehaviourType;
	sortingOption: SortingOption;
	newNoteDate: NewNoteDateType;
}

export const DEFAULT_SETTINGS: OZCalendarPluginSettings = {
	openViewOnStart: true,
	dateSource: 'yaml',
	yamlKey: 'created',
	dateFormat: 'YYYY-MM-DD hh:mm:ss',
	defaultFolder: '/',
	defaultFileNamePrefix: 'YYYY-MM-DD',
	fixedCalendar: true,
	showDestinationFolderDuringCreate: true,
	openFileBehaviour: 'current-tab',
	sortingOption: 'name',
	newNoteDate: 'current-date',
};

export class OZCalendarPluginSettingsTab extends PluginSettingTab {
	plugin: OZCalendarPlugin;

	constructor(app: App, plugin: OZCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let { containerEl } = this;
		containerEl.empty();

		/* ------------- Buy Me a Coffee ------------- */

		const tipDiv = containerEl.createDiv('tip');
		tipDiv.addClass('oz-cal-tip-div');
		const tipLink = tipDiv.createEl('a', { href: 'https://revolut.me/ozante' });
		const tipImg = tipLink.createEl('img', {
			attr: {
				src: 'https://raw.githubusercontent.com/ozntel/file-tree-alternative/main/images/tip%20the%20artist_v2.png',
			},
		});
		tipImg.height = 55;

		const coffeeDiv = containerEl.createDiv('coffee');
		coffeeDiv.addClass('oz-cal-coffee-div');
		const coffeeLink = coffeeDiv.createEl('a', { href: 'https://ko-fi.com/L3L356V6Q' });
		const coffeeImg = coffeeLink.createEl('img', {
			attr: {
				src: 'https://cdn.ko-fi.com/cdn/kofi2.png?v=3',
			},
		});
		coffeeImg.height = 45;

		/* ------------- General Settings ------------- */

		containerEl.createEl('h1', { text: 'OZ Calendar Plugin Settings' });

		containerEl.createEl('h2', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Open Calendar on Start')
			.setDesc('Disable if you dont want Calendar View to be opened during the initial vault launch')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openViewOnStart).onChange((newValue) => {
					this.plugin.settings.openViewOnStart = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Open File Behaviour')
			.setDesc('Select the behaviour you want to have when you click on file name in the calendar view')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('new-tab', 'Open in a New Tab')
					.addOption('new-tab-group', 'Open in a New Tab Group')
					.addOption('current-tab', 'Open in the Active Tab')
					.setValue(this.plugin.settings.openFileBehaviour)
					.onChange((newValue: OpenFileBehaviourType) => {
						this.plugin.settings.openFileBehaviour = newValue;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('File List Sorting')
			.setDesc('Select the sorting behaviour in the file list')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('name', 'File Name (A to Z)')
					.addOption('name-rev', 'File Name (Z to A)')
					.setValue(this.plugin.settings.sortingOption)
					.onChange((newValue: SortingOption) => {
						this.plugin.settings.sortingOption = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});

		containerEl.createEl('h2', { text: 'YAML and Date Format' });

		containerEl.createEl('p', {
			text: `
            When you make a change under this section for YAML Key and Date Format, make sure that
            you also use "Reload Plugin" button so that the changes can be activated.
            `,
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('Date Source')
			.setDesc(
				`Select the date source to be used in each folder. It can be either YAML Key or File Name.
                Depending on what you provide within the date format, it will try to parse the date source.`
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('filename', 'File Name')
					.addOption('yaml', 'YAML Key')
					.setValue(this.plugin.settings.dateSource)
					.onChange((newValue: DateSourceOption) => {
						this.plugin.settings.dateSource = newValue;
						this.plugin.saveSettings();
						this.plugin.OZCALENDARDAYS_STATE = this.plugin.getNotesWithDates();
						this.plugin.calendarForceUpdate();
						// If YAML selected, show the YAML key below, or hide if changed back to filename
						let yamlKeySettingEl = document.querySelector('.oz-calendar-setting-yaml-key-value');
						if (yamlKeySettingEl) {
							if (newValue === 'filename') {
								yamlKeySettingEl.addClass('oz-calendar-custom-hidden');
							} else {
								yamlKeySettingEl.removeClass('oz-calendar-custom-hidden');
							}
						}
					});
			});

		let yamlKeySetting = new Setting(containerEl)
			.setClass('oz-calendar-setting-yaml-key-value')
			.setName('YAML Key')
			.setDesc('Set the YAML Key that should be used for displaying in the calendar')
			.addText((text) => {
				text.setValue(this.plugin.settings.yamlKey).onChange((newValue) => {
					this.plugin.settings.yamlKey = newValue;
					this.plugin.saveSettings();
				});
			});

		if (this.plugin.settings.dateSource === 'filename') yamlKeySetting.setClass('oz-calendar-custom-hidden');

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('Set the Date format you are using within the YAML key provided above')
			.addText((text) => {
				text.setValue(this.plugin.settings.dateFormat).onChange((newValue) => {
					this.plugin.settings.dateFormat = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Reload the plugin')
			.setDesc('Make sure that you reload the plugin if you changed YAML key or Date Format')
			.addButton((button) => {
				button.setButtonText('Reload Plugin');
				button.onClick(() => {
					this.plugin.reloadPlugin();
				});
			});

		containerEl.createEl('h2', { text: 'New Note Settings' });

		containerEl.createEl('p', {
			text: `
                The plugin will add the YAML key and date to the newly created note using the date format provided above 
                if Date Source is YAML. However, auto YAML key generation for the notes is going to be disabled if you use
                File Name as date source.
            `,
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('New Note Date')
			.setDesc(
				`
                Define the default behaviour for new note button if it should create under the active date or current date (today).
                This setting will drive the date for the YAML Key value and File Name.
                `
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('active-date', 'Active Date (Selected)')
					.addOption('current-date', 'Current Date (Today)')
					.onChange((newValue: NewNoteDateType) => {
						this.plugin.settings.newNoteDate = newValue;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default Folder Location')
			.setDesc('Select the default folder, under which the new files should be saved when use plugin + icon')
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl);
				cb.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.defaultFolder)
					.onChange((new_folder) => {
						this.plugin.settings.defaultFolder = new_folder;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default File Name Prefix Date Format')
			.setDesc(
				'Set the default file name prefix date format that will be used when you create a note using + icon. Leave blank if you dont want any'
			)
			.addText((text) => {
				text.setValue(this.plugin.settings.defaultFileNamePrefix).onChange((newValue) => {
					this.plugin.settings.defaultFileNamePrefix = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Show Destination Folder During File Creation')
			.setDesc(
				`
                Disable this if you dont want to see the destination folder selection during 
                the file creation process. The value is always going to be defaulted to the
                selected Default Folder above. You can change the destination folder for each
                folder separately but the default value will always stay same.
                `
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showDestinationFolderDuringCreate).onChange((newValue) => {
					this.plugin.settings.showDestinationFolderDuringCreate = newValue;
					this.plugin.saveSettings();
				});
			});

		containerEl.createEl('h2', { text: 'Style Settings' });

		containerEl.createEl('p', {
			text: `
            You can adjust most of the style settings using Style Settings plugin. Please download from Community Plugins
            to be able to adjust colors, etc. Below you can find some of the Style Settings that can not be incorporated
            to the Style Settings
        `,
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('Fixed Calendar (Only File List Scrollable)')
			.setDesc('Disable this if you want whole calendar view to be scrollable and not only the file list')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.fixedCalendar).onChange((newValue) => {
					this.plugin.settings.fixedCalendar = newValue;
					this.plugin.saveSettings();
					this.plugin.calendarForceUpdate();
				});
			});
	}
}
