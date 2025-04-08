import { CrewMember } from "../model/crew";

export function qpComp(a: CrewMember, b: CrewMember, skill: string) {
    if (!a.best_quipment!.aggregate_by_skill[skill]) return -1;
    else if (!b.best_quipment!.aggregate_by_skill[skill]) return 1;
    else return a.best_quipment!.aggregate_by_skill[skill] - b.best_quipment!.aggregate_by_skill[skill];
};

export function skoComp(a: CrewMember, b: CrewMember, skill_idx: number) {
    if (skill_idx >= a.skill_order.length) {
        return -1;
    }
    else if (skill_idx >= b.skill_order.length) {
        return 1;
    }
    else {
        return a.best_quipment!.aggregate_by_skill[a.skill_order[skill_idx]] - b.best_quipment!.aggregate_by_skill[b.skill_order[skill_idx]];
    }
};

export function multiComp(a: CrewMember, b: CrewMember, combo_id: number) {
    if (combo_id === 0) {
        if (a.best_quipment_1_2 && b.best_quipment_1_2) {
            return a.best_quipment_1_2.aggregate_power - b.best_quipment_1_2.aggregate_power;
        }
        else if (a.best_quipment_1_2) {
            return 1;
        }
        else if (b.best_quipment_1_2) {
            return -1;
        }
    }
    else if (combo_id === 1) {
        if (a.best_quipment_1_3 && b.best_quipment_1_3) {
            return a.best_quipment_1_3.aggregate_power - b.best_quipment_1_3.aggregate_power;
        }
        else if (a.best_quipment_1_3) {
            return 1;
        }
        else if (b.best_quipment_1_3) {
            return -1;
        }
    }
    else if (combo_id === 2) {
        if (a.best_quipment_2_3 && b.best_quipment_2_3) {
            return a.best_quipment_2_3.aggregate_power - b.best_quipment_2_3.aggregate_power;
        }
        else if (a.best_quipment_2_3) {
            return 1;
        }
        else if (b.best_quipment_2_3) {
            return -1;
        }
    }
    else if (combo_id === 3) {
        if (a.best_quipment_3 && b.best_quipment_3) {
            return a.best_quipment_3.aggregate_power - b.best_quipment_3.aggregate_power;
        }
        else if (a.best_quipment_3) {
            return 1;
        }
        else if (b.best_quipment_3) {
            return -1;
        }
    }
    else if (combo_id === 4) {
        if (a.best_quipment_top && b.best_quipment_top) {
            return a.best_quipment_top.aggregate_power - b.best_quipment_top.aggregate_power;
        }
        else if (a.best_quipment_top) {
            return 1;
        }
        else if (b.best_quipment_top) {
            return -1;
        }
    }

    return 0;
};
