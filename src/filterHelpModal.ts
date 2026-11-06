import OZCalendarPlugin from 'main';
import { Modal } from 'obsidian';

// Examples shown in the help window. Clicking one adds it to the filter query.
const FILTER_HELP_SECTIONS: { title: string; examples: { query: string; description: string }[] }[] = [
	{
		title: 'Match',
		examples: [
			{ query: 'meeting', description: 'File name contains "meeting"' },
			{ query: '"weekly review"', description: 'File name contains the exact phrase' },
			{ query: 'file:standup', description: 'File name contains "standup"' },
			{ query: 'path:Work/', description: 'File path contains "Work/"' },
			{ query: 'tag:#work', description: 'Has #work or a nested tag like #work/client' },
		],
	},
	{
		title: 'Properties',
		examples: [
			{ query: '[status]', description: 'Has the "status" property' },
			{ query: '[type:meeting]', description: '"type" contains "meeting" (any item of a list)' },
			{ query: '[type:"1:1"]', description: 'Quote values with spaces or colons' },
			{ query: '[due:null]', description: '"due" exists but is empty' },
		],
	},
	{
		title: 'Combine',
		examples: [
			{ query: 'tag:#work [type:meeting]', description: 'Both must match' },
			{ query: 'standup OR retro', description: 'Either one matches' },
			{ query: '-tag:#archive', description: 'Exclude matches' },
			{ query: '(standup OR retro) -path:Archive/', description: 'Group with parentheses' },
			{ query: 'file:/^2024-/', description: 'Regular expression between slashes' },
		],
	},
];

/**
 * Floating help window for the filter syntax. Clicking an example passes it to onSelect and closes the window.
 */
export class FilterHelpModal extends Modal {
	onSelect: (example: string) => void;

	constructor(plugin: OZCalendarPlugin, onSelect: (example: string) => void) {
		super(plugin.app);
		this.onSelect = onSelect;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass('oz-calendar-filter-help-modal');
		this.titleEl.setText('Filter Notes');

		contentEl.createEl('p', {
			cls: 'oz-calendar-filter-help-intro',
			text: 'Filters the calendar dots and the file list, like Obsidian Search. Click an example to add it to your filter, then press Apply or Enter.',
		});

		for (const section of FILTER_HELP_SECTIONS) {
			const sectionEl = contentEl.createDiv({ cls: 'oz-calendar-filter-help-section' });
			sectionEl.createDiv({ cls: 'oz-calendar-filter-help-title', text: section.title });
			for (const example of section.examples) {
				const exampleEl = sectionEl.createDiv({ cls: 'oz-calendar-filter-help-example' });
				exampleEl.setAttribute('aria-label', 'Add to filter');
				exampleEl.createEl('code', { text: example.query });
				exampleEl.createSpan({ text: example.description });
				exampleEl.addEventListener('click', () => {
					this.onSelect(example.query);
					this.close();
				});
			}
		}

		contentEl.createDiv({
			cls: 'oz-calendar-filter-help-note',
			text: 'Matching ignores case. Note content is not searched.',
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
