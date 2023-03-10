import { CachedMetadata, Plugin, TFile } from 'obsidian';
import { OZCalendarView, VIEW_TYPE } from './view';
import dayjs from 'dayjs';
import { OZCalendarDaysMap } from './types';

export default class OZCalendarPlugin extends Plugin {
	FM_KEY: string = 'created';
	FM_FORMAT: string = 'YYYY-MM-DD hh:mm:ss';
	OZCALENDARDAYS_STATE: OZCalendarDaysMap = {};
	EVENT_TYPES = {
		forceUpdate: 'ozCalendarForceUpdate',
	};

	async onload() {
		this.registerView(VIEW_TYPE, (leaf) => {
			return new OZCalendarView(leaf, this);
		});

		this.app.workspace.onLayoutReady(() => {
			this.openOZCalendarLeaf({ showAfterAttach: true });
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
				if (k === this.FM_KEY) {
					let fmValue = fm[k];
					let parsedDayISOString = dayjs(fmValue, this.FM_FORMAT).format('YYYY-MM-DD');
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

	handleCacheChange = (file: TFile, data: string, cache: CachedMetadata) => {
		this.removeFilePathFromState(file.path);
		if (cache && cache.frontmatter) {
			let fm = cache.frontmatter;
			for (let k of Object.keys(cache.frontmatter)) {
				if (k === this.FM_KEY) {
					let fmValue = fm[k];
					let parsedDayISOString = dayjs(fmValue, this.FM_FORMAT).format('YYYY-MM-DD');
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
			let leaf = this.app.workspace.getLeftLeaf(false);
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
					if (k === this.FM_KEY) {
						let fmValue = fm[k];
						// Parse the date with provided date format
						let parsedDayJsDate = dayjs(fmValue, this.FM_FORMAT);
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
