import React from 'react';
import { Modal, Button, Form, Input, Dropdown, Table, Message, Icon } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { BetaTachyonSettings } from '../../model/worker';
import { DefaultBetaTachyonSettings } from './btsettings';

export interface IPresetOption {
	key: string;
	name: string;
	description: string;
	category: string;
	keywords: string[];
	settings: BetaTachyonSettings;	
    custom: boolean;
	notes?: JSX.Element;
};

interface IPresetCategory {
	name: string;
	presets: IPresetOption[];
}

type BetaTachyonPresetsProps = {
    activeSettings?: BetaTachyonSettings;
    setActiveSettings: (value: BetaTachyonSettings) => void;
};

export const BetaTachyonPresets = (props: BetaTachyonPresetsProps) => {
	const globalContext = React.useContext(GlobalContext);

	const [presets, setPresets] = React.useState<IPresetOption[]>([] as IPresetOption[]);
	const [categories, setCategories] = React.useState<IPresetCategory[]>([] as IPresetCategory[]);
	const [selectedPreset, setSelectedPreset] = React.useState<IPresetOption | undefined>(undefined);

	if (!selectedPreset) return renderModal();

    React.useEffect(() => {
        renderPresets();
    }, [])

	return (
		<Message icon onDismiss={clearPreset}>
			<Icon name='paint brush' color='blue' />
			<Message.Content>
				<Message.Header>
					{selectedPreset.name}
				</Message.Header>
				{selectedPreset.description}
				<div style={{ marginTop: '.5em' }}>
					{renderModal()}
				</div>
			</Message.Content>
		</Message>
	);

	function renderModal(): JSX.Element {
		return (
			<BetaTachyonPresetPicker
				presets={presets}
				categories={categories}
				selectedPreset={selectedPreset}
				setSelectedPreset={setSelectedPreset}
			/>
		);
	}

	function renderPresets(): void {
		const presets = [] as IPresetOption[];
		const customPresets = [
			{
				key: 'standard',
				name: 'Standard Settings',
				description: 'Default settings balance between crew utility and likelihood of retrieval',
				keywords: ['standard'],
				category: 'Standard',
                settings: DefaultBetaTachyonSettings,
                custom: false
			}
		] as IPresetOption[];

		customPresets.forEach(custom => {
			presets.push(custom);
		});
		
		const categories = [ ... new Set(presets.map(c => c.category)) ].sort().map(name => {
			return {
				name,
				presets: presets.filter(t => t.category === name)
			} as IPresetCategory;
		});

		setCategories(categories);
		setPresets([...presets]);
	}
	
	function clearPreset(): void {		
		setSelectedPreset(undefined);
	}
};

type BetaTachyonPresetPickerProps = {
	presets: IPresetOption[];
	categories: IPresetCategory[];
	selectedPreset: IPresetOption | undefined;
	setSelectedPreset: (selectedTheme: IPresetOption | undefined) => void;
};

const BetaTachyonPresetPicker = (props: BetaTachyonPresetPickerProps) => {
    const { t, tfmt } = React.useContext(GlobalContext).localized;
    const { presets, selectedPreset, setSelectedPreset, categories } = props;

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
				{t('cite_opt.btp.settings_picker.title')}
			</Modal.Header>
			<Modal.Content scrolling>
				<p>{t('cite_opt.btp.settings_picker.heading')}</p>
				{modalIsOpen && <PresetsTable presets={presets} categories={categories} selectPreset={onPresetSelected} />}
			</Modal.Content>
			<Modal.Actions>
				{selectedPreset &&
					<Button color='red' onClick={() => setSelectedPreset(undefined)}>
						{t('global.clear')}
					</Button>
				}
				<Button onClick={() => setModalIsOpen(false)}>
					{t('global.close')}
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): JSX.Element {
		if (!selectedPreset) return <Button icon='paint brush' content={t('cite_opt.btp.settings_picker.button_text')} />;
		return (
			<Button floated='right' content={t('cite_opt.btp.settings_picker.change_button_text')} />
		);
	}

	function onPresetSelected(theme: IPresetOption): void {
		setSelectedPreset(theme);
		setModalIsOpen(false);
	}
};

type PresetsTableProps = {
	presets: IPresetOption[];
	categories: IPresetCategory[];
	selectPreset: (theme: IPresetOption) => void;
};

const PresetsTable = (props: PresetsTableProps) => {
	const [state, dispatch] = React.useReducer(reducer, {
		data: props.presets.sort((a, b) => a.name.localeCompare(b.name)),
		column: 'name',
		direction: 'ascending'
	});
	const { data, column, direction } = state;
	const { categories } = props;
	
	const [query, setQuery] = React.useState('');
	const [highlightedPreset, setHighlightedPreset] = React.useState<IPresetOption | undefined>(undefined);
	const [presetFilter, setPresetFilter] = React.useState<string>('custom-only');
	const [activeCategories, setActiveCategories] = React.useState<string[] | undefined>(undefined);

	const presetFilterOptions = [
		{ key: 'none', value: '', text: 'Show all presets' },
		{ key: 'built-in', value: 'built-in', text: 'Show only built-in presets' },
		{ key: 'custom-only', value: 'custom-only', text: 'Show only custom presets' },
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
		{ column: 'name', title: 'Preset', align: 'left' },
	] as ICustomRow[];

	const filteredData = data as IPresetOption[];

	const filteredCategories = categories
		.filter(f => !activeCategories?.length || activeCategories.includes(f.name))
		.map((cat) => ({
		... cat,
		themes: cat.presets.filter(f => filteredData.some(fs => fs.name === f.name))
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
						options={presetFilterOptions}
						value={presetFilter}
						onChange={(e, { value }) => setPresetFilter(value as string)}
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

	function renderTableRow(row: IPresetOption): JSX.Element {
		const isHighlighted = highlightedPreset?.key === row.key;
		return (
			<Table.Row key={row.key}
				onClick={() => validatePreset(row)}
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

			</Table.Row>
		);
	}

	function validatePreset(theme: IPresetOption): void {
		setHighlightedPreset(undefined);
		props.selectPreset(theme);
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

	function sorter(data: IPresetOption[], column: string, direction: string): void {
		const sortBy = (comps: ((a: IPresetOption, b: IPresetOption) => number)[]) => {
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

		const compareNumberColumn = (a: IPresetOption, b: IPresetOption) => {
			if (direction === 'descending') return getValueFromPath(b, column) - getValueFromPath(a, column);
			return getValueFromPath(a, column) - getValueFromPath(b, column);
		};
		const compareTextColumn = (a: IPresetOption, b: IPresetOption) => {
			if (direction === 'descending') return getValueFromPath(b, column).localeCompare(getValueFromPath(a, column));
			return getValueFromPath(a, column).localeCompare(getValueFromPath(b, column));
		};
		const compareName = (a: IPresetOption, b: IPresetOption) => a.name.localeCompare(b.name);

		if (column === 'name') {
			sortBy([compareTextColumn]);
			return;
		}

		sortBy([compareNumberColumn, compareName]);
		return;
	}
};
