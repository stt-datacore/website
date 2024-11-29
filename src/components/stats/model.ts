import { CrewMember } from "../../model/crew";

export type StatsDisplayMode = 'crew' | 'graphs';

export interface SkoBucket {
    aggregates: number[],
    epoch_day: number,
    skills: string[]
    symbol: string,
}

export interface EpochDiff {
    aggregates: number[][]
    day_diff: number,
    epoch_days: number[],
    skill_diffs: number[],
    skills: string[],
    symbols: string[],
    velocity: number,
};

export interface SkillFilterConfig {
    avail_primary: string[];
    primary: string[];

    avail_secondary: string[];
    secondary: string[];

    avail_tertiary: string[];
    tertiary: string[];
}

export type Highs = {
    crew: CrewMember,
    aggregates: number[],
    aggregate_sum: number,
    epoch_day: number,
    skills: string[]
};

export interface IStatsContext {
    crewCount: number;
    skillKey: string;
    setSkillKey: (value: string) => void;
    flatOrder: SkoBucket[];
    setFlatOrder: (value: SkoBucket[]) => void;
    obtainedFilter?: string[];
    setObtainedFilter: (value?: string[]) => void;
    uniqueObtained: string[]
    skoBuckets: { [key: string]: SkoBucket[] },
    displayMode: StatsDisplayMode;
    setDisplayMode: (value: StatsDisplayMode) => void
    epochDiffs: EpochDiff[];
    allHighs: Highs[];
}