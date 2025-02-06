import { PlayerCrew } from '../../../../model/player';
import { IVoyageCalcConfig } from '../../../../model/voyage';
import { oneCrewCopy } from '../../../../utils/crewutils';
import { IEssentialMatrixData } from '../../../dataset_presenters/model';
import { IProspectiveConfig } from '../../lineupeditor/model';
import { getCrewGauntletAverage } from '../utils';

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
			).sort((a, b) =>
				getCrewGauntletAverage(b, [skills[i], skills[j]]) - getCrewGauntletAverage(a, [skills[i], skills[j]])
			);
			data.push({
				id: (i * skills.length) + j + 1,
				name: `${skills[i]},${skills[j]}`,
				rowId: skills[i],
				columnId: skills[j],
				coverage: coverageCrew,
				coverage_count: coverageCrew.length
			});
		}
	}

	return data;
}

export interface IProficientCrew extends PlayerCrew {
	scored_skills: IScoredSkills;
	best_proficiency: number;
	crit_potential: string[];
};

interface IScoredSkills {
	[skillId: string]: IScoredSkill;
};

export interface IScoredSkill {
	skills: string[];
	score: number;
};

export function getProficientCrewData(voyageConfig: IVoyageCalcConfig | IProspectiveConfig, skills: string[]): IProficientCrew[] {
	const data: IProficientCrew[] = [];

	voyageConfig.crew_slots.forEach(cs => {
		if (cs.crew) {
			const proficientCrew: IProficientCrew = oneCrewCopy(cs.crew) as IProficientCrew;
			proficientCrew.scored_skills = {};
			for (let i = 0; i < skills.length; i++) {
				proficientCrew.scored_skills[skills[i]] = {
					skills: [skills[i]],
					score: getCrewGauntletAverage(proficientCrew, [skills[i]])
				};
				for (let j = i + 1; j < skills.length; j++) {
					const skillId: string = skills[i]+','+skills[j];
					proficientCrew.scored_skills[skillId] = {
						skills: [skills[i], skills[j]],
						score: getCrewGauntletAverage(proficientCrew, [skills[i], skills[j]])
					};
				}
			}
			proficientCrew.best_proficiency = Object.keys(proficientCrew.skills).reduce((prev, curr) => {
				const max: number = proficientCrew.skills[curr].range_max;
				return max > prev ? max : prev;
			}, 0);
			proficientCrew.crit_potential = (voyageConfig.event_content?.encounter_traits ?? []).filter(critTrait =>
				proficientCrew.traits.includes(critTrait)
			);
			data.push(proficientCrew);
		}
	});

	return data;
}
