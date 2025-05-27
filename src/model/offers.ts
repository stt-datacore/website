import { CrewMember } from "./crew";
import { Icon } from "./game-elements";
import { Reward } from "./player";

export interface OfferCrew {
    name: string;
    drop_info: DropInfo[];
    crew: CrewMember[];
    seconds_remain?: number;
    description: string;
}

export interface DropInfo {
    count: number;
    cost: number;
    currency: string;
    drop_rates: DropRate[];
}

export interface DropRate {
    type: string;
    rarity: number;
    rate: number;
}
export interface Offer {
    format: string;
    primary_select_mode: string;
    secondary_select_mode: string;
    event_owner?: string;
    primary_click_text: string;
    primary_click_action: OfferClickAction;
    primary_content: OfferContent[];
    secondary_click_text?: string;
    secondary_click_action?: OfferClickAction;
    secondary_content?: OfferContent[];
}

export interface OfferClickAction {
    action: string;
    target: any;
}

export interface OfferContent {
    symbol: string;
    type: string;
    locked: boolean;
    lock_prereq: any;
    count: number;
    cost?: Cost;
    image: Icon;
    image_2?: Icon;
    image_3?: Icon;
    title: string;
    subtitle: any;
    title_2: any;
    subtitle_2: any;
    info?: string;
    info_text?: string;
    bonus_text: string;
    bonus_text_2?: string;
    bonus_text_3: any;
    bonus_text_4: any;
    offer: Offer;
}

export interface Cost {
    currency: string;
    amount: number;
}

export interface Offer {
    currency_bundle?: string;
    cost?: Cost;
    obtain: Obtain[];
    purchase_avail: number;
    game_item?: Reward;
    seconds_remain: number;
}

export interface Obtain {
    ent: string;
    count: string;
    spec: string;
}

