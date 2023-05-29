import { CrewMember } from "./crew";

export type Variant = {
  name: string;
  trait_variants: CrewMember[];
};

export type PolestarCombo = {
  count: number;
  alts: { symbol: string; name: string }[];
  polestars: string[];
};

export interface KeystoneCrate {
  id: number;
  symbol: string;
  type: string;
  name: string;
  short_name: string;
  flavor: string;
  icon: Icon;
  rarity?: number;
  filter?: Filter;
  keystones?: number[];
  crew_archetype_id?: number;
  quantity?: number;
}

export interface Polestar extends KeystoneCrate {
  quantity: number;
  loaned: number;
  crew_count: number;
  filter?: Filter;
  useful?: number
  useful_alone?: boolean;
  scan_odds?: number;
  crate_count?: number;
  owned_crate_count?: number;
  owned_best_odds?: number;
  owned_total_odds?: number;
}

export interface Icon {
  file: string;
}

export interface Negatable { 
  negated: boolean;
}

export interface FilterCondition extends Negatable {
  keyword: string;
  value?: any;
}

export interface TextSegment extends Negatable {
  text: string;
}

export interface Filter {
  type: string;
  trait?: string;
  rarity?: number;
  skill?: string;
  textSegments?: TextSegment[];
  conditionArray?: FilterCondition[];
}

export interface Constellation {
  name: string;
  flavor: string;
  keystones: KeystoneCrate[];
  raritystone: KeystoneCrate[];
  skillstones: KeystoneCrate[];
};

export interface Collection {
  id: number;
  name: string;
  crew: string[];
  description: string;
  image: string;
}

export const rarityLabels = [
  "Common",
  "Uncommon",
  "Rare",
  "Super Rare",
  "Legendary",
];

export interface RarityOptions {
  key: string;
  value?: string | null | undefined;
  text: string;
  content?: string | JSX.Element;
}


export interface RetrievalOptions {
  initialized: boolean;
  list: RetrievalOption[];
}

export interface AvatarIcon {
  avatar: boolean;
  src: string;
}

export interface RetrievalOption {
  key: string | 0; 
  value: string | 0;
  text: string;
  image?: AvatarIcon; // image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` }}];
}

export interface FuseGroup {
  [key: string]: number[][];
}

export interface FuseOptions {
  key: number;
  value: number;
  text: string;
}