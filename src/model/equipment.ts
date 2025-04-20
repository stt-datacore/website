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


export interface EquipmentCommon extends PlayerEquipmentItem {
  symbol: string
  type: number
  name: string
  name_english?: string;
  flavor: string
  flavorContext?: JSX.Element;
  rarity: number
  short_name?: string
  imageUrl: string
  bonuses?: EquipmentBonuses
  quantity?: number;
  needed?: number;
  factionOnly?: boolean;
  demandCrew?: string[];

  duration?: number;
  max_rarity_requirement?: number;
  traits_requirement_operator?: string; // "and" | "or" | "not" | "xor";
  traits_requirement?: string[];
  kwipment?: boolean;
  kwipment_id?: number | string;
}

export interface EquipmentItem extends EquipmentCommon {
  symbol: string
  type: number
  name: string
  name_english?: string;
  flavor: string
  flavorContext?: JSX.Element;
  rarity: number
  short_name?: string
  imageUrl: string
  bonuses?: EquipmentBonuses
  quantity?: number;
  needed?: number;
  needed_by?: string[];
  factionOnly?: boolean;

  item_sources: EquipmentItemSource[]
  recipe?: EquipmentRecipe
  demands?: IDemand[];

  empty?: boolean;
  isReward?: boolean;
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


