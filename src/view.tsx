import { ItemView, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom';
import OZCalendarPlugin from './main';
import MyCalendar from './components/calendar';

export const VIEW_TYPE = 'oz-calendar';
export const VIEW_DISPLAY_TEXT = 'OZ Calendar';
export const ICON = 'sheets-in-box';

export class OZCalendarView extends ItemView {
	plugin: OZCalendarPlugin;

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
		ReactDOM.unmountComponentAtNode(this.contentEl);
	}

	async onOpen() {
		this.destroy();
		ReactDOM.render(
			<div className="oz-calendar-plugin-view">
				<MyCalendar plugin={this.plugin} />
			</div>,
			this.contentEl
		);
	}
}
