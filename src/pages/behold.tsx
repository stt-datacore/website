import React from 'react';
import { Header, Button, Segment, Table, Rating, Message, Popup } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import Layout from '../components/layout';
import CrewPicker from '../components/crewpicker';
import { CrewPresenter } from '../components/item_presenters/crew_presenter';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';

import CONFIG from '../components/CONFIG';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { useStateWithStorage } from '../utils/storage';
import CABExplanation from '../components/cabexplanation';
import { CrewMember } from '../model/crew';
import { PlayerCrew, PlayerData } from '../model/player';
import { PlayerContext } from '../context/playercontext';
import { DataContext } from '../context/datacontext';
import { MergedContext } from '../context/mergedcontext';
import { formatTierLabel, crewCopy } from '../utils/crewutils';
import { OptionsBase, OptionsModal, OptionGroup, OptionsModalProps } from '../components/base/optionsmodal_base';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import CommonCrewData from '../components/commoncrewdata';

import marked from 'marked';

type BeholdsPageProps = {
	location: any;
};

const BeholdsPage = (props: BeholdsPageProps) => {
	const coreData = React.useContext(DataContext);
	const playerContext = React.useContext(PlayerContext);

	const isReady = coreData.ready ? coreData.ready(['all_buffs', 'crew', 'items']) : false;

	let crewFromUrl = [] as string[];
	if (props.location) {
		const urlParams = new URLSearchParams(props.location.search);
		if (urlParams.has('crew')) crewFromUrl = urlParams.getAll('crew');
	}

	return (
		<Layout title='Behold helper'>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>Loading data...</div>
			}
			{isReady &&
				<React.Fragment>
					<MergedContext.Provider value={{
						allCrew: coreData.crew,
						items: coreData.items,
						playerData: {} as PlayerData,	/* Disable support for playerData until global player finalized */
						maxBuffs: playerContext.maxBuffs
					}}>
						<Header as='h2'>Behold helper</Header>
						<CrewSelector crewList={coreData.crew} initSelection={crewFromUrl} />
					</MergedContext.Provider>
				</React.Fragment>
			}
		</Layout>
	);
};

type CrewSelectorProps = {
	crewList: (PlayerCrew | CrewMember)[];
	initSelection: string[];
};

const CrewSelector = (props: CrewSelectorProps) => {
	const [selectedCrew, setSelectedCrew] = useStateWithStorage<string[]>('behold/crew', props.initSelection);
	const [options, setOptions] = React.useState<BeholdModalOptions>(DEFAULT_BEHOLD_OPTIONS);

	const crewList = crewCopy<PlayerCrew | CrewMember>(props.crewList)
		.sort((a, b) => a.name.localeCompare(b.name));

	const filterCrew = (data: (PlayerCrew | CrewMember)[], searchFilter: string = ''): (PlayerCrew | CrewMember)[] => {
		// Filtering
		const portalFilter = (crew: PlayerCrew | CrewMember) => {
			if (options.portal.slice(0, 6) === 'portal' && !crew.in_portal) return false;
			if (options.portal === 'portal-unique' && (crew.unique_polestar_combos?.length ?? 0) === 0) return false;
			if (options.portal === 'portal-nonunique' && (crew.unique_polestar_combos?.length ?? 0) > 0) return false;
			if (options.portal === 'nonportal' && crew.in_portal) return false;
			return true;
		};
		const query = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(searchFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
		data = data.filter(crew =>
			true
				&& crew.series
				&& (options.portal === '' || portalFilter(crew))
				&& (options.series.length === 0 || options.series.includes(crew.series))
				&& (options.rarities.length === 0 || options.rarities.includes(crew.max_rarity))
				&& (searchFilter === '' || (query(crew.name) || query(crew.short_name)))
		);

		return data;
	};

	const permalink = selectedCrew.reduce((prev, curr) => { if (prev !== '') prev += '&'; return prev+'crew='+curr; }, '');

	return (
		<React.Fragment>
			<CrewPicker defaultOptions={DEFAULT_BEHOLD_OPTIONS} pickerModal={BeholdOptionsModal}
				options={options} setOptions={setOptions}
				crewList={crewList} filterCrew={filterCrew} handleSelect={onCrewPick}
			/>
			<CrewDetails selectedCrew={selectedCrew} crewList={crewList}
				handleDismiss={onCrewDismiss} handleDismissAll={onCrewDismissAll}
			/>
			{selectedCrew.length > 0 && <CrewTable selectedCrew={selectedCrew} crewList={crewList} />}
			{selectedCrew.length > 0 &&
				<Message style={{ marginTop: '2em' }}>
					<Message.Header>Share This Page</Message.Header>
					<p>Want advice on these crew? You can share a <Link to={`/behold?${permalink}`}>permalink</Link> to this page for easier sharing on Discord or other forums.</p>
					<Popup
						content='Copied!'
						on='click'
						position='right center'
						size='tiny'
						trigger={
							<Button icon='clipboard' content='Copy permalink to clipboard'
								onClick={() => navigator.clipboard.writeText(`${process.env.GATSBY_DATACORE_URL}/behold?${permalink}`)}
							/>
						}
					/>
				</Message>
			}
		</React.Fragment>
	);

	function onCrewPick(crew: PlayerCrew | CrewMember): void {
		if (!selectedCrew.includes(crew.symbol)) {
			selectedCrew.push(crew.symbol);
			setSelectedCrew([...selectedCrew]);
		}
	}

	function onCrewDismiss(selectedIndex: number): void {
		selectedCrew.splice(selectedIndex, 1);
		setSelectedCrew([...selectedCrew]);
	}

	function onCrewDismissAll(): void {
		setSelectedCrew([] as string[]);
	}
};

type CrewDetailsProps = {
	selectedCrew: string[];
	crewList: (PlayerCrew | CrewMember)[];
	handleDismiss: (selectedIndex: number) => void;
	handleDismissAll: () => void;
};

const CrewDetails = (props: CrewDetailsProps) => {
	const { allCrew } = React.useContext(MergedContext);
	const { selectedCrew } = props;

	const data = [] as (CrewMember | PlayerCrew)[];
	selectedCrew.forEach(symbol => {
		const crew = props.crewList.find(crew => crew.symbol === symbol);
		if (!crew) {
			console.error(`Crew ${symbol} not found in crew.json!`);
			return;
		}
		data.push(crew);
	});

	let segmentWidth = '32%';
	if (data.length === 1) segmentWidth = '96%';
	else if (data.length === 2) segmentWidth = '48%';

	return (
		<div style={{ marginTop: '2em' }}>
			{selectedCrew.length > 0 &&
				<div style={{ margin: '1em 0', textAlign: 'right' }}>
					<Button icon='add user' color='green'
						content='Preview all in your roster'
						onClick={() => addProspects(selectedCrew)}
					/>
					<Button icon='ban'
						content='Dismiss all'
						onClick={() => props.handleDismissAll()}
					/>
				</div>
			}
			<div style={{
				display: "flex",
				flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
				flexWrap: "wrap",
				justifyContent: "center"
			}}>
				{data.map((crew, idx) => (
					<Segment key={crew.symbol}
						style={{
							width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : segmentWidth,
							margin: "0 0.5em 0 0",
							marginBottom: window.innerWidth < DEFAULT_MOBILE_WIDTH ? '0.5em' : (idx === data.length - 1 ? '1em': undefined)
						}}
					>
						<CrewPresenter
							forceVertical={data.length >= 3 ? true : false}
							width={window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : '100%'}
							imageWidth={window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : '50%'}
							selfRender={true}
							selfPrepare={true}
							storeName='beholdsPage'
							hover={window.innerWidth < DEFAULT_MOBILE_WIDTH}
							crew={crew} />
						<CommonCrewData
							ultraCompact={true}
							roster={allCrew}
							compact={true}
							crew={crew}  />
						<div style={{ marginTop: '1em' }}>
							{crew.markdownContent && <div dangerouslySetInnerHTML={{ __html: marked.parse(crew.markdownContent) }} style={{ fontSize: '1.1em' }} />}
							<div style={{ marginTop: '1em', textAlign: 'right' }}>
								<a href={`https://www.bigbook.app/crew/${crew.symbol}`} target='_blank'>
									View {crew.name} on Big Book
								</a>
							</div>
						</div>
						<div style={{ marginTop: '1em', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
							<Button compact icon='add user' color='green'
								content={`Preview in your roster`}
								onClick={() => addProspects([crew.symbol])}
							/>
							<Button compact icon='ban'
								content='Dismiss'
								onClick={() => { props.handleDismiss(idx); }}
							/>
						</div>
					</Segment>
				))}
			</div>
		</div>
	);

	function addProspects(crewSymbols: string[]): void {
		const linkUrl = '/playertools?tool=crew';
		const linkState = {
			prospect: crewSymbols
		};
		navigate(linkUrl, { state: linkState });
	}
};

type CrewTableProps = {
	selectedCrew: string[];
	crewList: (PlayerCrew | CrewMember)[];
};

const CrewTable = (props: CrewTableProps) => {
	const { selectedCrew } = props;

	const data = [] as (CrewMember | PlayerCrew)[];
	selectedCrew.forEach(symbol => {
		const crew = props.crewList.find(crew => crew.symbol === symbol);
		if (!crew) {
			console.error(`Crew ${symbol} not found in crew.json!`);
			return;
		}
		// Add dummy fields for sorting to work
		CONFIG.SKILLS_SHORT.forEach(skill => {
			crew[skill.name] = crew.base_skills[skill.name] ? crew.base_skills[skill.name].core : 0;
		});
		crew.unique_polestar_combos = crew.unique_polestar_combos ?? [];
		data.push(crew);
	});

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'date_added'] },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true },
		{ width: 1, column: 'bigbook_tier', title: 'Tier' },
		{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
		{ width: 1, column: 'ranks.voyRank', title: 'Voyage' },
		{ width: 1, column: 'ranks.gauntletRank', title: 'Gauntlet' },
		{ width: 1, column: 'collections.length', title: 'Collections', reverse: true },
		{ width: 1, column: 'events', title: 'Events', reverse: true },
		{ width: 1, column: 'unique_polestar_combos.length', title: <>Unique<br />Retrievals</>, reverse: true, tiebreakers: ['in_portal'] },
		{ width: 1, column: 'factionOnlyTotal', title: <>Faction Items<br /><small>Build Cost</small></> },
		{ width: 1, column: 'totalChronCost', title: <><img src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} alt='Chroniton' style={{ height: '1em' }} /><br /><small>Build Cost</small></> },
		{ width: 1, column: 'craftCost', title: <><img src={`${process.env.GATSBY_ASSETS_URL}currency_sc_currency_0.png`} alt='Credit' style={{ height: '1.1em' }} /><br /><small>Build Cost</small></> }
	];
	CONFIG.SKILLS_SHORT.forEach((skill) => {
		tableConfig.push({
			width: 1,
			column: `${skill.name}`,
			title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
			reverse: true
		});
	});

	const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

	return (
		<div style={{ marginTop: '2em' }}>
			<SearchableTable
				id='behold'
				data={data}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderTableRow(crew, idx ?? -1)}
				filterRow={(crew, filter, filterType) => crewMatchesSearchFilter(crew, filter, filterType)}
				showFilterOptions={true}
			/>
			<CrewHoverStat targetGroup='beholdsPage' />
		</div>
	);

	function renderTableRow(crew: CrewMember | PlayerCrew, idx: number): JSX.Element {
		let bestGPair = '', bestGRank = 1000;
		Object.keys(crew.ranks).forEach(key => {
			if (key.slice(0, 1) === 'G') {
				if (crew.ranks[key] < bestGRank) {
					bestGPair = key.slice(2).replace('_', '/');
					bestGRank = crew.ranks[key];
				}
			}
		});

		return (
			<Table.Row key={crew.symbol}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}>
						<div style={{ gridArea: 'icon' }}>
							<CrewTarget targetGroup='beholdsPage' inputItem={crew}>
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{formatTierLabel(crew)}</b>
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>{crew.cab_ov}</b><br />
					<small>{rarityLabels[crew.max_rarity-1]} #{crew.cab_ov_rank}</small>
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>#{crew.ranks.voyRank}</b><br />
					{crew.ranks.voyTriplet && <small>Triplet #{crew.ranks.voyTriplet.rank}</small>}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>#{crew.ranks.gauntletRank}</b>
					{bestGPair !== '' && <><br /><small>{bestGPair} #{bestGRank}</small></>}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{crew.collections.length}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{crew.events}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{!crew.in_portal ? 'N/A' : (crew.unique_polestar_combos?.length ?? 0)}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{crew.factionOnlyTotal}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{crew.totalChronCost}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{crew.craftCost}
				</Table.Cell>
				{CONFIG.SKILLS_SHORT.map(skill =>
					crew.base_skills[skill.name] ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{crew.base_skills[skill.name].core}</b>
							<br />
							+({crew.base_skills[skill.name].range_min}-{crew.base_skills[skill.name].range_max})
						</Table.Cell>
					) : (
						<Table.Cell key={skill.name} />
					)
				)}
			</Table.Row>
		);
	}
};

export interface BeholdModalOptions extends OptionsBase {
	portal: string;
	series: string[];
	rarities: number[];
}

export const DEFAULT_BEHOLD_OPTIONS = {
	portal: '',
	series: [],
	rarities: []
} as BeholdModalOptions;

export class BeholdOptionsModal extends OptionsModal<BeholdModalOptions> {
	state: { isDefault: boolean; isDirty: boolean; options: any; modalIsOpen: boolean; };
	props: any;

    protected getOptionGroups(): OptionGroup[] {
        return [
            {
                title: "Filter by retrieval option:",
                key: 'portal',
                options: BeholdOptionsModal.portalOptions,
                multi: false,
				initialValue: ''
            },
            {
                title: "Filter by series:",
                key: 'series',
                multi: true,
                options: BeholdOptionsModal.seriesOptions,
				initialValue: [] as string[]
            },
            {
                title: "Filter by rarity:",
                key: "rarities",
                multi: true,
                options: BeholdOptionsModal.rarityOptions,
				initialValue: [] as number[]
            }]
    }
    protected getDefaultOptions(): BeholdModalOptions {
        return DEFAULT_BEHOLD_OPTIONS;
    }

	static readonly portalOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'portal', value: 'portal', text: 'Only show retrievable crew' },
		{ key: 'portal-unique', value: 'portal-unique', text: 'Only show uniquely retrievable crew' },
		{ key: 'portal-nonunique', value: 'portal-nonunique', text: 'Only show non-uniquely retrievable crew' },
		{ key: 'nonportal', value: 'nonportal', text: 'Only show non-retrievable crew' }
	];

	static readonly seriesOptions = [
		{ key: 'tos', value: 'tos', text: 'The Original Series' },
		{ key: 'tas', value: 'tas', text: 'The Animated Series' },
		{ key: 'tng', value: 'tng', text: 'The Next Generation' },
		{ key: 'ds9', value: 'ds9', text: 'Deep Space Nine' },
		{ key: 'voy', value: 'voy', text: 'Voyager' },
		{ key: 'ent', value: 'ent', text: 'Enterprise' },
		{ key: 'dsc', value: 'dsc', text: 'Discovery' },
		{ key: 'pic', value: 'pic', text: 'Picard' },
		{ key: 'low', value: 'low', text: 'Lower Decks' },
		{ key: 'snw', value: 'snw', text: 'Strange New Worlds' },
		{ key: 'original', value: 'original', text: 'Timelines Originals' }
	];

	static readonly rarityOptions = [
		{ key: '1*', value: 1, text: '1* Common' },
		{ key: '2*', value: 2, text: '2* Uncommon' },
		{ key: '3*', value: 3, text: '3* Rare' },
		{ key: '4*', value: 4, text: '4* Super Rare' },
		{ key: '5*', value: 5, text: '5* Legendary' }
	];

	constructor(props: OptionsModalProps<BeholdModalOptions>) {
		super(props);

		this.state = {
			isDefault: false,
			isDirty: false,
			options: props.options,
			modalIsOpen: false
		}
	}

	protected checkState(): boolean {
		const { options } = this.state;

		const isDefault = options.portal === '' && options.series.length === 0 && options.rarities.length === 0;
		const isDirty = options.portal !== ''
			|| options.series.length !== this.props.options.series.length || !this.props.options.series.every(s => options.series.includes(s))
			|| options.rarities.length !== this.props.options.rarities.length || !this.props.options.rarities.every(r => options.rarities.includes(r));

		if (this.state.isDefault !== isDefault || this.state.isDirty !== isDirty) {
			this.setState({ ...this.state, isDefault, isDirty });
			return true;
		}

		return false;
	}
};

export default BeholdsPage;
