import React from 'react';
import { Modal, Button, Form, Input, Dropdown, Table, Message, Icon } from 'semantic-ui-react';

import { IVoyageCrew } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import { appelate } from '../../utils/misc';
import { countQuippedSlots, crewCopy, getVariantTraits } from '../../utils/crewutils';

interface IThemeOption {
	key: string;
	name: string;
	description: string;
	category: string;
	keywords: string[];
	eligible: number;
	collectionCount?: number;
	onSelect: () => void;
	notes?: JSX.Element;
};

interface IThemeCategory {
	name: string;
	themes: IThemeOption[];
}

type CrewThemesProps = {
	rosterType: 'allCrew' | 'myCrew';
	rosterCrew: IVoyageCrew[];
	preExcludeCrew: (preConsideredCrew: IVoyageCrew[]) => IVoyageCrew[];
	considerActive: boolean;
	considerFrozen: boolean;
	setPreConsideredCrew: (preConsideredCrew: IVoyageCrew[]) => void;
};

export const CrewThemes = (props: CrewThemesProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const [themes, setThemes] = React.useState<IThemeOption[]>([] as IThemeOption[]);
	const [categories, setCategories] = React.useState<IThemeCategory[]>([] as IThemeCategory[]);
	const [selectedTheme, setSelectedTheme] = React.useState<IThemeOption | undefined>(undefined);

	React.useEffect(() => {
		calculateThemes();
	}, [props.rosterCrew, props.considerActive, props.considerFrozen]);

	if (!selectedTheme) return renderModal();

	return (
		<Message icon onDismiss={clearTheme}>
			<Icon name='paint brush' color='blue' />
			<Message.Content>
				<Message.Header>
					{selectedTheme.name}
				</Message.Header>
				{selectedTheme.description}
				<div style={{ marginTop: '.5em' }}>
					{renderModal()}
				</div>
			</Message.Content>
		</Message>
	);

	function renderModal(): JSX.Element {
		return (
			<CrewThemePicker
				themes={themes}
				categories={categories}
				selectedTheme={selectedTheme}
				setSelectedTheme={setSelectedTheme}
			/>
		);
	}

	function calculateThemes(): void {
		const themes = [] as IThemeOption[];

		const preExcludedCrew = props.preExcludeCrew(props.rosterCrew);

		globalContext.core.collections.forEach(collection => {
			const crewIds = props.rosterCrew.filter(crew => (collection.crew ?? []).includes(crew.symbol)).map(crew => crew.id);
			const eligibleIds = preExcludedCrew.filter(crew => crewIds.includes(crew.id));
			const theme = {
				key: `collection-${collection.id}`,
				name: collection.name,
				description: collection.description ? simplerDescription(collection.description) : '',
				crewIds,
				keywords: ['collection'],
				eligible: eligibleIds.length,
				collectionCount: collection.crew ? collection.crew.length : 0,
				category: "Collections",
				onSelect: () => filterByCrewIds(crewIds)
			} as IThemeOption;
			let notes: JSX.Element | undefined = undefined;
			if (collection.crew && collection.crew.length < 12)
				notes = <><Icon name='warning sign' color='red' />Theme impossible because there aren't enough crew in this collection yet.</>;
			else
				notes = getThemeNotes(eligibleIds.length);
			if (notes) theme.notes = notes;
			themes.push(theme);
		});

		let scn = globalContext.core.collections.filter(col => {
			if (col.milestones) {
				return !col.milestones.some(ms => !!ms.buffs.length)
			}
			return false;
		}).map(col => col.name)

		const smallerCrew = globalContext.core.crew.filter(crew => crew.collections.some(col => scn.includes(col))).map(crew => crew.symbol);

		// This gets all non-collection traits into custom themes
		// It relies on player data and creates a lot of themes so it is commented out.

		// let rtraits = globalContext.core.crew.map(crew => crew.traits).flat();
		// rtraits = rtraits.filter((f, idx) => rtraits.findIndex(fi => fi === f) === idx);
		// const nonCollections = rtraits.filter(trait => !globalContext.player.playerData?.player.character.cryo_collections.some(cc => cc.traits?.some(tr => tr === trait)));

		// nonCollections.forEach(trait => {
		// 	trait = trait.toLowerCase();
		// 	const crewIds = props.rosterCrew.filter(crew => crew.traits.some(t => t.toLowerCase() === trait)).map(crew => crew.id);
		// 	const eligibleIds = preExcludedCrew.filter(crew => crewIds.includes(crew.id));
		// 	const theme = {
		// 		key: `noncollection-${trait}`,
		// 		name: appelate(trait),
		// 		description: 'Crew with the \"' + appelate(trait) + '\" non-collection trait',
		// 		crewIds,
		// 		keywords: ['noncollection', 'non-collection', 'trait'],
		// 		eligible: eligibleIds.length,
		// 		collectionCount: crewIds.length,
		// 		onSelect: () => filterByCrewIds(crewIds)
		// 	} as IThemeOption;
		// 	let notes: JSX.Element | undefined = undefined;
		// 	if (crewIds.length < 12)
		// 		notes = <><Icon name='warning sign' color='red' />Theme impossible because there aren't enough crew in this collection yet.</>;
		// 	else
		// 		notes = getThemeNotes(eligibleIds.length);
		// 	if (notes) theme.notes = notes;
		// 	themes.push(theme);
		// });



		interface ISeriesOption {
			key: string;
			name: string;
		};
		([
			{ key: 'tos', name: t('series.tos') },
			{ key: 'tas', name: t('series.tas') },
			{ key: 'tng', name: t('series.tng') },
			{ key: 'ds9', name: t('series.ds9') },
			{ key: 'voy', name: t('series.voy') },
			{ key: 'ent', name: t('series.ent') },
			{ key: 'dsc', name: t('series.dsc') },
			{ key: 'pic', name: t('series.pic') },
			{ key: 'low', name: t('series.low') },
			{ key: 'snw', name: t('series.snw') },
			{ key: 'vst', name: t('series.vst') },
			{ key: 'sfa', name: t('series.sfa') },
		] as ISeriesOption[]).forEach(series => {
			const crewIds = props.rosterCrew.filter(crew => crew.traits_hidden.includes(series.key)).map(crew => crew.id);
			const eligibleIds = preExcludedCrew.filter(crew => crewIds.includes(crew.id));
			const theme = {
				key: series.key,
				name: `Star Trek ${series.name}`,
				description: `Crew from Star Trek ${series.name} (${series.key.toUpperCase()})`,
				keywords: ['series'],
				eligible: eligibleIds.length,
				category: "Series",
				onSelect: () => filterByCrewIds(crewIds)
			} as IThemeOption;
			const notes = getThemeNotes(eligibleIds.length);
			if (notes) theme.notes = notes;
			themes.push(theme);
		});

		interface ICustomTheme {
			key: string;
			name: string;
			description: string;
			keywords: string[];
			category: string;
			filter: (crew: IVoyageCrew) => boolean;
		};

		const topCrew = [] as string[];
		let trips = [... new Set(props.rosterCrew.map(c => c.ranks.voyTriplet?.name ?? ''))].filter(f => f != '');
		let ranks = [... new Set(props.rosterCrew.map(c => Object.keys(c.ranks).filter(key => key.startsWith("V_") || key.startsWith("B_"))).flat())];
		for(let trip of trips) {
			let testCrew = props.rosterCrew.filter(f => f.ranks.voyTriplet?.name === trip);
			if (!!testCrew?.length) {
				testCrew = testCrew.sort((a, b) => (a.ranks.voyTriplet?.rank ?? 0) - (b.ranks.voyTriplet?.rank ?? 0));
				for (let i = 0; i < testCrew.length; i++) {
					if (testCrew[i].immortal === 0) continue;
					if (!topCrew.includes(testCrew[i].symbol)) {
						topCrew.push(testCrew[i].symbol);
					}
					break;
				}
			}
		}

		for(let rank of ranks) {
			let testCrew = props.rosterCrew.filter(f => rank in f.ranks);
			if (!!testCrew?.length) {
				testCrew = testCrew.sort((a, b) => (a.ranks[rank] ?? 0) - (b.ranks[rank] ?? 0));
				for (let i = 0; i < testCrew.length; i++) {
					if (testCrew[i].immortal === 0) continue;
					if (!topCrew.includes(testCrew[i].symbol)) {
						topCrew.push(testCrew[i].symbol);
					}
					break;
				}
			}
		}

		// let traits = [ ... new Set(globalContext.core.crew.map(c => c.traits_named).flat()) ].sort();
		// console.log(traits);


		const customThemes = [
			{
				key: 'super rare',
				name: 'Super Rare Crew',
				description: 'Super Rare (4 Star) Crew',
				keywords: ['rarity'],
				category: 'Roster',
				filter: (crew: IVoyageCrew) => crew.max_rarity === 4
			},
			{
				key: 'consolation',
				name: 'Consolation Prize',
				description: 'Removes your best crew in each skill, pair or triplet from the roster.',
				keywords: ['ranking'],
				category: 'Ranking',
				filter: (crew: IVoyageCrew) => !topCrew.includes(crew.symbol)
			},
			{
				key: 'alien',
				name: 'Alien Elites',
				description: 'Extraterrestrial legendary crew',
				keywords: ['trait'],
				category: 'Traits',
				filter: (crew: IVoyageCrew) => crew.max_rarity === 5 && !crew.traits.includes("human") && crew.traits_hidden.includes('nonhuman') && !crew.traits_hidden.includes('artificial_life')
			},
			{
				key: 'female',
				name: 'Ladies\' Choice',
				description: 'Female crew',
				keywords: ['trait'],
				category: 'Traits',
				filter: (crew: IVoyageCrew) => crew.traits_hidden.includes('female')
			},
			{
				key: 'starfleet',
				name: 'Ad Astra Per Aspera',
				description: 'Crew with the Starfleet trait',
				keywords: ['trait'],
				category: 'Traits',
				filter: (crew: IVoyageCrew) => crew.traits.includes('starfleet')
			},
			{
				key: 'nonhuman',
				name: 'Extra-terrestrial',
				description: 'Non-human crew',
				keywords: ['trait'],
				category: 'Traits',
				filter: (crew: IVoyageCrew) => crew.traits_hidden.includes('nonhuman')
			},
			{
				key: 'freshman',
				name: 'Freshman Class',
				description: 'Crew released in the past year',
				keywords: ['age'],
				category: 'Roster',
				filter: (crew: IVoyageCrew) => {
					const dtNow = Date.now();
					const dtAdded = new Date(crew.date_added);
					return dtAdded.getTime() > (dtNow - (365*24*60*60*1000));
				}
			},
			{
				key: 'captains',
				name: 'Captain\'s Prerogative',
				description: 'Captains who have leading roles in their respective shows (i.e. TOS Kirk, TNG Picard, DS9 Sisko, VOY Janeway, ENT Archer, DSC Burnham, or SNW Pike)',
				category: 'Roster',
				keywords: ['variant','series'],
				filter: (crew: IVoyageCrew) => {
					const captains = [
						['kirk', 'tos'],
						['picard', 'tng'],
						['sisko', 'ds9'],
						['janeway', 'voy'],
						['archer', 'ent'],
						['burnham', 'dsc'],
						['pike', 'snw']
					];
					return captains.some(traitpair => {
						return traitpair.every(trait => crew.traits_hidden.includes(trait));
					});
				}
			},
			{
				key: 'bottomcrew',
				name: 'Bottom of the Barrel',
				description: 'Crew who are graded F by CAB',
				keywords: ['ranking'],
				category: 'Ranking',
				filter: (crew: IVoyageCrew) => crew.cab_ov_grade === 'F'
			},
			{
				key: 'twoskills',
				name: 'Double Majors',
				description: 'Crew who have exactly 2 skills',
				keywords: ['skill'],
				category: 'Ranking',
				filter: (crew: IVoyageCrew) => Object.keys(crew.base_skills).length === 2
			},
			{
				key: 'state',
				name: 'Matters of State',
				description: 'Royalty, Politicians, and Diplomats',
				keywords: ['trait'],
				category: 'Traits',
				filter: (crew: IVoyageCrew) => crew.traits.some(trait => ["royalty", "diplomat", "politician"].includes(trait))
			},
			{
				key: 'vanity',
				name: 'Vanity Fair',
				description: 'Crew who are members of vanity collections',
				keywords: ['trait'],
				category: 'Traits',
				filter: (crew: IVoyageCrew) => smallerCrew.includes(crew.symbol)
			},
			{
				key: 'multivariant',
				name: 'Me, and Me, and also Me',
				description: 'Crew who have five or more legendary variants',
				keywords: ['trait'],
				category: 'Roster',
				filter: (crew: IVoyageCrew) => {
					let vartrait = getVariantTraits(crew);
					let ct = globalContext.core.crew.filter(fcrew => fcrew.max_rarity === 5 && fcrew.traits_hidden.some(th => vartrait.includes(th))).length;
					return ct >= 5;
				}
			},
			{
				key: 'gauntlet',
				name: 'Moonlighting',
				description: 'Crew who are top-ranked for gauntlet',
				keywords: ['ranking'],
				category: 'Ranking',
				filter: (crew: IVoyageCrew) => crew.ranks.gauntletRank <= 20 || Object.keys(crew.ranks).filter(r => r.startsWith("G_"))?.some(key => crew.ranks[key] <= 20)
			},
			{
				key: 'noquip',
				name: 'Corporate Reach-back',
				description: 'Crew with no unlocked quipment slots',
				keywords: ['quipment'],
				category: 'Quipment',
				filter: (crew: IVoyageCrew) => !crew.immortal || crew.q_bits < 100
			},
			{
				key: 'quipfocus',
				name: 'Hunker Down',
				description: 'Exclude crew that have run at least one continuum mission, but have fewer than four quipment slots unlocked',
				keywords: ['quipment'],
				category: 'Quipment',
				filter: (crew: IVoyageCrew) => !crew.immortal || !(crew.q_bits > 0 && crew.q_bits < 1300)
			},
			{
				key: 'quipstrikeforce',
				name: 'No Distractions',
				description: 'Exclude crew that are currently fully quipped',
				keywords: ['quipment'],
				category: 'Quipment',
				filter: (crew: IVoyageCrew) => !crew.immortal || countQuippedSlots(crew) !== 4
			},
			{
				key: 'quipnotmax',
				name: 'Prior Commitments',
				description: 'Exclude crew that can be fully quipped',
				keywords: ['quipment'],
				category: 'Quipment',
				filter: (crew: IVoyageCrew) => !crew.immortal || !(crew.q_bits >= 1300)
			},
			{
				key: 'quipstress',
				name: 'The Clique',
				description: 'Include only quippable crew (1 to 4 slots)',
				keywords: ['quipment'],
				category: 'Quipment',
				filter: (crew: IVoyageCrew) => crew.q_bits >= 100
			},
			{
				key: 'quipbreakit',
				name: 'Break The Machine',
				description: 'Include only max quippable crew (4 slots)',
				keywords: ['quipment'],
				category: 'Quipment',
				filter: (crew: IVoyageCrew) => crew.q_bits >= 1300
			},
			{
				key: 'lightside',
				name: 'Luminous and Noble',
				description: 'Crew with the following traits: Caregiver, Counselor, Cultural Figure, Hero, Innovator, Inspiring, Nurse, Physician, Prodigy, Playful',
				keywords: ['traits'],
				category: 'Traits',
				filter: (crew: IVoyageCrew) => {
					return crew.traits.some(t => ["caregiver",
						"counselor",
						"cultural_figure",
						"hero",
						"innovator",
						"inspiring",
						"nurse",
						"doctor",
						"prodigy",
						"playful"].includes(t))
				}
			},
			{
				key: 'darkside',
				name: 'Dark and Edgy',
				description: 'Crew with the following traits: Brutal, Crafty, Criminal, Maverick, Saboteur, Scoundrel, Smuggler, Thief, Villain, Vengeful',
				keywords: ['traits'],
				category: 'Traits',
				filter: (crew: IVoyageCrew) => {
					return crew.traits.some(t => ["Brutal",
						"crafty",
						"criminal",
						"maverick",
						"saboteur",
						"scoundrel",
						"smuggler",
						"thief",
						"villain",
						"vengeful"].includes(t))
				}
			}
		] as ICustomTheme[];

		if (props.rosterType === 'myCrew') {
			customThemes.push({
				key: 'todolist',
				name: 'To-Do List',
				description: 'Crew who are not fully fused',
				keywords: ['rarity'],
				category: 'Roster',
				filter: (crew: IVoyageCrew) => crew.rarity < crew.max_rarity
			} as ICustomTheme);

			customThemes.push({
				key: 'todolistleg',
				name: 'To-Do List (Legendaries)',
				description: 'Legendary crew who are not fully fused',
				keywords: ['rarity'],
				category: 'Roster',
				filter: (crew: IVoyageCrew) => crew.max_rarity === 5 && crew.rarity < crew.max_rarity
			} as ICustomTheme);

			customThemes.push({
				key: 'meremortals',
				name: 'Mere Mortals',
				description: 'Crew who are not immortalized',
				keywords: ['rarity'],
				category: 'Roster',
				filter: (crew: IVoyageCrew) => !crew.immortal
			} as ICustomTheme);

			customThemes.push({
				key: 'meremortalsleg',
				name: 'Mere Mortals (Legendaries)',
				description: 'Legendary crew who are not immortalized',
				keywords: ['rarity'],
				category: 'Roster',
				filter: (crew: IVoyageCrew) => crew.max_rarity === 5 && !crew.immortal
			} as ICustomTheme);

		}

		customThemes.forEach(custom => {
			const crewIds = props.rosterCrew.filter(crew => custom.filter(crew)).map(crew => crew.id);
			const eligibleIds = preExcludedCrew.filter(crew => crewIds.includes(crew.id));
			const theme = {
				key: custom.key,
				name: custom.name,
				description: custom.description,
				category: custom.category,
				keywords: ['custom', ... custom.keywords],
				eligible: eligibleIds.length,
				onSelect: () => filterByCrewIds(crewIds)
			} as IThemeOption;
			const notes = getThemeNotes(eligibleIds.length);
			if (notes) theme.notes = notes;
			themes.push(theme);
		});

		const categories = [ ... new Set(themes.map(c => c.category)) ].sort().map(name => {
			return {
				name,
				themes: themes.filter(t => t.category === name)
			} as IThemeCategory;
		});

		setCategories(categories);
		setThemes([...themes]);
	}

	function simplerDescription(description: string): string {
		let simple = description.replace(/&lt;/g, '<').replace(/&gt;/g, '>') /* Webarchive import fix */
			.replace(/(<([^>]+)>)/g, '')
			.replace('Immortalize ', '')
			.replace(/^the /i, '')
			.replace(/\.$/, '');
		return simple.slice(0, 1).toUpperCase() + simple.slice(1);
	}

	function getThemeNotes(eligibleCount: number): JSX.Element | undefined {
		if (eligibleCount < 12)
			return <><Icon name='warning sign' color='red' />Theme ineligible because you don't have enough crew available.</>;
		else if (eligibleCount < 20)
			return <><Icon name='warning sign' color='yellow' />There may not be enough crew to configure a valid voyage with this theme.</>;
		return undefined;
	}

	function filterByCrewIds(crewIds: number[]): void {
		const rosterCrew = props.rosterCrew.filter(crew => crewIds.includes(crew.id));
		props.setPreConsideredCrew([...rosterCrew]);
	}

	function clearTheme(): void {
		props.setPreConsideredCrew([...props.rosterCrew]);
		setSelectedTheme(undefined);
	}
};

type CrewThemePickerProps = {
	themes: IThemeOption[];
	categories: IThemeCategory[];
	selectedTheme: IThemeOption | undefined;
	setSelectedTheme: (selectedTheme: IThemeOption | undefined) => void;
};

const CrewThemePicker = (props: CrewThemePickerProps) => {
	const { themes, selectedTheme, setSelectedTheme, categories } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);

	return (
		<Modal
			size='small'
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
			centered={false}
		>
			<Modal.Header>
				Themed Voyages
			</Modal.Header>
			<Modal.Content scrolling>
				<p>Select a theme to consider crew who you normally wouldn't send out on voyages. Your voyage may not run as long as it would with your regulars, but the crew may yet surprise you!</p>
				{modalIsOpen && <ThemesTable themes={themes} categories={categories} selectTheme={onThemeSelected} />}
			</Modal.Content>
			<Modal.Actions>
				{selectedTheme &&
					<Button color='red' onClick={() => setSelectedTheme(undefined)}>
						Clear theme
					</Button>
				}
				<Button onClick={() => setModalIsOpen(false)}>
					Close
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): JSX.Element {
		if (!selectedTheme) return <Button icon='paint brush' content='Themed Voyages...' />;
		return (
			<Button floated='right' content='Choose a different voyage theme...' />
		);
	}

	function onThemeSelected(theme: IThemeOption): void {
		theme.onSelect();
		setSelectedTheme(theme);
		setModalIsOpen(false);
	}
};

type ThemesTableProps = {
	themes: IThemeOption[];
	categories: IThemeCategory[];
	selectTheme: (theme: IThemeOption) => void;
};

const ThemesTable = (props: ThemesTableProps) => {
	const [state, dispatch] = React.useReducer(reducer, {
		data: props.themes.sort((a, b) => a.name.localeCompare(b.name)),
		column: 'name',
		direction: 'ascending'
	});
	const { data, column, direction } = state;
	const { categories } = props;

	const [query, setQuery] = React.useState('');
	const [highlightedTheme, setHighlightedTheme] = React.useState<IThemeOption | undefined>(undefined);
	const [themeFilter, setThemeFilter] = React.useState<string>('ineligible');
	const [activeCategories, setActiveCategories] = React.useState<string[] | undefined>(undefined);

	const themeFilterOptions = [
		{ key: 'none', value: '', text: 'Show all themes' },
		{ key: 'impossible', value: 'impossible', text: 'Hide impossible collection-based themes' },
		{ key: 'ineligible', value: 'ineligible', text: 'Hide all ineligible themes' },
	];

	const themeCategoryOptions = categories.map(cat => ({
		key: cat.name, value: cat.name, text: cat.name
	}));

	interface ICustomRow {
		column: string;
		title: string;
		align: 'left' | 'center' | 'right' | undefined;
		descendFirst?: boolean;
	};

	const tableConfig = [
		{ column: 'name', title: 'Theme', align: 'left' },
		{ column: 'eligible', title: 'Eligible Crew', descendFirst: true }
	] as ICustomRow[];

	const filteredData = data.filter((theme: IThemeOption) => {
		if (themeFilter === 'ineligible' && theme.eligible < 12) return false;
		if (themeFilter === 'impossible' && (!theme.collectionCount || theme.collectionCount < 12)) return false;
		if (query === '') return true;
		const re = new RegExp(query, 'i');
		return re.test(theme.name) || re.test(theme.description) || theme.keywords.some(kw => re.test(kw));
	}) as IThemeOption[];

	const filteredCategories = categories
		.filter(f => !activeCategories?.length || activeCategories.includes(f.name))
		.map((cat) => ({
		... cat,
		themes: cat.themes.filter(f => filteredData.some(fs => fs.name === f.name))
	}));

	return (
		<React.Fragment>
			<Form>
				<Input fluid iconPosition='left'
					placeholder='Search for themes by name or description...'
					value={query}
					onChange={(e, { value }) => setQuery(value)}
				>
					<input />
					<Icon name='search' />
					<Button icon onClick={() => setQuery('')}>
						<Icon name='delete' />
					</Button>
				</Input>
				<Form.Group inline style={{marginTop: "0.5em"}}>
					<Form.Field
						placeholder='Filter themes'
						control={Dropdown}
						clearable
						selection
						options={themeFilterOptions}
						value={themeFilter}
						onChange={(e, { value }) => setThemeFilter(value as string)}
					/>
					<Form.Field
						placeholder='Filter categories'
						control={Dropdown}
						clearable
						selection
						multiple
						options={themeCategoryOptions}
						value={activeCategories}
						onChange={(e, { value }) => setActiveCategories(value as string[])}
					/>
				</Form.Group>
			</Form>

			{filteredCategories.map((cat) => (
				<div style={{marginTop: '0.25em', marginBottom: '0.25em'}}>
					<div className='ui header segment'>{cat.name}</div>
					<Table sortable celled selectable striped>
						<Table.Header>
							<Table.Row>
								{tableConfig.map((cell, idx) => (
									<Table.HeaderCell key={idx}
										textAlign={cell.align ?? 'center'}
										sorted={column === cell.column ? direction : undefined}
										onClick={() => dispatch({ type: 'CHANGE_SORT', column: cell.column, descendFirst: cell.descendFirst })}
									>
										{cell.title}
									</Table.HeaderCell>
								))}
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{cat.themes.map(row => renderTableRow(row))}
						</Table.Body>
					</Table>
				</div>
			))}

			{/* <Table sortable celled selectable striped>
				<Table.Header>
					<Table.Row>
						{tableConfig.map((cell, idx) => (
							<Table.HeaderCell key={idx}
								textAlign={cell.align ?? 'center'}
								sorted={column === cell.column ? direction : undefined}
								onClick={() => dispatch({ type: 'CHANGE_SORT', column: cell.column, descendFirst: cell.descendFirst })}
							>
								{cell.title}
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{filteredData.map(row => renderTableRow(row))}
				</Table.Body>
			</Table> */}
			{filteredData.length === 0 && <p>No themes found.</p>}
		</React.Fragment>
	);

	function renderTableRow(row: IThemeOption): JSX.Element {
		const isHighlighted = highlightedTheme?.key === row.key;
		return (
			<Table.Row key={row.key}
				onClick={() => validateTheme(row)}
				active={isHighlighted}
				style={{ cursor: 'pointer' }}
			>
				<Table.Cell>
					<span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
						{row.name}
					</span>
					<div>{row.description}</div>
					{!isHighlighted && !!row.notes && <div style={{ marginTop: '.5em' }}>{row.notes}</div>}
					{isHighlighted && row.notes && <Message error>{row.notes}</Message>}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
						{row.eligible}
					</span>
				</Table.Cell>
			</Table.Row>
		);
	}

	function validateTheme(theme: IThemeOption): void {
		if (theme.eligible < 12) {
			setHighlightedTheme(theme);
			return;
		}
		setHighlightedTheme(undefined);
		props.selectTheme(theme);
	}

	function reducer(state: any, action: any): any {
		switch (action.type) {
			case 'UPDATE_DATA':
				const updatedData = action.data.slice();
				sorter(updatedData, 'name', 'ascending');
				return {
					column: 'name',
					data: updatedData,
					direction: 'ascending'
				};
			case 'CHANGE_SORT':
				let direction = action.descendFirst ? 'descending' : 'ascending';
				// Reverse sort
				if (state.column === action.column) {
					direction = state.direction === 'ascending' ? 'descending' : 'ascending';
				}
				const data = state.data.slice();
				sorter(data, action.column, direction);
				return {
					column: action.column,
					data: data,
					direction
				};
			default:
				throw new Error();
		}
	}

	function sorter(data: IThemeOption[], column: string, direction: string): void {
		const sortBy = (comps: ((a: IThemeOption, b: IThemeOption) => number)[]) => {
			data.sort((a, b) => {
				const tests = comps.slice();
				let test = 0;
				while (tests.length > 0 && test === 0) {
					let shtest = tests.shift();
					test = shtest ? shtest(a, b) : 0;
				}
				return test;
			});
		};
		const getValueFromPath = (obj: any, path: string) => {
			return path.split('.').reduce((a, b) => (a || {b: 0})[b], obj);
		};

		const compareNumberColumn = (a: IThemeOption, b: IThemeOption) => {
			if (direction === 'descending') return getValueFromPath(b, column) - getValueFromPath(a, column);
			return getValueFromPath(a, column) - getValueFromPath(b, column);
		};
		const compareTextColumn = (a: IThemeOption, b: IThemeOption) => {
			if (direction === 'descending') return getValueFromPath(b, column).localeCompare(getValueFromPath(a, column));
			return getValueFromPath(a, column).localeCompare(getValueFromPath(b, column));
		};
		const compareName = (a: IThemeOption, b: IThemeOption) => a.name.localeCompare(b.name);

		if (column === 'name') {
			sortBy([compareTextColumn]);
			return;
		}

		sortBy([compareNumberColumn, compareName]);
		return;
	}
};
