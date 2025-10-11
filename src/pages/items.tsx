import React from 'react';
import { Step } from 'semantic-ui-react';

import { DemandsTable } from '../components/items/demandstable';
import { EquipmentTable } from '../components/items/equipment_table';
import { ItemsFilterProvider } from '../components/items/filters';
import { GlobalFarm } from '../components/items/globalfarm';
import { QuipmentFilterProvider, QuipmentMode } from '../components/items/quipmentfilters';
import { QuipmentTable } from '../components/items/quipmenttable';
import { CustomFieldDef } from '../components/items/utils';
import DataPageLayout from '../components/page/datapagelayout';
import { approxDate, getItemDateEstimates } from '../components/stats/itemdateutils';
import { GlobalContext } from '../context/globalcontext';
import { WorkerProvider } from '../context/workercontext';
import { CrewMember } from '../model/crew';
import { EquipmentItem, EquipmentItemSource } from '../model/equipment';
import { binaryLocate, formatDuration, getPossibleQuipment } from '../utils/itemutils';
import { useStateWithStorage } from '../utils/storage';
import { ContinuumMission } from '../model/continuum';
import { MissionReward } from '../model/missions';

export interface ItemsPageProps { }

type QBitSource = { quest: string, index: number, mastery: number, rewards: number };

type QBitInfo = EquipmentItem & { qbit_sources: QBitSource[] };
type QuipmentCrewInfo = EquipmentItem & { eligible_crew: CrewMember[], exact_eligible_crew: CrewMember[] };


const ItemsPage = (props: ItemsPageProps) => {

	const [activeTabIndex, setActiveTabIndex] = useStateWithStorage<number>('items/mode', 0, { rememberForever: true });
	const [mode, setMode] = useStateWithStorage<QuipmentMode>(`item/quipment_mode`, 'quipment', { rememberForever: true });
	const [cachedMission, setCachedMission] = useStateWithStorage<ContinuumMission | undefined>(`item/cached_continuum_mission`, undefined);

	const [qbits, setQBits] = React.useState<(EquipmentItem | EquipmentItem)[]>([]);
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { t, tfmt } = globalContext.localized;
	const hasPlayer = !!playerData;
	const { continuum_missions } = globalContext.core;

	React.useEffect(() => {
		if (!hasPlayer && activeTabIndex === 1) {
			setActiveTabIndex(0);
		}
	}, [globalContext]);

	const { crew, keystones } = globalContext.core;

	const coreItems = React.useMemo(() => {
		return generateCoreItems();
	}, [globalContext.core.items, globalContext.core.crew, playerData]);

	const quipment = React.useMemo(() => {
		return generateQuipmentItems();
	}, [coreItems, keystones, crew]);

	React.useEffect(() => {
		buildQBits().then(res => setQBits(res || []));
	}, [coreItems, keystones, continuum_missions]);

	const quipCust = getQuipmentColumnConfig();
	const qbitCust = getQBitColumnConfig();

	const masteries = [
		t('mastery.normal'),
		t('mastery.elite'),
		t('mastery.epic'),
	];

	return (

		<DataPageLayout playerPromptType='recommend' pageTitle={t('menu.roster.items')}
			demands={['all_buffs', 'episodes', 'crew', 'items', 'cadet', 'keystones', 'continuum_missions']}>
			<React.Fragment>

				<Step.Group fluid widths={hasPlayer ? 4 : 2}>
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

					{hasPlayer && <Step active={activeTabIndex === 3} onClick={() => setActiveTabIndex(3)}>
						<Step.Content>
							<Step.Title>{t('item_picker.farm_table.title')}</Step.Title>
							<Step.Description>{tfmt('item_picker.farm_table.description')}</Step.Description>
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
						noRender={![1, 3].includes(activeTabIndex) || !hasPlayer}
						pool={playerData!.player.character.items as EquipmentItem[]}
						ownedItems={true}
						pageId={'roster'}
					>
						<React.Fragment>
							<DemandsTable
									noRender={activeTabIndex !== 1 || !hasPlayer}
									pageId={'roster'}
									items={coreItems}
								/>
							<GlobalFarm
								noRender={activeTabIndex !== 3 || !hasPlayer}
								items={coreItems}
							/>
						</React.Fragment>
					</ItemsFilterProvider>
				</WorkerProvider>}

				<QuipmentFilterProvider
					mode={mode}
					setMode={setMode}
					noRender={activeTabIndex !== 2}
					ownedItems={false}
					pageId={'quipment'}
					>
					<>
						<QuipmentTable
							noRender={activeTabIndex !== 2 || mode !== 'quipment'}
							items={quipment}
							ownedItems={false}
							ownedCrew={hasPlayer}
							pageId={'quipment'}
							customFields={quipCust}
							/>
						<ItemsFilterProvider
							noRender={activeTabIndex !== 2 || mode !== 'qbit'}
							pool={coreItems}
							ownedItems={false}
							pageId={'core'}
						>
							<EquipmentTable
								pageId={'core'}
								noRender={activeTabIndex !== 2 || mode !== 'qbit'}
								items={qbits}
								ownedColumns={['quantity']}
								customFields={qbitCust}
								hideOwnedColumns={!playerData}
								types={[15]}
							/>
						</ItemsFilterProvider>
					</>
				</QuipmentFilterProvider>

				<br />
				<br />

			</React.Fragment>
		</DataPageLayout>
	);

	function raritySum(crew: CrewMember[]) {
		return crew.map(c => c.max_rarity).reduce((p, n) => p + n, 0);
	}

	function generateCoreItems() {
		const coreItems = structuredClone(globalContext.core.items.filter(item => item.type !== 14 || (!!item.max_rarity_requirement || !!item.traits_requirement?.length))) as EquipmentItem[];
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
	}

	async function buildQBits() {
		if (!continuum_missions?.length) return undefined;
		const qbits = generateQBitItems().map(item => ({...item, item_sources: [] as EquipmentItemSource[] }));
		if (!qbits?.length) return undefined;

		const missionId = continuum_missions[continuum_missions.length - 1].id;
		const missionUrl = `/structured/continuum/${missionId}.json`;

		let mission = cachedMission || (await fetch(missionUrl)
			.then((response) => response.json())
			.then((result: ContinuumMission) => result));

		if (!mission) return undefined;
		// Merge quests with loot

		const qbit_sources = {} as {[key:string]: QBitSource[]};
		let q = 0;
		for (let quest of mission.quests!) {
			for (let m = 0; m < 3; m++) {
				let qrew = quest.mastery_levels![m].jackpots?.map(j => j.reward).flat() ?? [];
				for (let r of qrew) {
					if (r.symbol === 'research_security_compon') {
						let l = 0;
					}
					qbit_sources[r.symbol!] ??= [];
					let curr = qbit_sources[r.symbol!].find(s => s.quest === quest!.name && s.mastery === m);
					if (!curr) {
						curr = {
							quest: quest.name!,
							index: q,
							mastery: m,
							rewards: r.quantity
						};
						qbit_sources[r.symbol!].push(curr);
					}
					else {
						curr.rewards += r.quantity;
					}
				}
			}

			q++;
		}

		for (let item of qbits) {
			item.qbit_sources = qbit_sources[item.symbol] || [];
			item.qbit_sources.sort((a, b) => {
				let r = 0;
				r = a.index - b.index;
				if (!r) r = a.mastery - b.mastery;
				if (!r) r = a.quest.localeCompare(b.quest);
				return r;
			});
		}
		setCachedMission(mission);
		return qbits;
	}

	function generateQBitItems() {
		if (!coreItems?.length || !keystones?.length || !continuum_missions?.length) return [];
		const qbits = structuredClone(coreItems.filter(f => f.type === 15)).filter(e => !(e.name.startsWith("General") && e.name.endsWith("Component"))) as QBitInfo[];
		return qbits;
	}

	function generateQuipmentItems() {
		if (!coreItems?.length || !keystones?.length || !crew?.length) return [];
		const quipment = structuredClone(coreItems.filter(f => f.type === 14)) as QuipmentCrewInfo[];
		const { quips } = getItemDateEstimates(globalContext.core, t);
		const { crewQuips, exactQuips } = (() => {
			const res = {} as {[key:string]: string[] };
			const eres = {} as {[key:string]: string[] };
			for (let c of crew) {
				let anyquip = getPossibleQuipment(c, quipment);
				let exquip = getPossibleQuipment(c, quipment, true);
				for (let item of anyquip) {
					res[item.symbol] ??= [];
					res[item.symbol].push(c.symbol);
				}
				for (let item of exquip) {
					eres[item.symbol] ??= [];
					eres[item.symbol].push(c.symbol);
				}
			}
			return { crewQuips: res, exactQuips: eres };
		})();
		for (let q of quipment) {
			q.eligible_crew = crewQuips[q.symbol]?.map(symbol => crew.find(fc => fc.symbol === symbol)!) || [];
			q.exact_eligible_crew = exactQuips[q.symbol]?.map(symbol => crew.find(fc => fc.symbol === symbol)!) || [];
			let d = quips[q.symbol];
			if (d && !q.discovered) {
				q.discovered = d;
				q.disc_estimated = true;
			}
			else if (typeof q.discovered === 'string') {
				q.discovered = new Date(q.discovered);
				q.disc_estimated = false;
			}
			let pitem = playerData?.player.character.items.find(f => f.symbol === q.symbol);
			if (pitem) q.quantity = pitem.quantity;
		}
		return quipment;
	}

	function getQBitColumnConfig() {
		const qbitCust = [] as CustomFieldDef[];
		qbitCust.push(
			{
				field: 'qbit_sources',
				width: 2,
				text: t('items.item_sources'),
				format: (value: QBitSource[], item: EquipmentItem) => {
					return (<>
						{value.map(src => {
							let count = src.rewards;
							return (<div key={`qp_${item.symbol}_${src.quest}+${src.mastery}`} style={{fontSize: '0.9em', margin: '0.25em 0'}}>
							  	{src.index+1}. {src.quest} ({masteries[src.mastery]}) {!!count && <>(x{count})</>}
							</div>)
						})}
					</>)
				},
				customCompare: (a: QBitInfo, b: QBitInfo) => ((a.qbit_sources.length ?? 0) - (b.qbit_sources.length ?? 0)) || a.rarity - b.rarity || a.name.localeCompare(b.name),
				reverse: true
			}
		);
		return qbitCust;
	}

	function getQuipmentColumnConfig() {
		const quipCust = [] as CustomFieldDef[];
		quipCust.push(
			{
				field: 'duration',
				text: t('items.columns.duration'),
				format: (value: number) => formatDuration(value, t),
				customCompare: (a: EquipmentItem, b: EquipmentItem) => ((a.duration ?? 0) - (b.duration ?? 0)) || a.rarity - b.rarity || a.name.localeCompare(b.name),
				reverse: true
			}
		);

		if (hasPlayer) {
			quipCust.push({
				field: 'quantity',
				text: t('items.columns.owned'),
				format: (value: number) => value ? (value.toLocaleString()) : t('crew_state.unowned')
			});
		}

		quipCust.push(
			{
				field: 'discovered',
				text: t('base.release_date'),
				format: (value: Date | undefined, context: EquipmentItem) => {
					if (!value) return '';
					if (context.disc_estimated) {
						return (<>
							<div>{approxDate(value, t)}</div>
							<span style={{fontSize: '0.8em', fontStyle: 'italic', opacity: '0.8', color: 'lightblue'}}>
								{value?.toLocaleDateString() || ''}
							</span>
						</>);
					}
					else {
						return value.toLocaleDateString();
					}
				},
				customCompare: (a: EquipmentItem, b: EquipmentItem) => ((a.discovered?.getTime() ?? 0) - (b.discovered?.getTime() ?? 0)) || a.rarity - b.rarity || a.name.localeCompare(b.name),
				reverse: true
			},
			{
				field: 'eligible_crew',
				text: t('base.crew'),
				customCompare: (a: QuipmentCrewInfo, b: QuipmentCrewInfo) => {
					return a.exact_eligible_crew.length - b.exact_eligible_crew.length || a.eligible_crew.length - b.eligible_crew.length;
				},
				reverse: true,
				format: (value: CrewMember[], context: QuipmentCrewInfo) => {
					return (<>
						<div>
							{value.length}
						</div>
						{context.exact_eligible_crew.length !== context.eligible_crew.length && (
							<span style={{fontSize: '0.8em', fontStyle: 'italic', opacity: '0.8', color: 'lightblue'}}>
								{t('global.exact{{:}}')}&nbsp;{context.exact_eligible_crew.length}
							</span>
						)}
					</>)
				}
			}
		);
		return quipCust;
	}
};

export default ItemsPage;

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

