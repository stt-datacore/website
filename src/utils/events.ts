import allEvents from '../../static/structured/event_instances.json';
import { CrewMember } from '../model/crew';
import { Content, GameEvent, FeaturedCrew, Phase, PlayerCrew, RankedBracket, SquadronRankedBracket, ThresholdReward } from '../model/player';

export interface EventData extends GameEvent {
	id: number;
	rules: string;
	rewards_teaser: string;
	shop_layout: string;
	featured_crew: FeaturedCrew[];
	threshold_rewards: ThresholdReward[];
	ranked_brackets: RankedBracket[];
	squadron_ranked_brackets: SquadronRankedBracket[];
	content: Content;
	instance_id: number;
	status: number;
	seconds_to_start: number;
	seconds_to_end: number;
	phases: Phase[];
	opened?: boolean | undefined;
	opened_phase?: number | undefined;
	victory_points?: number | undefined;
	bonus_victory_points?: number | undefined;
	claimed_threshold_reward_points?: number | undefined;
	unclaimed_threshold_rewards?: any[] | undefined;
	last_threshold_points?: number | undefined;
	next_threshold_points?: number | undefined;
	next_threshold_rewards?: any[] | undefined;
	symbol: string;
    name: string;
	image: string;
	description: string;
	bonus_text: string;
	content_types: string[];	/* shuttles, gather, etc. */
    bonus: string[];	/* ALL bonus crew by symbol */
	featured: string[];	/* ONLY featured crew by symbol */
	bonusGuessed?: boolean;
};

export function getEventData(activeEvent: GameEvent, allCrew: PlayerCrew[] = []): EventData | undefined {
	const result = {} as EventData;
	result.symbol = activeEvent.symbol;
	result.name = activeEvent.name;
	result.description = activeEvent.description;
	result.bonus_text = activeEvent.bonus_text;
	result.content_types = activeEvent.content_types;
	result.seconds_to_start = activeEvent.seconds_to_start;
	result.seconds_to_end = activeEvent.seconds_to_end;

	// We can get event image more definitively by fetching from events/instance_id.json rather than player data
	result.image = activeEvent.phases[0].splash_image.file.substr(1).replace(/\//g, '_') + '.png';

	// Content is active phase of started event or first phase of unstarted event
	//	This may not catch all bonus crew in hybrids, e.g. "dirty" shuttles while in phase 2 skirmish
	const activePhase = Array.isArray(activeEvent.content) ? activeEvent.content[activeEvent.content.length-1] : activeEvent.content;
	
	if (!activePhase) return result;
	if (!result.featured) result.featured = [];
	if (!result.bonus) result.bonus = [];
	
	if (activePhase.content_type == 'shuttles') {
		activePhase.shuttles.forEach((shuttle: any) => {
			for (let symbol in shuttle.crew_bonuses) {
				if ((result.bonus?.indexOf(symbol) ?? -1) < 0) {
					result.bonus.push(symbol);
					if (shuttle.crew_bonuses[symbol] == 3) result.featured.push(symbol);
				}
			}
		});
	}
	else if (activePhase.content_type == 'gather') {
		for (let symbol in activePhase.crew_bonuses) {
			if ((result.bonus?.indexOf(symbol) ?? -1) < 0) {
				result.bonus.push(symbol);
				if (activePhase.crew_bonuses[symbol] == 10) result.featured.push(symbol);
			}
		}
	}
	else if (activePhase.content_type == 'skirmish' && activePhase.bonus_crew) {
		for (let i = 0; i < activePhase.bonus_crew.length; i++) {
			let symbol = activePhase.bonus_crew[i];
			if ((result.bonus?.indexOf(symbol) ?? -1) < 0) {
				result.bonus.push(symbol);
				result.featured.push(symbol);
			}
		}
		// Skirmish uses activePhase.bonus_traits to identify smaller bonus event crew
		if (allCrew.length > 0) {
			activePhase.bonus_traits.forEach(trait => {
				const perfectTraits = allCrew.filter(crew => crew.traits.includes(trait) || crew.traits_hidden.includes(trait));
				perfectTraits?.forEach(crew => {
					if (!result.bonus?.includes(crew.symbol)) {
						result.bonus.push(crew.symbol);
					}						
				});
			});
		}
	}

	// Guess featured crew when not explicitly listed in event data (e.g. pre-start skirmish or hybrid w/ phase 1 skirmish)
	if (result.bonus && result.bonus.length === 0 && allCrew.length > 0) {
		const { bonus, featured } = guessBonusCrew(activeEvent, allCrew);
		result.bonus = bonus;
		result.featured = featured;
		result.bonusGuessed = true;
	}

	return result;
}

// Current event here refers to an ongoing event, or the next event if none is ongoing
export async function guessCurrentEvent(): Promise<EventData> {
	const { start, end } = getCurrentStartEndTimes();

	// Use penultimate event instance if current time is:
	//	>= Wednesday Noon ET (approx time when game data is updated with next week's event)
	//		and < Monday Noon ET (when event ends)
	// Otherwise use ultimate event
	//	Note: DataCore autosyncs events at ~1PM ET every day, so there might be some lag on Wednesday
	const index = start < 24*60*60 ? 2 : 1;
	const eventId = allEvents[allEvents.length-index].instance_id;

	return new Promise((resolve, reject) => {
		fetch('/structured/events/'+eventId+'.json').then(response =>
			response.json().then(json => {
				const activeEvent = getEventData(json) as EventData;
				activeEvent.seconds_to_start = start;
				activeEvent.seconds_to_end = end;
				resolve(activeEvent);
			})
		);
	});
}

// Get seconds to event start, end from current time
function getCurrentStartEndTimes(): { start: number, end: number } {
	const currentTime = new Date();
	const utcDay = currentTime.getUTCDay(), utcHour = currentTime.getUTCHours();

	// Event "week" starts and ends on Monday at Noon ET
	let eventDay = [6, 0, 1, 2, 3, 4, 5][utcDay];
	eventDay = utcHour < 16 ? (eventDay-1 < 0 ? 6 : eventDay-1) : eventDay;

	// Event end time is Monday Noon ET (Event Day "7", 0:00:00)
	let endTime = new Date();
	endTime.setDate(endTime.getDate()+7-eventDay);
	endTime.setUTCHours(16, 0, 0, 0);	// Noon ET is 16:00:00 UTC

	// Event start time is Thursday Noon ET (Event Day 3, 0:00:00)
	//	aka exactly 4 days before endTime
	let startTime = new Date(endTime.getTime());
	startTime.setDate(startTime.getDate()-4);

	let start = 0;
	let diff = endTime.getTime() - currentTime.getTime();
	const end = Math.floor((diff)/1000);

	// Event hasn't started yet
	if (eventDay < 3) {
		start = Math.floor((diff)/1000);
	}

	return { start, end };
}

function guessBonusCrew(activeEvent: GameEvent, allCrew: CrewMember[]): { bonus: string[], featured: string[] } {
	const bonus = [] as string[];
	const featured = [] as string[];

	// Guess bonus crew from bonus_text
	//	bonus_text seems to be reliably available, but might be inconsistently written
	if (activeEvent.bonus_text !== '') {
		const words = activeEvent.bonus_text.replace('Crew Bonus: ', '').replace(' crew', '').replace(/\sor\s/, ',').split(',').filter(word => word !== '');
		words.forEach(trait => {
			// Search for exact name first
			const testName = trait.trim();
			const perfectName = allCrew.find(crew => crew.name === testName);
			if (perfectName) {
				featured.push(perfectName.symbol);
				if (!bonus.includes[perfectName.symbol])
					bonus.push(perfectName.symbol);
			}
			// Otherwise search for matching trait
			else {
				const testTrait = testName.replace(/[\.\s'’]/g, '').toLowerCase();
				const perfectTraits = allCrew.filter(crew => crew.traits.includes(testTrait) || crew.traits_hidden.includes(testTrait));
				if (perfectTraits.length > 0) {
					perfectTraits.forEach(crew => {
						if (!bonus.includes(crew.symbol))
							bonus.push(crew.symbol);
					});
				}
				// Otherwise try matching last name only (e.g. J. Archer should be Archer)
				else {
					if (/\s/.test(testName)) {
						const imperfectTrait = testName.replace(/^.+\s/, '').toLowerCase();
						const imperfectTraits = allCrew.filter(crew => crew.traits.includes(imperfectTrait) || crew.traits_hidden.includes(imperfectTrait));
						imperfectTraits.forEach(crew => {
							if (!bonus.includes(crew.symbol))
								bonus.push(crew.symbol);
						});
					}
				}
			}
			// Identify featured from matching featured_crew
			//	These usually include the event's legendary ranked reward, so check against the bonus crew we identified above
			activeEvent.featured_crew.forEach(crew => {
				if (bonus.includes(crew.symbol)) {
					if (!featured.includes(crew.symbol))
						featured.push(crew.symbol);
				}
			});
		});
	}

	return { bonus, featured };
}