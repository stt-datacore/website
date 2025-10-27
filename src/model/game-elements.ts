import { CrewMember } from "./crew";

export const POST_BIGBOOK_EPOCH = new Date('2024-12-24T00:00:00Z');

export type Variant = {
  name: string;
  trait_variants: CrewMember[];
};

export interface Icon {
  file: string;
  atlas_info?: string
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

export interface RarityOptions {
  key: string;
  value?: string | null | undefined;
  text: string;
  content?: string | JSX.Element;
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


