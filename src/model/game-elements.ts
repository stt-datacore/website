import { CrewMember } from "./crew";
import { MilestoneBuff, Reward } from "./player";

export const POST_BIGBOOK_EPOCH = new Date('2024-12-24T00:00:00Z');

export type Variant = {
  name: string;
  trait_variants: CrewMember[];
};

export type PolestarCombo = {
  count: number;
  alts: { symbol: string; name: string }[];
  polestars: string[];
};

export function categorizeKeystones(data: KeystoneBase[]): [Constellation[], Polestar[]] {
  let cons = [] as Constellation[];
  let pols = [] as Polestar[];

  data.forEach((k) => {
    if (k.type === "keystone") {
      pols.push(k as Polestar);
    }
    else {
      cons.push(k as Constellation);
    }
  });

  return [cons, pols];
}

export interface KeystoneBase {
  id: number;
  symbol: string;
  type: "keystone_crate" | "crew_keystone_crate" | "keystone";
  name: string;
  short_name: string;
  flavor: string;
  icon: Icon;
  imageUrl?: string;
  rarity?: number;
  filter?: PolestarFilter;
  crew_archetype_id?: number;
  // quantity?: number;
}

export interface Constellation extends KeystoneBase {
  type: "keystone_crate" | "crew_keystone_crate";
  keystones: number[];
  // quantity: number;
}

export interface Polestar extends KeystoneBase {
  type: "keystone";
  // quantity: number;
  // loaned: number;
  // crew_count: number;
  filter: PolestarFilter;
  // useful?: number
  // useful_alone?: boolean;
  // scan_odds?: number;
  // crate_count?: number;
  // owned_crate_count?: number;
  // owned_best_odds?: number;
  // owned_total_odds?: number;
}

export interface Icon {
  file: string;
}

export interface PolestarFilter {
  type: "trait" | "rarity" | "skill";
  trait?: string;
  rarity?: number;
  skill?: string;
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
  textSegments?: TextSegment[];
  conditionArray?: FilterCondition[];
}

export interface ConstellationMap {
  name: string;
  flavor: string;
  keystones: Polestar[];
  raritystone: Polestar[];
  skillstones: Polestar[];
};

export interface Collection {
  id: number;
  type_id?: number
  name: string;
  crew?: string[];
  description?: string;
  image?: string;
  milestones?: Milestone[];
}
export interface Milestone {
  goal: number
  buffs: MilestoneBuff[]
  rewards: Reward[]
}

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

// export interface FuseGroup {
//   [key: string]: number[][];
// }

export interface NumericOptions {
  key: number;
  value: number;
  text: string;
}

export interface LockedProspect {
  symbol: string;
  name: string;
  rarity: number;
  level?: number;
  prospect?: boolean;
  imageUrlPortrait?: string;
  max_rarity?: number;
}

export interface InitialOptions {
  search?: string;
  filter?: string;
  column?: string;
  direction?: 'ascending' | 'descending';
  rows?: number;
  page?: number;
}

export interface ISymbol {
  symbol: string;
}

export interface SymbolName extends ISymbol {
  symbol: string;
  name: string;
}

export interface MarkdownRemark {
  frontmatter: {
      name?: string;
      rarity?: number;
      series?: string;
      memory_alpha?: string;
      bigbook_tier?: number;
      events?: number;
      in_portal?: boolean;
      date?: Date;
      obtained?: string;
      mega?: boolean;
      published?: boolean;
  }
}

export interface PortalLogEntry {
    portal_batch_id: number,
    symbol: string,
    date: Date
}

export interface PortalReport {
    name: string;
    date?: Date;
    rarity: number;
}


