import { JohnJayBest } from '../../model/worker';

import { ILineupEstimate } from './model';
import { VoyagersLineup } from './lineup';

// Return only the best lineups by requested sort method(s)
export const sortLineups = (
	sorter: (a: ILineupEstimate, b: ILineupEstimate, method: string) => number,
	lineups: VoyagersLineup[],
	estimates: ILineupEstimate[],
	methods: string[]
): Promise<JohnJayBest[]> => {
	return new Promise((resolve, reject) => {
		const bestKeys: string[] = [];
		const maxYieldPerMethod: number = methods.length > 1 ? 1 : 3;
		methods.forEach(method => {
			const sorted: ILineupEstimate[] = estimates.sort((a, b) => sorter(a, b, method));
			const bestEstimate: ILineupEstimate = sorted[0];
			if (!bestKeys.includes(bestEstimate.key)) bestKeys.push(bestEstimate.key);
			let isEqual: boolean = true;
			let index: number = 1;
			let bestsFound: number = 1;
			while (isEqual && index < estimates.length && bestsFound < maxYieldPerMethod) {
				const nextBest: ILineupEstimate = sorted[index];
				if (sorter(bestEstimate, nextBest, method) === 0) {
					if (!bestKeys.includes(nextBest.key)) bestKeys.push(nextBest.key);
					bestsFound++;
				}
				else {
					isEqual = false;
				}
				index++;
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
