import OZCalendarPlugin from 'main';
import { PluginSettingTab, App, Setting } from 'obsidian';
import { FolderSuggest } from 'settings/suggestor';

export interface OZCalendarPluginSettings {
	openViewOnStart: boolean;
	yamlKey: string;
	dateFormat: string;
	defaultFolder: string;
}

export const DEFAULT_SETTINGS: OZCalendarPluginSettings = {
	openViewOnStart: true,
	yamlKey: 'created',
	dateFormat: 'YYYY-MM-DD hh:mm:ss',
	defaultFolder: '/',
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
			.setName('YAML Key')
			.setDesc('Set the YAML Key that should be used for displaying in the calendar')
			.addText((text) => {
				text.setValue(this.plugin.settings.yamlKey).onChange((newValue) => {
					this.plugin.settings.yamlKey = newValue;
					this.plugin.saveSettings();
				});
			});

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

		new Setting(this.containerEl)
			.setName('Default Folder Location')
			.setDesc('Select the defaukt folder, under which the new files should be saved')
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl);
				cb.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.defaultFolder)
					.onChange((new_folder) => {
						this.plugin.settings.defaultFolder = new_folder;
						this.plugin.saveSettings();
					});
				// @ts-ignore
				cb.containerEl.addClass('templater_search');
			});
	}
}
