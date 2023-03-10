import React from 'react';
import { BsArrowRight, BsArrowLeft } from 'react-icons/bs';
import { HiOutlineDocumentText } from 'react-icons/hi';
import dayjs from 'dayjs';
import OZCalendarPlugin from '../main';
import { openFile } from '../utils';
import { TFile } from 'obsidian';

interface NoteListComponentParams {
	selectedDay: Date;
	setSelectedDay: (selectedDay: Date) => void;
	selectedDayNotes: string[];
	plugin: OZCalendarPlugin;
}

export default function NoteListComponent(params: NoteListComponentParams) {
	const { selectedDayNotes, setSelectedDay, selectedDay, plugin } = params;

	const setNewSelectedDay = (nrChange: number) => {
		let newDate = new Date();
		newDate.setDate(selectedDay.getDate() + nrChange);
		setSelectedDay(newDate);
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

	const openFilePath = (filePath: string) => {
		let abstractFile = plugin.app.metadataCache.getFirstLinkpathDest(filePath, '');
		if (abstractFile) {
			openFile({
				file: abstractFile as TFile,
				plugin: plugin,
				newLeaf: true,
				leafBySplit: false,
			});
		}
	};

	return (
		<>
			<div className="oz-calendar-notelist-header-container">
				<div className="oz-calendar-nav-action-left">
					<BsArrowLeft size={22} onClick={() => setNewSelectedDay(-1)} />
				</div>
				<div className="oz-calendar-nav-action-middle">{dayjs(selectedDay).format('DD MMM YYYY')}</div>
				<div className="oz-calendar-nav-action-right">
					<BsArrowRight size={22} onClick={() => setNewSelectedDay(1)} />
				</div>
			</div>
			<div className="oz-calendar-notelist-container">
				{selectedDayNotes.map((notePath) => {
					return (
						<div
							className="oz-calendar-note-line"
							id={notePath}
							onClick={() => openFilePath(notePath)}>
							<HiOutlineDocumentText className="oz-calendar-note-line-icon" />
							<span>{extractFileName(notePath)}</span>
						</div>
					);
				})}
			</div>
		</>
	);
}
