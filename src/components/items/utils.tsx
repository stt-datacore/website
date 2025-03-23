import { Link } from 'gatsby';
import React from 'react';
import { EquipmentCommon, EquipmentItem } from '../../model/equipment';
import { PlayerEquipmentItem, TranslateMethod } from '../../model/player';
import { CrewMember } from '../../model/crew';
import { ILocalizedData } from '../../context/localizedcontext';
import { getItemBonuses } from '../../utils/itemutils';
import CONFIG from '../CONFIG';
import { SemanticWIDTHS } from 'semantic-ui-react';

export interface CustomFieldDef {
	field: string;
	text: string;
	format?: (value: any) => string;
	width?: SemanticWIDTHS;
	reverse?: boolean
}


export interface ItemsTableProps {
	/** List of equipment items */
	data?: EquipmentCommon[] | EquipmentItem[];

	/** Optional alternative navigation method */
	navigate?: (symbol: string) => void;

	/** Hide features for owned items */
	hideOwnedInfo?: boolean;

	/** Hide search bar */
	hideSearch?: boolean;

	/** Add needed but unowned items to list */
	addNeeded?: boolean;

	/** Page name */
	pageName?: string;

	/** Run the logic but do not render */
	noRender?: boolean;

	/** Do not run the worker */
	noWorker?: boolean;

	/** Put flavor in its own column. */
	flavor?: boolean;

	/** Put buffs in its own column. */
	buffs?: boolean;

	/** Crew mode active */
	crewMode?: boolean;

	/** Include only these item types */
	types?: number[];

	/** Item hover target group */
	itemTargetGroup?: string;

	/** Crew hover target group */
	crewTargetGroup?: string;

	/** Custom fields */
	customFields?: CustomFieldDef[];

	/** Init rows */
	init_rows?: number;
};

export interface ItemSearchOpts {
    filterText?: string;
    itemType?: number[];
    rarity?: number[];
}

export type CrewType = "all" | "owned" | "quippable" | "frozen";

export interface CrewKwipTrial {
    symbol: string;
    kwipment: number[];
    kwipment_expiration: number[];
}

export type OwnedType = "all" | "owned" | "buildable" | "both";


export function printRequiredTraits(
    item: EquipmentCommon,
    trait_names: { [key: string]: string },
    t?: TranslateMethod
): JSX.Element {
    if (item.kwipment) {
        if (item.traits_requirement?.length) {
            let req = item.traits_requirement!;
            if (item.traits_requirement_operator === "and") {
                return (
                    <Link
                        to={`/?search=trait:${req.reduce((p, n) =>
                            p ? `${p},${n}` : n
                        )}&filter=Whole%20word`}
                    >
                        {req
                            .map((t) => trait_names[t])
                            .join(
                                ` ${t
                                    ? t("global." + item.traits_requirement_operator)
                                    : item.traits_requirement_operator
                                } `
                            )}
                    </Link>
                );
            } else {
                return (
                    <>
                        {req
                            .map((t) => (
                                <Link to={`/?search=trait:${t}&filter=Whole%20word`}>
                                    {trait_names[t]}
                                </Link>
                            ))
                            .reduce((p, n) =>
                                p ? (
                                    <>
                                        {p}{" "}
                                        {t
                                            ? t("global." + item.traits_requirement_operator)
                                            : item.traits_requirement_operator}{" "}
                                        {n}
                                    </>
                                ) : (
                                    n
                                )
                            )}
                    </>
                );
            }
        }
    }

    return <></>;
}

export interface FlavorConfig {
    crew: CrewMember[];
    localized: ILocalizedData;
    ownedItems: boolean;
}

export function createFlavor(item: EquipmentItem | EquipmentCommon | PlayerEquipmentItem, config: FlavorConfig) {
    const { localized, crew: inputCrew } = config;
    const { t, tfmt } = localized;
    let output = [] as JSX.Element[];

    let flavor = item.flavor ?? "";
    if (flavor.startsWith("Equippable by:")) {
        let crew = flavor
            .replace("Equippable by:", "")
            .split(",")
            .map((s) => inputCrew.find((c) => c.name === s.trim() || c.symbol === s.trim()))
            .filter((c) => !!c) as CrewMember[];

        if (crew?.length) {
            if (crew.length <= 5) {
                output.push(
                    <div>
                        {tfmt("items.equippable_by", {
                            crew: crew
                                .map((crew) => (
                                    <Link to={`/crew/${crew.symbol}`}>{crew.name}</Link>
                                ))
                                .reduce((p, n) => (
                                    <>
                                        {p}, {n}
                                    </>
                                )),
                        })}
                    </div>
                );
            }
            else {
                output.push(
                    <div>
                        {tfmt("items.equippable_by_n_crew", {
                            n: crew.length.toString()
                        })}
                    </div>
                );
            }
        }
    }
    if (output.length || config.ownedItems) flavor = '';

    if (
        "kwipment" in item &&
        item.kwipment &&
        (item.traits_requirement?.length || item.max_rarity_requirement)
    ) {
        let found: CrewMember[] | null = null;

        const bonus = getItemBonuses(item as EquipmentItem);
        const traits = localized.TRAIT_NAMES;

        found = inputCrew.filter((f) => {
            let mrq = item.max_rarity_requirement ?? f.max_rarity;
            let rr = mrq >= f.max_rarity;

            if (item.traits_requirement?.length) {
                if (item.traits_requirement_operator === "and") {
                    rr &&= item.traits_requirement?.every(
                        (t) => f.traits.includes(t) || f.traits_hidden.includes(t)
                    );
                } else {
                    rr &&= item.traits_requirement?.some(
                        (t) => f.traits.includes(t) || f.traits_hidden.includes(t)
                    );
                }
            }
            rr &&= Object.keys(bonus.bonuses).some(
                (skill) => skill in f.base_skills
            );

            return rr;
        });

        if (found?.length) {
            flavor ??= "";

            if (flavor?.length) {
                flavor += "\n";
            }
            if (found.length > 5) {
                if (item.traits_requirement?.length) {
                    if (item.max_rarity_requirement) {
                        output.push(
                            <div>
                                {tfmt("items.equippable_by_rarity_traits", {
                                    rarity: (
                                        <span
                                            style={{
                                                color:
                                                    CONFIG.RARITIES[item.max_rarity_requirement].color,
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {CONFIG.RARITIES[item.max_rarity_requirement].name}
                                        </span>
                                    ),
                                    traits: printRequiredTraits(item, traits, t),
                                })}
                            </div>
                        );
                        flavor += t("items.equippable_by_rarity_traits", {
                            rarity: CONFIG.RARITIES[item.max_rarity_requirement].name,
                            traits: `${printRequiredTraits(item, traits, t)}`,
                        });
                    } else {
                        output.push(
                            <>
                                {tfmt("items.equippable_by_traits", {
                                    traits: printRequiredTraits(item, traits, t),
                                })}
                            </>
                        );
                        flavor += t("items.equippable_by_traits", {
                            traits: `${printRequiredTraits(item, traits)}`,
                        });
                    }
                } else if (item.max_rarity_requirement) {
                    output.push(
                        <div>
                            {tfmt("items.equippable_by_rarity", {
                                rarity: (
                                    <span
                                        style={{
                                            color:
                                                CONFIG.RARITIES[item.max_rarity_requirement].color,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {CONFIG.RARITIES[item.max_rarity_requirement].name}
                                    </span>
                                ),
                            })}
                        </div>
                    );
                    flavor += t("items.equippable_by_rarity", {
                        rarity: CONFIG.RARITIES[item.max_rarity_requirement].name,
                    });
                } else {
                    output.push(
                        <div>{t("items.equippable_by", { crew: found.length.toString() })}</div>
                    );
                    flavor += t("items.equippable_by", { crew: found.length.toString() });
                }
            } else {
                output.push(
                    <div>
                        {tfmt("items.equippable_by", {
                            crew: found
                                .map((crew) => (
                                    <Link to={`/crew/${crew.symbol}`}>{crew.name}</Link>
                                ))
                                .reduce((p, n) => (
                                    <>
                                        {p}, {n}
                                    </>
                                )),
                        })}
                    </div>
                );

                flavor += t("items.equippable_by", {
                    crew: [...found.map((f) => f.symbol)].join(", "),
                });
            }
        }
    }
    else if (flavor) {
        output.push(<>{flavor}</>)
    }
    return output;
}