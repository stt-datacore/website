import { Icon, RetrievalOption } from "./game-elements";


export type PolestarCombo = {
  count: number;
  alts: { symbol: string; name: string; }[];
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
}

export interface Constellation extends KeystoneBase {
  type: "keystone_crate" | "crew_keystone_crate";
  keystones: number[];
}

export interface Polestar extends KeystoneBase {
  type: "keystone";
  // quantity: number;
  // loaned: number;
  // crew_count: number;
  filter: PolestarFilter;
}

export interface PolestarFilter {
  type: "trait" | "rarity" | "skill";
  trait?: string;
  rarity?: number;
  skill?: string;
}


export interface ConstellationMap {
  name: string;
  flavor: string;
  keystones: Polestar[];
  raritystone: Polestar[];
  skillstones: Polestar[];
}
;export interface RetrievalOptions {
  initialized: boolean;
  list: RetrievalOption[];
}

