import React from 'react';
import { Modal, Button, Input, Table, Message, Icon } from 'semantic-ui-react';

import { IVoyageCrew } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';

interface IThemeOption {
	key: string;
	name: string;
	description: string;
	category: 'collection' | 'series' | 'rarity' | 'trait' | 'age';
	eligible: number;
	onSelect: () => void;
};

type CrewThemesProps = {
	rosterType: 'allCrew' | 'myCrew';
	rosterCrew: IVoyageCrew[];
	preExcludedCrew: IVoyageCrew[];
	setPreConsideredCrew: (preConsideredCrew: IVoyageCrew[]) => void;
};

export const CrewThemes = (props: CrewThemesProps) => {
	const globalContext = React.useContext(GlobalContext);

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [themes, setThemes] = React.useState<IThemeOption[]>([] as IThemeOption[]);
	const [selectedTheme, setSelectedTheme] = React.useState<IThemeOption | undefined>(undefined);

	React.useEffect(() => {
		calculateThemes();
	}, [props.rosterCrew, props.preExcludedCrew]);

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
				{selectedTheme && <Button color='red' content='Clear Theme' onClick={clearTheme} />}
				<Button onClick={() => setModalIsOpen(false)}>
					Close
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function calculateThemes(): void {
		const themes = [] as IThemeOption[];

		globalContext.core.collections.forEach(collection => {
			const key = `collection-${collection.id}`;
			let description = '';
			if (collection.description) {
				description = collection.description.replace('Immortalize', '').replace(/\.$/, '');
			}
			const crewIds = props.rosterCrew.filter(crew => (collection.crew ?? []).includes(crew.symbol)).map(crew => crew.id);
			const eligibleIds = props.preExcludedCrew.filter(crew => crewIds.includes(crew.id));
			themes.push({
				key,
				name: collection.name,
				description: description,
				category: 'collection',
				eligible: eligibleIds.length,
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
			const eligibleIds = props.preExcludedCrew.filter(crew => crewIds.includes(crew.id));
			themes.push({
				key: theme.key,
				name: `Star Trek ${theme.name}`,
				description: `Crew from Star Trek ${theme.name} (${theme.key.toUpperCase()})`,
				category: 'series',
				eligible: eligibleIds.length,
				onSelect: () => filterByCrewIds(crewIds)
			} as IThemeOption);
		});

		interface IFilterOption {
			key: string;
			name: string;
			description: string;
			category: string;
			filter: (crew: IVoyageCrew) => boolean;
		};

		const customThemes = [
			{
				key: 'super rare',
				name: 'Super Rare Crew',
				description: 'Super Rare (4 Star) Crew',
				category: 'rarity',
				filter: (crew: IVoyageCrew) => crew.max_rarity === 4
			},
			{
				key: 'female',
				name: 'Ladies\' Choice',
				description: 'Female crew',
				category: 'trait',
				filter: (crew: IVoyageCrew) => crew.traits_hidden.includes('female')
			},
			{
				key: 'starfleet',
				name: 'Ad Astra Per Aspera',
				description: 'Crew with the Starfleet trait',
				category: 'trait',
				filter: (crew: IVoyageCrew) => crew.traits.includes('starfleet')
			},
			{
				key: 'nonhuman',
				name: 'Extra-terrestrial',
				description: 'Non-human crew',
				category: 'trait',
				filter: (crew: IVoyageCrew) => crew.traits_hidden.includes('nonhuman')
			},
			{
				key: 'freshman',
				name: 'Freshman Class',
				description: 'Crew released in the past year',
				category: 'age',
				filter: (crew: IVoyageCrew) => {
					const dtNow = Date.now();
					const dtAdded = new Date(crew.date_added);
					return dtAdded.getTime() > (dtNow - (365*24*60*60*1000));
				}
			},
		] as IFilterOption[];

		if (props.rosterType === 'myCrew') {
			customThemes.push({
				key: 'meremortals',
				name: 'Mere Mortals',
				description: 'Crew who are not fully fused',
				category: 'rarity',
				filter: (crew: IVoyageCrew) => crew.rarity < crew.max_rarity
			} as IFilterOption);
		}

		customThemes.forEach(theme => {
			const crewIds = props.rosterCrew.filter(crew => theme.filter(crew)).map(crew => crew.id);
			const eligibleIds = props.preExcludedCrew.filter(crew => crewIds.includes(crew.id));
			themes.push({
				key: theme.key,
				name: theme.name,
				description: theme.description,
				category: 'trait',
				eligible: eligibleIds.length,
				onSelect: () => filterByCrewIds(crewIds)
			} as IThemeOption);
		});

		setThemes([...themes]);
	}

	function renderTrigger(): JSX.Element {
		if (!selectedTheme) return <Button icon='paint brush' content='Themed Voyages...' />;
		return (
			<Button icon='paint brush' color='blue' content={`Theme: ${selectedTheme.name}`} />
		);
	}

	function onThemeSelected(theme: IThemeOption): void {
		theme.onSelect();
		setSelectedTheme(theme);
		setModalIsOpen(false);
	}

	function clearTheme(): void {
		props.setPreConsideredCrew([...props.rosterCrew]);
		setSelectedTheme(undefined);
		setModalIsOpen(false);
	}

	function filterByCrewSymbols(crewSymbols: string[] = []): void {
		const rosterCrew = props.rosterCrew.filter(crew => crewSymbols.includes(crew.symbol));
		props.setPreConsideredCrew([...rosterCrew]);
	}

	function filterByCrewIds(crewIds: number[]): void {
		const rosterCrew = props.rosterCrew.filter(crew => crewIds.includes(crew.id));
		props.setPreConsideredCrew([...rosterCrew]);
	}
};

type ThemesTableProps = {
	themes: IThemeOption[];
	selectTheme: (theme: IThemeOption) => void;
};

const ThemesTable = (props: ThemesTableProps) => {
	const [state, dispatch] = React.useReducer(reducer, {
		data: props.themes.sort((a, b) => a.name.localeCompare(b.name)),
		column: 'date',
		direction: 'descending'
	});
	const { data, column, direction } = state;

	const [query, setQuery] = React.useState('');
	const [highlightedTheme, setHighlightedTheme] = React.useState<IThemeOption | undefined>(undefined);

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

	const filteredData = data.filter(theme => {
		if (query === '') return true;
		const re = new RegExp(query, 'i');
		return re.test(theme.name) || re.test(theme.description) || re.test(theme.category);
	});

	return (
		<React.Fragment>
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
					<div dangerouslySetInnerHTML={{ __html: row.description }} />
					{highlighted && <Message error>Not enough eligible crew to select this theme!</Message>}
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
				sorter(updatedData, 'created_at', 'descending');
				return {
					column: 'created_at',
					data: updatedData,
					direction: 'descending'
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
