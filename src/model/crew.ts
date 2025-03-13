import { ShipBonus, ShipAction as ShipAction } from "./ship";
import { Icon } from "./game-elements";
import { EquipmentItem } from "./equipment";

export interface CrossFuseTarget {
    symbol: string;
    name?: string;
}

export interface CrossFuseInfo {
    sources: string[];
    result: string;
}

export interface MarkdownInfo {
    author: string;
    modified: Date;
}
export interface SkillQuipmentScores {
    command_skill: number;
    security_skill: number;
    diplomacy_skill: number;
    engineering_skill: number;
    medicine_skill: number;
    science_skill: number;
    trait_limited: number;
};

export interface QuipSkill extends Skill {
    reference?: boolean;
}

export interface QuippedSkills extends BaseSkills {
    security_skill?: QuipSkill;
    command_skill?: QuipSkill;
    diplomacy_skill?: QuipSkill;
    medicine_skill?: QuipSkill;
    science_skill?: QuipSkill;
    engineering_skill?: QuipSkill;

}

export interface QuippedPower {
    skill_quipment: { [key: string]: EquipmentItem[] };
    skills_hash: QuippedSkills;
    aggregate_power: number;
    aggregate_by_skill: { [key: string]: number };
}

export interface QuipmentScores {
    /** Used internally. Not part of source data.  */
    quipment_score?: number;
    quipment_grade?: number;
    quipment_scores?: SkillQuipmentScores;
    quipment_grades?: SkillQuipmentScores;
    voyage_quotient?: number;
    voyage_quotients?: SkillQuipmentScores;
    best_quipment?: QuippedPower;
    best_quipment_1_2?: QuippedPower;
    best_quipment_2_3?: QuippedPower;
    best_quipment_1_3?: QuippedPower;
    best_quipment_3?: QuippedPower;
    best_quipment_top?: QuippedPower;
}

export interface CapAchiever {
    name: string
    date: number
}

/**
 * The is the crew roster model from crew.json
 *
 * This is the model for the master list of all crew in STT.
 * PlayerCrew derives from this and CompactCrew.
 */
export interface CrewMember extends QuipmentScores {
    id?: number;
    symbol: string;
    name: string;
	name_english?: string;
    short_name: string;
	short_name_english?: string;
    flavor: string;
	flavor_english?: string;
    archetype_id: number;
    max_rarity: number;
    equipment_slots: EquipmentSlot[];
    voice_over?: string;
    traits: string[];
    traits_hidden: string[];
    base_skills: BaseSkills;
    ship_battle: ShipBonus;
    action: ShipAction;
    cross_fuse_targets: CrossFuseTarget | [];
    cross_fuse_sources?: string[];
    skill_data: SkillData[];
    intermediate_skill_data: IntermediateSkillData[];
    is_craftable: boolean;
    imageUrlPortrait: string;
    imageUrlFullBody: string;
    series?: string;
    traits_named: string[];
    collections: string[];
    collection_ids: string[];
    nicknames: Nickname[];
    cab_ov: string;
    cab_ov_rank: number;
    cab_ov_grade: string;
    totalChronCost: number;
    factionOnlyTotal: number;
    craftCost: number;
    ranks: Ranks;
    bigbook_tier: number;
    events: number;
    in_portal: boolean;
    date_added: Date;
    obtained: string;
    markdownContent: string;
    markdownInfo: MarkdownInfo;
    unique_polestar_combos?: string[][];
    constellation?: CrewConstellation;
    kwipment: number[][] | number[];
    kwipment_expiration: number[][] | number[];
    q_bits: number;
    skill_order: string[];
    /** Used internally, not part of incoming data */
    pickerId?: number;
    pairs?: Skill[][];

    price?: number;
    sell_count?: number;
    post_bigbook_epoch: boolean;
    cap_achiever?: CapAchiever;
    preview?: boolean;
    published?: boolean;
}

export interface EquipmentSlot {
    level: number;
    symbol: string;
    imageUrl?: string;
}

export type PlayerSkill =
    | "command_skill"
    | "diplomacy_skill"
    | "medicine_skill"
    | "engineering_skill"
    | "science_skill"
    | "security_skill";

export enum BaseSkillFields {
    SecuritySkill = "security_skill",
    CommandSkill = "command_skill",
    DiplomacySkill = "diplomacy_skill",
    MedicineSkill = "medicine_skill",
    ScienceSkill = "science_skill",
    EngineeringSkill = "engineering_skill",
}

export interface BaseSkills {
    security_skill?: Skill;
    command_skill?: Skill;
    diplomacy_skill?: Skill;
    medicine_skill?: Skill;
    science_skill?: Skill;
    engineering_skill?: Skill;
}

export function getSkillsRanked(skills: BaseSkills) {
    let sn = [] as string[];
    let mskills = Object.keys(skills)
        .filter((skill) => skills[skill] !== undefined && skills[skill].core > 0)
        .map((skill) => {
            skills[skill].skill = skill;
            return skills[skill] as Skill;
        });

    mskills.sort((a, b) => {
        let r = b.core - a.core;
        if (r) return r;
        r = b.range_max - a.range_max;
        if (r) return r;
        r = b.range_min - a.range_min;
        return r;
    });
    return mskills;
}

export interface Skill {
    core: number;
    range_min: number;
    range_max: number;
    skill: PlayerSkill | string;
}

export interface ComputedSkill {
    core: number;
    min: number;
    max: number;
    skill: PlayerSkill | string;
}

export interface SkillsSummary {
    key: string;
    skills: string[];
    total: number;
    owned: number;
    ownedPct: number;
    average: number;
    best: {
        score: number;
        name: string;
    };
    tenAverage: number;
    maxPct: number;
}

export interface SkillData {
    rarity: number;
    base_skills: BaseSkills;
}

export interface IntermediateSkillData extends SkillData {
    level: number;
    action: ShipAction;
    ship_battle: ShipBonus;
}

export interface Nickname {
    actualName: string;
    cleverThing: string;
    creator?: string;
}

export interface ShipScores {
    overall: number,
    arena: number,
    fbb: number,
    kind: 'offense' | 'defense' | 'ship',
    overall_rank: number,
    arena_rank: number,
    fbb_rank: number,
    divisions: {
        fbb: {
            1?: number,
            2?: number,
            3?: number,
            4?: number,
            5?: number,
            6?: number
        },
        arena: {
            1?: number,
            2?: number,
            3?: number
        }
    }
}

export interface QuipmentDetails {
    qpower: number,
    bpower: number,
    gpower: number,
    vpower: number,
    avg: number,
    qprice: number,
    bprice: number,
    vprice: number,
    gprice: number
};

export interface RankScoring {
    am_seating: number;
    collections: number;
    gauntlet: number;
    gauntlet_plus: number;
    gauntlet_plus_rank: number;
    main_cast: number;
    rarity_overall_rank: number;
    overall_grade: string;
    overall_rank: number;
    overall: number;
    tuvix: number;
    potential_cols: number;
    quipment: number;
    rarity_overall: number;
    ship: ShipScores;
    shuttle: number;
    shuttle_plus: number;
    shuttle_plus_rank: number;
    skill_rarity: number;
    tertiary_rarity: number;
    trait: number;
    velocity: number;
    crit: number;
    voyage: number;
    voyage_plus: number;
    voyage_plus_rank: number;
    skill_positions: number;
    variant: number;
    quipment_details: QuipmentDetails;
}

export interface Ranks {
    voyRank: number;
    gauntletRank: number;
    shuttleRank: number;
    chronCostRank: number;
    traitRank: number;

    ship_rank: number;
    skill_rarity_rank: number;
    tertiary_rarity_rank: number;
    crit_rank: number;
    velocity_rank: number;
    potential_cols_rank: number;
    main_cast_rank: number;
    am_seating_rank: number;
    collections_rank: number;
    quipment_rank: number;
    skill_positions_rank: number;
    variant_rank: number;

    scores: RankScoring;
    B_SEC?: number;
    A_SEC?: number;
    V_CMD_SEC?: number;
    G_CMD_SEC?: number;
    V_SCI_SEC?: number;
    G_SCI_SEC?: number;
    V_SEC_ENG?: number;
    G_SEC_ENG?: number;
    V_SEC_DIP?: number;
    G_SEC_DIP?: number;
    V_SEC_MED?: number;
    G_SEC_MED?: number;
    B_CMD?: number;
    A_CMD?: number;
    V_CMD_SCI?: number;
    G_CMD_SCI?: number;
    V_CMD_ENG?: number;
    G_CMD_ENG?: number;
    V_CMD_DIP?: number;
    G_CMD_DIP?: number;
    V_CMD_MED?: number;
    G_CMD_MED?: number;
    B_DIP?: number;
    A_DIP?: number;
    voyTriplet?: VoyTriplet;
    V_SCI_DIP?: number;
    G_SCI_DIP?: number;
    V_ENG_DIP?: number;
    G_ENG_DIP?: number;
    V_DIP_MED?: number;
    G_DIP_MED?: number;
    B_MED?: number;
    A_MED?: number;
    V_SCI_MED?: number;
    G_SCI_MED?: number;
    V_ENG_MED?: number;
    G_ENG_MED?: number;
    B_SCI?: number;
    A_SCI?: number;
    V_SCI_ENG?: number;
    G_SCI_ENG?: number;
    B_ENG?: number;
    A_ENG?: number;
}

export interface VoyTriplet {
    name: string;
    rank: number;
}

export interface CrewConstellation {
    id: number;
    symbol: string;
    name: string;
    short_name: string;
    flavor: string;
    icon: Icon;
    keystones: number[];
    type: string;
    crew_archetype_id: number;
}

export interface RewardsGridNeed {
    symbol: string;
    quantity: number;
    owned?: number;
}
