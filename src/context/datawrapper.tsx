import React from "react";
import { Header } from "semantic-ui-react";
import Layout from "../components/layout";
import { PlayerData } from "../model/player";
import { ValidDemands, DataContext } from "./datacontext";
import { MergedContext, MergedData } from "./mergedcontext";
import { PlayerContext } from "./playercontext";
import { prepareProfileData } from "../utils/crewutils";
import { BuffStatTable } from "../utils/voyageutils";
import { mergeShips } from "../utils/shiputils";
import { Schematics, Ship } from "../model/ship";
import { EquipmentItemSource } from "../model/equipment";

export interface DataWrapperProps {
	narrowLayout?: boolean;
	notReadyMessage?: string;
	header?: string;
	children: JSX.Element;

    /**
     * Default demands are crew, items, ship_schematics, and all_buffs.
     */
	demands?: ValidDemands[]

    /**
     * The demands to clone. Children will get a copy of the data.
     */
	clone?: ValidDemands[]

	/** default is true */
	initPlayerData?: boolean;

    /**
     * Page title, header property is used if undefined
     */
    pageTitle?: string;    
	pageId?: string;
    data?: any;
}

/**
 * Merged Context Page Wrapper w/ Layout
 */
export const DataWrapper = <T extends DataWrapperProps>(props: T) => {
	const coreData = React.useContext(DataContext);
	const playerContext = React.useContext(PlayerContext);	
	const { crew: crew } = coreData;
	
	const { narrowLayout, data, notReadyMessage, children, header, pageId, pageTitle, clone } = props;
	const { buffConfig } = playerContext;
    
    const demands = props.demands ?? ['crew', 'items', 'ship_schematics', 'all_buffs', 'cadet'];
	if (!demands.includes('crew')) demands.push('crew');
	if (!demands.includes('items')) demands.push('items');
	if (!demands.includes('cadet')) demands.push('cadet');
    
    const isReady = coreData.ready ? coreData.ready(demands) : false;
	const { playerData, playerShips } = playerContext;
    
	let maxBuffs: BuffStatTable | undefined;
	maxBuffs = playerContext.maxBuffs;

	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && isReady && demands.includes("all_buffs")) {
		maxBuffs = coreData.all_buffs;
	} 
	
	const cadetforitem = isReady ? coreData?.cadet?.filter(f => f.cadet) : undefined;

	if (isReady && cadetforitem?.length) {
		for(const item of coreData.items) {					
			for (let ep of cadetforitem) {
				let quests = ep.quests.filter(q => q.quest_type === 'ConflictQuest' && q.mastery_levels?.some(ml => ml.rewards?.some(r => r.potential_rewards?.some(px => px.symbol === item.symbol))));
				if (quests?.length) {
					for (let quest of quests) {
						if (quest.mastery_levels?.length) {
							let x = 0;
							for (let ml of quest.mastery_levels) {
								if (ml.rewards?.some(r => r.potential_rewards?.some(pr => pr.symbol === item.symbol))) {
									let mx = ml.rewards.map(r => r.potential_rewards?.length).reduce((prev, curr) => Math.max(prev ?? 0, curr ?? 0)) ?? 0;
									mx = (1/mx) * 1.80;
									let qitem = {
										type: 4,
										mastery: x,											
										name: quest.name,
										energy_quotient: 1,
										chance_grade: 5 * mx,						
										mission_symbol: quest.symbol,
										cost: 1,
										avg_cost: 1/mx,
										cadet_mission: ep.episode_title,
										cadet_symbol: ep.symbol
									} as EquipmentItemSource;
									if (!item.item_sources.find(f => f.mission_symbol === quest.symbol)) {
										item.item_sources.push(qitem);
									}									
								}
								x++;
							}
						}
					}
				}					
			}
		}
	}

	const contextData = {
		pageId,
		data,
		crew,
		items: coreData.items,
		playerData: playerData ?? {} as PlayerData,
		buffConfig: buffConfig,
		maxBuffs: maxBuffs,
		dataSource: playerContext.dataSource,
		playerShips,
		ephemeral: playerContext.ephemeral,					
		clearPlayerData: playerContext.reset,						
		ship_schematics: coreData.ship_schematics,
		ships: playerShips ? coreData.ships : undefined,
		gauntlets: demands.includes('gauntlets') ? coreData.gauntlets : undefined,
		keystones: demands.includes('keystones') ? coreData.keystones : undefined,
	} as MergedData;

	if (clone?.length) {
		for (let cl of clone) {
			if (cl in contextData) {
				contextData[cl] = JSON.parse(JSON.stringify(contextData[cl]));
			}
		}
	}

	return (
		<Layout header={header} title={pageTitle ?? header} narrowLayout={narrowLayout}>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>{notReadyMessage ?? "Loading data..."}</div>
			}
			{isReady &&
				<React.Fragment>
					<MergedContext.Provider value={contextData}>						
						{children}
					</MergedContext.Provider>
				</React.Fragment>
			}
		</Layout>
	);

}
