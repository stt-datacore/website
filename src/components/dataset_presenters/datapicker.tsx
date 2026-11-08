import React from 'react';
import {
	Button,
	Dimmer,
	Icon,
	Input,
	Loader,
	Message,
	Modal,
	Progress,
	Segment
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { useStateWithStorage } from '../../utils/storage';

import { IDataGridSetup, IDataPickerState, IDataTableSetup, IEssentialData } from './model';
import { DataGrid } from './datagrid';
import { DataTable } from './datatable';
import { standardize } from './utils';

interface IQueryRequest {
	input: string;
	terms: string[];
	index: number;
	matches: Set<number>;
};

const QUERY_BATCH_SIZE: number = 100;

type DataPickerProps = {
	id: string;
	data: IEssentialData[];
	closePicker: (selectedIds: Set<number>, affirmative: boolean) => void;
	singleSelect?: boolean;
	title?: string | React.ReactNode;
	preFilteredIds?: Set<number>;
	preSelectedIds?: Set<number>;
	selection?: boolean;
	closeOnChange?: boolean;
	search?: boolean;
	searchPlaceholder?: string;
	customSearchMatch?: (datum: IEssentialData, term: string) => boolean;
	renderOptions?: (dataPickerState: IDataPickerState) => React.ReactNode;
	renderPreface?: (dataPickerState: IDataPickerState) => React.ReactNode;
	renderActions?: (dataPickerState: IDataPickerState) => React.ReactNode;
	gridSetup?: IDataGridSetup;
	tableSetup?: IDataTableSetup;
};

export const DataPicker = (props: DataPickerProps) => {
	const { t } = React.useContext(GlobalContext).localized;

	// Queryable data is the prefiltered dataset BEFORE filtering further by query
	const queryableData = React.useMemo<IEssentialData[]>(() => {
		if (props.preFilteredIds)
			return props.data.filter(datum => !props.preFilteredIds?.has(datum.id));
		return props.data;
	}, [props.data, props.preFilteredIds]);

	// Reset selected ids on each reload, parent should maintain persistent state of selected ids
	const [pendingSelectedIds, setPendingSelectedIds] = React.useState<Set<number>>(new Set<number>());

	// Reset search query and results on each reload
	const [searchQuery, setSearchQuery] = React.useState<string>('');
	const [queryRequest, setQueryRequest] = React.useState<IQueryRequest | undefined>(undefined);
	const [queriedData, setQueriedData] = React.useState<IEssentialData[]>(queryableData);

	// Close options on each reload
	const [showOptions, setShowOptions] = React.useState<boolean>(false);

	// Persist layout preference
	const [layout, setLayout] = useStateWithStorage<'grid' | 'table'>(`${props.id}/layout`, props.tableSetup ? 'table' : 'grid');

	// Initialize query process on changes to prefilters or query
	React.useEffect(() => {
		// Skip query process on empty search and return all queryable data
		if (searchQuery === '') {
			setQueryRequest(undefined);
			setQueriedData(queryableData);
			return;
		}
		// If query already in progress, delay new request to give previous request a chance to self-cancel
		setTimeout(() => {
			// Parse and validate comma-delimited terms here
			const terms: string[] = [];
			searchQuery.split(',').forEach(userTerm => {
				const term: string = userTerm.trim();
				if (term !== '') terms.push(term);
			});
			setQueryRequest({
				input: searchQuery,
				terms,
				index: 0,
				matches: new Set<number>()
			});
		}, queryRequest ? 100 : 0);
	}, [queryableData, searchQuery]);

	// Process query request in batches
	React.useEffect(() => {
		// Self-cancel request if query doesn't exist or if it's changed
		if (!queryRequest || queryRequest.input !== searchQuery) return;
		const newMatches: Set<number> = new Set<number>(queryRequest.matches);
		for (let i = queryRequest.index; i < queryRequest.index + QUERY_BATCH_SIZE; i++) {
			if (i >= queryableData.length) break;
			const datum: IEssentialData = queryableData[i];
			if (dataMatches(datum, queryRequest.terms))
				newMatches.add(datum.id);
		}
		// Queue next batch
		if (queryRequest.index + QUERY_BATCH_SIZE < queryableData.length) {
			setQueryRequest({
				...queryRequest,
				index: queryRequest.index + QUERY_BATCH_SIZE,
				matches: newMatches
			});
		}
		// Finalize (i.e. send to render)
		else {
			const queriedData: IEssentialData[] = queryableData.filter(datum => newMatches.has(datum.id));
			setQueryRequest(undefined);
			setQueriedData(queriedData);
		}
	}, [queryRequest]);

	// Update selected ids on external changes
	React.useEffect(() => {
		setPendingSelectedIds(props.preSelectedIds ?? new Set<number>());
	}, [props.preSelectedIds]);

	// Hide options on search query change
	React.useEffect(() => {
		setShowOptions(false);
	}, [searchQuery]);

	const inputRef = React.createRef<HTMLInputElement>();
	React.useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const dataPickerState: IDataPickerState = {
		data: queriedData,
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
			{props.search && renderQueryProgress()}
			<Modal.Content scrolling>
				{renderModalContent()}
			</Modal.Content>
			<Modal.Actions>
				{renderModalActions()}
			</Modal.Actions>
		</Modal>
	);

	function dataMatches(datum: IEssentialData, terms: string[]): boolean {
		// Multisearch (i.e. match ANY comma-delimited terms)
		if (terms.length > 1) {
			return terms.some(term =>
				(!!props.customSearchMatch && props.customSearchMatch(datum, term))
					|| standardize(datum.name).indexOf(standardize(term)) >= 0);
		}
		return (!!props.customSearchMatch && props.customSearchMatch(datum, terms[0]))
			|| standardize(datum.name).indexOf(standardize(terms[0])) >= 0;
	}

	function renderModalHeader(): React.ReactNode {
		if (!props.search) return <>{props.title}</>;
		return (
			<React.Fragment>
				<Input	/* Search by name */
					ref={inputRef}
					fluid size='mini'
					iconPosition='left'
					placeholder={props.searchPlaceholder ?? t('global.search_by_name')}
					value={searchQuery}
					onChange={(e, { value }) => setSearchQuery(value as string)}
				>
					<input onKeyUp={(e) => { if (e.key === 'Enter') submitQuery(); }} />
					<Icon name='search' />
					<Button icon onClick={() => { setSearchQuery(''); inputRef?.current?.focus(); }}>
						<Icon name='delete' />
					</Button>
				</Input>
			</React.Fragment>
		);
	}

	function renderQueryProgress(): React.ReactNode {
		let percent: number = 100;
		if (queryRequest && queryableData.length > 0)
			percent = queryRequest.index / queryableData.length * 100;
		return (
			<Progress
				percent={percent}
				attached='bottom'
			/>
		);
	}

	function renderModalContent(): React.ReactNode {
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
						data={queriedData}
						setup={props.gridSetup}
						selectedIds={pendingSelectedIds}
						handleClick={props.selection ? toggleDatum : undefined}
						handleDblClick={props.selection ? selectAndClose : undefined}
					/>
				)}
				{layout === 'table' && props.tableSetup && (
					<DataTable
						id={`${props.id}/datatable`}
						data={queriedData}
						setup={props.tableSetup}
						selectedIds={pendingSelectedIds}
						handleClick={props.selection ? toggleDatum : undefined}
						handleDblClick={props.selection ? selectAndClose : undefined}
					/>
				)}
			</React.Fragment>
		);
	}

	function renderModalActions(): React.ReactNode {
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
		else {
			if (props.singleSelect && pendingSelectedIds.size)  pendingSelectedIds.clear();
			pendingSelectedIds.add(datumId);
		}
		setPendingSelectedIds(new Set<number>(pendingSelectedIds));
		if (pendingSelectedIds.size > 0 && props.closeOnChange)
			props.closePicker(pendingSelectedIds, true);
	}

	function selectAndClose(datumId: number): void {
		pendingSelectedIds.add(datumId);
		setPendingSelectedIds(new Set<number>(pendingSelectedIds));
		props.closePicker(pendingSelectedIds, true);
	}

	function submitQuery(): void {
		if (!props.selection || queriedData.length === 0 || !!queryRequest)
			return;
		pendingSelectedIds.add(queriedData[0].id);
		setPendingSelectedIds(new Set<number>(pendingSelectedIds));
		props.closePicker(pendingSelectedIds, true);
	}
};

export const DataPickerLoading = () => {
	return (
		<Dimmer active page>
			<Loader />
		</Dimmer>
	);
};
