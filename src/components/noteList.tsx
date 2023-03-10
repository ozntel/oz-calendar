import React from 'react';
import { BsArrowRight, BsArrowLeft } from 'react-icons/bs';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { RiPhoneFindLine } from 'react-icons/ri';
import dayjs from 'dayjs';
import OZCalendarPlugin from '../main';
import { openFile } from '../util/utils';
import { TFile } from 'obsidian';

interface NoteListComponentParams {
	selectedDay: Date;
	setSelectedDay: (selectedDay: Date) => void;
	setActiveStartDate: (newActiveStartDate: Date) => void;
	selectedDayNotes: string[];
	plugin: OZCalendarPlugin;
}

export default function NoteListComponent(params: NoteListComponentParams) {
	const { selectedDayNotes, setSelectedDay, selectedDay, plugin, setActiveStartDate } = params;

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
				<div className="oz-calendar-nav-action-middle" onClick={() => setActiveStartDate(selectedDay)}>
					{dayjs(selectedDay).format('DD MMM YYYY')}
				</div>
				<div className="oz-calendar-nav-action-right">
					<BsArrowRight size={22} onClick={() => setNewSelectedDay(1)} />
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
