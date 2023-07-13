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

export interface DataWrapperProps {
	notReadyMessage?: string;
	header: string;
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
	
	const { data, notReadyMessage, children, header, pageId, pageTitle, clone } = props;
	const { buffConfig } = playerContext;
    
    const demands = props.demands ?? ['crew', 'items', 'ship_schematics', 'all_buffs'];
	if (!demands.includes('crew')) demands.push('crew');
	if (!demands.includes('items')) demands.push('items');
    
    const isReady = coreData.ready ? coreData.ready(demands) : false;

	const { playerData, playerShips } = playerContext;
    
	let maxBuffs: BuffStatTable | undefined;

	maxBuffs = playerContext.maxBuffs;

	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && isReady && demands.includes("all_buffs")) {
		maxBuffs = coreData.all_buffs;
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
		<Layout header={header} title={pageTitle ?? header}>
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
