import React, { useEffect, useState, useRef } from 'react';
import { Menu, TFile } from 'obsidian';
import { HiOutlineDocumentText } from 'react-icons/hi';
import OZCalendarPlugin from '../main';
import { isMouseEvent, openFile } from '../util/utils';
import { VIEW_TYPE } from '../view';

interface OpenTabNote {
	displayName: string;
	path: string;
}

interface OpenTabsComponentParams {
	plugin: OZCalendarPlugin;
}

export default function OpenTabsComponent(params: OpenTabsComponentParams) {
	const { plugin } = params;

	const getOpenTabNotes = (): OpenTabNote[] => {
		const seen = new Set<string>();
		const notes: OpenTabNote[] = [];
		plugin.app.workspace.iterateAllLeaves((leaf) => {
			const state = leaf.getViewState();
			if (state.type !== 'markdown') return;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const file: TFile | undefined = (leaf.view as any)?.file;
			if (!file || seen.has(file.path)) return;
			seen.add(file.path);
			notes.push({ displayName: file.basename, path: file.path });
		});
		return notes;
	};

	const [openTabs, setOpenTabs] = useState<OpenTabNote[]>(getOpenTabNotes());

	useEffect(() => {
		const update = () => setOpenTabs(getOpenTabNotes());
		const refs = [
			plugin.app.workspace.on('layout-change', update),
			plugin.app.workspace.on('active-leaf-change', update),
			plugin.app.workspace.on('file-open', update),
		];
		return () => {
			refs.forEach((ref) => plugin.app.workspace.offref(ref));
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const openFilePath = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, filePath: string) => {
		const abstractFile = plugin.app.vault.getAbstractFileByPath(filePath);
		const openFileBehaviour = plugin.settings.openFileBehaviour;
		if (abstractFile && abstractFile instanceof TFile) {
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
			openFile({
				file: abstractFile,
				plugin: plugin,
				newLeaf: openInNewLeaf,
				leafBySplit: openInNewTabGroup,
			});
		}
	};

	const handleDragStart = (e: React.DragEvent<HTMLDivElement>, note: OpenTabNote) => {
		// Use Obsidian's internal DragManager so the editor's drop handler
		// recognizes the drag source. Standard HTML5 dataTransfer types alone
		// (text/plain, text/uri-list) make the browser show the "not allowed"
		// cursor when dragging into the editor; the editor's drop handler only
		// preventDefault()s on dragover for drag payloads that went through
		// dragManager.onDragStart.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const dragManager = (plugin.app as any).dragManager;
		if (dragManager && typeof dragManager.dragLink === 'function') {
			const wikiLink = `[[${note.displayName}]]`;
			const dragData = dragManager.dragLink(e.nativeEvent, wikiLink, note.path);
			dragManager.onDragStart(e.nativeEvent, dragData);
		} else {
			const obsidianUri = `obsidian://open?vault=${encodeURIComponent(
				plugin.app.vault.getName()
			)}&file=${encodeURIComponent(note.path)}`;
			e.dataTransfer.effectAllowed = 'link';
			e.dataTransfer.setData('text/uri-list', obsidianUri);
			e.dataTransfer.setData('text/plain', `[[${note.displayName}]]`);
		}
		e.currentTarget.classList.add('oz-calendar-note-line-dragging');
	};

	const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
		e.currentTarget.classList.remove('oz-calendar-note-line-dragging');
	};

	// Hover preview (Ctrl/Cmd pressed -> native HoverPopover, no delay).
	const isModPressed = (e: React.MouseEvent): boolean => e.ctrlKey || e.metaKey;

	const activeTargetRef = useRef<HTMLElement | null>(null);

	const forceCloseHoverPreview = () => {
		const targetEl = activeTargetRef.current;
		activeTargetRef.current = null;
		if (targetEl) {
			targetEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
		}
		document.querySelectorAll('.popover.hover-popover').forEach((el) => {
			el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
		});
	};

	const handleNoteMouseEnter = (e: React.MouseEvent<HTMLDivElement>, note: OpenTabNote) => {
		if (!isModPressed(e)) return;
		forceCloseHoverPreview();
		activeTargetRef.current = e.currentTarget;
		plugin.app.workspace.trigger('hover-link', {
			event: e.nativeEvent,
			source: 'oz-calendar',
			hoverParent: { hoverPopover: null },
			targetEl: e.currentTarget,
			linktext: note.path,
			sourcePath: note.path,
		});
	};

	const handleNoteMouseLeave = () => {
		if (activeTargetRef.current) {
			forceCloseHoverPreview();
		}
	};

	const triggerFileContextMenu = (e: React.MouseEvent | React.TouchEvent, filePath: string) => {
		let abstractFile = plugin.app.vault.getAbstractFileByPath(filePath);
		if (abstractFile) {
			const fileMenu = new Menu();
			plugin.app.workspace.trigger('file-menu', fileMenu, abstractFile, VIEW_TYPE);
			fileMenu.addSeparator();
			fileMenu.addItem((item) => {
				item.setTitle('删除文件')
					.setIcon('trash')
					.onClick(async () => {
						if (abstractFile) {
							await plugin.app.vault.trash(abstractFile, false);
						}
					});
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(item as any).dom.addClass('oz-calendar-menu-item-delete');
			});
			if (isMouseEvent(e)) {
				fileMenu.showAtPosition({ x: e.pageX, y: e.pageY });
			} else {
				// @ts-ignore
				fileMenu.showAtPosition({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
			}
		}
	};

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

	return (
		<div className="oz-calendar-open-tabs-container">
			<div className="oz-calendar-open-tabs-header">Open tabs</div>
			<div className="oz-calendar-open-tabs-list">
				{openTabs.length === 0 && (
					<div className="oz-calendar-note-no-note">No open tabs</div>
				)}
				{openTabs.map((note) => (
					<div
						className={
							'oz-calendar-note-line' +
							(plugin.settings.fileNameOverflowBehaviour == 'hide'
								? ' oz-calendar-overflow-hide'
								: '')
						}
						id={`oz-open-tab-${note.path}`}
						key={note.path}
						draggable={true}
						onClick={(e) => openFilePath(e, note.path)}
						onContextMenu={(e) => triggerFileContextMenu(e, note.path)}
						onMouseEnter={(e) => handleNoteMouseEnter(e, note)}
						onMouseLeave={handleNoteMouseLeave}
						onDragStart={(e) => handleDragStart(e, note)}
						onDragEnd={handleDragEnd}>
						<HiOutlineDocumentText className="oz-calendar-note-line-icon" />
						<span>{note.displayName}</span>
					</div>
				))}
			</div>
		</div>
	);
}
