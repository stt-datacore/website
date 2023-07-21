import * as React from 'react';

import { CrewMember, EquipmentSlot } from "../../model/crew";
import { PlayerCrew, PlayerData } from "../../model/player"
import { DataContext } from '../../context/datacontext';
import { PlayerContext } from '../../context/playercontext';
import { MergedContext } from '../../context/mergedcontext';
import { BuffStatTable } from '../../utils/voyageutils';
import Announcement from '../announcement';
import Layout from '../layout';
import { EquipmentItem } from '../../model/equipment';
import ItemDisplay from '../itemdisplay';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';

export interface CrewItemsViewProps {
    crew: PlayerCrew | CrewMember;
    flexDirection?: 'row' | 'column';
    mobileWidth?: number;
}

export const CrewItemsView = (props: CrewItemsViewProps) => {
	const coreData = React.useContext(DataContext);
	const itemsReady = coreData.ready ? coreData.ready(['all_buffs', 'crew', 'items']) : false;
	const playerContext = React.useContext(PlayerContext);
	const { strippedPlayerData, buffConfig } = playerContext;
	const mobileWidth = props.mobileWidth ?? DEFAULT_MOBILE_WIDTH;

    const crew = props.crew as PlayerCrew;
	let maxBuffs: BuffStatTable | undefined;

	maxBuffs = playerContext.maxBuffs;
    
    if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && itemsReady) {
		maxBuffs = coreData.all_buffs;
	}     
    let startlevel = Math.floor(crew.level / 10) * 4;
    if (crew.level % 10 == 0 && crew.equipment.length >= 1) startlevel = startlevel - 4;
    let eqimgs = [] as string[];
    let equip = [] as EquipmentItem[];

    if (!crew.equipment_slots[startlevel] || !itemsReady) {
        //console.error(`Missing equipment slots information for crew '${crew.name}'`);
        //console.log(crew);
        eqimgs = [
            'items_equipment_box02_icon.png',
            'items_equipment_box02_icon.png',
            'items_equipment_box02_icon.png',
            'items_equipment_box02_icon.png'
        ];
        [0, 1, 2, 3].forEach(i => equip.push({} as EquipmentItem));
    } else {
        
        [0, 1, 2, 3].forEach(i => equip.push({} as EquipmentItem));

        for (let i = startlevel; i < startlevel + 4; i++) {
            let eq: EquipmentSlot;
            eq = crew.equipment_slots[i];
            
            if (eq) {
                let ef = coreData.items.find(item => item.symbol === eq.symbol);
                if (ef) {
                    equip[i - startlevel] = (JSON.parse(JSON.stringify(ef)));
                }
            }
            
        }

        eqimgs = [
            equip[0].imageUrl ?? "items_equipment_box02_icon.png",
            equip[1].imageUrl ?? "items_equipment_box02_icon.png",
            equip[2].imageUrl ?? "items_equipment_box02_icon.png",
            equip[3].imageUrl ?? "items_equipment_box02_icon.png"
        ];
    }    

    if (crew.equipment) {
        [0, 1, 2, 3].forEach(idx => {
            if ((crew.equipment as number[]).indexOf(idx) < 0) {
                eqimgs[idx] = 'items_equipment_box02_icon.png';
                equip[idx].imageUrl = "items_equipment_box02_icon.png"
                equip[idx].empty = true;
                equip[idx].rarity = 0;
            }
        });
    }
	return (
        !itemsReady &&
            <div className='ui medium centered text active inline loader'>Loading data...</div>
        ||
        itemsReady &&
            <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                margin: 0,
                padding: 0
            }}>
            {equip.map((item, idx) => (
                    <CrewItemDisplay key={item.symbol + "_equip" + idx} mobileWidth={mobileWidth} crew={crew} equipment={item} />
                ))}
            </div>
        || <></>
        
	);
};

export interface CrewItemDisplayProps extends CrewItemsViewProps {
    equipment?: EquipmentItem;
}

export class CrewItemDisplay extends React.Component<CrewItemDisplayProps> {
    constructor(props: CrewItemDisplayProps) {
        super(props);
    }

    render() {
        const entry = this.props;
        return (<div 
            title={this.props.equipment?.name}
            style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",            
            margin: window.innerWidth < (this.props.mobileWidth ?? DEFAULT_MOBILE_WIDTH) ? "0.15em" : "0.25em"
        }}>
            <ItemDisplay
                src={`${process.env.GATSBY_ASSETS_URL}${entry?.equipment?.imageUrl ?? "items_equipment_box02_icon.png"}`}
                size={window.innerWidth < (this.props.mobileWidth ?? DEFAULT_MOBILE_WIDTH) ? 24 : 32}
                maxRarity={entry?.equipment?.rarity ?? 0}
                rarity={entry?.equipment?.rarity ?? 0}                
            />
        </div>)
    }
}