import { CrewMember } from "../../model/crew";

export type StatsDisplayMode = 'crew' | 'graphs';

export interface SkoBucket {
    aggregates: number[],
    epoch_day: number,
    skills: string[]
    symbol: string,
    rarity: number,
    next?: SkoBucket,
    prev?: SkoBucket,
    crew: CrewMember
}

export interface EpochDiff {
    aggregates: number[][]
    day_diff: number,
    epoch_days: number[],
    skill_diffs: number[],
    skills: string[],
    symbols: string[],
    velocity: number,
    rarity: number,
    crew: CrewMember[]
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
    start_date: string;
    end_date: string;
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
    flatOrder: SkoBucket[];
    setFlatOrder: (value: SkoBucket[]) => void;
    uniqueObtained: string[]
    skoBuckets: { [key: string]: SkoBucket[] },
    displayMode: StatsDisplayMode;
    setDisplayMode: (value: StatsDisplayMode) => void
    epochDiffs: EpochDiff[];
    allHighs: Highs[];
}

export interface GraphPropsCommon {
    useFilters: boolean;
}

export interface SkillOrderDebutCrew {
    symbol: string,
    power: number,
    rank_at_debut: number,
    new_high: boolean
}

export interface SkillOrderDebut {
    skill_order: string,
    epoch_day: number,
    crew: SkillOrderDebutCrew[],
    high_power: number,
    low_power: number,
}

export interface GraphSeries {
    id: string;
    group: string;
    density: number,
    power: number,
    low_power: number,
    high_power: number,
    x: number | string,
    y: number,
    epoch_start: number;
    epoch_end: number;
    data?: any;
}