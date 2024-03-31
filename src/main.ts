import { CachedMetadata, Menu, Plugin, TAbstractFile, TFile, addIcon } from 'obsidian';
import { OZCalendarView, VIEW_TYPE } from 'view';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { DayChangeCommandAction, OZCalendarDaysMap, fileToOZItem } from 'types';
import { OZCAL_ICON } from './util/icons';
import { OZCalendarPluginSettings, DEFAULT_SETTINGS, OZCalendarPluginSettingsTab } from './settings/settings';
import { CreateNoteModal } from 'modal';

export default class OZCalendarPlugin extends Plugin {
	settings: OZCalendarPluginSettings;
	dayjs = dayjs;
	OZCALENDARDAYS_STATE: OZCalendarDaysMap = {};
	initialScanCompleted: boolean = false;
	EVENT_TYPES = {
		forceUpdate: 'ozCalendarForceUpdate',
		changeDate: 'ozCalendarChangeDate',
		createNote: 'ozCalendarCreateNote',
	};

	dayMonthSelectorQuery = '.oz-calendar-plugin-view .react-calendar__tile.react-calendar__month-view__days__day';

	async onload() {
		addIcon('OZCAL_ICON', OZCAL_ICON);

		dayjs.extend(customParseFormat);

		// Load Settings
		this.addSettingTab(new OZCalendarPluginSettingsTab(this.app, this));
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => {
			return new OZCalendarView(leaf, this);
		});

		this.app.metadataCache.on('resolved', () => {
			// Run only during initial vault load, changes are handled separately
			if (!this.initialScanCompleted) {
				this.OZCALENDARDAYS_STATE = this.getNotesWithDates();
				this.initialScanCompleted = true;
				this.calendarForceUpdate();
			}
		});

		this.app.workspace.onLayoutReady(() => {
			this.OZCALENDARDAYS_STATE = this.getNotesWithDates();
			if (this.settings.openViewOnStart) {
				this.openOZCalendarLeaf({ showAfterAttach: true });
			}
		});

		this.registerEvent(this.app.metadataCache.on('changed', this.handleCacheChange));
		this.registerEvent(this.app.vault.on('rename', this.handleRename));
		this.registerEvent(this.app.vault.on('delete', this.handleDelete));
		this.registerEvent(this.app.vault.on('create', this.handleCreate));

		// Add Event Handler for Custom Note Creation
		document.on('contextmenu', this.dayMonthSelectorQuery, this.handleMonthDayContextMenu);

		this.addCommand({
			id: 'oz-calendar-next-day',
			name: 'Go to Next Day',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.changeDate, {
						detail: {
							action: 'next-day' as DayChangeCommandAction,
						},
					})
				);
			},
		});

		this.addCommand({
			id: 'oz-calendar-previous-day',
			name: 'Go to Previous Day',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.changeDate, {
						detail: {
							action: 'previous-day' as DayChangeCommandAction,
						},
					})
				);
			},
		});

		this.addCommand({
			id: 'oz-calendar-today',
			name: 'Go to Today',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.changeDate, {
						detail: {
							action: 'today' as DayChangeCommandAction,
						},
					})
				);
			},
		});

		this.addCommand({
			id: 'oz-calendar-new-note',
			name: 'Create a New Note',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.createNote, {
						detail: {},
					})
				);
			},
		});

		this.addCommand({
			id: 'oz-calendar-open-leaf',
			name: 'Open OZ Calendar',
			callback: () => {
				this.openOZCalendarLeaf({ showAfterAttach: true });
			},
		});
	}

	onunload() {
		// Remove Event Handler for Custom Note Creation
		document.off('contextmenu', this.dayMonthSelectorQuery, this.handleMonthDayContextMenu);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/* ------------ HANDLE VAULT CHANGES - HELPERS ------------ */

	/**
	 * Adds the provided filePath to the corresponding date within plugin state
	 * @param date
	 * @param filePath
	 */
	addFilePathToState = (date: string, file: TFile) => {
		let newStateMap = this.OZCALENDARDAYS_STATE;
		// if exists, add the new file path
		if (date in newStateMap) {
			newStateMap[date] = [...newStateMap[date], fileToOZItem({ note: file })];
		} else {
			newStateMap[date] = [fileToOZItem({ note: file })];
		}
		this.OZCALENDARDAYS_STATE = newStateMap;
	};

	/**
	 * Scans the plugin state and removes the file path if found
	 * @param filePath
	 * @returns true if the file path is found and deleted
	 */
	removeFilePathFromState = (filePath: string): boolean => {
		let changeFlag = false;
		let newStateMap = this.OZCALENDARDAYS_STATE;
		for (let k of Object.keys(newStateMap)) {
			if (newStateMap[k].some((ozItem) => ozItem.type === 'note' && ozItem.path === filePath)) {
				newStateMap[k] = newStateMap[k].filter((ozItem) => {
					return !(ozItem.type === 'note' && ozItem.path === filePath);
				});
				changeFlag = true;
			}
		}
		this.OZCALENDARDAYS_STATE = newStateMap;
		return changeFlag;
	};

	/**
	 * Scans the file provided for users date key and adds to the plugin state
	 * @param file
	 * @returns boolean (if any change happened, true)
	 */
	scanTFileDate = (file: TFile): boolean => {
		let cache = this.app.metadataCache.getCache(file.path);
		let changeFlag = false;
		if (cache && cache.frontmatter) {
			let fm = cache.frontmatter;
			for (let k of Object.keys(cache.frontmatter)) {
				if (k === this.settings.yamlKey) {
					let fmValue = String(fm[k]);
					let parsedDayISOString = dayjs(fmValue, this.settings.dateFormat).format('YYYY-MM-DD');
					this.addFilePathToState(parsedDayISOString, file);
					changeFlag = true;
				}
			}
		}
		return changeFlag;
	};

	/**
	 * Use this function to force update the calendar and file list view
	 */
	calendarForceUpdate = () => {
		window.dispatchEvent(
			new CustomEvent(this.EVENT_TYPES.forceUpdate, {
				detail: {},
			})
		);
	};

	/* ------------ HANDLE VAULT CHANGES - LISTENER FUNCTIONS ------------ */

	handleCacheChange = (file: TFile, data: string, cache: CachedMetadata) => {
		if (this.settings.dateSource === 'yaml') {
			this.removeFilePathFromState(file.path);
			if (cache && cache.frontmatter) {
				let fm = cache.frontmatter;
				for (let k of Object.keys(cache.frontmatter)) {
					if (k === this.settings.yamlKey) {
						let fmValue = String(fm[k]);
						let parsedDayISOString = dayjs(fmValue, this.settings.dateFormat).format('YYYY-MM-DD');
						// If date doesn't exist, create a new one
						if (!(parsedDayISOString in this.OZCALENDARDAYS_STATE)) {
							this.addFilePathToState(parsedDayISOString, file);
						} else {
							// if date exists and note is not in the date list
							if (!(file.path in this.OZCALENDARDAYS_STATE[parsedDayISOString])) {
								this.addFilePathToState(parsedDayISOString, file);
							}
						}
					}
				}
			}
			this.calendarForceUpdate();
		} else if (this.settings.dateSource === 'filename') {
			// No action needed
		}
	};

	handleRename = (file: TFile, oldPath: string) => {
		let changeFlag = false;
		if (file instanceof TFile && file.extension === 'md') {
			for (let k of Object.keys(this.OZCALENDARDAYS_STATE)) {
				for (let ozItem of this.OZCALENDARDAYS_STATE[k]) {
					if (ozItem.type === 'note' && ozItem.path === oldPath) {
						if (this.settings.dateSource === 'yaml') {
							ozItem.path = file.path;
							ozItem.displayName = file.basename;
							changeFlag = true;
						} else if (this.settings.dateSource === 'filename') {
							this.OZCALENDARDAYS_STATE[k] = this.OZCALENDARDAYS_STATE[k].filter((ozItem) => {
								return !(ozItem.type === 'note' && ozItem.path === oldPath);
							});
							changeFlag = true;
						}
					}
				}
			}
		}

		// Make sure that you scan the new file name for filename source
		if (this.settings.dateSource === 'filename' && dayjs(file.name, this.settings.dateFormat).isValid()) {
			let parsedDayISOString = dayjs(file.name, this.settings.dateFormat).format('YYYY-MM-DD');
			if (parsedDayISOString in this.OZCALENDARDAYS_STATE) {
				this.OZCALENDARDAYS_STATE[parsedDayISOString] = [
					...this.OZCALENDARDAYS_STATE[parsedDayISOString],
					fileToOZItem({ note: file }),
				];
			} else {
				this.OZCALENDARDAYS_STATE[parsedDayISOString] = [fileToOZItem({ note: file })];
			}
			changeFlag = true;
		}

		// If change happened force update the component
		if (changeFlag) this.calendarForceUpdate();
	};

	handleDelete = (file: TAbstractFile) => {
		let changeFlag = this.removeFilePathFromState(file.path);
		if (changeFlag) this.calendarForceUpdate();
	};

	handleCreate = (file: TAbstractFile) => {
		if (file instanceof TFile && file.extension === 'md' && this.settings.dateSource === 'filename') {
			if (dayjs(file.name, this.settings.dateFormat).isValid()) {
				let parsedDayISOString = dayjs(file.name, this.settings.dateFormat).format('YYYY-MM-DD');
				if (parsedDayISOString in this.OZCALENDARDAYS_STATE) {
					this.OZCALENDARDAYS_STATE[parsedDayISOString] = [
						...this.OZCALENDARDAYS_STATE[parsedDayISOString],
						fileToOZItem({ note: file }),
					];
				} else {
					this.OZCALENDARDAYS_STATE[parsedDayISOString] = [fileToOZItem({ note: file })];
				}
			}
			this.calendarForceUpdate();
		}
	};

	/* ------------ OTHER FUNCTIONS ------------ */

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
			if (this.settings.dateSource === 'yaml') {
				// Get the file Cache
				let fileCache = app.metadataCache.getFileCache(mdFile);
				// Check if there is Frontmatter
				if (fileCache && fileCache.frontmatter) {
					let fm = fileCache.frontmatter;
					// Check the FM keys vs the provided key by the user in settings
					for (let k of Object.keys(fm)) {
						if (k === this.settings.yamlKey) {
							let fmValue = String(fm[k]);
							// Parse the date with provided date format
							let parsedDayJsDate = dayjs(fmValue, this.settings.dateFormat);
							// Take only YYYY-MM-DD part fromt the date as String
							let parsedDayISOString = parsedDayJsDate.format('YYYY-MM-DD');
							// Check if it already exists
							if (parsedDayISOString in OZCalendarDays) {
								OZCalendarDays[parsedDayISOString] = [
									...OZCalendarDays[parsedDayISOString],
									fileToOZItem({ note: mdFile }),
								];
							} else {
								OZCalendarDays[parsedDayISOString] = [fileToOZItem({ note: mdFile })];
							}
						}
					}
				}
			} else if (this.settings.dateSource === 'filename') {
				let dateFormatLength = this.settings.dateFormat.length;
				if (mdFile.name.length >= dateFormatLength) {
					if (dayjs(mdFile.name, this.settings.dateFormat).isValid()) {
						let parsedDayISOString = dayjs(mdFile.name, this.settings.dateFormat).format('YYYY-MM-DD');
						if (parsedDayISOString in OZCalendarDays) {
							OZCalendarDays[parsedDayISOString] = [
								...OZCalendarDays[parsedDayISOString],
								fileToOZItem({ note: mdFile }),
							];
						} else {
							OZCalendarDays[parsedDayISOString] = [fileToOZItem({ note: mdFile })];
						}
					}
				}
			}
		}
		return OZCalendarDays;
	};

	handleMonthDayContextMenu = (ev: MouseEvent, delegateTarget: HTMLElement) => {
		let abbrItem = delegateTarget.querySelector('abbr[aria-label]');
		if (abbrItem) {
			let destDate = abbrItem.getAttr('aria-label');
			if (destDate && destDate.length > 0) {
				let dayjsDate = dayjs(destDate, 'MMMM D, YYYY');
				let menu = new Menu();
				menu.addItem((menuItem) => {
					menuItem
						.setTitle('Create a note for this date')
						.setIcon('create-new')
						.onClick((evt) => {
							let modal = new CreateNoteModal(this, dayjsDate.toDate());
							modal.open();
						});
				});
				menu.showAtPosition({ x: ev.pageX, y: ev.pageY });
			}
		}
	};
}
