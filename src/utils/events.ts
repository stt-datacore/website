import allEvents from '../../static/structured/event_instances.json';

export class EventData {
	symbol: string = '';
    name: string = '';
	image: string = '';
	description: string = '';
	content_types: string[] = [];	/* shuttles, gather, etc. */
    bonus: string[] = [];	/* ALL bonus crew by symbol */
	featured: string[] = [];	/* ONLY featured crew by symbol */
};

export function getEventData(activeEvent: any): EventData | undefined {
	getCurrentStartEndTimes();

	let result = new EventData();
	result.symbol = activeEvent.symbol;
	result.name = activeEvent.name;
	result.description = activeEvent.description;
	result.content_types = activeEvent.content_types;
	result.seconds_to_start = activeEvent.seconds_to_start;
	result.seconds_to_end = activeEvent.seconds_to_end;

	// We can get event image more definitively by fetching from events/instance_id.json rather than player data
	result.image = activeEvent.phases[0].splash_image.file.substr(1).replace(/\//g, '_') + '.png';

	// Content is active phase of started event or first phase of unstarted event
	//	This may not catch all bonus crew in hybrids, e.g. "dirty" shuttles while in phase 2 skirmish
	let activePhase = Array.isArray(activeEvent.content) ? activeEvent.content[activeEvent.content.length-1] : activeEvent.content;
	if (activePhase.content_type == 'shuttles') {
		activePhase.shuttles.forEach((shuttle: any) => {
			for (let symbol in shuttle.crew_bonuses) {
				if (result.bonus.indexOf(symbol) < 0) {
					result.bonus.push(symbol);
					if (shuttle.crew_bonuses[symbol] == 3) result.featured.push(symbol);
				}
			}
		});
	}
	else if (activePhase.content_type == 'gather') {
		for (let symbol in activePhase.crew_bonuses) {
			if (result.bonus.indexOf(symbol) < 0) {
				result.bonus.push(symbol);
				if (activePhase.crew_bonuses[symbol] == 10) result.featured.push(symbol);
			}
		}
	}
	else if (activePhase.content_type == 'skirmish' && activePhase.bonus_crew) {
		for (let i = 0; i < activePhase.bonus_crew.length; i++) {
			let symbol = activePhase.bonus_crew[i];
			if (result.bonus.indexOf(symbol) < 0) {
				result.bonus.push(symbol);
				result.featured.push(symbol);
			}
		}
		// Skirmish also uses activePhase.bonus_traits to identify smaller bonus event crew
	}

	return result;
}

// Current event here refers to an ongoing event, or the next event if none is ongoing
export function guessCurrentEvent(): EventData {
	const { start, end } = getCurrentStartEndTimes();

	// Use penultimate event instance if current time is:
	//	>= Wednesday Noon ET (approx time when game data is updated with next week's event)
	//		and < Monday Noon ET (when event ends)
	// Otherwise use ultimate event
	//	Note: DataCore autosyncs events at ~1PM ET every day, so there might be some lag on Wednesday
	const index = start < 24*60*60 ? 2 : 1;
	const activeId = allEvents[allEvents.length-index].instance_id;

	return new Promise((resolve, reject) => {
		fetch('/structured/events/'+activeId+'.json').then(response =>
			response.json().then(json => {
				const activeEvent = getEventData(json);
				activeEvent.seconds_to_start = start;
				activeEvent.seconds_to_end = end;
				resolve(activeEvent);
			})
		);
	});
}

// Get seconds to event start, end from current time
function getCurrentStartEndTimes(): { start: 0, end: 0 } {
	const currentTime = new Date();
	const utcDay = currentTime.getDay(), utcHour = currentTime.getUTCHours();

	// Event "week" starts and ends on Monday at Noon ET
	const eventDay = [6, 0, 1, 2, 3, 4, 5][utcHour-16 < 0 ? (utcDay-1 < 0 ? 6 : utcDay-1) : utcDay];

	// Event end time is Monday Noon ET (Event Day "7", 0:00:00)
	let endTime = new Date();
	endTime.setDate(endTime.getDate()+7-eventDay);
	endTime.setUTCHours(16, 0, 0, 0);	// Noon ET is 16:00:00 UTC

	// Event start time is Thursday Noon ET (Event Day 3, 0:00:00)
	//	aka exactly 4 days before endTime
	let startTime = new Date(endTime.getTime());
	startTime.setDate(startTime.getDate()-4);

	let start = 0;
	const end = Math.floor((endTime-currentTime)/1000);

	// Event hasn't started yet
	if (eventDay < 3) {
		start = Math.floor((startTime-currentTime)/1000);
	}

	return { start, end };
}