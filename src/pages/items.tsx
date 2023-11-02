import React from 'react';
import { Step } from 'semantic-ui-react';


import { EquipmentItem } from '../model/equipment';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { binaryLocate } from '../utils/itemutils';
import { useStateWithStorage } from '../utils/storage';
import ProfileItems from '../components/profile_items';

export interface ItemsPageProps {}

const ItemsPage = (props: ItemsPageProps) => {
	
	const [activeTabIndex, setActiveTabIndex] = useStateWithStorage<number>('items/mode', 0, { rememberForever: true });	
	const context = React.useContext(GlobalContext);

	const hasPlayer = !!context.player.playerData;
	const allActive = activeTabIndex === 0 || !hasPlayer;

	const coreItems = JSON.parse(JSON.stringify(context.core.items.filter(item => item.type !== 14 || (!!item.max_rarity_requirement || !!item.traits_requirement?.length)))) as EquipmentItem[];
	const crew = context.core.crew;

	coreItems.sort((a, b) => a.symbol.localeCompare(b.symbol));
	const crewLevels: { [key: string]: Set<string>; } = {};
	
	crew.forEach(cr => {
		cr.equipment_slots.forEach(es => {
			let item = binaryLocate(es.symbol, coreItems);
			if (item) {
				crewLevels[es.symbol] ??= new Set();
				crewLevels[es.symbol].add(cr.symbol);
			}
		});
	});

	for (let symbol in crewLevels) {
		if (crewLevels[symbol] && crewLevels[symbol].size > 0) {
			let item = binaryLocate(symbol, coreItems);
			if (item) {
				item.flavor ??= "";
				if (item.flavor?.length) item.flavor += "\n";
				if (crewLevels[symbol].size > 5) {
					item.flavor += `Equippable by ${crewLevels[symbol].size} crew`;
				} else {
					item.flavor += 'Equippable by: ' + [...crewLevels[symbol]].join(', ');
				}
			}
		}
	}

	return (

		<DataPageLayout playerPromptType='recommend' pageTitle='Items' demands={['all_buffs', 'episodes', 'crew', 'items', 'cadet']}>
			<React.Fragment>
			{hasPlayer &&
			<Step.Group>
				<Step active={allActive} onClick={() => setActiveTabIndex(0)}>
					<Step.Content>
						<Step.Title>All Items</Step.Title>
						<Step.Description>Overview of all items in the game.</Step.Description>
					</Step.Content>
				</Step>

				{hasPlayer && <Step active={!allActive} onClick={() => setActiveTabIndex(1)}>
					<Step.Content>
						<Step.Title>Owned Items</Step.Title>
						<Step.Description>Overview of all items owned (and also needed) by the player.</Step.Description>
					</Step.Content>
				</Step>}
			</Step.Group>}
			
			<ProfileItems 
				pageName={"core"}
				noRender={!allActive}
				data={coreItems}				
				hideOwnedInfo={true}				
				noWorker={true}
				flavor={true} />

			<ProfileItems
				pageName={"roster"}
				noRender={allActive} />

			</React.Fragment>
		</DataPageLayout>
	);
};


export default ItemsPage;
