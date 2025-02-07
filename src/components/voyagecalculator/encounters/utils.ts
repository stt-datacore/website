import { Skill } from '../../../model/crew';
import { PlayerCrew } from '../../../model/player';
import { IContestant, IContestResult, IContestSkill, IExpectedRoll } from './model';

export function getCrewGauntletAverage(crew: PlayerCrew, skills: string[]): number {
	let score: number = 0;
	// Input skills may be the same, so distinct first
	[...new Set<string>([...skills])].forEach(skill => {
		const crewSkill: Skill | undefined = crew.skills[skill];
		const average: number = crewSkill ? Math.floor((crewSkill.range_min + crewSkill.range_max) / 2) : 0;
		score += (average * 3);
	});
	return score;
}

export function getCrewCritChance(crew: PlayerCrew, traits: string[]): number {
	const critCount: number = traits.filter(trait => crew.traits.includes(trait)).length;
	return [5, 25, 45, 65][critCount];
}

export function crewIsShortSkilled(crew: PlayerCrew, skills: string[]): boolean {
	// Input skills may be the same, so distinct first
	const testSkills: string[] = [...new Set<string>([...skills])];
	const crewSkills: string[] = testSkills.filter(skill =>
		Object.keys(crew.skills).includes(skill)
	);
	return crewSkills.length < testSkills.length;
}

export function makeContestant(skills: string[], traits: string[], crew?: PlayerCrew): IContestant {
	const contestantSkills: IContestSkill[] = [];
	skills.forEach(skill => {
		let contestantSkill: IContestSkill | undefined;
		// Crew might not have all contest skills
		if (crew) {
			if (crew.skills[skill]) {
				contestantSkill = {
					skill,
					range_min: crew.skills[skill].range_min,
					range_max: crew.skills[skill].range_max
				};
			}
		}
		// Assume generic contestants have all contest skills
		else {
			contestantSkill = {
				skill,
				range_min: 0,
				range_max: 0
			};
		}
		if (contestantSkill) contestantSkills.push(contestantSkill);
	});
	return {
		crew,
		skills: contestantSkills,
		critChance: crew ? getCrewCritChance(crew, traits) : 0
	};
}

export function getExpectedRoll(contestSkills: IContestSkill[]): IExpectedRoll {
	let minScore: number = 0;
	let maxScore: number = 0;
	let avgScore: number = 0;
	contestSkills.forEach(contestSkill => {
		minScore += (contestSkill.range_min * 3);
		maxScore += (contestSkill.range_max * 3);
		avgScore += Math.floor((contestSkill.range_min + contestSkill.range_max) / 2) * 3;
	});
	return {
		min: minScore,
		max: maxScore,
		average: avgScore
	};
}

export function simulateContest(
	a: IContestant,
	b: IContestant,
	simulations: number = 100,
	percentile: number = 1
): Promise<IContestResult> {
	return new Promise((resolve, reject) => {
		// Report obvious odds without simulations, if possible
		//	Same skillset; A's odds of winning = 50%
		if (a.skills.length === b.skills.length && a.critChance === b.critChance) {
			let isSame: boolean = true;
			a.skills.forEach(aSkill => {
				const bSkill: IContestSkill | undefined = b.skills.find(bSkill => bSkill.skill === aSkill.skill);
				if (!bSkill || aSkill.range_min !== bSkill.range_min || aSkill.range_max !== bSkill.range_max)
					isSame = false;
			});
			if (isSame) {
				resolve({ oddsA: .5, simulated: false });
				return;
			}
		}

		const aRoll: IExpectedRoll = getExpectedRoll(a.skills);
		const bRoll: IExpectedRoll = getExpectedRoll(b.skills);

		let oddsA: number | undefined;
		if (aRoll.max === 0) oddsA = 0;	// Contestant A has no skills; A's odds of winning = 0%
		if (bRoll.max === 0) oddsA = 1;	// Contestant B has no skills; A's odds of winning = 100%
		if ((bRoll.min > aRoll.max && a.critChance === 0) || (bRoll.min > aRoll.max * 2))
			oddsA = 0;	// Contestant B's min > A's max = A wins 0%
		if ((aRoll.min > bRoll.max && b.critChance === 0) || (aRoll.min > bRoll.max * 2))
			oddsA = 1;	// Contestant A's min > B's max = A wins 100%

		if (oddsA) {
			resolve({ oddsA, simulated: false });
			return;
		}

		// Compare simulated scores
		//	Method A: Sample simulations (slower, but can throw out outliers)
		if (percentile < 1) {
			const aSample: number[] = sampleRolls(a, simulations, percentile);
			const bSample: number[] = sampleRolls(b, simulations, percentile);
			const aWins: number[] = aSample.map(scoreA => {
				return bSample.filter(scoreB => scoreA > scoreB).length / bSample.length;
			});
			oddsA = aWins.reduce((prev, curr) => prev + curr, 0) / aSample.length;
		}
		//	Method B: Head to head simulations
		else {
			let aWins: number = 0;
			for (let i = 0; i < simulations; i++) {
				const aRoll: number = simulateRoll(a);
				const bRoll: number = simulateRoll(b);
				if (aRoll > bRoll) aWins++;
			}
			oddsA = aWins/simulations;
		}

		// Assume wins and losses cannot be guaranteed if we're simulating odds
		if (oddsA > 0.999) oddsA = 0.999;
		if (oddsA < 0.001) oddsA = 0.001;

		resolve({ oddsA, simulated: true });
	});
}

export function sampleRolls(contestant: IContestant, simulations: number, percentile: number): number[] {
	const results: number[] = [];
	for (let i = 0; i < simulations; i++) {
		const result: number = simulateRoll(contestant);
		results.push(result);
	}
	const sampleSize: number = results.length;
	const resampleSize: number = Math.floor(percentile * sampleSize);
	const resampleStart: number = Math.floor((sampleSize - resampleSize) / 2);
	const resampleEnd: number = sampleSize - resampleStart;
	return results.sort((a, b) => a - b).slice(resampleStart, resampleEnd);
}

export function simulateRoll(contestant: IContestant): number {
	let result: number = 0;
	contestant.skills.forEach(skill => {
		const range: number = skill.range_max - skill.range_min;
		for (let j = 0; j < 3; j++) {
			const roll: number = skill.range_min + Math.floor(Math.random() * range);
			const critFactor: number = contestant.critChance > (Math.random() * 100) ? 2 : 1;
			result += (roll * critFactor);
		}
	});
	return result;
}

export function formatContestResult(result: IContestResult, invert: boolean = false): string {
	const odds: number = invert ? parseFloat((1 - result.oddsA).toFixed(3)) : result.oddsA;	// Handle floating point imprecision on invert
	if (odds === 1) return '100%';	// No significant digit
	if (odds === 0) return '0%';	// No significant digit
	if (odds === 0.999) return '>99.9%';
	if (odds === 0.001) return '<0.1%';
	return `${(odds*100).toFixed(1)}%`;
}
