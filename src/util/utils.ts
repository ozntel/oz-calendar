import { TFile } from 'obsidian';
import OZCalendarPlugin from '../main';

/**
 * Helper to open a file passed in params within Obsidian (Tab/Separate)
 * @param params
 */
export const openFile = (params: {
	file: TFile;
	plugin: OZCalendarPlugin;
	newLeaf: boolean;
	leafBySplit?: boolean;
}) => {
	const { file, plugin, newLeaf, leafBySplit } = params;
	let leaf = plugin.app.workspace.getLeaf(newLeaf);
	if (!newLeaf && leafBySplit) leaf = plugin.app.workspace.createLeafBySplit(leaf, 'vertical');
	plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
	leaf.openFile(file, { eState: { focus: true } });
};

export function isMouseEvent(e: React.TouchEvent | React.MouseEvent): e is React.MouseEvent {
	return e && 'screenX' in e;
}

// Regex fragments matching the text each Moment.js format token produces
const DATE_TOKEN_PATTERNS: { [token: string]: string } = {
	YYYY: '\\d{4}',
	gggg: '\\d{4}',
	GGGG: '\\d{4}',
	YY: '\\d{2}',
	gg: '\\d{2}',
	GG: '\\d{2}',
	MMMM: '\\p{L}+\\.?',
	MMM: '\\p{L}+\\.?',
	dddd: '\\p{L}+\\.?',
	ddd: '\\p{L}+\\.?',
	dd: '\\p{L}+\\.?',
	Do: '\\d{1,2}\\p{L}*\\.?',
	DDDD: '\\d{3}',
	DDD: '\\d{1,3}',
	MM: '\\d{2}',
	DD: '\\d{2}',
	HH: '\\d{2}',
	hh: '\\d{2}',
	kk: '\\d{2}',
	mm: '\\d{2}',
	ss: '\\d{2}',
	ww: '\\d{2}',
	WW: '\\d{2}',
	M: '\\d{1,2}',
	D: '\\d{1,2}',
	H: '\\d{1,2}',
	h: '\\d{1,2}',
	k: '\\d{1,2}',
	m: '\\d{1,2}',
	s: '\\d{1,2}',
	w: '\\d{1,2}',
	W: '\\d{1,2}',
	d: '\\d',
	E: '\\d',
	e: '\\d',
	Q: '\\d',
	A: '[\\p{L}.]+',
	a: '[\\p{L}.]+',
	X: '\\d+',
	x: '\\d+',
	ZZ: '[+-]\\d{4}',
	Z: '[+-]\\d{2}:\\d{2}',
};

const DATE_TOKEN_REGEX = new RegExp(
	'\\[([^\\]]*)\\]|S+|' +
		Object.keys(DATE_TOKEN_PATTERNS)
			.sort((a, b) => b.length - a.length)
			.join('|') +
		'|.',
	'g'
);

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * Builds a regex that finds text written in the given Moment.js date format anywhere in a string.
 * Digits right before or after the match are not allowed, so "12026-10-31" doesn't match "YYYY-MM-DD".
 */
export const dateFormatToRegex = (format: string): RegExp => {
	const body = format.replace(DATE_TOKEN_REGEX, (token: string, escaped?: string) => {
		if (escaped !== undefined) return escapeRegex(escaped);
		if (token in DATE_TOKEN_PATTERNS) return DATE_TOKEN_PATTERNS[token];
		if (/^S+$/.test(token)) return '\\d+';
		return escapeRegex(token);
	});
	return new RegExp(`(?<!\\d)${body}(?!\\d)`, 'gu');
};

/**
 * Returns the parts of the input that look like the given date format, in order of position.
 * Overlapping parts are included, so a strict parser can skip the ones that are not real dates.
 */
export const findDateCandidates = (input: string, format: string): string[] => {
	const regex = dateFormatToRegex(format);
	const candidates: string[] = [];
	let match: RegExpExecArray | null;
	while ((match = regex.exec(input)) !== null) {
		candidates.push(match[0]);
		regex.lastIndex = match.index + 1;
	}
	return candidates;
};
