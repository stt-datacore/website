// Voyage calculation inspired by TemporalAgent7 and IAmPicard before that
//  https://github.com/stt-datacore/website
//  https://github.com/iamtosk/StarTrekTimelinesSpreadsheet

/*
DataCore(<VoyageTool>): input from UI =>
	Assemble(): lineups =>
		Estimate(): estimates =>
			Sort(): lineups, estimates =>
				DataCore(<VoyageTool>) { updateUI } : void
*/

import { BaseSkills, PlayerSkill, Skill } from '../model/crew';
import { VoyageSkills } from '../model/player';
import { IVoyageCrew, IVoyageInputConfig } from '../model/voyage';
import { Estimate, JohnJayBest, Refill } from '../model/worker';

const DEBUGGING: boolean = false;

interface IVoyagersConfig {
	progressCallback: ((message: string) => void) | false;
	debugCallback: ((message: string) => void) | false;
};

interface IVoyagersOptions {
	strategy?: string;
	customBoosts?: IBoosts;
	luckFactor?: number;
	favorSpecialists?: boolean;
};

interface IPrimedCrew {
	id: number;
	name: string;
	skills: BaseSkills;
	primary_score: number;
	secondary_score: number;
	other_score: number;
	viable_slots: number[];
	trait_slots: number[];
};

interface ISlottableCrew extends IPrimedCrew {
	score: number;
	slot: number;
	isIdeal: boolean;
};

interface IBoosts {
	primary: number;
	secondary: number;
	other: number;
};

interface IBoostedScore {
	score: number;
	id: number;
	isIdeal: boolean;
};

interface IDeltas {
	primary: number;
	secondary: number;
};

interface IVector {
	id: number;
	attempt: number;
	boosts: IBoosts;
	primeFactor: number;
	deltas: IDeltas;
};

interface IUniqueLineup {
	uniqueId: string;
	bestAntimatter: number;
	vectors: IVector[];
	lineup: VoyagersLineup;
};

interface ILineupCrew {
	id: number;
	name: string;
	score: number;
};

interface ISkillAggregate extends Skill {
	skill: PlayerSkill;
	voyage: number;
};

interface ILineupSkills {
	security_skill: ISkillAggregate;
	command_skill: ISkillAggregate;
	diplomacy_skill: ISkillAggregate;
	medicine_skill: ISkillAggregate;
	science_skill: ISkillAggregate;
	engineering_skill: ISkillAggregate;
};

interface IProjection {
	ticks: number;
	amBalance: number;
};

interface IWeights {
	primes: number;
	others: number;
	total: number;
};

interface IProjectableLineup extends VoyagersLineup {
	projection: IProjection;
	weights: IWeights;
};

interface IBestVector extends IVector {
	proximity: number;
};

interface ILineupEstimate {
	key: string;
	estimate: Estimate;
};

const SKILL_IDS: string[] = [
	'command_skill', 'diplomacy_skill', 'security_skill',
	'engineering_skill', 'science_skill', 'medicine_skill'
];

type outputType = (result: (JohnJayBest[] | { error: string }), inProgress?: boolean) => void;
type chewableType = (config: any, reportProgress?: () => boolean) => Estimate;

const VoyagersWorker = (input, output: outputType, chewable: chewableType) => {
	const SKILLS: string[] = [
		'command_skill',
		'science_skill',
		'security_skill',
		'engineering_skill',
		'diplomacy_skill',
		'medicine_skill'
	];

	// Config is for showing progress (optional)
	const config: IVoyagersConfig = {
		progressCallback: false,
		debugCallback: DEBUGGING ? (message: string) => console.log(message) : false
	};

	// Voyage data is required
	const voyage: IVoyageInputConfig = {
		skills: input.voyage_description.skills,
		crew_slots: input.voyage_description.crew_slots,
		ship_trait: input.voyage_description.ship_trait
	};

	// Generate lots of unique lineups of potential voyagers
	const voyagers: Voyagers = new Voyagers(input.roster, config);
	const filter: boolean = false;	// Roster prefiltered by DataCore
	const options: IVoyagersOptions = {
		strategy: input.strategy
		// Other options not currently available to DataCore
	};
	voyagers.assemble(voyage, filter, options)
		.then(lineups => {
			// Estimate only as many lineups as necessary
			const estimator = new VoyagersEstimates(voyage, input.bestShip.score, lineups, config);
			estimator.estimate(datacoreEstimator, input.strategy)
				.then(estimates => {
					// Return only the best lineups by requested strategy
					let methods: string[] = ['estimate', 'minimum', 'moonshot'];
					if (input.strategy === 'estimate')
						methods = ['estimate'];
					else if (input.strategy === 'minimum')
						methods = ['minimum'];
					else if (input.strategy === 'moonshot')
						methods = ['moonshot'];
					// Either get 1 best lineup for each method, or the 3 best lineups for a single method
					const limit: number = ['versatile', 'thorough'].includes(input.strategy) ? 1 : 3;
					const sorter = new VoyagersSorted(lineups, estimates);
					sorter.sort(datacoreSorter, methods, limit)
						.then(sorted => {
							output(JSON.parse(JSON.stringify(sorted)), false);
						});
				});
		})
		.catch(error => {
			output({ error: `${error}` });
		});

	function datacoreEstimator(lineup: VoyagersLineup): Promise<ILineupEstimate> {
		let ps: ISkillAggregate | undefined = undefined;
		let ss: ISkillAggregate | undefined = undefined;
		const others: ISkillAggregate[] = [];
		for (let iSkill = 0; iSkill < SKILLS.length; iSkill++) {
			const aggregate: ISkillAggregate = lineup.skills[SKILLS[iSkill]];
			if (SKILLS[iSkill] === voyage.skills.primary_skill)
				ps = aggregate;
			else if (SKILLS[iSkill] === voyage.skills.secondary_skill)
				ss = aggregate;
			else
				others.push(aggregate);
		}
		const chewableConfig = {
			ps, ss, others,
			startAm: input.bestShip.score + lineup.antimatter,
			prof: lineup.proficiency,
			noExtends: false, // Set to true to show estimate with no refills
			numSims: 5000
		};
		// Increase confidence of estimates for thorough, marginal strategies
		if (['thorough', 'minimum', 'moonshot'].includes(input.strategy))
			chewableConfig.numSims = 10000;
		return new Promise((resolve, reject) => {
			const estimate: Estimate = chewable(chewableConfig, () => false);
			// Add antimatter prop here to allow for post-sorting by AM
			estimate.antimatter = input.bestShip.score + lineup.antimatter;
			resolve({ estimate, key: lineup.key });
		});
	}

	function datacoreSorter(a: ILineupEstimate, b: ILineupEstimate, method: string = 'estimate'): number {
		const DIFFERENCE: number = 0.02; // ~1 minute

		const aEstimate: Refill = a.estimate.refills[0];
		const bEstimate: Refill = b.estimate.refills[0];

		// Best Median Runtime by default
		let aScore: number = aEstimate.result;
		let bScore: number = bEstimate.result;

		let compareCloseTimes: boolean = false;

		// Best Guaranteed Minimum
		//	Compare 99% worst case times (saferResult)
		if (method === 'minimum') {
			aScore = aEstimate.saferResult;
			bScore = bEstimate.saferResult;
		}
		// Best Moonshot
		//	Compare best case times (moonshotResult)
		else if (method === 'moonshot') {
			compareCloseTimes = true;
			aScore = aEstimate.moonshotResult;
			bScore = bEstimate.moonshotResult;
			// If times are close enough, use the one with the better median result
			if (Math.abs(bScore - aScore) <= DIFFERENCE) {
				aScore = aEstimate.result;
				bScore = bEstimate.result;
			}
		}
		// Best Dilemma Chance
		else if (method === 'dilemma') {
			aScore = aEstimate.lastDil;
			bScore = bEstimate.lastDil;
			if (aScore === bScore) {
				aScore = aEstimate.dilChance;
				bScore = bEstimate.dilChance;
			}
			// If dilemma chance is the same, use the one with the better median result
			if (aScore === bScore) {
				compareCloseTimes = true;
				aScore = aEstimate.result;
				bScore = bEstimate.result;
			}
		}
		// Highest Antimatter
		else if (method === 'antimatter') {
			aScore = a.estimate.antimatter ?? 0;
			bScore = b.estimate.antimatter ?? 0;
			// If antimatter is the same, use the one with the better median result
			if (aScore === bScore) {
				compareCloseTimes = true;
				aScore = aEstimate.result;
				bScore = bEstimate.result;
			}
		}

		// If times are close enough, use the one with the better safer result
		if (compareCloseTimes && Math.abs(bScore - aScore) <= DIFFERENCE) {
			aScore = aEstimate.saferResult;
			bScore = bEstimate.saferResult;
		}

		return bScore - aScore;
	}
};

// Generate lots of unique lineups of potential voyagers
class Voyagers {
	crew: IVoyageCrew[];
	config: IVoyagersConfig;
	uniques: IUniqueLineup[];

	constructor(crew: IVoyageCrew[], config: IVoyagersConfig) {
		this.crew = crew;	// Required: { name, traits, skills }
		this.config = config;
	}

	sendProgress(message: string): void {
		if (this.config.debugCallback)
			this.config.debugCallback(message);
		if (this.config.progressCallback)
			this.config.progressCallback(message);
	}

	// Prime roster by primary_ and secondary_skills
	// Determine primeFactor from your best voyage lineup without boosts
	// Do 5 vectors scaling primeFactor by a range of deltas:
	//	Do X attempts:
	//		Get scores of primed roster, adjusted by boosts
	//		Do 12 slots:
	//			Assign crew with best score to lineup
	//		Adjust boosts to balance lineup
	// Return all unique lineups
	assemble(voyage: IVoyageInputConfig, filter: ((crew: IVoyageCrew) => boolean) | false = false, options: IVoyagersOptions = {}): Promise<VoyagersLineup[]> {
		this.uniques = [];

		this.sendProgress(`Studying crew...`);
		const primedRoster: IPrimedCrew[] = this.getPrimedRoster(voyage, filter, options);
		this.sendProgress(`Considering ${primedRoster.length} crew for this voyage...`);

		const self: this = this;
		return new Promise((resolve, reject) => {
			let boosts: IBoosts = { primary: 1, secondary: 1, other: 1 };
			const control: VoyagersLineup | false = self.getBoostedLineup(primedRoster, boosts);
			if (!control) {
				reject(`Critical error: MVAM unable to construct a voyage control lineup!`);
				return;
			}
			const controlFactor: number = self.getPrimeFactor(control.score);

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
				return self.doVector(index+1, voyage, primedRoster, boosts, primeFactor);
			});
			Promise.all(promises).then(_vectorIds => {
				self.sendProgress(`${self.uniques.length} potential lineups assembled!`);
				const lineups: VoyagersLineup[] = self.uniques.map(unique => {
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
	}

	getPrimedRoster(voyage: IVoyageInputConfig, filter: ((crew: IVoyageCrew) => boolean) | false = false, options: IVoyagersOptions = {}): IPrimedCrew[] {
		const skills: VoyageSkills = voyage.skills;
		const traits: string[] = [];
		for (let i = 0; i < voyage.crew_slots.length; i++) {
			traits.push(voyage.crew_slots[i].trait);
		}

		const iLuckFactor: number = options.luckFactor ? 0 : 1;

		const primedRoster: IPrimedCrew[] = [];
		for (let i = 0; i < this.crew.length; i++) {
			// Don't consider crew that match user filters
			if (filter && filter(this.crew[i]))
				continue;

			let dPrimaryScore: number = 0, dSecondaryScore: number = 0, dOtherScore: number = 0;
			const rViableSkills: number[] = [0, 0, 0, 0, 0, 0];
			const rViableSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			const rTraitSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

			const crewId: number = this.crew[i].id ?? i;
			const crewSkills: BaseSkills = this.crew[i].skills ? JSON.parse(JSON.stringify(this.crew[i].skills)) : {};

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
				if (this.crew[i].traits.indexOf(traits[iSkill*2]) >= 0)
					rTraitSlots[iSkill*2] = 1;
				if (this.crew[i].traits.indexOf(traits[(iSkill*2)+1]) >= 0)
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
				name: this.crew[i].name,
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
	getPrimeFactor(totalScore: number): number {
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

	doVector(vectorId: number, voyage: IVoyageInputConfig, primedRoster: IPrimedCrew[], boosts: IBoosts, primeFactor: number): Promise<number> {
		// Number of attempts and desired lineups should scale to roster size
		const minAttempts: number = 10;
		const maxAttempts: number = Math.max(Math.floor(primedRoster.length/4), minAttempts); // 25% of roster length
		const minUniques: number = Math.max(Math.floor(maxAttempts/4), 5); // 25% of maxAttempts

		const self: this = this;
		const debug: ((message: string) => void) | false = this.config.debugCallback;
		return new Promise((resolveVector, rejectVector) => {
			let sequence: Promise<void> = Promise.resolve();
			let iAttempts: number = 0, iUniques: number = 0;
			for (let i = 0; i < maxAttempts; i++) {
				sequence = sequence.then(() => {
					const lineup: VoyagersLineup | false = self.getBoostedLineup(primedRoster, boosts);

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
					const existing: IUniqueLineup | undefined = self.uniques.find(unique => unique.uniqueId === lineup.key);
					if (existing) {
						existing.vectors.push(vector);
						// Use lineup order with higher AM if available
						if (lineup.antimatter > existing.bestAntimatter) {
							existing.bestAntimatter = lineup.antimatter;
							existing.lineup = lineup;
						}
					}
					else {
						this.sendProgress(`Found ${self.uniques.length+1} potential lineups so far...`);
						_logVector(vector, lineup);
						self.uniques.push({
							uniqueId: lineup.key,
							bestAntimatter: lineup.antimatter,
							vectors: [vector],
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
			if (!debug) return;
			let sLineup = '';
			for (let i = 0; i < lineup.crew.length; i++) {
				if (sLineup !== '') sLineup += ', ';
				sLineup += `${lineup.crew[i].name} (${lineup.crew[i].score.toFixed(1)})`;
			}
			debug(
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

	// 1 all: open ideal slot
	// 2A ideal:
	//	2A1 canNotDisplace: can current assignee move without displacing an ideal?
	//	2A2 canDisplace: can current assignee move displacing exactly 1 ideal?
	// 2B non-ideal:
	// 	2B1 any open viable slot
	// 	2B2 canNotDisplace: can current assignee move without displacing an ideal?
	// 3 all: skip volunteer
	getBoostedLineup(primedRoster: IPrimedCrew[], boosts: IBoosts): VoyagersLineup | false {
		function tryToAssign(assignments: (ISlottableCrew | undefined)[], seeker: ISlottableCrew, bIdealOnly: boolean, bCanDisplace: boolean, tested: number[] = []): boolean {
			let sDebugPrefix: string = '';
			for (let i = 0; i < tested.length; i++) {
				sDebugPrefix += '-';
			}
			sDebugPrefix += ' ';

			// Identify state of all viable slots
			const open_ideal: number[] = [], open_viable: number[] = [];
			const occupied_ideal: number[] = [], occupied_viable: number[] = [];
			for (let i = 0; i < 12; i++) {
				if (!seeker.viable_slots[i]) continue;
				if (assignments[i]) {
					occupied_viable.push(i);
					if (seeker.trait_slots[i]) occupied_ideal.push(i);
				}
				else {
					open_viable.push(i);
					if (seeker.trait_slots[i]) open_ideal.push(i);
				}
			}

			// 1) Seat in ideal open slot
			if (open_ideal.length > 0) {
				doAssign(assignments, seeker, open_ideal[0], sDebugPrefix);
				return true;
			}

			// 2A)
			if (bIdealOnly) {
				// 2A1) Seat in occupied slot only if everyone moves around willingly
				let idealsTested: number[] = [...tested];
				for (let i = 0; i < occupied_ideal.length; i++) {
					const slot: number = occupied_ideal[i];
					// Ignore slots we've already inquired about by this seeker and descendant seekers
					if (idealsTested.indexOf(slot) >= 0) continue;
					idealsTested.push(slot);
					const assignee: ISlottableCrew = assignments[slot] as ISlottableCrew;
					assemblyLog += `\n${sDebugPrefix}${seeker.name} (${seeker.score}) would be ideal in slot ${slot}. Is ${assignee.name} (${assignee.score}) willing and able to move?`;
					if (tryToAssign(assignments, assignee, true, false, idealsTested)) {
						doAssign(assignments, seeker, slot, sDebugPrefix);
						return true;
					}
				}
				// 2A2) Seat in occupied slot only if exactly 1 other is able to move from ideal slot
				idealsTested = [...tested];
				for (let i = 0; i < occupied_ideal.length; i++) {
					const slot: number = occupied_ideal[i];
					// Ignore slots we've already inquired about by this seeker and descendant seekers
					if (idealsTested.indexOf(slot) >= 0) continue;
					idealsTested.push(slot);
					const assignee: ISlottableCrew = assignments[slot] as ISlottableCrew;
					assemblyLog += `\n${sDebugPrefix}${seeker.name} (${seeker.score}) insists on being in slot ${slot}. Is ${assignee.name} (${assignee.score}) able to move?`;
					if (tryToAssign(assignments, assignee, false, true, idealsTested)) {
						doAssign(assignments, seeker, slot, sDebugPrefix);
						return true;
					}
				}
			}

			// 2B)
			if (!bIdealOnly) {
				// 2B1) Seat in open slot
				if (open_viable.length > 0) {
					doAssign(assignments, seeker, open_viable[0], sDebugPrefix);
					return true;
				}

				// 2B2) Seat in occupied slot only if everyone moves around willingly
				const viablesTested: number[] = [...tested];
				for (let i = 0; i < occupied_viable.length; i++) {
					const slot: number = occupied_viable[i];
					// Ignore slots we've already inquired about by this seeker and descendant seekers
					if (viablesTested.indexOf(slot) >= 0) continue;
					viablesTested.push(slot);
					const assignee: ISlottableCrew = assignments[slot] as ISlottableCrew;
					if (!seeker.trait_slots[slot] && assignee.trait_slots[slot] && !bCanDisplace)
						continue;
					assemblyLog += `\n${sDebugPrefix}${seeker.name} (${seeker.score}) is inquiring about slot ${slot}. Is ${assignee.name} (${assignee.score}) willing and able to move?`;
					if (tryToAssign(assignments, assignee, false, false, viablesTested)) {
						doAssign(assignments, seeker, slot, sDebugPrefix);
						return true;
					}
				}
			}

			// 3) Can't seat
			assemblyLog += `\n${sDebugPrefix}${seeker.name} (${seeker.score}) will not take a new assignment`;
			return false;
		}

		function doAssign(assignments: (ISlottableCrew | undefined)[], seeker: ISlottableCrew, slot: number, sPrefix: string = ''): void {
			const sIdeal: string = seeker.trait_slots[slot] ? 'ideal ' : '';
			const sOpen: string = assignments[slot] === undefined ? 'open ': '';
			assemblyLog += `\n${sPrefix}${seeker.name} (${seeker.score}) accepts ${sIdeal}assignment in ${sOpen}slot ${slot}`;
			assignments[slot] = {
				...seeker,
				slot,
				isIdeal: seeker.trait_slots[slot] === 1
			};
		}

		let assemblyLog: string = '';	// Only use for debugging in development

		const trait_boost: number = 200;

		const boostedScores: IBoostedScore[] = [];
		for (let i = 0; i < primedRoster.length; i++) {
			const baseScore: number = primedRoster[i].primary_score*boosts.primary
				+ primedRoster[i].secondary_score*boosts.secondary
				+ primedRoster[i].other_score*boosts.other;
			const bestScore: number = baseScore + trait_boost;
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

		const assignments: (ISlottableCrew | undefined)[] = Array.from({ length: 12 }, () => undefined);
		let iAssigned: number = 0;

		const skipped: number[] = [];

		while (boostedScores.length > 0 && iAssigned < 12) {
			const testScore: IBoostedScore | undefined = boostedScores.shift();
			if (!testScore) continue;

			// Volunteer is already assigned, log other matching slots as alts
			const repeat: ISlottableCrew | undefined = assignments.find(assignee => assignee?.id === testScore.id);
			if (repeat) {
				assemblyLog += `\n~ ${repeat.name} (${testScore.score}) is already assigned to slot ${repeat.slot} (${repeat.score}) ~`;
				continue;
			}

			const testScoreCrew: IPrimedCrew | undefined = primedRoster.find(primed => primed.id === testScore.id);
			if (!testScoreCrew) continue;

			const volunteer: ISlottableCrew = {
				...testScoreCrew,
				score: testScore.score,
				slot: -1,
				isIdeal: false
			};

			if (tryToAssign(assignments, volunteer, testScore.isIdeal, testScore.isIdeal)) {
				iAssigned++;
			}
			else {
				const bRepeatSkip: boolean = skipped.indexOf(volunteer.id) >= 0;
				skipped.push(volunteer.id);
				if (bRepeatSkip || !testScore.isIdeal)
					assemblyLog += `\n!! Skipping ${volunteer.name} (${volunteer.score}) forever !!`;
				else
					assemblyLog += `\n! Skipping ${volunteer.name} (${volunteer.score}) for now !`;
			}
		}

		if (iAssigned === 12)
			return new VoyagersLineup(assignments as ISlottableCrew[], DEBUGGING ? assemblyLog : '');

		return false;
	}
}

class VoyagersLineup {
	key: string;
	crew: ILineupCrew[];
	traits: number[];
	skills: ILineupSkills;
	score: number;
	proficiency: number;
	antimatter: number;
	vectors: IVector[];
	log: string;

	constructor(assignments: ISlottableCrew[], assemblyLog: string = '') {
		const crew: ILineupCrew[] = [];
		const traitsMatched: number[] = [];
		const skillScores: ILineupSkills = {
			command_skill: { skill: 'command_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			diplomacy_skill: { skill: 'diplomacy_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			security_skill: { skill: 'security_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			engineering_skill: { skill: 'engineering_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			science_skill: { skill: 'science_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			medicine_skill: { skill: 'medicine_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 }
		};
		let dTotalScore: number = 0, dTotalProficiency: number = 0;
		let iBonusTraits: number = 0;

		for (let i = 0; i < assignments.length; i++) {
			crew.push({
				id: assignments[i].id,
				name: assignments[i].name,
				score: assignments[i].score
			});
			traitsMatched.push(assignments[i].isIdeal ? 1 : 0);
			if (assignments[i].isIdeal) iBonusTraits++;
			for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
				if (!assignments[i].skills[SKILL_IDS[iSkill]]) continue;
				const skill: Skill = assignments[i].skills[SKILL_IDS[iSkill]];
				const dProficiency: number = skill.range_min+(skill.range_max-skill.range_min)/2;
				const dSkillScore: number = skill.core+dProficiency;
				skillScores[SKILL_IDS[iSkill]].voyage += dSkillScore;
				skillScores[SKILL_IDS[iSkill]].core += skill.core;
				skillScores[SKILL_IDS[iSkill]].range_min += skill.range_min;
				skillScores[SKILL_IDS[iSkill]].range_max += skill.range_max;
				dTotalScore += dSkillScore;
				dTotalProficiency += dProficiency;
			}
		}

		let lineupKey: string = '';
		for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
			const dSkillScore: number = skillScores[SKILL_IDS[iSkill]].voyage;
			lineupKey += Math.floor(dSkillScore)+',';
		}

		this.key = lineupKey;
		this.crew = crew;
		this.traits = traitsMatched;
		this.skills = skillScores;
		this.score = dTotalScore;
		this.proficiency = Math.floor(dTotalProficiency/dTotalScore*100);
		this.antimatter = iBonusTraits*25;
		this.vectors = [];
		this.log = assemblyLog;
	}
}

// Estimate only as many lineups as necessary
class VoyagersEstimates {
	voyage: IVoyageInputConfig;
	config: IVoyagersConfig;
	shipAntimatter: number;
	lineups: IProjectableLineup[];

	constructor(voyage: IVoyageInputConfig, shipAntimatter: number, lineups: VoyagersLineup[], config: IVoyagersConfig) {
		this.voyage = voyage;
		this.shipAntimatter = shipAntimatter;
		this.lineups = lineups as IProjectableLineup[];
		this.config = config;
	}

	sendProgress(message: string): void {
		if (this.config.debugCallback)
			this.config.debugCallback(message);
		if (this.config.progressCallback)
			this.config.progressCallback(message);
	}

	estimate(estimator: (lineup: VoyagersLineup) => Promise<ILineupEstimate>, strategy: string = 'estimate'): Promise<ILineupEstimate[]> {
		const self: this = this;
		return new Promise((resolve, reject) => {
			self.lineups.forEach(lineup => {
				lineup.projection = self.getProjection(lineup);
				lineup.weights = self.getWeights(lineup);
			});

			let considered: IProjectableLineup[] = self.lineups.slice();

			// Narrow by average tick count, if necessary
			if (considered.length > 30) {
				const avgTicks: number = considered.reduce((prev, curr) => prev + curr.projection.ticks, 0)/considered.length;
				considered = considered.filter(lineup => lineup.projection.ticks > avgTicks);
				self.sendProgress(`Narrowing by average tick count (${avgTicks.toFixed(2)})...`);
			}

			// Narrow further by sort strategy
			if (strategy !== 'thorough') {
				const scanKeys: string[] = [];

				// Lower depth value means less waiting, but also less thoroughness
				const estimateDepth: number = 3;
				const defaultDepth: number = 7;

				// Lineups with the best tick counts should yield best median estimates
				//	Always consider lineups with 3 best estimates
				//	Good chance best guaranteed minimum is also in this group; decent chance for good moonshot
				considered.sort((a, b) => b.projection.ticks - a.projection.ticks);
				for (let i = 0; i < Math.min(estimateDepth, considered.length); i++) {
					scanKeys.push(considered[i].key);
				}

				// Lineups with low deviations tend to have better guaranteed minimums
				let scanDepth: number = ['minimum', 'versatile'].includes(strategy) ? defaultDepth : 0;
				if (scanDepth > 0) {
					considered.sort((a, b) => b.weights.total - a.weights.total);
					for (let i = 0; i < Math.min(scanDepth, considered.length); i++) {
						if (!scanKeys.includes(considered[i].key))
							scanKeys.push(considered[i].key);
					}
				}

				// Lineups with high prime scores tend to have better moonshots
				scanDepth = ['moonshot', 'versatile'].includes(strategy) ? defaultDepth : 0;
				if (scanDepth > 0) {
					considered.sort((a, b) => b.weights.primes - a.weights.primes);
					for (let i = 0; i < Math.min(scanDepth, considered.length); i++) {
						if (!scanKeys.includes(considered[i].key))
							scanKeys.push(considered[i].key);
					}
				}

				if (scanKeys.length > 0) {
					considered = considered.filter(lineup => scanKeys.includes(lineup.key));
					self.sendProgress(`Narrowing by strategy (${strategy})...`);
				}
			}

			self.sendProgress(`Estimating ${considered.length} lineups...`);
			const promises: Promise<ILineupEstimate>[] = considered.map(lineup =>
				estimator(lineup)
			);
			Promise.all(promises).then(estimates => {
				resolve(estimates);
				self.sendProgress(`Done estimating!`);
				self._logEstimates(estimates);
			})
			.catch(error => {
				reject(error);
			});
		});
	}

	// Use skill check fail points to project runtime (in ticks, i.e. 3 ticks per minute)
	getProjection(lineup: IProjectableLineup): IProjection {
		interface IFailpoint {
			skill: string;
			time: number;
		};

		const failpoints: IFailpoint[] = Object.keys(lineup.skills).map(skill => {
			const time: number = ((0.0449*lineup.skills[skill].voyage)+34.399)*60;	// In seconds
			return {
				skill, time
			}
		}).sort((a, b) => a.time - b.time);

		let ticks: number = 0, amBalance: number = this.shipAntimatter + lineup.antimatter;
		let prevTickTime: number = 0, prevHazardTime: number = 0;
		let prevHazardSuccessRate: number = 1, prevFailPointSkillChance: number = 0;

		while (amBalance > 0 && failpoints.length > 0) {
			const failpoint: IFailpoint | undefined = failpoints.shift();
			if (!failpoint) continue;

			// 1 tick every 20 seconds
			const finalTickTime: number = failpoint.time - (failpoint.time % 20);
			const interimTicks: number = (finalTickTime - prevTickTime) / 20;
			const amLossTicks: number = -1 * interimTicks;

			// 1 hazard every 80 seconds
			const finalHazardTime: number = failpoint.time - (failpoint.time % 80);
			const interimHazards: number = (finalHazardTime - prevHazardTime) / 80;
			const hazardSuccessRate: number = prevHazardSuccessRate - prevFailPointSkillChance;
			const hazardFailureRate: number = 1 - hazardSuccessRate;
			const amGainHazards: number = interimHazards * hazardSuccessRate * 5;
			const amLossHazards: number = interimHazards * hazardFailureRate * -30;

			if (amBalance + amLossTicks + amGainHazards + amLossHazards < 0) {
				let testBalance: number = amBalance;
				let testTicks: number = ticks;
				let testTime: number = prevTickTime;
				while (testBalance > 0) {
					testTicks++;
					testTime += 20;
					testBalance--;
					if (testTime % 80 === 0) {
						testBalance += hazardSuccessRate * 5;
						testBalance += hazardFailureRate * -30;
					}
				}
				ticks = testTicks;
				amBalance = testBalance;
			}
			else {
				ticks += interimTicks;
				amBalance += amLossTicks + amGainHazards + amLossHazards;
			}

			prevTickTime = finalTickTime;
			prevHazardTime = finalHazardTime;
			prevHazardSuccessRate = hazardSuccessRate;
			if (failpoint.skill === this.voyage.skills.primary_skill)
				prevFailPointSkillChance = 0.35;
			else if (failpoint.skill === this.voyage.skills.secondary_skill)
				prevFailPointSkillChance = 0.25;
			else
				prevFailPointSkillChance = 0.1;
		}

		return {
			ticks, amBalance
		};
	}

	// Use skill averages and deviations to determine best candidates for guaranteed minimum, moonshot
	getWeights(lineup: IProjectableLineup): IWeights {
		const weighScores = (array: number[]): number => {
			const n: number = array.length;
			const mean: number = array.reduce((a, b) => a + b) / n;
			const stdev: number = Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
			return mean - stdev;
		};
		const primeScores: number[] = [], otherScores: number[] = [];
		Object.keys(lineup.skills).forEach(skill => {
			if (skill === this.voyage.skills.primary_skill || skill === this.voyage.skills.secondary_skill)
				primeScores.push(lineup.skills[skill].voyage);
			else
				otherScores.push(lineup.skills[skill].voyage);
		});
		const primes: number = weighScores(primeScores);
		const others: number = weighScores(otherScores);
		const total: number = primes + others;
		return {
			primes, others, total
		};
	}

	// Only used for logging now; otherwise deprecated in favor of getProjection and getWeights
	getBestVector(lineup: IProjectableLineup): IBestVector | undefined {
		const baseTarget: number = lineup.score/10;
		const primaryScore: number = lineup.skills[this.voyage.skills.primary_skill].voyage;
		const secondaryScore: number = lineup.skills[this.voyage.skills.secondary_skill].voyage;

		let bestVector: IBestVector | undefined = undefined;
		let bestProximity: number = 100;
		lineup.vectors.forEach(vector => {
			const primeTarget: number = baseTarget*vector.primeFactor;
			// Proximity is how close an actual lineup is to its prime targets (lower is better)
			const proximity: number = Math.abs(primaryScore+secondaryScore-(primeTarget*2));
			if (!bestProximity || proximity < bestProximity) {
				bestProximity = proximity;
				bestVector = {...vector, proximity};
			}
		});

		return bestVector;
	}

	_logEstimates(estimates: ILineupEstimate[]): void {
		if (!this.config.debugCallback) return;
		const fields: string[] = [
			'id', 'estimate', 'safer', 'moonshot',
			'score', 'proficiency', 'shipAM', 'crewAM',
			'primary', 'secondary',
			'ticks', 'amBalance',
			'vectors', 'prime factor', 'proximity'
		];
		let log: string = `===== Estimates =====`;
		let csv: string = fields.join('\t');
		estimates.forEach(estimate => {
			const lineup: IProjectableLineup | undefined = this.lineups.find(l => l.key === estimate.key);
			if (lineup) {
				const vector: IBestVector | undefined = this.getBestVector(lineup);
				if (vector) {
					log += `\n* ${vector.id}-${vector.attempt}: ${estimate.estimate.refills[0].result.toFixed(3)} ${vector.proximity.toFixed(3)}`;
					const values: (number | string)[] = [
						vector.id+'-'+vector.attempt,
						estimate.estimate.refills[0].result.toFixed(3),
						vector.proximity.toFixed(3),
						lineup.score,
						lineup.proficiency,
						this.shipAntimatter,
						lineup.antimatter,
						lineup.skills[this.voyage.skills.primary_skill].voyage,
						lineup.skills[this.voyage.skills.secondary_skill].voyage,
						lineup.projection.ticks,
						lineup.projection.amBalance.toFixed(3),
						lineup.vectors.length,
						vector.primeFactor,
						vector.proximity.toFixed(3)
					];
					csv += `\n${values.join('\t')}`;
				}
			}
		});
		this.config.debugCallback(log);
		this.config.debugCallback(csv);
	}
}

// Return only the best lineups by requested sort method(s)
class VoyagersSorted {
	lineups: VoyagersLineup[];
	estimates: ILineupEstimate[];

	constructor(lineups: VoyagersLineup[], estimates: ILineupEstimate[]) {
		this.lineups = lineups;
		this.estimates = estimates;
	}

	sort(sorter: (a: ILineupEstimate, b: ILineupEstimate, method: string) => number, methods: string[], limit: number): Promise<JohnJayBest[]> {
		const self: this = this;
		return new Promise((resolve, reject) => {
			const bestKeys: string[] = [];
			methods.forEach(method => {
				const sorted: ILineupEstimate[] = self.estimates.sort((a, b) => sorter(a, b, method));
				for (let i = 0; i < Math.min(limit, self.estimates.length); i++) {
					const bestEstimate: ILineupEstimate = sorted[i];
					if (!bestKeys.includes(bestEstimate.key)) bestKeys.push(bestEstimate.key);
				}
			});
			const bests: JohnJayBest[] = [];
			bestKeys.forEach(bestKey => {
				const lineup: VoyagersLineup | undefined = self.lineups.find(lineup => lineup.key === bestKey);
				const estimate: ILineupEstimate | undefined = self.estimates.find(estimate => estimate.key === bestKey);
				if (lineup && estimate) {
					// Merge lineup and estimate into a simplified object
					bests.push({
						key: lineup.key,
						crew: lineup.crew,
						traits: lineup.traits,
						skills: lineup.skills,
						estimate: estimate.estimate
					});
				}
			});
			resolve(bests);
		});
	}
}

export default VoyagersWorker;
