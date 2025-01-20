import { Skill } from '../../../model/crew';
import { PlayerCrew } from '../../../model/player';
import { IVoyageCalcConfig } from '../../../model/voyage';
import CONFIG from '../../CONFIG';
import { IEssentialData, IEssentialMatrixData } from '../../dataset_presenters/model';
import { IProspectiveConfig } from '../lineupeditor/model';
import { voySkillScore } from '../utils';

export interface ISkillData extends IEssentialData {
	skill: string;
	score: number;
	percent_total: number;
	fail_point: number;
	crew_count: number;
	best_proficiency: number;
	best_minimum: number;
	paired_skills: string[];
};

export function getSkillData(voyageConfig: IVoyageCalcConfig | IProspectiveConfig): ISkillData[] {
	const data: ISkillData[] = [];

	const assignedCrew: PlayerCrew[] = [];
	voyageConfig.crew_slots.forEach(cs => {
		if (cs.crew) assignedCrew.push(cs.crew);
	});

	const totalScore: number = Object.keys(voyageConfig.skill_aggregates)
		.reduce((prev, curr) => prev + voySkillScore(voyageConfig.skill_aggregates[curr]), 0);

	Object.keys(voyageConfig.skill_aggregates).forEach((skill, idx) => {
		const voyScore: number = voySkillScore(voyageConfig.skill_aggregates[skill]);
		const percentTotal: number = voyScore / totalScore * 100;
		const failPoint: number = ((0.0449 * voyScore) + 34.399) / 60; // In hours

		const skilledCrew: PlayerCrew[] = assignedCrew.filter(ac => Object.keys(ac.base_skills).includes(skill));

		const { bestMinimum, bestProficiency } = (() => {
			let bestProficiency: number = 0;
			let bestMinimum: number = 0;
			skilledCrew.forEach(sc => {
				// Crew in voyage history config have no skills prop
				if ('skills' in sc) {
					const score: number = (sc.skills[skill] as Skill).range_max;
					const minscore: number = (sc.skills[skill] as Skill).range_min;
					if (score > bestProficiency) bestProficiency = score;
					if (minscore > bestMinimum) bestMinimum = minscore;
				}
			});
			return { bestMinimum, bestProficiency }
		})();

		const pairedSkills: string[] = [];
		Object.keys(CONFIG.SKILLS)
			.filter(s => s !== skill)
			.forEach(skillB => {
				const skilledPair: PlayerCrew[] = skilledCrew.filter(sc => Object.keys(sc.base_skills).includes(skillB));
				if (skilledPair.length > 0) pairedSkills.push(skillB);
			});

		data.push({
			id: idx,
			name: CONFIG.SKILLS[skill],
			skill,
			score: voyScore,
			percent_total: percentTotal,
			fail_point: failPoint,
			crew_count: skilledCrew.length,
			best_proficiency: bestProficiency,
			best_minimum: bestMinimum,
			paired_skills: pairedSkills
		});
	});

	return data;
}

export interface ISkillPairData extends IEssentialMatrixData {
	coverage: PlayerCrew[];
	coverage_count: number;
};

export function getSkillPairData(voyageConfig: IVoyageCalcConfig | IProspectiveConfig, skills: string[]): ISkillPairData[] {
	const data: ISkillPairData[] = [];

	const assignedCrew: PlayerCrew[] = [];
	voyageConfig.crew_slots.forEach(cs => {
		if (cs.crew) assignedCrew.push(cs.crew);
	});

	for (let i = 0; i < skills.length; i++) {
		for (let j = i; j < skills.length; j++) {
			const coverageCrew: PlayerCrew[] = assignedCrew.filter(ac =>
				Object.keys(ac.base_skills).includes(skills[i]) || Object.keys(ac.base_skills).includes(skills[j])
			).sort((a, b) => gauntletScore(b, skills[i], skills[j]) - gauntletScore(a, skills[i], skills[j]));
			data.push({
				id: (i*skills.length)+j+1,
				name:  `${skills[i]},${skills[j]}`,
				rowId: skills[i],
				columnId: skills[j],
				coverage: coverageCrew,
				coverage_count: coverageCrew.length
			});
		}
	}

	return data;
}

export function gauntletScore(crew: PlayerCrew, skillA: string, skillB: string): number {
	const a: Skill | undefined = crew.skills[skillA];
	const b: Skill | undefined = crew.skills[skillB];

	let score: number = 0;

	const averageA: number = a ? (a.range_min + a.range_max) / 2 : 0;
	score += (averageA * 3);
	if (skillA !== skillB) {
		const averageB: number = b ? (b.range_min + b.range_max) / 2 : 0;
		score += (averageB * 3);
	}

	return Math.floor(score);
};
