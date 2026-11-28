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
import { useDataPreparer } from './usedata';
import { standardize } from './utils';

type DataPickerProps = {
	id: string;
	data: IEssentialData[];
	closePicker: (selectedIds: Set<number>, affirmative: boolean) => void;
	singleSelect?: boolean;
	title?: string | React.ReactNode;
	/** preFilteredIds here are ids that should NOT be listed */
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
	//	Caching a copy of queryable data here to make subsequent queries faster
	const [queryableData, setQueryableData] = React.useState<IEssentialData[] | undefined>(undefined);
	const prepareQueryableData = useDataPreparer<IEssentialData>(
		[{ match: (datum) => !props.preFilteredIds?.has(datum.id) }],
		{
			batchesPerPass: 5,
			onProgress: (progress) => setProgress(progress)
		}
	);

	// Queried data is the dataset AFTER filtering by query
	const [queriedData, setQueriedData] = React.useState<IEssentialData[] | undefined>(undefined);
	const prepareQueriedData = useDataPreparer<IEssentialData>(
		[{ match: (datum) => dataMatches(datum) }],
		{
			onProgress: (progress) => setProgress(progress)
		}
	);

	// Reset selected ids on each reload, parent should maintain persistent state of selected ids
	const [pendingSelectedIds, setPendingSelectedIds] = React.useState<Set<number>>(props.preSelectedIds ?? new Set<number>());

	// Reset search query and progress on each reload
	const [searchQuery, setSearchQuery] = React.useState<string>('');
	const [progress, setProgress] = React.useState<number>(0);

	// Close options on each reload
	const [showOptions, setShowOptions] = React.useState<boolean>(false);

	// Persist layout preference
	const [layout, setLayout] = useStateWithStorage<'grid' | 'table'>(`${props.id}/layout`, props.tableSetup ? 'table' : 'grid');

	const [modalIsBlurring, setModalIsBlurring] = React.useState<boolean>(false);

	// Process queryable data on changes to master dataset or prefilters
	React.useEffect(() => {
		// Bypass preparer if no filters active
		if (!props.preFilteredIds) {
			setQueryableData(props.data);
			return;
		}
		prepareQueryableData(props.data).then(queryableData => {
			setQueryableData(queryableData);
		});
	}, [props.data, props.preFilteredIds]);

	// Process queried data on changes to queryable data or query
	React.useEffect(() => {
		if (!queryableData) return;
		// Bypass preparer on empty search
		if (searchQuery === '') {
			setQueriedData(queryableData);
			return;
		}
		prepareQueriedData(queryableData).then(queriedData => {
			setQueriedData(queriedData);
		});
	}, [queryableData, searchQuery]);

	// Hide options on search query change
	React.useEffect(() => {
		setShowOptions(false);
	}, [searchQuery]);

	// Ensures closePicker sends latest pendingSelectedIds on modal blur
	React.useEffect(() => {
		if (modalIsBlurring) props.closePicker(pendingSelectedIds, false);
	}, [modalIsBlurring]);

	const inputRef = React.createRef<HTMLInputElement>();
	React.useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const dataPickerState: IDataPickerState = {
		data: queriedData ?? [],
		pendingSelectedIds, setPendingSelectedIds,
		searchQuery, setSearchQuery,
		showOptions, setShowOptions,
		layout, setLayout
	};

	return (
		<Modal
			open={true}
			onClose={() => setModalIsBlurring(true)}
			centered={false}
		>
			<Modal.Header>
				{renderModalHeader()}
			</Modal.Header>
			{props.search && renderProgress()}
			<Modal.Content scrolling>
				{renderModalContent()}
			</Modal.Content>
			<Modal.Actions>
				{renderModalActions()}
			</Modal.Actions>
		</Modal>
	);

	function dataMatches(datum: IEssentialData): boolean {
		// Multisearch (i.e. match ANY comma-delimited terms)
		const terms: string[] = [];
		searchQuery.split(',').forEach(userTerm => {
			const term: string = userTerm.trim();
			if (term !== '') terms.push(term);
		});
		if (terms.length > 1) {
			return terms.some(term =>
				(props.customSearchMatch && props.customSearchMatch(datum, term))
					|| standardize(datum.name).indexOf(standardize(term)) >= 0);
		}
		return (props.customSearchMatch && props.customSearchMatch(datum, terms[0]))
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

	function renderProgress(): React.ReactNode {
		return (
			<Progress
				percent={progress}
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
				{queriedData && (
					<React.Fragment>
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
				)}
				{!queriedData && (
					<div style={{ textAlign: 'center' }}>
						<Icon loading name='spinner' /> {t('global.loading_ellipses')}
					</div>
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
			if (props.singleSelect) pendingSelectedIds.clear();
			pendingSelectedIds.add(datumId);
		}
		setPendingSelectedIds(new Set<number>(pendingSelectedIds));
		if (props.closeOnChange && pendingSelectedIds.size > 0)
			props.closePicker(pendingSelectedIds, true);
	}

	function selectAndClose(datumId: number): void {
		pendingSelectedIds.add(datumId);
		setPendingSelectedIds(new Set<number>(pendingSelectedIds));
		props.closePicker(pendingSelectedIds, true);
	}

	function submitQuery(): void {
		if (!props.selection || !queriedData || queriedData.length !== 1)
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
