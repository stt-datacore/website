import * as React from 'react';

import { CrewMember } from "../../model/crew";
import { PlayerCrew, PlayerData } from "../../model/player"
import { DataContext } from '../../context/datacontext';
import { PlayerContext } from '../../context/playercontext';
import { MergedContext } from '../../context/mergedcontext';
import { BuffStatTable } from '../../utils/voyageutils';
import Announcement from '../announcement';
import Layout from '../layout';
import { EquipmentItem } from '../../model/equipment';
import ItemDisplay from '../itemdisplay';

export interface CrewItemsViewProps {
    crew: PlayerCrew | CrewMember | string;
    flexDirection?: 'row' | 'column';
}

const CrewItemsView = (props: CrewItemsViewProps) => {
	const coreData = React.useContext(DataContext);
	const isReady = coreData.ready(['all_buffs', 'crew', 'items']);
	const playerContext = React.useContext(PlayerContext);
	const { strippedPlayerData, buffConfig } = playerContext;
	
	let maxBuffs: BuffStatTable | undefined;

    let usecrew: PlayerCrew | CrewMember;
	maxBuffs = playerContext.maxBuffs;
	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && isReady) {
		maxBuffs = coreData.all_buffs;
	}     

	return (
		<Layout>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>Loading data...</div>
			}
			{isReady &&
				<React.Fragment>
					<MergedContext.Provider value={{
						allCrew: coreData.crew,
						playerData: strippedPlayerData ?? {} as PlayerData,
						buffConfig: buffConfig,
						maxBuffs: maxBuffs
					}}>
						
					</MergedContext.Provider>
				</React.Fragment>
			}
		</Layout>
	);
};

export interface CrewItemDisplayProps extends CrewItemsViewProps {
    equipment: EquipmentItem;
}

export class CrewItemDisplay extends React.Component<CrewItemDisplayProps> {
    constructor(props: CrewItemDisplayProps) {
        super(props);
    }

    render() {
        const entry = this.props;
        return (<div className="ui segment" style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center"
        }}>
            <ItemDisplay
                src={`${process.env.GATSBY_ASSETS_URL}${entry.equipment.imageUrl}`}
                size={48}
                maxRarity={entry.equipment.rarity}
                rarity={entry.equipment.rarity}
            />
        </div>)
    }
}