import OZCalendarPlugin from 'main';

/**
 * Reads the frontmatter key configured as "File List Badge Property" and returns its value(s) as badge labels
 */
export const getBadgeValues = (plugin: OZCalendarPlugin, filePath: string): string[] => {
	const badgeProperty = plugin.settings.badgeProperty;
	if (!badgeProperty) return [];
	const fm = plugin.app.metadataCache.getCache(filePath)?.frontmatter;
	if (!fm) return [];
	const raw = fm[badgeProperty];
	const items: unknown[] = Array.isArray(raw) ? raw : [raw];
	const values = items
		.filter((item) => ['string', 'number', 'boolean'].includes(typeof item))
		.map((item) =>
			String(item)
				.replace(/^\[\[(?:[^\]|]*\|)?([^\]]*)\]\]$/, '$1') // [[link|alias]] -> alias
				.replace(/^#/, '')
				.trim()
		)
		.filter((value) => value.length > 0);
	return Array.from(new Set(values)).slice(0, 3);
};

/**
 * Stable hue per value (case-insensitive), so the same value always gets the same color
 */
export const getBadgeHue = (value: string): number => {
	const key = value.toLowerCase();
	let hash = 0;
	for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
	return Math.abs(hash) % 360;
};
