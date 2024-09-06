import { BossBattlesRoot } from "./boss";
import { BaseSkills, CrewMember, PlayerSkill, Skill } from "./crew";
import { PlayerCrew, PlayerData } from "./player";
import { Ship } from "./ship";
import { BuffStatTable } from "../utils/voyageutils";
import { EquipmentCommon, EquipmentItem } from "./equipment";
import { Collection } from "./game-elements";
import { ICoreData } from "../context/datacontext";
import { MissionChallenge, MissionTraitBonus, QuestFilterConfig } from "./missions";
import { IEphemeralData } from "../context/playercontext";

export interface GameWorkerOptionsList {
    key: number;
    value: number;
    text: string;
}
export interface VoyageStatsConfig {
    others?: number[];
    numSims: number;
    startAm: number;
    currentAm: number;
    elapsedSeconds: number;
    variance: number;
    ps?: Skill;
    ss?: Skill;
}

export interface ExtendedVoyageStatsConfig extends VoyageStatsConfig{
    selectedTime?: number;
}

export interface GameWorkerOptions {
    strategy?: string;
    searchDepth?: number;
    extendsTarget?: number;
}

export interface CalculatorProps {
    playerData: PlayerData;
    allCrew: PlayerCrew[];
}

export interface AllData extends CalculatorProps {
    allShips?: Ship[];
    playerShips?: Ship[];
    useInVoyage?: boolean;
    bossData?: BossBattlesRoot;
    buffConfig?: BuffStatTable;
}

export interface VoyageConsideration {
    ship: Ship;
    score: number;
    traited: boolean;
    bestIndex: number;
    archetype_id: number;
}

export interface Calculation {
    id: string;
    requestId: string;
    name: string;
    calcState: number;
    result?: CalcResult;
    trackState?: number;
    confidenceState?: number;
    errorMessage?: string;
    telemetrySent?: boolean;
}

export interface CalcResult extends Calculation {
    estimate: Estimate;
    entries: CalcResultEntry[];
    aggregates: Aggregates;
    startAM: number;
}

export interface Estimate {
    refills: Refill[];
    dilhr20: number;
    refillshr20: number;
    final: boolean;
    deterministic?: boolean;
    antimatter?: number;
}

export interface Refill {
    all: number[];
    result: number;
    safeResult: number;
    saferResult: number;
    moonshotResult: number;
    lastDil: number;
    dilChance: number;
    refillCostResult: number;
}

export interface CalcResultEntry {
    slotId: number;
    choice: PlayerCrew;
    hasTrait: boolean | number;
}

export interface Aggregates {
    command_skill: AggregateSkill;
    science_skill: AggregateSkill;
    security_skill: AggregateSkill;
    engineering_skill: AggregateSkill;
    diplomacy_skill: AggregateSkill;
    medicine_skill: AggregateSkill;
}

export interface AggregateSkill extends Skill {
    skill: PlayerSkill | string;
}

export interface CalcConfig {
    estimate: number;
    minimum: number;
    moonshot: number;
    antimatter: number;
    dilemma: {
        hour: number;
        chance: number;
    };
    refills?: Refill[];
    confidence?: number;
}

export interface JohnJayBest {
    key: string;
    crew: JJBestCrewEntry[];
    traits: number[];
    skills: BaseSkills;
    estimate: Estimate;
}

export interface JJBestCrewEntry {
    id: number;
    name: string;
    score: number;
}

export interface ExportCrew {
    id: number;
    name: string;
    traitBitMask: number;
    max_rarity: number;
    skillData: number[];
}

export interface EquipmentWorkerConfig {
    items: EquipmentItem[];
    playerData: PlayerData;
    addNeeded?: boolean;
}

export interface EquipmentWorkerResults {
    items: (EquipmentCommon | EquipmentItem)[];
}

export interface BetaTachyonSettings {
    name?: string,
    // Voyages Improved
    improved: number,
    // Base Power Score
    power: number,
    // Effort To Max
    citeEffort: number,
    // Antimatter Traits
    antimatter: number,
    // Not In Portal
    portal: number,
    // Never In Portal
    never: number,
    // Stat-Boosting Collections Increased
    collections: number,
    // Skill-Order Rarity
    skillRare: number,
    // Overall Roster Power Rank
    score: number,
    // Power Rank Within Skill Order
    triplet: number,
    // Magic number
    magic: number,
    // Retrieval Odds
    retrieval: number,
    // Quipment Score
    quipment: number,
    // Voyage Group Sparsity
    groupSparsity: number;
}

export interface SkillOrderRarity {
    skillorder: string;
    skills: string[];
    rarity: number;
    count: number;
}

export interface BetaTachyonRunnerConfig {
    playerData: PlayerData;
    prospects: PlayerCrew[];
    collections: Collection[];
    inputCrew: CrewMember[];
    immortalizedSymbols: string[];
    buffs: BuffStatTable;
    settings: BetaTachyonSettings;
    coreItems: EquipmentItem[];
}


export interface VoyageImprovement {
	voyage: string;
	crew: PlayerCrew[];
	maxEV: number;
	remainingEV: number;
}

export interface CiteData {
	crewToCite: PlayerCrew[];
    crewToRetrieve: PlayerCrew[];
	crewToTrain: PlayerCrew[];
    skillOrderRarities: SkillOrderRarity[];
}


export type ThreeSolveResult = 'full' | 'partial' | 'none';

export interface QuestSolverConfig extends QuestFilterConfig {
    buffs: BuffStatTable;
    context: {
        core: ICoreData,
        player: {
            playerData: PlayerData,
            ephemeral?: IEphemeralData
        }
    };
}

export interface CrewChallengeInfo {
    challenge: MissionChallenge;
    skills: BaseSkills;
    trait_bonuses?: MissionTraitBonus[];
    max_solve?: boolean;
    path?: string;
    power_decrease?: number;
    kwipment: number[];
    kwipment_expiration: number[];
}

export interface AssociatedPath {
    path: string;
    needed_kwipment?: number[];
    skills: BaseSkills;
}

export interface IQuestCrew extends PlayerCrew {
    challenges?: CrewChallengeInfo[];
    challenge_key?: string;
    added_kwipment?: number[][] | number[];
    added_kwipment_expiration?: number[][] | number[];
    metasort?: number;
    added_kwipment_key?: string;
    associated_paths?: AssociatedPath[];
}

export interface PathGroup {
    path: string;
    crew: IQuestCrew[];
    mastery: number;
    completeness: ThreeSolveResult;
    path_expanded?: MissionChallenge[];
}

export interface QuestSolverResult {
    status: boolean;
    crew: IQuestCrew[];
    error?: string;
    fulfilled: boolean;
    failed?: number[];
    paths: PathGroup[];
    pathspartial: boolean;
}

export interface QuestSolverCacheItem {
    key: string;
    result: QuestSolverResult;
}

export const EMPTY_SKILL = {
	skill: undefined,
	core: 0,
	range_max: 0,
	range_min: 0
} as Skill;
