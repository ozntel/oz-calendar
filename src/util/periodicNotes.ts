import { Notice, TAbstractFile, TFile, TFolder, moment, normalizePath } from 'obsidian';
import OZCalendarPlugin from '../main';
import { openFile } from './utils';
import { createNoteFromTemplate } from './templates';

// Obsidian's bundled moment follows the language set in Obsidian
const obsidianMoment = moment as unknown as typeof import('moment');

export type PeriodType = 'daily' | 'weekly';

export const PERIOD_LABELS: { [period in PeriodType]: string } = {
	daily: 'Daily Note',
	weekly: 'Weekly Note',
};

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

/**
 * Daily notes use the File Name Prefix of the new notes by default, so a daily note is named
 * like a new note without a title
 */
export const getDefaultDailyNoteFormat = (plugin: OZCalendarPlugin): string => {
	return plugin.settings.defaultFileNamePrefix.trim() || 'YYYY-MM-DD';
};

export const isPeriodEnabled = (plugin: OZCalendarPlugin, period: PeriodType): boolean => {
	return period === 'daily' ? plugin.settings.dailyNotesEnabled : plugin.settings.weeklyNotesEnabled;
};

export const isAnyPeriodEnabled = (plugin: OZCalendarPlugin): boolean => {
	return plugin.settings.dailyNotesEnabled || plugin.settings.weeklyNotesEnabled;
};

export const getPeriodicNoteName = (plugin: OZCalendarPlugin, period: PeriodType, date: Date): string => {
	if (period === 'daily') {
		return plugin.formatDate(date, plugin.settings.dailyNoteFormat || getDefaultDailyNoteFormat(plugin));
	}
	const format = plugin.settings.weeklyNoteFormat || getDefaultWeeklyNoteFormat(plugin);
	return getWeekMoment(plugin, date).format(format);
};

/**
 * Daily and weekly notes share the Periodic Notes Folder
 * @param plugin
 */
export const getPeriodicNotesFolder = (plugin: OZCalendarPlugin): string => {
	return normalizePath(plugin.settings.periodicNotesFolder || plugin.settings.defaultFolder || '/');
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

/**
 * Returns the date the periodic note is created for, which is used in the template variables
 */
export const getPeriodStart = (plugin: OZCalendarPlugin, period: PeriodType, date: Date): Date => {
	return period === 'weekly' ? getStartOfWeek(plugin, date) : date;
};

export const getPeriodicNoteTemplate = (plugin: OZCalendarPlugin, period: PeriodType): string => {
	if (period === 'weekly') return plugin.settings.weeklyNoteTemplate;
	return plugin.settings.dailyNoteTemplate || plugin.settings.newNoteTemplate;
};

/**
 * Date YAML for a new note on the date. Weekly notes don't get it, so they don't show up on a day
 */
export const getNewNoteFrontmatter = (
	plugin: OZCalendarPlugin,
	date: Date,
	period?: PeriodType
): Record<string, string> | undefined => {
	const { yamlKey, dateFormat, dateSource } = plugin.settings;
	if (period === 'weekly' || dateSource !== 'yaml') return undefined;
	return { [yamlKey]: plugin.formatDate(date, dateFormat) };
};

export const getPeriodicNote = (plugin: OZCalendarPlugin, period: PeriodType, date: Date): TFile | null => {
	const folder = getPeriodicNotesFolder(plugin);
	const fileName = getPeriodicNoteName(plugin, period, date) + '.md';
	const file = plugin.app.vault.getAbstractFileByPath(normalizePath(folder === '/' ? fileName : `${folder}/${fileName}`));
	return file instanceof TFile ? file : null;
};

/**
 * Checks if the file is a weekly note, which should be excluded from the days. A weekly note is a note
 * directly in the Periodic Notes Folder that is named in the Weekly Note Format. Daily notes in the
 * same folder are kept on their days
 * @param plugin
 * @param file
 */
export const isExcludedWeeklyNote = (plugin: OZCalendarPlugin, file: TAbstractFile): boolean => {
	const { weeklyNotesEnabled, excludeWeeklyNotesFromDays } = plugin.settings;
	if (!weeklyNotesEnabled || !excludeWeeklyNotesFromDays) return false;
	if (!(file instanceof TFile) || file.parent?.path !== getPeriodicNotesFolder(plugin)) return false;
	const format = plugin.settings.weeklyNoteFormat || getDefaultWeeklyNoteFormat(plugin);
	const parsed =
		plugin.settings.calendarType === 'US'
			? obsidianMoment(file.basename, format, 'en', true)
			: obsidianMoment(file.basename, format, true);
	return parsed.isValid() && getPeriodicNoteName(plugin, 'weekly', parsed.toDate()) === file.basename;
};

/**
 * Opens the periodic note of the date. If it doesn't exist, creates it directly in the Periodic Notes Folder,
 * since its name and folder are already set
 * @param plugin
 * @param period
 * @param date
 * @param newLeaf
 */
export const openPeriodicNote = async (
	plugin: OZCalendarPlugin,
	period: PeriodType,
	date: Date,
	newLeaf: boolean = false
) => {
	const existingNote = getPeriodicNote(plugin, period, date);
	if (existingNote) {
		openFile({ file: existingNote, plugin: plugin, newLeaf: newLeaf });
		return;
	}

	const folder = plugin.app.vault.getAbstractFileByPath(getPeriodicNotesFolder(plugin));
	if (!(folder instanceof TFolder)) {
		new Notice('Periodic notes folder couldnt be found in the Vault');
		return;
	}
	const newFile = await createNoteFromTemplate({
		plugin: plugin,
		folder: folder,
		fileName: getPeriodicNoteName(plugin, period, date),
		date: getPeriodStart(plugin, period, date),
		templatePath: getPeriodicNoteTemplate(plugin, period),
		frontmatter: getNewNoteFrontmatter(plugin, date, period),
	});
	openFile({ file: newFile, plugin: plugin, newLeaf: newLeaf });
};
