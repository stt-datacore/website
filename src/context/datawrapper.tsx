import React from "react";
import { Header } from "semantic-ui-react";
import Layout from "../components/layout";
import { PlayerData } from "../model/player";
import { ValidDemands, DataContext } from "./datacontext";
import { MergedContext } from "./mergedcontext";
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
	const { crew: allCrew } = coreData;
	
	const { data, notReadyMessage, children, header, pageId, pageTitle, initPlayerData } = props;
	const { strippedPlayerData, buffConfig } = playerContext;
    
    const demands = props.demands ?? ['crew', 'items', 'ship_schematics', 'all_buffs'];
    const isReady = coreData.ready ? coreData.ready(demands) : false;

    let playerData: PlayerData | undefined = undefined;
    let playerShips: Ship[] | undefined = undefined;
    let schematics: Schematics[] | undefined = undefined;

	if (isReady && initPlayerData !== false && demands.includes('crew') && strippedPlayerData && strippedPlayerData.stripped && strippedPlayerData?.player?.character?.crew?.length) {
		playerData = JSON.parse(JSON.stringify(strippedPlayerData));
		if (playerData) {
            prepareProfileData(pageId ?? "data_wrapper", coreData.crew, playerData, playerData.calc?.lastModified);
            if (demands.includes('ship_schematics')) {
                schematics = JSON.parse(JSON.stringify(coreData.ship_schematics)) as Schematics[];
                playerShips = mergeShips(schematics, playerData.player.character.ships);
            }
        }

	}

	let maxBuffs: BuffStatTable | undefined;

	maxBuffs = playerContext.maxBuffs;
	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && isReady && demands.includes("all_buffs")) {
		maxBuffs = coreData.all_buffs;
	} 

	return (
		<Layout title={pageTitle ?? header}>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>{notReadyMessage ?? "Loading data..."}</div>
			}
			{isReady &&
				<React.Fragment>
					<MergedContext.Provider value={{
                        pageId,
                        data,
						allCrew,
						items: coreData.items,
                        playerData: playerData ?? strippedPlayerData ?? {} as PlayerData,
                        buffConfig: buffConfig,
                        maxBuffs: maxBuffs,
                        playerShips,
                        allShips: playerShips ? coreData.ships : undefined,
                        gauntlets: demands.includes('gauntlets') ? coreData.gauntlets : undefined,
                        keystones: demands.includes('keystones') ? coreData.keystones : undefined,
					}}>
						<Header as='h2'>{header}</Header>
						{children}
					</MergedContext.Provider>
				</React.Fragment>
			}
		</Layout>
	);

}
