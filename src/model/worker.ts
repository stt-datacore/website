import { BossEffect } from "./boss";
import { BaseSkills, CrewMember, Skill } from "./crew";
import { Aggregates, CompactCrew, PlayerCrew, PlayerData } from "./player";
import { BattleMode, Ship, ShipAction, ShipRankingMethod } from "./ship";
import { BuffStatTable } from "../utils/voyageutils";
import { EquipmentCommon, EquipmentItem } from "./equipment";
import { Collection } from "./game-elements";
import { ICoreData } from "../context/coremodel";
import { MissionChallenge, MissionTraitBonus, QuestFilterConfig } from "./missions";
import { IEphemeralData } from "../context/playercontext";
import { IPolestar } from "../components/retrieval/model";
import { RetrievalCost } from "../utils/retrieval";
import { Estimate } from "./voyage";

export type ComesFrom = {
    type: number;
    action: string;
    bonus: number;
    aspect: 'ability' | 'power';
}


export interface WorkerConfigBase<T> {
    max_results?: number
    max_iterations?: bigint;
    start_index?: bigint;
    verbose?: boolean;
}

export interface IWorkerResults<T> {
    items: T[]
    total_iterations: bigint;
    run_time: number;
}

export interface IMultiWorkerState {
    context: IMultiWorkerContext;
}

export interface IMultiWorkerConfig<TConfig extends WorkerConfigBase<TItem>, TItem> {
    config: TConfig;
    max_workers?: number;
    callback: (progress: IMultiWorkerStatus<TItem>) => void;
}

export interface IMultiWorkerStatus<T> {
    data: {
        result: {
            items?: T[],
            run_time?: number,
            total_iterations?: bigint,
            options?: any,
            result?: T,
            percent?: number;
            progress?: bigint;
            count?: bigint;
            accepted?: bigint;
        },
        id: string,
        inProgress: boolean
    }
}

export interface IMultiWorkerContext {
    runWorker: (options: any) => void;
    cancel: () => void;
    workers: number;
    count: bigint;
    progress: bigint;
    percent: number;
    cancelled: boolean;
    running: boolean;
    startTime: Date,
    endTime?: Date
    run_time: number;
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
    proficiency?: number;
    searchDepth?: number;
    extendsTarget?: number;
}

export interface JohnJayBest {
    key: string;
    crew: JJBestCrewEntry[];
    traits: number[];
    skills: Aggregates;
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
    crewFilter?: number[];
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
    // Crew general rareness
    rareness: number;
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
    skills: string[];
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
    needed_kwipment_expiration?: number[];
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
	skill: '',
	core: 0,
	range_max: 0,
	range_min: 0
} as Skill;


export interface IMutualPolestarWorkerItem {
    combo: string[];
    crew: string[];
    cost: RetrievalCost
}

export type PolestarComboSize = 1 | 2 | 3 | 4;

export interface IMutualPolestarWorkerConfig extends WorkerConfigBase<IMutualPolestarWorkerItem> {
    polestars: IPolestar[];
    comboSize: PolestarComboSize;
    allowUnowned: number;
    no100: boolean;
}

export interface IPolestarCrew extends CompactCrew {
    disposition: 'include' | 'exclude' | 'unowned';
}

export interface IMutualPolestarInternalWorkerConfig extends WorkerConfigBase<IMutualPolestarWorkerItem> {
    allPolestars: string[];
    crew: IPolestarCrew[];
    comboSize: PolestarComboSize;
    allowUnowned?: number;
}
export interface ShipWorkerConfigBase extends WorkerConfigBase<ShipWorkerItem> {
    ranking_method: ShipRankingMethod,
    event_crew?: CrewMember,
    crew: CrewMember[],
    battle_mode: BattleMode,
    rate: number,
    simulate: boolean,
    fixed_activation_delay: number,
    power_depth?: number,
    max_rarity?: number,
    min_rarity?: number,
    opponents?: Ship[],
    action_types?: number[],
    ability_types?: number[],
    max_results?: number
    defense?: number;
    offense?: number;
    get_attacks?: boolean;
    effects?: BossEffect[];
    max_duration?: number;
    ignore_skill?: boolean;
    activation_offsets?: number[];
    opponent_variance?: number;
}

export interface ShipWorkerConfig extends ShipWorkerConfigBase {
    ship: Ship,
}

export interface MultiShipWorkerConfig extends ShipWorkerConfigBase {
    ships: Ship[],
}


export interface AttackInstant {
  actions: ShipAction[];
  second: number;
  hull: number;
  shields: number;
  attack: number;
  min_attack: number;
  max_attack: number;
  boarding_damage_per_second: number;
  opponent_boarding_damage_per_second: number;
  ship: Ship;
  win?: boolean;
  opponent_hull: number;
  opponent_shields: number;
  opponent_attack: number;
  opponent_min_attack: number;
  opponent_max_attack: number;
  cloaked: boolean;
  opponent_cloaked: boolean;
  comes_from: ComesFrom[]
}


export interface ShipWorkerItem {
    id: number;
    rate: number;
    battle_mode: BattleMode;
    ship: Ship,
    crew: CrewMember[];
    attack: number;
    min_attack: number;
    max_attack: number;
    battle_time: number;
    weighted_attack: number;
    arena_metric: number;
    fbb_metric: number;
    skirmish_metric: number;
    percentile: number;
    attacks?: AttackInstant[];
    win?: boolean;
    reference_battle?: boolean;
}

export interface ShipWorkerTransportItem {
    id: number;
    rate: number;
    battle_mode: BattleMode;
    ship: number,
    crew: number[];
    attack: number;
    min_attack: number;
    max_attack: number;
    battle_time: number;
    weighted_attack: number;
    arena_metric: number;
    fbb_metric: number;
    skirmish_metric: number;
    percentile: number;
    attacks?: AttackInstant[];
    win?: boolean;
}


export interface ShipWorkerResults extends IWorkerResults<ShipWorkerTransportItem> {
    total_iterations: bigint;
    run_time: number;
}