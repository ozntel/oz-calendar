import { CachedMetadata, Plugin, TFile, addIcon } from 'obsidian';
import { OZCalendarView, VIEW_TYPE } from './view';
import dayjs from 'dayjs';
import { OZCalendarDaysMap } from './types';
import { OZCAL_ICON } from './util/icons';
import { OZCalendarPluginSettings, DEFAULT_SETTINGS, OZCalendarPluginSettingsTab } from 'settings';

export default class OZCalendarPlugin extends Plugin {
	settings: OZCalendarPluginSettings;
	OZCALENDARDAYS_STATE: OZCalendarDaysMap = {};
	EVENT_TYPES = {
		forceUpdate: 'ozCalendarForceUpdate',
	};

	async onload() {
		addIcon('OZCAL_ICON', OZCAL_ICON);

		// Load Settings
		this.addSettingTab(new OZCalendarPluginSettingsTab(this.app, this));
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => {
			return new OZCalendarView(leaf, this);
		});

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.openViewOnStart) {
				this.openOZCalendarLeaf({ showAfterAttach: true });
			}
			this.OZCALENDARDAYS_STATE = this.getNotesWithDates();
		});

		this.app.metadataCache.on('changed', this.handleCacheChange);
		this.app.vault.on('rename', (file, oldPath) => {
			if (file instanceof TFile && file.extension === 'md') {
				this.removeFilePathFromState(oldPath);
				this.scanTFileDate(file);
			}
		});
	}

	scanTFileDate = (file: TFile) => {
		let cache = this.app.metadataCache.getCache(file.path);
		if (cache && cache.frontmatter) {
			let fm = cache.frontmatter;
			for (let k of Object.keys(cache.frontmatter)) {
				if (k === this.settings.yamlKey) {
					let fmValue = fm[k];
					let parsedDayISOString = dayjs(fmValue, this.settings.dateFormat).format('YYYY-MM-DD');
					this.addFilePathToState(parsedDayISOString, file.path);
				}
			}
		}
	};

	addFilePathToState = (date: string, filePath: string) => {
		let newStateMap = this.OZCALENDARDAYS_STATE;
		// if exists, add the new file path
		if (date in newStateMap) {
			newStateMap[date] = [...newStateMap[date], filePath];
		} else {
			newStateMap[date] = [filePath];
		}
		this.OZCALENDARDAYS_STATE = newStateMap;
	};

	removeFilePathFromState = (filePath: string) => {
		let newStateMap = this.OZCALENDARDAYS_STATE;
		for (let k of Object.keys(newStateMap)) {
			if (newStateMap[k].contains(filePath)) {
				newStateMap[k] = newStateMap[k].filter((p) => p !== filePath);
			}
		}
		this.OZCALENDARDAYS_STATE = newStateMap;
	};

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	handleCacheChange = (file: TFile, data: string, cache: CachedMetadata) => {
		this.removeFilePathFromState(file.path);
		if (cache && cache.frontmatter) {
			let fm = cache.frontmatter;
			for (let k of Object.keys(cache.frontmatter)) {
				if (k === this.settings.yamlKey) {
					let fmValue = fm[k];
					let parsedDayISOString = dayjs(fmValue, this.settings.dateFormat).format('YYYY-MM-DD');
					// If date doesn't exist, create a new one
					if (!(parsedDayISOString in this.OZCALENDARDAYS_STATE)) {
						this.addFilePathToState(parsedDayISOString, file.path);
					} else {
						// if date exists and note is not in the date list
						if (!(file.path in this.OZCALENDARDAYS_STATE[parsedDayISOString])) {
							this.addFilePathToState(parsedDayISOString, file.path);
						}
					}
				}
			}
		}
		this.calendarForceUpdate();
	};

	openOZCalendarLeaf = async (params: { showAfterAttach: boolean }) => {
		const { showAfterAttach } = params;
		let leafs = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (leafs.length === 0) {
			let leaf = this.app.workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE });
			if (showAfterAttach) this.app.workspace.revealLeaf(leaf);
		} else {
			if (showAfterAttach && leafs.length > 0) {
				this.app.workspace.revealLeaf(leafs[0]);
			}
		}
	};

	calendarForceUpdate = () => {
		window.dispatchEvent(
			new CustomEvent(this.EVENT_TYPES.forceUpdate, {
				detail: {},
			})
		);
	};

	reloadPlugin = () => {
		// @ts-ignore
		this.app.plugins.disablePlugin('oz-calendar');
		// @ts-ignore
		this.app.plugins.enablePlugin('oz-calendar');
	};

	getNotesWithDates = (): OZCalendarDaysMap => {
		let mdFiles = this.app.vault.getMarkdownFiles();
		let OZCalendarDays: OZCalendarDaysMap = {};
		for (let mdFile of mdFiles) {
			// Get the file Cache
			let fileCache = app.metadataCache.getFileCache(mdFile);
			// Check if there is Frontmatter
			if (fileCache && fileCache.frontmatter) {
				let fm = fileCache.frontmatter;
				// Check the FM keys vs the provided key by the user in settings @todo
				for (let k of Object.keys(fm)) {
					if (k === this.settings.yamlKey) {
						let fmValue = fm[k];
						// Parse the date with provided date format
						let parsedDayJsDate = dayjs(fmValue, this.settings.dateFormat);
						// Take only YYYY-MM-DD part fromt the date as String
						let parsedDayISOString = parsedDayJsDate.format('YYYY-MM-DD');
						// Check if it already exists
						if (parsedDayISOString in OZCalendarDays) {
							OZCalendarDays[parsedDayISOString] = [
								...OZCalendarDays[parsedDayISOString],
								mdFile.path,
							];
						} else {
							OZCalendarDays[parsedDayISOString] = [mdFile.path];
						}
					}
				}
			}
		}
		return OZCalendarDays;
	};
}
