// Voyage calculation inspired by TemporalAgent7 and IAmPicard before that
//  https://github.com/stt-datacore/website
//  https://github.com/iamtosk/StarTrekTimelinesSpreadsheet

import { BaseSkills } from '../../model/crew';
import { VoyageSkills } from '../../model/player';
import { IVoyageCrew, IVoyageEventContent, IVoyageInputConfig } from '../../model/voyage';

import { IBoosts, IPrimedCrew, IVoyagerScore, IAssemblerOptions } from './model';
import { VoyagersLineup } from './lineup';
import { seatCrew } from './crewseater';

interface IVector {
	id: number;
	attempt: number;
	boosts: IBoosts;
	primeFactor: number;
	deltas: IDeltas;
};

interface IDeltas {
	primary: number;
	secondary: number;
};

interface IUniqueLineup {
	uniqueId: string;
	bestAntimatter: number;
	vectors: number[];
	lineup: VoyagersLineup;
};

const SKILL_IDS: string[] = [
	'command_skill', 'diplomacy_skill', 'security_skill',
	'engineering_skill', 'science_skill', 'medicine_skill'
];

export const MultiVectorAssault = (
	voyage: IVoyageInputConfig,
	crew: IVoyageCrew[],
	options: IAssemblerOptions = {}
): Promise<VoyagersLineup[]> => {
	sendProgress(`Studying crew...`);
	const primedRoster: IPrimedCrew[] = getPrimedRoster();
	sendProgress(`Considering ${primedRoster.length} crew for this voyage...`);

	const uniques: IUniqueLineup[] = [];
	return new Promise((resolve, reject) => {
		let boosts: IBoosts = { primary: 1, secondary: 1, other: 1 };
		const control: VoyagersLineup | false = getBoostedLineup(primedRoster, boosts);
		if (!control) {
			reject(`Critical error: MVAM unable to construct a voyage control lineup!`);
			return;
		}
		const controlFactor: number = getPrimeFactor(control.score);

		const deltas: number[] = [0, 0.05, -0.05, 0.1, -0.1, 0.15, -0.15, 0.25, -0.25];
		const promises: Promise<number>[] = deltas.map((delta: number, index: number) => {
			const primeFactor: number = controlFactor+delta;
			if (options.customBoosts) {
				boosts = options.customBoosts;
			}
			else {
				boosts = {
					primary: control.score/10*primeFactor/control.skills[voyage.skills.primary_skill].voyage,
					secondary: control.score/10*primeFactor/control.skills[voyage.skills.secondary_skill].voyage,
					other: 1
				};
			}
			return doVector(index+1, primedRoster, boosts, primeFactor);
		});
		Promise.all(promises).then(_vectorIds => {
			sendProgress(`${uniques.length} potential lineups assembled!`);
			const lineups: VoyagersLineup[] = uniques.map(unique => {
				return {
					...unique.lineup,
					vectors: unique.vectors
				};
			});
			resolve(lineups);
		})
		.catch(error => {
			reject(error);
		});
	});

	function getPrimedRoster(): IPrimedCrew[] {
		const skills: VoyageSkills = voyage.skills;

		const dilemmaTraits: string[] = [];
		for (let i = 0; i < voyage.crew_slots.length; i++) {
			dilemmaTraits.push(voyage.crew_slots[i].trait);
		}

		const proficiencyFactor: number = options.proficiency ?? 1;

		const primedRoster: IPrimedCrew[] = [];
		for (let i = 0; i < crew.length; i++) {
			let dPrimaryScore: number = 0, dSecondaryScore: number = 0, dOtherScore: number = 0;

			// Crew are viable if they have matching skill (and therefore seat skill slots)
			//	1 = viable; 0 = not viable
			const viableSkills: number[] = [0, 0, 0, 0, 0, 0];
			const viableSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

			// Antimatter value for matching slot trait or encounter crew traits
			//	0 or 25 for dilemma voyages; 0, 50, 100, or 150 for encounter voyages
			const traitSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

			const crewId: number = crew[i].id ?? i;
			const crewSkills: BaseSkills = crew[i].skills ? JSON.parse(JSON.stringify(crew[i].skills)) : {};

			let eventTraitBonus: number = 0, eventCrewVP: number = 0, eventCrewFactor: number = 1, eventCritTraits: number = 0;
			if (voyage.voyage_type === 'encounter' && voyage.event_content) {
				eventTraitBonus = getEncounterTraitBonus(crew[i], voyage.event_content);
				eventCrewVP = getEncounterCrewVP(crew[i], voyage.event_content);
				// eventCrewFactor = (eventCrewVP/5)+1;	// 3 for featured, 2 for small bonus, 1 for non-event crew
				eventCritTraits = countEncounterCrewCritTraits(crew[i], voyage.event_content);
			}

			let bGeneralist: boolean = true;
			for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
				const skillId: string = SKILL_IDS[iSkill];
				if (!crewSkills[skillId]) continue;

				viableSkills[iSkill] = 1;
				viableSlots[iSkill*2] = 1;
				viableSlots[(iSkill*2)+1] = 1;

				let dProficiency: number = 0;
				if (proficiencyFactor > 0) {
					dProficiency = (crewSkills[skillId].range_min+(crewSkills[skillId].range_max*proficiencyFactor))/2;
				}
				const dSkillScore: number = (crewSkills[skillId].core+dProficiency)*eventCrewFactor;

				if (skillId === skills.primary_skill)
					dPrimaryScore = dSkillScore;
				else if (skillId === skills.secondary_skill)
					dSecondaryScore = dSkillScore;
				else
					dOtherScore += dSkillScore;

				if (voyage.voyage_type === 'encounter') {
					traitSlots[iSkill*2] = eventTraitBonus;
					traitSlots[(iSkill*2)+1] = eventTraitBonus;
				}
				else {
					traitSlots[iSkill*2] = crew[i].traits.includes(dilemmaTraits[iSkill*2]) ? 25 : 0;
					traitSlots[(iSkill*2)+1] = crew[i].traits.includes(dilemmaTraits[(iSkill*2)+1]) ? 25 : 0;
				}

				if (skillId === 'engineering_skill' || skillId === 'science_skill' || skillId === 'medicine_skill')
					bGeneralist = false;

				if (options.strategy === 'peak-antimatter') {
					if (traitSlots[iSkill*2] === 0) viableSlots[iSkill*2] = 0;
					if (traitSlots[(iSkill*2)+1] === 0) viableSlots[(iSkill*2)+1] = 0;
					if (traitSlots[iSkill*2] === 0 && traitSlots[(iSkill*2)+1] === 0)
						viableSkills[iSkill] = 0;
				}
			}
			if (options.favorSpecialists && bGeneralist)
				dOtherScore -= dOtherScore/10;

			const traitValues: number[] = [];
			let idealTraitValue: number = 0;
			traitSlots.forEach(slot => {
				if (!traitValues.includes(slot)) traitValues.push(slot);
				if (slot > idealTraitValue) idealTraitValue = slot;
			});
			traitValues.sort((a, b) => b - a);

			const crewman: IPrimedCrew = {
				id: crewId,
				name: crew[i].name,
				skills: crewSkills,
				primary_score: dPrimaryScore,
				secondary_score: dSecondaryScore,
				other_score: dOtherScore,
				viable_slots: viableSlots,
				trait_slots: traitSlots,
				trait_values: traitValues,
				ideal_trait_value: idealTraitValue,
				event_score: eventCrewVP,
				event_crit_traits: eventCritTraits
			};
			primedRoster.push(crewman);
		}
		return primedRoster;
	}

	function getEncounterTraitBonus(crew: IVoyageCrew, content: IVoyageEventContent): number {
		let bonus: number = 0;
		if (content.featured_crews.includes(crew.symbol)) {
			bonus = content.antimatter_bonus_for_featured_crew;
		}
		else {
			if (content.antimatter_bonus_crew_traits.some(bonusTrait => (crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait)))) {
				bonus = content.antimatter_bonus_per_crew_trait;
			}

			// content.antimatter_bonus_crew_traits.forEach(bonusTrait => {
			// 	if (crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait))
			// 		bonus += content.antimatter_bonus_per_crew_trait;
			// });
		}
		return bonus;
	}
	// Default passive bonuses hardcoded here to 0.3 and 0.15
	//	passive_bonus should always be preset in config.event_content
	function getEncounterCrewVP(crew: IVoyageCrew, content: IVoyageEventContent): number {
		let crewVP: number = 0;
		if (content.featured_crews.includes(crew.symbol)) {
			crewVP = content.passive_bonus?.event_crew ?? 0.3;
		}
		else {
			if (content.antimatter_bonus_crew_traits.some(bonusTrait => {
				return crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait);
			})) {
				crewVP = content.passive_bonus?.event_trait ?? 0.15;
			}
		}
		return crewVP;
	}

	function countEncounterCrewCritTraits(crew: IVoyageCrew, content: IVoyageEventContent): number {
		let critTraits: number = 0;
		content.encounter_traits?.forEach(encounterTrait => {
			if (crew.traits.includes(encounterTrait))
				critTraits++;
		});
		return critTraits;
	}

	// These base target values were determined from simulations using Joshurtree's revised Chewable
	function getPrimeFactor(totalScore: number): number {
		const baseTarget: number = totalScore/10;
		let primeFactor: number = 3.5;
		if (baseTarget >= 9100)
			primeFactor = 2.0;
		else if (baseTarget >= 6200)
			primeFactor = 2.25;
		else if (baseTarget >= 4100)
			primeFactor = 2.5;
		else if (baseTarget >= 3200)
			primeFactor = 2.75;
		else if (baseTarget >= 2500)
			primeFactor = 3;
		else if (baseTarget >= 2000)
			primeFactor = 3.25;
		return primeFactor;
	}

	function doVector(vectorId: number, primedRoster: IPrimedCrew[], boosts: IBoosts, primeFactor: number): Promise<number> {
		// Vector will stop seeking lineups after this many attempts
		//	Increase to test more iterations at the expense of time
		//	Unique lineups tend to stop being found after 50 attempts
		const MAX_ATTEMPTS: number = 100;

		// Vector will also stop after finding this many unique lineups
		const MAX_UNIQUES: number = 10;

		// Vector will also stop if it goes this many consecutive attempts without finding a unique lineup
		const MAX_REPEATS: number = 20;

		return new Promise((resolveVector, rejectVector) => {
			let iUniques: number = 0, iRepeats: number = 0;
			let vectorDone: boolean = false;

			let sequence: Promise<void> = Promise.resolve();
			for (let iAttempt = 0; iAttempt < MAX_ATTEMPTS; iAttempt++) {
				sequence = sequence.then(() => {
					if (vectorDone) return;

					const lineup: VoyagersLineup | false = getBoostedLineup(primedRoster, boosts);

					// Reject lineup
					if (!lineup) throw(`Warning: MVAM vector failed to construct a valid voyage with the requested boosts.`);

					// Deltas compare actual primeFactors to expected primeFactor
					const baseTarget: number = lineup.score/10;
					const primeTarget: number = baseTarget*primeFactor;
					const deltas: IDeltas = {
						primary: (lineup.skills[voyage.skills.primary_skill].voyage-primeTarget)/baseTarget,
						secondary: (lineup.skills[voyage.skills.secondary_skill].voyage-primeTarget)/baseTarget
					};
					// Other delta is primaryDelta+secondaryDelta*-1

					const vector: IVector = {
						id: vectorId,
						attempt: iAttempt,
						boosts,
						primeFactor,
						deltas
					};

					// Only track unique lineups, but also track all vectors that generate them
					const existing: IUniqueLineup | undefined = uniques.find(unique => unique.uniqueId === lineup.key);
					if (existing) {
						existing.vectors.push(vectorId);
						// Use lineup order with higher AM if available
						if (lineup.antimatter > existing.bestAntimatter) {
							existing.bestAntimatter = lineup.antimatter;
							existing.lineup = lineup;
						}
						iRepeats++;
					}
					else {
						sendProgress(`Found ${uniques.length+1} potential lineups so far...`);
						_logVector(vector, lineup);
						uniques.push({
							uniqueId: lineup.key,
							bestAntimatter: lineup.antimatter,
							vectors: [vectorId],
							lineup
						});
						iUniques++;
						iRepeats = 0;
					}

					// Stop looking for lineups if vector has generated enough uniques or reached max repeats
					vectorDone = iUniques >= MAX_UNIQUES || iRepeats >= MAX_REPEATS;

					// Use deltas to reweight boosts for next attempt
					//	Finetune by smaller increments as attempts increase with a min adjust of 0.05
					const finetuneRatio: number = Math.max(1/iAttempt, 0.05);
					const primaryAdjustment: number = deltas.primary*finetuneRatio*-1;
					const secondaryAdjustment: number = deltas.secondary*finetuneRatio*-1;
					// Primary, secondary boost adjustments should be enough that adjustment to other not needed

					const limitBoost = (boost: number): number => {
						if (boost < 0.5) return 0.5;
						if (boost > 3.5) return 3.5;
						return boost;
					};
					boosts = {
						primary: limitBoost(boosts.primary+primaryAdjustment),
						secondary: limitBoost(boosts.secondary+secondaryAdjustment),
						other: boosts.other
					};
				});
			}
			sequence.finally(() => {
				resolveVector(vectorId);
			});
			sequence.catch(error => {
				rejectVector(error);
			});
		});

		function _logVector(vector: IVector, lineup: VoyagersLineup): void {
			if (!options || !options.debugCallback) return;
			let sLineup = '';
			for (let i = 0; i < lineup.crew.length; i++) {
				if (sLineup !== '') sLineup += ', ';
				sLineup += `${lineup.crew[i].name} (${lineup.crew[i].score.toFixed(1)})`;
			}
			options.debugCallback(
				`===== Vector ${vector.id}-${vector.attempt} =====` +
				`\n* Lineup: ${sLineup}` +
				`\n* Total Score: ${lineup.score}` +
				`\n* Skills: ${lineup.skills.command_skill.voyage}, ${lineup.skills.diplomacy_skill.voyage}, ` +
					`${lineup.skills.security_skill.voyage}, ${lineup.skills.engineering_skill.voyage}, ` +
					`${lineup.skills.science_skill.voyage}, ${lineup.skills.medicine_skill.voyage}` +
				`\n* Boosts: ${boosts.primary.toFixed(2)}+${boosts.secondary.toFixed(2)}+${boosts.other.toFixed(2)}` +
				`\n* Prime Factor: ${primeFactor}` +
				`\n* Deltas: ${vector.deltas.primary.toFixed(2)}, ${vector.deltas.secondary.toFixed(2)}`
			);
		}
	}

	function getBoostedLineup(primedRoster: IPrimedCrew[], boosts: IBoosts): VoyagersLineup | false {
		const TRAIT_BOOST: number = voyage.voyage_type === 'encounter' ? 400 : 200;
		const CRIT_BOOST: number = voyage.voyage_type === 'encounter' ? 100 : 0;
		const favorScore = (a: IVoyagerScore, b: IVoyagerScore) => b.score - a.score;
		const favorAntimatter = (a: IVoyagerScore, b: IVoyagerScore) => {
			if (a.traitValue === b.traitValue)
				return b.score - a.score;
			return b.traitValue - a.traitValue;
		};
		const favorVP = (a: IVoyagerScore, b: IVoyagerScore) => {
			// Default passive crew bonus hardcoded here to 0.3
			const PASSIVE_CREW_BONUS: number = voyage.event_content?.passive_bonus?.event_crew ?? 0.3;
			if (options.strategy === 'featured-vp') {
				if (a.eventScore !== b.eventScore) {
					if (a.eventScore === PASSIVE_CREW_BONUS) return -1;
					if (b.eventScore === PASSIVE_CREW_BONUS) return 1;
				}
				return b.score - a.score;
			}
			if (a.eventScore === b.eventScore)
				return b.score - a.score;
			return b.eventScore - a.eventScore;
		};

		const boostedScores: IVoyagerScore[] = [];
		for (let i = 0; i < primedRoster.length; i++) {
			const baseScore: number = primedRoster[i].primary_score*boosts.primary
				+ primedRoster[i].secondary_score*boosts.secondary
				+ primedRoster[i].other_score*boosts.other;
			const traitValues: number[] = primedRoster[i].trait_values;
			const idealTraitValue: number = primedRoster[i].ideal_trait_value;
			traitValues.forEach((traitValue, idx) => {
				const traitFactor: number = traitValues.length-idx-1;
				boostedScores.push({
					score: baseScore+(TRAIT_BOOST*traitFactor)+(CRIT_BOOST*primedRoster[i].event_crit_traits),
					id: primedRoster[i].id,
					isIdeal: traitValue > 0 && traitValue === idealTraitValue,
					traitValue,
					eventScore: primedRoster[i].event_score
				});
			});
		}
		// boostedScores.sort(
		// 	options.strategy === 'peak-antimatter' ? favorAntimatter :
		// 		(options.strategy === 'peak-vp' ? favorVP : favorScore)
		// );
		boostedScores.sort(['peak-vp', 'featured-vp'].includes(options.strategy ?? '') ? favorVP : favorScore);
		return seatCrew(primedRoster, boostedScores, !!options.debugCallback);
	}

	function sendProgress(message: string): void {
		if (options.debugCallback)
			options.debugCallback(message);
		if (options.progressCallback)
			options.progressCallback(message);
	}
};
