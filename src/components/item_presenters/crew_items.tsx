import * as React from 'react';

import { CrewMember, EquipmentSlot } from "../../model/crew";
import { PlayerCrew } from "../../model/player"
import { GlobalContext } from '../../context/globalcontext';
import { BuffStatTable } from '../../utils/voyageutils';
import { EquipmentItem } from '../../model/equipment';
import ItemDisplay from '../itemdisplay';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { navigate } from 'gatsby';
import { getCrewQuipment, qbitsToSlots } from '../../utils/crewutils';
import { getItemBonuses } from '../../utils/itemutils';

export interface CrewItemsViewProps {
    crew: PlayerCrew | CrewMember;
    flexDirection?: 'row' | 'column';
    mobileWidth?: number;
    itemSize?: number;
    mobileSize?: number;
    quipment?: boolean;
}
export const CrewItemsView = (props: CrewItemsViewProps) => {
	const context = React.useContext(GlobalContext);
	const playerContext = context.player;
	const mobileWidth = props.mobileWidth ?? DEFAULT_MOBILE_WIDTH;

    const crew = props.crew as PlayerCrew;
    const quip = !!props.quipment;

    const maxqIdx = (!quip ? 0 : (crew ? qbitsToSlots(crew.q_bits) : 0)) - 1;

    let maxBuffs: BuffStatTable | undefined;

	maxBuffs = playerContext?.maxBuffs ?? context.core?.all_buffs;
    crew.equipment ??= [];
    let startlevel = Math.floor(crew.level / 10) * 4;
    if (crew.level % 10 == 0 && crew.equipment.length >= 1) startlevel = startlevel - 4;
    let equip = [] as EquipmentItem[];

    if (!quip) {
        if (!crew.equipment_slots[startlevel] || !context.core.items?.length) {
            //console.error(`Missing equipment slots information for crew '${crew.name}'`);
            //console.log(crew);
            [0, 1, 2, 3].forEach(i => equip.push({} as EquipmentItem));
        } else {
            
            [0, 1, 2, 3].forEach(i => equip.push({} as EquipmentItem));
    
            for (let i = startlevel; i < startlevel + 4; i++) {
                let eq: EquipmentSlot;
                eq = crew.equipment_slots[i];
                
                if (eq) {
                    let ef = context.core.items.find(item => item.symbol === eq.symbol);
                    if (ef) {
                        equip[i - startlevel] = (JSON.parse(JSON.stringify(ef)));
                    }
                }
                
            }
        }    
    
    }
    else {
        [0, 1, 2, 3].forEach(i => equip.push({} as EquipmentItem));
        if (crew.kwipment?.length && !crew.kwipment_slots) {
            if ((crew.kwipment as number[])?.some((q: number) => !!q)) {
                let quips = (crew.kwipment as number[]).map(q => context.core.items.find(i => i.kwipment_id?.toString() === q.toString()) as EquipmentItem)?.filter(q => !!q) ?? [];
                let buffs = quips.map(q => getItemBonuses(q));
                crew.kwipment_slots = quips.map(q => {
                    return {
                        level: 100,
                        symbol: q.symbol,
                        imageUrl: q.imageUrl
                    }
                });
            }
        }
        for (let i = 0; i < 4; i++) {
            let eq: number | undefined = undefined;

            if (crew.kwipment_slots?.length) {
                if (typeof crew.kwipment[i] === 'number') {
                    eq = crew.kwipment[i] as number;
                }
                else {
                    eq = crew.kwipment[i][1] as number;
                }
            }
            
            equip[i] ??= {} as EquipmentItem;                

            if (eq) {
                let ef = context.core.items.find(item => item?.kwipment_id?.toString() === eq?.toString());
                if (ef) {
                    equip[i] = (JSON.parse(JSON.stringify(ef)));
                }
            }
            else {
                if (maxqIdx < i) {
                    equip[i].name = "Quipment slot is locked.";
                    // equip[i].imageUrl = "atlas/minus_round_icon.png";
                }
                else {
                    equip[i].name = "Quipment slot is unequipped.";
                }
            }
        }
    }

    if (!quip && !!crew.equipment) {
        [0, 1, 2, 3].forEach(idx => {
            if ((crew.equipment as number[]).indexOf(idx) < 0) {                
                equip[idx].imageUrl = "items_equipment_box02_icon.png"
                equip[idx].empty = true;
                equip[idx].rarity = 0;
            }
        });
    }
	return (
        !context.core.items?.length &&
            <div className='ui medium centered text active inline loader'>Loading data...</div>
        ||context.core.items?.length &&
            <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                margin: 0,
                padding: 0
            }}>
            {equip.map((item, idx) => (
                    <CrewItemDisplay                       
                        style={(quip && maxqIdx < idx) ? { opacity: "0.25"} : undefined} 
                        itemSize={props.itemSize} 
                        mobileSize={props.mobileSize} 
                        key={item.symbol + "_equip" + idx} 
                        mobileWidth={mobileWidth} 
                        crew={crew} 
                        equipment={item} />
                ))}
            </div>
        || <></>
        
	);
};

export interface CrewItemDisplayProps extends CrewItemsViewProps {
    equipment?: EquipmentItem;
    itemSize?: number;
    mobileSize?: number;
    style?: React.CSSProperties;
}

export class CrewItemDisplay extends React.Component<CrewItemDisplayProps> {
    constructor(props: CrewItemDisplayProps) {
        super(props);
    }


    render() {
        const entry = this.props;
        const itemSize = window.innerWidth < (this.props.mobileWidth ?? DEFAULT_MOBILE_WIDTH) ? (this.props.mobileSize ?? 24) : (this.props.itemSize ?? 32);

        return (<div 
            onClick={(e) => navigate("/item_info?symbol=" + this.props.equipment?.symbol)}
            title={this.props.equipment?.name}
            style={{
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",            
            margin: window.innerWidth < (this.props.mobileWidth ?? DEFAULT_MOBILE_WIDTH) ? "0.15em" : "0.25em",
            ...this.props.style
        }}>
            <ItemDisplay
                src={`${process.env.GATSBY_ASSETS_URL}${entry?.equipment?.imageUrl ?? "items_equipment_box02_icon.png"}`}
                size={itemSize}
                maxRarity={entry?.equipment?.rarity ?? 0}
                rarity={entry?.equipment?.rarity ?? 0}                
            />
        </div>)
    }
}