/*
DataCore(<VoyageTool>): input from UI =>
	VoyagersAssemble(): lineups =>
		EstimateLineups(): estimates =>
			SortLineups(): lineups, estimates =>
				DataCore(<VoyageTool>) { updateUI } : void
*/

import { Estimate, IVoyageCrew, IVoyageInputConfig, Refill } from '../model/voyage';
import { JohnJayBest } from '../model/worker';

import { calcVoyageVP } from '../utils/voyagevp';

import { ILineupEstimate, ISkillAggregate } from './voyagers/model';
import { VoyagersLineup } from './voyagers/lineup';
import { voyagersAssemble } from './voyagers/assembler';
import { estimateLineups } from './voyagers/estimator';
import { sortLineups } from './voyagers/sorter';

const DEBUGGING: boolean = false;

type InputType = {
	voyage_description: IVoyageInputConfig;
	roster: IVoyageCrew[];
	bestShip: {
		score: number;
	};
	options: {
		assembler: string;
		strategy: string;
		proficiency: number;
	};
};
type OutputType = (result: (JohnJayBest[] | { error: string }), inProgress?: boolean) => void;
type ChewableType = (config: any, reportProgress?: () => boolean) => Estimate;

const VoyagersWorker = (input: InputType, output: OutputType, chewable: ChewableType) => {
	const { voyage_description, roster, bestShip, options: { assembler, strategy, proficiency } } = input;

	const debugCallback: ((message: string) => void) | undefined = DEBUGGING ? (message: string) => console.log(message) : undefined;

	// Generate lots of unique lineups of potential voyagers
	voyagersAssemble(assembler, voyage_description, roster, { strategy, proficiency, debugCallback })
		.then(lineups => {
			// Estimate only as many lineups as necessary
			const scanDepth: number = assembler === 'idic' ? 30 : 5;
			estimateLineups(datacoreEstimator, lineups, voyage_description, bestShip.score, { strategy, scanDepth, debugCallback })
				.then(estimates => {
					// Return only the best lineups by requested strategy
					let methods: string[] = ['estimate', 'minimum', 'moonshot'];
					if (strategy === 'estimate')
						methods = ['estimate'];
					else if (strategy === 'minimum')
						methods = ['minimum'];
					else if (strategy === 'moonshot')
						methods = ['moonshot'];
					else if (strategy === 'peak-antimatter')
						methods = ['antimatter'];
					else if (strategy === 'peak-vp')
						methods = ['total_vp'];
					sortLineups(datacoreSorter, lineups, estimates, methods)
						.then(sorted => {
							output(JSON.parse(JSON.stringify(sorted)), false);
						});
				});
		})
		.catch(error => {
			output({ error: `${error}` });
		});

	function datacoreEstimator(lineup: VoyagersLineup): Promise<ILineupEstimate> {
		const SKILLS: string[] = [
			'command_skill',
			'science_skill',
			'security_skill',
			'engineering_skill',
			'diplomacy_skill',
			'medicine_skill'
		];
		let ps: ISkillAggregate | undefined = undefined;
		let ss: ISkillAggregate | undefined = undefined;
		const others: ISkillAggregate[] = [];
		for (let iSkill = 0; iSkill < SKILLS.length; iSkill++) {
			const aggregate: ISkillAggregate = lineup.skills[SKILLS[iSkill]];
			if (SKILLS[iSkill] === voyage_description.skills.primary_skill)
				ps = aggregate;
			else if (SKILLS[iSkill] === voyage_description.skills.secondary_skill)
				ss = aggregate;
			else
				others.push(aggregate);
		}
		const chewableConfig = {
			ps, ss, others,
			startAm: bestShip.score + lineup.antimatter,
			prof: lineup.proficiency,
			noExtends: false, // Set to true to show estimate with no refills
			numSims: 5000
		};
		// Increase confidence of estimates for thorough, marginal strategies
		if (['thorough', 'minimum', 'moonshot'].includes(strategy))
			chewableConfig.numSims = 10000;
		return new Promise((resolve, reject) => {
			const estimate: Estimate = chewable(chewableConfig, () => false);
			// Add antimatter prop here to allow for post-sorting by AM
			estimate.antimatter = bestShip.score + lineup.antimatter;
			// Add vpDetails prop here to allow for post-sorting by VP details
			if (voyage_description.voyage_type === 'encounter') {
				const seconds: number = estimate.refills[0].result*60*60;
				const bonuses: number[] = [];
				lineup.crew.forEach(crew => bonuses.push(crew.event_score));
				estimate.vpDetails = calcVoyageVP(seconds, bonuses);
			}
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
		// Highest VP
		else if (method === 'vp') {
			aScore = a.estimate.vpDetails?.total_vp ?? 0;
			bScore = b.estimate.vpDetails?.total_vp ?? 0;
			// If VP is the same, use the one with the better median result
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

export default VoyagersWorker;
