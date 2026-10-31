import React, { useEffect, useRef, useState } from 'react';
import Calendar, { CalendarTileProperties } from 'react-calendar';
import { RxDotFilled } from 'react-icons/rx';
import OZCalendarPlugin from '../main';
import NoteListComponent from './noteList';
import dayjs from 'dayjs';
import useForceUpdate from 'hooks/forceUpdate';
import { DayChangeCommandAction } from 'types';
import { CreateNoteModal } from 'modal';
import { Keymap, moment } from 'obsidian';
import { getStartOfWeek, getWeeklyNote, getWeeklyNoteName, openWeeklyNote } from '../util/weeklyNotes';

export default function MyCalendar(params: { plugin: OZCalendarPlugin }) {
	const { plugin } = params;
	const [selectedDay, setSelectedDay] = useState<Date>(new Date());
	const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
	const { forceValue, forceUpdate } = useForceUpdate();

	useEffect(() => setActiveStartDate(selectedDay), [selectedDay]);

	useEffect(() => {
		window.addEventListener(plugin.EVENT_TYPES.forceUpdate, forceUpdate);
		window.addEventListener(plugin.EVENT_TYPES.changeDate, changeDate);
		window.addEventListener(plugin.EVENT_TYPES.createNote, createNote);
		return () => {
			window.removeEventListener(plugin.EVENT_TYPES.forceUpdate, forceUpdate);
			window.removeEventListener(plugin.EVENT_TYPES.changeDate, changeDate);
			window.removeEventListener(plugin.EVENT_TYPES.createNote, createNote);
		};
	}, []);

	const createNote = () => {
		let currentSelectedDay: Date = selectedDay;
		let dateNow: Date = new Date();
		setSelectedDay((selectedDay) => {
			currentSelectedDay = selectedDay;
			return selectedDay;
		});
		// Add now time details to the existing date if current date
		if (plugin.settings.newNoteDate === 'active-date') {
			currentSelectedDay.setHours(dateNow.getHours());
			currentSelectedDay.setMinutes(dateNow.getMinutes());
			currentSelectedDay.setMilliseconds(dateNow.getMilliseconds());
		}
		let newFileModal = new CreateNoteModal(
			plugin,
			plugin.settings.newNoteDate === 'current-date' ? dateNow : currentSelectedDay
		);
		newFileModal.open();
	};

	const changeDate = (e: CustomEvent) => {
		let action = e.detail.action as DayChangeCommandAction;
		let currentSelectedDay = selectedDay;

		// Event listener is not capable of getting the updates after event listener is added
		// This is created to capture current state value during the custom event dispatch
		setSelectedDay((selectedDay) => {
			currentSelectedDay = selectedDay;
			return selectedDay;
		});

		let newDate = dayjs(currentSelectedDay);
		if (action === 'next-day') {
			newDate = dayjs(currentSelectedDay).add(1, 'day');
		} else if (action === 'previous-day') {
			newDate = dayjs(currentSelectedDay).add(-1, 'day');
		} else if (action === 'today') {
			newDate = dayjs();
		}
		setSelectedDay(newDate.toDate());
	};

	const customTileContent = ({ date, view }: CalendarTileProperties) => {
		if (view === 'month') {
			const dateString = dayjs(date).format('YYYY-MM-DD');
			let dotsCount =
				dateString in plugin.OZCALENDARDAYS_STATE ? plugin.OZCALENDARDAYS_STATE[dateString].length : 0;
			return (
				<div className="dots-wrapper">
					{[...Array(Math.min(dotsCount, 2))].map((_, index) => (
						<RxDotFilled key={index} viewBox="0 0 15 15" />
					))}
					{dotsCount > 2 && <span>+{dotsCount - 2}</span>}
				</div>
			);
		}
		return null;
	};

	const customTileClass = ({ activeStartDate, date, view }: CalendarTileProperties) => {
		// Assign a custom class in case the day is the current day
		let today = new Date();
		return date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
			? 'oz-calendar-plugin-today'
			: '';
	};

	const fixedCalendarClass = plugin.settings.fixedCalendar ? 'fixed' : '';

	// Highlight the week numbers that have a weekly note. react-calendar doesn't support custom classes for
	// week numbers, so the rendered week number tiles are updated after each render
	const calendarRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const weekNumberEls = calendarRef.current?.querySelectorAll<HTMLElement>(
			'.react-calendar__month-view__weekNumbers .react-calendar__tile'
		);
		if (!weekNumberEls) return;
		weekNumberEls.forEach((weekNumberEl, index) => {
			if (!plugin.settings.weeklyNotesEnabled) {
				weekNumberEl.removeClass('oz-calendar-week-has-note');
				weekNumberEl.removeAttribute('aria-label');
				return;
			}
			// Same week calculation as react-calendar: the week of the nth week day of the month
			const weekDate = getStartOfWeek(
				plugin,
				new Date(activeStartDate.getFullYear(), activeStartDate.getMonth(), 1 + index * 7)
			);
			const weeklyNote = getWeeklyNote(plugin, weekDate);
			weekNumberEl.toggleClass('oz-calendar-week-has-note', weeklyNote !== null);
			weekNumberEl.setAttribute(
				'aria-label',
				(weeklyNote ? 'Open weekly note ' : 'Create weekly note ') + getWeeklyNoteName(plugin, weekDate)
			);
		});
	});

	return (
		<div className={'oz-calendar-plugin-view ' + fixedCalendarClass} ref={calendarRef}>
			<Calendar
				onChange={setSelectedDay}
				value={selectedDay}
				maxDetail="month"
				minDetail="month"
				showWeekNumbers={plugin.settings.showWeekNumbers}
				onClickWeekNumber={
					plugin.settings.weeklyNotesEnabled
						? (weekNumber, date, event) => openWeeklyNote(plugin, date, !!Keymap.isModEvent(event.nativeEvent))
						: undefined
				}
				view="month"
				tileContent={customTileContent}
				tileClassName={customTileClass}
				calendarType={plugin.settings.calendarType}
				showFixedNumberOfWeeks={plugin.settings.fixedCalendar}
				activeStartDate={activeStartDate}
				onActiveStartDateChange={(props) => {
					if (props.action === 'next') {
						setActiveStartDate(dayjs(activeStartDate).add(1, 'month').toDate());
					} else if (props.action === 'next2') {
						setActiveStartDate(dayjs(activeStartDate).add(12, 'month').toDate());
					} else if (props.action === 'prev') {
						setActiveStartDate(dayjs(activeStartDate).add(-1, 'month').toDate());
					} else if (props.action === 'prev2') {
						setActiveStartDate(dayjs(activeStartDate).add(-12, 'month').toDate());
					}
				}}
				locale={plugin.settings.useObsidianLanguage ? moment.locale() : undefined}
				formatDay={(locale, date) => String(date.getDate())}
				formatMonthYear={(locale, date) => plugin.formatDate(date, 'MMM YYYY')}
				formatLongDate={(locale, date) => plugin.formatDate(date, 'MMMM D, YYYY')}
			/>
			<>
				<div id="oz-calendar-divider"></div>
				<NoteListComponent
					selectedDay={selectedDay}
					setSelectedDay={setSelectedDay}
					setActiveStartDate={setActiveStartDate}
					plugin={plugin}
					forceValue={forceValue}
					createNote={createNote}
				/>
			</>
		</div>
	);
}
