import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import CONFIG from "../CONFIG";
import { CompletionState, PlayerCrew, PlayerEquipmentItem } from "../../model/player";
import { EquipmentItem } from "../../model/equipment";
import { mergeItems } from "../../utils/itemutils";
import { ItemTarget } from "../hovering/itemhoverstat";
import { CrewTarget } from "../hovering/crewhoverstat";
import { Ship } from "../../model/ship";
import { mergeShips } from "../../utils/shiputils";
import { ShipTarget } from "../hovering/shiphoverstat";
import { HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "../hovering/hoverstat";

export type AvatarViewMode = 'crew' | 'item' | 'ship';
export type AvatarCrewBackground = 'normal' | 'rich';

export interface AvatarViewProps {
    mode: AvatarViewMode;
    symbol: string;
    size: number;
    id?: number;
    style?: React.CSSProperties;
    hideRarity?: boolean;
    targetGroup?: string;
    ignorePlayer?: boolean;
    quantity?: number;
    showMaxRarity?: boolean;
	crewBackground?: AvatarCrewBackground;
    substitute_kwipment?: number[] | number[][];
    src?: string;
    item?: BasicItem;
    partialItem?: boolean;
    preferSchematicsImage?: boolean;
}

export interface BasicItem {
    id?: number;
    archetype_id?: number;
    symbol: string;
    max_rarity?: number;
    rarity?: number;
}

export const AvatarView = (props: AvatarViewProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const { items, crew, ship_schematics } = globalContext.core;
    const { substitute_kwipment, partialItem, style, quantity, showMaxRarity, mode, symbol, id, size, ignorePlayer, hideRarity, targetGroup } = props;

    const crewBackground = props.crewBackground ?? 'normal';

    if (id === undefined && !symbol) {
        throw new Error("Avatar View requires either id or symbol");
    }

    let maxRarity = 0;
    let borderWidth = Math.ceil(size / 34);
    let starSize = Math.floor(size / 6);
    let bottomStar = Math.floor(size / 23);
    let borderRadius = Math.floor(size / 7);
    let star_reward = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward.png`;
    let star_reward_inactive = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward_inactive.png`;

    let gen_item = partialItem ? undefined : props.item;
    let borderColor = CONFIG.RARITIES[maxRarity ?? 0].color;

    if (mode === 'crew') {
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
    else if (mode === 'item') {
        if (!ignorePlayer && !!playerData && !gen_item) {
            gen_item = playerData.player.character.items.find(f => f.symbol === symbol || (id !== undefined && f.archetype_id?.toString() === id?.toString())) as BasicItem | undefined;
        }
        if (!gen_item) {
            gen_item = items.find(f => f.symbol === symbol || (id !== undefined && f.archetype_id?.toString() === id?.toString())) as BasicItem | undefined;
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
    else if (mode === 'ship') {
        if (!ignorePlayer && !!playerData && !gen_item) {
            gen_item = playerData.player.character.ships.find(f => f.symbol === symbol || (id !== undefined && f.archetype_id?.toString() === id?.toString())) as BasicItem | undefined;
        }
        if (!gen_item) {
            gen_item = ship_schematics.find(f => f.ship.symbol === symbol || (id !== undefined && f.ship.archetype_id?.toString() === id?.toString()))?.ship as BasicItem | undefined;
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

    if (!gen_item) return <></>

    if (partialItem && props.item) {
        gen_item = { ... gen_item, ... props.item };
    }

    maxRarity = gen_item?.max_rarity ?? 0;
    borderColor = CONFIG.RARITIES[maxRarity].color;

    let src = props.src;
    let rarity = [] as JSX.Element[];

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

	const divStyle = {
        ... (style ?? {}),
        position: 'relative',
        display: 'flex',
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: size + 'px',
        height: size + 'px',
    } as React.CSSProperties;

    const imgStyle = {
        borderStyle: 'solid',
        borderRadius: borderRadius + 'px',
        borderWidth: borderWidth + 'px',
        borderColor: borderColor,
        width: size - 2 * borderWidth + 'px',
        height: size - 2 * borderWidth + 'px'
    } as React.CSSProperties;

    const starStyle = {
        position: 'absolute',
        width: size + 'px',
        bottom: bottomStar + 'px',
        left: '50%',
        transform: 'translate(-50%, 0)',
        textAlign: 'center'
    } as React.CSSProperties;

    let item = undefined as EquipmentItem | undefined;
    let ship = undefined as Ship | undefined;
    let HoverTarget = undefined as any | undefined;
    if (mode === 'crew' && gen_item && targetGroup) {
        HoverTarget = CrewTarget;
        const crew = gen_item as PlayerCrew;
        if (!src) src= `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`;
        if (!playerData) {
            crew.immortal = CompletionState.DisplayAsImmortalUnowned;
        }
        else if (crew.immortal && crewBackground === 'rich') {
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
    }
    else if (mode === 'item' && gen_item && targetGroup) {
        HoverTarget = ItemTarget;
        let pitem = playerData ? gen_item as any as PlayerEquipmentItem : undefined;
        let citem = (playerData ? items.find(item => item.symbol === symbol && item.quantity === quantity && (item as EquipmentItem).isReward) : gen_item) as EquipmentItem | undefined;
        if (!citem) citem = items.find(item => item.symbol === symbol) as EquipmentItem | undefined;

        if (pitem && citem && !citem.isReward) {
            item = mergeItems([pitem], [citem])[0] as EquipmentItem;
        }
        else if (citem){
            item = citem as EquipmentItem;
        }
        else if (pitem) {
            item = pitem as EquipmentItem;
        }
        if (item && citem) {
            item.demandCrew = citem.demandCrew;
            if (!src) src = `${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`;
        }
    }
    else if (mode === 'ship' && gen_item && targetGroup) {
        HoverTarget = ShipTarget;
        let pship = playerData ? gen_item as any as Ship : undefined;
        let cship = ship_schematics.find(f => f.ship.symbol === symbol);

        if (pship && cship) {
            ship = mergeShips([cship], [pship])[0];
        }
        else if (cship) {
            ship = cship.ship;
        }
        else if (pship) {
            ship = pship;
        }

        if (props.preferSchematicsImage && cship) {
            if (!src) src = `${process.env.GATSBY_ASSETS_URL}${cship.icon.file}`;
        }
        else if (ship) {
            if (!src) src = `${process.env.GATSBY_ASSETS_URL}${ship.icon?.file}`;
        }
    }

    if (targetGroup && HoverTarget) {
        return (
            <div style={divStyle}>
                <HoverTarget
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
            <div style={divStyle}>
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
}