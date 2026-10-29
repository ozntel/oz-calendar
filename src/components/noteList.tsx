import React, { useEffect, useMemo, useRef } from 'react';
import { BsArrowRight, BsArrowLeft } from 'react-icons/bs';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { RiPhoneFindLine, RiAddCircleLine } from 'react-icons/ri';
import { MdToday } from 'react-icons/md';
import dayjs from 'dayjs';
import OZCalendarPlugin from 'main';
import { isMouseEvent, openFile } from '../util/utils';
import { Menu, TFile } from 'obsidian';
import { VIEW_TYPE } from 'view';
import { OZNote } from 'types';

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
			// Ctrl/Cmd click always opens in a new tab, matching the file explorer
			if (e.ctrlKey || e.metaKey) {
				openInNewLeaf = true;
				openInNewTabGroup = false;
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

	const selectedDayNotes: OZNote[] = useMemo(() => {
		const selectedDayIso = dayjs(selectedDay).format('YYYY-MM-DD');
		let sortedList: OZNote[] = [];
		if (selectedDayIso in plugin.OZCALENDARDAYS_STATE) {
			sortedList = plugin.OZCALENDARDAYS_STATE[selectedDayIso].filter(
				(ozItem) => ozItem.type === 'note'
			) as OZNote[];
		}
		sortedList = sortedList.sort((a, b) => {
			if (plugin.settings.sortingOption === 'name-rev')
				[a.displayName, b.displayName] = [b.displayName, a.displayName];
			return a.displayName.localeCompare(b.displayName, 'en', { numeric: true });
		});
		return sortedList;
	}, [selectedDay, forceValue]);

	const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ozNote: OZNote) => {
		// Use Obsidian's internal DragManager so the editor's drop handler
		// recognizes the drag source. Standard HTML5 dataTransfer types alone
		// (text/plain, text/uri-list) make the browser show the "not allowed"
		// cursor when dragging into the editor; the editor's drop handler only
		// preventDefault()s on dragover for drag payloads that went through
		// dragManager.onDragStart. Reference implementation: brianpetro's
		// obsidian-smart-connections uses the same pattern.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const dragManager = (plugin.app as any).dragManager;
		if (dragManager && typeof dragManager.dragLink === 'function') {
			const wikiLink = `[[${ozNote.displayName}]]`;
			const dragData = dragManager.dragLink(e.nativeEvent, wikiLink, ozNote.path);
			dragManager.onDragStart(e.nativeEvent, dragData);
		} else {
			// Fallback: standard HTML5 link drag (still needs text/uri-list
			// for any non-Obsidian target such as the OS file explorer).
			const obsidianUri = `obsidian://open?vault=${encodeURIComponent(
				plugin.app.vault.getName()
			)}&file=${encodeURIComponent(ozNote.path)}`;
			e.dataTransfer.effectAllowed = 'link';
			e.dataTransfer.setData('text/uri-list', obsidianUri);
			e.dataTransfer.setData('text/plain', `[[${ozNote.displayName}]]`);
		}
		e.currentTarget.classList.add('oz-calendar-note-line-dragging');
	};

	const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
		e.currentTarget.classList.remove('oz-calendar-note-line-dragging');
	};

	// Hover preview (Ctrl/Cmd pressed -> native HoverPopover, no delay).
	// Behaviour:
	//   * mouseenter with modifier held  -> trigger 'hover-link' immediately
	//   * mouseleave                    -> close any open preview at once
	//   * modifier released / window blurs -> close
	// We don't render our own popover, we just trigger Obsidian's built-in
	// 'hover-link' workspace event and let the Page Preview core plugin show
	// the markdown-rendered preview. To force the popover closed (which
	// normally hides on a short timer), we dispatch synthetic mouseleave
	// events on the target element and the popover root - that is what
	// Obsidian's own hover code listens for.
	const isModPressed = (e: React.MouseEvent): boolean => e.ctrlKey || e.metaKey;

	// Track the element that owns the currently-open preview so we can fire
	// mouseleave on it when we want to dismiss the popover.
	const activeTargetRef = useRef<HTMLElement | null>(null);

	const forceCloseHoverPreview = () => {
		const targetEl = activeTargetRef.current;
		activeTargetRef.current = null;
		if (targetEl) {
			targetEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
		}
		// Obsidian creates a single .hover-popover element on the body. Force
		// it to see the cursor as gone by dispatching mouseleave on it too.
		document.querySelectorAll('.popover.hover-popover').forEach((el) => {
			el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
		});
	};

	const handleNoteMouseEnter = (e: React.MouseEvent<HTMLDivElement>, ozNote: OZNote) => {
		if (!isModPressed(e)) return;
		// If a different preview is already open, close it first so the new
		// target takes over cleanly.
		forceCloseHoverPreview();
		activeTargetRef.current = e.currentTarget;
		plugin.app.workspace.trigger('hover-link', {
			event: e.nativeEvent,
			source: 'oz-calendar',
			hoverParent: { hoverPopover: null },
			targetEl: e.currentTarget,
			linktext: ozNote.path,
			sourcePath: ozNote.path,
		});
	};

	const handleNoteMouseLeave = (ozNote: OZNote) => {
		// Only close if this note was the one that opened the popover; if the
		// cursor moved between rows with the modifier still held, the new
		// mouseenter will own the open.
		if (activeTargetRef.current) {
			forceCloseHoverPreview();
		}
	};

	// Close the preview when the modifier is released anywhere in the
	// window, or when the window loses focus.
	useEffect(() => {
		const onKeyUp = (ev: KeyboardEvent) => {
			if (!ev.ctrlKey && !ev.metaKey) {
				forceCloseHoverPreview();
			}
		};
		const onBlur = () => forceCloseHoverPreview();
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
		return () => {
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
			forceCloseHoverPreview();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
			<div
				className={
					'oz-calendar-notelist-container ' +
					(plugin.settings.fileNameOverflowBehaviour == 'scroll' ? 'oz-calendar-overflow-scroll' : '')
				}>
				{selectedDayNotes.length === 0 && (
					<div className="oz-calendar-note-no-note">
						<RiPhoneFindLine className="oz-calendar-no-note-icon" />
						No note found
					</div>
				)}
				{selectedDayNotes.map((ozNote) => {
					return (
						<div
							className={
								'oz-calendar-note-line' +
								(plugin.settings.fileNameOverflowBehaviour == 'hide'
									? ' oz-calendar-overflow-hide'
									: '')
							}
							id={ozNote.path}
							key={ozNote.path}
							draggable={true}
							onClick={(e) => openFilePath(e, ozNote.path)}
							onContextMenu={(e) => triggerFileContextMenu(e, ozNote.path)}
							onMouseEnter={(e) => handleNoteMouseEnter(e, ozNote)}
							onMouseLeave={() => handleNoteMouseLeave(ozNote)}
							onDragStart={(e) => handleDragStart(e, ozNote)}
							onDragEnd={handleDragEnd}>
							<HiOutlineDocumentText className="oz-calendar-note-line-icon" />
							<span>{ozNote.displayName}</span>
						</div>
					);
				})}
			</div>
		</>
	);
}
