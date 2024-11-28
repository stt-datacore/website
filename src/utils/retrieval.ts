import { CrewMember } from "../model/crew";
import { PolestarCombo } from "../model/game-elements";
import { CompactCrew, PlayerCrew } from "../model/player";



export function findPolestars(crew: PlayerCrew | CrewMember, roster: (PlayerCrew | CrewMember)[]): PolestarCombo[] {
    // Generate crewman's list of polestars (traits + rarity + skills)
    let polestars = crew.traits.slice();
    polestars.push('crew_max_rarity_'+crew.max_rarity);
    for (let skill in crew.base_skills) {
        if (crew.base_skills[skill]) polestars.push(skill);
    }
    polestars = polestars.sort((a, b) => a.localeCompare(b));
    // Initialize all valid combinations of polestars with a zero count
    let crewPolestarCombos: PolestarCombo[] = [];
    let f = function(prepoles: string[], traits: string[]) {
        for (let t = 0; t < traits.length; t++) {
            const newpoles = prepoles.slice();
            newpoles.push(traits[t]);
            if (newpoles.length <= 4) {
                crewPolestarCombos.push({
                    'count': 0,
                    'alts': [],
                    'polestars': newpoles
                });
            }
            f(newpoles, traits.slice(t+1));
        }
    }
    f([] as string[], polestars);

    // Find all crew who have any polestars in common
    for (let i = 0; i < roster.length; i++) {
        if (!roster[i].in_portal) continue;
        let polesInCommon = [] as string[];
        for (let t = 0; t < crew.traits.length; t++) {
            if (roster[i].traits.indexOf(crew.traits[t]) >= 0)
                polesInCommon.push(crew.traits[t]);
        }
        // Add 1 to count of every polestar combination in common
        if (polesInCommon.length > 0) {
            // Only consider rarity and skills if at least 1 trait in common
            if (roster[i].max_rarity == crew.max_rarity)
                polesInCommon.push('crew_max_rarity_'+crew.max_rarity);
            for (let skill in roster[i].base_skills) {
                if (roster[i].base_skills[skill] && crew.base_skills[skill])
                    polesInCommon.push(skill);
            }
            crewPolestarCombos.forEach(combo => {
                if (polesInCommon.length >= (combo.polestars?.length ?? 0)) {
                    if (combo.polestars?.every(polestar => polesInCommon.indexOf(polestar) >= 0)) {
                        combo.count++;
                        if (roster[i].archetype_id != crew.archetype_id) {
                            if (!combo.alts) combo.alts = [];
                            combo.alts.push({
                                'symbol': roster[i].symbol,
                                'name': roster[i].name
                            });
                        }
                    }
                }
            });
        }
    }

    // Find optimal polestars, i.e. smallest combinations with best chance of retrieving this crew
    crewPolestarCombos.sort((a, b) => {
        if (a.count == b.count && a.polestars && b.polestars)
            return a.polestars.length - b.polestars.length;
        return a.count - b.count;
    });

    let iBestCount = crewPolestarCombos[0].count;

    let optimals = [] as PolestarCombo[];
    for (let i = 0; i < crewPolestarCombos.length; i++) {
        let testcombo = crewPolestarCombos[i];

        // We stop looking for optimals if:
        //	test count is worse than current best count
        if (testcombo.count > iBestCount)
            break;

        // Ignore supersets of an already optimal subset
        let bIsSuperset = false;
        for (let j = 0; j < optimals.length; j++) {
            if (testcombo.polestars.length <= optimals[j].polestars.length) continue;
            bIsSuperset = true;
            optimals[j].polestars.forEach(polestar => {
                bIsSuperset = bIsSuperset && testcombo.polestars.indexOf(polestar) >= 0;
            });
            if (bIsSuperset) break;
        }
        if (bIsSuperset) continue;

        optimals.push(crewPolestarCombos[i]);
    }
    return optimals;
}

export interface RetrievalCost {
    credits: number,
    quantum: number
}

const UniqueRetrievalCredits = [0, 50000, 100000, 500000, 1000000, 5000000];
const UniqueRetrievalQuantum = [0, 100, 300, 500, 800, 900];

export function calculateRetrievalCost<T extends { max_rarity: number }>(items: T[]): RetrievalCost {
    const credits = [0, 0, 0, 0, 0, 0];
    const quantum = [0, 0, 0, 0, 0, 0];

    const crewlen = items.length;
    const discountFactor = (1 - (0.01 * (crewlen - 1)));

    for (let item of items) {
        credits[item.max_rarity] += (UniqueRetrievalCredits[item.max_rarity] * discountFactor);
        quantum[item.max_rarity] += UniqueRetrievalQuantum[item.max_rarity];
    }

    return {
        credits: Math.ceil(credits.reduce((p, n) => p + n) / crewlen),
        quantum: Math.ceil(quantum.reduce((p, n) => p + n) / crewlen)
    };
}