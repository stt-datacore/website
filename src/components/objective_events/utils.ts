import { ObjectiveArchetype } from "../../model/oemodel";

export const KnownStages = [
    'complete_faction_([a-z0-9_]+)_mission_objective',
    'level_crew_([a-z0-9_]+)_objective',
    'complete_ship_battle_mission_([a-z0-9_]+)_objective',
    'level_([a-z0-9_]+)_crew_objective',
    'fuse_([a-z0-9_]+)_crew_objective',
    'level_crew_objective',
    'fuse_crew_objective',
    'immortalize_crew_objective',
    'complete_ship_battle_mission_objective',
    'complete_dilemma_objective',
    'complete_gauntlet_objective'
];

export const KSRegExp = (() => {
    const obj = {} as {[key:string]: RegExp};
    for (let kt of KnownStages) {
        obj[kt] = new RegExp(kt);
    }
    return obj;
})();

export const FactionAbbrMap = {
    'fed': 12,
    'ke': 1,
    'baj': 8,
    'car': 4,
    'maq': 5,
    'maquis': 5,
    'fer': 3,
    'fer_trad': 7,
    'aug': 2,
    'rom': 13,
    'ter': 11,
    'kca': 14,
    'sec31': 9,
    'secton_31': 9,
    'hir': 10,
    'dom': 6,
    'borg': 20,
    'brg': 20
}

export function getArchetypeTitle(oearch: ObjectiveArchetype) {
    return oearch.milestones[oearch.milestones.length - 1].requirement;
}