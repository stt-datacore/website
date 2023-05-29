import { CrewMember } from "./crew";

export type Variant = { 
	name: string, 
	trait_variants: CrewMember[] 
};

export type PolestarCombo = {
	count: number,
	alts: { symbol: string, name: string }[],
	polestars: string[]
}

export interface Keystone {
    id: number
    symbol: string
    type: string
    name: string
    short_name: string
    flavor: string
    icon: Icon
    rarity?: number
    filter?: Filter
    keystones?: number[]
    crew_archetype_id?: number
  }
  
  export interface Icon {
    file: string
  }
  
  export interface Filter {
    type: string
    trait?: string
    rarity?: number
    skill?: string
  }
  
 export type Constellation = {
    name: string, 
    flavor: string,
    keystones: Keystone[],
    raritystone: Keystone[],
    skillstones: Keystone[]
}

export interface Collection {
  id: number;
  name: string
  crew: string[]
  description: string
  image: string
}
