import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import CONFIG from "../CONFIG";
import { CompletionState, PlayerCrew, PlayerEquipmentItem } from "../../model/player";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import { mergeItems } from "../../utils/itemutils";
import { ItemTarget } from "../hovering/itemhoverstat";
import { CrewTarget } from "../hovering/crewhoverstat";
import { Schematics, Ship } from "../../model/ship";
import { mergeShips } from "../../utils/shiputils";
import { ShipTarget } from "../hovering/shiphoverstat";
import { navigate } from "gatsby";
import { CrewMember } from "../../model/crew";

export type AvatarViewMode = 'crew' | 'item' | 'ship';
export type AvatarCrewBackground = 'normal' | 'rich';

export interface AvatarViewProps {
    altItems?: (EquipmentItem | EquipmentCommon)[];
    altCrew?: (CrewMember | PlayerCrew)[];
    altShips?: Schematics[];
    /** Item type number or 'crew', 'item', or 'ship' */
    mode: AvatarViewMode | number;
    /** The symbol of the item to display */
    symbol?: string;
    /** The size of the item */
    size: number;
    /** The item id or archetype_id */
    id?: number;
    /** Additional styling */
    style?: React.CSSProperties;
    /** Hide the rarity bar */
    hideRarity?: boolean;
    /** Hover target group */
    targetGroup?: string;
    /** Ignore player data and render from core, only */
    ignorePlayer?: boolean;
    /** Reward quantity (to search for a reward item) */
    quantity?: number;
    /** Show item at max rarity regardless of owned rarity */
    showMaxRarity?: boolean;
    /** Crew background style (normal or rich) */
	crewBackground?: AvatarCrewBackground;
    /** Substitute kwipment to consider for the rich crew background */
    substitute_kwipment?: number[] | number[][];
    /** Image source. If empty, will attempt to auto-resolve */
    src?: string;
    /** Full or partial item to display */
    item?: BasicItem;
    /** Specify that the input item is a partial item */
    partialItem?: boolean;
    /** For ships, use the schematics icon as opposed to the model icon */
    useSchematicsIcon?: boolean;

    /**
     * True to not process the input item, and to instruct the hover component to do the same.
     * This property only applies to the hover component if partialItem is set to true.
     * */
    passDirect?: boolean;

    /**
     * True to not process the input item.
     * This property does not apply to the hover component.
     * (Default is true)
     * */
    useDirect?: boolean;

    /**
     * Internal navigation destination or true to auto-resolve
     *
     * This property is ignored if onClick is specified.
     * */
    link?: string | boolean;

    /** Function to execute when avatar is clicked */
    onClick?: (item: BasicItem) => void;

    /** True to make rounded avatars */
    round?: boolean;
}

export interface BasicItem {
    id?: number;
    archetype_id?: number;
    symbol: string;
    max_rarity?: number;
    rarity?: number;
}

export const AvatarView = (props: AvatarViewProps) => {
    const shipRichClr = '#091220';
    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const items = props.altItems ?? globalContext.core.items;
    const crew = props.altCrew ?? globalContext.core.crew;
    const ship_schematics = props.altShips ?? globalContext.core.ship_schematics;
    const { passDirect, substitute_kwipment, partialItem, style, quantity, showMaxRarity, id, size, ignorePlayer, hideRarity, targetGroup } = props;
    const symbol = props.symbol || props.item?.symbol;
    const crewBackground = props.crewBackground ?? 'normal';

    const useDirect = props.useDirect || false //?? !!props.item;
    const mode = props.mode === 1 ? 'crew' : props.mode === 8 ? 'ship' : typeof props.mode === 'string' ? props.mode : 'item';

    if (id === undefined && !symbol) {
        throw new Error("Avatar View requires either id or symbol");
    }

    let link = props.link && typeof props.link === 'string' ? props.link : '';

    let maxRarity = props?.item?.max_rarity ?? props.item?.rarity ?? 0;
    let borderWidth = Math.ceil(size / 34);
    let starSize = Math.floor(size / 6);
    let bottomStar = Math.floor(size / 23);
    let borderRadius = props.round ? Math.floor(size / 2) : Math.floor(size / 7);
    let star_reward = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward.png`;
    let star_reward_inactive = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward_inactive.png`;
    let item = undefined as EquipmentItem | undefined;
    let ship = undefined as Ship | undefined;
    let HoverTarget = undefined as any | undefined;
    let gen_item = (partialItem || (!props.passDirect && !props.useDirect)) ? undefined : props.item;
    let borderColor = CONFIG.RARITIES[maxRarity ?? 0].color;

    const imgStyle = {
        borderStyle: 'solid',
        borderRadius: borderRadius + 'px',
        borderWidth: borderWidth + 'px',
        borderColor: borderColor,
        width: size - 2 * borderWidth + 'px',
        height: size - 2 * borderWidth + 'px'
    } as React.CSSProperties;

    let src = props.src;
    let rarity = [] as JSX.Element[];

    if (mode === 'crew') {
        gen_item = prepareCrew(gen_item);
    }
    else if (mode === 'item') {
        gen_item = prepareItem(gen_item);
    }
    else if (mode === 'ship') {
        gen_item = prepareShip(gen_item);
    }

    if (partialItem && props.item) {
        gen_item = { ... gen_item ?? {}, ... props.item };
    }

    if (!gen_item) return <></>

    maxRarity = gen_item?.max_rarity ?? gen_item?.rarity ?? 0;
    borderColor = CONFIG.RARITIES[maxRarity].color;

    const divStyle = {
        cursor: props.link || props.onClick ? 'pointer' : undefined,
        ... (style ?? {}),
        position: 'relative',
        display: 'flex',
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: size + 'px',
        height: size + 'px',
    } as React.CSSProperties;

    const starStyle = {
        position: 'absolute',
        width: size + 'px',
        bottom: bottomStar + 'px',
        left: '50%',
        transform: 'translate(-50%, 0)',
        textAlign: 'center'
    } as React.CSSProperties;

    if (!hideRarity) {
        if (showMaxRarity || mode !== 'crew') {
            for (let i = 0; i < gen_item.max_rarity!; i++) {
                rarity.push(<img key={i} src={star_reward} style={{ width: starSize + 'px' }} />);
            }
        }
        else {
            for (let i = 0; i < gen_item.rarity!; i++) {
                rarity.push(<img key={i} src={star_reward} style={{ width: starSize + 'px' }} />);
            }
            for (let i = gen_item.rarity!; i < gen_item.max_rarity!; i++) {
                rarity.push(<img key={i} src={star_reward_inactive} style={{ width: starSize + 'px' }} />);
            }
        }
    }

    if (targetGroup && HoverTarget) {
        return (
            <div style={divStyle} onClick={() => props.onClick ? props.onClick(gen_item) : (link ? navigate(link) : undefined)}>
                <HoverTarget
                    passDirect={passDirect}
                    inputItem={gen_item as PlayerCrew}
                    targetGroup={targetGroup}
                    >
                    <img
                        src={src}
                        style={imgStyle}
                    />
                </HoverTarget>
                {!hideRarity && (
                    <div
                        style={starStyle}>
                        {rarity}
                    </div>
                )}
            </div>
        );
    }
    else {
        return (
            <div style={divStyle} onClick={() => props.onClick ? props.onClick(gen_item) : (link ? navigate(link) : undefined)}>
                <img
                    src={src}
                    style={imgStyle}
                />
                {!hideRarity && (
                    <div
                        style={starStyle}>
                        {rarity}
                    </div>
                )}
            </div>
        );
    }

    function prepareCrew(gen_item?: BasicItem) {
        if ((!passDirect && !useDirect) || !gen_item || partialItem) {
            if (!ignorePlayer && !!playerData && !gen_item) {
                gen_item = playerData.player.character.crew.find(f => f.symbol === symbol || (id !== undefined && f.id?.toString() === id?.toString()) || (id !== undefined && f.archetype_id?.toString() === id?.toString()));
            }
            if (!gen_item) {
                gen_item = crew.find(f => id ? f.archetype_id === id : f.symbol === symbol) as BasicItem | undefined;
                if (gen_item) {
                    gen_item = { ...gen_item };
                    gen_item.rarity = showMaxRarity ? gen_item.max_rarity : 0;
                }
            }
        }
        if (gen_item) {
            HoverTarget = CrewTarget;
            const crew = gen_item as PlayerCrew;
            if (!crew.rarity && !!crew.highest_owned_rarity) crew.rarity = crew.highest_owned_rarity!;
            if (!src) src= `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`;
            if (!playerData) {
                crew.immortal = CompletionState.DisplayAsImmortalUnowned;
                crew.rarity = crew.max_rarity;
            }
            if ((showMaxRarity || crew.immortal) && crewBackground === 'rich') {
                let kwip = substitute_kwipment ?? crew.kwipment;
                if (kwip?.length === 4 && kwip?.every((qs) => typeof qs === 'number' ? !!qs : !!qs[1])) {
                    imgStyle.backgroundImage = `url(${process.env.GATSBY_ASSETS_URL}collection_vault_vault_item_bg_postimmortalized_256.png)`;
                }
                else {
                    imgStyle.backgroundImage = `url(${process.env.GATSBY_ASSETS_URL}collection_vault_vault_item_bg_immortalized_256.png)`;
                }
                imgStyle.backgroundSize = (size) + "px";
                imgStyle.backgroundRepeat = "no-repeat";
                imgStyle.backgroundClip = 'border-box';
            }
            if (!link && props.link === true) {
                link = `/crew/${crew.symbol}`;
            }
        }
        return gen_item;
    }

    function prepareItem(gen_item?: BasicItem) {
        if ((!passDirect && !useDirect) || !gen_item || partialItem) {
            if (!ignorePlayer && !!playerData && !gen_item) {
                gen_item = playerData.player.character.items.find(f => f.symbol === symbol || (id !== undefined && f.archetype_id?.toString() === id?.toString())) as BasicItem | undefined;
            }
            if (!gen_item) {
                gen_item = items.find(f => f.symbol === symbol || (id !== undefined && f.archetype_id?.toString() === id?.toString())) as BasicItem | undefined;
                if (gen_item) {
                    gen_item = { ...gen_item };
                    gen_item.rarity ??= 0;
                    gen_item.max_rarity = gen_item.rarity;
                }
            }
            else {
                gen_item = { ...gen_item };
                gen_item.max_rarity = gen_item.rarity;
            }
        }
        if (gen_item) {
            HoverTarget = ItemTarget;
            let pitem = playerData ? gen_item as any as PlayerEquipmentItem : undefined;
            let citem = (playerData ? items.find(item => item.symbol === symbol && item.quantity === quantity && (item as EquipmentItem).isReward) : gen_item) as EquipmentItem | undefined;

            if (!citem) citem = items.find(item => item.symbol === symbol) as EquipmentItem | undefined;

            if (pitem && citem && !citem.isReward) {
                item = mergeItems([pitem], [citem])[0] as EquipmentItem;
            }
            else if (citem) {
                item = { ...citem } as EquipmentItem;
            }
            else if (pitem) {
                item = { ... pitem } as EquipmentItem;
            }
            if (item && citem) {
                item.demandCrew = citem.demandCrew;
                if (!src) src = `${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`;
            }
            if (item?.symbol && globalContext.localized.ITEM_ARCHETYPES[item.symbol]) {
                item = { ...item, ... globalContext.localized.ITEM_ARCHETYPES[item.symbol] };
            }

            if (item && gen_item.rarity) item.rarity = gen_item.rarity;
            if (item && !src) src = `${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`;
            gen_item = item;
            if (gen_item && !gen_item.max_rarity) {
                gen_item.max_rarity = gen_item.rarity;
            }
            if (!link && props.link === true && item) {
                link = `/item_info/?symbol=${item.symbol}`;
            }
        }
        return gen_item;
    }

    function prepareShip(gen_item?: BasicItem) {
        if ((!passDirect && !useDirect) || !gen_item || partialItem) {
            if (!ignorePlayer && !!playerData && !gen_item) {
                gen_item = playerData.player.character.ships.find(f => f.symbol === symbol?.replace("_schematic", "") || (id !== undefined && f.archetype_id?.toString() === id?.toString())) as BasicItem | undefined;
            }
            if (!gen_item) {
                gen_item = ship_schematics.find(f => f.ship.symbol === symbol?.replace("_schematic", "") || (id !== undefined && f.ship.archetype_id?.toString() === id?.toString()))?.ship as BasicItem | undefined;
                if (gen_item) {
                    gen_item = { ...gen_item };
                    gen_item.max_rarity = gen_item.rarity;
                }
            }
            else {
                gen_item = { ...gen_item };
                gen_item.max_rarity = gen_item.rarity;
            }
        }
        if (gen_item) {
            HoverTarget = ShipTarget;
            let pship = playerData ? gen_item as any as Ship : undefined;
            let cship = ship_schematics.find(f => f.ship.symbol === symbol?.replace("_schematic", ""));

            if (pship && cship) {
                ship = mergeShips([cship], [pship])[0];
            }
            else if (cship) {
                ship = cship.ship;
            }
            else if (pship) {
                ship = pship;
            }

            if (props.useSchematicsIcon && cship) {
                if (!src) src = `${process.env.GATSBY_ASSETS_URL}${cship.icon?.file.slice(1).replace('/', '_')}.png`;
            }
            else if (ship) {
                if (!src) src = `${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`;
            }
            gen_item = ship;
            if (gen_item && !gen_item.max_rarity) {
                gen_item.max_rarity = gen_item.rarity;
            }
            if (!link && props.link === true && ship) {
                link = `/ship_info/?ship=${ship.symbol}`;
            }
        }
        if (crewBackground === 'rich' && gen_item) {
            imgStyle.backgroundColor = shipRichClr;
        }
        return gen_item;
    }
}