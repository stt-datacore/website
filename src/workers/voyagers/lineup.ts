import { Skill } from '../../model/crew';

import { ISkillAggregate, ISlottableCrew } from './model';

interface ILineupCrew {
	id: number;
	name: string;
	score: number;
};

interface ILineupSkills {
	security_skill: ISkillAggregate;
	command_skill: ISkillAggregate;
	diplomacy_skill: ISkillAggregate;
	medicine_skill: ISkillAggregate;
	science_skill: ISkillAggregate;
	engineering_skill: ISkillAggregate;
};

const SKILL_IDS: string[] = [
	'command_skill', 'diplomacy_skill', 'security_skill',
	'engineering_skill', 'science_skill', 'medicine_skill'
];

export class VoyagersLineup {
	key: string;
	crew: ILineupCrew[];
	traits: number[];
	skills: ILineupSkills;
	score: number;
	proficiency: number;
	antimatter: number;
	vectors: number[];
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
