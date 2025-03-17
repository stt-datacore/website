import { Link } from 'gatsby';
import React from 'react';
import { EquipmentCommon, EquipmentItem } from '../../model/equipment';
import { TranslateMethod } from '../../model/player';
import { CustomFieldDef } from './itemstable';

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

