import React from 'react';
import {
	Button,
	Dimmer,
	Icon,
	Input,
	Loader,
	Message,
	Modal,
	Segment
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { useStateWithStorage } from '../../utils/storage';

import { IDataPickerState, IEssentialData } from './model';
import { DataGrid } from './datagrid';
import { IDataGridSetup } from './model';
import { DataTable } from './datatable';
import { IDataTableSetup } from './model';

type DataPickerProps = {
	id: string;
	data: IEssentialData[];
	closePicker: (selectedIds: Set<number>, affirmative: boolean) => void;
	title?: string | JSX.Element;
	preFilteredIds?: Set<number>;
	preSelectedIds?: Set<number>;
	selection?: boolean;
	closeOnChange?: boolean;
	search?: boolean;
	searchPlaceholder?: string;
	renderOptions?: (dataPickerState: IDataPickerState) => JSX.Element;
	renderPreface?: (dataPickerState: IDataPickerState) => JSX.Element;
	renderActions?: (dataPickerState: IDataPickerState) => JSX.Element;
	gridSetup?: IDataGridSetup;
	tableSetup?: IDataTableSetup;
};

export const DataPicker = (props: DataPickerProps) => {
	const { t } = React.useContext(GlobalContext).localized;

	// Reset selected ids on each reload, parent should maintain persistent state of selected ids
	const [pendingSelectedIds, setPendingSelectedIds] = React.useState<Set<number>>(new Set<number>());

	// Reset search query and close options on each reload
	const [searchQuery, setSearchQuery] = React.useState<string>('');
	const [showOptions, setShowOptions] = React.useState<boolean>(false);

	// Persist layout preference
	const [layout, setLayout] = useStateWithStorage<'grid' | 'table'>(`${props.id}/layout`, props.tableSetup ? 'table' : 'grid');

	const data = React.useMemo<IEssentialData[]>(() => {
		return props.data.slice().filter(datum =>
			(!props.preFilteredIds || !props.preFilteredIds.has(datum.id))
				&& (searchQuery === '' || textMatch(datum.name, searchQuery))
		);
	}, [props.data, props.preFilteredIds, searchQuery]);

	// Update selected ids on external changes
	React.useEffect(() => {
		setPendingSelectedIds(props.preSelectedIds ?? new Set<number>());
	}, [props.preSelectedIds]);

	// Hide options on search query change
	React.useEffect(() => {
		setShowOptions(false);
	}, [searchQuery]);

	const inputRef: React.RefObject<Input> = React.createRef<Input>();
	React.useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const dataPickerState: IDataPickerState = {
		data,
		pendingSelectedIds, setPendingSelectedIds,
		searchQuery, setSearchQuery,
		showOptions, setShowOptions,
		layout, setLayout
	};

	return (
		<Modal
			open={true}
			onClose={() => props.closePicker(pendingSelectedIds, false)}
			centered={false}
		>
			<Modal.Header>
				{renderModalHeader()}
			</Modal.Header>
			<Modal.Content scrolling>
				{renderModalContent()}
			</Modal.Content>
			<Modal.Actions>
				{renderModalActions()}
			</Modal.Actions>
		</Modal>
	);

	function textMatch(fieldValue: string, userQuery: string): boolean {
		return fieldValue.toLowerCase().replace(/[^a-z0-9]/g, '')
			.indexOf(userQuery.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
	}

	function renderModalHeader(): JSX.Element {
		if (!props.search) return <>{props.title}</>;
		return (
			<Input	/* Search by name */
				ref={inputRef}
				fluid size='mini'
				iconPosition='left'
				placeholder={props.searchPlaceholder ?? t('global.search_by_name')}
				value={searchQuery}
				onChange={(e, { value }) => setSearchQuery(value as string)}
			>
				<input
					onKeyUp={(e) => {
						if (!!props.selection && data.length === 1 && e.key === 'Enter')
							selectFromQuery();
					}}
				/>
				<Icon name='search' />
				<Button icon onClick={() => setSearchQuery('')}>
					<Icon name='delete' />
				</Button>
			</Input>
		);
	}

	function renderModalContent(): JSX.Element {
		return (
			<React.Fragment>
				{props.renderOptions && showOptions && (
					<div style={{ position: 'sticky', top: '0', zIndex: '100', marginBottom: '1em' }}>
						<Message attached onDismiss={() => setShowOptions(false)}>
							<Message.Header	/* Options */>
								<Icon name='cog' /> {t('global.options')}
							</Message.Header>
						</Message>
						<Segment attached='bottom'>
							{props.renderOptions(dataPickerState)}
						</Segment>
					</div>
				)}
				{props.renderOptions && props.preFilteredIds && props.preFilteredIds.size > 0 && !showOptions && (
					<Message	/* Some results may be hidden due to your current search options. */
						style={{ cursor: 'pointer' }}
						onClick={() => setShowOptions(true)}
					>
						<Icon name='info circle' /> {t('global.filters_warning')}
					</Message>
				)}
				{props.renderPreface && (
					<div style={{ marginBottom: '2em' }}>
						{props.renderPreface(dataPickerState)}
					</div>
				)}
				{(layout === 'grid' || !props.tableSetup) && (
					<DataGrid
						id={`${props.id}/datagrid`}
						data={data}
						setup={props.gridSetup}
						selectedIds={pendingSelectedIds}
						handleClick={props.selection ? toggleDatum : undefined}
						handleDblClick={props.selection ? selectAndClose : undefined}
					/>
				)}
				{layout === 'table' && props.tableSetup && (
					<DataTable
						id={`${props.id}/datatable`}
						data={data}
						setup={props.tableSetup}
						selectedIds={pendingSelectedIds}
						handleClick={props.selection ? toggleDatum : undefined}
						handleDblClick={props.selection ? selectAndClose : undefined}
					/>
				)}
			</React.Fragment>
		);
	}

	function renderModalActions(): JSX.Element {
		return (
			<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
				<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', columnGap: '1em' }}>
					{props.renderOptions && <Button icon='cog' onClick={() => setShowOptions(!showOptions)}/>}
					{props.tableSetup && (
						<Button.Group>
							<Button icon='table' color={layout === 'table' ? 'blue' : undefined} onClick={() => setLayout('table')} />
							<Button icon='block layout' color={layout === 'grid' ? 'blue' : undefined} onClick={() => setLayout('grid')} />
						</Button.Group>
					)}
				</div>
				<div>
					{props.renderActions && props.renderActions(dataPickerState)}
					{!props.renderActions && (
						<Button onClick={() => props.closePicker(pendingSelectedIds, false)}>
							{t('global.close')}
						</Button>
					)}
				</div>
			</div>
		);
	}

	function toggleDatum(datumId: number): void {
		if (pendingSelectedIds.has(datumId))
			pendingSelectedIds.delete(datumId);
		else
			pendingSelectedIds.add(datumId);
		setPendingSelectedIds(new Set<number>(pendingSelectedIds));
		if (pendingSelectedIds.size > 0 && props.closeOnChange)
			props.closePicker(pendingSelectedIds, true);
	}

	function selectAndClose(datumId: number): void {
		pendingSelectedIds.add(datumId);
		setPendingSelectedIds(new Set<number>(pendingSelectedIds));
		props.closePicker(pendingSelectedIds, true);
	}

	function selectFromQuery(): void {
		pendingSelectedIds.add(data[0].id);
		setPendingSelectedIds(new Set<number>(pendingSelectedIds));
		props.closePicker(pendingSelectedIds, true);
		// setSearchQuery('');
		// if (pendingSelectedIds.size > 0 && props.closeOnChange)
		// 	props.closePicker(pendingSelectedIds, true);
	}
};

export const DataPickerLoading = () => {
	return (
		<Dimmer active page>
			<Loader />
		</Dimmer>
	);
};
