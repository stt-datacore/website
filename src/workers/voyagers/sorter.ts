import { JohnJayBest } from '../../model/worker';

import { ILineupEstimate } from './model';
import { VoyagersLineup } from './lineup';

// Return only the best lineups by requested sort method(s)
export const SortLineups = (
	sorter: (a: ILineupEstimate, b: ILineupEstimate, method: string) => number,
	lineups: VoyagersLineup[],
	estimates: ILineupEstimate[],
	methods: string[],
	limit: number
): Promise<JohnJayBest[]> => {
	return new Promise((resolve, reject) => {
		const bestKeys: string[] = [];
		methods.forEach(method => {
			const sorted: ILineupEstimate[] = estimates.sort((a, b) => sorter(a, b, method));
			for (let i = 0; i < Math.min(limit, estimates.length); i++) {
				const bestEstimate: ILineupEstimate = sorted[i];
				if (!bestKeys.includes(bestEstimate.key)) bestKeys.push(bestEstimate.key);
			}
		});
		const bests: JohnJayBest[] = [];
		bestKeys.forEach(bestKey => {
			const lineup: VoyagersLineup | undefined = lineups.find(lineup => lineup.key === bestKey);
			const estimate: ILineupEstimate | undefined = estimates.find(estimate => estimate.key === bestKey);
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
};
