import React from 'react';
import { Step } from 'semantic-ui-react';

import DataPageLayout from '../components/page/datapagelayout';
import ItemsTable from '../components/items/itemstable';
import { GlobalContext } from '../context/globalcontext';
import { EquipmentItem } from '../model/equipment';
import { binaryLocate, formatDuration, getItemWithBonus, getPossibleQuipment } from '../utils/itemutils';
import { useStateWithStorage } from '../utils/storage';
import { PlayerCrew } from '../model/player';
import { getCrewQuipment, oneCrewCopy } from '../utils/crewutils';
import { CustomFieldDef } from '../components/items/utils';
import { EquipmentTable } from '../components/items/equipment_table';
import { WorkerProvider } from '../context/workercontext';
import { ItemsFilterProvider } from '../components/items/filters';
import { DemandsTable } from '../components/items/demandstable';
import { QuipmentFilterProvider } from '../components/items/quipmentfilters';
import { QuipmentTable } from '../components/items/quipmenttable';

export interface ItemsPageProps { }

const ItemsPage = (props: ItemsPageProps) => {

	const [activeTabIndex, setActiveTabIndex] = useStateWithStorage<number>('items/mode', 0, { rememberForever: true });
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { t, tfmt } = globalContext.localized;
	const hasPlayer = !!playerData;
	const allActive = activeTabIndex === 0 || !hasPlayer;

	React.useEffect(() => {
		if (!hasPlayer && activeTabIndex === 1) {
			setActiveTabIndex(0);
		}
	}, [globalContext]);

	const crew = globalContext.core.crew;
	const coreItems = React.useMemo(() => {
		const coreItems = JSON.parse(JSON.stringify(globalContext.core.items.filter(item => item.type !== 14 || (!!item.max_rarity_requirement || !!item.traits_requirement?.length)))) as EquipmentItem[];
		if (hasPlayer) {
			coreItems.forEach((item) => {
				item.quantity = globalContext.player.playerData?.player.character.items.find(i => i.symbol === item.symbol)?.quantity;
			});
		}
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
		return coreItems;
	}, [globalContext.core.items, globalContext.core.crew]);

	const quipment = React.useMemo(() => {
		return coreItems.filter(f => f.type === 14);
	}, [coreItems]);
	const quipCust = [] as CustomFieldDef[];

	quipCust.push({
		field: 'duration',
		text: t('items.columns.duration'),
		format: (value: number) => formatDuration(value, t),
		customCompare: (a: EquipmentItem, b: EquipmentItem) => ((a.duration ?? 0) - (b.duration ?? 0)) || a.rarity - b.rarity || a.name.localeCompare(b.name),
		reverse: true
	});

	if (hasPlayer) {
		quipCust.push({
			field: 'quantity',
			text: t('items.columns.owned'),
			format: (value: number) => value ? (value.toLocaleString()) : t('crew_state.unowned')
		});
	}

	// // Don't delete!!!! This is to preview crew quipment
	// if (globalContext.core?.crew?.length) {
	// 	let crnew = oneCrewCopy(globalContext.core.crew.find(f => f.symbol === 'vash_qless_crew')!);
	// 	crnew!.traits = ["human", "federation", "exoarchaeology", "civilian", "romantic", "crafty", "smuggler", "merchant", "casual", "playful"]
	// 	crnew!.skill_order = ['science_skill', 'diplomacy_skill', 'medicine_skill']
	// 	crnew!.base_skills.medicine_skill = crnew!.base_skills.command_skill;
	// 	delete crnew!.base_skills.command_skill;
	// 	let crewquip = getPossibleQuipment(crnew as PlayerCrew, globalContext.core.items.filter(f => f.type === 14));
	// 	let text = '';
	// 	if (crewquip?.length) {
	// 		crewquip.forEach(item => {
	// 			let bonus = getItemWithBonus(item);
	// 			text += (`${item.name}\n    ${bonus.bonusInfo.bonusText.join('\n    ')}\n`)
	// 		})
	// 		console.log(text);
	// 	}
	// }

	return (

		<DataPageLayout playerPromptType='recommend' pageTitle={t('menu.roster.items')} demands={['all_buffs', 'episodes', 'crew', 'items', 'cadet']}>
			<React.Fragment>

				<Step.Group fluid>
					<Step active={activeTabIndex === 0} onClick={() => setActiveTabIndex(0)}>
						<Step.Content>
							<Step.Title>{t('item_picker.all_items.title')}</Step.Title>
							<Step.Description>{tfmt('item_picker.all_items.description')}</Step.Description>
						</Step.Content>
					</Step>

					{hasPlayer && <Step active={activeTabIndex === 1} onClick={() => setActiveTabIndex(1)}>
						<Step.Content>
							<Step.Title>{t('item_picker.owned_items.title')}</Step.Title>
							<Step.Description>{tfmt('item_picker.owned_items.description')}</Step.Description>
						</Step.Content>

					</Step>}

					<Step active={activeTabIndex === 2} onClick={() => setActiveTabIndex(2)}>
						<Step.Content>
							<Step.Title>{t('item_picker.quipment_browser.title')}</Step.Title>
							<Step.Description>{tfmt('item_picker.quipment_browser.description')}</Step.Description>
						</Step.Content>
					</Step>
				</Step.Group>


				{/* We want both of these to load, even if they are not displayed,
				because there's work that that must be done every time they are loaded.
				Re-rendering the page for switching views would cause work to run unnecessarily. */}
				<ItemsFilterProvider
					noRender={activeTabIndex !== 0}
					pool={coreItems}
					ownedItems={false}
					pageId={'core'}
				>
					<EquipmentTable
						pageId={'core'}
						flavorColumn={true}
						noRender={activeTabIndex !== 0}
						hideOwnedColumns={true}
						items={coreItems}
					/>
				</ItemsFilterProvider>

				{hasPlayer &&
					<WorkerProvider>
						<ItemsFilterProvider
							noRender={activeTabIndex !== 1 || !hasPlayer}
							pool={playerData!.player.character.items as EquipmentItem[]}
							ownedItems={true}
							pageId={'roster'}
						>
							<DemandsTable
								noRender={activeTabIndex !== 1 || !hasPlayer}
								pageId={'roster'}
								items={coreItems}
							/>
						</ItemsFilterProvider>
					</WorkerProvider>}
				{/* {hasPlayer &&
					<ItemsTable
					pageName={"roster"}
					noRender={activeTabIndex !== 1 || !hasPlayer} />
				} */}

					<QuipmentFilterProvider
						ownedItems={false}
						pageId={'quipment'}
						>
						<QuipmentTable
							items={quipment}
							ownedItems={false}
							ownedCrew={hasPlayer}
							pageId={'quipment'}
							customFields={quipCust}
							/>
					</QuipmentFilterProvider>
				{/* <ItemsTable
					pageName={"quipment"}
					types={[14]}
					buffs={true}
					crewMode={true}
					noWorker={true}
					noRender={activeTabIndex !== 2}
					data={coreItems}
					hideOwnedInfo={true}
					flavor={false}
					customFields={quipCust}
				/> */}
				<br />
				<br />

			</React.Fragment>
		</DataPageLayout>
	);
};


export default ItemsPage;
