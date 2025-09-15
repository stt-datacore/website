import React from 'react';
import { Modal, Button, Form, Input, Dropdown, Table, Message, Icon } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { BetaTachyonSettings } from '../../model/worker';
import { createNewSettings, DefaultBetaTachyonSettings, DefaultPresets, getNewSettingsName, mergePresets } from './btsettings';
import { ITableConfigRow, SearchableTable } from '../searchabletable';
import { OptionsPanelFlexRow } from '../stats/utils';
import { download, downloadData } from '../../utils/crewutils';
import { PromptContext } from '../../context/promptcontext';

type BetaTachyonPresetsProps = {
	presets: BetaTachyonSettings[];
	setPresets: (value: BetaTachyonSettings[]) => void;
    activeSettings: BetaTachyonSettings;
    setActiveSettings: (value: BetaTachyonSettings) => void;
};

export const BetaTachyonPresets = (props: BetaTachyonPresetsProps) => {
	const { presets, setPresets, activeSettings: selectedPreset, setActiveSettings: setSelectedPreset } = props;

    React.useEffect(() => {
        renderPresets();
    }, [])

	return (
		<BetaTachyonPresetPicker
			presets={presets}
			setPresets={setPresets}
			selectedPreset={selectedPreset}
			setSelectedPreset={setSelectedPreset}
		/>
	);

	function renderPresets(): void {
		setPresets([...presets]);
	}
};

type BetaTachyonPresetPickerProps = {
	presets: BetaTachyonSettings[];
	setPresets: (value: BetaTachyonSettings[]) => void;
	selectedPreset: BetaTachyonSettings;
	setSelectedPreset: (value: BetaTachyonSettings) => void;
};

const BetaTachyonPresetPicker = (props: BetaTachyonPresetPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const promptContext = React.useContext(PromptContext);
    const { t, tfmt } = globalContext.localized;
	const { confirm } = promptContext;
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
						setPresets={setPresets}
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
	setPresets: (value: BetaTachyonSettings[]) => void;
	selectedPreset: BetaTachyonSettings;
	selectPreset: (value: BetaTachyonSettings) => void;
	deletePreset: (name: string) => void;
};

const PresetsTable = (props: PresetsTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const promptContext = React.useContext(PromptContext);
	const { t } = globalContext.localized;
	const { prompt } = promptContext;
	const { presets, setPresets, selectedPreset, deletePreset } = props;

	const [presetFilter, setPresetFilter] = React.useState<string>('none');
	const [uploadFiles, setUploadFiles] = React.useState<FileList | undefined>(undefined);

	const uploadRef = React.useRef<HTMLInputElement>(null);

	const presetFilterOptions = [
		{ key: 'none', value: '', text: 'Show all presets' },
		{ key: 'built-in', value: 'built-in', text: 'Show only built-in presets' },
		{ key: 'custom-only', value: 'custom-only', text: 'Show only custom presets' },
	];

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

	const downloadEnabled = React.useMemo(() => {
		return presets.some(p => p.is_custom);
	}, [presets]);

	React.useEffect(() => {
		if (uploadFiles?.length) {
			processUpload();
		}
	}, [uploadFiles]);

	return (
		<React.Fragment>
			<div style={{...OptionsPanelFlexRow, justifyContent: 'space-between'}}>
				<Dropdown
					placeholder={t('global.presets')}
					control={Dropdown}
					clearable
					selection
					options={presetFilterOptions}
					value={presetFilter}
					onChange={(e, { value }) => setPresetFilter(value as string)}
				/>
				<div>
					<input
						type="file"
						accept="text/json,application/json"
						ref={uploadRef}
						style={{display: 'none'}}
						onChange={(e) => setUploadFiles(e.target.files || undefined)}
						name="files"
						id="upload_presets_file_input"
						/>
					<Button icon='add' onClick={createNew} />
					<Button disabled={!downloadEnabled} icon='download' onClick={downloadPresets} ></Button>
					<Button icon='upload' onClick={uploadPresets}></Button>
				</div>
			</div>
			<SearchableTable
				tableStyle={{width: '100%'}}
				id={'bt_presets'}
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

	function downloadPresets() {
		download('presets.json', JSON.stringify(presets.map(f => ({...f, name: f.is_custom ? f.name : `Copy of ${f.name}`, is_custom: true })), null, 4));
	}

	function uploadPresets() {
		uploadRef?.current?.click();
	}

	function createNew() {

		prompt({
			title: t('global.create_new_x', { x: t('global.preset')}),
			message: t('global.new_name'),
			affirmative: t('global.create'),
			negative: t('global.cancel'),
			currentValue: 'New Settings',
			onClose: (result) => {
				if (result) {
					let newpreset = createNewSettings(getNewSettingsName(presets, result), selectedPreset);
					setPresets([...presets, newpreset]);
				}
			}
		});
	}

	async function processUpload() {
		if (!uploadFiles?.length) return;
		try {
			let file = uploadFiles.item(0)!;
			let text = await file.text();
			let json = JSON.parse(text) as BetaTachyonSettings[];
			json = json
				.filter(f => f.is_custom && !DefaultPresets.some(d => d.name.toLowerCase().trim() === f.name.toLowerCase().trim()))
				.map(item => {
					item = {
						// Make sure any new settings get added.
						...DefaultBetaTachyonSettings,
						...item,
						is_custom: true
					}
					return item;
				});

			if (!json.length) return;
			setPresets(mergePresets(presets, json));
		}
		catch {
		}
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
						{!!row.is_custom && <>
							<Button
								onClick={() => renamePreset(row)}
								>
								<Icon name='pencil' />&nbsp;{t('global.rename')}
							</Button>
							<Button
								onClick={() => deletePreset(row.name)}
								>
								<Icon name='trash' />&nbsp;{t('global.delete')}
							</Button>
						</>}
					</div>
				</Table.Cell>
			</Table.Row>
		);
	}

	function renamePreset(preset: BetaTachyonSettings) {
		const { prompt } = promptContext;
		prompt({
			title: t('global.rename'),
			message: t('global.new_name'),
			affirmative: t('global.apply'),
			negative: t('global.cancel'),
			currentValue: preset.name,
			onClose: (result) => {
				if (!result) return;
				preset.name = result;
				setPresets([...presets]);
			},
			validate: (result) => {
				if (preset.name === result) return true;
				if (presets.some(p => p.name.toLowerCase().trim() === result?.toLowerCase().trim())) {
					return t('global.duplicate_name');
				}
				else if (!result) {
					return false;
				}
				return true;
			}
		})
	}

	function validatePreset(preset: BetaTachyonSettings): void {
		props.selectPreset(preset);
	}
};
