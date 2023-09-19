import React, { Component } from 'react';
import { Header, Table, Rating, Icon, Step } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { SearchableTable, ITableConfigRow, initSearchableOptions, initCustomOption, prettyCrewColumnTitle } from '../components/searchabletable';
import Announcement from '../components/announcement';

import CONFIG from '../components/CONFIG';
import { applyCrewBuffs, formatTierLabel, getSkills, isImmortal, prepareProfileData, printPortalStatus } from '../utils/crewutils';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import CABExplanation from '../components/cabexplanation';
import { CrewMember } from '../model/crew';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';
import { CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { TinyStore } from '../utils/tiny';
import { descriptionLabel } from '../components/crewtables/commonoptions';
import ProfileCrew from '../components/profile_crew';
import { useStateWithStorage } from '../utils/storage';

const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

type IndexPageProps = {
	location: any;
};

interface Lockable {
	symbol: string;
	name: string;
};

export interface CrewViewMode {
	hasPlayer: number;
	noPlayer: number;
	playerAllowedModes: number[];
	noPlayerAllowedModes: number[];
}

const IndexPage = (props: IndexPageProps) => {

	const context = React.useContext(GlobalContext);
	const playerPresent = !!context.player.playerData?.player?.character?.crew?.length;

	const [buffMode, setBuffMode] = useStateWithStorage<string | undefined>('indexBoosts', "Max Boosts");

	const defaultMode = {
		hasPlayer: 1,
		noPlayer: 0,
		playerAllowedModes: [0, 1, 2],
		noPlayerAllowedModes: [0]
	} as CrewViewMode;

	const [stepMode, setStepMode] = useStateWithStorage<CrewViewMode>('indexMode', defaultMode, { rememberForever: true });
	const [altRoster, setAltRoster] = React.useState<PlayerCrew[] | undefined>([]);

	const maxBuffs = context.maxBuffs;
	const playerBuffs = context.player.buffConfig;
	const hasPlayer = !!context.player.playerData?.player?.character?.crew?.length;

	if (!stepMode.noPlayerAllowedModes?.length || !stepMode.playerAllowedModes?.length) {
		throw new Error("Cannot initialize with no allowable modes!");
	}

	const getMode = () => {
		if (hasPlayer) return stepMode.hasPlayer;
		else return stepMode.noPlayer;
	}

	const setMode = (mode: number) => {
		setAltRoster([]);
		window.setTimeout(() => {
			if (hasPlayer) {
				if (!stepMode.playerAllowedModes.includes(mode)) {
					setStepMode({ ... stepMode, hasPlayer: stepMode.playerAllowedModes[0] });
				}
				else {
					setStepMode({ ... stepMode, hasPlayer: mode });
				}
			}
			else {
				if (!stepMode.noPlayerAllowedModes.includes(mode)) {
					setStepMode({ ... stepMode, noPlayer: stepMode.noPlayerAllowedModes[0] });
				}
				else {
					setStepMode({ ... stepMode, noPlayer: mode });
				}
			}
		});
	}

	const mode = getMode();

	React.useEffect(() => {

		const newRoster = context.core.crew.map(crew => {
			let map = {
				... JSON.parse(JSON.stringify(crew)),
				immortal: CompletionState.DisplayAsImmortalStatic,
				level: context.player.playerData?.player.character.max_level ?? 100, // crew.max_level,   /* this property does not exist on core.crew!!! */
				rarity: crew.max_rarity,
				have: false,
				date_added: crew.date_added,
				command_skill: { core: 0, min: 0, max: 0 },
				medicine_skill: { core: 0, min: 0, max: 0 },
				security_skill: { core: 0, min: 0, max: 0 },
				diplomacy_skill: { core: 0, min: 0, max: 0 },
				engineering_skill: { core: 0, min: 0, max: 0 },
				science_skill: { core: 0, min: 0, max: 0 },
			} as PlayerCrew;

			if (hasPlayer && mode !== 0) {
				let pc = context.player.playerData?.player?.character?.crew?.find(f => f.symbol === crew.symbol);
				if (pc) {
					map = { ... map, ... JSON.parse(JSON.stringify(pc)) };
					map.have = true;
				}
				else {
					map.rarity = 0;
				}
			}
			for (let skill of getSkills(crew)) {
				if (!(skill in map) || !map[skill].core) map[skill] = {
					core: crew.base_skills[skill].core,
					max: crew.base_skills[skill].range_max,
					min: crew.base_skills[skill].range_min,
				}
				map.skills ??= {};
				if (!(skill in map.skills)) map.skills[skill] = { ... crew.base_skills[skill] };
			}
			if (buffMode === 'Max Boosts' && maxBuffs) {
				applyCrewBuffs(map, maxBuffs);
			}
			else if (buffMode === 'Player Boosts' && playerBuffs && hasPlayer) {
				applyCrewBuffs(map, playerBuffs);
			}

			return map;
		}).filter(fc => mode !== 1 || fc.have);
		setAltRoster(newRoster);

	}, [stepMode, buffMode, context]);

	return (
		<DataPageLayout pageTitle='Crew Stats' playerPromptType='recommend'>


			<React.Fragment>
				<Announcement />

				<Step.Group fluid>
					<Step active={mode === 0} onClick={() => setMode(0)}>
						<Icon name='game' />
						<Step.Content>
							<Step.Title>Game Roster</Step.Title>
							<Step.Description>Overview of all crew in the game.</Step.Description>
						</Step.Content>
					</Step>
					<Step disabled={!hasPlayer} active={mode === 1} onClick={() => setMode(1)}>
						<img src='/media/crew_icon.png' style={{width:"3em", marginRight: "1em"}} />
						<Step.Content>
							<Step.Title>Owned Crew</Step.Title>
							<Step.Description>View only your owned crew.</Step.Description>
						</Step.Content>
					</Step>
					<Step disabled={!hasPlayer} active={mode === 2} onClick={() => setMode(2)}>
						<Icon name='table' />
						<Step.Content>
							<Step.Title>All Crew</Step.Title>
							<Step.Description>View all crew and owned status.</Step.Description>
						</Step.Content>
					</Step>
				</Step.Group>

				{(!altRoster?.length) && <div style={{height: "100vh", display: "flex", flexDirection: "column", alignItems: "center"}}>{context.core.spin ? context.core.spin() : <></>}</div> ||
				<ProfileCrew
					buffMode={buffMode}
					setBuffMode={setBuffMode}
					showUnownedCrew={mode === 2}
					setShowUnownedCrew={undefined}
					isTools={playerPresent}
					hideAdvancedTools={mode !== 1}
					location={"/"}
					alternateRoster={altRoster} />}
				{/* <CrewStats location={props.location} /> */}
			</React.Fragment>
		</DataPageLayout>
	);
};

type CrewStatsProps = {
	location: any;
};

type CrewStatsState = {
	tableConfig: any[];
	customColumns: string[];
	initOptions: any;
	lockable: any[];
	hoverCrew?: CrewMember | PlayerCrew;
	botcrew: (CrewMember | PlayerCrew)[],
	playerCrew?: (CrewMember | PlayerCrew)[],
	processedData?: PlayerData,
	mode: "all" | "unowned" | "owned";
};

class CrewStats extends Component<CrewStatsProps, CrewStatsState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	readonly tiny: TinyStore;

	constructor(props: CrewStatsProps | Readonly<CrewStatsProps>) {
		super(props);
		this.tiny = TinyStore.getStore('index_page');

		let mode = this.tiny.getValue<string>('mode', 'all');
		this.state = {
			botcrew: [],
			tableConfig: [],
			customColumns: [],
			initOptions: false,
			lockable: [],
			mode
		} as CrewStatsState;
	}

	componentWillUnmount(): void {
	}

	setState<K extends keyof CrewStatsState>(state: CrewStatsState | ((prevState: Readonly<CrewStatsState>, props: Readonly<CrewStatsProps>) => CrewStatsState | Pick<CrewStatsState, K> | null) | Pick<CrewStatsState, K> | null, callback?: (() => void) | undefined): void {
		super.setState(state);
		if (state && 'mode' in state) this.tiny.setValue('mode', state.mode);
	}

	readonly setActiveCrew = (value: PlayerCrew | CrewMember | null | undefined): void => {
		this.setState({ ... this.state, hoverCrew: value ?? undefined });
	}

	async componentDidMount() {
		const botcrew = JSON.parse(JSON.stringify(this.context.core.crew)) as (CrewMember | PlayerCrew)[];
		let playerData = this.context.player.playerData;

		const playerCrew: PlayerCrew[] | undefined = undefined; // playerData?.player?.character?.crew;

		let c = botcrew?.length ?? 0;
		for (let i = 0; i < c; i++) {
			let crew = botcrew[i];
			// Add dummy fields for sorting to work
			CONFIG.SKILLS_SHORT.forEach(skill => {
				crew[skill.name] = crew.base_skills[skill.name] ? crew.base_skills[skill.name].core : 0;
			});

			let bcrew = crew as PlayerCrew;
			let f: PlayerCrew | undefined = undefined;

			bcrew.immortal = CompletionState.DisplayAsImmortalStatic;
		}

		// Check for custom initial table options from URL or <Link state>
		const initOptions = initSearchableOptions(this.props.location);
		// Check for custom initial index options from URL or <Link state>
		const initHighlight = initCustomOption(this.props.location, 'highlight', '');
		// Clear history state now so that new stored values aren't overriden by outdated parameters
		if (this.props.location.state && (initOptions || initHighlight))
			window.history.replaceState(null, '');

		const tableConfig: ITableConfigRow[] = [
			{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'events', 'collections.length', 'date_added'] },
			{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true },
			{ width: 1, column: 'bigbook_tier', title: 'Tier' },
			{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
			{ width: 1, column: 'ranks.voyRank', title: 'Voyage' }
		];
		CONFIG.SKILLS_SHORT.forEach((skill) => {
			tableConfig.push({
				width: 1,
				column: `${skill.name}`,
				title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
				reverse: true
			});
		});
		// Check for custom columns (currently only available from URL/state)
		const customColumns = [] as string[];
		if (initOptions && initOptions.column && tableConfig.findIndex(col => col.column === initOptions.column) == -1)
			customColumns.push(initOptions.column);
		customColumns.forEach(column => {
			tableConfig.push({
				width: 1,
				column: column,
				title: prettyCrewColumnTitle(column)
			});
		});

		tableConfig.push({
			width: 1,
			column: `in_portal`,
			title: "In Portal"
		});

		const lockable = [] as Lockable[];
		if (initHighlight != '') {
			const highlighted = botcrew.find(c => c.symbol === initHighlight);
			if (highlighted) {
				lockable.push({
					symbol: highlighted.symbol,
					name: highlighted.name
				});
			}
		}

		this.setState({ botcrew, tableConfig, customColumns, initOptions, lockable, playerCrew, processedData: playerData });
	}

	renderTableRow(crew: CrewMember | PlayerCrew, idx: number, highlighted: boolean): JSX.Element {
		const { customColumns, playerCrew } = this.state;
		const attributes = {
			positive: highlighted
		};
		const { playerData } = this.context.player;

		const counts = [
			{ name: 'event', count: crew.events },
			{ name: 'collection', count: crew.collections.length }
		];
		const formattedCounts = counts.map((count, idx) => (
			<span key={idx} style={{ whiteSpace: 'nowrap' }}>
				{count.count} {count.name}{count.count != 1 ? 's' : ''}{idx < counts.length-1 ? ',' : ''}
			</span>
		)).reduce((prev, curr) => <>{prev} {curr}</>);

		const targetCrew = playerData?.player?.character?.crew?.find((te) => te.symbol === crew.symbol);

		return (
			<Table.Row key={crew.symbol} {...attributes}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}>
						<div style={{ gridArea: 'icon', display: 'flex' }}>

							<CrewTarget
								targetGroup='indexPage'

								inputItem={targetCrew ?? crew}>
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>
							{("immortal" in crew && crew.immortal !== CompletionState.DisplayAsImmortalUnowned && crew.immortal !== CompletionState.DisplayAsImmortalStatic) &&
								descriptionLabel(crew, true) || formattedCounts}
						</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={"rarity" in crew ? crew.rarity : crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				<Table.Cell textAlign="center">
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

				{customColumns.map(column => {
					const value = column.split('.').reduce((prev, curr) => (prev && prev[curr]) ? prev[curr] : undefined, crew as any) as number;
					if (value) {
						return (
							<Table.Cell key={column} textAlign='center'>
								<b>{value}</b>
							</Table.Cell>
						);
					}
					else {
						return (<Table.Cell key={column} />);
					}
				})}
				<Table.Cell key='in_portal' textAlign='center'>
					<b title={printPortalStatus(crew, true, true, true)}>{printPortalStatus(crew, true, false)}</b>
				</Table.Cell>
			</Table.Row>
		);
	}

	render() {
		const { botcrew, tableConfig, initOptions, lockable, mode } = this.state;
		const { playerData } = this.context.player;
		const checkableValue = undefined; // playerData?.player?.character?.crew?.length ? (mode === 'all' ? undefined : (mode === 'unowned' ? true : false)) : undefined;
		const caption = undefined; // playerData?.player?.character?.crew?.length ? 'Show only unowned crew' : undefined;

		const me = this;

		const setCheckableValue = (value?: boolean) => {
			if (value === true) {
				me.setState({ ... me.state, mode: 'unowned' })
			}
			else {
				me.setState({ ... me.state, mode: 'all' })
			}
		}

		if (!botcrew || botcrew.length === 0) {
			return (
				<React.Fragment>
					<Icon loading name='spinner' /> Loading...
				</React.Fragment>
			);
		}

		let preFiltered = botcrew;

		if (playerData && mode !== 'all') {
			preFiltered = preFiltered.filter((c) => {
				let item = c as PlayerCrew;

				if (item && mode === 'owned') {
					return !(item.immortal === CompletionState.DisplayAsImmortalUnowned);
				}
				else if (item && mode === 'unowned') {
					return (item.immortal === CompletionState.DisplayAsImmortalUnowned);
				}

				return true;
			});
		}

		return (
			<React.Fragment>
				<Header as='h2'>Crew stats</Header>
				<div>
					<SearchableTable
						toolCaption={caption}
						checkableValue={checkableValue}
						setCheckableValue={setCheckableValue}
						checkableEnabled={playerData !== undefined}
						id="index"
						data={preFiltered}
						config={tableConfig}
						renderTableRow={(crew, idx, highlighted) => this.renderTableRow(crew, idx ?? -1, highlighted ?? false)}
						filterRow={(crew, filter, filterType) => crewMatchesSearchFilter(crew, filter, filterType)}
						initOptions={initOptions}
						showFilterOptions={true}
						showPermalink={true}
						lockable={lockable}
					/>
					<CrewHoverStat targetGroup='indexPage' />
				</div>
			</React.Fragment>
		);
	}
}

export default IndexPage;
