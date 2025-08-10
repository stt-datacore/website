import { Skill } from '../../model/crew';

import { ISkillAggregate, ISlottableCrew } from './model';

interface ILineupCrew {
	id: number;
	name: string;
	score: number;
	event_score: number;
};

interface ILineupSkills {
	security_skill: ISkillAggregate;
	command_skill: ISkillAggregate;
	diplomacy_skill: ISkillAggregate;
	medicine_skill: ISkillAggregate;
	science_skill: ISkillAggregate;
	engineering_skill: ISkillAggregate;
};

interface ILineupSkillCounts {
	security_skill: number;
	command_skill: number;
	diplomacy_skill: number;
	medicine_skill: number;
	science_skill: number;
	engineering_skill: number;
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
	vp: number;
	counts: ILineupSkillCounts;
	coverage: number;
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
		const skillCounts: ILineupSkillCounts = {
			command_skill: 0,
			diplomacy_skill: 0,
			security_skill: 0,
			engineering_skill: 0,
			science_skill: 0,
			medicine_skill: 0
		};
		const skillCoverage: Set<string> = new Set();
		let dTotalScore: number = 0, dTotalProficiency: number = 0;
		let iTotalBonus: number = 0, iTotalVP: number = 0;

		for (let i = 0; i < assignments.length; i++) {
			crew.push({
				id: assignments[i].id,
				name: assignments[i].name,
				score: assignments[i].score,
				event_score: assignments[i].event_score
			});
			const traitBonus: number = assignments[i].trait_slots[i];
			traitsMatched.push(traitBonus > 0 ? 1 : 0);
			iTotalBonus += traitBonus;
			iTotalVP += assignments[i].event_score;
			for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
				if (!assignments[i].skills[SKILL_IDS[iSkill]]) continue;
				const skill: Skill = assignments[i].skills[SKILL_IDS[iSkill]];
				const dProficiency: number = skill.range_min+(skill.range_max-skill.range_min)/2;
				const dSkillScore: number = skill.core+dProficiency;
				skillScores[SKILL_IDS[iSkill]].voyage += dSkillScore;
				skillScores[SKILL_IDS[iSkill]].core += skill.core;
				skillScores[SKILL_IDS[iSkill]].range_min += skill.range_min;
				skillScores[SKILL_IDS[iSkill]].range_max += skill.range_max;
				skillCounts[SKILL_IDS[iSkill]]++;
				dTotalScore += dSkillScore;
				dTotalProficiency += dProficiency;
			}
			const skills: string[] = Object.keys(assignments[i].skills);
			for (let i = 1; i < skills.length; i++) {
				skillCoverage.add(skills[0]+','+skills[i]);
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
		this.antimatter = iTotalBonus;
		this.vp = iTotalVP;
		this.counts = skillCounts;
		this.coverage = skillCoverage.size;
		this.vectors = [];
		this.log = assemblyLog;
	}
}
