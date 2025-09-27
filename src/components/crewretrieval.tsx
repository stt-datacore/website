/**  CODE IS DEPRECATED after refactor TO src/components/retrieval/ **/

// import React from 'react';
// import { Table, Icon, Rating, Dropdown, Form, Button, Checkbox, Header, Modal, Grid, Message, Popup } from 'semantic-ui-react';
// import { Link } from 'gatsby';

// import ItemDisplay from '../components/itemdisplay';
// import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

// import { crewMatchesSearchFilter } from '../utils/crewsearch';
// import { formatTierLabel } from '../utils/crewutils';
// import { getCoolStats } from '../utils/misc';
// import { useStateWithStorage } from '../utils/storage';
// import { categorizeKeystones, Constellation, Filter, FuseGroup as FuseGroups, KeystoneBase, NumericOptions, Polestar, rarityLabels, RarityOptions, RetrievalOptions } from '../model/game-elements';
// import { BaseSkills, CrewMember } from '../model/crew';
// import { CompletionState, CryoCollection, PlayerCrew, PlayerData } from '../model/player';
// import { CrewHoverStat, CrewTarget } from './hovering/crewhoverstat';
// import { calculateBuffConfig } from '../utils/voyageutils';
// import { Energy } from '../model/boss';
// import { DataContext } from '../context/datacontext';
// import { GlobalContext } from '../context/globalcontext';
// import { navToCrewPage } from '../utils/nav';

// const RECURSION_WARN = 1000000;
// const RECURSION_FORBID = 10000000;

// const ownedFilterOptions = [
//     { key: 'ofo0', value: 'Show all crew', text: 'Show all crew' },
//     { key: 'ofo1', value: 'Only show unowned crew', text: 'Only show unowned crew' },
//     { key: 'ofo2', value: 'Only show owned crew', text: 'Only show owned crew (not FF)' },
//     { key: 'ofo3', value: 'Show all owned crew', text: 'Show all owned crew'},
// 	{ key: 'ofo4', value: 'Show all crew not FF', text: 'Show all crew (not FF)'}
// ];

// const ownedFilters = {
//     'Show all crew': _ => _ => true,
//     'Only show unowned crew': (data: PlayerCrew[]) => (crew: PlayerCrew) => !data.some((c) => crew.symbol === c.symbol),
//     'Only show owned crew': (data: PlayerCrew[]) => (crew: PlayerCrew) => data.some((c) => crew.symbol === c.symbol && c.rarity < c.max_rarity),
//     'Show all owned crew': (data: PlayerCrew[]) => (crew: PlayerCrew) => data.some(c => crew.symbol === c.symbol),
// 	'Show all crew not FF': (data: PlayerCrew[]) => (crew: PlayerCrew) => !data.some((c) => crew.symbol === c.symbol && c.rarity === c.max_rarity),
// };

// const rarityOptions: RarityOptions[] = [
// 	{ key: 'ro0', value: null, text: 'Any rarity' },
// 	{ key: 'ro2', value: '2', text: 'Minimum 2*' },
// 	{ key: 'ro3', value: '3', text: 'Minimum 3*' },
// 	{ key: 'ro4', value: '4', text: 'Minimum 4*' },
// 	{ key: 'ro5', value: '5', text: 'Minimum 5*' }
// ];

// const collectionsOptions: RarityOptions[] = [
// 	{ key: 'co0', value: null, text: 'None or any' }
// ];

// const filterTraits = (polestar: Polestar, trait: string) => {
// 	if (polestar.filter?.type === 'trait') {
// 		return polestar.filter.trait === trait;
// 	}
// 	if (polestar.filter?.type === 'rarity') {
// 		return `crew_max_rarity_${polestar.filter.rarity}` === trait;
// 	}
// 	if (polestar.filter?.type === 'skill') {
// 		return polestar.filter.skill === trait;
// 	}
// }

// type CrewRetrievalProps = {
// };

// const CrewRetrieval = (props: CrewRetrievalProps) => {
// 	const pureData = React.useContext(DataContext);
// 	const context = React.useContext(GlobalContext);

// 	const keystonesReady = pureData.ready(['keystones', 'crew']);

// 	const { playerData } = context.player;

// 	const [allKeystones, setAllKeystones] = React.useState<KeystoneBase[] | undefined>(undefined);

// 	if (!keystonesReady) {
// 		return (<><Icon loading name='spinner' /> Loading...</>);
// 	}
// 	else if (!allKeystones) {
// 		let ak = structuredClone(pureData.keystones);
// 		ak.forEach(keystone => {
// 			const owned = playerData?.forte_root.items.find(k => k.id === keystone.id);
// 			keystone.quantity = owned ? owned.quantity : 0;
// 		});
// 		setAllKeystones(ak);

// 		return (<><Icon loading name='spinner' /> Loading...</>);
// 	}

// 	if (!playerData) {
// 		return (
// 			<></>
// 		);
// 	}

// 	const ownedPolestars = allKeystones.filter(k => k.type == 'keystone' && (k.quantity ?? 0) > 0).map(obj => obj as Polestar);
// 	const allCrew = structuredClone(context.core.crew) as PlayerCrew[];

// 	// Calculate highest owned rarities
// 	allCrew.forEach(ac => {
// 		const owned = playerData.player.character.crew.filter(oc => oc.symbol === ac.symbol);
// 		if (owned && owned.length) {
// 			ac.highest_owned_rarity = owned.length > 0 ? owned.sort((a, b) => b.rarity - a.rarity)[0].rarity : 0;
// 		}
// 		else {
// 			ac.highest_owned_level = 0;
// 		}

// 	});

// 	let cArr = [...new Set(allCrew.map(a => a.collections).flat())].sort();
// 	cArr.forEach(c => {
// 		if (!collectionsOptions.find(co => co.value == c)) {
// 			let pc: CryoCollection = { progress: 'n/a', milestone: { goal: 'n/a' }, id: 0, name: ""};
// 			if (playerData.player.character.cryo_collections) {
// 				let matchedCollection = playerData.player.character.cryo_collections.find((pc) => pc.name === c);
// 				if (matchedCollection) {
// 					pc = matchedCollection;
// 				}
// 			}
// 			let kv = cArr.indexOf(c) + 1;
// 			collectionsOptions.push({
// 				key: 'co'+kv,
// 				value: c,
// 				text: c,
// 				content: (
// 					<span>{c} <span style={{ whiteSpace: 'nowrap' }}>({pc.progress} / {pc.milestone.goal || 'max'})</span></span>
// 				),
// 			});
// 		}
// 	});


// 	return (
// 		<React.Fragment>
// 			<RetrievalEnergy energy={playerData.crew_crafting_root.energy} />
// 			<RetrievalForm
// 				playerData={playerData}
// 				ownedPolestars={ownedPolestars}
// 				allCrew={allCrew}
// 				allKeystones={allKeystones}
// 				myCrew={playerData.player.character.crew}
// 			/>
// 		</React.Fragment>
// 	);
// };

// type RetrievalEnergyProps = {
// 	energy: Energy;
// };

// const RetrievalEnergy = (props: RetrievalEnergyProps) => {
// 	const { energy } = props;

// 	const qTarget = 900;
// 	const qPerFullDay = (24*60*60)/(energy.regeneration?.seconds ?? 1); // 48
// 	const qPerBoost = 50;

// 	let energyMessage = "You can guarantee a legendary crew retrieval now!";
// 	if (energy.quantity < qTarget) {
// 		const regenerationTime = getSecondsRemaining(qTarget, energy.quantity);
// 		energyMessage = `You will regenerate enough quantum to reach ${qTarget} in ${formatTime(regenerationTime)};`;
// 		let daysCanBoost = 0, qTotal = energy.quantity;
// 		while (qTotal < qTarget) {
// 			daysCanBoost++;
// 			qTotal += qPerBoost+qPerFullDay;
// 		}
// 		const timeBoosted = getSecondsRemaining(qTarget, energy.quantity+(daysCanBoost*qPerBoost));
// 		energyMessage += ` spend 90 dilithium ${daysCanBoost > 1 ? 'daily' : ''} to reach ${qTarget}`
// 			+ ` ${timeBoosted <= 0 ? 'immediately' : `in ${formatTime(timeBoosted)}`}.`;
// 	}

// 	return (
// 		<p>Quantum: <strong>{energy.quantity}</strong>. {energyMessage}</p>
// 	);

// 	function getSecondsRemaining(target: number, quantity: number): number {
// 		return ((target-quantity)*(energy.regeneration.seconds ?? 0))+energy.regenerated_at;
// 	}

// 	function formatTime(seconds: number): string {
// 		let d = Math.floor(seconds/(3600*24)),
// 			h = Math.floor(seconds%(3600*24)/3600),
// 			m = Math.floor(seconds%3600/60);
// 		if (d == 0) return `${h}h ${m}m`;
// 		return `${d}d ${h}h ${m}m`;
// 	}
// };

// type RetrievalFormProps = {
// 	ownedPolestars: Polestar[];
// 	allCrew: PlayerCrew[];
// 	allKeystones: KeystoneBase[];
// 	myCrew: PlayerCrew[];
// 	playerData: PlayerData;
// };

// const RetrievalForm = (props: RetrievalFormProps) => {
// 	const { ownedPolestars, allCrew, allKeystones, myCrew } = props;

// 	const [disabledPolestars, setDisabledPolestars] = useStateWithStorage<number[]>('crewretrieval/disabledPolestars', []);
// 	const [addedPolestars, setAddedPolestars] = useStateWithStorage<string[]>('crewretrieval/addedPolestars', []);
// 	const [ownedFilter, setOwnedFilter] = useStateWithStorage('crewretrieval/ownedFilter', ownedFilterOptions[0].value);
// 	const [minRarity, setMinRarity] = useStateWithStorage<number | null>('crewretrieval/minRarity', null);
// 	const [collection, setCollection] = useStateWithStorage<string | null>('crewretrieval/collection', null);

// 	const [polestars, setPolestars] = React.useState<Polestar[] | null>(null);
// 	const [data, setData] = React.useState<PlayerCrew[] | null>(null);
// 	const { playerData } = props;
// 	const [algo, setAlgo] = React.useState<string>('quick');
// 	const algos =
// 	[{
// 		key: "quick",
// 		value:"quick",
// 		text:"Simple Exhaustion (Fast)"
// 	},
// 	{
// 		key: "slow",
// 		value:"slow",
// 		text:"Deep Recursion (Slow)"
// 	}];

// 	// Update polestar list on filter, prospect change
// 	React.useEffect(() => {
// 		let filtered = structuredClone(ownedPolestars) as Polestar[];
// 		filtered = filtered.filter((p) => disabledPolestars.indexOf(p.id) === -1);
// 		addedPolestars.forEach((prospect) => {
// 			let existing = filtered.find(polestar => polestar.symbol === prospect);
// 			if (existing) {
// 				existing.loaned = existing.loaned ? existing.loaned + 1 : 1;
// 				existing.quantity++;
// 			}
// 			else {
// 				let keystone = allKeystones?.find(k => k.symbol === prospect);
// 				filtered.push({...keystone, quantity: 1, loaned: 1} as Polestar);
// 			}
// 		});
// 		if (filtered) setPolestars([...filtered]);
// 	}, [disabledPolestars, addedPolestars]);

// 	// Update dataset on any form change
// 	React.useEffect(() => {
// 		let retrievable = allCrew.filter(
// 			(crew) => crew.unique_polestar_combos?.some(
// 				(upc) => upc.every(
// 					(trait) => polestars?.some(op => filterTraits(op, trait))
// 				)
// 			)
// 		);

// 		retrievable = retrievable.filter(ownedFilters[ownedFilter](myCrew));
// 		if (ownedFilterOptions[2].value === ownedFilter) {
// 			retrievable = retrievable.filter(crew => (crew.max_rarity ?? 0) > (crew?.highest_owned_rarity ?? 0));
// 		}

// 		if (minRarity) {
// 			retrievable = retrievable.filter((crew) => crew.max_rarity >= minRarity);
// 		}

// 		if (collection) {
// 			retrievable = retrievable.filter((crew) => crew.collections.indexOf(collection) !== -1);
// 		}
// 		retrievable = structuredClone(retrievable) as PlayerCrew[];
// 		retrievable.forEach(ret => {
// 			let mc = myCrew.find(m => m.symbol === ret.symbol);
// 			if (mc) {
// 				ret.level = mc.level;
// 				ret.base_skills = structuredClone(mc.base_skills) as BaseSkills;
// 				ret.rarity = mc.rarity;
// 				ret.max_rarity = mc.max_rarity;
// 				ret.immortal = mc.immortal;
// 			}
// 			else {
// 				ret.rarity = ret.max_rarity;
// 				ret.highest_owned_rarity = 0;
// 				ret.highest_owned_level = 0;
// 				ret.immortal = CompletionState.DisplayAsImmortalUnowned;
// 			}
// 		});

// 		setData([...retrievable]);
// 	}, [polestars, ownedFilter, minRarity, collection]);

// 	return (
// 		<React.Fragment>
// 			<p>Here are all the crew who you can perform a 100% guaranteed crew retrieval for, using the polestars in your inventory:</p>
// 			<Form>
// 				<Form.Group inline>
// 					<PolestarFilterModal ownedPolestars={ownedPolestars} disabledPolestars={disabledPolestars} updateDisableds={setDisabledPolestars} />
// 					<PolestarProspectModal ownedPolestars={ownedPolestars} addedPolestars={addedPolestars} allKeystones={allKeystones} allCrew={allCrew} updateProspects={setAddedPolestars} />
// 					<Form.Field
// 						control={Dropdown}
// 						selection
// 						options={ownedFilterOptions}
// 						value={ownedFilter}
// 						onChange={(e, { value }) => setOwnedFilter(value)}
// 					/>
// 					<Form.Field
// 						control={Dropdown}
// 						placeholder="Minimum rarity"
// 						selection
// 						options={rarityOptions}
// 						value={minRarity}
// 						onChange={(e, { value }) => setMinRarity(value)}
// 					/>
// 					<Form.Field
// 						control={Dropdown}
// 						placeholder="Collections"
// 						selection
// 						options={collectionsOptions}
// 						value={collection}
// 						onChange={(e, { value }) => setCollection(value)}
// 					/>
// 					<div style={{
// 						display: "flex",
// 						flexDirection: "column",
// 					}}>
// 						<h4 style={{marginLeft: "1em" }}>
// 							Calculation Method<AlgoExplain />
// 						</h4>
// 						<Dropdown
// 								style={{ marginLeft: '1em' }}
// 								options={algos}
// 								value={algo}
// 								onChange={(e, v) => setAlgo(v.value as string)}
// 							/>

// 					</div>
// 				</Form.Group>
// 			</Form>
// 		 	{data && polestars && <CrewTable algo={algo} setAlgo={setAlgo} allCrew={allCrew} playerData={playerData} data={data} polestars={polestars} /> }
// 		</React.Fragment>
// 	);
// };

// type PolestarFilterModalProps = {
// 	ownedPolestars: Polestar[];
// 	disabledPolestars: number[];
// 	updateDisableds: (disabledPolestars: number[]) => void;
// };

// const PolestarFilterModal = (props: PolestarFilterModalProps) => {
// 	const { ownedPolestars, updateDisableds } = props;

// 	const [modalIsOpen, setModalIsOpen] = React.useState(false);
// 	const [disabledPolestars, setDisabledPolestars] = React.useState(props.disabledPolestars);

// 	// Recalculate combos only when modal gets closed
// 	React.useEffect(() => {
// 		if (!modalIsOpen && JSON.stringify(disabledPolestars) != JSON.stringify(props.disabledPolestars)) {
// 			updateDisableds([...disabledPolestars]);
// 		}
// 	}, [modalIsOpen]);

// 	const rarityIds = [14502, 14504, 14506, 14507, 14509];
// 	const skillIds = [14511, 14512, 14513, 14514, 14515, 14516];
// 	const grouped = [
// 		{
// 			title: "Rarity",
// 			polestars: [] as Polestar[],
// 			anyDisabled: false
// 		},
// 		{
// 			title: "Skills",
// 			polestars: [] as Polestar[],
// 			anyDisabled: false
// 		},
// 		{
// 			title: "Traits",
// 			polestars: [] as Polestar[],
// 			anyDisabled: false
// 		},
// 	];
// 	ownedPolestars.forEach(p => {
// 		let group = 2;
// 		if (rarityIds.indexOf(p.id) !== -1) group = 0;
// 		if (skillIds.indexOf(p.id) !== -1) group = 1;
// 		grouped[group].polestars.push(p);
// 		if (disabledPolestars.indexOf(p.id) !== -1) grouped[group].anyDisabled = true;
// 	});

// 	return (
// 		<Modal
// 			open={modalIsOpen}
// 			onClose={() => setModalIsOpen(false)}
// 			onOpen={() => setModalIsOpen(true)}
// 			trigger={<Button><Icon name='filter' />{ownedPolestars.length-disabledPolestars.length} / {ownedPolestars.length}</Button>}
// 			size='large'
// 		>
// 			<Modal.Header>Filter Owned Polestars</Modal.Header>
// 			<Modal.Content scrolling>
// 				<Grid columns={4} stackable padded>
// 					{createFilterCheckboxes()}
// 				</Grid>
// 			</Modal.Content>
// 			<Modal.Actions>
// 				<Button positive onClick={() => setModalIsOpen(false)}>
// 					Close
// 				</Button>
// 			</Modal.Actions>
// 		</Modal>
// 	);

// 	function filterCheckbox(p: Polestar): JSX.Element {
// 		return (
// 			<Grid.Column key={p.id}>
// 				<Checkbox
// 					toggle
// 					id={`polestar_filter_id_${p.id}`}
// 					label={`${p.short_name} (${p.quantity})`}
// 					checked={disabledPolestars.indexOf(p.id)===-1}
// 					onChange={(e) => checkOne(p.id, (e.target as HTMLInputElement).checked)}
// 				/>
// 			</Grid.Column>
// 		)
// 	}

// 	function filterCheckboxGroupHeader(t: string): JSX.Element {
// 		let group = grouped.find(group => group.title === t);
// 		let groupLink = (group ? (<Button style={{ marginLeft: '1em' }} size='mini' onClick={() => checkGroup(t, group?.anyDisabled ?? true)}>{group.anyDisabled ? 'Check' : 'Uncheck'} All</Button>) : (<></>));
// 		return (
// 			<Grid.Column largeScreen={16} mobile={4} key={t}>
// 				<strong>{t}</strong> {groupLink}
// 			</Grid.Column>
// 		)
// 	}

// 	function createFilterCheckboxes(): JSX.Element[] {
// 		const checkboxes = [] as JSX.Element[];
// 		grouped.map((group) => {
// 			if(group.polestars.length > 0) {
// 				checkboxes.push(filterCheckboxGroupHeader(group.title));
// 				group.polestars.map((polestar) => {
// 					checkboxes.push(filterCheckbox(polestar));
// 				});
// 			}
// 		});
// 		return checkboxes;
// 	}

// 	function checkOne(id: number, checked: boolean): void {
// 		handleFilterChange(id, checked);
// 		setDisabledPolestars([...disabledPolestars]);
// 	}

// 	function checkGroup(t: string, checkAll: boolean): void {
// 		let group = grouped.find(group => group.title === t);
// 		group?.polestars.forEach(p => handleFilterChange(p.id, checkAll));
// 		setDisabledPolestars([...disabledPolestars]);
// 	}

// 	function handleFilterChange(id: number, checked: boolean): void {
// 		if(checked === true && disabledPolestars.indexOf(id) !== -1) {
// 			disabledPolestars.splice(disabledPolestars.indexOf(id), 1);
// 		}
// 		if(checked === false && disabledPolestars.indexOf(id) === -1) {
// 			disabledPolestars.push(id);
// 		}
// 	}
// };

// type PolestarProspectModalProps = {
// 	ownedPolestars: Polestar[];
// 	addedPolestars: string[];
// 	allKeystones: KeystoneBase[];
// 	allCrew: CrewMember[];
// 	updateProspects: (prospects: string[]) => void;
// };

// const PolestarProspectModal = (props: PolestarProspectModalProps) => {
// 	const { ownedPolestars, allCrew, updateProspects } = props;

// 	const [addedPolestars, setAddedPolestars] = React.useState<string[]>(props.addedPolestars ?? []);

// 	const [modalIsOpen, setModalIsOpen] = React.useState(false);
// 	const [activeCrew, setActiveCrew] = React.useState('');
// 	const [activeConstellation, setActiveConstellation] = React.useState('');
// 	const [activePolestar, setActivePolestar] = React.useState<string>('');

// 	const [allKeystones, setAllKeystones] = React.useState<KeystoneBase[]>([]);
// 	const [control, setControl] = React.useState([] as CrewMember[]);
// 	const [crewCrates, setCrewCrates] = React.useState(0);
// 	const [ownedConstellations, setOwnedConstellations] = React.useState<Constellation[]>([]);

// 	React.useEffect(() => {
// 		if (allKeystones) {
// 			// Chances assume you can't get rarity, skill constellations from scans
// 			setCrewCrates(allKeystones.filter(k => k.type == 'crew_keystone_crate').length);
// 			const owned = allKeystones.filter(k => (k.type == 'crew_keystone_crate' || k.type == 'keystone_crate') && (k.quantity ?? 0) > 0)
// 				.sort((a, b) => a.name.localeCompare(b.name)).map(ks => ks as Constellation);
// 			setOwnedConstellations([...owned]);
// 		}
// 	}, [allKeystones]);

// 	// Recalculate combos only when modal gets closed
// 	React.useEffect(() => {
// 		if (!modalIsOpen) {
// 			updateProspects([...addedPolestars ?? []]);
// 		}
// 	}, [modalIsOpen]);

// 	return (
// 		<Modal
// 			open={modalIsOpen}
// 			onClose={() => setModalIsOpen(false)}
// 			onOpen={() => setModalIsOpen(true)}
// 			trigger={<Button><Icon name='add' />{addedPolestars?.length}</Button>}
// 			size='large'
// 		>
// 			<Modal.Header>Add Prospective Polestars</Modal.Header>
// 			<Modal.Content scrolling>
// 				{renderContent()}
// 			</Modal.Content>
// 			<Modal.Actions>
// 				{activePolestar != '' && (<Button icon='backward' content='Return to polestars' onClick={() => setActivePolestar('')} />)}
// 				<Button positive onClick={() => setModalIsOpen(false)}>Close</Button>
// 			</Modal.Actions>
// 		</Modal>
// 	);

// 	function renderContent(): JSX.Element {
// 		if (!modalIsOpen) return (<></>);

// 		if (!allKeystones || !allKeystones.length) {
// 			calculateKeystoneOdds();
// 			calculateControl();
// 			return (<></>);
// 		}

// 		if (activePolestar != '')
// 			return renderPolestarDetail();

// 		return renderPolestarFinder();
// 	}

// 	function calculateKeystoneOdds(): void {
// 		const allkeystones = structuredClone(props.allKeystones) as KeystoneBase[];

// 		const [constellations, keystones] = categorizeKeystones(allkeystones);

// 		let totalCrates = 0, totalDrops = 0;
// 		constellations.forEach(keystone => {
// 			if (keystone.type == 'crew_keystone_crate') {
// 				totalCrates++;
// 				totalDrops += keystone.keystones.length;
// 			}
// 		});
// 		keystones.filter(k => k.type == 'keystone').forEach(polestar => {
// 			const crates = constellations.filter(k => (k.type == 'crew_keystone_crate' || k.type == 'keystone_crate') && k.keystones.includes(polestar.id));
// 			const nochance = polestar.filter?.type == 'rarity' || polestar.filter?.type == 'skill' || crates.length == 0;
// 			polestar.crate_count = nochance ? 0 : crates.length;
// 			//polestar.scan_odds = nochance ? 0 : crates.length/totalDrops; // equal chance of dropping
// 			polestar.scan_odds = nochance ? 0 : crates.reduce((prev, curr) => prev + (1/curr.keystones.length), 0)/totalCrates; // conditional probability
// 			const owned = crates.filter(k => k.quantity > 0);
// 			polestar.owned_crate_count = owned.reduce((prev, curr) => prev + curr.quantity, 0);
// 			polestar.owned_best_odds = owned.length == 0 ? 0 : 1/owned.reduce((prev, curr) => Math.min(prev, curr.keystones.length), 100);
// 			polestar.owned_total_odds = owned.length == 0 ? 0 : 1-owned.reduce((prev, curr) => prev*(((curr.keystones.length-1)/curr.keystones.length)**curr.quantity), 1);

// 			if (polestar.filter) {
// 				if (polestar.filter.type === 'rarity') {
// 					polestar.crew_count = allCrew.filter(c => c.in_portal && c.max_rarity == polestar.filter?.rarity).length;
// 				}
// 				else if (polestar.filter.type === 'skill' && polestar.filter.skill) {
// 					polestar.crew_count = allCrew.filter(c => c.in_portal && c.base_skills[polestar.filter?.skill as string]).length;
// 				}

// 				else if (polestar.filter.type === 'trait' && polestar.filter.trait) {
// 					polestar.crew_count = allCrew.filter(c => c.in_portal && c.traits.some(trait => trait === polestar.filter?.trait as string)).length;
// 				}

// 			}

// 		});
// 		setAllKeystones([...allkeystones]);
// 	}

// 	function calculateControl(): void {
// 		// Control is a list of crew that you can't retrieve, which includes crew not in portal
// 		const retrievable = getRetrievable(allCrew, ownedPolestars);
// 		const unretrievable = allCrew.filter(pc => !retrievable.some(cc => cc === pc));
// 		setControl([...unretrievable]);
// 	}

// 	function renderPolestarFinder(): JSX.Element {
// 		const polestarTable: ITableConfigRow[] = [
// 			{ width: 2, column: 'name', title: 'Polestar' },
// 			{ width: 1, column: 'crew_count', title: 'Crew in Portal', reverse: true },
// 			{ width: 1, column: 'crate_count', title: 'Constellation Chance', reverse: true },
// 			{ width: 1, column: 'scan_odds', title: 'Scan Chance', reverse: true },
// 			{ width: 1, column: 'owned_best_odds', title: 'Best Chance', reverse: true },
// 			{ width: 1, column: 'quantity', title: 'Owned', reverse: true },
// 			{ width: 1, column: 'loaned', title: 'Added', reverse: true }
// 		];

// 		const constellationList = ownedConstellations.map(c => {
// 				return { key: c.symbol, value: c.symbol, text: c.name };
// 			});

// 		// !! Always filter polestars by crew_count to hide deprecated polestars !!
// 		let [constellations, data] = categorizeKeystones(allKeystones);
// 		if (activeCrew != '') {
// 			const crew = allCrew.find(c => c.symbol === activeCrew);
// 			if (crew) {
// 				data = data.filter(k => (k.filter?.type == 'trait' && k.filter.trait && crew.traits.includes(k.filter.trait))
// 				|| (k.filter?.type == 'rarity' && k.filter.rarity == crew.max_rarity)
// 				|| (k.filter?.type == 'skill' && k.filter.skill && crew.base_skills[k.filter.skill] !== undefined));
// 			}
// 			else {
// 				data = [];
// 			}
// 		}
// 		if (activeConstellation != '') {
// 			const crewKeystones = constellations.find(k => k.symbol === activeConstellation)?.keystones ?? [];
// 			data = data.filter(k => crewKeystones.includes(k.id));
// 		}
// 		data.forEach(p => {
// 			p.loaned = addedPolestars.filter(added => added === p.symbol).length;
// 		});

// 		return (
// 			<React.Fragment>
// 				<CrewPicker crew={control} value={activeCrew} updateCrew={updateCrew} />
// 				{activeCrew == '' && constellationList.length > 0 && (
// 					<React.Fragment>
// 						<span style={{ margin: '0 1em' }}>or</span>
// 						<Dropdown
// 							placeholder='Filter polestars by owned constellation'
// 							style={{ minWidth: '20em' }}
// 							selection
// 							clearable
// 							options={constellationList}
// 							value={activeConstellation}
// 							onChange={(e, { value }) => setAsActive('constellation', value as string) }
// 						/>
// 					</React.Fragment>
// 				)}
// 				{renderCrewMessage(data)}
// 				{renderConstellationMessage(data)}
// 				<div style={{ marginTop: '1em' }}>
// 					<SearchableTable
// 						data={data}
// 						config={polestarTable}
// 						renderTableRow={(polestar, idx) => renderPolestarRow(polestar, idx ?? -1)}
// 						filterRow={(polestar, filter) => filterText(polestar, filter)}
// 						explanation={
// 							<div>
// 								<p>Search for polestars by name.</p>
// 							</div>
// 						}
// 					/>
// 					<p>
// 						<i>Constellation Chance</i>: your chance of acquiring any constellation with the polestar from a successful scan.
// 						<br /><i>Scan Chance</i>: your overall chance of acquiring the polestar from a successful scan.
// 						<br /><i>Best Chance</i>: your best chance of acquiring the polestar from a constellation in your inventory.
// 					</p>
// 				</div>
// 			</React.Fragment>
// 		);
// 	}

// 	function filterText(polestar: Polestar, filters: Filter[]): boolean {
// 		if (filters.length == 0) return true;

// 		const matchesFilter = (input: string, searchString: string) =>
// 			input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0;

// 		let meetsAnyCondition = false;

// 		for (let filter of filters) {
// 			let meetsAllConditions = true;
// 			if (filter.conditionArray?.length === 0) {
// 				// text search only
// 				for (let segment of filter.textSegments ?? []) {
// 					let segmentResult = matchesFilter(polestar.name, segment.text);
// 					meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult);
// 				}
// 			}
// 			if (meetsAllConditions) {
// 				meetsAnyCondition = true;
// 				break;
// 			}
// 		}

// 		return meetsAnyCondition;
// 	}

// 	function renderPolestarRow(polestar: Polestar, idx: number): JSX.Element {
// 		return (
// 			<Table.Row key={polestar.symbol}
// 				style={{ cursor: activePolestar != polestar.symbol ? 'zoom-in' : 'zoom-out' }}
// 				onClick={() => setActivePolestar(activePolestar != polestar.symbol ? polestar.symbol : '')}
// 			>
// 				<Table.Cell>
// 					<div
// 						style={{
// 							display: 'grid',
// 							gridTemplateColumns: '30px auto',
// 							gridTemplateAreas: `'icon stats'`,
// 							gridGap: '1px'
// 						}}
// 					>
// 						<div style={{ gridArea: 'icon' }}>
// 							<img width={24} src={`${process.env.GATSBY_ASSETS_URL}${polestar.icon.file.slice(1).replace(/\//g, '_')}`} />
// 						</div>
// 						<div style={{ gridArea: 'stats' }}>
// 							<span style={{ fontWeight: 'bolder', fontSize: '1.1em' }}>{polestar.short_name}</span>
// 						</div>
// 					</div>
// 				</Table.Cell>
// 				<Table.Cell textAlign='center'>{polestar.crew_count}</Table.Cell>
// 					<Table.Cell textAlign='center'>{((polestar.crate_count ?? 0)/crewCrates*100).toFixed(1)}%</Table.Cell>
// 					<Table.Cell textAlign='center'>{((polestar.scan_odds ?? 0)*100).toFixed(2)}%</Table.Cell>
// 					<Table.Cell textAlign='center'>{((polestar.owned_best_odds ?? 0)*100).toFixed(1)}%</Table.Cell>
// 				<Table.Cell textAlign='center'>{polestar.quantity}</Table.Cell>
// 				<Table.Cell textAlign='center'>
// 					<ProspectInventory polestar={polestar.symbol} loaned={polestar.loaned} updateProspect={updateProspect} />
// 				</Table.Cell>
// 			</Table.Row>
// 		);
// 	}

// 	function renderCrewMessage(data: Polestar[]): JSX.Element {
// 		if (activeCrew == '') return (<></>);

// 		const crew = allCrew.find(c => c.symbol === activeCrew);
// 		if (!crew) return (<div>error</div>);
// 		if (!crew.in_portal)
// 			return (<Message>{crew.name} is not available by crew retrieval.</Message>);

// 		if (crew.unique_polestar_combos?.length == 0)
// 			return (<Message>{crew.name} has no guaranteed retrieval options.</Message>);

// 		const unownedPolestars = data.filter(p => p.quantity === 0);
// 		if (unownedPolestars.length == 0)
// 			return (<Message>You can already retrieve {crew.name} with the polestars in your inventory.</Message>);

// 		crew.unique_polestar_combos?.forEach(upc => {
// 			const needs = unownedPolestars.filter(p => upc.some(trait => filterTraits(p, trait)));
// 			needs.forEach(p => {
// 				p.useful = p.useful ? p.useful + 1: 1;
// 				if (needs.length == 1) p.useful_alone = true;
// 			});
// 		});

// 		// "Useful" polestars are all unowned polestars that unlock retrievals by themselves (i.e. `useful_alone`)
// 		//	or other unowned polestars that together unlock retrievals WITHOUT also relying on a `useful_alone` polestar
// 		const usefulPolestars = unownedPolestars.filter(p => p.useful_alone ||
// 			crew.unique_polestar_combos?.filter(upc => !upc.some(trait =>
// 				unownedPolestars.filter(p => p.useful_alone).some(p => filterTraits(p, trait))
// 			)).some(upc => upc.some(trait => filterTraits(p, trait))))
// 			.sort((a, b) => (b.useful ?? 0) - (a.useful ?? 0));

// 		const showUsefulPolestars = () => {
// 			if (usefulPolestars.length == 0)
// 				return (<p>No unowned polestars will help you retrieve {crew.name}.</p>); // What case is this?

// 			const usefulAlone = usefulPolestars.filter(p => p.useful_alone);
// 			const usefulWithOthers = usefulPolestars.filter(p => !p.useful_alone); // Should either be 0 or 2+

// 			return (
// 				<p>
// 					{usefulAlone.length > 0 && (<span>You need exactly one of the following polestars to retrieve {crew.name}: {renderPolestarsInline(usefulAlone)}</span>)}
// 					{usefulAlone.length > 0 && usefulWithOthers.length > 0 && (<span><br />Or some combination of the following polestars: {renderPolestarsInline(usefulWithOthers)}</span>)}
// 					{usefulAlone.length == 0 && (<span>You need some combination of the following polestars to retrieve {crew.name}: {renderPolestarsInline(usefulWithOthers)}</span>)}
// 				</p>
// 			);
// 		};

// 		// "Usable" constellations are owned constellations that include useful polestars
// 		const showUsableConstellations = () => {
// 			const usablePolestars = usefulPolestars.filter(p => (p.owned_crate_count ?? 0) > 0);
// 			if (usablePolestars.length == 0) return (<></>);

// 			const constellations = ownedConstellations.filter(k => k.keystones.some(kId => usablePolestars.find(p => p.id === kId)));
// 			if (constellations.length == 1)
// 				return constellations.map(k => renderPolestarsFromConstellation(k, usablePolestars.filter(p => k.keystones.some(kId => kId === p.id))));

// 			return usablePolestars.sort((a, b) => {
// 					if (b.owned_total_odds == a.owned_total_odds)
// 						return (b.owned_best_odds ?? 0) - (a.owned_best_odds ?? 0);
// 					return (b.owned_total_odds ?? 0) - (a.owned_total_odds ?? 0);
// 				}).map(p =>
// 					renderConstellationsWithPolestar(p)
// 				);
// 		};

// 		return (
// 			<Message>
// 				{showUsefulPolestars()}
// 				{showUsableConstellations()}
// 			</Message>
// 		);
// 	}

// 	function renderPolestarsInline(polestars: Polestar[]): JSX.Element[] {
// 		var mp = polestars.map((p, pdx) => (
// 				<span key={pdx} onClick={() => setActivePolestar(p.symbol) }>
// 					<b>{p.short_name}</b>{pdx < polestars.length-1 ? ',' : ''}
// 				</span>
// 				));

// 		let retval: JSX.Element[] = [];
// 		let i = 0;
// 		for (var cm of mp) {
// 			if (i++) retval.push(<> </>);
// 			retval.push(cm);
// 		}

// 		return retval;
// 	}

// 	function renderConstellationMessage(data: Polestar[]): JSX.Element {
// 		if (activeConstellation == '') return (<></>);

// 		const constellation = allKeystones.find(k => k.symbol === activeConstellation) as Constellation | undefined;

// 		const unownedPolestars = data.filter(p => p.quantity === 0);

// 		if (unownedPolestars.length == 0)
// 			return (<Message>You already own all polestars in the {constellation?.name}.</Message>);

// 		return (
// 			<Message>
// 				{constellation && renderPolestarsFromConstellation(constellation, unownedPolestars)}
// 			</Message>
// 		);
// 	}

// 	function renderPolestarDetail(): JSX.Element {
// 		const polestar = allKeystones.find(k => k.symbol === activePolestar) as Polestar ?? {} as Polestar;
// 		polestar.loaned = addedPolestars.filter(added => added === polestar.symbol).length;

// 		return (
// 			<div style={{ marginTop: '1em' }}>
// 				<Table celled striped unstackable compact="very">
// 					<Table.Header>
// 						<Table.Row>
// 							<Table.HeaderCell>Polestar</Table.HeaderCell>
// 							<Table.HeaderCell textAlign='center'>Crew in Portal</Table.HeaderCell>
// 							<Table.HeaderCell textAlign='center'>Constellation Chance</Table.HeaderCell>
// 							<Table.HeaderCell textAlign='center'>Scan Chance</Table.HeaderCell>
// 							<Table.HeaderCell textAlign='center'>Best Chance</Table.HeaderCell>
// 							<Table.HeaderCell textAlign='center'>Owned</Table.HeaderCell>
// 							<Table.HeaderCell textAlign='center'>Added</Table.HeaderCell>
// 						</Table.Row>
// 					</Table.Header>
// 					<Table.Body>
// 						{renderPolestarRow(polestar, 1)}
// 					</Table.Body>
// 				</Table>
// 				{(polestar.owned_crate_count ?? 0) > 0 && (<Message>{renderConstellationsWithPolestar(polestar)}</Message>)}
// 				{renderNewRetrievals(polestar)}
// 			</div>
// 		);
// 	}

// 	function renderPolestarsFromConstellation(constellation: Constellation, polestars: Polestar[]): JSX.Element {
// 		const clarify = activeCrew != '' ? 'a needed' : 'an unowned';

// 		return (
// 			<div key={constellation.symbol}>
// 				Open the <b><span onClick={() => setAsActive('constellation', constellation.symbol) }>{constellation.name}</span></b>{` `}
// 				for a <b>{(polestars.length/constellation.keystones.length*100).toFixed(1)}%</b> chance of acquiring {clarify} polestar:{` `}
// 				<Grid centered padded stackable>
// 				{
// 					polestars.map((p, pdx) => (
// 						<Grid.Column key={pdx} width={2} textAlign='center' onClick={() => setActivePolestar(p.symbol)}>
// 							<img width={32} src={`${process.env.GATSBY_ASSETS_URL}${p.icon.file.slice(1).replace(/\//g, '_')}`} />
// 							<br /><b>{p.short_name}</b><br /><small>({(1/constellation.keystones.length*100).toFixed(1)}%)</small>
// 						</Grid.Column>
// 					))
// 				}
// 				</Grid>
// 				{activeCrew == '' && constellation.quantity > 1 && (<p>You own {constellation.quantity} of this constellation.</p>)}
// 			</div>
// 		);
// 	}

// 	function renderConstellationsWithPolestar(polestar: Polestar): JSX.Element {
// 		const constellations = [] as Constellation[];
// 		ownedConstellations.filter(k => k.keystones.includes(polestar.id))
// 			.forEach(k => {
// 				for (let i = 0; i < k.quantity; i++) {
// 					const newName = k.quantity > 1 ? k.name + " #"+(i+1) : k.name;
// 					constellations.push({...k, name: newName});
// 				}
// 			});

// 		return (
// 			<p key={polestar.symbol}>
// 				Open{` `}
// 				{
// 					constellations.sort((a, b) => 1/b.keystones.length - 1/a.keystones.length).map((k, kdx) => (
// 						<span key={kdx} onClick={() => setAsActive('constellation', k.symbol) }>
// 							<b>{k.name}</b> ({(1/k.keystones.length*100).toFixed(1)}%){kdx < constellations.length-1 ? ' or ' : ''}
// 						</span>
// 					)).reduce((prev, curr) => <>{prev}&nbsp;{curr}</>)
// 				}{` `}
// 				for a chance of acquiring the <b><span onClick={() => setActivePolestar(polestar.symbol)}>{polestar.name}</span></b>
// 				{constellations.length > 1 && (<span>; open all for a <b>{((polestar.owned_total_odds ?? 0) * 100).toFixed(1)}%</b> chance</span>)}
// 			</p>
// 		);
// 	}

// 	function renderNewRetrievals(polestar: Polestar): JSX.Element {
// 		const ownedPlus = structuredClone(ownedPolestars);
// 		ownedPlus.push({...polestar, quantity: 1});
// 		const newRetrievables = getRetrievable(control, ownedPlus).filter(c => c.in_portal);

// 		if (newRetrievables.length == 0)
// 			return (
// 				<p>
// 					{polestar.quantity > 0 ? `You own ${polestar.quantity} of the ${polestar.name}. ` : ''}
// 					Acquiring{polestar.quantity > 0 ? ` more of ` : ` `}this polestar will not unlock guaranteed retrievals for any new crew.
// 				</p>
// 			);

// 		return (
// 			<React.Fragment>
// 				<p>Acquire the <b>{polestar.name}</b> to unlock guaranteed retrievals for the following crew:</p>
// 				<Grid centered padded stackable>
// 					{newRetrievables.sort((a, b) => a.name.localeCompare(b.name)).map((crew, cdx) => (
// 						<Grid.Column key={crew.symbol} width={2} textAlign='center' onClick={() => setAsActive('crew', crew.symbol) }>
// 							<ItemDisplay
// 								src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
// 								size={64}
// 								maxRarity={crew.max_rarity}
// 								rarity={crew.highest_owned_rarity ?? 0}
// 							/>
// 							<div>{crew.name}</div>
// 						</Grid.Column>
// 					))}
// 				</Grid>
// 			</React.Fragment>
// 		);
// 	}

// 	function getRetrievable(crewpool: (CrewMember | PlayerCrew)[], polestars: Polestar[]): PlayerCrew[] {
// 		return crewpool.filter(crew =>
// 			crew.unique_polestar_combos?.some(upc =>
// 				upc.every(trait => polestars.some(op => filterTraits(op, trait)))
// 			))?.map(crew => crew as PlayerCrew) ?? [];
// 	}

// 	function setAsActive(activeType: string, activeValue: string): void {
// 		setActiveCrew(activeType == 'crew' ? activeValue : '');
// 		setActiveConstellation(activeType == 'constellation' ? activeValue : '');
// 		setActivePolestar('');
// 	}

// 	function updateCrew(symbol: string): void {
// 		setAsActive('crew', symbol);
// 	}

// 	function updateProspect(polestar: string, increase: boolean): void {
// 		if (polestar == '') return;
// 		if (increase) {
// 			addedPolestars.push(polestar);
// 		}
// 		else {
// 			const prospectNum = addedPolestars.indexOf(polestar);
// 			if (prospectNum >= 0) addedPolestars.splice(prospectNum, 1);
// 		}
// 	}
// };

// type CrewPickerProps = {
// 	crew: CrewMember[];
// 	value: string;
// 	updateCrew: (symbol: string) => void;
// }

// const CrewPicker = (props: CrewPickerProps) => {
// 	const { updateCrew } = props;

// 	const [options, setOptions] = React.useState<RetrievalOptions | null>(null);

// 	React.useEffect(() => {
// 		if (props.value != '' && options && !options.initialized)
// 			populatePlaceholders();
// 	}, [props.value]);

// 	if (!options) {
// 		populatePlaceholders();
// 		return (<></>);
// 	}

// 	return (
// 		<Dropdown
// 			placeholder='Search for desired crew'
// 			noResultsMessage='No unretrievable crew found.'
// 			style={{ minWidth: '20em' }}
// 			search
// 			selection
// 			clearable
// 			options={options.list}
// 			value={props.value}
// 			onFocus={() => { if (!options.initialized) populateOptions(); }}
// 			onChange={(e, { value }) => updateCrew(value as string) }
// 		/>
// 	);

// 	function populatePlaceholders(): void {
// 		const options: RetrievalOptions = { initialized: false, list: [] };
// 		if (props.value != '') {
// 			const c = props.crew.find(c => c.symbol === props.value);
// 			if (c) options.list = [{ key: c.symbol, value: c.symbol, text: c.name, image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` }}];
// 			else options.list = [{ key: 0, value: 0, text: 'Loading...' }];
// 		}
// 		else {
// 			options.list = [{ key: 0, value: 0, text: 'Loading...' }];
// 		}
// 		setOptions({...options});
// 	}

// 	function populateOptions(): void {
// 		let crewList = [...props.crew];
// 		let newOptions: RetrievalOptions = {
// 			list: crewList.sort((a, b) => a.name.localeCompare(b.name)).map(c => {
// 				return { key: c.symbol, value: c.symbol, text: c.name, image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` }};
// 			}),
// 			initialized: true
// 		}
// 		setOptions(newOptions);
// 	}
// };

// type ProspectInventoryProps = {
// 	polestar: string;
// 	loaned: number;
// 	updateProspect: (polestar: string, increase: boolean) => void;
// }

// const ProspectInventory = (props: ProspectInventoryProps) => {
// 	const { polestar, updateProspect } = props;

// 	const [loaned, setLoaned] = React.useState(props.loaned);

// 	return (
// 		<React.Fragment>
// 			{loaned > 0 && (<Button size='mini' circular icon='minus' onClick={(e) => { removeProspect(polestar); e.stopPropagation(); }} />)}
// 			{loaned > 0 ? (<span style={{ margin: '0 .5em' }}>{loaned}</span>) : ''}
// 			<Button size='mini' circular icon='add' onClick={(e) => { addProspect(polestar); e.stopPropagation(); }} />
// 		</React.Fragment>
// 	);

// 	function addProspect(polestar: string): void {
// 		setLoaned(loaned+1);
// 		updateProspect(polestar, true);
// 	}

// 	function removeProspect(polestar: string): void {
// 		setLoaned(loaned-1);
// 		updateProspect(polestar, false);
// 	}
// };

// type CrewTableProps = {
// 	data: PlayerCrew[];
// 	polestars: Polestar[];
// 	playerData: PlayerData;
// 	allCrew: CrewMember[]
// 	algo: string;
// 	setAlgo: (value: string) => void;
// };

// const AlgoExplain = (props: { comboCount?: number }): JSX.Element => {
// 	const comboCount = props.comboCount;
// 	let pt: number | undefined = undefined;
// 	let st: string | undefined = undefined;

// 	if (comboCount){
// 		pt = Math.floor(comboCount);
// 		st = pt.toLocaleString();
// 	}

// 	const text = (<>
// 	<p></p>
// 		{comboCount !== undefined && <p>There are up to <span style={{ fontWeight: 'bold', color: (comboCount >= RECURSION_FORBID) ? 'tomato' : ((comboCount >= RECURSION_WARN) ? 'orange' : undefined)}}>{st}</span> polestar combinations to retrieve this crew, assuming 5 fuses are possible.</p>}
// 		<p>There are two different ways to compute possible polestar combinations:</p>
// 		<ul>
// 		<li style={{marginBottom: '8px'}}><b>Simple exhaustion</b> runs through the number of times you can retrieve each crew member until you are out of polestars.</li>
// 		<li><b>Deep recursion</b> calculates <i>every possible</i> polestar combination for a given crew and desired number of fuses.</li>
// 		</ul>
// 		{(comboCount !== undefined && comboCount >= RECURSION_FORBID) && (<p style={{fontWeight: 'bold', color: 'tomato'}}>The deep recursion method is <b>not available</b> for this crew member.</p>)}
// 		{(comboCount !== undefined && comboCount < RECURSION_FORBID && comboCount >= RECURSION_WARN) && (<p style={{fontWeight: 'bold', color: 'orange'}}>Using the deep recursion method is <b>not advised</b> for this crew member.</p>)}

// 	</>)

// 	return (<Popup wide size='large' trigger={<Icon name="help" />} header={'Combo Calculations'} content={text}/>)
// };

// const CrewTable = (props: CrewTableProps) => {
// 	const { data, polestars } = props;
// 	const { allCrew, algo, setAlgo } = props;
// 	const [activeCrew, setActiveCrew] = React.useState<string | null>(null);
// 	const [activeCollections, setActiveCollections] = React.useState<string | null>(null);
// 	const { playerData } = props;

// 	const dataContext = React.useContext(GlobalContext);

// 	if (!data) return (<></>);

// 	const tableConfig: ITableConfigRow[] = [
// 		{ width: 3, column: 'name', title: 'Crew' },
// 		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['highest_owned_rarity'] },
// 		{ width: 1, column: 'bigbook_tier', title: 'Tier' },
// 		{ width: 1, column: 'cab_ov', title: 'CAB', reverse: true, tiebreakers: ['cab_ov_rank'] },
// 		{ width: 1, column: 'ranks.voyRank', title: 'Voyage' },
// 		{ width: 1, column: 'collections.length', title: 'Collections', reverse: true },
// 		{ width: 1, title: 'Useable Combos' }
// 	];
// 	const buffConfig = calculateBuffConfig(props.playerData.player);
// 	return (
// 		<>
// 		<SearchableTable
// 			id={"crewretrieval"}
// 			data={data}
// 			config={tableConfig}
// 			renderTableRow={(crew, idx) => renderTableRow(crew, idx ?? 0, playerData)}
// 			filterRow={(crew, filters, filterType) => crewMatchesSearchFilter(crew, filters, filterType ?? null)}
// 			showFilterOptions={true}
// 		/>
// 		<CrewHoverStat  openCrew={(crew) => navToCrewPage(crew, props.playerData.player.character.crew, buffConfig)} targetGroup='retrievalGroup' />

// 		</>
// 	);



// 	function renderTableRow(crew: PlayerCrew, idx: number, playerData: PlayerData): JSX.Element {
// 		const buffConfig = dataContext.player.buffConfig;
// 		const [comboCount, ] = getCombos(crew);

// 		return (
// 			<Table.Row key={idx}>
// 				<Table.Cell>
// 					<div
// 						style={{
// 							display: 'grid',
// 							gridTemplateColumns: '60px auto',
// 							gridTemplateAreas: `'icon stats' 'icon description'`,
// 							gridGap: '1px'
// 						}}
// 					>
// 						<div style={{ gridArea: 'icon' }}>
// 							<CrewTarget inputItem={crew}  targetGroup='retrievalGroup'>
// 								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
// 							</CrewTarget>
// 						</div>
// 						<div style={{ gridArea: 'stats' }}>
// 							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
// 						</div>
// 						<div style={{ gridArea: 'description' }}>{getCoolStats(crew, false, false)}</div>
// 					</div>
// 				</Table.Cell>
// 				<Table.Cell>
// 					<Rating icon='star' rating={crew.highest_owned_rarity} maxRating={crew.max_rarity} size="large" disabled />
// 				</Table.Cell>
// 				<Table.Cell textAlign="center" style={{ display: activeCrew === crew.symbol ? 'none' : 'table-cell' }}>
// 					<b>{formatTierLabel(crew)}</b>
// 				</Table.Cell>
// 				<Table.Cell textAlign="center" style={{ display: activeCrew === crew.symbol ? 'none' : 'table-cell' }}>
// 					<b>{crew.cab_ov}</b><br />
// 					<small>{rarityLabels[parseInt(crew.max_rarity?.toString())-1]} #{crew.cab_ov_rank}</small>
// 				</Table.Cell>
// 				<Table.Cell textAlign="center" style={{ display: activeCrew === crew.symbol ? 'none' : 'table-cell' }}>
// 					<b>#{crew.ranks.voyRank}</b><br />
// 					{crew.ranks.voyTriplet && <small>Triplet #{crew.ranks.voyTriplet.rank}</small>}
// 				</Table.Cell>
// 				<Table.Cell textAlign="center"
// 					style={{ cursor: activeCollections === crew.symbol ? 'zoom-out' : 'zoom-in', display: activeCrew === crew.symbol ? 'none' : 'table-cell' }}
// 					onClick={() => { setActiveCollections(activeCollections === crew.symbol ? null : crew.symbol) }}
// 				>
// 					{showCollectionsForCrew(crew)}
// 				</Table.Cell>
// 				<Table.Cell textAlign="center" style={{ display: activeCrew === crew.symbol ? 'table-cell' : 'none' }}
// 					colSpan={activeCrew === crew.symbol ? 4 : undefined}
// 				>
// 					{showCombosForCrew(crew, algo)}
// 				</Table.Cell>
// 				<Table.Cell width='2' textAlign="center" style={{ cursor: activeCrew === crew.symbol ? 'zoom-out' : 'zoom-in' }}
// 					onClick={(e) => { setActiveCrew(activeCrew === crew.symbol ? null : crew.symbol); e.stopPropagation(); }}
// 				>
// 					<div style={{
// 						display: "flex",
// 						flexDirection:"column",
// 						justifyItems: "center"
// 					}}>

// 						<div style={{
// 							cursor: "pointer",
// 							color: (comboCount >= RECURSION_FORBID) ? 'tomato' : ((comboCount >= RECURSION_WARN) ? 'orange' : undefined)
// 							}}
// 							>
// 							{activeCrew === crew.symbol ? 'Hide' : 'View'}
// 							<AlgoExplain comboCount={comboCount} />
// 						</div>

// 						</div>
// 				</Table.Cell>
// 			</Table.Row>
// 		);
// 	}

// 	function getCombos(crew: CrewMember, returnCombos?: boolean, knownGroups?: number): [number, (Polestar | undefined)[][] | undefined] {
// 		let combos = crew.unique_polestar_combos?.filter(
// 			(upc) => upc.every(
// 				(trait) => polestars.some(op => filterTraits(op, trait))
// 			)
// 		).map((upc) => upc.map((trait) => polestars.find((op) => filterTraits(op, trait))));

// 		// Exit here if activecrew has 0 combos after changing filters
// 		if (!combos || !(combos?.length)) return [0, combos];
// 		/*
// 			(n+r-1)!
// 			(n-1)! r!
// 		*/
// 		let dn = combos.length;

// 		let n = combos.length;
// 		let r = knownGroups ?? 5;

// 		let result: number;

// 		result = factorial(n) / (factorial(n - r) * factorial(r));
// 		if (result < n) result = n * 5;
// 		return [result, combos];
// 	}
// 	function factorial(number: number) {
// 		let result = 1;
// 		for (let i = 1; i <= number; i++) {
// 			result *= i;
// 		}
// 		return result;
// 	}

// 	function showCombosForCrew(crew: CrewMember, algo: string): JSX.Element {
// 		if (activeCrew !== crew.symbol) return (<></>);

// 		let [comboCount, combos] = getCombos(crew, true);

// 		// Exit here if activecrew has 0 combos after changing filters
// 		if (!combos || !(combos?.length)) return (<></>);

// 		let fuseGroups: FuseGroups;

// 		if (comboCount < RECURSION_FORBID && algo === 'slow') {
// 			fuseGroups = groupByFuses(combos, 0, []);
// 		}
// 		else {
// 			fuseGroups = groupByFusesShort(combos, 0, []);
// 		}
// 		return (<ComboGrid crew={crew} combos={combos} fuseGroups={fuseGroups} />);
// 	}

// 	interface ComboTrack {
// 		id: number,
// 		quantity: number,
// 		used: number
// 	}

// 	function dingCT(lh: ComboTrack[], rh: ComboTrack[]) {
// 		for (let lv of lh) {
// 			for (let rv of rh) {
// 				if (lv.id === rv.id) {
// 					if (lv.used + 1 > lv.quantity) return false;
// 					lv.used++;
// 					break;
// 				}
// 			}
// 		}

// 		for (let rv of rh) {
// 			if (!lh.some(v => v.id === rv.id)) {
// 				lh.push(rv);
// 			}
// 		}

// 		return true;
// 	}

// 	// WORK IN PROGRESS, DO NOT DELETE COMMENTED CODE!
// 	function groupByFusesShort(combos: (Polestar | undefined)[][], unused: number, unused2: number[]) {
// 		let groupTotals: { groupId: number, total: number }[] = [];
// 		let x = 0;

// 		for (let combo of combos) {
// 			let map = combo.map(cb => cb?.quantity ?? 0);
// 			map.sort((a, b) => a - b);
// 			let total = map[0];
// 			groupTotals.push({ groupId: x++, total: total });
// 		}

// 		let duplications: number[] = []
// 		let seen: boolean[] = [];

// 		for (let total of groupTotals) {
// 			for (let i = 0; i < total.total; i++) {
// 				duplications.push(total.groupId);
// 			}
// 		}

// 		let comboout: number[][][] = [[], [], [], [], [], []];

// 		let fn = combos.length < 5 ? combos.length : 5;
// 		for (let f = 1; f <= fn; f++) {
// 			seen = duplications.map(d => false);
// 			let option = 0;

// 			for (let n = 0; n < duplications.length; n++) {
// 				comboout[f].push([duplications[n]]);
// 				let ps = combos[duplications[n]].map(z => { return { id: z?.id, quantity: z?.quantity, used: 1 } as ComboTrack });

// 				let cc = 1;
// 				seen[n] = true;

// 				for (let y = 0; y < duplications.length; y++) {
// 					if (seen[y]) continue;
// 					let xs = combos[duplications[y]].map(z => { return { id: z?.id, quantity: z?.quantity, used: 1 } as ComboTrack });
// 					if (!dingCT(ps, xs)) continue;

// 					comboout[f][option].push(duplications[y]);
// 					seen[y] = true;

// 					cc++;
// 					if (cc >= f) break;
// 				}

// 				option++;
// 			}
// 		}

// 		let result: FuseGroups = {};

// 		for (let f = 1; f <= 5; f++) {
// 			let key = "x" + f;
// 			result[key] = [] as number[][];

// 			for (let res of comboout[f]) {
// 				if (res.length === f) {
// 					result[key].push(res);
// 				}
// 			}

// 			for (let res of result[key]) {
// 				res.sort((a, b) => a - b);
// 			}
// 		}

// 		for (let f = 1; f <= 5; f++) {
// 			let key = "x" + f;
// 			let strres = result[key].map(m => JSON.stringify(m));
// 			strres = strres.filter((s, i) => strres.indexOf(s) === i);

// 			let numres = strres.map(s => JSON.parse(s) as number[]);
// 			numres.sort((a, b) => {
// 				let r = countCombos(a, combos) - countCombos(b, combos);
// 				if (r === 0) {
// 					for (let i = 0; i < a.length; i++) {
// 						r = a[i] - b[i];
// 						if (r) return r;
// 					}
// 				}
// 				return r;
// 			})
// 			result[key] = numres;
// 		}
// 		return result;
// 	}

// 	function countCombos(keys: number[], combos: (Polestar | undefined)[][]) {
// 		let res = 0;
// 		for (let key of keys) {
// 			res += combos[key].length;
// 		}
// 		return res;
// 	}

// 	function groupByFuses(combos: (Polestar | undefined)[][], start: number, group: number[]): FuseGroups {
// 		const fuseGroups: FuseGroups = {};
// 		const consumed = {};
// 		group.forEach((comboId) => {
// 			combos[comboId].forEach((polestar) => {
// 				if (polestar === undefined) return;
// 				if (consumed[polestar.symbol])
// 					consumed[polestar.symbol]++;
// 				else
// 					consumed[polestar.symbol] = 1;
// 			});
// 		});
// 		combos.forEach((combo, comboId) => {
// 			if (comboId >= start) {
// 				let consumable = 0;
// 				combo.forEach((polestar) => {
// 					if (polestar === undefined) return;
// 					if (consumed[polestar.symbol] === undefined || polestar.quantity-consumed[polestar.symbol] >= 1)
// 						consumable++;
// 				});
// 				if (consumable == combo.length) {
// 					const parentGroup = [...group, comboId];
// 					const parentId = 'x'+parentGroup.length;
// 					if (fuseGroups[parentId])
// 						fuseGroups[parentId].push(parentGroup);
// 					else
// 						fuseGroups[parentId] = [parentGroup];
// 					// Only collect combo groups up to 5 fuses
// 					if (parentGroup.length < 5) {
// 						let childGroups = groupByFuses(combos, comboId, parentGroup);
// 						for (let childId in childGroups) {
// 							if (fuseGroups[childId])
// 								fuseGroups[childId] = fuseGroups[childId].concat(childGroups[childId]);
// 							else
// 								fuseGroups[childId] = childGroups[childId];
// 						}
// 					}
// 				}
// 			}
// 		});
// 		return fuseGroups;
// 	}

// 	function showCollectionsForCrew(crew: CrewMember | PlayerCrew): JSX.Element {
// 		if (activeCollections !== crew.symbol || crew.collections.length == 0)
// 			return (<b>{crew.collections.length}</b>);

// 		const formattedCollections = crew.collections.map((c, idx) => (
// 			<span key={idx}>{c}{idx < crew.collections.length-1 ? ',' : ''}</span>
// 		)).reduce((prev, curr) => <>{prev} {curr}</>);

// 		return (
// 			<div>
// 				{formattedCollections}
// 			</div>
// 		);
// 	}
// };

// type ComboGridProps = {
// 	crew: CrewMember;
// 	combos: (Polestar | undefined)[][];
// 	fuseGroups: FuseGroups;
// };

// const ComboGrid = (props: ComboGridProps) => {
// 	const { crew, fuseGroups } = props;
// 	let combos = [...props.combos];

// 	let [fuseIndex, setFuseIndex] = React.useState(1);
// 	let [groupIndex, setGroupIndex] = React.useState(0);

// 	React.useEffect(() => {
// 		setGroupIndex(0);
// 	}, [fuseIndex]);

// 	// Reset indices if out of bounds after changing filters
// 	if (fuseGroups['x'+fuseIndex] === undefined) fuseIndex = 1;
// 	const groups = fuseGroups['x'+fuseIndex];
// 	if (groups[groupIndex] === undefined) groupIndex = 0;

// 	const fuseOptions = [] as NumericOptions[];
// 	[1, 2, 3, 4, 5].forEach(fuse => {
// 		const fuseId = 'x' + fuse;
// 		if (fuseGroups[fuseId] && fuseGroups[fuseId].length > 0) {
// 			fuseOptions.push({ key: fuse, value: fuse, text: fuseId });
// 		}
// 	});

// 	let groupOptions = [] as NumericOptions[];
// 	if (fuseIndex > 1) {
// 		combos = groups[groupIndex].map((comboId) => combos[comboId]);
// 		groupOptions = groups.map((group, groupId) => {
// 			return { key: groupId, value: groupId, text: 'Option '+(groupId+1) };
// 		});
// 		// Only show first 200 options
// 		if (groupOptions.length > 200)
// 			groupOptions = groupOptions.slice(0, 200);
// 	}

// 	return (
// 		<div>
// 			<div className='title' style={{ marginBottom: '1em' }}>
// 				Use <b>{fuseIndex == 1 ? combos.length == 1 ? 'the combo' : 'any combo' : 'all combos'}</b> below to retrieve <b>{crew.name}</b>
// 				{fuseOptions.length > 1 && (
// 					<Dropdown
// 						style={{ marginLeft: '1em' }}
// 						options={fuseOptions}
// 						value={fuseIndex}
// 						onChange={(e, { value }) => setFuseIndex(value as number)}
// 					/>
// 				)}
// 				{groupOptions.length > 1 && (
// 					<Dropdown scrolling
// 						style={{ marginLeft: '1em' }}
// 						options={groupOptions}
// 						value={groupIndex}
// 						onChange={(e, { value }) => setGroupIndex(value as number)}
// 					/>
// 				)}
// 			</div>
// 			<div className='content' style={{overflow: "auto", maxHeight: "40em"}}>
// 				<Grid columns='equal' onClick={() => cycleGroupOptions()}>
// 					{combos.map((combo, cdx) =>
// 						<Grid.Row key={'combo'+cdx}>
// 							{combo.map((polestar, pdx) => (
// 								<Grid.Column key={'combo'+cdx+',polestar'+pdx}>
// 									<img width={32} src={`${process.env.GATSBY_ASSETS_URL}${polestar?.icon.file.slice(1).replace(/\//g, '_')}`} />
// 									<br />{polestar?.short_name}
// 									<br /><small>({polestar?.loaned ? `${polestar.quantity-polestar.loaned} +${polestar.loaned} added` : polestar?.quantity})</small>
// 								</Grid.Column>
// 							))}
// 						</Grid.Row>
// 					)}
// 				</Grid>
// 			</div>
// 		</div>
// 	);

// 	function cycleGroupOptions(): void {
// 		if (groupOptions.length <= 1) return;
// 		setGroupIndex(groupIndex+1 < groupOptions.length ? groupIndex+1 : 0);
// 	}
// };

// export default CrewRetrieval;
