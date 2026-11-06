import React, { useEffect, useRef, useState } from 'react';
import { setIcon } from 'obsidian';
import OZCalendarPlugin from 'main';
import { applyFilterQuery } from '../util/noteFilter';
import { FilterHelpModal } from '../filterHelpModal';

/**
 * Text filter for the calendar dots and the file list, shown above the file list when toggled from the list header.
 * Hiding the bar keeps the applied filter; the header button shows a dot while a filter is applied.
 * The query only takes effect on Apply (or Enter), so the calendar doesn't re-render on every keystroke.
 */
export default function FilterBar(params: { plugin: OZCalendarPlugin }) {
	const { plugin } = params;
	const [draft, setDraft] = useState<string>(plugin.settings.filterQuery);
	const [applied, setApplied] = useState<string>(plugin.settings.filterQuery);
	const [error, setError] = useState<string | null>(null);

	const inputRef = useRef<HTMLInputElement>(null);

	// Focus the input when the user opens the bar
	useEffect(() => {
		if (plugin.focusFilterOnOpen) {
			plugin.focusFilterOnOpen = false;
			inputRef.current?.focus();
		}
	}, []);

	const isDirty = draft.trim() !== applied;
	const isActive = applied !== '';

	const apply = (query: string) => {
		const errorMessage = applyFilterQuery(plugin, query);
		setError(errorMessage);
		if (!errorMessage) {
			setApplied(query.trim());
			setDraft(query.trim());
		}
	};

	// Adds an example from the help window to the query, without applying it
	const insertExample = (example: string) => {
		const current = draft.trim();
		setDraft(current === '' ? example : current + ' ' + example);
		setError(null);
		// Wait for the help window to close and give focus back before focusing the input
		window.setTimeout(() => inputRef.current?.focus(), 0);
	};

	const openHelp = () => new FilterHelpModal(plugin, insertExample).open();

	return (
		<div className={'oz-calendar-filter-bar' + (isActive ? ' oz-calendar-filter-bar-active' : '')}>
			<div className="oz-calendar-filter-row">
				{/* Same structure as Obsidian's search fields: search icon, clear button and right-side icons */}
				<div className="search-input-container oz-calendar-filter-input-container">
					<input
						ref={inputRef}
						type="search"
						enterKeyHint="search"
						placeholder="Filter notes in the calendar"
						spellCheck={false}
						value={draft}
						onChange={(e) => {
							setDraft(e.target.value);
							setError(null);
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter') apply(draft);
							if (e.key === 'Escape') {
								// Search inputs clear themselves on Escape; restore the applied query instead
								e.preventDefault();
								setDraft(applied);
								setError(null);
							}
						}}
					/>
					<div
						className="search-input-clear-button"
						aria-label="Clear filter"
						onClick={() => {
							apply('');
							inputRef.current?.focus();
						}}
					/>
					<div className="input-right-decorator">
						<ObsidianIcon
							icon="info"
							className="clickable-icon oz-calendar-filter-help-button"
							ariaLabel="Filter syntax and examples"
							onClick={openHelp}
						/>
					</div>
				</div>
				<button
					className={'oz-calendar-filter-apply' + (isDirty ? ' mod-cta' : '')}
					disabled={!isDirty}
					onClick={() => apply(draft)}>
					Apply
				</button>
			</div>
			{error && (
				<div className="oz-calendar-filter-error">
					{error}
					{' · '}
					<a className="oz-calendar-filter-error-help" onClick={openHelp}>
						See examples
					</a>
				</div>
			)}
		</div>
	);
}

/**
 * Renders one of Obsidian's built-in (Lucide) icons, so buttons match the rest of the app
 */
function ObsidianIcon(params: { icon: string; className: string; ariaLabel: string; onClick: () => void }) {
	const { icon, className, ariaLabel, onClick } = params;
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (ref.current) setIcon(ref.current, icon);
	}, [icon]);
	return <div ref={ref} className={className} aria-label={ariaLabel} onClick={onClick} />;
}
