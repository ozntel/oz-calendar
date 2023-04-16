import React, { useMemo } from 'react';
import { BsArrowRight, BsArrowLeft } from 'react-icons/bs';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { RiPhoneFindLine, RiAddCircleLine } from 'react-icons/ri';
import { MdToday } from 'react-icons/md';
import dayjs from 'dayjs';
import OZCalendarPlugin from 'main';
import { isMouseEvent, openFile } from '../util/utils';
import { Menu, TFile } from 'obsidian';
import { VIEW_TYPE } from 'view';

interface NoteListComponentParams {
	selectedDay: Date;
	setSelectedDay: (selectedDay: Date) => void;
	setActiveStartDate: (newActiveStartDate: Date) => void;
	createNote: () => void;
	plugin: OZCalendarPlugin;
	forceValue: number;
}

export default function NoteListComponent(params: NoteListComponentParams) {
	const { setSelectedDay, selectedDay, plugin, setActiveStartDate, forceValue, createNote } = params;

	const setNewSelectedDay = (nrChange: number) => {
		let newDate = dayjs(selectedDay).add(nrChange, 'day');
		setSelectedDay(newDate.toDate());
	};

	const extractFileName = (filePath: string) => {
		let lastIndexOfSlash = filePath.lastIndexOf('/');
		let endIndex = filePath.lastIndexOf('.');
		if (lastIndexOfSlash === -1) {
			return filePath.substring(0, endIndex);
		} else {
			return filePath.substring(lastIndexOfSlash + 1, endIndex);
		}
	};

	const openFilePath = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, filePath: string) => {
		let abstractFile = plugin.app.vault.getAbstractFileByPath(filePath);
		let openFileBehaviour = plugin.settings.openFileBehaviour;
		if (abstractFile && abstractFile instanceof TFile) {
			// Define the Default Open Behaviour by looking at the plugin settings
			let openInNewLeaf: boolean = openFileBehaviour === 'new-tab';
			let openInNewTabGroup: boolean = openFileBehaviour === 'new-tab-group';
			if (openFileBehaviour === 'obsidian-default') {
				openInNewLeaf = (e.ctrlKey || e.metaKey) && !(e.shiftKey || e.altKey);
				openInNewTabGroup = (e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey);
			}
			// Open the file by using the open file behaviours above
			openFile({
				file: abstractFile,
				plugin: plugin,
				newLeaf: openInNewLeaf,
				leafBySplit: openInNewTabGroup,
			});
		}
	};

	const selectedDayNotes = useMemo(() => {
		const selectedDayIso = dayjs(selectedDay).format('YYYY-MM-DD');
		let sortedList =
			selectedDayIso in plugin.OZCALENDARDAYS_STATE ? plugin.OZCALENDARDAYS_STATE[selectedDayIso] : [];
		sortedList = sortedList.sort((a, b) => {
			if (plugin.settings.sortingOption === 'name-rev') [a, b] = [b, a];
			return extractFileName(a).localeCompare(extractFileName(b), 'en', { numeric: true });
		});
		return sortedList;
	}, [selectedDay, forceValue]);

	const triggerFileContextMenu = (e: React.MouseEvent | React.TouchEvent, filePath: string) => {
		let abstractFile = plugin.app.vault.getAbstractFileByPath(filePath);
		if (abstractFile) {
			const fileMenu = new Menu();
			plugin.app.workspace.trigger('file-menu', fileMenu, abstractFile, VIEW_TYPE);
			if (isMouseEvent(e)) {
				fileMenu.showAtPosition({ x: e.pageX, y: e.pageY });
			} else {
				// @ts-ignore
				fileMenu.showAtPosition({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
			}
		}
	};

	return (
		<>
			<div className="oz-calendar-notelist-header-container">
				<div className="oz-calendar-nav-action-plus">
					<RiAddCircleLine size={20} aria-label="Create note for today" onClick={createNote} />
				</div>
				<div className="oz-calendar-nav-action-left">
					<BsArrowLeft size={22} aria-label="Go to previous day" onClick={() => setNewSelectedDay(-1)} />
				</div>
				<div
					className="oz-calendar-nav-action-middle"
					aria-label="Show active date on calendar"
					onClick={() => setActiveStartDate(selectedDay)}>
					{dayjs(selectedDay).format('DD MMM YYYY')}
				</div>
				<div className="oz-calendar-nav-action-right">
					<BsArrowRight size={22} aria-label="Go to next day" onClick={() => setNewSelectedDay(1)} />
				</div>
				<div className="oz-calendar-nav-action-plus">
					<MdToday
						size={20}
						aria-label="Set today as selected day"
						onClick={() => {
							setActiveStartDate(new Date());
							setSelectedDay(new Date());
						}}
					/>
				</div>
			</div>
			<div className="oz-calendar-notelist-container">
				{selectedDayNotes.length === 0 && (
					<div className="oz-calendar-note-no-note">
						<RiPhoneFindLine className="oz-calendar-no-note-icon" />
						No note found
					</div>
				)}
				{selectedDayNotes.map((notePath) => {
					return (
						<div
							className="oz-calendar-note-line"
							id={notePath}
							onClick={(e) => openFilePath(e, notePath)}
							onContextMenu={(e) => triggerFileContextMenu(e, notePath)}>
							<HiOutlineDocumentText className="oz-calendar-note-line-icon" />
							<span>{extractFileName(notePath)}</span>
						</div>
					);
				})}
			</div>
		</>
	);
}
