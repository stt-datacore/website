// Voyage calculation inspired by TemporalAgent7 and IAmPicard before that
//  https://github.com/stt-datacore/website
//  https://github.com/iamtosk/StarTrekTimelinesSpreadsheet

import { BaseSkills } from '../../model/crew';
import { VoyageSkills } from '../../model/player';
import { IVoyageCrew, IVoyageInputConfig } from '../../model/voyage';

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
		const traits: string[] = [];
		for (let i = 0; i < voyage.crew_slots.length; i++) {
			traits.push(voyage.crew_slots[i].trait);
		}

		const iLuckFactor: number = options.luckFactor ? 0 : 1;

		const primedRoster: IPrimedCrew[] = [];
		for (let i = 0; i < crew.length; i++) {
			let dPrimaryScore: number = 0, dSecondaryScore: number = 0, dOtherScore: number = 0;
			const rViableSkills: number[] = [0, 0, 0, 0, 0, 0];
			const rViableSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			const rTraitSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

			const crewId: number = crew[i].id ?? i;
			const crewSkills: BaseSkills = crew[i].skills ? JSON.parse(JSON.stringify(crew[i].skills)) : {};

			let bGeneralist: boolean = true;
			for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
				const skillId: string = SKILL_IDS[iSkill];
				if (!crewSkills[skillId]) continue;
				rViableSkills[iSkill] = 1;
				rViableSlots[iSkill*2] = 1;
				rViableSlots[(iSkill*2)+1] = 1;
				const dProficiency: number = crewSkills[skillId].range_min+(crewSkills[skillId].range_max-crewSkills[skillId].range_min)/2;
				const dSkillScore: number = crewSkills[skillId].core+iLuckFactor*dProficiency;
				if (skillId === skills.primary_skill)
					dPrimaryScore = dSkillScore;
				else if (skillId === skills.secondary_skill)
					dSecondaryScore = dSkillScore;
				else
					dOtherScore += dSkillScore;
				if (crew[i].traits.indexOf(traits[iSkill*2]) >= 0)
					rTraitSlots[iSkill*2] = 1;
				if (crew[i].traits.indexOf(traits[(iSkill*2)+1]) >= 0)
					rTraitSlots[(iSkill*2)+1] = 1;
				if (skillId === 'engineering_skill' || skillId === 'science_skill' || skillId === 'medicine_skill')
					bGeneralist = false;
				if (options.strategy === 'peak-antimatter') {
					if (rTraitSlots[iSkill*2] === 0) rViableSlots[iSkill*2] = 0;
					if (rTraitSlots[(iSkill*2)+1] === 0) rViableSlots[(iSkill*2)+1] = 0;
					if (rTraitSlots[iSkill*2] === 0 && rTraitSlots[(iSkill*2)+1] === 0)
						rViableSkills[iSkill] = 0;
				}
			}
			if (options.favorSpecialists && bGeneralist)
				dOtherScore -= dOtherScore/10;

			const crewman: IPrimedCrew = {
				id: crewId,
				name: crew[i].name,
				skills: crewSkills,
				primary_score: dPrimaryScore,
				secondary_score: dSecondaryScore,
				other_score: dOtherScore,
				viable_slots: rViableSlots,
				trait_slots: rTraitSlots
			};
			primedRoster.push(crewman);
		}
		return primedRoster;
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
		// Number of attempts and desired lineups should scale to roster size
		const minAttempts: number = 10;
		const maxAttempts: number = Math.max(Math.floor(primedRoster.length/4), minAttempts); // 25% of roster length
		const minUniques: number = Math.max(Math.floor(maxAttempts/4), 5); // 25% of maxAttempts

		return new Promise((resolveVector, rejectVector) => {
			let sequence: Promise<void> = Promise.resolve();
			let iAttempts: number = 0, iUniques: number = 0;
			for (let i = 0; i < maxAttempts; i++) {
				sequence = sequence.then(() => {
					const lineup: VoyagersLineup | false = getBoostedLineup(primedRoster, boosts);

					// Reject lineup
					if (!lineup) throw(`Warning: MVAM vector failed to construct a valid voyage with the requested boosts.`);

					// Resolve lineup
					const baseTarget: number = lineup.score/10;
					const primeTarget: number = baseTarget*primeFactor;

					// Deltas compare actual primeFactors to expected primeFactor
					const deltas: IDeltas = {
						primary: (lineup.skills[voyage.skills.primary_skill].voyage-primeTarget)/baseTarget,
						secondary: (lineup.skills[voyage.skills.secondary_skill].voyage-primeTarget)/baseTarget
					};
					// Other delta is primaryDelta+secondaryDelta*-1

					const vector: IVector = {
						id: vectorId,
						attempt: ++iAttempts,
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
					}

					// Stop looking for lineups if vector has generated enough uniques or reached max attempts
					if ((iAttempts >= minAttempts && iUniques >= minUniques) || iAttempts === maxAttempts) {
						resolveVector(vectorId);
						return;
					}

					// Use deltas to reweight boosts for next attempt
					//	Finetune by smaller increments as attempts increase with a min adjust of 0.05
					const finetuneRatio: number = Math.max(1/iAttempts, 0.05);
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
		const TRAIT_BOOST: number = 200;

		const boostedScores: IVoyagerScore[] = [];
		for (let i = 0; i < primedRoster.length; i++) {
			const baseScore: number = primedRoster[i].primary_score*boosts.primary
				+ primedRoster[i].secondary_score*boosts.secondary
				+ primedRoster[i].other_score*boosts.other;
			const bestScore: number = baseScore + TRAIT_BOOST;
			const baseSlots: number[] = [], bestSlots: number[] = [];
			for (let j = 0; j < 12; j++) {
				if (!primedRoster[i].viable_slots[j]) continue;
				baseSlots.push(j);
				if (primedRoster[i].trait_slots[j]) bestSlots.push(j);
			}
			if (bestSlots.length > 0)
				boostedScores.push({ score: bestScore, id: primedRoster[i].id, isIdeal: true });
			if (baseSlots.length > bestSlots.length)
				boostedScores.push({ score: baseScore, id: primedRoster[i].id, isIdeal: false });
		}
		boostedScores.sort((a, b) => b.score - a.score);

		return seatCrew(primedRoster, boostedScores, !!options.debugCallback);
	}

	function sendProgress(message: string): void {
		if (options.debugCallback)
			options.debugCallback(message);
		if (options.progressCallback)
			options.progressCallback(message);
	}
};
