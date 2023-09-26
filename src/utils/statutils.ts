import { BarDatum } from '@nivo/bar';
import CONFIG from '../components/CONFIG';
import { PlayerCrew } from '../model/player';

const STARBASE_BONUS_CORE = 1.15;
const STARBASE_BONUS_RANGE = 1.13;

export type StatTreeNode = BarDatum & {
    name: string;
    children: StatTreeNode[];
    value: number;
    valueGauntlet: number;
    loc: number;
}

export interface ValueStats {
    name: string;
    value: number;
    valueGauntlet: number;
}

export function sortedStats(crew: PlayerCrew): ValueStats[] {
	let toSort = [] as ValueStats[];
	for (const skill in crew.base_skills) {
		toSort.push({
			name: CONFIG.SKILLS_SHORT.find(s => s.name === skill)?.short ?? "",
			value: Math.round(crew.base_skills[skill].core * STARBASE_BONUS_CORE +
                ((crew.base_skills[skill].range_max + crew.base_skills[skill].range_min) / 2) * STARBASE_BONUS_RANGE),
            valueGauntlet: Math.round(((crew.base_skills[skill].range_max + crew.base_skills[skill].range_min) / 2) * STARBASE_BONUS_RANGE),
		});
    }
    
    toSort.sort((a,b) => a.value - b.value);
    return toSort;
}

export function insertInStatTree(crewStats: ValueStats[], tree: StatTreeNode[], parentName: string) {
    if (crewStats.length > 0) {
        let bestSkill = crewStats.shift();
        let name = parentName ? `${parentName} > ${bestSkill?.name}` : bestSkill?.name;
        let entry = tree.find(e => e.name === name);
        if (!entry && bestSkill) {
            entry = {
                name,
                children: [] as StatTreeNode[],
                value: bestSkill.value,
                valueGauntlet: bestSkill.valueGauntlet,
                loc: 1
            } as StatTreeNode;
            tree.push(entry);
        } else if (entry && bestSkill) {
            entry.value += bestSkill.value;
            entry.valueGauntlet += bestSkill.valueGauntlet;
            entry.loc++;
        }

        if (entry && name) insertInStatTree(crewStats, entry.children, name);
    }
}