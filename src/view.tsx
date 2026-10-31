import { ItemView, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import OZCalendarPlugin from './main';
import MyCalendar from './components/calendar';
import { createRoot, Root } from 'react-dom/client'; 

export const VIEW_TYPE = 'oz-calendar';
export const VIEW_DISPLAY_TEXT = 'OZ Calendar';
export const ICON = 'OZCAL_ICON';

export class OZCalendarView extends ItemView {
	plugin: OZCalendarPlugin;
	root: Root;

	constructor(leaf: WorkspaceLeaf, plugin: OZCalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return VIEW_DISPLAY_TEXT;
	}

	getIcon(): string {
		return ICON;
	}

	async onClose() {
		this.destroy();
	}

	destroy() {
		if (this.root) this.root.unmount();
		// Remove Event Handler for Custom Note Creation
		this.contentEl.off('contextmenu', this.plugin.dayMonthSelectorQuery, this.plugin.handleMonthDayContextMenu);
	}

	async onOpen() {
		this.destroy();
		this.root = createRoot(this.contentEl)
		this.root.render(<MyCalendar plugin={this.plugin} />);
		// Add Event Handler for Custom Note Creation. Attached to the view instead of the main document
		// so that it also works when the view is in a pop-out window
		this.contentEl.on('contextmenu', this.plugin.dayMonthSelectorQuery, this.plugin.handleMonthDayContextMenu);
	}
}
