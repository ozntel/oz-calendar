import OZCalendarPlugin from 'main';
import { PluginSettingTab, App, Setting, debounce } from 'obsidian';
import { FileSuggest, FolderSuggest } from 'settings/suggestor';
import { getDefaultWeeklyNoteFormat } from '../util/weeklyNotes';
import { checkTemplate, getTemplatesFolder, isTemplaterEnabled } from '../util/templates';

export type OpenFileBehaviourType = 'new-tab' | 'new-tab-group' | 'current-tab' | 'obsidian-default';
export type SortingOption = 'name' | 'name-rev';
export type DateSourceOption = 'filename' | 'yaml';
export type NewNoteDateType = 'current-date' | 'active-date';
export type CalendarType = 'US' | 'ISO 8601';
export type OverflowBehaviour = 'scroll' | 'hide' | 'next-line';

export interface OZCalendarPluginSettings {
	openViewOnStart: boolean;
	calendarType: CalendarType;
	dateSource: DateSourceOption;
	yamlKey: string;
	dateFormat: string;
	defaultFolder: string;
	defaultFileNamePrefix: string;
	dailyNoteTemplate: string;
	fixedCalendar: boolean;
	showDestinationFolderDuringCreate: boolean;
	allowSlashhDuringCreate: boolean;
	openFileBehaviour: OpenFileBehaviourType;
	sortingOption: SortingOption;
	newNoteDate: NewNoteDateType;
	newNoteCancelButtonReverse: boolean;
	fileNameOverflowBehaviour: OverflowBehaviour;
	showWeekNumbers: boolean;
	useObsidianLanguage: boolean;
	weeklyNotesEnabled: boolean;
	weeklyNoteFormat: string;
	weeklyNotesFolder: string;
	weeklyNoteTemplate: string;
	excludeWeeklyNotesFromDays: boolean;
}

export const DEFAULT_SETTINGS: OZCalendarPluginSettings = {
	openViewOnStart: true,
	calendarType: 'ISO 8601',
	dateSource: 'yaml',
	yamlKey: 'created',
	dateFormat: 'YYYY-MM-DD HH:mm:ss',
	defaultFolder: '/',
	defaultFileNamePrefix: 'YYYY-MM-DD',
	dailyNoteTemplate: '',
	fixedCalendar: true,
	showDestinationFolderDuringCreate: true,
	allowSlashhDuringCreate: false,
	openFileBehaviour: 'current-tab',
	sortingOption: 'name',
	newNoteDate: 'current-date',
	newNoteCancelButtonReverse: false,
	fileNameOverflowBehaviour: 'hide',
	showWeekNumbers: false,
	useObsidianLanguage: true,
	weeklyNotesEnabled: false,
	weeklyNoteFormat: '',
	weeklyNotesFolder: '',
	weeklyNoteTemplate: '',
	excludeWeeklyNotesFromDays: true,
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
			.setName('Calendar Type')
			.setDesc(
				`
                Select the calendar type to be displayed. While the week in the US type starts from Sunday,
                in the ISO 8601 type, the week starts from Monday`
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('ISO 8601', 'ISO 8601')
					.addOption('US', 'US')
					.setValue(this.plugin.settings.calendarType)
					.onChange((newValue: CalendarType) => {
						this.plugin.settings.calendarType = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});

		new Setting(containerEl)
			.setName('Show Week Numbers')
			.setDesc('Enable if you want to have week numbers within the calendar view')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showWeekNumbers).onChange((newValue) => {
					this.plugin.settings.showWeekNumbers = newValue;
					this.plugin.saveSettings();
					this.plugin.calendarForceUpdate();
				});
			});

		new Setting(containerEl)
			.setName('Use Obsidian Language for Dates')
			.setDesc(
				`Show month and weekday names in the language set in Obsidian (Settings → General → Language).
                This applies to the calendar view, new note titles and the dates read from your notes. If your
                date format contains month or weekday names (e.g. MMMM, ddd), notes using English names won't be recognised anymore.`
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.useObsidianLanguage).onChange((newValue) => {
					this.plugin.settings.useObsidianLanguage = newValue;
					this.plugin.saveSettings();
					this.plugin.OZCALENDARDAYS_STATE = this.plugin.getNotesWithDates();
					this.plugin.calendarForceUpdate();
				});
			});

		new Setting(containerEl)
			.setName('Open File Behaviour')
			.setDesc('Select the behaviour you want to have when you click on file name in the calendar view')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('obsidian-default', "Obsidian's Default")
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

		containerEl.createEl('h2', { text: 'YAML, File Name and Date Format Settings' });

		// Rescan the vault once the user stops typing in YAML Key or Date Format
		const rescanNotes = debounce(
			() => {
				this.plugin.OZCALENDARDAYS_STATE = this.plugin.getNotesWithDates();
				this.plugin.calendarForceUpdate();
			},
			1000,
			true
		);

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
						yamlKeySetting.settingEl.toggleClass('oz-calendar-custom-hidden', newValue === 'filename');
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
					rescanNotes();
				});
			});

		if (this.plugin.settings.dateSource === 'filename') yamlKeySetting.setClass('oz-calendar-custom-hidden');

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc(
				`Set the Date format you are using within the YAML key or File Name provided above. 
                If you are using File Name, make sure that you dont have any special characters since Obsidian doesnt
                support special characters in the file name like colon.`
			)
			.addText((text) => {
				text.setValue(this.plugin.settings.dateFormat).onChange((newValue) => {
					this.plugin.settings.dateFormat = newValue;
					this.plugin.saveSettings();
					rescanNotes();
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
					.setValue(this.plugin.settings.newNoteDate)
					.onChange((newValue: NewNoteDateType) => {
						this.plugin.settings.newNoteDate = newValue;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default Folder Location')
			.setDesc('Select the default folder, under which the new files should be saved when use plugin + icon')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
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

		new Setting(containerEl)
			.setName('Allow to provide slash during the file creation')
			.setDesc(
				`
                Enable this option if you want to allow file creation modal to allow slash (/) in the filename, which will help creating a folder. 
                i.e. if this option is enabled and you provide an input like Folder1/File1, this will create Folder1 and place File1 under it. If 
                the folder exists, the file will be placed under the existing folder. This will respect the default folder location and create the 
                new folder as a subfolder under the default one.
                `
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.allowSlashhDuringCreate).onChange((newValue) => {
					this.plugin.settings.allowSlashhDuringCreate = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Reverse direction of Cancel and New Note Buttons')
			.setDesc(
				`Enable this setting to change the direction of Cancel and New Note buttons within the New Note Creation Modal`
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.newNoteCancelButtonReverse).onChange((newValue) => {
					this.plugin.settings.newNoteCancelButtonReverse = newValue;
					this.plugin.saveSettings();
				});
			});

		containerEl.createEl('h2', { text: 'Weekly Notes Settings' });

		new Setting(containerEl)
			.setName('Enable Weekly Notes')
			.setDesc(
				`Click on a week number in the calendar to open the weekly note of that week, or to create it if it
                doesn't exist yet. Week numbers with an existing weekly note are highlighted. Make sure that
                "Show Week Numbers" is enabled.`
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.weeklyNotesEnabled).onChange((newValue) => {
					this.plugin.settings.weeklyNotesEnabled = newValue;
					this.plugin.saveSettings();
					this.plugin.OZCALENDARDAYS_STATE = this.plugin.getNotesWithDates();
					this.plugin.calendarForceUpdate();
				});
			});

		new Setting(containerEl)
			.setName('Weekly Note Format')
			.setDesc(
				`File name format of the weekly notes. Leave empty to use the format matching the Calendar Type
                (ISO 8601: GGGG-[W]WW, US: gggg-[W]ww).`
			)
			.addText((text) => {
				text.setPlaceholder(getDefaultWeeklyNoteFormat(this.plugin))
					.setValue(this.plugin.settings.weeklyNoteFormat)
					.onChange((newValue) => {
						this.plugin.settings.weeklyNoteFormat = newValue.trim();
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});

		new Setting(containerEl)
			.setName('Weekly Notes Folder')
			.setDesc('Folder of the weekly notes. Leave empty to use the Default Folder Location of the new notes.')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(this.plugin.settings.defaultFolder)
					.setValue(this.plugin.settings.weeklyNotesFolder)
					.onChange((newFolder) => {
						this.plugin.settings.weeklyNotesFolder = newFolder;
						this.plugin.saveSettings();
						this.plugin.OZCALENDARDAYS_STATE = this.plugin.getNotesWithDates();
						this.plugin.calendarForceUpdate();
					});
			});

		new Setting(containerEl)
			.setName('Hide Weekly Notes from Days')
			.setDesc(
				`Don't show the notes in the Weekly Notes Folder as dots on the days of the calendar.
                Only applies if a separate Weekly Notes Folder is set.`
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.excludeWeeklyNotesFromDays).onChange((newValue) => {
					this.plugin.settings.excludeWeeklyNotesFromDays = newValue;
					this.plugin.saveSettings();
					this.plugin.OZCALENDARDAYS_STATE = this.plugin.getNotesWithDates();
					this.plugin.calendarForceUpdate();
				});
			});

		containerEl.createEl('h2', { text: 'Templates' });

		// Explain which template syntax is going to be processed, depending on Templater being enabled
		const templateStatusEl = containerEl.createEl('p', { cls: 'setting-item-description oz-calendar-template-status' });
		if (isTemplaterEnabled(this.plugin)) {
			templateStatusEl.createEl('strong', { text: '✅ Templater is enabled. ' });
			templateStatusEl.appendText(
				'<% … %> commands are run by Templater. {{date}}, {{title}}, {{time}}, {{date:FORMAT}} are filled in by OZ Calendar first, using the date of the note.'
			);
		} else {
			templateStatusEl.createEl('strong', { text: 'ℹ️ Templater is not enabled. ' });
			templateStatusEl.appendText(
				'Only {{date}}, {{title}}, {{time}}, {{date:FORMAT}} are filled in, using the date of the note. <% … %> commands stay as plain text.'
			);
		}
		templateStatusEl.createEl('br');
		templateStatusEl.appendText(
			"The {{…}} syntax is the same as the core Templates plugin, but it is filled in by OZ Calendar, so it doesn't depend on the core Templates settings."
		);

		this.addTemplateSetting({
			name: 'New Note Template',
			desc: 'Optional template file for the notes created with the calendar.',
			placeholder: 'Example: Templates/Daily.md',
			getValue: () => this.plugin.settings.dailyNoteTemplate,
			setValue: (value) => (this.plugin.settings.dailyNoteTemplate = value),
		});

		this.addTemplateSetting({
			name: 'Weekly Note Template',
			desc: 'Optional template file for the weekly notes. {{date}} is the first day of the week.',
			placeholder: 'Example: Templates/Weekly.md',
			getValue: () => this.plugin.settings.weeklyNoteTemplate,
			setValue: (value) => (this.plugin.settings.weeklyNoteTemplate = value),
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

		new Setting(containerEl)
			.setName('File Names Overflow Behaviour')
			.setDesc('Change the default behaviour for file names when they dont fit to the view')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('hide', 'Hide Overflow')
					.addOption('scroll', 'Scroll Overflow')
					.addOption('next-line', 'Show Overflow in the Next Line')
					.setValue(this.plugin.settings.fileNameOverflowBehaviour)
					.onChange((newValue: OverflowBehaviour) => {
						this.plugin.settings.fileNameOverflowBehaviour = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});
	}
	/**
	 * Adds a template file setting, which shows a warning if the template is missing or can't be fully processed
	 */
	addTemplateSetting(params: {
		name: string;
		desc: string;
		placeholder: string;
		getValue: () => string;
		setValue: (value: string) => void;
	}) {
		const setting = new Setting(this.containerEl).setName(params.name).setDesc(params.desc);
		const warningEl = setting.descEl.createDiv({ cls: 'oz-calendar-template-warning' });
		const updateWarning = async () => {
			const warning = await checkTemplate(this.plugin, params.getValue());
			warningEl.setText(warning ? '⚠️ ' + warning : '');
		};

		setting.addSearch((cb) => {
			new FileSuggest(this.app, cb.inputEl, () => getTemplatesFolder(this.plugin));
			cb.setPlaceholder(params.placeholder)
				.setValue(params.getValue())
				.onChange((newFile) => {
					params.setValue(newFile);
					this.plugin.saveSettings();
					updateWarning();
				});
		});
		updateWarning();
	}
}
