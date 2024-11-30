import { CrewMember } from "../../model/crew";

export type StatsDisplayMode = 'crew' | 'graphs';

export interface SkoBucket {
    aggregates: number[],
    epoch_day: number,
    skills: string[]
    symbol: string,
    rarity: number,
    next?: SkoBucket,
    prev?: SkoBucket
}

export interface EpochDiff {
    aggregates: number[][]
    day_diff: number,
    epoch_days: number[],
    skill_diffs: number[],
    skills: string[],
    symbols: string[],
    velocity: number,
    rarity: number
};

export interface SkillFilterConfig {
    primary: string[];
    secondary: string[];
    tertiary: string[];
    avail_primary: string[];
    avail_secondary: string[];
    avail_tertiary: string[];
    primary_totals: { [key: string]: number }
    secondary_totals: { [key: string]: number }
    tertiary_totals: { [key: string]: number }
    obtainedFilter: string[];
    rarity: number[];
}

export type Highs = {
    crew: CrewMember,
    aggregates: number[],
    aggregate_sum: number,
    epoch_day: number,
    skills: string[],
    rarity: number;
};

export interface IStatsContext {
    filterConfig: SkillFilterConfig;
    setFilterConfig: (value: SkillFilterConfig) => void;
    crewCount: number;
    flatOrder: SkoBucket[];
    setFlatOrder: (value: SkoBucket[]) => void;
    uniqueObtained: string[]
    skoBuckets: { [key: string]: SkoBucket[] },
    displayMode: StatsDisplayMode;
    setDisplayMode: (value: StatsDisplayMode) => void
    epochDiffs: EpochDiff[];
    allHighs: Highs[];
}