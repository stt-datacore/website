import { PlayerCrew, Reward } from './player';
import { Icon } from './game-elements';
import { Ship, ShipAction } from "./ship";

export interface BossBattlesRoot {
	env: BossConfig
	statuses: Status[]
	fleet_boss_battles_energy: Energy
	groups: BossGroup[]
}

export interface BossConfig {
	enabled: boolean
	battle_start_restricted_by_rank: boolean
}

export interface Status {
	desc_id: number
	symbol: string
	group: string
	blocker_boss?: string
	duration: number
	place: string
	boss_ship: BossShip
	difficulty_id: number
	attack_energy_cost: AttackEnergyCost
	card_icon: Icon
	damage_rewards: DamageReward[]
	destruction_rewards: DestructionReward[]
	id?: number
	ends_in?: number
	hp?: number
	combo?: Combo
	creator_character?: CreatorCharacter
	blocked_by_another_boss?: boolean
}

export interface BossShip extends Ship {
	icon: Icon
	archetype_id: number
	symbol: string
	ship_name: string
	rarity: number
	shields: number
	hull: number
	evasion: number
	attack: number
	accuracy: number
	crit_chance: number
	crit_bonus: number
	attacks_per_second: number
	shield_regen: number
	actions: ShipAction[]
}

export interface AttackEnergyCost {
	currency: number
	amount: number
}

export interface BossReward extends Reward {
	type: number
	id: number
	symbol: string
	item_type?: number
	name: string
	full_name: string
	flavor: string
	quantity: number
	rarity: number
}

export interface DamageReward {
	threshold: number
	rewards: BossReward[]
}

export interface DestructionReward {
	threshold: number
	rewards: BossReward[]
}

export interface Combo {
	nodes: ComboNode[]
	traits: string[]
	restart_number: number
	restart_limit: number
	damage: number
	active_effects: BossEffect[]
	next_effect: BossEffect
	previous_node_counts: number[]
	reroll_count: number
	reroll_limit: number
	reroll_price: RerollPrice
}

export interface ComboNode {
	open_traits: string[]
	hidden_traits: string[]
	unlocked_character?: UnlockedCharacter
	unlocked_crew_archetype_id?: number
}

export interface UnlockedCharacter {
	name: string
	crew_avatar_icon: Icon
	is_current: boolean
}

export interface BossEffect {
	icon: Icon
	icon_color: string
	description: string
	value: number
	multiplier: number
	min_value: number
	max_value: number
	string_format: string
}

export interface RerollPrice {
	currency: number
	amount: number
}

export interface CreatorCharacter {
	name: string
	icon: Icon
}

export interface Energy {
	id: number
	quantity: number
	regeneration: Regeneration
	regenerated_at: number
}

export interface Regeneration {
	increment?: number
	interval_seconds?: number
	regeneration_cap?: number
	seconds?: number;
}

export interface BossGroup {
	symbol: string
	name: string
}

/** Boss Battle Engine Models Start Here */

export interface BossBattle {
	id: number;	// equivalent to ephemeral/fbbRoot/statuses/id
	fleetId: number;
	bossGroup: string;
	difficultyId: number;
	chainIndex: number;
	chain: Chain;
	description: string;	// Boss, Difficulty
};

export interface Chain {
	id: string;
	traits: string[];
	nodes: ComboNode[];
}

export interface UserPreferences {
	view: string;
	pollInterval: number;
}

export interface SpotterPreferences {
	onehand: string;
	alpha: string;
	nonoptimal: string;
	noncoverage: string;
	confirmSolves: boolean;
}

export interface SoloPreferences {
	usable: string;
	shipAbility: string;
}

export type ShowHideValue = 'show' | 'hide';

export interface ExportPreferences {
	header: string;
	solve: string;
	node_format: string;
	node_traits: ShowHideValue;
	bullet: string;
	delimiter: string;
	coverage_format: string;
	crew_traits: ShowHideValue;
	duplicates: string;
	flag_onehand: string;
	flag_alpha: string;
	flag_unique: string;
	flag_nonoptimal: string;
}

export interface FilterNotes {
	oneHandException: boolean;
	alphaException: boolean;
	uniqueCrew: boolean;
	nonPortal: boolean;
	nonOptimal: boolean;
}

export interface ComboCount {
	index: number;
	combo: string[];
	crew: string[];
	portals: number;
}

export interface IgnoredCombo {
	index: number;
	combo: string[];
}

export interface SolverTrait {
	id: number;
	trait: string;
	name: string;
	poolCount: number;
	instance: number;
	source: string;
	consumed: boolean;
}

export interface SolverNode {
	index: number;
	givenTraitIds: number[];
	solve: string[];
	solveStatus: SolveStatus;
	traitsKnown: string[];
	hiddenLeft: number;
	alphaTest: string;
	oneHandTest: boolean;
	possible?: any; /* { id: number, trait: string } */
	solveOptions?: SolveOption[];
}

export enum SolveStatus {
	Unsolved,
	Infallible,
	Confirmed,
	Unconfirmed,
	Partial
}

export interface Solve {
	node: number;
	traits: string[];
	crew: string[];	// Symbols of crew who can confirm this solve; empty array if already confirmed
}

export interface Solver {
	id: string;
	nodes: SolverNode[];
	traits: SolverTrait[];
	crew: BossCrew[];
}

export interface SolveOption {
	key: number;
	value?: string[];
	rarity: number;
}

export interface TraitOption {
	key: string | number;
	value?: string;
	text: string;
}

export interface Spotter {
	id: string;
	solves: Solve[];
	attemptedCrew: string[];
	pendingCrew: string[];
	ignoredTraits: string[];
}

export interface NodeMatch {
	index: number;
	combos: string[][];
	traits: string[];
}

export interface PossibleCombo {
	combo: string[];
	crew: string[];
}

export interface TraitRarities {
	[key: string]: number;
}

export interface NodeMatches {
	[key: string]: NodeMatch;
}

export interface Rule {
	compliant: number;
	exceptions: RuleException[];
}

export interface RuleException {
	index: number;
	combo: string[];
}

export interface BossCrew extends PlayerCrew {
	highest_owned_rarity: number;
	only_frozen: boolean;
	only_expiring: boolean;
	nodes: number[];
	nodes_rarity: number;
	node_matches: NodeMatches;
	onehand_rule: Rule;
	alpha_rule: Rule;
}

export interface ViableCombo {
	traits: string[];
	nodes: number[];
}

export interface NodeRarity {
	combos: PossibleCombo[];
	traits: TraitRarities;
}

export interface NodeRarities {
	[key: string]: NodeRarity;
}

export interface Optimizer {
	crew: BossCrew[];
	optimalCombos: ViableCombo[];
	rarities: NodeRarities;
	groups: FilteredGroups;
	prefs: {
		spotter: SpotterPreferences;
		solo: SoloPreferences;
	};
}

export interface FilteredGroup {
	traits: string[];
	score: number;
	crewList: BossCrew[];
	notes: FilterNotes;
}

export interface FilteredGroups {
	[key: string]: FilteredGroup[];
}

export interface RarityStyle {
	background: string;
	color: string;
}

export interface Collaboration {
	bossBattleId: number;	// Same as bossBattle.id
	fleetId: number;
	bossGroup: string;
	difficultyId: number;
	chainIndex: number;
	chain: Chain;
	description: string;
	roomCode: string;
	solves: Solve[];
	trials: CrewTrial[];
};

export interface CrewTrial {
	crewSymbol: string;
	trialType: string;
};
