import React from 'react';
import { Button, Dropdown, Grid, Icon, Message, Modal, Table } from 'semantic-ui-react';

import { Filter } from '../../model/game-elements';

import ItemDisplay from '../../components/itemdisplay';
import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';

import { ActionableState, IConstellation, IPolestar } from './model';
import { printISM, RetrievalContext } from './context';
import { ConstellationPolestars, PolestarConstellations } from './constellations';
import { filterTraits } from './utils';
import { MarketAggregation } from '../../model/celestial';
import { GlobalContext } from '../../context/globalcontext';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { AvatarView } from '../item_presenters/avatarview';

interface IPolestarData extends IPolestar {
	loaned: number;
};

export const PolestarProspectsModal = () => {
	const { allKeystones, rosterCrew, polestarTailors, setPolestarTailors, market } = React.useContext(RetrievalContext);
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt, ITEM_ARCHETYPES } = globalContext.localized;
	const addedPolestars = polestarTailors.added;

	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);

	const [crewCrates, setCrewCrates] = React.useState<number>(0);
	const [ownedConstellations, setOwnedConstellations] = React.useState<IConstellation[]>([]);

	const [activeConstellation, setActiveConstellation] = React.useState<string>('');
	const [activePolestar, setActivePolestar] = React.useState<string>('');

	const [pendingAdded, setPendingAdded] = React.useState<string[]>([]);

	React.useEffect(() => {
		// Chances assume you can't get rarity, skill constellations from scans
		setCrewCrates(allKeystones.filter(k => k.type === 'crew_keystone_crate').length);
		const owned = allKeystones.filter(k => (k.type === 'crew_keystone_crate' || k.type === 'keystone_crate') && k.owned > 0)
			.sort((a, b) => a.name.localeCompare(b.name)).map(ks => ks as IConstellation);
		setOwnedConstellations([...owned]);
	}, [allKeystones]);

	// Update on external changes, e.g. reset request from crew.tsx
	React.useEffect(() => {
		setPendingAdded([...addedPolestars]);
	}, [addedPolestars]);

	// Recalculate combos only when modal gets closed
	React.useEffect(() => {
		if (!modalIsOpen) {
			setPolestarTailors({...polestarTailors, added: pendingAdded});
		}
	}, [modalIsOpen]);

	const buttonColor = addedPolestars.length > 0 ? 'blue' : undefined;
	const polestarTable: ITableConfigRow[] = [
		{ width: 2, column: 'name', title: t('retrieval.prospects.columns.name') },
		{ width: 1, column: 'crew_count', title: t('retrieval.prospects.columns.crew_count'), reverse: true },
		{ width: 1, column: 'crate_count', title: t('retrieval.prospects.columns.crate_count'), reverse: true },
		{ width: 1, column: 'scan_odds', title: t('retrieval.prospects.columns.scan_odds'), reverse: true },
		{ width: 1, column: 'owned_best_odds', title: t('retrieval.prospects.columns.owned_best_odds'), reverse: true },
		{ width: 1, column: 'owned', title: t('retrieval.prospects.columns.owned'), reverse: true },
		{ width: 2, column: 'loaned', title: t('retrieval.prospects.columns.added'), reverse: true }
	];

	const getPrice = (id: number) => {
		if (!market) return 0;
		return market[id]?.low ?? 0;
	}

	if (market) {
		polestarTable.push(
			{
				width: 2,
				column: 'price',
				title: t('global.item_types.ism'),
				reverse: true,
				pseudocolumns: ['sell_count', 'price'],
				customCompare: (a: IPolestarData, b: IPolestarData, config) => {
					if (config.field === 'sell_count') {
						let r = market[a.id].sell_count - market[b.id].sell_count;
						return r;
					}
					else {
						let r = getPrice(a.id) - getPrice(b.id);
						if (!r) r = market[a.id].sell_count - market[b.id].sell_count;
						return r;
					}
				}
			},
		)
	}

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={<Button color={buttonColor}><Icon name='add' />{addedPolestars.length}</Button>}
			size='large'
		>
			<Modal.Header>{t('retrieval.prospects.add_prospective_polestars')}</Modal.Header>
			<Modal.Content scrolling>
				{renderContent()}
			</Modal.Content>
			<Modal.Actions>
				{activePolestar !== '' && <Button icon='backward' content={t('retrieval.prospects.return_to_polestars')} onClick={() => setActivePolestar('')} />}
				<Button onClick={() => setModalIsOpen(false)}>{t('global.close')}</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderContent(): JSX.Element {
		if (!modalIsOpen) return <></>;

		if (activePolestar !== '')
			return renderPolestarDetail();

		return renderPolestarFinder();
	}

	function renderPolestarFinder(): JSX.Element {

		const constellationList = [
			{ key: 'none', value: '', text: t('retrieval.prospects.show_all_polestars') }
		];
		ownedConstellations.forEach(c => {
			constellationList.push({ key: c.symbol, value: c.symbol, text: ITEM_ARCHETYPES[c.symbol]?.name ?? c.name });
		});

		const allPolestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];

		// !! Always filter polestars by crew_count to hide deprecated polestars !!
		let data: IPolestarData[] = allPolestars.filter(polestar => polestar.crew_count > 0) as IPolestarData[];

		if (activeConstellation !== '') {
			const constellation = allKeystones.find(keystone => keystone.symbol === activeConstellation) as IConstellation;
			if (constellation) data = data.filter(polestar => constellation.keystones.includes(polestar.id));
		}

		data.forEach(p => {
			p.loaned = pendingAdded.filter(added => added === p.symbol).length;
		});

		return (
			<React.Fragment>
				{constellationList.length > 0 && (
					<Dropdown
						placeholder={t('retrieval.prospects.filter_by_owned')}
						style={{ minWidth: '20em' }}
						selection
						clearable
						options={constellationList}
						value={activeConstellation}
						onChange={(e, { value }) => setActiveConstellation(value as string) }
					/>
				)}
				{renderConstellationMessage(data)}
				<div style={{ marginTop: '1em' }}>
					<SearchableTable
						data={data}
						config={polestarTable}
						renderTableRow={(polestar, idx) => renderPolestarRow(polestar, idx ?? -1)}
						filterRow={(polestar, filter) => filterText(polestar, filter)}
						explanation={
							<div>
								<p>{t('retrieval.prospects.search_polestars')}</p>
							</div>
						}
					/>
					<p>
						<i>{t('retrieval.prospects.columns.crate_count')}</i>: {t('retrieval.prospects.definitions.crate_count')}
						<br /><i>{t('retrieval.prospects.columns.scan_odds')}</i>: {t('retrieval.prospects.definitions.scan_odds')}
						<br /><i>{t('retrieval.prospects.columns.owned_best_odds')}</i>: {t('retrieval.prospects.definitions.owned_best_odds')}
					</p>
				</div>
			</React.Fragment>
		);
	}

	function filterText(polestar: IPolestar, filters: Filter[]): boolean {
		if (filters.length === 0) return true;

		const matchesFilter = (input: string, searchString: string) =>
			input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0;

		let meetsAnyCondition = false;

		for (let filter of filters) {
			let meetsAllConditions = true;
			if (filter.conditionArray?.length === 0) {
				// text search only
				for (let segment of filter.textSegments ?? []) {
					let segmentResult = matchesFilter(polestar.name, segment.text);
					meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult);
				}
			}
			if (meetsAllConditions) {
				meetsAnyCondition = true;
				break;
			}
		}

		return meetsAnyCondition;
	}

	function renderPolestarRow(polestar: IPolestarData, idx: number): JSX.Element {
		return (
			<Table.Row key={polestar.symbol}
				style={{ cursor: activePolestar !== polestar.symbol ? 'zoom-in' : 'zoom-out' }}
				onClick={() => {
					setActivePolestar(activePolestar !== polestar.symbol ? polestar.symbol : '')
				}}
			>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '30px auto',
							gridTemplateAreas: `'icon stats'`,
							gridGap: '1px'
						}}
					>
						<div style={{ gridArea: 'icon' }}>
							<img width={24} src={`${process.env.GATSBY_ASSETS_URL}${polestar.icon.file.slice(1).replace(/\//g, '_')}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.1em' }}>{polestar.short_name}</span>
						</div>
					</div>
				</Table.Cell>
				<Table.Cell textAlign='center'>{polestar.crew_count}</Table.Cell>
				<Table.Cell textAlign='center'>{(polestar.crate_count/crewCrates*100).toFixed(1)}%</Table.Cell>
				<Table.Cell textAlign='center'>{(polestar.scan_odds*100).toFixed(2)}%</Table.Cell>
				<Table.Cell textAlign='center'>{(polestar.owned_best_odds*100).toFixed(1)}%</Table.Cell>
				<Table.Cell textAlign='center'>{polestar.owned}</Table.Cell>
				<Table.Cell textAlign='center'>
					<ProspectInventory polestar={polestar.symbol} loaned={polestar.loaned} updateProspect={updateProspect} />
				</Table.Cell>
				{market &&
					<Table.Cell textAlign='center'>
						<div style={{display: 'flex', gap: '0.25em', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
							<span>{t('global.n_available', { n: (market[polestar.id]?.sell_count ?? 0).toLocaleString() })}</span>
							{printISM(getPrice(polestar.id), t)}
						</div>
					</Table.Cell>
				}
			</Table.Row>
		);
	}

	function renderConstellationMessage(data: IPolestar[]): JSX.Element {
		if (activeConstellation === '') return <></>;

		const constellation = allKeystones.find(k => k.symbol === activeConstellation) as IConstellation | undefined;
		if (!constellation) return <></>;
		const cname = ITEM_ARCHETYPES[constellation.symbol]?.name ?? constellation.name;
		const unownedPolestars = data.filter(p => p.owned === 0);

		if (unownedPolestars.length === 0)
			return (<Message>{t('retrieval.prospects.crate.already_owned', { crate: cname })}</Message>);

		return (
			<Message>
				<ConstellationPolestars
					constellation={constellation}
					polestars={unownedPolestars}
					setActiveConstellation={(constellation: string) => { setActiveConstellation(constellation); setActivePolestar(''); }}
					setActivePolestar={setActivePolestar}
				/>
			</Message>
		);
	}

	function renderPolestarDetail(): JSX.Element {
		const polestar = allKeystones.find(k => k.symbol === activePolestar) as IPolestarData | undefined;
		if (!polestar) return <></>;

		polestar.loaned = pendingAdded.filter(added => added === polestar.symbol).length;

		return (
			<div style={{ marginTop: '1em' }}>
				<Table celled striped unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							{polestarTable.map((column, idx) => {
								if (!idx) {
									return <Table.HeaderCell key={`polestar_detail_header_${column.title}`}>{column.title}</Table.HeaderCell>
								}
								else {
									return <Table.HeaderCell key={`polestar_detail_header_${column.title}`} textAlign='center'>{column.title}</Table.HeaderCell>
								}
							})}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{renderPolestarRow(polestar, 1)}
					</Table.Body>
				</Table>
				{polestar.owned_crate_count > 0 && (
					<Message>
						<PolestarConstellations
							polestar={polestar}
							setActiveConstellation={(constellation: string) => { setActiveConstellation(constellation); setActivePolestar(''); }}
							setActivePolestar={setActivePolestar}
						/>
					</Message>
				)}
				{renderUnlockableCrew(polestar)}
			</div>
		);
	}

	function renderUnlockableCrew(polestar: IPolestar): JSX.Element {
		const allPolestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];
		const ownedPolestars = allPolestars.filter(polestar => polestar.owned > 0);
		const unlockableCrew = rosterCrew.filter(crew =>
			[ActionableState.Viable, ActionableState.PostTailor].includes(crew.actionable) &&
				crew.unique_polestar_combos?.some(upc =>
					upc.every(trait => filterTraits(polestar, trait) || ownedPolestars.some(op => filterTraits(op, trait)))
				)
		);

		if (unlockableCrew.length === 0)
			return (
				<p>
					{polestar.owned > 0 ? t('retrieval.you_own_n_of_the_polestar', { n: `${polestar.owned}`, polestar: polestar.name }) + ' ' : ''}
					{polestar.owned > 0 && t('retrieval.prospects.acquisition.more_not_guaranteed')}
					{polestar.owned <= 0 && t('retrieval.prospects.acquisition.not_guaranteed')}
				</p>
			);

		return (
			<React.Fragment>
	 			<p>{tfmt('retrieval.prospects.acquisition.acquire_to_retrieve_colon', { polestar: <b>{polestar.name}</b> })}</p>
	 			<Grid centered padded stackable>
	 				{unlockableCrew.sort((a, b) => a.name.localeCompare(b.name)).map((crew, cdx) => (
	 					<Grid.Column key={crew.symbol} width={2} textAlign='center'>
							<span style={{ display: 'inline-block' }}>
								<AvatarView
									mode='crew'
									size={64}
									item={crew}
									partialItem={true}
									targetGroup='polestar_prospect_modal'
								/>
							</span>
	 						<div>{crew.name}</div>
	 					</Grid.Column>
	 				))}
	 			</Grid>
				<CrewHoverStat targetGroup='polestar_prospect_modal' modalPositioning />
			</React.Fragment>
		)
	}

	function updateProspect(polestar: string, increase: boolean): void {
		if (polestar === '') return;
		if (increase) {
			pendingAdded.push(polestar);
		}
		else {
			const prospectNum = pendingAdded.indexOf(polestar);
			if (prospectNum >= 0) pendingAdded.splice(prospectNum, 1);
		}
		setPendingAdded([...pendingAdded]);
	}
};

type ProspectInventoryProps = {
	polestar: string;
	loaned: number;
	updateProspect: (polestar: string, increase: boolean) => void;
}

const ProspectInventory = (props: ProspectInventoryProps) => {
	const { polestar, updateProspect } = props;

	const [loaned, setLoaned] = React.useState<number>(props.loaned);

	return (
		<React.Fragment>
			{loaned > 0 && <Button size='mini' circular icon='minus' onClick={(e) => { removeProspect(polestar); e.stopPropagation(); }} />}
			{loaned > 0 ? <span style={{ margin: '0 .5em' }}>{loaned}</span> : ''}
			<Button size='mini' circular icon='add' onClick={(e) => { addProspect(polestar); e.stopPropagation(); }} />
		</React.Fragment>
	);

	function addProspect(polestar: string): void {
		setLoaned(loaned+1);
		updateProspect(polestar, true);
	}

	function removeProspect(polestar: string): void {
		setLoaned(loaned-1);
		updateProspect(polestar, false);
	}
};

