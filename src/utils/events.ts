//import allEvents from '../../static/structured/event_instances.json';
import { CrewMember } from '../model/crew';
import { CompletionState, Content, GameEvent, PlayerCrew, Shuttle, SpecialistMission } from '../model/player';
import { IBestCombos, IEventCombos, IEventData, IEventPair, IEventScoredCrew, IEventSkill, IRosterCrew } from '../components/eventplanner/model';
import { EventInstance } from '../model/events';
import CONFIG from '../components/CONFIG';
import { applySkillBuff, crewCopy, getShortNameFromTrait, getVariantTraits } from './crewutils';
import { BuffStatTable } from './voyageutils';
import { IDefaultGlobal } from '../context/globalcontext';
import { Ship } from '../model/ship';
import { TraitNames } from '../model/traits';

export function getEventData(activeEvent: GameEvent, allCrew: CrewMember[], allShips?: Ship[], lastEvent?: GameEvent): IEventData | undefined {

	if (!activeEvent?.phases?.length) return undefined;

	const result: IEventData = {
		symbol: activeEvent.symbol,
		name: activeEvent.name,
		description: activeEvent.description,
		bonus_text: activeEvent.bonus_text,
		content_types: activeEvent.content_types,
		seconds_to_start: activeEvent.seconds_to_start,
		seconds_to_end: activeEvent.seconds_to_end,

		// We can get event image more definitively by fetching from events/instance_id.json rather than player data
		image: activeEvent?.phases[0].splash_image.file.slice(1).replace(/\//g, '_') + '.png',

		// Bonus crew by symbol
		featured: [],
		bonus: [],

		// Bonus ships by symbol
		featured_ships: [],
		bonus_ships: []
	};

	// activeContent holds details about the active phase of a started event or the first phase of an unstarted event
	let activeContent: Content | undefined = undefined;

	// Content from autosynced events is an array of activeContents, taken at various sync times
	//	Assume the last content here is the most recent content
	if (Array.isArray(activeEvent.content)) {
		if (activeEvent.content.length > 0)
			activeContent = activeEvent.content[activeEvent.content.length - 1];
	}
	else {
		activeContent = activeEvent.content;
	}

	if (!activeContent) return result;

	result.activeContent = activeContent;

	// Standardize lists of bonus crew and ships
	//	This may not catch all bonus crew in hybrids, e.g. "dirty" shuttles while in phase 2 skirmish
	if (activeContent.content_type === 'shuttles' && activeContent.shuttles) {
		activeContent.shuttles.forEach((shuttle: Shuttle) => {
			for (let symbol in shuttle.crew_bonuses) {
				if (!result.bonus.includes(symbol)) {
					result.bonus.push(symbol);
					if (shuttle.crew_bonuses[symbol] === 3) result.featured.push(symbol);
				}
			}
		});
	}
	else if (activeContent.content_type === 'gather' && activeContent.crew_bonuses) {
		for (let symbol in activeContent.crew_bonuses) {
			if (!result.bonus.includes(symbol)) {
				result.bonus.push(symbol);
				if (activeContent.crew_bonuses[symbol] === 10) result.featured.push(symbol);
			}
		}
	}
	else if (activeContent.content_type === 'skirmish') {
		if (activeContent.bonus_crew) {
			for (let i = 0; i < activeContent.bonus_crew.length; i++) {
				let symbol = activeContent.bonus_crew[i];
				if (!result.bonus.includes(symbol)) {
					result.bonus.push(symbol);
					result.featured.push(symbol);
				}
			}
		}
		// Skirmish uses content.bonus_traits to identify smaller bonus event crew
		if (activeContent.bonus_traits) {
			activeContent.bonus_traits.forEach(trait => {
				const perfectTraits = allCrew.filter(crew => crew.traits.includes(trait) || crew.traits_hidden.includes(trait));
				perfectTraits.forEach(crew => {
					if (!result.bonus.includes(crew.symbol)) {
						result.bonus.push(crew.symbol);
					}
				});
			});
		}

		if (activeContent.event_ships && allShips) {
			result.featured_ships = activeContent.event_ships.map(sId => allShips.find(ship => ship.archetype_id === sId)!.symbol);
		}
	}
	else if (activeContent.content_type === 'voyage') {
		result.bonus = activeContent.featured_crews?.slice () ?? [];
		result.featured = activeContent.featured_crews?.slice () ?? [];

		// Voyages use content.antimatter_bonus_crew_traits to identify smaller bonus event crew
		activeContent.antimatter_bonus_crew_traits?.forEach(bonusTrait => {
			allCrew.filter(crew =>
				crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait)
			).forEach(crew => {
				if (!result.bonus.includes(crew.symbol))
					result.bonus.push(crew.symbol);
			});
		});

		if (allShips?.length) {
			result.bonus_ships = activeContent.featured_ships?.slice() ?? [];
			result.featured_ships = activeContent.featured_ships?.slice() ?? [];
			activeContent.antimatter_bonus_ship_traits?.forEach(bonusTrait => {
				allShips.filter(ship =>
					ship.traits?.includes(bonusTrait) || ship.traits_hidden?.includes(bonusTrait)
				).forEach(ship => {
					if (!result.bonus_ships.includes(ship.symbol))
						result.bonus_ships.push(ship.symbol);
				});
			});
		}
	}
	else if (activeContent.content_type === 'galaxy') {
		result.bonus = activeContent.featured_crews?.slice () ?? [];
		result.featured = activeContent.featured_crews?.slice () ?? [];

		// Specialist events use content.featured_traits to identify smaller bonus event crew
		activeContent.featured_traits?.forEach(bonusTrait => {
			allCrew.filter(crew =>
				crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait)
			).forEach(crew => {
				if (!result.bonus.includes(crew.symbol) && !result.featured.includes(crew.symbol))
					result.bonus.push(crew.symbol);
			});
		});
	}

	// Guess featured crew when not explicitly listed in event data (e.g. pre-start skirmish or hybrid w/ phase 1 skirmish)
	if (result.bonus.length === 0) {
		const { bonus, featured } = guessBonusCrew(activeEvent, allCrew, lastEvent);
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
	return allEvents[allEvents.length-currentIndex]?.instance_id || 0;
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
	let lastEvent = undefined as GameEvent | undefined;

	while (recentEvents.length < 2) {
		const eventId = allEvents[allEvents.length-index]?.instance_id || 0;
		if (!eventId) break;
		const response = await fetch('/structured/events/'+eventId+'.json');
		const json = await response.json();
		const eventData = getEventData(json, allCrew, allShips, lastEvent) as IEventData;
		lastEvent = json;
		if (eventId === currentEventId) {
			eventData.seconds_to_start = start;
			eventData.seconds_to_end = end;
			// Assume in phase 2 of ongoing event
			// if (eventData.content_types.length === 2 && end < 2*24*60*60) {
			// 	eventData.content_types = [eventData.content_types[1]];
			// }
		}
		recentEvents.unshift(eventData);
		index++;
		if (eventId === currentEventId) break;
	}

	return recentEvents;
}

function guessBonusCrew(activeEvent: GameEvent, allCrew: CrewMember[], lastEvent?: GameEvent): { bonus: string[], featured: string[] } {
	const bonus = [] as string[];
	const featured = [] as string[];
	const leLegend = lastEvent?.ranked_brackets[0].rewards.find(f => f.type === 1 && f.rarity === 5);
	const leSuperRare = activeEvent?.ranked_brackets[0].rewards.find(f => f.type === 1 && f.rarity === 4);
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
				let altPass = false;
				if (leLegend) {
					const altLegend = allCrew.find(crew => leLegend.symbol === crew.symbol && getVariantTraits(crew).some(trait => perfectName.traits_hidden.includes(trait)));
					if (altLegend) {
						altPass = true;
						if (!featured.includes(altLegend.symbol))
							featured.push(altLegend.symbol);
						if (!bonus.includes(altLegend.symbol))
							bonus.push(altLegend.symbol);
					}
				}
				if (!altPass && leSuperRare) {
					const altSuperRare = allCrew.find(crew => leSuperRare.symbol === crew.symbol && getVariantTraits(crew).some(trait => perfectName.traits_hidden.includes(trait)));
					if (altSuperRare) {
						altPass = true;
						if (!featured.includes(altSuperRare.symbol))
							featured.push(altSuperRare.symbol);
						if (!bonus.includes(altSuperRare.symbol))
							bonus.push(altSuperRare.symbol);
					}
				}

				if (!altPass) {
					if (!featured.includes(perfectName.symbol))
						featured.push(perfectName.symbol);
				}

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
				else {
					// Plural of trait
					if (testTrait.endsWith('s')) {
						const imperfectTrait = testTrait.slice(0, testTrait.length - 1);
						const imperfectTraits = allCrew.filter(crew => crew.traits.some(trait => trait.replace(/_/g, '') === imperfectTrait) || crew.traits_hidden.some(trait => trait.replace(/_/g, '') === imperfectTrait));
						imperfectTraits.forEach(crew => {
							if (!bonus.includes(crew.symbol))
								bonus.push(crew.symbol);
						});
					}
					// Timelines originals
					else if (testTrait === 'sttoriginals') {
						const imperfectTrait = 'original';
						const imperfectTraits = allCrew.filter(crew => crew.traits.includes(imperfectTrait) || crew.traits_hidden.includes(imperfectTrait));
						imperfectTraits.forEach(crew => {
							if (!bonus.includes(crew.symbol))
								bonus.push(crew.symbol);
						});
					}
					// Otherwise try matching last name only (e.g. J. Archer should be Archer)
					else if (/\s/.test(testName)) {
						const imperfectTrait = testName.replace(/^.+\s/, '').toLowerCase();
						const imperfectTraits = allCrew.filter(crew => {
							if (crew.traits.includes(imperfectTrait) || crew.traits_hidden.includes(imperfectTrait)) return true;
							let c = getVariantTraits(crew).map((trait) => getShortNameFromTrait(trait, crew));
							if (c.some(s => s === testName)) return true;
							return false;
						});
						imperfectTraits.forEach(crew => {
							if (!bonus.includes(crew.symbol))
								bonus.push(crew.symbol);
						});
					}
				}
			}
			if (leLegend && !featured.includes(leLegend.symbol!)) featured.push(leLegend.symbol!);
			if (leLegend && !bonus.includes(leLegend.symbol!)) bonus.push(leLegend.symbol!);
			if (leSuperRare && !featured.includes(leSuperRare.symbol!)) featured.push(leSuperRare.symbol!);
			if (leSuperRare && !bonus.includes(leSuperRare.symbol!)) bonus.push(leSuperRare.symbol!);
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
	if (detail) {
		let amount: number = 0;
		const activeContent: Content | undefined = eventData.activeContent;
		if (activeContent && activeContent.content_type === 'voyage') {
			if (activeContent.featured_crews?.includes(crew.symbol)) {
				amount = activeContent.antimatter_bonus_for_featured_crew ?? high;
			}
			else {
				if (activeContent.antimatter_bonus_crew_traits?.some(trait => (crew.traits.includes(trait) || crew.traits_hidden.includes(trait)))) {
					amount = (activeContent.antimatter_bonus_per_crew_trait ?? low);
				}
				// activeContent.antimatter_bonus_crew_traits?.forEach(trait => {
				// 	if (crew.traits.includes(trait) || crew.traits_hidden.includes(trait)) {
				// 		amount += (activeContent.antimatter_bonus_per_crew_trait ?? low);
				// 	}
				// });
			}
		}
		else {
			if (eventData.featured.includes(crew.symbol))
				amount = high;
			else if (eventData.bonus.includes(crew.symbol))
				amount = low;
		}
		return amount;
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

export function getSpecialistBonus(eventData: IEventData) {
	if (!eventData.activeContent?.bonus_chance_inc ||
		!eventData.activeContent?.main_mission ||
		!eventData.activeContent?.featured_crew_bonus_chance ||
		!eventData.activeContent?.featured_trait_bonus_chance
	) return undefined;

	const inc = eventData.activeContent.bonus_chance_inc;
	const failures = eventData.activeContent.main_mission.bonus_failures;

	const high = eventData.activeContent.featured_crew_bonus_chance + (inc * failures);
	const low = eventData.activeContent.featured_trait_bonus_chance + (inc * failures);

	return { high, low };
}

export function crewSpecialistBonus(crew: IRosterCrew, eventData: IEventData) {
	let bonuses = getSpecialistBonus(eventData);
	if (!bonuses) return 0;
	return eventData.featured.includes(crew.symbol) ? bonuses.high : eventData.bonus.includes(crew.symbol) ? bonuses.low : 0;
}

export function calculateSpecialistTime(crew: PlayerCrew, eventData: IEventData, mission: SpecialistMission | number) {
	if (!eventData.activeContent?.missions?.length || !eventData.activeContent.completion_progress || !eventData.activeContent.passive_progress_interval) return undefined;

	if (typeof mission === 'number') {
		mission = eventData.activeContent.missions[mission];
	}

	const goal = eventData.activeContent.completion_progress;
	const inc = eventData.activeContent.passive_progress_interval;

	let bonus_mul = 1 + (mission.bonus_traits.filter(f => crew.traits.includes(f)).length * 0.5);
	let best = 0;

	for (let skill of mission.requirements) {
		if (mission.min_req_threshold == mission.requirements.length && !crew[skill]?.core) return undefined;
		else if (crew[skill].core > best) best = crew[skill].core;
	}

	if (!best) return undefined;
	best *= bonus_mul;

	let minutes = Math.ceil(goal / best);
	let hours = Math.floor(minutes / inc);

	minutes = Math.ceil(minutes - (hours * inc));

	return {
		hours,
		minutes,
		total_minutes: minutes + (hours * 60)
	}
}

export function calcSpecialistCost(eventData: IEventData, minutes: number, supply_kit?: number) {
	if (!eventData?.activeContent?.skip_mission_cost_interval || !eventData?.activeContent?.skip_mission_cost_per_interval) return 0;
	const interval = eventData.activeContent.skip_mission_cost_interval;
	const cost = eventData.activeContent.skip_mission_cost_per_interval;
	let total = (Math.ceil((minutes * 60) / interval) * cost);
	if (supply_kit) {
		total = Math.ceil(total * ((100 - supply_kit) / 100));
	}
	return total;
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

	const getVoyScore = (crew: IRosterCrew, skill: string) => {
		return crew[skill].core + (crew[skill].min + crew[skill].max) / 2;
	};

	const getPairScore = (crew: IRosterCrew, primary: string, secondary: string) => {
		if (phaseType === 'shuttles') {
			if (secondary) return crew[primary].core+(crew[secondary].core/4);
			return crew[primary].core;
		}
		else if (phaseType === 'galaxy') {
			if (secondary) return !crew[secondary]?.core ? 0 : Math.max(crew[primary].core, crew[secondary].core);
			return crew[primary].core;
		}
		else if (phaseType === 'voyage') {
			if (secondary) return getVoyScore(crew, primary) + getVoyScore(crew, secondary);
			return getVoyScore(crew, primary);
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
				else if (phaseType === 'galaxy') {
					const bonuses = getSpecialistBonus(eventData);

					if (bonuses?.high && bonuses?.low) {
						crew.bonus = getBonus(crew, eventData, bonuses.low, bonuses.high);
					}
				}
				else if (phaseType === 'shuttles') crew.bonus = getBonus(crew, eventData, 2, 3);
				else if (phaseType === 'skirmish') crew.bonus = getBonus(crew, eventData, 1.5, 2);
				else if (phaseType === 'voyage') crew.bonus = getBonus(crew, eventData, 50, 150, true);
			}
			if ((crew.bonus > 1 || showPotential) && (phaseType !== 'galaxy')) {
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
			const firstSkillScore: number = phaseType === 'voyage' ? getVoyScore(crew, firstSkill.name) : crew[firstSkill.name].core;
			const single = {
				score: firstSkillScore,
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
		let _lev = undefined as GameEvent | undefined;

		if (ephemeral.events.length > 1 && ephemeral.events[0].seconds_to_start === 0) {
			_lev = ephemeral.events[0];
		}
		else {
			let lasts = globalContext.core.event_instances.filter(f => !ephemeral.events.some(e => e.instance_id === f.instance_id)).sort((a, b) => b.instance_id - a.instance_id);
			if (lasts.length) {
				const lastResp = await fetch(`/structured/events/${lasts[0].instance_id}.json`);
				_lev = await lastResp.json() as GameEvent;
			}
		}
		const lastEvent = _lev;
		const currentEvents = ephemeral.events.map((ev) => getEventData(ev, globalContext.core.crew, globalContext.core.all_ships.map(m => ({...m, levels: undefined })), lastEvent))
			.filter(ev => ev !== undefined).map(ev => ev as IEventData)
			.filter(ev => ev.seconds_to_end > 0)
			.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
		return currentEvents;
	}
	// Otherwise guess event from autosynced events
	else {
		return await getRecentEvents(globalContext.core.crew, globalContext.core.event_instances, globalContext.core.ships);
	}
}

export function guessEncounterTraits(gameEvent: GameEvent, english: TraitNames): string[] {
	const traits: string[] = [];
	const searchText = "Three of the following traits are randomly chosen for each Encounter:";
	let ei: number = gameEvent.rules.indexOf(searchText);
	if (ei !== -1) {
		let en: number = gameEvent.rules.indexOf(".", ei + searchText.length);
		if (en !== -1) {
			const namedTraits: string[] = gameEvent.rules.slice(ei + searchText.length, en).split(",").map(s => s.trim());
			Object.entries(english).forEach(([trait, text]) => {
				if (namedTraits.includes(text)) traits.push(trait);
			});
		}
	}
	return traits;
}

export function guessEncounterTimes(gameEvent: GameEvent, as: 'minutes' | 'seconds'): number[] {
	const values: number[] = [];
	const searchText = "Voyage Encounters take place at the following points in time:";
	let ei: number = gameEvent.rules.indexOf(searchText);
	if (ei !== -1) {
		let en: number = gameEvent.rules.indexOf("and", ei + searchText.length);
		if (en !== -1) {
			const namedTimes: string[] = gameEvent.rules.slice(ei + searchText.length, en).split(",").map(s => s.trim()).filter(s => s);
			namedTimes.forEach((time) => {
				let parts = time.split(" ");
				let value = Number(parts[0]);
				if (parts[1].toLocaleLowerCase().includes("hour")) value *= 60;
				if (as == 'seconds') value *= 60;
				values.push(value);
			})
		}
	}
	return values;
}


