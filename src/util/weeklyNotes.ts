import { Notice, TAbstractFile, TFile, TFolder, moment, normalizePath } from 'obsidian';
import OZCalendarPlugin from '../main';
import { openFile } from './utils';
import { createNoteFromTemplate } from './templates';
import { CreateNoteModal } from '../modal';

// Obsidian's bundled moment follows the language set in Obsidian
const obsidianMoment = moment as unknown as typeof import('moment');

/**
 * Returns a moment instance for the week of the date, using the same week rules as the calendar:
 * ISO 8601 weeks start on Monday, US weeks start on Sunday with week 1 containing January 1st
 * ('en' locale week rules), so that gggg/ww match the week numbers displayed in the calendar
 * @param plugin
 * @param date
 */
const getWeekMoment = (plugin: OZCalendarPlugin, date: Date) => {
	let weekMoment = obsidianMoment(date);
	if (plugin.settings.calendarType === 'US') weekMoment = weekMoment.locale('en');
	return weekMoment;
};

export const getDefaultWeeklyNoteFormat = (plugin: OZCalendarPlugin): string => {
	return plugin.settings.calendarType === 'US' ? 'gggg-[W]ww' : 'GGGG-[W]WW';
};

export const getWeeklyNoteName = (plugin: OZCalendarPlugin, date: Date): string => {
	const format = plugin.settings.weeklyNoteFormat || getDefaultWeeklyNoteFormat(plugin);
	return getWeekMoment(plugin, date).format(format);
};

export const getWeeklyNotesFolder = (plugin: OZCalendarPlugin): string => {
	return normalizePath(plugin.settings.weeklyNotesFolder || plugin.settings.defaultFolder || '/');
};

/**
 * Returns the first day of the week of the date, using the week start of the calendar type
 * @param plugin
 * @param date
 */
export const getStartOfWeek = (plugin: OZCalendarPlugin, date: Date): Date => {
	const unit = plugin.settings.calendarType === 'US' ? 'week' : 'isoWeek';
	return getWeekMoment(plugin, date).startOf(unit).toDate();
};

export const getWeeklyNote = (plugin: OZCalendarPlugin, date: Date): TFile | null => {
	const folder = getWeeklyNotesFolder(plugin);
	const fileName = getWeeklyNoteName(plugin, date) + '.md';
	const file = plugin.app.vault.getAbstractFileByPath(normalizePath(folder === '/' ? fileName : `${folder}/${fileName}`));
	return file instanceof TFile ? file : null;
};

/**
 * Checks if the file is within a separate weekly notes folder, which should be excluded from the days
 * @param plugin
 * @param file
 */
export const isExcludedWeeklyNote = (plugin: OZCalendarPlugin, file: TAbstractFile): boolean => {
	const { weeklyNotesEnabled, excludeWeeklyNotesFromDays, weeklyNotesFolder } = plugin.settings;
	if (!weeklyNotesEnabled || !excludeWeeklyNotesFromDays || weeklyNotesFolder === '') return false;
	const folder = normalizePath(weeklyNotesFolder);
	if (folder === '/') return false;
	return file.path.startsWith(folder + '/');
};

/**
 * Opens the weekly note of the week of the date. If it doesn't exist, creates it directly or using the modal
 * depending on the "Show Destination Folder during Create" setting
 * @param plugin
 * @param date
 * @param newLeaf
 */
export const openWeeklyNote = async (plugin: OZCalendarPlugin, date: Date, newLeaf: boolean = false) => {
	const existingNote = getWeeklyNote(plugin, date);
	if (existingNote) {
		openFile({ file: existingNote, plugin: plugin, newLeaf: newLeaf });
		return;
	}

	if (plugin.settings.showDestinationFolderDuringCreate) {
		new CreateNoteModal(plugin, date, { weekly: true }).open();
		return;
	}

	const folder = plugin.app.vault.getAbstractFileByPath(getWeeklyNotesFolder(plugin));
	if (!(folder instanceof TFolder)) {
		new Notice('Weekly notes folder couldnt be found in the Vault');
		return;
	}
	const newFile = await createNoteFromTemplate({
		plugin: plugin,
		folder: folder,
		fileName: getWeeklyNoteName(plugin, date),
		date: getStartOfWeek(plugin, date),
		templatePath: plugin.settings.weeklyNoteTemplate,
	});
	openFile({ file: newFile, plugin: plugin, newLeaf: newLeaf });
};
