//import allEvents from '../../static/structured/event_instances.json';
import { CrewMember } from '../model/crew';
import { CompletionState, Content, GameEvent, Shuttle } from '../model/player';
import { IBestCombos, IEventCombos, IEventData, IEventPair, IEventScoredCrew, IEventSkill, IRosterCrew } from '../components/eventplanner/model';
import { EventInstance } from '../model/events';
import CONFIG from '../components/CONFIG';
import { applySkillBuff, crewCopy } from './crewutils';
import { BuffStatTable } from './voyageutils';
import { IDefaultGlobal } from '../context/globalcontext';
import { Ship } from '../model/ship';

export function getEventData(activeEvent: GameEvent, allCrew: CrewMember[], allShips?: Ship[]): IEventData | undefined {
	const result = {} as IEventData;
	result.symbol = activeEvent.symbol;
	result.name = activeEvent.name;
	result.description = activeEvent.description;
	result.bonus_text = activeEvent.bonus_text;
	result.content_types = activeEvent.content_types;
	result.seconds_to_start = activeEvent.seconds_to_start;
	result.seconds_to_end = activeEvent.seconds_to_end;

	// We can get event image more definitively by fetching from events/instance_id.json rather than player data
	result.image = activeEvent.phases[0].splash_image.file.slice(1).replace(/\//g, '_') + '.png';

	result.featured = [];
	result.bonus = [];

	// Content is active phase of started event or first phase of unstarted event
	//	This may not catch all bonus crew in hybrids, e.g. "dirty" shuttles while in phase 2 skirmish
	const activePhase = (Array.isArray(activeEvent.content) ? activeEvent.content[activeEvent.content.length-1] : activeEvent.content) as Content;

	if (!activePhase) return result;

	if (activePhase.content_type === 'shuttles' && activePhase.shuttles) {
		activePhase.shuttles.forEach((shuttle: Shuttle) => {
			for (let symbol in shuttle.crew_bonuses) {
				if (!result.bonus.includes(symbol)) {
					result.bonus.push(symbol);
					if (shuttle.crew_bonuses[symbol] === 3) result.featured.push(symbol);
				}
			}
		});
	}
	else if (activePhase.content_type === 'gather' && activePhase.crew_bonuses) {
		for (let symbol in activePhase.crew_bonuses) {
			if (!result.bonus.includes(symbol)) {
				result.bonus.push(symbol);
				if (activePhase.crew_bonuses[symbol] === 10) result.featured.push(symbol);
			}
		}
	}
	else if (activePhase.content_type === 'skirmish') {
		if (activePhase.bonus_crew) {
			for (let i = 0; i < activePhase.bonus_crew.length; i++) {
				let symbol = activePhase.bonus_crew[i];
				if (!result.bonus.includes(symbol)) {
					result.bonus.push(symbol);
					result.featured.push(symbol);
				}
			}
		}
		// Skirmish uses activePhase.bonus_traits to identify smaller bonus event crew
		if (activePhase.bonus_traits) {
			activePhase.bonus_traits.forEach(trait => {
				const perfectTraits = allCrew.filter(crew => crew.traits.includes(trait) || crew.traits_hidden.includes(trait));
				perfectTraits.forEach(crew => {
					if (!result.bonus.includes(crew.symbol)) {
						result.bonus.push(crew.symbol);
					}
				});
			});
		}
	}
	else if (activePhase.content_type === 'voyage') {

		result.bonus_detail = [];

		if (activePhase.featured_crews) {
			for (let i = 0; i < activePhase.featured_crews.length; i++) {
				let symbol = activePhase.featured_crews[i];
				if (!result.bonus.includes(symbol)) {
					result.bonus.push(symbol);
					result.featured.push(symbol);
				}
			}
		}
		// Voyages uses activePhase.antimatter_bonus_crew_traits to identify smaller bonus event crew
		if (activePhase.antimatter_bonus_crew_traits) {
			activePhase.antimatter_bonus_crew_traits.forEach((trait, idx) => {
				const perfectTraits = allCrew.filter(crew => crew.traits.includes(trait) || crew.traits_hidden.includes(trait));
				perfectTraits.forEach(crew => {
					if (!result.bonus.includes(crew.symbol)) {
						result.bonus.push(crew.symbol);
					}
					let detail = result.bonus_detail?.find(f => f.symbol === crew.symbol);
					if (detail) {
						detail.amount += activePhase.antimatter_bonus_per_crew_trait!;
					}
					else {
						result.bonus_detail?.push({
							symbol: crew.symbol,
							amount: activePhase.antimatter_bonus_per_crew_trait!
						});
					}
				});
			});
		}

		result.featured.forEach((symbol) => {
			let detail = result.bonus_detail?.find(f => f.symbol === symbol);
			if (detail) {
				detail.amount = activePhase.antimatter_bonus_for_featured_crew!
			}
			else {
				result.bonus_detail?.push({
					symbol,
					amount: activePhase.antimatter_bonus_for_featured_crew!
				});
			}
		})

		if (allShips?.length) {
			result.bonus_ship ??= [];
			result.featured_ship ??= [];
			if (activePhase.featured_ships) {
				for (let i = 0; i < activePhase.featured_ships.length; i++) {
					let symbol = activePhase.featured_ships[i];
					if (!result.bonus_ship.includes(symbol)) {
						result.bonus_ship.push(symbol);
						result.featured_ship.push(symbol);
					}
				}
			}
			// Voyages uses activePhase.antimatter_bonus_crew_traits to identify smaller bonus event crew
			if (activePhase.antimatter_bonus_ship_traits) {
				result.bonus_ship_traits = [...activePhase.antimatter_bonus_ship_traits];
				activePhase.antimatter_bonus_ship_traits.forEach(trait => {
					const perfectTraits = allShips.filter(ship => ship.traits?.includes(trait) || ship.traits_hidden?.includes(trait));
					perfectTraits.forEach(crew => {
						if (!result.bonus_ship?.includes(crew.symbol)) {
							result.bonus_ship?.push(crew.symbol);
						}
					});
				});
			}

			result.primary_skill = activePhase.primary_skill;
			result.secondary_skill = activePhase.secondary_skill;
		}
	}

	// Guess featured crew when not explicitly listed in event data (e.g. pre-start skirmish or hybrid w/ phase 1 skirmish)
	if (result.bonus.length === 0) {
		const { bonus, featured } = guessBonusCrew(activeEvent, allCrew);
		result.bonus = bonus;
		result.featured = featured;
		result.bonusGuessed = true;
	}

	return result;
}

// guessCurrentEvent to be deprecated; use getRecentEvents instead
export async function guessCurrentEvent(allCrew: CrewMember[], allEvents: EventInstance[], allShips?: Ship[]): Promise<IEventData> {
	const { start, end } = getCurrentStartEndTimes();
	const eventId = guessCurrentEventId(allEvents);
	return new Promise((resolve, reject) => {
		fetch('/structured/events/'+eventId+'.json').then(response =>
			response.json().then(json => {
				const activeEvent = getEventData(json, allCrew, allShips) as IEventData;
				activeEvent.seconds_to_start = start;
				activeEvent.seconds_to_end = end;
				resolve(activeEvent);
			})
		);
	});
}

// Current event here refers to an ongoing event, or the next event if none is ongoing
export function guessCurrentEventId(allEvents: EventInstance[]): number {
	const easternTime = new Date((new Date()).toLocaleString('en-US', { timeZone: 'America/New_York' }));
	const estDay = easternTime.getDay(), estHour = easternTime.getHours();

	// Use penultimate event instance if current time is:
	//	>= Wednesday Noon ET (approx time when game data is updated with next week's event)
	//		and < Monday Noon ET (when event ends)
	// Otherwise use ultimate event
	//	Note: DataCore autosyncs events at ~1PM ET every day, so there might be some lag on Wednesday
	const currentIndex = ((estDay === 3 && estHour >= 12) || estDay > 3 || estDay === 0 || (estDay === 1 && estHour < 12)) ? 2 : 1; // start < 24*60*60 ? 2 : 1;
	return allEvents[allEvents.length-currentIndex].instance_id;
}

// Get seconds to event start, end from current time
function getCurrentStartEndTimes(): { start: number, end: number, startTime: Date, endTime: Date } {

	const currentTime = new Date();
	const easternTime = new Date((new Date()).toLocaleString('en-US', { timeZone: 'America/New_York' }));

	const currHour = currentTime.getHours();
	const estDay = easternTime.getDay(), estHour = easternTime.getHours();

	const tzdiff = (currHour < estHour) ? ((24 - estHour) + currHour) : (currHour - estHour);

	// Event "week" starts and ends on Monday at Noon ET
	let eventDay = [6, 0, 1, 2, 3, 4, 5][estDay];
	eventDay = estHour < 12 ? (eventDay-1 < 0 ? 6 : eventDay-1) : eventDay;

	// Event end time is Monday Noon ET (Event Day "7", 0:00:00)
	let endTime = new Date();
	endTime.setDate(endTime.getDate()+(6-eventDay));
	endTime.setHours(12 + tzdiff, 0, 0, 0);	// Noon ET is 16/15:00:00 UTC

	if (endTime.getDay() === 0) {
		endTime.setDate(endTime.getDate()+1);
	}

	// Event start time is Thursday Noon ET (Event Day 3, 0:00:00)
	//	aka exactly 4 days before endTime
	let startTime = new Date(endTime.getTime());
	startTime.setDate(startTime.getDate()-4);

	let start = 0;
	let diff = endTime.getTime() - easternTime.getTime();
	const end = Math.floor((diff)/1000);

	// Event hasn't started yet
	if (eventDay < 3) {
		diff = startTime.getTime() - easternTime.getTime();
		start = Math.floor((diff)/1000);
	}

	return { start, end, startTime, endTime };
}

export async function getRecentEvents(allCrew: CrewMember[], allEvents: EventInstance[], allShips?: Ship[]): Promise<IEventData[]> {
	const recentEvents = [] as IEventData[];

	const { start, end } = getCurrentStartEndTimes();
	const currentEventId = guessCurrentEventId(allEvents);

	let index = 1;
	while (recentEvents.length < 2) {
		const eventId = allEvents[allEvents.length-index].instance_id;
		const response = await fetch('/structured/events/'+eventId+'.json');
		const json = await response.json();
		const eventData = getEventData(json, allCrew, allShips) as IEventData;
		if (eventId === currentEventId) {
			eventData.seconds_to_start = start;
			eventData.seconds_to_end = end;
			// Assume in phase 2 of ongoing event
			if (eventData.content_types.length === 2 && end < 2*24*60*60) {
				eventData.content_types = [eventData.content_types[1]];
			}
		}
		recentEvents.unshift(eventData);
		index++;
		if (eventId === currentEventId) break;
	}

	return recentEvents;
}

function guessBonusCrew(activeEvent: GameEvent, allCrew: CrewMember[]): { bonus: string[], featured: string[] } {
	const bonus = [] as string[];
	const featured = [] as string[];

	for (let threshold of activeEvent.threshold_rewards) {
		for (let reward of threshold.rewards) {
			if (allCrew.some(c => c.symbol === reward.symbol && c.max_rarity === 5)) {
				if (!featured.includes(reward.symbol!))
					featured.push(reward.symbol!);
			}
		}
	}

	// for (let ranked of activeEvent.ranked_brackets) {
	// 	for (let reward of ranked.rewards) {
	// 		if (allCrew.some(c => c.symbol === reward.symbol && c.max_rarity === 4)) {
	// 			featured.push(reward.symbol!);
	// 		}
	// 	}
	// }

	// Guess bonus crew from bonus_text
	//	bonus_text seems to be reliably available, but might be inconsistently written
	if (activeEvent.bonus_text !== '') {
		const words = activeEvent.bonus_text.replace('Crew Bonus: ', '').replace('Bonus: ', '').replace(' crew', '').replace('(Ship/Crew)', '').replace('(Ship)', '').replace('(Crew)', '').replace(/\sor\s/, ',').split(',').filter(word => word !== '');
		words.forEach(trait => {
			// Search for exact name first
			const testName = trait.trim();
			const perfectName = allCrew.find(crew => (crew.name_english ?? crew.name) === testName);
			if (perfectName) {
				if (!featured.includes(perfectName.symbol))
					featured.push(perfectName.symbol);

				if (!bonus.includes(perfectName.symbol))
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
					// Plural of trait
					else if (testTrait.endsWith('s')) {
						const imperfectTrait = testTrait.slice(0, testTrait.length - 1);
						const imperfectTraits = allCrew.filter(crew => crew.traits.includes(imperfectTrait) || crew.traits_hidden.includes(imperfectTrait));
						imperfectTraits.forEach(crew => {
							if (!bonus.includes(crew.symbol))
								bonus.push(crew.symbol);
						});
					}
					// Timelines originals
					else if (testTrait === 'stt originals') {
						const imperfectTrait = 'original';
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
				// the ranked reward may contain the 'small bonus' featured trait. skip it.
				if (activeEvent.ranked_brackets.some(s => s.rewards.some(rs => rs.symbol === crew.symbol))) return;

				if (bonus.includes(crew.symbol)) {
					if (!featured.includes(crew.symbol))
						featured.push(crew.symbol);
				}
			});
		});
	}

	return { bonus: [ ... new Set(bonus)], featured: [...new Set(featured)] };
}

// Formula based on PADD's EventHelperGalaxy, assuming craft_config is constant
export function calculateGalaxyChance(skillValue: number) : number {
	const craft_config = {
		specialist_chance_formula: {
			steepness: 0.3,
			midpoint: 5.5
		},
		specialist_challenge_rating: 1050,
		specialist_failure_bonus: 0.05,
		specialist_maximum_success_chance: 0.99
	};

	const midpointOffset: number = skillValue / craft_config.specialist_challenge_rating;
	const val: number = Math.floor(
		100 /
			(1 +
				Math.exp(
					-craft_config.specialist_chance_formula.steepness *
						(midpointOffset - craft_config.specialist_chance_formula.midpoint)
				)
			)
	);
	return Math.round(Math.min(val / 100, craft_config.specialist_maximum_success_chance)*100);
}

function getBonus(crew: IEventScoredCrew, eventData: IEventData, low: number, high: number, detail?: boolean) {
	if (detail && eventData.bonus_detail) {
		let detail = eventData.bonus_detail.find(f => f.symbol === crew.symbol);
		if (detail) return detail.amount;
	}
	if (eventData.featured.includes(crew.symbol) || (eventData.bonus.includes(crew.symbol) && eventData.bonusGuessed && (new Date()).getTime() - (new Date(crew.date_added)).getTime() < (14 * 24 * 60 * 60 * 1000))) {
		return high;
	}
	else if (eventData.bonus.includes(crew.symbol)) {
		return low;
	}
	else {
		return 1;
	}
}

export function computeEventBest(
	rosterCrew: IEventScoredCrew[],
	eventData: IEventData,
	phaseType: string,
	buffConfig?: BuffStatTable,
	applyBonus?: boolean,
	showPotential?: boolean,
	) {

	let bestCombos: IBestCombos = {};
	const zeroCombos: IEventCombos = {};

	for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
		let firstSkill = CONFIG.SKILLS_SHORT[first];
		zeroCombos[firstSkill.name] = 0;
		for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
			let secondSkill = CONFIG.SKILLS_SHORT[second];
			zeroCombos[firstSkill.name+','+secondSkill.name] = 0;
		}
	}

	const getPairScore = (crew: IRosterCrew, primary: string, secondary: string) => {
		if (phaseType === 'shuttles') {
			if (secondary) return crew[primary].core+(crew[secondary].core/4);
			return crew[primary].core;
		}
		if (secondary) return (crew[primary].core+crew[secondary].core)/2;
		return crew[primary].core/2;
	};

	rosterCrew.forEach(crew => {
		// First adjust skill scores as necessary
		if (applyBonus || showPotential) {
			crew.bonus = 1;
			if (applyBonus && (eventData.bonus.includes(crew.symbol) || eventData.featured.includes(crew.symbol))) {
				if (phaseType === 'gather') crew.bonus = getBonus(crew, eventData, 5, 10);
				else if (phaseType === 'shuttles') crew.bonus = getBonus(crew, eventData, 2, 3);
				else if (phaseType === 'skirmish') crew.bonus = getBonus(crew, eventData, 1.5, 2);
				else if (phaseType === 'voyage') crew.bonus = getBonus(crew, eventData, 50, 100, true);
			}
			if (crew.bonus > 1 || showPotential) {
				CONFIG.SKILLS_SHORT.forEach(skill => {
					if (crew[skill.name].core > 0) {
						if (showPotential && crew.immortal === CompletionState.NotComplete && !crew.prospect) {
							crew[skill.name].current = crew[skill.name].core*crew.bonus;
							if (buffConfig) crew[skill.name] = applySkillBuff(buffConfig, skill.name, crew.skill_data[crew.rarity-1].base_skills[skill.name]);
						}
						if (phaseType !== 'voyage') {
							crew[skill.name].core = crew[skill.name].core*crew.bonus;
						}
						else {
							crew[skill.name].core = crew[skill.name].core;
						}

					}
				});
			}
		}

		// Then calculate skill combination scores
		let combos: IEventCombos = {...zeroCombos};
		let bestPair: IEventPair = { score: 0, skillA: '', skillB: '' };
		let bestSkill: IEventSkill = { score: 0, skill: '' };
		for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
			const firstSkill = CONFIG.SKILLS_SHORT[first];
			const single = {
				score: crew[firstSkill.name].core,
				skillA: firstSkill.name
			};
			combos[firstSkill.name] = single.score;
			if (!bestCombos[firstSkill.name] || single.score > bestCombos[firstSkill.name].score)
				bestCombos[firstSkill.name] = { id: crew.id, score: single.score };
			if (single.score > bestSkill.score) bestSkill = { score: single.score, skill: single.skillA };
			for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
				const secondSkill = CONFIG.SKILLS_SHORT[second];
				let pair = {
					score: getPairScore(crew, firstSkill.name, secondSkill.name),
					skillA: firstSkill.name,
					skillB: secondSkill.name
				}
				if (crew[secondSkill.name].core > crew[firstSkill.name].core) {
					pair = {
						score: getPairScore(crew, secondSkill.name, firstSkill.name),
						skillA: secondSkill.name,
						skillB: firstSkill.name
					}
				}
				combos[firstSkill.name+','+secondSkill.name] = pair.score;
				if (pair.score > bestPair.score) bestPair = pair;
				const pairId = firstSkill.name+secondSkill.name;
				if (!bestCombos[pairId] || pair.score > bestCombos[pairId].score)
					bestCombos[pairId] = { id: crew.id, score: pair.score };
			}
		}

		crew.combos = combos;
		crew.bestPair = bestPair;
		crew.bestSkill = bestSkill;
	});

	return bestCombos;
}

export async function getEvents(globalContext: IDefaultGlobal): Promise<IEventData[]> {
	const { ephemeral } = globalContext.player;

	// Get event data from recently uploaded playerData
	if (ephemeral?.events) {
		const currentEvents = ephemeral.events.map((ev) => getEventData(ev, globalContext.core.crew, globalContext.core.ship_schematics.map(m => m.ship)))
			.filter(ev => ev !== undefined).map(ev => ev as IEventData)
			.filter(ev => ev.seconds_to_end > 0)
			.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
		return currentEvents;
	}
	// Otherwise guess event from autosynced events
	else {
		return await getRecentEvents(globalContext.core.crew, globalContext.core.event_instances);
	}
}