import React, { useEffect, useState } from 'react';
import Calendar, { CalendarTileProperties } from 'react-calendar';
import { RxDotFilled } from 'react-icons/rx';
import OZCalendarPlugin from '../main';
import useForceUpdate from '../hooks/forceUpdate';
import NoteListComponent from './noteList';
import dayjs from 'dayjs';

export default function MyCalendar(params: { plugin: OZCalendarPlugin }) {
	const { plugin } = params;
	const forceUpdate = useForceUpdate();
	const [selectedDay, setSelectedDay] = useState<Date>(new Date());
	const [selectedDayNotes, setSelectedDayNotes] = useState<string[]>([]);
	const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());

	useEffect(() => setActiveStartDate(selectedDay), [selectedDay]);

	useEffect(() => {
		const selectedDayIso = dayjs(selectedDay).format('YYYY-MM-DD');
		const notes =
			selectedDayIso in plugin.OZCALENDARDAYS_STATE ? plugin.OZCALENDARDAYS_STATE[selectedDayIso] : [];
		setSelectedDayNotes(notes);
	}, [selectedDay, plugin.OZCALENDARDAYS_STATE]);

	useEffect(() => {
		window.addEventListener(plugin.EVENT_TYPES.forceUpdate, forceUpdate);
		return () => {
			window.removeEventListener(plugin.EVENT_TYPES.forceUpdate, forceUpdate);
		};
	}, []);

	useEffect(() => forceUpdate(), [plugin.OZCALENDARDAYS_STATE]);

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
		<div>
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
					selectedDayNotes={selectedDayNotes}
					plugin={plugin}
				/>
			</>
		</div>
	);
}
