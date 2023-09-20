import React from 'react';
import { Modal, Button, Form, Input, Dropdown, Table, Message, Icon } from 'semantic-ui-react';

import { IVoyageCrew } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';

interface IThemeOption {
	key: string;
	name: string;
	description: string;
	keywords: string;
	eligible: number;
	collectionCount?: number;
	onSelect: () => void;
};

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

	const [themes, setThemes] = React.useState<IThemeOption[]>([] as IThemeOption[]);
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
				<div style={{ marginTop: '1em' }}>
					{renderModal()}
				</div>
			</Message.Content>
		</Message>
	);

	function renderModal(): JSX.Element {
		return (
			<CrewThemePicker
				themes={themes}
				selectedTheme={selectedTheme}
				setSelectedTheme={setSelectedTheme}
			/>
		);
	}

	function calculateThemes(): void {
		const themes = [] as IThemeOption[];

		const preExcludedCrew = props.preExcludeCrew(props.rosterCrew);

		globalContext.core.collections.forEach(collection => {
			const key = `collection-${collection.id}`;
			const description = collection.description ? simplerDescription(collection.description) : '';
			const crewIds = props.rosterCrew.filter(crew => (collection.crew ?? []).includes(crew.symbol)).map(crew => crew.id);
			const eligibleIds = preExcludedCrew.filter(crew => crewIds.includes(crew.id));
			themes.push({
				key,
				name: collection.name,
				description,
				keywords: 'collection',
				eligible: eligibleIds.length,
				collectionCount: collection.crew ? collection.crew.length : 0,
				onSelect: () => filterByCrewIds(crewIds)
			});
		});

		interface ISeriesOption {
			key: string;
			name: string;
		};
		([
			{ key: 'tos', name: 'The Original Series' },
			{ key: 'tas', name: 'The Animated Series' },
			{ key: 'tng', name: 'The Next Generation' },
			{ key: 'ds9', name: 'Deep Space Nine' },
			{ key: 'voy', name: 'Voyager' },
			{ key: 'pic', name: 'Picard' },
			{ key: 'low', name: 'Lower Decks' },
			{ key: 'snw', name: 'Strange New Worlds' },
		] as ISeriesOption[]).forEach(theme => {
			const crewIds = props.rosterCrew.filter(crew => crew.traits_hidden.includes(theme.key)).map(crew => crew.id);
			const eligibleIds = preExcludedCrew.filter(crew => crewIds.includes(crew.id));
			themes.push({
				key: theme.key,
				name: `Star Trek ${theme.name}`,
				description: `Crew from Star Trek ${theme.name} (${theme.key.toUpperCase()})`,
				keywords: 'series',
				eligible: eligibleIds.length,
				onSelect: () => filterByCrewIds(crewIds)
			} as IThemeOption);
		});

		interface IFilterOption {
			key: string;
			name: string;
			description: string;
			keywords: string;
			filter: (crew: IVoyageCrew) => boolean;
		};

		const customThemes = [
			{
				key: 'super rare',
				name: 'Super Rare Crew',
				description: 'Super Rare (4 Star) Crew',
				keywords: 'rarity',
				filter: (crew: IVoyageCrew) => crew.max_rarity === 4
			},
			{
				key: 'female',
				name: 'Ladies\' Choice',
				description: 'Female crew',
				keywords: 'trait',
				filter: (crew: IVoyageCrew) => crew.traits_hidden.includes('female')
			},
			{
				key: 'starfleet',
				name: 'Ad Astra Per Aspera',
				description: 'Crew with the Starfleet trait',
				keywords: 'trait',
				filter: (crew: IVoyageCrew) => crew.traits.includes('starfleet')
			},
			{
				key: 'nonhuman',
				name: 'Extra-terrestrial',
				description: 'Non-human crew',
				keywords: 'trait',
				filter: (crew: IVoyageCrew) => crew.traits_hidden.includes('nonhuman')
			},
			{
				key: 'freshman',
				name: 'Freshman Class',
				description: 'Crew released in the past year',
				keywords: 'age',
				filter: (crew: IVoyageCrew) => {
					const dtNow = Date.now();
					const dtAdded = new Date(crew.date_added);
					return dtAdded.getTime() > (dtNow - (365*24*60*60*1000));
				}
			},
			{
				key: 'captains',
				name: 'Captain\'s Prerogative',
				description: 'Only Kirks, Picards, Siskos, Janeways, Archers, Burnhams, or Pikes (as lead roles of their respective shows)',
				keywords: 'crew',
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
		] as IFilterOption[];

		if (props.rosterType === 'myCrew') {
			customThemes.push({
				key: 'meremortals',
				name: 'Mere Mortals',
				description: 'Crew who are not fully fused',
				keywords: 'rarity',
				filter: (crew: IVoyageCrew) => crew.rarity < crew.max_rarity
			} as IFilterOption);
		}

		customThemes.forEach(theme => {
			const crewIds = props.rosterCrew.filter(crew => theme.filter(crew)).map(crew => crew.id);
			const eligibleIds = preExcludedCrew.filter(crew => crewIds.includes(crew.id));
			themes.push({
				key: theme.key,
				name: theme.name,
				description: theme.description,
				keywords: 'trait',
				eligible: eligibleIds.length,
				onSelect: () => filterByCrewIds(crewIds)
			} as IThemeOption);
		});

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
	selectedTheme: IThemeOption | undefined;
	setSelectedTheme: (selectedTheme: IThemeOption | undefined) => void;
};

const CrewThemePicker = (props: CrewThemePickerProps) => {
	const { themes, selectedTheme, setSelectedTheme } = props;

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
				{modalIsOpen && <ThemesTable themes={themes} selectTheme={onThemeSelected} />}
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
			<Button floated='right' content='Choose a different themed voyage...' />
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
	selectTheme: (theme: IThemeOption) => void;
};

const ThemesTable = (props: ThemesTableProps) => {
	const [state, dispatch] = React.useReducer(reducer, {
		data: props.themes.sort((a, b) => a.name.localeCompare(b.name)),
		column: 'name',
		direction: 'ascending'
	});
	const { data, column, direction } = state;

	const [query, setQuery] = React.useState('');
	const [highlightedTheme, setHighlightedTheme] = React.useState<IThemeOption | undefined>(undefined);
	const [themeFilter, setThemeFilter] = React.useState<string>('ineligible');

	const themeFilterOptions = [
		{ key: 'none', value: '', text: 'Show all themes' },
		{ key: 'impossible', value: 'impossible', text: 'Hide impossible themes only' },
		{ key: 'ineligible', value: 'ineligible', text: 'Hide all ineligible themes' },
	];

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
		return re.test(theme.name) || re.test(theme.description) || re.test(theme.keywords);
	}) as IThemeOption[];

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
				<Form.Group inline>
					<Form.Field
						placeholder='Filter themes'
						control={Dropdown}
						clearable
						selection
						options={themeFilterOptions}
						value={themeFilter}
						onChange={(e, { value }) => setThemeFilter(value as string)}
					/>
				</Form.Group>
			</Form>
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
					{filteredData.map(row => renderTableRow(row))}
				</Table.Body>
			</Table>
			{filteredData.length === 0 && <p>No themes found.</p>}
		</React.Fragment>
	);

	function renderTableRow(row: IThemeOption): JSX.Element {
		const highlighted = highlightedTheme?.key === row.key;
		let errorMessage = '';
		if (highlighted) {
			if (row.collectionCount && row.collectionCount < 12)
				errorMessage = 'Theme impossible because there aren\'t enough crew in the game yet.';
			else if (row.eligible < 12)
				errorMessage = 'Theme ineligible because you don\'t have enough crew available.';
		}

		return (
			<Table.Row key={row.key}
				onClick={() => validateTheme(row)}
				active={highlighted}
				style={{ cursor: 'pointer' }}
			>
				<Table.Cell>
					<span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
						{row.name}
					</span>
					<div>{row.description}</div>
					{errorMessage !== '' && <Message error>{errorMessage}</Message>}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{row.eligible}</b>
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
