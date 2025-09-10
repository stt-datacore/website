import { CrewMember } from "../model/crew";
import { EquipmentItem, EquipmentItemSource } from "../model/equipment";
import { ItemWithBonus } from "./itemutils";

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

export function createQuipmentInventoryPool(mergedItems: EquipmentItem[], quipment: ItemWithBonus[], farmable?: boolean) {
    const equipment = {} as {[key:string]: EquipmentItem};
    for (let q of quipment) {
        q.item.recipe?.list.forEach((ing) => {
            if (!equipment[ing.symbol]) {
                let eq = mergedItems.find(f => f.symbol === ing.symbol);
                if (eq) {
                    equipment[ing.symbol] = structuredClone(eq);
                    equipment[ing.symbol].needed = 0;
                }
            }
            if (equipment[ing.symbol]) {
                equipment[ing.symbol].needed! += ing.count;
                equipment[ing.symbol].needed_by ??= [];
                equipment[ing.symbol].needed_by?.push(q.item.symbol);
            }
        });
    }
    const results = Object.values(equipment);
    return results.filter(item => !farmable || item.needed !== undefined && item.quantity !== undefined && item.needed > item.quantity);
}

export function fillInQuipment(crew: CrewMember, quipment: EquipmentItem[], slots: number) {
    let curr_quip = crew.kwipment.map(kw => typeof kw === 'number' ? kw : kw[1]) as number[];
    let curr_exp = crew.kwipment_expiration.map(kw => typeof kw === 'number' ? kw : kw[1]) as number[];
    let quip_list = quipment.map(q => Number(q.id));

    let new_quip = quip_list; //.filter(id => !curr_quip.includes(id));
    let j = 0;
    let i = 0;
    for (i = 0; i < slots; i++) {
        if (!new_quip.includes(curr_quip[i])) {
            curr_quip[i] = 0;
            curr_exp[i] = 0;
        }
    }
    for (i = 0; i < new_quip.length; i++) {
        if (!curr_quip.includes(new_quip[i])) {
            while (curr_quip[j]) j++;
            curr_quip[j] = new_quip[i];
        }
    }
    return { kwipment: curr_quip, kwipment_expiration: curr_exp };
    // crew.kwipment = curr_quip;
    // crew.kwipment_expiration = curr_exp;
}

export function checkIsProspect(crew: CrewMember) {
    let curr_quip = crew.kwipment.map(kw => typeof kw === 'number' ? kw : kw[1]) as number[];
    let curr_exp = crew.kwipment_expiration.map(kw => typeof kw === 'number' ? kw : kw[1]) as number[];
    let i = 0;
    let c = curr_quip.length;
    let d = curr_exp.length;
    if (c != d) {
        return true;
    }
    for (i = 0; i < c; i++) {
        if (curr_quip[i] && !curr_exp[i]) return true;
    }
    return false;
}