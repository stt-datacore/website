import CONFIG from '../components/CONFIG';

const STARBASE_BONUS_CORE = 1.15;
const STARBASE_BONUS_RANGE = 1.13;

export function sortedStats(crew): any[] {
	let toSort = [];
	for (const skill in crew.base_skills) {
		toSort.push({
			name: CONFIG.SKILLS_SHORT.find(s => s.name === skill).short,
			value:
				crew.base_skills[skill].core * STARBASE_BONUS_CORE +
				((crew.base_skills[skill].range_max + crew.base_skills[skill].range_min) / 2) * STARBASE_BONUS_RANGE
		});
    }
    
    toSort.sort((a,b) => a.value - b.value);
    return toSort;
}

export function insertInStatTree(crewStats: any[], tree: any[], parentName: string) {
    if (crewStats.length > 0) {
        let bestSkill = crewStats.shift();
        let name = parentName ? `${parentName} > ${bestSkill.name}` : bestSkill.name;
        let entry = tree.find(e => e.name === name);
        if (!entry) {
            entry = {
                name,
                children: [],
                value: bestSkill.value,
                loc: 1
            };
            tree.push(entry);
        } else {
            entry.value += bestSkill.value;
            entry.loc++;
        }
        insertInStatTree(crewStats, entry.children, name);
    }
}