import { PlayerEquipmentItem } from "./player"


export interface IDemand {
	count: number;
	symbol: string;
	equipment?: EquipmentItem;
	factionOnly: boolean;
	have: number;
	crewSymbols: string[];
  primary?: boolean;
}

export interface ICrewDemandsMeta {
	factionOnlyTotal: number;
	totalChronCost: number;
	craftCost: number;
}

export interface ICrewDemands extends ICrewDemandsMeta {
	demands: IDemand[];
	factionOnlyTotal: number;
	totalChronCost: number;
	craftCost: number;
}

export interface DemandCounts {
	name: string;
	count: number;
}


export interface EquipmentItem extends PlayerEquipmentItem {
  symbol: string
  type: number
  name: string
  short_name?: string
  name_english?: string;
  flavor: string
  flavorContext?: JSX.Element;
  rarity: number
  imageUrl: string
  item_sources: EquipmentItemSource[]
  bonuses?: EquipmentBonuses
  duration?: number;
  traits_requirement_operator?: string; // "and" | "or" | "not" | "xor";
  traits_requirement?: string[];
  max_rarity_requirement?: number;

  quantity?: number;
  needed?: number;

  recipe?: EquipmentRecipe
  demands?: IDemand[];

  demandCrew?: string[];
  needed_by?: string[];

  factionOnly?: boolean;
  empty?: boolean;
  isReward?: boolean;
  kwipment?: boolean;
  kwipment_id?: number | string;
}

export interface EquipmentItemSource {
  type: number
  name: string
  energy_quotient: number
  chance_grade: number
  dispute?: number
  mastery?: number
  mission_symbol?: string
  cost?: number
  avg_cost?: number
  cadet_mission?: string;
  cadet_symbol?: string;
  map_position?: string;
}

export interface EquipmentRecipe {
  incomplete: boolean
  craftCost: number
  list: EquipmentIngredient[]
}

export interface EquipmentIngredient {
  count: number
  factionOnly: boolean
  symbol: string
}

export interface EquipmentBonuses {
    [key: string]: number;
}


