// import { IContestSkill } from '../model';

// export interface IEncounterLevel {
// 	level: number;
// 	contests: number;
// 	range: IRangeParameters;
// 	exceptions: IRangeExceptions[];
// };

// export interface IRangeParameters {
// 	min: number;
// 	max: number[];
// 	delta: number;
// };

// interface IRangeExceptions {
// 	skills: string[];
// 	range: IRangeParameters;
// };

// export const encounterLevels: IEncounterLevel[] = [
// 	{
// 		level: 1,
// 		contests: 3,
// 		range: {
// 			min: 30,
// 			max: [130, 130],
// 			delta: 10
// 		},
// 		exceptions: []
// 	},
// 	{
// 		level: 2,
// 		contests: 3,
// 		range: {
// 			min: 40,
// 			max: [140, 140],
// 			delta: 10
// 		},
// 		exceptions: []
// 	},
// 	{
// 		level: 3,
// 		contests: 3,
// 		range: {
// 			min: 50,
// 			max: [150, 150],
// 			delta: 10
// 		},
// 		exceptions: []
// 	},
// 	{
// 		level: 4,
// 		contests: 4,
// 		range: {
// 			min: 75,
// 			max: [200, 200],
// 			delta: 10
// 		},
// 		exceptions: []
// 	},
// 	{
// 		level: 5,
// 		contests: 4,
// 		range: {
// 			min: 100,
// 			max: [250, 250],
// 			delta: 10
// 		},
// 		exceptions: [
// 			{
// 				skills: ['engineering_skill', 'medicine_skill'],
// 				range: {
// 					min: 100,
// 					max: [200, 200],
// 					delta: 10
// 				}
// 			}
// 		]
// 	},
// 	{
// 		level: 6,
// 		contests: 4,
// 		range: {
// 			min: 105,
// 			max: [300, 300],
// 			delta: 10
// 		},
// 		exceptions: [
// 			{
// 				skills: ['science_skill'],
// 				range: {
// 					min: 105,
// 					max: [300, 250],
// 					delta: 10
// 				}
// 			},
// 			{
// 				skills: ['engineering_skill', 'medicine_skill'],
// 				range: {
// 					min: 100,
// 					max: [200, 200],
// 					delta: 10
// 				}
// 			}
// 		]
// 	},
// 	{
// 		level: 7,
// 		contests: 4,
// 		range: {
// 			min: 110,
// 			max: [320, 320],
// 			delta: 10
// 		},
// 		exceptions: [
// 			{
// 				skills: ['science_skill'],
// 				range: {
// 					min: 105,
// 					max: [260, 260],
// 					delta: 10
// 				}
// 			},
// 			{
// 				skills: ['engineering_skill', 'medicine_skill'],
// 				range: {
// 					min: 100,
// 					max: [200, 210],
// 					delta: 10
// 				}
// 			}
// 		]
// 	},
// 	{
// 		level: 8,
// 		contests: 5,
// 		range: {
// 			min: 115,
// 			max: [340, 340],
// 			delta: 10
// 		},
// 		exceptions: [
// 			{
// 				skills: ['science_skill'],
// 				range: {
// 					min: 110,
// 					max: [270, 270],
// 					delta: 10
// 				}
// 			},
// 			{
// 				skills: ['engineering_skill', 'medicine_skill'],
// 				range: {
// 					min: 110,
// 					max: [220, 230],
// 					delta: 10
// 				}
// 			}
// 		]
// 	},
// 	{
// 		level: 9,
// 		contests: 5,
// 		range: {
// 			min: 120,
// 			max: [350, 350],
// 			delta: 10
// 		},
// 		exceptions: [
// 			{
// 				skills: ['science_skill'],
// 				range: {
// 					min: 110,
// 					max: [280, 280],
// 					delta: 10
// 				}
// 			},
// 			{
// 				skills: ['engineering_skill', 'medicine_skill'],
// 				range: {
// 					min: 110,
// 					max: [220, 230],
// 					delta: 10
// 				}
// 			}
// 		]
// 	},
// 	{
// 		level: 10,
// 		contests: 5,
// 		range: {
// 			min: 125,
// 			max: [360, 360],
// 			delta: 10
// 		},
// 		exceptions: [
// 			{
// 				skills: ['science_skill'],
// 				range: {
// 					min: 115,
// 					max: [290, 290],
// 					delta: 10
// 				}
// 			},
// 			{
// 				skills: ['engineering_skill', 'medicine_skill'],
// 				range: {
// 					min: 115,
// 					max: [220, 240],
// 					delta: 10
// 				}
// 			}
// 		]
// 	},
// 	{
// 		level: 11,
// 		contests: 5,
// 		range: {
// 			min: 130,
// 			max: [370, 370],
// 			delta: 20
// 		},
// 		exceptions: [
// 			{
// 				skills: ['science_skill'],
// 				range: {
// 					min: 115,
// 					max: [300, 300],
// 					delta: 10
// 				}
// 			},
// 			{
// 				skills: ['engineering_skill', 'medicine_skill'],
// 				range: {
// 					min: 120,
// 					max: [240, 260],
// 					delta: 10
// 				}
// 			}
// 		]
// 	},
// ];

// export function guessEncounterLevel(contestCount: number, testSkill?: IContestSkill): IEncounterLevel {
// 	// Look for level that matches range_min of first skill
// 	if (testSkill) {
// 		const matchingMin: IEncounterLevel[] = encounterLevels.filter(encounterLevel => {
// 			const range: IRangeParameters = getLevelRangeBySkill(encounterLevel, testSkill.skill);
// 			return range.min === testSkill.range_min;
// 		});
// 		if (matchingMin.length === 1) return matchingMin[0];
// 		// If multiple levels found, look for level that matches range_max
// 		if (matchingMin.length > 1) {
// 			const matchingMinMax: IEncounterLevel[] = matchingMin.filter(encounterLevel => {
// 				const range: IRangeParameters = getLevelRangeBySkill(encounterLevel, testSkill.skill);
// 				return range.max[0] === testSkill.range_max;
// 			});
// 			if (matchingMinMax.length === 1) return matchingMinMax[0];
// 			// If no matches for range_max, use first level matching range_min
// 			return matchingMin[0];
// 		}
// 	}
// 	// If testSkill not specified or no levels found, use first level matching number of contests
// 	const matchingCount: IEncounterLevel[] = encounterLevels.filter(encounterLevel =>
// 		encounterLevel.contests === contestCount
// 	);
// 	if (matchingCount.length >= 1) return matchingCount[0];
// 	// Otherwise return highest defined level
// 	return encounterLevels[encounterLevels.length - 1];
// }

// export function getLevelRangeBySkill(encounterLevel: IEncounterLevel, skill: string): IRangeParameters {
// 	return (encounterLevel.exceptions.find(exception =>
// 		exception.skills.includes(skill)
// 	) ?? encounterLevel).range;
// }

// export function getMaxRange(range: IRangeParameters, contestIndex: number, skillIndex: number): number {
// 	return range.max[skillIndex] + (contestIndex * range.delta);
// }
