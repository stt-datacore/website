import React from 'react';
import { Modal, Button, Form, Input, Dropdown, Table, Message, Icon } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { BetaTachyonSettings } from '../../model/worker';
import { DefaultBetaTachyonSettings } from './btsettings';
import { ITableConfigRow, SearchableTable } from '../searchabletable';
import { OptionsPanelFlexRow } from '../stats/utils';

type BetaTachyonPresetsProps = {
	presets: BetaTachyonSettings[];
	setPresets: (value: BetaTachyonSettings[]) => void;
    activeSettings: BetaTachyonSettings;
    setActiveSettings: (value: BetaTachyonSettings) => void;
};

export const BetaTachyonPresets = (props: BetaTachyonPresetsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { presets, setPresets, activeSettings: selectedPreset, setActiveSettings: setSelectedPreset } = props;

	// const [presets, setPresets] = React.useState<BetaTachyonSettings[]>([] as BetaTachyonSettings[]);
	// const [categories, setCategories] = React.useState<IPresetCategory[]>([] as IPresetCategory[]);
	// const [selectedPreset, setSelectedPreset] = React.useState<BetaTachyonSettings | undefined>(undefined);

	// if (!selectedPreset) return renderModal();

    React.useEffect(() => {
        renderPresets();
    }, [])

	return renderModal();

	// return (
	// 	<Message icon onDismiss={clearPreset}>
	// 		<Icon name='paint brush' color='blue' />
	// 		<Message.Content>
	// 			<Message.Header>
	// 				{/* {selectedPreset.name} */}
	// 			</Message.Header>
	// 			{/* {selectedPreset.description} */}
	// 			<div style={{ marginTop: '.5em' }}>
	// 				{renderModal()}
	// 			</div>
	// 		</Message.Content>
	// 	</Message>
	// );

	function renderModal(): JSX.Element {
		return (
			<BetaTachyonPresetPicker
				presets={presets}
				setPresets={setPresets}
				selectedPreset={selectedPreset}
				setSelectedPreset={setSelectedPreset}
			/>
		);
	}

	function renderPresets(): void {
		setPresets([...presets]);
	}

	function clearPreset(): void {
		setSelectedPreset(DefaultBetaTachyonSettings);
	}
};

type BetaTachyonPresetPickerProps = {
	presets: BetaTachyonSettings[];
	setPresets: (value: BetaTachyonSettings[]) => void;
	selectedPreset: BetaTachyonSettings;
	setSelectedPreset: (value: BetaTachyonSettings) => void;
};

const BetaTachyonPresetPicker = (props: BetaTachyonPresetPickerProps) => {
	const context = React.useContext(GlobalContext);
    const { t, tfmt } = context.localized;
	const { confirm } = context;
    const { presets, selectedPreset, setSelectedPreset, setPresets } = props;

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
				{modalIsOpen && (
					<PresetsTable
						presets={presets}
						deletePreset={deletePreset}
						selectedPreset={selectedPreset}
						selectPreset={onPresetSelected}
					/>)}
			</Modal.Content>
			<Modal.Actions>
				{/* {selectedPreset &&
					<Button color='red' onClick={() => setSelectedPreset(DefaultBetaTachyonSettings)}>
						{t('global.clear')}
					</Button>
				} */}
				<Button onClick={() => setModalIsOpen(false)}>
					{t('global.close')}
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function deletePreset(name: string) {
		let found = presets.find(f => f.name?.toLowerCase()?.trim() === name?.toLowerCase().trim());
		if (found) {
			confirm({
				title: t('delete.title'),
				message: t('delete.prompt_x', { x: found.name }),
				onClose: (result) => {
					if (result) {
						let newpresets = presets.filter(f => f.name?.toLowerCase()?.trim() !== name?.toLowerCase().trim());
						setPresets(newpresets);
						if (selectedPreset?.name === found.name) {
							setSelectedPreset(DefaultBetaTachyonSettings);
						}
					}
				}
			});
		}
	}

	function renderTrigger(): JSX.Element {
		if (!selectedPreset) return <Button icon='paint brush' content={t('cite_opt.btp.settings_picker.button_text')} />;
		return (
			<Button floated='right' content={t('global.edit_presets')} />
		);
	}

	function onPresetSelected(theme: BetaTachyonSettings): void {
		setSelectedPreset(theme);
		setModalIsOpen(false);
	}
};

type PresetsTableProps = {
	presets: BetaTachyonSettings[];
	selectedPreset: BetaTachyonSettings;
	selectPreset: (value: BetaTachyonSettings) => void;
	deletePreset: (name: string) => void;
};

const PresetsTable = (props: PresetsTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { presets, selectedPreset, selectPreset, deletePreset } = props;

	const [query, setQuery] = React.useState('');
	const [highlightedPreset, setHighlightedPreset] = React.useState<BetaTachyonSettings | undefined>(undefined);
	const [presetFilter, setPresetFilter] = React.useState<string>('none');
	const [activeCategories, setActiveCategories] = React.useState<string[] | undefined>(undefined);

	const presetFilterOptions = [
		{ key: 'none', value: '', text: 'Show all presets' },
		{ key: 'built-in', value: 'built-in', text: 'Show only built-in presets' },
		{ key: 'custom-only', value: 'custom-only', text: 'Show only custom presets' },
	];

	interface ICustomRow {
		column: string;
		title: string;
		align: 'left' | 'center' | 'right' | undefined;
		descendFirst?: boolean;
	};

	const tableConfig = [
		{ width: 1, column: 'name', title: t('global.name') },
		{ width: 1, column: 'is_custom', title: t('cite_opt.btp.settings.is_custom') },
		{ width: 2, column: '', title: t('menu.tools_title') },
	] as ITableConfigRow[];

	const data = React.useMemo(() => {
		return presets.filter(f => {
			if (presetFilter === 'none') return true;
			if (presetFilter === 'built-in' && f.is_custom) return false;
			if (presetFilter === 'custom-only' && !f.is_custom) return false;
			return true;
		});
	}, [presets, presetFilter]);

	return (
		<React.Fragment>
			<Form>
				<Form.Group inline style={{marginTop: "0.5em"}}>
					<Form.Field
						placeholder={t('global.presets')}
						control={Dropdown}
						clearable
						selection
						options={presetFilterOptions}
						value={presetFilter}
						onChange={(e, { value }) => setPresetFilter(value as string)}
					/>
				</Form.Group>
			</Form>
			<SearchableTable
				tableStyle={{width: '100%'}}
				noSearch={true}
				data={data}
				config={tableConfig}
				renderTableRow={renderTableRow}
				filterRow={filterRow}
				/>
		</React.Fragment>
	);
	function filterRow(row, filter, options) {
		return true;
	}
	function renderTableRow(row: BetaTachyonSettings): JSX.Element {
		const isHighlighted = selectedPreset?.name === row.name;
		const custom = row.is_custom ? t('global.yes') : t('global.no')
		return (
			<Table.Row key={row.name}
				active={isHighlighted}
				style={{ cursor: 'pointer' }}
			>
				<Table.Cell>
					<span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
						{row.name}
					</span>
				</Table.Cell>
				<Table.Cell>
					{custom}
				</Table.Cell>
				<Table.Cell>
					<div style={{...OptionsPanelFlexRow, gap: '1em'}}>
						<Button
							onClick={() => validatePreset(row)}
						>
							<Icon name='selected radio' />&nbsp;{t('global.apply')}
						</Button>
						{!!row.is_custom && <Button
							onClick={() => deletePreset(row.name)}
							>
							<Icon name='trash' />&nbsp;{t('global.delete')}
						</Button>}
					</div>
				</Table.Cell>
			</Table.Row>
		);
	}

	function validatePreset(theme: BetaTachyonSettings): void {
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

	function sorter(data: BetaTachyonSettings[], column: string, direction: string): void {
		const sortBy = (comps: ((a: BetaTachyonSettings, b: BetaTachyonSettings) => number)[]) => {
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

		const compareNumberColumn = (a: BetaTachyonSettings, b: BetaTachyonSettings) => {
			if (direction === 'descending') return getValueFromPath(b, column) - getValueFromPath(a, column);
			return getValueFromPath(a, column) - getValueFromPath(b, column);
		};
		const compareTextColumn = (a: BetaTachyonSettings, b: BetaTachyonSettings) => {
			if (direction === 'descending') return getValueFromPath(b, column).localeCompare(getValueFromPath(a, column));
			return getValueFromPath(a, column).localeCompare(getValueFromPath(b, column));
		};
		const compareName = (a: BetaTachyonSettings, b: BetaTachyonSettings) => a.name.localeCompare(b.name);

		if (column === 'name') {
			sortBy([compareTextColumn]);
			return;
		}

		sortBy([compareNumberColumn, compareName]);
		return;
	}
};
