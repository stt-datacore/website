import { CrewMember } from "../../model/crew";

export type StatsDisplayMode = 'crew' | 'graphs' | 'traits' | 'items';

export type GameModeUtility = 'gauntlet' | 'voyage' | 'shuttle' | 'ship';

export interface TraitStats {
    trait: string,
    trait_raw: string,
    collection: string,
    first_appearance: Date
    crew: CrewMember[],
    first_crew: CrewMember,
    latest_crew: CrewMember,
    launch_crew?: CrewMember,
    total_crew: number,
    hidden: boolean,
    variant: boolean,
    short_names?: string[]
    icon?: string,
    retro?: number,
    grade?: number,
    highest_datascore: CrewMember
}


export interface EpochItem {
    aggregates: number[],
    cores: number[],
    proficiencies: number[],
    epoch_day: number,
    skills: string[]
    symbol: string,
    rarity: number,
    next?: EpochItem,
    prev?: EpochItem,
    crew: CrewMember
}

export interface EpochDiff {
    aggregates: number[][]
    cores: number[][],
    proficiencies: number[][],
    day_diff: number,
    epoch_days: number[],
    skill_diffs: number[],
    skills: string[],
    symbols: string[],
    velocity: number,
    rarity: number,
    crew: CrewMember[]
};

export interface StatsDataSets {
    flatData: EpochItem[];
    skoBuckets: { [key: string]: EpochItem[] };
    highs: Highs[];
    obtainedList: string[];
    epochDiffs: EpochDiff[];
}

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

export interface Highs {
    crew: CrewMember,
    aggregates: number[],
    cores: number[],
    proficiences: number[],
    aggregate_sum: number,
    epoch_day: number,
    skills: string[],
    rarity: number;
};

export interface IStatsContext {
    filterConfig: SkillFilterConfig;
    setFilterConfig: (value: SkillFilterConfig) => void;
    flatOrder: EpochItem[];
    setFlatOrder: (value: EpochItem[]) => void;
    uniqueObtained: string[]
    skoBuckets: { [key: string]: EpochItem[] },
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
    core_power: number,
    prof_power: number,
    rank_at_debut: number,
    prof_rank_at_debut: number,
    core_rank_at_debut: number,
    new_high: boolean,
    core_new_high: boolean,
    prof_new_high: boolean,
    rarity: number
}

export interface SkillOrderDebut {
    skill_order: string,
    epoch_day: number,
    crew: SkillOrderDebutCrew[],
    high_power: number,
    low_power: number,
    core_high_power: number,
    core_low_power: number,
    prof_high_power: number,
    prof_low_power: number,
    rarity: number
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
    data?: SkillOrderDebutCrew[];
    rarity: number;
}