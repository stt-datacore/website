import { IVoyageInputConfig } from '../../model/voyage';

import { ILineupEstimate, IVoyagersOptions } from './model';
import { VoyagersLineup } from './lineup';

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

// Estimate only as many lineups as necessary
export const EstimateLineups = (
	estimator: (lineup: VoyagersLineup) => Promise<ILineupEstimate>,
	lineups: VoyagersLineup[],
	voyage: IVoyageInputConfig,
	shipAntimatter: number,
	options: IVoyagersOptions
): Promise<ILineupEstimate[]> => {
	return new Promise((resolve, reject) => {
		let considered: IProjectableLineup[] = lineups.map(lineup => {
			return {
				...lineup,
				projection: getProjection(lineup),
				weights: getWeights(lineup)
			}
		});

		// Narrow by average tick count, if necessary
		if (considered.length > 30) {
			const avgTicks: number = considered.reduce((prev, curr) => prev + curr.projection.ticks, 0)/considered.length;
			considered = considered.filter(lineup => lineup.projection.ticks > avgTicks);
			sendProgress(`Narrowing by average tick count (${avgTicks.toFixed(2)})...`);
		}

		// Narrow further by sort strategy
		if (options.strategy !== 'thorough') {
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
			let scanDepth: number = options.strategy && ['minimum', 'versatile'].includes(options.strategy) ? defaultDepth : 0;
			if (scanDepth > 0) {
				considered.sort((a, b) => b.weights.total - a.weights.total);
				for (let i = 0; i < Math.min(scanDepth, considered.length); i++) {
					if (!scanKeys.includes(considered[i].key))
						scanKeys.push(considered[i].key);
				}
			}

			// Lineups with high prime scores tend to have better moonshots
			scanDepth = options.strategy && ['moonshot', 'versatile'].includes(options.strategy) ? defaultDepth : 0;
			if (scanDepth > 0) {
				considered.sort((a, b) => b.weights.primes - a.weights.primes);
				for (let i = 0; i < Math.min(scanDepth, considered.length); i++) {
					if (!scanKeys.includes(considered[i].key))
						scanKeys.push(considered[i].key);
				}
			}

			if (scanKeys.length > 0) {
				considered = considered.filter(lineup => scanKeys.includes(lineup.key));
				sendProgress(`Narrowing by strategy (${options.strategy})...`);
			}
		}

		sendProgress(`Estimating ${considered.length} lineups...`);
		const promises: Promise<ILineupEstimate>[] = considered.map(lineup =>
			estimator(lineup)
		);
		Promise.all(promises).then(estimates => {
			resolve(estimates);
			sendProgress(`Done estimating!`);
			_logEstimates(considered, estimates);
		})
		.catch(error => {
			reject(error);
		});
	});

	// Use skill check fail points to project runtime (in ticks, i.e. 3 ticks per minute)
	function getProjection(lineup: VoyagersLineup): IProjection {
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

		let ticks: number = 0, amBalance: number = shipAntimatter + lineup.antimatter;
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
			if (failpoint.skill === voyage.skills.primary_skill)
				prevFailPointSkillChance = 0.35;
			else if (failpoint.skill === voyage.skills.secondary_skill)
				prevFailPointSkillChance = 0.25;
			else
				prevFailPointSkillChance = 0.1;
		}

		return {
			ticks, amBalance
		};
	}

	// Use skill averages and deviations to determine best candidates for guaranteed minimum, moonshot
	function getWeights(lineup: VoyagersLineup): IWeights {
		const weighScores = (array: number[]): number => {
			const n: number = array.length;
			const mean: number = array.reduce((a, b) => a + b) / n;
			const stdev: number = Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
			return mean - stdev;
		};
		const primeScores: number[] = [], otherScores: number[] = [];
		Object.keys(lineup.skills).forEach(skill => {
			if (skill === voyage.skills.primary_skill || skill === voyage.skills.secondary_skill)
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

	function sendProgress(message: string): void {
		if (options.debugCallback)
			options.debugCallback(message);
		if (options.progressCallback)
			options.progressCallback(message);
	}

	function _logEstimates(lineups: IProjectableLineup[], estimates: ILineupEstimate[]): void {
		if (!options.debugCallback) return;
		const fields: string[] = [
			'estimate', 'safer', 'moonshot',
			'score', 'proficiency', 'shipAM', 'crewAM',
			'primary', 'secondary',
			'ticks', 'amBalance',
			'vectors'
		];
		let log: string = `===== Estimates =====`;
		let csv: string = fields.join('\t');
		estimates.forEach(estimate => {
			const lineup: IProjectableLineup | undefined = lineups.find(l => l.key === estimate.key);
			if (lineup) {
				log += `\n* ${estimate.estimate.refills[0].result.toFixed(3)}`;
				const values: (number | string)[] = [
					estimate.estimate.refills[0].result.toFixed(3),
					estimate.estimate.refills[0].saferResult.toFixed(3),
					estimate.estimate.refills[0].moonshotResult.toFixed(3),
					lineup.score,
					lineup.proficiency,
					shipAntimatter,
					lineup.antimatter,
					lineup.skills[voyage.skills.primary_skill].voyage,
					lineup.skills[voyage.skills.secondary_skill].voyage,
					lineup.projection.ticks,
					lineup.projection.amBalance.toFixed(3),
					lineup.vectors.length
				];
				csv += `\n${values.join('\t')}`;
			}
		});
		options.debugCallback(log);
		options.debugCallback(csv);
	}
};
