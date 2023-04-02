import React, { useEffect, useState } from 'react';
import Calendar, { CalendarTileProperties } from 'react-calendar';
import { RxDotFilled } from 'react-icons/rx';
import OZCalendarPlugin from '../main';
import NoteListComponent from './noteList';
import dayjs from 'dayjs';
import useForceUpdate from 'hooks/forceUpdate';
import { DayChangeCommandAction } from 'types';
import { CreateNoteModal } from 'modal';

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
		let currentSelectedDay = selectedDay;
		setSelectedDay((selectedDay) => {
			currentSelectedDay = selectedDay;
			return selectedDay;
		});
		// Add now time details to the existing date if current date
		if (plugin.settings.newNoteDate === 'current-date') {
			let dateNow = new Date();
			currentSelectedDay.setHours(dateNow.getHours());
			currentSelectedDay.setMinutes(dateNow.getMinutes());
			currentSelectedDay.setMilliseconds(dateNow.getMilliseconds());
		}
		let newFileModal = new CreateNoteModal(
			plugin,
			plugin.settings.newNoteDate === 'current-date' ? new Date() : selectedDay
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
						<RxDotFilled viewBox="0 0 15 15" />
					))}
					{dotsCount > 2 && <span>+{dotsCount - 2}</span>}
				</div>
			);
		}
		return null;
	};

	return (
		<div className={'oz-calendar-plugin-view' + (plugin.settings.fixedCalendar ? ' fixed' : '')}>
			<Calendar
				onChange={setSelectedDay}
				value={selectedDay}
				maxDetail="month"
				minDetail="month"
				view="month"
				tileContent={customTileContent}
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
				formatMonthYear={(locale, date) => dayjs(date).format('MMM YYYY')}
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
