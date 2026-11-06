import OZCalendarPlugin from 'main';
import { getAllTags } from 'obsidian';
import { OZItem } from 'types';
import { compileFilterQuery, FilterQueryError } from './filterQuery';

export const isFilterActive = (plugin: OZCalendarPlugin): boolean => {
	return plugin.noteFilter !== null;
};

/**
 * Whether an item passes the applied filter query. Items other than notes are never filtered.
 */
export const isItemVisible = (plugin: OZCalendarPlugin, item: OZItem): boolean => {
	if (item.type !== 'note' || !isFilterActive(plugin) || !plugin.noteFilter) return true;
	const cache = plugin.app.metadataCache.getCache(item.path);
	const fileName = item.path.substring(item.path.lastIndexOf('/') + 1).replace(/\.md$/i, '');
	return plugin.noteFilter({
		name: fileName,
		path: item.path,
		tags: cache ? getAllTags(cache) ?? [] : [],
		frontmatter: cache?.frontmatter,
	});
};

/**
 * Compiles and applies a filter query, saves it and refreshes the calendar.
 * Returns an error message instead when the query is invalid, leaving the current filter as it is.
 */
export const applyFilterQuery = (plugin: OZCalendarPlugin, query: string): string | null => {
	try {
		plugin.noteFilter = compileFilterQuery(query);
	} catch (e) {
		if (e instanceof FilterQueryError) return e.message;
		throw e;
	}
	plugin.settings.filterQuery = query.trim();
	plugin.saveSettings();
	plugin.calendarForceUpdate();
	return null;
};

/**
 * Compiles the saved query when the plugin loads. An invalid saved query is ignored.
 */
export const loadFilterQuery = (plugin: OZCalendarPlugin) => {
	try {
		plugin.noteFilter = compileFilterQuery(plugin.settings.filterQuery);
	} catch (e) {
		plugin.noteFilter = null;
	}
};
