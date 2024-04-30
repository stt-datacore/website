import { IVoyageInputConfig } from '../../model/voyage';

import { ILineupEstimate, IProjection, IVoyagersOptions } from './model';
import { VoyagersLineup } from './lineup';
import { projectLineup } from './projector';

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
export const estimateLineups = (
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
				projection: projectLineup(voyage, shipAntimatter, lineup),
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
