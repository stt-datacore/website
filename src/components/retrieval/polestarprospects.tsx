import React from 'react';
import { Button, Dropdown, Grid, Icon, Message, Modal, Table } from 'semantic-ui-react';

import { Filter } from '../../model/game-elements';

import ItemDisplay from '../../components/itemdisplay';
import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';

import { ActionableState, IConstellation, IPolestar } from './model';
import { RetrievalContext } from './context';
import { ConstellationPolestars, PolestarConstellations } from './constellations';
import { filterTraits } from './utils';

interface IPolestarData extends IPolestar {
	loaned: number;
};

export const PolestarProspectsModal = () => {
	const { allKeystones, rosterCrew, polestarTailors, setPolestarTailors } = React.useContext(RetrievalContext);

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

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={<Button color={buttonColor}><Icon name='add' />{addedPolestars.length}</Button>}
			size='large'
		>
			<Modal.Header>Add Prospective Polestars</Modal.Header>
			<Modal.Content scrolling>
				{renderContent()}
			</Modal.Content>
			<Modal.Actions>
				{activePolestar !== '' && <Button icon='backward' content='Return to polestars' onClick={() => setActivePolestar('')} />}
				<Button onClick={() => setModalIsOpen(false)}>Close</Button>
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
		const polestarTable: ITableConfigRow[] = [
			{ width: 2, column: 'name', title: 'Polestar' },
			{ width: 1, column: 'crew_count', title: 'Crew in Portal', reverse: true },
			{ width: 1, column: 'crate_count', title: 'Constellation Chance', reverse: true },
			{ width: 1, column: 'scan_odds', title: 'Scan Chance', reverse: true },
			{ width: 1, column: 'owned_best_odds', title: 'Best Chance', reverse: true },
			{ width: 1, column: 'owned', title: 'Owned', reverse: true },
			{ width: 1, column: 'loaned', title: 'Added', reverse: true }
		];

		const constellationList = [
			{ key: 'none', value: '', text: 'Show all polestars' }
		];
		ownedConstellations.forEach(c => {
			constellationList.push({ key: c.symbol, value: c.symbol, text: c.name });
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
						placeholder='Filter polestars by owned constellation'
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
								<p>Search for polestars by name.</p>
							</div>
						}
					/>
					<p>
						<i>Constellation Chance</i>: your chance of acquiring any constellation with the polestar from a successful scan.
						<br /><i>Scan Chance</i>: your overall chance of acquiring the polestar from a successful scan.
						<br /><i>Best Chance</i>: your best chance of acquiring the polestar from a constellation in your inventory.
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
				onClick={() => setActivePolestar(activePolestar !== polestar.symbol ? polestar.symbol : '')}
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
			</Table.Row>
		);
	}

	function renderConstellationMessage(data: IPolestar[]): JSX.Element {
		if (activeConstellation === '') return <></>;

		const constellation = allKeystones.find(k => k.symbol === activeConstellation) as IConstellation | undefined;
		if (!constellation) return <></>;

		const unownedPolestars = data.filter(p => p.owned === 0);

		if (unownedPolestars.length === 0)
			return (<Message>You already own all polestars in the {constellation.name}.</Message>);

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
							<Table.HeaderCell>Polestar</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>Crew in Portal</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>Constellation Chance</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>Scan Chance</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>Best Chance</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>Owned</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>Added</Table.HeaderCell>
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
					{polestar.owned > 0 ? `You own ${polestar.owned} of the ${polestar.name}. ` : ''}
					Acquiring{polestar.owned > 0 ? ` more of ` : ` `}this polestar will not unlock guaranteed retrievals for any new crew.
				</p>
			);

		return (
			<React.Fragment>
	 			<p>Acquire the <b>{polestar.name}</b> to unlock guaranteed retrievals for the following crew:</p>
	 			<Grid centered padded stackable>
	 				{unlockableCrew.sort((a, b) => a.name.localeCompare(b.name)).map((crew, cdx) => (
	 					<Grid.Column key={crew.symbol} width={2} textAlign='center'>
							<span style={{ display: 'inline-block' }}>
								<ItemDisplay
									src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
									size={64}
									maxRarity={crew.max_rarity}
									rarity={crew.highest_owned_rarity ?? 0}
								/>
							</span>
	 						<div>{crew.name}</div>
	 					</Grid.Column>
	 				))}
	 			</Grid>
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

