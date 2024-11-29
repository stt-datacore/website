import { CrewMember } from "../../model/crew";

export const skillIcon = (skill: string) => {
    return `${process.env.GATSBY_ASSETS_URL}/atlas/icon_${skill}.png`;
}

export interface SkoBucket {
    symbol: string,
    aggregates: number[],
    epoch_day: number,
    skills: string[]
}

export interface PassDiff {
    symbols: string[],
    epoch_days: number[],
    day_diff: number,
    skill_diffs: number[],
    skills: string[],
    velocity: number,
    aggregates: number[][]
};

export type Highs = { crew: CrewMember, aggregates: number[], aggregate_sum: number, epoch_day: number, skills: string[] };

export function findHigh(epoch_day: number, skills: string[], data: Highs[], day_only = false) {
    let ssj = skills.join();
    data.sort((a, b) => b.epoch_day - a.epoch_day);
    return data.find(f => f.epoch_day <= epoch_day && (day_only || f.skills.join() === ssj));
}

